// 알림함과 장바구니 개수 — 윗줄(헤더) 아이콘에 붙는 숫자
//  - 알림함: 푸시로 나간 알림을 send-push 가 user_notifications 표에 함께 적어 둔다.
//    푸시를 꺼 두었거나 못 받는 기기(아이폰 사파리 등)에서도 앱 안에서 다시 볼 수 있다.
//  - 표가 아직 없으면(SQL 실행 전) available=false 로 두어 종 아이콘을 숨긴다.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const INBOX_EVENT = 'hssup:inbox-changed';
const CART_EVENT = 'hssup:cart-changed';

export const inboxChanged = () => window.dispatchEvent(new Event(INBOX_EVENT));
export const cartChanged = () => window.dispatchEvent(new Event(CART_EVENT));

// 화면을 옮길 때(refreshKey), 앱으로 돌아올 때, 내용이 바뀌었다고 알릴 때 다시 센다
function useLiveCount(load, eventName, refreshKey) {
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener(eventName, load);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(eventName, load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, eventName]);
}

// 안 읽은 알림 수
export function useUnreadCount(userId, refreshKey) {
  const [state, setState] = useState({ available: false, unread: 0 });
  const load = useCallback(async () => {
    if (!userId) return;
    const { count, error } = await supabase.from('user_notifications')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
    // 잠깐 끊긴 인터넷 같은 오류는 지금 상태를 그대로 둔다
    if (error) return;
    // 표가 없으면(SQL 실행 전) 개수만 묻는 요청은 오류 없이 개수가 비어서 온다
    if (count === null) { setState({ available: false, unread: 0 }); return; }
    setState({ available: true, unread: count });
  }, [userId]);
  useLiveCount(load, INBOX_EVENT, refreshKey);
  return state;
}

// 장바구니에 담긴 상품 가짓수
export function useCartCount(userId, refreshKey) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!userId) return;
    const { count: n, error } = await supabase.from('cart_items')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (!error) setCount(n || 0);
  }, [userId]);
  useLiveCount(load, CART_EVENT, refreshKey);
  return count;
}

// 알림에 적힌 주소를 앱 안 이동으로 바꾼다. 바깥 사이트 주소는 열지 않는다.
//   '/qna/12' → 그 글,  '/?page=admin-approvals' → 그 화면,  '/?payment=success&orderId=..' → 결제 완료 화면
export function resolveAppUrl(url) {
  try {
    const u = new URL(url || '/', window.location.origin);
    if (u.origin !== window.location.origin) return '/';
    const page = u.searchParams.get('page');
    if (page) return '/' + page.replace(/^\/+/, '');
    const payment = u.searchParams.get('payment');
    if (payment === 'success') return '/payment-success' + u.search;
    if (payment === 'fail') return '/payment-fail' + u.search;
    return u.pathname + u.search;
  } catch (e) {
    return '/';
  }
}

// '방금', '5분 전', '3시간 전', '2일 전', 그보다 오래되면 날짜
export function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}
