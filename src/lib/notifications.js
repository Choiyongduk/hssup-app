// 웹 푸시 알림 관련 헬퍼
import { supabase } from './supabase';

// Base64 URL → Uint8Array 변환 (VAPID 키 형식)
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
};

// 알림 구독
export const subscribeToNotifications = async (userId) => {
  try {
    // 1. 권한 요청
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('알림 권한이 거부되었습니다');
    }

    // 2. Service Worker 등록 확인
    const registration = await navigator.serviceWorker.ready;

    // 3. 푸시 구독
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // 4. Supabase에 구독 정보 저장
    const subscriptionJSON = subscription.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscriptionJSON.endpoint,
      p256dh_key: subscriptionJSON.keys.p256dh,
      auth_key: subscriptionJSON.keys.auth,
      user_agent: navigator.userAgent,
    }, { onConflict: 'user_id,endpoint' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('구독 실패:', err);
    return { success: false, error: err.message };
  }
};

// 알림 구독 해제
export const unsubscribeFromNotifications = async (userId) => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      // DB에서도 제거
      await supabase.from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }
    return { success: true };
  } catch (err) {
    console.error('구독 해제 실패:', err);
    return { success: false, error: err.message };
  }
};

// 🍊 운영진 활동 → 원장님께 별도 알림
export const notifyAdminsOfStaffActivity = async (user, title, body) => {
  if (user?.role !== 'staff') return;  // staff만 해당
  try {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');
    if (!admins || admins.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    for (const admin of admins) {
      if (admin.id === user.id) continue;
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `[운영진] ${title}`,
          body: `${user.name}: ${body}`,
          url: '/',
          targetUserId: admin.id,
        }),
      }).catch(e => console.error('관리자 알림 실패:', e));
    }
  } catch (e) {
    console.error('관리자 알림 헬퍼 에러:', e);
  }
};

// 📢 원장님(admin) 글 → 전원(수강생 + 운영진) 강제 알림. 작성자 본인은 제외.
//    send-push에 'student'(수강생)와 'admin'(=admin+staff 포함) 두 그룹으로 각각 발송한다.
//    체크박스와 무관하게 항상 호출하는 용도.
export const notifyEveryone = async ({ title, body, url = '/', excludeUserId }) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = {
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    await Promise.all(['student', 'admin'].map(targetRole =>
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, body, url, targetRole, excludeUserId }),
      }).catch(e => console.error('전체 알림 실패:', e))
    ));
  } catch (e) {
    console.error('전체 알림 헬퍼 에러:', e);
  }
};

// 현재 알림 상태 확인
export const checkNotificationStatus = async () => {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'default';

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'subscribed' : 'unsubscribed';
  } catch {
    return 'error';
  }
};
