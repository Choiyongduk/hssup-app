import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './lib/supabase';
import {
  Home, Bell, BellOff, BookOpen, Award, MessageCircle, FolderOpen, Sparkles,
  ShoppingBag, PlayCircle, Users, Heart, ChevronRight, Clock,
  Check, Plus, Send, Lock, Mail, Edit3, Download, Play, Upload,
  Palette, BarChart3, Trash2, ChevronLeft, ShoppingCart,
  Shield, UserCheck, UserPlus, CreditCard, AlertCircle, Camera, Image as ImageIcon,
  ArrowRight, ArrowUpRight, Loader2,
  User, LogOut, Menu, X, Search, FileText, Package, Truck
} from 'lucide-react';

// 아바타 그라데이션 컬러 (반영구 시술 무드)
const AVATAR_COLORS = {
  orange:  { name: '시그니처 오렌지', gradient: 'linear-gradient(135deg, #FF5C1F 0%, #FF9580 100%)' },
  brown:   { name: '딥 브라운',        gradient: 'linear-gradient(135deg, #5C463A 0%, #8B6F5C 100%)' },
  coral:   { name: '코랄',              gradient: 'linear-gradient(135deg, #FF7556 0%, #FFB39E 100%)' },
  mocha:   { name: '모카',              gradient: 'linear-gradient(135deg, #8B6F5C 0%, #C9B89C 100%)' },
  nude:    { name: '누드',              gradient: 'linear-gradient(135deg, #D4A593 0%, #F5DDD8 100%)' },
  charcoal:{ name: '차콜',              gradient: 'linear-gradient(135deg, #2D2520 0%, #6B6661 100%)' },
};

// 이름에서 이니셜 추출
const getInitial = (name) => {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase();
};

// 🍊 이미지 압축 헬퍼 함수 (Canvas API 사용)
const compressImage = (file, maxWidth = 1200, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    // 이미지 아니거나 SVG/GIF는 압축 X (애니메이션 깨짐)
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // 너비 기준 리사이즈 (비율 유지)
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 압축 실패'));
              return;
            }
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.jpg'),
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            // 원본이 더 작으면 원본 사용 (불필요한 변환 방지)
            resolve(compressedFile.size > file.size ? file : compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
};

// 이미지 업로드 헬퍼 함수
const uploadCaseImage = async (file, userId) => {
  // 🍊 압축 먼저
  const compressed = await compressImage(file, 1200, 0.85);

  // 파일 이름 생성 (timestamp + random)
  const fileExt = compressed.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Supabase Storage에 업로드
  const { error: uploadError } = await supabase.storage
    .from('case-images')
    .upload(filePath, compressed);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw uploadError;
  }

  // Public URL 가져오기
  const { data } = supabase.storage
    .from('case-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// 이미지 삭제 헬퍼 함수
const deleteCaseImage = async (imageUrl) => {
  // URL에서 파일 경로 추출
  const url = new URL(imageUrl);
  const pathParts = url.pathname.split('/case-images/');
  if (pathParts.length < 2) return;
  const filePath = pathParts[1];

  const { error } = await supabase.storage
    .from('case-images')
    .remove([filePath]);

  if (error) console.error('Delete error:', error);
};

// 🎥 유튜브 URL 판별
const isYouTubeUrl = (url) => !!url && (url.includes('youtube.com') || url.includes('youtu.be'));

// 🎥 영상 파일 업로드 (공지·꿀팁 공용, bucket: 'post-videos')
const uploadPostVideo = async (file, bucket = 'post-videos') => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
    contentType: file.type || 'video/mp4',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
};

// 🎥 영상 파일 삭제 (유튜브 URL이면 스킵)
const deletePostVideo = async (videoUrl, bucket = 'post-videos') => {
  if (!videoUrl || isYouTubeUrl(videoUrl)) return;
  try {
    const url = new URL(videoUrl);
    const pathParts = url.pathname.split(`/${bucket}/`);
    if (pathParts.length < 2) return;
    await supabase.storage.from(bucket).remove([pathParts[1]]);
  } catch (e) { console.error('영상 삭제 에러:', e); }
};

// ============================================
// 푸시 알림 관련 함수
// ============================================

// Base64 URL → Uint8Array 변환 (VAPID 키 형식)
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
};

// 알림 구독
const subscribeToNotifications = async (userId) => {
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
const unsubscribeFromNotifications = async (userId) => {
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
const notifyAdminsOfStaffActivity = async (user, title, body) => {
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
          title: `👮 [운영진] ${title}`,
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

// 현재 알림 상태 확인
const checkNotificationStatus = async () => {
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

const COLORS = {
  // 시그니처 컬러
  primary: '#FF5C1F',                        // 메인 오렌지
  deep: '#FF7A47',                           // 밝은 오렌지 (강조)
  primaryGlow: 'rgba(255, 92, 31, 0.35)',   // 글로우 효과용
  peach: 'rgba(255, 92, 31, 0.15)',         // 오렌지 배경

  // 다크 테마 베이스
  cream: '#0A0A0A',                          // 메인 배경
  card: '#161616',                           // 카드 배경
  cardElev: '#1F1F1F',                       // 들어올린 카드

  // 텍스트
  ink: '#FFFFFF',                            // 메인 텍스트 (흰색!)
  stone: '#A0A0A0',                          // 보조 텍스트
  muted: '#6B6B6B',                          // 흐린 텍스트

  // 경계선
  light: 'rgba(255, 255, 255, 0.08)',       // 미묘한 경계선
  border: 'rgba(255, 255, 255, 0.15)',      // 진한 경계선

  // 진짜 흰색 (버튼 위 텍스트용)
  white: '#FFFFFF',
};

// =============================================================
// 📜 약관 콘텐츠 (이용약관, 개인정보처리방침, 환불정책)
// =============================================================
const LEGAL_TERMS = `본 약관은 히썹(이하 "학원")이 운영하는 HSSUP Beauty Academy 앱(이하 "서비스")의 이용과 관련하여, 학원과 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.


제1조 (정의)

1. "서비스"란 학원이 제공하는 반영구 시술 교육, 온라인 강의, 자료, 재료 판매 등 일체의 서비스를 의미합니다.
2. "회원"이란 본 약관에 동의하고 서비스에 가입한 자를 말합니다.
3. "콘텐츠"란 서비스에서 제공하는 강의 영상, 자료, 이미지, 텍스트 등을 말합니다.


제2조 (약관의 효력 및 변경)

1. 본 약관은 회원이 동의함으로써 효력이 발생합니다.
2. 학원은 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 앱 내 공지를 통해 효력이 발생합니다.
3. 회원은 변경된 약관에 동의하지 않을 경우 회원 탈퇴를 요청할 수 있습니다.


제3조 (회원가입)

1. 회원가입은 이용자가 본 약관에 동의하고, 가입 정보를 정확히 입력함으로써 신청됩니다.
2. 학원은 다음 각 호에 해당하는 경우 가입을 거부하거나 사후 자격을 상실시킬 수 있습니다.
   • 타인의 정보를 도용한 경우
   • 허위 정보를 제공한 경우
   • 만 14세 미만이며 법정대리인 동의가 없는 경우
   • 기타 학원이 정한 가입 요건을 충족하지 못한 경우


제4조 (서비스 이용)

1. 회원은 본 약관과 관련 법령을 준수하여 서비스를 이용해야 합니다.
2. 학원은 운영상 또는 기술상 필요한 경우 서비스를 일시 중단할 수 있으며, 사전 또는 사후에 공지합니다.


제5조 (회원의 의무)

회원은 다음 행위를 하여서는 안 됩니다.
1. 서비스에서 얻은 강의 영상, 자료, 이미지 등을 무단으로 복제·배포·전송하는 행위
2. 다른 회원의 정보를 도용하거나 불법적으로 수집하는 행위
3. 학원 또는 타인의 명예를 훼손하거나 권리를 침해하는 행위
4. 서비스의 안정적 운영을 방해하는 행위


제6조 (학원의 의무)

1. 학원은 회원의 개인정보를 본 약관 및 개인정보처리방침에 따라 안전하게 관리합니다.
2. 학원은 서비스 이용 중 발생한 회원의 의견 및 불만을 신속히 처리합니다.


제7조 (회원 탈퇴 및 자격 상실)

1. 회원은 언제든지 마이페이지에서 회원 탈퇴를 요청할 수 있으며, 학원은 즉시 처리합니다.
2. 회원이 본 약관을 위반한 경우 학원은 사전 통보 후 회원 자격을 정지 또는 상실시킬 수 있습니다.


제8조 (지적재산권)

1. 서비스에서 제공하는 모든 콘텐츠(강의 영상, 교재, 자료, 이미지, 디자인 등)의 저작권은 학원에 있습니다.
2. 회원은 학원의 사전 서면 동의 없이 콘텐츠를 복제·전송·배포·출판·방송·2차 가공할 수 없습니다.
3. 회원이 서비스 내에 게시한 게시물의 저작권은 회원에게 있으나, 학원은 서비스 운영·홍보 등을 위해 해당 게시물을 사용할 수 있습니다.


제9조 (면책)

1. 학원은 천재지변, 통신 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.
2. 학원은 회원이 서비스에서 얻은 정보를 이용하여 발생한 손해에 대해 책임을 지지 않습니다.


제10조 (분쟁 해결)

1. 본 약관에 명시되지 않은 사항은 관련 법령 및 상관습에 따릅니다.
2. 서비스 이용으로 발생한 분쟁에 관한 소송은 학원 사업장 소재지 관할 법원을 전속 관할로 합니다.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━

부칙
본 약관은 2026년 6월 15일부터 시행합니다.

[학원 정보]
• 상호: 히썹
• 대표자: 박민희
• 사업자등록번호: 876-03-02463
• 사업장 주소: 대전광역시 서구 둔산남로9번길 45, 4층 401호(둔산동)
• 대표 전화: 010-6516-4556
• 대표 이메일: pmhung9201@naver.com
• 통신판매업 신고번호: (신고 진행 중)
`;

const LEGAL_PRIVACY = `히썹(이하 "학원")은 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.


1. 수집하는 개인정보 항목

가. 회원가입 시 수집 항목 (필수)
   • 이름, 이메일, 비밀번호, 전화번호, 아이디
   • 수강 과정 정보

나. 결제 시 추가 수집 항목
   • 구매자 이름, 전화번호, 이메일
   • 결제 정보(카드사명, 영수증 URL)

다. 서비스 이용 과정에서 자동 수집되는 항목
   • 접속 로그, IP, 기기 정보(브라우저/OS)
   • 푸시 알림 토큰


2. 개인정보의 수집 및 이용 목적

   • 회원 관리 (본인 확인, 부정 이용 방지)
   • 서비스 제공 (수업·강의 수강, 자료 제공, Q&A 답변)
   • 결제 처리 및 환불 대응
   • 서비스 개선 및 통계 분석
   • 공지사항 및 알림 전달


3. 개인정보의 보유 및 이용 기간

   • 회원 정보: 회원 탈퇴 시까지
     (단, 관련 법령에 따른 보존 의무가 있는 경우 해당 기간까지)
   • 결제 정보: 「전자상거래법」에 따라 결제일로부터 5년
   • 소비자 불만 또는 분쟁 처리에 관한 기록: 3년
   • 표시·광고에 관한 기록: 6개월


4. 개인정보 제3자 제공

학원은 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우는 예외로 합니다.
   • 이용자가 사전에 동의한 경우
   • 법령에 의하거나 수사기관의 요청이 있는 경우


5. 개인정보 처리 위탁

학원은 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁합니다.
   • Supabase Inc.: 회원 데이터 저장 및 관리
   • 나이스페이먼츠(주): 결제 처리


6. 이용자의 권리·의무

이용자는 언제든지 본인의 개인정보를 조회·수정·삭제 또는 처리 정지를 요청할 수 있습니다.
   • 마이페이지에서 직접 수정/탈퇴 가능
   • 대표 이메일(pmhung9201@naver.com)로 요청 가능


7. 개인정보의 안전성 확보 조치

   • 비밀번호 암호화 저장
   • 데이터 전송 시 HTTPS 사용
   • 접근 권한 최소화 운영


8. 쿠키 운영

서비스는 이용자에게 개별화된 서비스 제공을 위해 쿠키를 사용할 수 있으며, 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있습니다.


9. 개인정보 보호책임자

   • 책임자: 박민희 (대표)
   • 연락처: 010-6516-4556
   • 이메일: pmhung9201@naver.com


10. 권익 침해 구제 방법

개인정보 침해 신고 및 상담은 다음 기관을 통해 가능합니다.
   • 개인정보침해신고센터 (privacy.kisa.or.kr / 국번 없이 118)
   • 개인정보분쟁조정위원회 (kopico.go.kr / 1833-6972)
   • 대검찰청 사이버수사과 (cid.spo.go.kr / 02-3480-3573)
   • 경찰청 사이버수사국 (ecrm.cyber.go.kr / 국번 없이 182)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━

부칙
본 개인정보처리방침은 2026년 6월 15일부터 시행됩니다.
`;

const LEGAL_REFUND = `히썹(이하 "학원")은 「학원의 설립·운영 및 과외교습에 관한 법률 시행령」 및 「전자상거래법」에 따라 다음과 같이 환불 정책을 운영합니다.


1. 수업(클래스) 환불 기준

가. 결제 후 7일 이내 + 수업 시작 전
   → 결제액 전액 환불

나. 수업 시작 후 1개월 이내
   → 잔여 수업 일수에 비례한 금액 환불

다. 수업 시작 후 1개월 초과
   → 환불 불가

※ 위 기준은 학원법 시행령 제18조에 따른 기준입니다.


2. 온라인 강의 영상 환불 기준

   • 강의 영상을 한 번이라도 재생한 경우 디지털 콘텐츠의 특성상 환불이 불가합니다.
   • 단, 결제 후 7일 이내 + 영상 미재생 상태: 결제액 전액 환불


3. 재료/상품 환불 기준

가. 청약철회: 수령일로부터 7일 이내 (「전자상거래법」 제17조)

나. 청약철회가 불가능한 경우
   • 개봉되거나 사용된 위생용품(니들 등)
   • 시간 경과로 재판매가 곤란한 제품
   • 고객의 사용 또는 일부 소비로 가치가 현저히 감소한 경우

다. 반품 배송비
   • 제품 하자 또는 학원 귀책: 학원 부담
   • 단순 변심: 고객 부담


4. 환불 신청 방법

다음 중 하나의 방법으로 신청해주세요.
   • 마이페이지 → 결제 내역 → 환불 신청
   • 대표 이메일: pmhung9201@naver.com
   • 대표 전화: 010-6516-4556


5. 환불 처리 기간

환불 신청 후 영업일 기준 3~7일 이내에 결제 수단을 통해 환불 처리됩니다.
(카드 결제의 경우 카드사 사정에 따라 추가 영업일이 소요될 수 있습니다)


6. 기타

본 정책에 명시되지 않은 사항은 관련 법령 및 공정거래위원회 표준약관에 따릅니다.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━

부칙
본 환불정책은 2026년 6월 15일부터 시행됩니다.
`;

// 약관 공통 페이지 컴포넌트
function LegalPage({ ko, en, desc, content }) {
  return (
    <>
      <PageIntro ko={ko} en={en} desc={desc} />
      <div className="px-5 pb-20">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <pre style={{
            fontFamily: 'inherit',
            color: COLORS.stone,
            fontSize: '12px',
            lineHeight: '1.75',
            whiteSpace: 'pre-wrap',
            wordBreak: 'keep-all',
            margin: 0
          }}>{content}</pre>
        </div>
      </div>
    </>
  );
}

// =============================================================
// 📝 useDraft - 작성 중 글 자동 저장 (localStorage)
// =============================================================
function useDraft(key, initialValue, excludeKeys = []) {
  const storageKey = `hssup_draft_${key}`;
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue)) {
          return { ...initialValue, ...parsed };
        }
        return parsed;
      }
    } catch (e) { /* 무시 */ }
    return initialValue;
  });

  useEffect(() => {
    try {
      let toSave = value;
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && excludeKeys.length > 0) {
        toSave = { ...value };
        excludeKeys.forEach(k => delete toSave[k]);
      }
      const isEmpty = toSave === '' || toSave === null || toSave === undefined ||
        (typeof toSave === 'object' && toSave !== null && Object.values(toSave).every(v => !v));
      if (isEmpty) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      }
    } catch (e) { /* 무시 */ }
  }, [storageKey, value]);

  const clearDraft = () => {
    setValue(initialValue);
    try { localStorage.removeItem(storageKey); } catch (e) { /* 무시 */ }
  };

  return [value, setValue, clearDraft];
}

// =============================================================
// 🔴 useNewPages - 최근 3일 새 글 있는 메뉴 감지
// =============================================================
function useNewPages() {
  const [newPages, setNewPages] = useState([]);
  useEffect(() => {
    const check = async () => {
      try {
        const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const [n, t, ti, l, lf] = await Promise.all([
          supabase.from('notices').select('id', { count: 'exact', head: true }).gte('created_at', since),
          supabase.from('trends').select('id', { count: 'exact', head: true }).eq('is_active', true).gte('created_at', since),
          supabase.from('tips').select('id', { count: 'exact', head: true }).eq('is_active', true).gte('created_at', since),
          supabase.from('lectures').select('id', { count: 'exact', head: true }).eq('is_published', true).gte('created_at', since),
          supabase.from('library_files').select('id', { count: 'exact', head: true }).gte('created_at', since),
        ]);
        const s = [];
        if ((n.count || 0) > 0) s.push('notice');
        if ((t.count || 0) > 0) s.push('trends');
        if ((ti.count || 0) > 0) s.push('tips');
        if ((l.count || 0) > 0) s.push('online');
        if ((lf.count || 0) > 0) s.push('library');
        setNewPages(s);
      } catch (e) { console.error('NEW 체크 실패:', e); }
    };
    check();
  }, []);
  return newPages;
}

// =============================================================
// 🎬 useLatestLecture - 최신 강의 + 최근 3일 새 강의 여부
// =============================================================
function useLatestLecture() {
  const [heroLecture, setHeroLecture] = useState({ latest: null, isNew: false });
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase.from('lectures')
          .select('id, title, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(1);
        if (data && data[0]) {
          const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
          setHeroLecture({
            latest: data[0],
            isNew: new Date(data[0].created_at).getTime() > threeDaysAgo,
          });
        }
      } catch (e) { console.error('최신 강의 조회 실패:', e); }
    };
    load();
  }, []);
  return heroLecture;
}

// =============================================================
// 🆕 useRecentUpdates - 홈 화면 최근 3일 업데이트 (수강생용)
// =============================================================
function useRecentUpdates() {
  const [updates, setUpdates] = useState([]);
  useEffect(() => {
    const load = async () => {
      try {
        const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const [notices, trends, tips, lectures, library] = await Promise.all([
          supabase.from('notices').select('id, title, created_at').gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('trends').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('tips').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('lectures').select('id, title, created_at').eq('is_published', true).gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('library_files').select('id, name, created_at').gte('created_at', since).order('created_at', { ascending: false }),
        ]);
        const all = [
          ...(notices.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '공지', page: 'notice' })),
          ...(trends.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '트렌드', page: 'trends' })),
          ...(tips.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '꿀팁', page: 'tips' })),
          ...(lectures.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '강의', page: 'online' })),
          ...(library.data || []).map(x => ({ id: x.id, title: x.name, created_at: x.created_at, type: '자료', page: 'library' })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setUpdates(all);
      } catch (e) { console.error('홈 업데이트 조회 실패:', e); }
    };
    load();
  }, []);
  return updates;
}

export default function HSSUPApp() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const isPoppingRef = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    // standalone 모드(설치된 앱)에서만 스플래시 표시
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
                    || window.navigator.standalone === true;
    return standalone;
  });

  // 📰 선택된 상세 항목 추적 (공지/Q&A/커뮤니티 상세보기용)
  const [selectedNotice, setSelectedNotice] = useState(null);

  const [selectedQna, setSelectedQna] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);

  const [selectedLecture, setSelectedLecture] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [selectedTip, setSelectedTip] = useState(null);
  const [selectedLibrary, setSelectedLibrary] = useState(null);

  // 자동 업데이트 상태
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  // 🍊 Pull-to-Refresh 상태
  const mainRef = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
    
  // PWA 설치 가능 여부 감지
  useEffect(() => {
    // iOS 감지
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // 이미 설치되어 standalone 모드로 실행 중인지 확인
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
                    || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // 설치 배너 닫은 적 있는지 확인
    const dismissed = localStorage.getItem('hssup_install_dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const shouldShow = !standalone && (Date.now() - dismissedTime > sevenDays);

    // Android/PC Chrome: beforeinstallprompt 이벤트
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      if (shouldShow) setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS는 별도 안내 (Safari에서는 자동 프롬프트 없음)
    if (isIOSDevice && !standalone && shouldShow) {
      setShowInstallBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    // iOS는 자동 설치 불가 → 가이드 모달 표시
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    // Android/Chrome: 네이티브 설치 프롬프트
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setInstallPrompt(null);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('hssup_install_dismissed', Date.now().toString());
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });
 
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
 
    return () => subscription.unsubscribe();
  }, []);

  // 🍊 프로필 실시간 구독 - 운영진 임명/온보딩 완료 등 자동 반영
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel(`profile-realtime-${session.user.id}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // 🔄 자동 업데이트 감지 시스템
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration;
    let intervalId;

    navigator.serviceWorker.ready.then((reg) => {
      registration = reg;
      
      // 1분마다 업데이트 확인
      intervalId = setInterval(() => {
        reg.update();
      }, 60 * 1000);
      
      // 새 SW 발견 시 알림
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setUpdateAvailable(true);
          }
        });
      });
    });
    
    // 새 SW 활성화되면 자동 새로고침
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // 업데이트 적용 함수
  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  };

  // 토스 결제 응답 URL 처리 (성공/실패 자동 라우팅)
  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus === 'success') {
      setCurrentPage('payment-success');
    } else if (paymentStatus === 'fail') {
      setCurrentPage('payment-fail');
    }
  }, [profile]);

  // 🔔 푸시 알림 클릭 등에서 ?page=XXX 로 진입 시 해당 페이지로 라우팅
  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams(window.location.search);
    const targetPage = params.get('page');
    if (!targetPage) return;
    setCurrentPage(targetPage);
    // URL 정리 (?page= 제거)
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  }, [profile]);

  // 🍊 Pull-to-Refresh 로직
  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;

    let startY = 0;
    let isPulling = false;
    let currentDist = 0;

    const onTouchStart = (e) => {
      if (container.scrollTop === 0 && !refreshing) {
        startY = e.touches[0].pageY;
        isPulling = true;
      }
    };

    const onTouchMove = (e) => {
      if (!isPulling) return;
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY;
      if (diff > 0) {
        currentDist = Math.min(diff * 0.5, 100);
        setPullDistance(currentDist);
      }
    };

    const onTouchEnd = () => {
      if (!isPulling) return;
      isPulling = false;
      if (currentDist > 60) {
        setRefreshing(true);
        setTimeout(() => window.location.reload(), 300);
      } else {
        setPullDistance(0);
      }
      currentDist = 0;
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [refreshing]);
 
  const loadProfile = async (userId) => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      // 🍊 마지막 페이지 복원 (앱 재진입 시)
      const lastPage = sessionStorage.getItem('hssup_last_page');
      const defaultPage = (data.role === 'admin' || data.role === 'staff') ? 'dashboard' : 'home';

      // 1. sessionStorage에 결제 페이지가 남아있으면 우선 복원
      if (lastPage === 'payment' || lastPage === 'product-detail') {
        try {
          const sp = sessionStorage.getItem('hssup_sel_product');
          const sc = sessionStorage.getItem('hssup_sel_course');
          if (sp) setSelectedProduct(JSON.parse(sp));
          if (sc) setSelectedCourse(JSON.parse(sc));
        } catch (e) { /* 파싱 실패는 무시 */ }
        setCurrentPage(lastPage);
      } else if (lastPage) {
        // 2. 그 외 일반 페이지는 단순 복원
        setCurrentPage(lastPage);
      } else {
        // 3. sessionStorage가 비어있음 (PWA 강제종료 후 재시작 등)
        //    → localStorage 백업에서 결제·상세를 30분 TTL로 복원 시도
        let restored = false;
        try {
          const raw = localStorage.getItem('hssup_payment_resume');
          if (raw) {
            const resume = JSON.parse(raw);
            const RESUME_TTL = 30 * 60 * 1000;  // 30분
            const isFresh = Date.now() - (resume.ts || 0) < RESUME_TTL;
            const isSameUser = resume.userId === data.id;
            const isPaymentFlow = resume.page === 'payment' || resume.page === 'product-detail';
            if (isFresh && isSameUser && isPaymentFlow) {
              if (resume.product) setSelectedProduct(resume.product);
              if (resume.course) setSelectedCourse(resume.course);
              setCurrentPage(resume.page);
              restored = true;
            } else {
              localStorage.removeItem('hssup_payment_resume');
            }
          }
        } catch (e) { /* 무시 */ }
        if (!restored) setCurrentPage(defaultPage);
      }
    }
    setLoading(false);
  };
 
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null); setSession(null); setDrawerOpen(false);
  };
 
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  const canViewRevenue = profile?.role === 'admin';

  // 🔝 탑 레벨 페이지 (뒤로가기 버튼 안 보임, 햄버거만)
  const TOP_LEVEL_PAGES = isAdmin
    ? ['dashboard', 'admin-students', 'admin-qna', 'admin-notice', 'mypage']
    : ['home', 'course', 'market', 'community', 'mypage'];
  const isSubPage = profile && !TOP_LEVEL_PAGES.includes(currentPage);

  // 🔙 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 모바일/브라우저 뒤로가기 버튼 연동
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // 페이지가 바뀔 때마다 브라우저 히스토리에 자동 기록
  useEffect(() => {
    if (!profile) return; // 로그인 전에는 작동 안 함
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return; // 🍊 뒤로가기로 바뀐 거면 기록 다시 안 쌓음
    }
    window.history.pushState({ page: currentPage }, '', '');
  }, [currentPage, profile]);

  // 🍊 페이지 상태를 sessionStorage에 저장 (앱 재진입 시 복원용)
  useEffect(() => {
    if (!profile || !currentPage) return;
    const SAVABLE_PAGES = [
      'home', 'dashboard', 'mypage', 'notice', 'qna', 'course', 'online',
      'best', 'mycase', 'library', 'market', 'community', 'freeboard',
      'greetings', 'reviews', 'improvements', 'my-activity',
      'payment', 'product-detail',
      'admin-approvals', 'admin-orders', 'admin-shipments', 'admin-students', 'admin-qna',
      'admin-notice', 'admin-cases', 'admin-lectures', 'admin-products',
      'admin-library', 'admin-courses', 'admin-improvements', 'admin-trends',
      'trends', 'tips', 'admin-tips'
    ];
    if (SAVABLE_PAGES.includes(currentPage)) {
      sessionStorage.setItem('hssup_last_page', currentPage);
    }
  }, [currentPage, profile]);

  // 🍊 결제 대상(상품/클래스)을 sessionStorage에 저장 — 앱 재시작 시 결제/상세 페이지 복원용
  // (금액 검증은 nicepay-return Edge Function이 DB에서 재확인하므로 위변조 무관)
  useEffect(() => {
    if (selectedProduct) {
      sessionStorage.setItem('hssup_sel_product', JSON.stringify(selectedProduct));
    }
  }, [selectedProduct]);
  useEffect(() => {
    if (selectedCourse) {
      sessionStorage.setItem('hssup_sel_course', JSON.stringify(selectedCourse));
    }
  }, [selectedCourse]);

  // 🍊 결제·상세 페이지일 땐 localStorage에도 백업 (PWA가 OS에 의해 강제 종료될 때 sessionStorage가 사라지는 문제 대응)
  //    - 30분 TTL + userId 검증으로 stale·다른 사용자 데이터 차단
  //    - 결제 외 페이지로 가면 백업 제거
  useEffect(() => {
    if (!profile) return;
    if (currentPage === 'payment' || currentPage === 'product-detail') {
      try {
        localStorage.setItem('hssup_payment_resume', JSON.stringify({
          userId: profile.id,
          page: currentPage,
          product: selectedProduct,
          course: selectedCourse,
          ts: Date.now(),
        }));
      } catch (e) { /* quota 등 무시 */ }
    } else {
      localStorage.removeItem('hssup_payment_resume');
    }
  }, [currentPage, profile, selectedProduct, selectedCourse]);

  // 사용자가 뒤로가기 누르면 → 이전 페이지로 이동
  useEffect(() => {
    const handlePopState = (e) => {
      // 드로어(햄버거 메뉴)가 열려있으면 → 드로어만 닫기
      if (drawerOpen) {
        setDrawerOpen(false);
        window.history.pushState({ page: currentPage }, '', '');
        return;
      }
      // 페이지 이동
      isPoppingRef.current = true;
      if (e.state && e.state.page) {
        setCurrentPage(e.state.page);
      } else {
        // 더 갈 곳이 없으면 홈/대시보드로
        setCurrentPage(isAdmin ? 'dashboard' : 'home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [drawerOpen, currentPage, isAdmin]);

  const studentTabs = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'MENU', label: '메뉴', icon: Menu, isMenu: true },
  { id: 'course', label: '강의', icon: BookOpen },
  { id: 'market', label: '재료샵', icon: ShoppingBag },
  { id: 'freeboard', label: '게시판', icon: Users },
  { id: 'mypage', label: 'MY', icon: User },
  ];
  const adminTabs = [
    { id: 'MENU', label: '메뉴', icon: Menu, isMenu: true },
    { id: 'dashboard', label: '대시보드', icon: BarChart3 },
    { id: 'admin-students', label: '수강생', icon: UserCheck },
    { id: 'admin-qna', label: 'Q&A', icon: MessageCircle },
    { id: 'admin-notice', label: '공지', icon: Bell },
    { id: 'mypage', label: 'MY', icon: User },
  ];
  const tabs = isAdmin ? adminTabs : studentTabs;
 
  const studentMenu = [
    { section: 'LEARN', items: [
      { id: 'home', label: '홈', icon: Home },
      { id: 'course', label: '클래스', icon: BookOpen },
      { id: 'online', label: '온라인 강의', icon: PlayCircle },
      { id: 'tips', label: '수업·꿀팁', icon: Sparkles },
    ]},
    { section: 'PRACTICE', items: [
      { id: 'mycase', label: '개별피드백', icon: Camera },
      { id: 'best', label: '베스트 케이스', icon: Award },
      
    ]},
    { section: 'CONNECT', items: [
      { id: 'notice', label: '학원공지', icon: Bell },
      { id: 'trends', label: '트렌드 속보', icon: Sparkles },
      { id: 'qna', label: 'Q&A', icon: MessageCircle },
      { id: 'improvements', label: '개선 제안', icon: Edit3 },
      { id: 'greetings', label: '가입 인사', icon: Sparkles },
      { id: 'reviews', label: '수강후기', icon: Heart },
      { id: 'freeboard', label: '자유게시판', icon: Users },
    ]},
    { section: 'RESOURCE', items: [
      { id: 'library', label: '자료실', icon: FolderOpen },
      { id: 'market', label: '재료샵', icon: ShoppingBag },
    ]},
    { section: 'LEGAL', items: [
      { id: 'terms', label: '이용약관', icon: FileText },
      { id: 'privacy', label: '개인정보처리방침', icon: FileText },
      { id: 'refund', label: '환불정책', icon: FileText },
    ]},
    { section: 'MY', items: [
      { id: 'mypage', label: '마이페이지', icon: User },
    ]},
  ];
  const adminMenu = [
    { section: 'ADMIN', items: [
      { id: 'dashboard', label: '대시보드', icon: BarChart3 },
      { id: 'admin-approvals', label: '가입 승인', icon: UserCheck },
      ...(canViewRevenue ? [{ id: 'admin-orders', label: '결제 내역', icon: ShoppingBag }] : []),
      { id: 'admin-shipments', label: '주문 관리', icon: Package },
      { id: 'admin-students', label: '수강생', icon: UserCheck },
      { id: 'admin-qna', label: 'Q&A 답변', icon: MessageCircle },
      { id: 'admin-improvements', label: '개선 제안 답변', icon: Edit3 },
      { id: 'admin-notice', label: '학원공지 관리', icon: Bell },
      { id: 'admin-trends', label: '트렌드 속보 관리', icon: Sparkles },
      { id: 'admin-tips', label: '수업·꿀팁 관리', icon: Sparkles },
      { id: 'admin-cases', label: '케이스 관리', icon: Camera },
      { id: 'admin-lectures', label: '강의 관리', icon: PlayCircle },
      { id: 'admin-products', label: '재료샵 관리', icon: ShoppingBag },
      { id: 'admin-library', label: '자료실 관리', icon: FolderOpen },
      { id: 'admin-courses', label: '클래스 관리', icon: BookOpen },
    ]},
    { section: 'LEARN', items: [
      { id: 'home', label: '홈', icon: Home },
      { id: 'course', label: '클래스', icon: BookOpen },
      { id: 'online', label: '온라인 강의', icon: PlayCircle },
      { id: 'tips', label: '수업·꿀팁', icon: Sparkles },
    ]},
    { section: 'PRACTICE', items: [
      { id: 'mycase', label: '개별피드백', icon: Camera },
      { id: 'best', label: '베스트 케이스', icon: Award },
      
    ]},
    { section: 'CONNECT', items: [
      { id: 'notice', label: '학원공지', icon: Bell },
      { id: 'trends', label: '트렌드 속보', icon: Sparkles },
      { id: 'qna', label: 'Q&A', icon: MessageCircle },
      { id: 'greetings', label: '가입 인사', icon: Sparkles },
      { id: 'reviews', label: '수강후기', icon: Heart },
      { id: 'freeboard', label: '자유게시판', icon: Users },
    ]},
    { section: 'RESOURCE', items: [
      { id: 'library', label: '자료실', icon: FolderOpen },
      { id: 'market', label: '재료샵', icon: ShoppingBag },
    ]},
    { section: 'LEGAL', items: [
      { id: 'terms', label: '이용약관', icon: FileText },
      { id: 'privacy', label: '개인정보처리방침', icon: FileText },
      { id: 'refund', label: '환불정책', icon: FileText },
    ]},
    { section: 'MY', items: [
      { id: 'mypage', label: '마이페이지', icon: User },
    ]},
  ];
  const fullMenu = isAdmin ? adminMenu : studentMenu;
 
  return (
    <div className="flex justify-center" style={{ background: COLORS.cream, position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        html, body, #root { height: 100%; margin: 0; padding: 0; overflow: hidden; overscroll-behavior: none; }
        .font-display { font-family: 'Pretendard', sans-serif; font-weight: 800; letter-spacing: -0.03em; }
        .font-heading { font-family: 'Pretendard', sans-serif; font-weight: 700; letter-spacing: -0.025em; }
        .font-body { font-family: 'Pretendard', sans-serif; letter-spacing: -0.01em; }
        .font-serif-italic { font-family: 'Instrument Serif', serif; font-style: italic; }
        .font-mono { font-family: 'Pretendard', sans-serif; font-feature-settings: "tnum"; }
        select option { background: #161616; color: #FFFFFF; padding: 8px; }
        select { color-scheme: dark; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .glow-text { text-shadow: 0 0 12px rgba(255, 92, 31, 0.75), 0 0 28px rgba(255, 92, 31, 0.3); }
        .glow-primary { box-shadow: 0 0 24px rgba(255, 92, 31, 0.4), 0 0 6px rgba(255, 92, 31, 0.6); }
        .glow-soft { box-shadow: 0 0 32px rgba(255, 92, 31, 0.2); }
        .glow-dot { box-shadow: 0 0 14px rgba(255, 92, 31, 0.9), 0 0 6px rgba(255, 92, 31, 1); }
        .glow-ring { box-shadow: 0 0 0 1px rgba(255, 92, 31, 0.4), 0 0 30px rgba(255, 92, 31, 0.25); }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-down { animation: slideDown 0.4s ease-out; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, #1F1F1F 0%, #2A2A2A 50%, #1F1F1F 100%) !important;
          background-size: 200% 100% !important;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @media (min-width: 481px) {
          .app-container {
            max-width: 480px;
            margin: 0 auto;
            box-shadow: 0 0 40px rgba(0,0,0,0.08);
          }
        }
      `}</style>

<div className="app-container relative w-full overflow-hidden flex flex-col" style={{ background: COLORS.cream, height: '100%' }}>
 
          {loading ? <LoadingScreen /> :
           !session || !profile ? <AuthScreen /> :
           profile.status === 'pending' && profile.role !== 'admin' ? <PendingApprovalScreen user={profile} handleLogout={handleLogout} /> :
           profile.status === 'rejected' && profile.role !== 'admin' ? <RejectedScreen user={profile} handleLogout={handleLogout} /> :
           (profile.status === 'suspended' || profile.status === 'deleted') && profile.role !== 'admin' ? <SuspendedScreen profile={profile} handleLogout={handleLogout} /> : (
            <>
              <AppHeader user={profile} isAdmin={isAdmin}
                onMenuClick={() => setDrawerOpen(true)}
                onLogoClick={() => setCurrentPage(isAdmin ? 'dashboard' : 'home')}
                onProfileClick={() => setCurrentPage('mypage')}
                showBackButton={isSubPage}
                onBackClick={() => window.history.back()} />
              <main ref={mainRef} className="flex-1 overflow-y-auto scrollbar-hide relative" style={{ 
                background: COLORS.cream, 
                overscrollBehavior: 'contain',
                paddingBottom: '16px',
                transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none',
                transition: pullDistance === 0 && !refreshing ? 'transform 0.3s ease' : 'none'
              }}>
                {/* 🍊 Pull-to-Refresh 인디케이터 */}
                {(pullDistance > 0 || refreshing) && (
                  <div className="absolute left-0 right-0 flex justify-center pointer-events-none z-50"
                    style={{
                      top: `${Math.max(10, pullDistance - 40)}px`,
                      opacity: Math.min(1, pullDistance / 60),
                    }}>
                    <div className="rounded-full p-3" style={{ background: COLORS.cardElev, boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 16px rgba(255, 92, 31, 0.3)' }}>
                      <Loader2 size={20} 
                        className={refreshing ? 'animate-spin' : ''} 
                        style={{ 
                          color: COLORS.primary,
                          transform: !refreshing ? `rotate(${pullDistance * 4}deg)` : 'none',
                          transition: !refreshing ? 'transform 0.1s' : 'none'
                        }} />
                    </div>
                  </div>
                )}
                <div className="animate-fade-in" style={{ background: COLORS.cream, minHeight: '100%' }}>
                  <PageRouter currentPage={currentPage} setCurrentPage={setCurrentPage} 
                    selectedNotice={selectedNotice} setSelectedNotice={setSelectedNotice}
                    selectedQna={selectedQna} setSelectedQna={setSelectedQna}
                    selectedPost={selectedPost} setSelectedPost={setSelectedPost}
                    selectedLecture={selectedLecture} setSelectedLecture={setSelectedLecture}
                    selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse}
                    selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct}
                    selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent}
                    selectedTrend={selectedTrend} setSelectedTrend={setSelectedTrend}
                    selectedTip={selectedTip} setSelectedTip={setSelectedTip}
                    selectedLibrary={selectedLibrary} setSelectedLibrary={setSelectedLibrary}
                    user={profile} handleLogout={handleLogout} isAdmin={isAdmin} canViewRevenue={canViewRevenue} />
                </div>
              </main>
              <BottomTabBar tabs={tabs} currentPage={currentPage} setCurrentPage={setCurrentPage} setDrawerOpen={setDrawerOpen} />
              {drawerOpen && (
                <Drawer fullMenu={fullMenu} user={profile} isAdmin={isAdmin}
                  currentPage={currentPage}
                  setCurrentPage={(p) => { setCurrentPage(p); setDrawerOpen(false); }}
                  onClose={() => setDrawerOpen(false)} handleLogout={handleLogout} />
              )}
            </>
          )}
      </div>

      {/* 자동 업데이트 알림 */}
      {updateAvailable && (
        <UpdateBanner onUpdate={applyUpdate} onDismiss={() => setUpdateAvailable(false)} />
      )}

      {/* PWA 설치 배너 */}
      {showInstallBanner && (
        <InstallBanner
          isIOS={isIOS}
          onInstall={handleInstall}
          onClose={dismissInstallBanner}
        />
      )}

      {/* iOS 설치 가이드 모달 */}
      {showIOSGuide && (
        <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />
      )}

      {/* 스플래시 화면 (설치된 앱 첫 진입 시) */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </div>
  );
}

// =============================================================
// 🖼️ SkeletonImage - 로딩 중 스켈레톤 깜빡임 (Instagram 스타일)
// =============================================================
function SkeletonImage({ src, alt, className = '', style = {}, onError, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ ...style, background: COLORS.cardElev }}>
        <ImageIcon size={32} style={{ color: COLORS.stone, opacity: 0.4 }} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ ...style, background: COLORS.cardElev }}>
      {!loaded && <div className="absolute inset-0 skeleton-shimmer"></div>}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); if (onError) onError(); }}
        loading="lazy"
        decoding="async"
        {...rest}
      />
    </div>
  );
}

function Avatar({ user, size = 'md', onClick }) {
  // 사이즈별 스타일
  const sizes = {
    xs: { w: '24px', h: '24px', text: '11px' },
    sm: { w: '32px', h: '32px', text: '13px' },
    md: { w: '40px', h: '40px', text: '16px' },
    lg: { w: '48px', h: '48px', text: '18px' },
    xl: { w: '64px', h: '64px', text: '24px' },
    xxl: { w: '80px', h: '80px', text: '32px' },
  };
  const s = sizes[size] || sizes.md;
  const colorKey = user?.avatar_color || 'orange';
  const gradient = (AVATAR_COLORS[colorKey] || AVATAR_COLORS.orange).gradient;
  const initial = getInitial(user?.name);

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-center rounded-full shrink-0"
      style={{
        width: s.w,
        height: s.h,
        background: gradient,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <span
        className="font-display font-bold"
        style={{
          fontSize: s.text,
          color: '#FFFFFF',
          letterSpacing: '-0.02em',
          textShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      >
        {initial}
      </span>
    </div>
  );
}

// =============================================================
// ⭐ 등급 계산 헬퍼 (활동 + 매출 기반)
// =============================================================
function calculateLevel(stats) {
  const activityPoints = (stats.cases || 0) * 10 + 
                         (stats.posts || 0) * 5 + 
                         (stats.comments || 0) * 2 + 
                         (stats.likes || 0) * 1;
  const purchasePoints = (stats.orders || 0) * 30 + 
                         Math.floor((stats.totalSpent || 0) / 10000);
  const total = activityPoints + purchasePoints;
  
  if (total >= 2000) return { 
    level: 'vip', label: 'VIP', emoji: '👑', 
    color: '#FF6B9D', glow: 'rgba(255, 107, 157, 0.6)',
    next: null, current: total 
  };
  if (total >= 1000) return { 
    level: 'platinum', label: 'PLATINUM', emoji: '💎', 
    color: '#B9F2FF', glow: 'rgba(185, 242, 255, 0.5)',
    next: { label: 'VIP', need: 2000 - total, totalForNext: 2000, prevMilestone: 1000 }, current: total 
  };
  if (total >= 500) return { 
    level: 'gold', label: 'GOLD', emoji: '🥇',
    color: '#FFD700', glow: 'rgba(255, 215, 0, 0.5)',
    next: { label: 'PLATINUM', need: 1000 - total, totalForNext: 1000, prevMilestone: 500 }, current: total 
  };
  if (total >= 100) return { 
    level: 'silver', label: 'SILVER', emoji: '🥈',
    color: '#E0E0E0', glow: 'rgba(192, 192, 192, 0.5)',
    next: { label: 'GOLD', need: 500 - total, totalForNext: 500, prevMilestone: 100 }, current: total 
  };
  return { 
    level: 'bronze', label: 'BRONZE', emoji: '🥉',
    color: '#CD7F32', glow: 'rgba(205, 127, 50, 0.5)',
    next: { label: 'SILVER', need: 100 - total, totalForNext: 100, prevMilestone: 0 }, current: total 
  };
}

// =============================================================
// ⭐ LevelCard - 등급 카드 (활동 + 매출 통합)
// =============================================================
function LevelCard({ userId, hideRevenue, setCurrentPage }) {
  const [stats, setStats] = useState({ cases: 0, posts: 0, comments: 0, likes: 0, orders: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [
        { count: cases },
        { count: posts },
        { count: comments },
        { count: likes },
        { data: ordersData }
      ] = await Promise.all([
        supabase.from('cases').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('orders').select('amount').eq('user_id', userId).eq('status', 'paid'),
      ]);
      const orders = ordersData?.length || 0;
      const totalSpent = (ordersData || []).reduce((sum, o) => sum + Number(o.amount || 0), 0);
      setStats({ 
        cases: cases || 0, 
        posts: posts || 0, 
        comments: comments || 0, 
        likes: likes || 0,
        orders,
        totalSpent
      });
      setLoading(false);
    };
    load();
  }, [userId]);

  const level = calculateLevel(stats);

  // 진행 바 계산 (이전 등급 기준점에서 다음 등급 기준점까지의 비율)
  const progress = level.next 
    ? Math.min(100, Math.max(0, 
        ((level.current - level.next.prevMilestone) / (level.next.totalForNext - level.next.prevMilestone)) * 100
      ))
    : 100;

  const formatMoney = (n) => {
    if (n >= 10000) return (n / 10000).toFixed(0) + '만';
    return n.toLocaleString();
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-5 flex items-center justify-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, minHeight: '180px' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: COLORS.cardElev }}>
      {/* 배경 글로우 */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" 
        style={{ background: `radial-gradient(circle, ${level.glow}, transparent 70%)` }}></div>
      
      <div className="relative">
        <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Your Level</p>
        
        <div className="flex items-center gap-3 mt-3">
          <span className="text-5xl">{level.emoji}</span>
          <div className="flex-1">
            <p className="font-display text-2xl tracking-tight" style={{ color: level.color }}>{level.label}</p>
            <p className="font-mono text-[11px] mt-0.5" style={{ color: COLORS.stone }}>활동 점수 {level.current}점</p>
          </div>
          {!hideRevenue && stats.orders > 0 && (
            <div className="text-right">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>VIP</p>
              <p className="font-display text-lg tracking-tight" style={{ color: COLORS.primary }}>{stats.orders}건</p>
            </div>
          )}
        </div>

        {/* 진행 바 */}
        {level.next && (
          <>
            <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ background: COLORS.cream }}>
              <div className="h-full rounded-full transition-all duration-1000" 
                style={{ 
                  width: `${progress}%`, 
                  background: COLORS.primary, 
                  boxShadow: '0 0 12px rgba(255, 92, 31, 0.4)' 
                }}></div>
            </div>
            <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>
              다음 등급 <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{level.next.label}</span>까지 <span style={{ color: COLORS.ink, fontWeight: 'bold' }}>{level.next.need}점</span>
            </p>
          </>
        )}
        {!level.next && (
          <p className="font-serif-italic text-sm mt-3" style={{ color: level.color }}>✨ 최고 등급에 도달했습니다!</p>
        )}

        {/* 활동 통계 (클릭 가능) */}
        <div className="grid grid-cols-4 gap-1 mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
          <button onClick={() => setCurrentPage && setCurrentPage('mycase')}
            disabled={!setCurrentPage}
            className="text-center rounded-lg p-2 transition-transform active:scale-95 disabled:active:scale-100"
            style={{ background: setCurrentPage ? 'rgba(255,92,31,0.05)' : 'transparent' }}>
            <p className="font-display text-base" style={{ color: COLORS.ink }}>{stats.cases}</p>
            <p className="font-mono text-[9px] mt-0.5" style={{ color: setCurrentPage ? COLORS.primary : COLORS.stone }}>케이스</p>
          </button>
          <button onClick={() => {
              if (!setCurrentPage) return;
              sessionStorage.setItem('hssup_activity_tab', 'posts');
              setCurrentPage('my-activity');
            }}
            disabled={!setCurrentPage}
            className="text-center rounded-lg p-2 transition-transform active:scale-95 disabled:active:scale-100"
            style={{ background: setCurrentPage ? 'rgba(255,92,31,0.05)' : 'transparent' }}>
            <p className="font-display text-base" style={{ color: COLORS.ink }}>{stats.posts}</p>
            <p className="font-mono text-[9px] mt-0.5" style={{ color: setCurrentPage ? COLORS.primary : COLORS.stone }}>게시글</p>
          </button>
          <button onClick={() => {
              if (!setCurrentPage) return;
              sessionStorage.setItem('hssup_activity_tab', 'comments');
              setCurrentPage('my-activity');
            }}
            disabled={!setCurrentPage}
            className="text-center rounded-lg p-2 transition-transform active:scale-95 disabled:active:scale-100"
            style={{ background: setCurrentPage ? 'rgba(255,92,31,0.05)' : 'transparent' }}>
            <p className="font-display text-base" style={{ color: COLORS.ink }}>{stats.comments}</p>
            <p className="font-mono text-[9px] mt-0.5" style={{ color: setCurrentPage ? COLORS.primary : COLORS.stone }}>댓글</p>
          </button>
          <button onClick={() => {
              if (!setCurrentPage) return;
              sessionStorage.setItem('hssup_activity_tab', 'likes');
              setCurrentPage('my-activity');
            }}
            disabled={!setCurrentPage}
            className="text-center rounded-lg p-2 transition-transform active:scale-95 disabled:active:scale-100"
            style={{ background: setCurrentPage ? 'rgba(255,92,31,0.05)' : 'transparent' }}>
            <p className="font-display text-base" style={{ color: COLORS.ink }}>{stats.likes}</p>
            <p className="font-mono text-[9px] mt-0.5" style={{ color: setCurrentPage ? COLORS.primary : COLORS.stone }}>좋아요</p>
          </button>
        </div>

        {/* 결제 통계 (admin만 표시) */}
        {!hideRevenue && stats.orders > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <div className="text-center rounded-lg py-2" style={{ background: 'rgba(255, 92, 31, 0.08)' }}>
              <p className="font-display text-base" style={{ color: COLORS.primary }}>{stats.orders}</p>
              <p className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.stone }}>결제 건수</p>
            </div>
            <div className="text-center rounded-lg py-2" style={{ background: 'rgba(255, 92, 31, 0.08)' }}>
              <p className="font-display text-base" style={{ color: COLORS.primary }}>{formatMoney(stats.totalSpent)}</p>
              <p className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.stone }}>구매 금액</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1800); // 1.8초 후 사라짐
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: `url('/splash.jpg') center center / cover no-repeat`,
        animation: 'fadeOut 0.4s ease-in 1.4s forwards',
      }}>
      <style>{`
        @keyframes fadeOut {
          to { opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .splash-content {
          animation: fadeInUp 0.6s ease-out;
        }
      `}</style>

      </div>
  );
}

// =============================================================
// 🔄 UpdateBanner - 새 버전 알림 배너
// =============================================================
function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[200] max-w-[450px] mx-auto rounded-2xl p-4 animate-slide-down"
      style={{
        background: COLORS.primary,
        boxShadow: '0 0 40px rgba(255, 92, 31, 0.5), 0 8px 24px rgba(0,0,0,0.3)'
      }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Sparkles size={18} style={{ color: COLORS.white }} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm" style={{ color: COLORS.white }}>새 버전이 있어요! ✨</p>
          <p className="font-body text-[11px] mt-0.5" style={{ color: COLORS.white, opacity: 0.9 }}>업데이트하면 새 기능을 만날 수 있어요</p>
        </div>
        <button onClick={onDismiss} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <X size={14} style={{ color: COLORS.white }} />
        </button>
        <button onClick={onUpdate}
          className="px-4 py-2 rounded-full font-heading text-xs shrink-0"
          style={{ background: COLORS.white, color: COLORS.primary, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          업데이트
        </button>
      </div>
    </div>
  );
}

// =============================================================
// ⏳ PendingApprovalScreen - 승인 대기 화면
// =============================================================
function PendingApprovalScreen({ user, handleLogout }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto" style={{ background: COLORS.cream }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 pulse-glow"
        style={{ background: 'rgba(255,92,31,0.15)', border: `2px solid ${COLORS.primary}` }}>
        <Clock size={32} style={{ color: COLORS.primary }} />
      </div>
      
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Pending Approval</p>
      <h2 className="font-display text-3xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>
        승인 대기 중<span className="glow-text" style={{ color: COLORS.primary }}>.</span>
      </h2>
      <p className="font-serif-italic text-base mt-2" style={{ color: COLORS.stone }}>Almost there!</p>
      
      <div className="rounded-2xl p-5 mt-6 w-full max-w-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
        <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink }}>
          <strong>{user.name}</strong>님 안녕하세요! 🌸<br /><br />
          가입 신청이 접수되었어요.<br />
          원장님께서 확인 후 승인해드릴게요.<br /><br />
          승인되면 모든 콘텐츠를 이용하실 수 있어요!
        </p>
      </div>

      <div className="mt-6 p-3 rounded-xl max-w-sm" style={{ background: COLORS.peach }}>
        <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.deep }}>
          💡 보통 1~24시간 내에 승인됩니다.<br />
          급한 경우 원장님께 직접 문의해주세요.
        </p>
      </div>

      <button onClick={handleLogout} className="mt-8 font-heading text-sm px-6 py-3 rounded-full flex items-center gap-2" 
        style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
        <LogOut size={14} />로그아웃
      </button>
    </div>
  );
}

// =============================================================
// ❌ RejectedScreen - 거절 화면
// =============================================================
function RejectedScreen({ user, handleLogout }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center overflow-y-auto" style={{ background: COLORS.cream }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: COLORS.card, border: `2px solid ${COLORS.stone}` }}>
        <X size={32} style={{ color: COLORS.stone }} strokeWidth={2.5} />
      </div>
      
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.stone }}>━━ Not Approved</p>
      <h2 className="font-display text-2xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>
        가입이 거절되었습니다
      </h2>
      
      <div className="rounded-2xl p-5 mt-6 w-full max-w-sm" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
        {user.rejected_reason ? (
          <>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.stone }}>거절 사유</p>
            <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink }}>{user.rejected_reason}</p>
          </>
        ) : (
          <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.stone }}>
            관리자가 가입을 승인하지 않았습니다.<br />
            문의사항은 원장님께 직접 연락 주세요.
          </p>
        )}
      </div>

      <button onClick={handleLogout} className="mt-8 font-heading text-sm px-6 py-3 rounded-full flex items-center gap-2" 
        style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
        <LogOut size={14} />로그아웃
      </button>
    </div>
  );
}

function InstallBanner({ isIOS, onInstall, onClose }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-slide-up">
      <button onClick={onInstall} className="w-full max-w-[480px] mx-auto rounded-2xl p-4 shadow-2xl relative overflow-hidden text-left transition-transform active:scale-[0.98] block"
        style={{ background: COLORS.cardElev }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${COLORS.primary}50, transparent 70%)` }}></div>

        <span onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer z-10"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <X size={14} style={{ color: COLORS.ink }} />
        </span>

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: COLORS.primary }}>
            <span className="font-display font-bold text-2xl" style={{ color: COLORS.white }}>H.</span>
          </div>

          <div className="flex-1 min-w-0 pr-7">
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Install App</p>
            <h3 className="font-heading text-sm mt-1" style={{ color: COLORS.white }}>HSSUP 앱으로 설치하기</h3>
            <p className="font-body text-[11px] mt-1 leading-relaxed" style={{ color: COLORS.ink, opacity: 0.75 }}>
              {isIOS
                ? '탭하면 설치 방법을 알려드려요'
                : '탭하면 바로 홈 화면에 추가됩니다'}
            </p>
          </div>

          <ArrowUpRight size={20} strokeWidth={2.5} style={{ color: COLORS.primary }} className="shrink-0" />
        </div>
      </button>
    </div>
  );
}

// =============================================================
// 📱 IOSInstallGuide - iPhone 설치 가이드 모달
// =============================================================
function IOSInstallGuide({ onClose }) {
  const steps = [
    {
      n: '1',
      title: '공유 버튼 탭',
      desc: 'Safari 하단의 공유 아이콘을 눌러주세요',
      icon: '⬆️'
    },
    {
      n: '2',
      title: '"홈 화면에 추가" 선택',
      desc: '메뉴를 아래로 스크롤해서 찾아주세요',
      icon: '➕'
    },
    {
      n: '3',
      title: '"추가" 탭',
      desc: '우측 상단의 "추가" 버튼을 눌러 완료!',
      icon: '✨'
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 animate-fade-in" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] rounded-3xl p-6 animate-slide-up relative" style={{ background: COLORS.cream }}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: COLORS.light }}>
          <X size={16} style={{ color: COLORS.ink }} />
        </button>

        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: COLORS.primary }}>
            <span className="font-display font-bold text-3xl" style={{ color: COLORS.white }}>H.</span>
          </div>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ iOS Install Guide</p>
          <h2 className="font-display text-2xl mt-2 tracking-tight" style={{ color: COLORS.ink }}>홈 화면에 추가하기</h2>
        </div>

        {/* 단계별 안내 */}
        <div className="space-y-3">
          {steps.map(step => (
            <div key={step.n} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-lg"
                style={{ background: COLORS.cardElev, color: COLORS.ink }}>
                {step.n}
              </div>
              <div className="flex-1">
                <p className="font-heading text-sm flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                  {step.title} <span>{step.icon}</span>
                </p>
                <p className="font-body text-xs mt-0.5" style={{ color: COLORS.stone }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 안내 메시지 */}
        <div className="mt-5 p-3 rounded-xl text-center" style={{ background: COLORS.peach }}>
          <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.deep }}>
            🍎 iPhone은 Apple 정책상 자동 설치가 불가능해서<br />수동으로 추가해주셔야 해요!
          </p>
        </div>

        <button onClick={onClose} className="w-full mt-5 font-heading text-sm py-3.5 rounded-full"
          style={{ background: COLORS.cardElev, color: COLORS.ink }}>
          이해했어요!
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center" style={{ background: COLORS.cream }}>
      <img src="/logo-white.png" alt="HSSUP Academy" style={{ height: '40px', filter: 'drop-shadow(0 0 16px rgba(255, 92, 31, 0.5))' }} />
      <Loader2 size={20} className="animate-spin mt-8" style={{ color: COLORS.primary }} />
    </div>
  );
}
 
function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showFindPw, setShowFindPw] = useState(false);
  const [findPwEmail, setFindPwEmail] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '', username: '', email: '', password: '', passwordConfirm: '',
    phone: '', course: '눈썹 마스터 클래스', avatar_color: 'orange',
    is_graduate: false
  });

  // 📜 회원가입 동의 + 약관 모달 state
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | 'refund' | null
  const allAgreed = agreedTerms && agreedPrivacy && agreedAge;
  const toggleAll = (checked) => {
    setAgreedTerms(checked);
    setAgreedPrivacy(checked);
    setAgreedAge(checked);
  };

  const handleLogin = async () => {
    setError(''); setInfo('');
    if (!loginForm.username.trim()) return setError('아이디를 입력해주세요');
    if (!loginForm.password) return setError('비밀번호를 입력해주세요');
    setLoading(true);
    
    let emailToUse = loginForm.username.trim();
    
    // 이메일 형식이 아니면 → 아이디로 가정 → 이메일 조회
    if (!emailToUse.includes('@')) {
      const { data: foundEmail, error: rpcError } = await supabase.rpc('lookup_email_by_username', { 
        p_username: emailToUse 
      });
      if (rpcError || !foundEmail) {
        setError('등록되지 않은 아이디입니다');
        setLoading(false);
        return;
      }
      emailToUse = foundEmail;
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse, 
      password: loginForm.password
    });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다');
      } else {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setError(''); setInfo('');
    if (!signupForm.name || !signupForm.username || !signupForm.email || !signupForm.password) {
      return setError('필수 항목을 모두 입력해주세요');
    }
    if (!/^[a-z0-9_]{3,20}$/.test(signupForm.username.toLowerCase())) {
      return setError('아이디는 영어 소문자, 숫자, _ 만 사용 (3~20자)');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupForm.email)) {
      return setError('올바른 이메일 형식이 아닙니다');
    }
    if (signupForm.password !== signupForm.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
    if (signupForm.password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다');
    if (!agreedTerms || !agreedPrivacy || !agreedAge) {
      return setError('필수 약관에 모두 동의해주세요');
    }
    setLoading(true);

    // username 중복 체크
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', signupForm.username.toLowerCase())
      .maybeSingle();
    
    if (existing) {
      setError('이미 사용 중인 아이디입니다');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: signupForm.email.trim().toLowerCase(),
      password: signupForm.password,
      options: { 
        data: { 
          name: signupForm.name, 
          username: signupForm.username.toLowerCase(),
          phone: signupForm.phone, 
          course: signupForm.course, 
          avatar_color: signupForm.avatar_color,
          is_graduate: signupForm.is_graduate
        } 
      }
    });
    if (error) {
      if (error.message.includes('already registered')) {
        setError('이미 가입된 이메일입니다');
      } else {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  const handleFindPassword = async () => {
    setError(''); setInfo('');
    if (!findPwEmail.trim()) return setError('이메일을 입력해주세요');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(findPwEmail)) {
      return setError('올바른 이메일 형식이 아닙니다');
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(findPwEmail.trim(), {
      redirectTo: `${window.location.origin}?reset=true`
    });
    if (error) {
      setError(error.message);
    } else {
      setInfo(`✉️ ${findPwEmail}로 비밀번호 재설정 메일을 보냈어요!\n메일을 확인해주세요.`);
      setFindPwEmail('');
    }
    setLoading(false);
  };
 
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative h-[45%] flex flex-col justify-end p-7 overflow-hidden" style={{ background: COLORS.cream }}>
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[120%] h-[120%] rounded-full"
            style={{
              background: `radial-gradient(circle at 70% 50%, rgba(255,92,31,0.45) 0%, rgba(255,92,31,0.12) 30%, transparent 60%)`,
              filter: 'blur(20px)'
            }}></div>
        </div>
        <div className="absolute top-12 right-0 opacity-30">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="98" stroke={COLORS.primary} strokeWidth="0.5" />
            <circle cx="100" cy="100" r="70" stroke={COLORS.primary} strokeWidth="0.5" />
            <circle cx="100" cy="100" r="42" stroke={COLORS.primary} strokeWidth="0.5" />
          </svg>
        </div>
        <div className="absolute top-1/3 left-0 right-0 h-px opacity-40"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.primary} 50%, transparent 100%)` }}></div>

        <div className="relative" style={{ color: COLORS.ink }}>
          <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase" style={{ color: COLORS.primary }}>Beauty Academy</p>
          <img src="/logo-white.png" alt="HSSUP Academy" style={{ height: '60px', marginTop: '12px', filter: 'drop-shadow(0 0 24px rgba(255, 92, 31, 0.5))' }} />
        </div>
      </div>
 
      <div className="flex-1 px-7 py-6 overflow-y-auto scrollbar-hide">
        {showFindPw ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowFindPw(false); setError(''); setInfo(''); }}>
                <ChevronLeft size={20} style={{ color: COLORS.ink }} />
              </button>
              <h2 className="font-heading text-base" style={{ color: COLORS.ink }}>비밀번호 찾기</h2>
            </div>
            <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.stone }}>
              가입 시 사용한 이메일을 입력하면<br/>비밀번호 재설정 링크를 보내드려요 🍊
            </p>
            <div>
              <label className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: COLORS.stone }}>EMAIL</label>
              <input type="email" value={findPwEmail} 
                onChange={e => setFindPwEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFindPassword()}
                placeholder="가입 시 사용한 이메일"
                className="w-full font-body text-base font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>
            {info && <p className="font-body text-xs leading-relaxed whitespace-pre-line" style={{ color: COLORS.primary }}>{info}</p>}
            {error && <p className="font-body text-xs" style={{ color: COLORS.deep }}>{error}</p>}
            <button onClick={handleFindPassword} disabled={loading} 
              className="w-full font-heading text-sm py-4 mt-4 flex items-center justify-between px-5 disabled:opacity-60"
              style={{ background: COLORS.primary, color: COLORS.white, borderRadius: '999px', boxShadow: '0 0 32px rgba(255, 92, 31, 0.5)' }}>
              <span className="flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}재설정 메일 보내기</span>
              <Mail size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-6 mb-6">
              <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="font-heading text-base"
                style={{ color: mode === 'login' ? COLORS.ink : COLORS.stone, opacity: mode === 'login' ? 1 : 0.4 }}>로그인</button>
              <button onClick={() => { setMode('signup'); setError(''); setInfo(''); }} className="font-heading text-base"
                style={{ color: mode === 'signup' ? COLORS.ink : COLORS.stone, opacity: mode === 'signup' ? 1 : 0.4 }}>회원가입</button>
            </div>
     
            {mode === 'login' ? (
              <div className="space-y-4">
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: COLORS.stone }}>아이디</label>
                  <input type="text" value={loginForm.username} 
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                    placeholder="아이디 또는 이메일" 
                    autoComplete="username"
                    className="w-full font-body text-base font-medium border-b py-2 mt-1 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: COLORS.stone }}>Password</label>
                  <input type="password" value={loginForm.password} 
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full font-body text-base font-medium border-b py-2 mt-1 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                </div>
                {error && <p className="font-body text-xs" style={{ color: COLORS.deep }}>{error}</p>}
                <button onClick={handleLogin} disabled={loading} className="w-full font-heading text-sm py-4 mt-4 flex items-center justify-between px-5 disabled:opacity-60"
                  style={{ background: COLORS.primary, color: COLORS.white, borderRadius: '999px', boxShadow: '0 0 32px rgba(255, 92, 31, 0.5), 0 0 8px rgba(255, 92, 31, 0.3)' }}>
                  <span className="flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}Enter HSSUP</span>
                  <ArrowUpRight size={18} />
                </button>
                <button onClick={() => { setShowFindPw(true); setError(''); setInfo(''); }}
                  className="w-full mt-2 font-mono text-[11px] text-center"
                  style={{ color: COLORS.stone, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>NAME *</label>
                  <input type="text" value={signupForm.name} onChange={e => setSignupForm({ ...signupForm, name: e.target.value })}
                    placeholder="홍길동" className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>아이디 *</label>
                  <input type="text" value={signupForm.username} 
                    onChange={e => setSignupForm({ ...signupForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="영어 소문자/숫자 (3~20자)" 
                    autoComplete="off"
                    className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                  <p className="font-mono text-[9px] mt-1" style={{ color: COLORS.stone }}>로그인 시 사용</p>
                </div>
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>이메일 *</label>
                  <input type="email" value={signupForm.email} 
                    onChange={e => setSignupForm({ ...signupForm, email: e.target.value })}
                    placeholder="your@email.com" className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                  <p className="font-mono text-[9px] mt-1" style={{ color: COLORS.stone }}>비밀번호 찾기에 사용됩니다</p>
                </div>
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>PASSWORD *</label>
                  <input type="password" value={signupForm.password} 
                    onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="6자 이상" className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>CONFIRM *</label>
                  <input type="password" value={signupForm.passwordConfirm} 
                    onChange={e => setSignupForm({ ...signupForm, passwordConfirm: e.target.value })}
                    placeholder="비밀번호 재입력" className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>PHONE</label>
                  <input type="tel" value={signupForm.phone} 
                    onChange={e => setSignupForm({ ...signupForm, phone: e.target.value })}
                    placeholder="010-0000-0000" className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none"
                    style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>CLASS</label>
                  <select value={signupForm.course} onChange={e => setSignupForm({ ...signupForm, course: e.target.value })}
                    className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                    <option>눈썹 베이직 클래스</option><option>눈썹 마스터 클래스</option><option>아이라인 클래스</option>
                    <option>입술 문신 클래스</option><option>속눈썹 펌·연장 클래스</option><option>올인원 마스터 클래스</option>
                  </select>
                </div>

                {/* 🎓 신입생 / 졸업생 선택 */}
                <div className="pt-2">
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>STUDENT TYPE *</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button type="button" onClick={() => setSignupForm({ ...signupForm, is_graduate: false })}
                      className="rounded-xl p-3 transition-all text-center"
                      style={{ 
                        background: !signupForm.is_graduate ? 'rgba(255,92,31,0.1)' : COLORS.card,
                        border: `1px solid ${!signupForm.is_graduate ? COLORS.primary : COLORS.light}`,
                        boxShadow: !signupForm.is_graduate ? '0 0 16px rgba(255, 92, 31, 0.2)' : 'none'
                      }}>
                      <p className="text-xl mb-1">🌱</p>
                      <p className="font-body text-xs font-semibold" style={{ color: !signupForm.is_graduate ? COLORS.primary : COLORS.ink }}>
                        신입생
                      </p>
                      <p className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.stone }}>
                        처음 등록
                      </p>
                    </button>
                    <button type="button" onClick={() => setSignupForm({ ...signupForm, is_graduate: true })}
                      className="rounded-xl p-3 transition-all text-center"
                      style={{ 
                        background: signupForm.is_graduate ? 'rgba(255,92,31,0.1)' : COLORS.card,
                        border: `1px solid ${signupForm.is_graduate ? COLORS.primary : COLORS.light}`,
                        boxShadow: signupForm.is_graduate ? '0 0 16px rgba(255, 92, 31, 0.2)' : 'none'
                      }}>
                      <p className="text-xl mb-1">🎓</p>
                      <p className="font-body text-xs font-semibold" style={{ color: signupForm.is_graduate ? COLORS.primary : COLORS.ink }}>
                        졸업생
                      </p>
                      <p className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.stone }}>
                        영상 면제
                      </p>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>AVATAR COLOR</label>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-full shrink-0"
                      style={{
                        width: '52px', height: '52px',
                        background: (AVATAR_COLORS[signupForm.avatar_color] || AVATAR_COLORS.orange).gradient,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}>
                      <span className="font-display font-bold text-xl" style={{ color: '#FFF', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                        {getInitial(signupForm.name) || '?'}
                      </span>
                    </div>
                    <div className="flex-1 grid grid-cols-6 gap-1.5">
                      {Object.entries(AVATAR_COLORS).map(([key, c]) => (
                        <button key={key} type="button"
                          onClick={() => setSignupForm({ ...signupForm, avatar_color: key })}
                          className="aspect-square rounded-full"
                          style={{
                            background: c.gradient,
                            border: signupForm.avatar_color === key ? `2px solid ${COLORS.ink}` : '2px solid transparent',
                            boxShadow: signupForm.avatar_color === key ? '0 0 0 2px rgba(255,92,31,0.3)' : 'none',
                            transform: signupForm.avatar_color === key ? 'scale(0.92)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }}
                          title={c.name}
                        ></button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && <p className="font-body text-xs" style={{ color: COLORS.deep }}>{error}</p>}

                {/* 📜 약관 동의 (필수) */}
                <div className="rounded-2xl p-4 space-y-3 my-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                  <label className="flex items-center gap-3 cursor-pointer pb-3" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
                    <input type="checkbox" checked={allAgreed} onChange={e => toggleAll(e.target.checked)}
                      className="w-5 h-5 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                    <span className="font-heading text-xs" style={{ color: COLORS.ink }}>전체 동의</span>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-3">
                      <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)}
                        className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                      <span className="font-body text-xs" style={{ color: COLORS.stone }}>
                        <span style={{ color: COLORS.deep }}>[필수]</span> 이용약관 동의
                      </span>
                    </span>
                    <button type="button" onClick={() => setLegalModal('terms')} className="font-mono text-[10px] underline"
                      style={{ color: COLORS.primary }}>보기</button>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-3">
                      <input type="checkbox" checked={agreedPrivacy} onChange={e => setAgreedPrivacy(e.target.checked)}
                        className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                      <span className="font-body text-xs" style={{ color: COLORS.stone }}>
                        <span style={{ color: COLORS.deep }}>[필수]</span> 개인정보처리방침 동의
                      </span>
                    </span>
                    <button type="button" onClick={() => setLegalModal('privacy')} className="font-mono text-[10px] underline"
                      style={{ color: COLORS.primary }}>보기</button>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={agreedAge} onChange={e => setAgreedAge(e.target.checked)}
                      className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                    <span className="font-body text-xs" style={{ color: COLORS.stone }}>
                      <span style={{ color: COLORS.deep }}>[필수]</span> 만 14세 이상입니다
                    </span>
                  </label>
                </div>

                <button onClick={handleSignup} disabled={loading} className="w-full font-heading text-sm py-4 mt-4 flex items-center justify-between px-5 disabled:opacity-60"
                  style={{ background: COLORS.primary, color: COLORS.white, borderRadius: '999px', boxShadow: '0 0 32px rgba(255, 92, 31, 0.5), 0 0 8px rgba(255, 92, 31, 0.3)' }}>
                  <span className="flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}Join HSSUP</span>
                  <ArrowUpRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 📜 약관 보기 모달 (회원가입 화면용) */}
      {legalModal && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: COLORS.cream }}>
          <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
            <span className="font-heading text-base" style={{ color: COLORS.ink }}>
              {legalModal === 'terms' ? '이용약관' : legalModal === 'privacy' ? '개인정보처리방침' : '환불정책'}
            </span>
            <button onClick={() => setLegalModal(null)} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: COLORS.card }}>
              <X size={18} style={{ color: COLORS.ink }} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <pre style={{
              fontFamily: 'inherit',
              color: COLORS.stone,
              fontSize: '12px',
              lineHeight: '1.75',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              margin: 0
            }}>{legalModal === 'terms' ? LEGAL_TERMS : legalModal === 'privacy' ? LEGAL_PRIVACY : LEGAL_REFUND}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function AppHeader({ user, isAdmin, onMenuClick, onLogoClick, onProfileClick, showBackButton, onBackClick }) {
  return (
    <header className="shrink-0 relative z-10" style={{
      background: 'rgba(10, 10, 10, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${COLORS.light}`,
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* 왼쪽: 햄버거 또는 뒤로가기 */}
        <button onClick={showBackButton ? onBackClick : onMenuClick}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {showBackButton
            ? <ChevronLeft size={18} style={{ color: COLORS.ink }} strokeWidth={2.5} />
            : <Menu size={18} style={{ color: COLORS.ink }} strokeWidth={2} />
          }
        </button>

        {/* 가운데: 로고 */}
        <button onClick={onLogoClick} className="flex items-center transition-transform active:scale-95">
          <img src="/logo-white.png" alt="HSSUP" style={{ height: '24px', filter: 'drop-shadow(0 0 8px rgba(255, 92, 31, 0.4))' }} />
          {isAdmin && (
            <span className="ml-2 font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" 
              style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 8px rgba(255,92,31,0.5)' }}>
              ADMIN
            </span>
          )}
        </button>

        {/* 오른쪽: 프로필 아바타 */}
        <button onClick={onProfileClick} className="transition-transform active:scale-90">
          <Avatar user={user} size="sm" />
        </button>
      </div>
    </header>
  );
}

function BottomTabBar({ tabs, currentPage, setCurrentPage, setDrawerOpen }) {
  return (
    <nav className="shrink-0 grid grid-cols-6" style={{
      background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${COLORS.light}`, paddingBottom: 'env(safe-area-inset-bottom, 0px)'
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isMenu = tab.isMenu;
        const isActive = !isMenu && currentPage === tab.id;
        return (
          <button key={tab.id} onClick={() => {
            if (isMenu) {
              setDrawerOpen(true);
            } else {
              setCurrentPage(tab.id);
            }
          }} className="pt-2 pb-0.5 flex flex-col items-center gap-1 relative">
            {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full glow-dot" style={{ background: COLORS.primary }}></span>}
            <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} style={{ color: isActive ? COLORS.ink : COLORS.stone }} />
            <span className="font-body text-[10px]" style={{ color: isActive ? COLORS.ink : COLORS.stone, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
 
function Drawer({ fullMenu, user, isAdmin, currentPage, setCurrentPage, onClose, handleLogout }) {
  const newPages = useNewPages();

  return (
    <div className="absolute inset-0 z-50 animate-fade-in">
      <div onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(26, 26, 26, 0.6)', backdropFilter: 'blur(8px)' }}></div>
      <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto scrollbar-hide animate-slide-up" style={{
        background: COLORS.cream, boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
      }}>
        <div className="relative p-5 pt-12 overflow-hidden" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
          {/* 오렌지 라디얼 글로우 (배경 액센트) */}
          <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 25% 0%, rgba(255,92,31,0.3) 0%, transparent 60%)` }}></div>
          {/* 미세한 가로선 (액센트) */}
          <div className="absolute top-8 left-5 w-8 h-px" style={{ background: COLORS.primary, opacity: 0.6 }}></div>

          <div className="relative flex items-center gap-3" style={{ color: COLORS.ink }}>
            <Avatar user={user} size="lg" />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-heading text-sm">{user.name}</p>
                {isAdmin && <span className="font-body text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 8px rgba(255,92,31,0.5)' }}>ADMIN</span>}
              </div>
              <p className="font-serif-italic text-xs opacity-70 mt-0.5" style={{ color: COLORS.stone }}>{user.course}</p>
            </div>
          </div>
        </div>
        <nav className="p-4">
          {fullMenu.map((section, si) => (
            <div key={si} className="mb-5">
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] mb-2 px-3" style={{ color: COLORS.primary }}>{section.section}</p>
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button key={item.id} onClick={() => setCurrentPage(item.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm font-medium transition-transform active:scale-[0.98]"
                    style={{ background: isActive ? COLORS.primary : 'transparent', color: isActive ? COLORS.white : COLORS.ink, boxShadow: isActive ? '0 0 12px rgba(255, 92, 31, 0.3)' : 'none' }}>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                    {newPages.includes(item.id) && (
                      <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: isActive ? COLORS.white : '#FF3B30' }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="h-px my-3 mx-3" style={{ background: COLORS.light }}></div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm font-medium" style={{ color: COLORS.stone }}>
            <LogOut size={16} />로그아웃
          </button>
        </nav>
      </aside>
    </div>
  );
}
 
function PageRouter({ currentPage, setCurrentPage, selectedNotice, setSelectedNotice, selectedQna, setSelectedQna, selectedPost, setSelectedPost, selectedLecture, setSelectedLecture, selectedCourse, setSelectedCourse, selectedProduct, setSelectedProduct, selectedStudent, setSelectedStudent, selectedTrend, setSelectedTrend, selectedTip, setSelectedTip, selectedLibrary, setSelectedLibrary, user, handleLogout, isAdmin, canViewRevenue }) {
  // Debug route removed
  // 🍊 온보딩 체크 - 졸업생은 인사+후기, 신입생은 전부 필요
  const needsOnboarding = !isAdmin && user && (
    user.is_graduate 
      ? (!user.onb_greeting || !user.onb_review)  // 🎓 졸업생: 인사+후기만
      : (!user.onb_greeting || !user.onb_review || !user.onb_video)  // 🌱 신입생: 전부
  );
  const ONBOARDING_ALLOWED = ['onboarding', 'greetings', 'reviews', 'community', 'freeboard', 'lecture-detail', 'mypage'];
  
  if (needsOnboarding && !ONBOARDING_ALLOWED.includes(currentPage)) {
    return <OnboardingScreen user={user} setCurrentPage={setCurrentPage} setSelectedLecture={setSelectedLecture} />;
  }
  if (currentPage === 'onboarding') {
    return <OnboardingScreen user={user} setCurrentPage={setCurrentPage} setSelectedLecture={setSelectedLecture} />;
  }

  if (isAdmin) {
    if (currentPage === 'dashboard') return <AdminDashboard setCurrentPage={setCurrentPage} canViewRevenue={canViewRevenue} />;
    if (currentPage === 'admin-notice') return <AdminNotice user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
    if (currentPage === 'admin-approvals') return <AdminApprovals user={user} />;
    if (currentPage === 'admin-orders') {
      if (!canViewRevenue) return <NoPermissionScreen setCurrentPage={setCurrentPage} />;
      return <AdminOrders user={user} />;
    }
    if (currentPage === 'admin-shipments') return <AdminOrdersPage user={user} setCurrentPage={setCurrentPage} />;
    if (currentPage === 'admin-students') return <AdminStudents setCurrentPage={setCurrentPage} setSelectedStudent={setSelectedStudent} />;
    if (currentPage === 'admin-student-detail') return <AdminStudentDetail student={selectedStudent} setCurrentPage={setCurrentPage} canViewRevenue={canViewRevenue} />;
    if (currentPage === 'admin-qna') return <AdminQna user={user} />;
    if (currentPage === 'admin-cases') return <AdminCases />;
    if (currentPage === 'admin-lectures') return <AdminLectures user={user} />;
    if (currentPage === 'admin-products') return <AdminProducts user={user} />;
    if (currentPage === 'admin-library') return <AdminLibrary user={user} />;
    if (currentPage === 'admin-courses') return <AdminCourses user={user} />;
    if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} />;
  }
  if (currentPage === 'notice-detail') return <NoticeDetailPage notice={selectedNotice} user={user} />;
  if (currentPage === 'qna-detail') return <QnaDetailPage qna={selectedQna} user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'post-detail') return <PostDetailPage post={selectedPost} user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'lecture-detail') return <LectureDetailPage lecture={selectedLecture} user={user} />;
  if (currentPage === 'payment') return <PaymentPage course={selectedCourse} product={selectedProduct} user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'payment-success') return <PaymentSuccessPage user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'payment-fail') return <PaymentFailPage setCurrentPage={setCurrentPage} />;
  if (currentPage === 'product-detail') return <ProductDetailPage product={selectedProduct} user={user} setCurrentPage={setCurrentPage} setSelectedCourse={setSelectedCourse} />;
  if (currentPage === 'home') return <HomePage user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
  if (currentPage === 'notice') return <NoticePage user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
  if (currentPage === 'course') return <CoursePage user={user} setCurrentPage={setCurrentPage} setSelectedCourse={setSelectedCourse} setSelectedProduct={setSelectedProduct} />;
  if (currentPage === 'best') return <BestCasePage />;
  if (currentPage === 'mycase') return <MyCasePage user={user} />;
  if (currentPage === 'qna') return <QnaPage user={user} setCurrentPage={setCurrentPage} setSelectedQna={setSelectedQna} />;
  if (currentPage === 'trends') return <TrendsPage user={user} setCurrentPage={setCurrentPage} setSelectedTrend={setSelectedTrend} />;
  if (currentPage === 'trend-detail') return <TrendDetailPage trend={selectedTrend} user={user} />;
  if (currentPage === 'admin-trends') return <AdminTrends user={user} />;
  if (currentPage === 'tips') return <TipsPage user={user} setCurrentPage={setCurrentPage} setSelectedTip={setSelectedTip} />;
  if (currentPage === 'tip-detail') return <TipDetailPage tip={selectedTip} user={user} />;
  if (currentPage === 'admin-tips') return <AdminTips user={user} />;
  if (currentPage === 'library') return <LibraryPage setCurrentPage={setCurrentPage} setSelectedLibrary={setSelectedLibrary} />;
  if (currentPage === 'library-detail') return <LibraryDetailPage file={selectedLibrary} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'market') return <MarketPage setCurrentPage={setCurrentPage} setSelectedProduct={setSelectedProduct} />;
  if (currentPage === 'online') return <OnlineLecturePage setCurrentPage={setCurrentPage} setSelectedLecture={setSelectedLecture} />;
  if (currentPage === 'community') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="자유" pageTitle="자유게시판" pageEn="Free Board" pageDesc="자유롭게 이야기 나눠보세요" />;
  if (currentPage === 'greetings') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="인사" pageTitle="가입 인사" pageEn="Greetings" pageDesc="신규 회원들을 따뜻하게 환영해주세요" />;
  if (currentPage === 'reviews') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="후기" pageTitle="수강후기" pageEn="Reviews" pageDesc="동료들의 수강 후기를 만나보세요" />;
  if (currentPage === 'freeboard') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="자유" pageTitle="자유게시판" pageEn="Free Board" pageDesc="자유롭게 이야기 나눠보세요" />;
  if (currentPage === 'terms') return <LegalPage ko="이용약관" en="Terms of Service" desc="서비스 이용 규칙" content={LEGAL_TERMS} />;
  if (currentPage === 'privacy') return <LegalPage ko="개인정보처리방침" en="Privacy Policy" desc="개인정보 수집·이용 안내" content={LEGAL_PRIVACY} />;
  if (currentPage === 'refund') return <LegalPage ko="환불정책" en="Refund Policy" desc="수강료·상품 환불 안내" content={LEGAL_REFUND} />;
  if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'my-activity') return <MyActivityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} />;
  if (currentPage === 'improvements') return <ImprovementsPage user={user} />;
  if (currentPage === 'admin-improvements') return <AdminImprovements user={user} />;
  return <HomePage user={user} setCurrentPage={setCurrentPage} />;
}
 
function PageIntro({ ko, en, desc }) {
  return (
    <div className="px-5 pt-5 pb-6">
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ {en}</p>
      <h1 className="font-display text-4xl mt-3 tracking-tighter" style={{ color: COLORS.ink }}>{ko}<span className="glow-text" style={{ color: COLORS.primary }}>.</span></h1>
    </div>
  );
}

// =============================================================
// Debug component to demonstrate anonymity behavior
// =============================================================
function DebugQnaTest() {
  const mockAuthor = { name: '홍길동', avatar_color: 'orange' };
  const anonAuthor = { name: '익명', avatar_color: 'charcoal' };
  const now = new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });

  return (
    <div className="p-5">
      <h2 className="font-display text-2xl mb-4" style={{ color: COLORS.ink }}>Debug: Q&A 익명 표시 테스트</h2>

      <div className="mb-6">
        <p className="font-mono text-sm" style={{ color: COLORS.stone }}>일반 사용자 표시 (should be 익명)</p>
        <div className="flex items-center gap-3 mt-2 p-4 rounded-2xl" style={{ background: COLORS.card }}>
          <Avatar user={anonAuthor} size="sm" />
          <div>
            <p style={{ color: COLORS.ink }}>{anonAuthor.name}</p>
            <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{now}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="font-mono text-sm" style={{ color: COLORS.stone }}>운영진 표시 (should show real name)</p>
        <div className="flex items-center gap-3 mt-2 p-4 rounded-2xl" style={{ background: COLORS.card }}>
          <Avatar user={mockAuthor} size="sm" />
          <div>
            <p style={{ color: COLORS.ink }}>{mockAuthor.name}</p>
            <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{now}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// ❤️ LikeButton 컴포넌트 (만능 좋아요 버튼)
// =============================================================
function LikeButton({ targetType, targetId, userId, size = 14 }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId || !userId) return;
    load();
  }, [targetType, targetId, userId]);

  const load = async () => {
    // 전체 좋아요 수 카운트
    const { count: totalCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    setCount(totalCount || 0);

    // 내가 좋아요 눌렀는지 확인
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('user_id', userId)
      .maybeSingle();
    setLiked(!!data);
  };

  const toggle = async (e) => {
    e.stopPropagation();
    if (loading) return;
    if (!userId) {
      alert('로그인 정보가 없습니다');
      return;
    }
    setLoading(true);

    if (liked) {
      // 좋아요 취소
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq('user_id', userId);
      if (error) {
        console.error('좋아요 취소 에러:', error);
        alert('좋아요 취소 실패: ' + error.message);
      } else {
        setLiked(false);
        setCount(c => Math.max(0, c - 1));
      }
    } else {
      // 좋아요 추가
      const { error } = await supabase
        .from('likes')
        .insert({ target_type: targetType, target_id: targetId, user_id: userId });
      if (error) {
        console.error('좋아요 에러:', error);
        alert('좋아요 실패: ' + error.message);
      } else {
        setLiked(true);
        setCount(c => c + 1);
      }
    }
    setLoading(false);
  };

  return (
    <button onClick={toggle} disabled={loading}
      className="flex items-center gap-1.5 font-mono text-[11px] font-semibold transition-transform active:scale-90">
      <Heart size={size} fill={liked ? COLORS.primary : 'none'} strokeWidth={2.5}
        style={{ color: liked ? COLORS.primary : COLORS.stone }} />
      <span style={{ color: liked ? COLORS.primary : COLORS.stone }}>{count}</span>
    </button>
  );
}

// =============================================================
// 💬 CommentSection 컴포넌트 (만능 댓글창)
// =============================================================
function CommentSection({ targetType, targetId, user }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) return;
    load();
  }, [targetType, targetId]);

  const load = async () => {
    setLoading(true);
    const { data: cData, error } = await supabase
      .from('comments')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('댓글 로드 에러:', error);
      setComments([]);
      setLoading(false);
      return;
    }

    if (!cData || cData.length === 0) {
      setComments([]);
      setLoading(false);
      return;
    }

    // 작성자 프로필 가져오기
    const userIds = [...new Set(cData.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_color, role')
      .in('id', userIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    const enriched = cData.map(c => ({ ...c, profile: profileMap[c.user_id] || { name: '익명' } }));
    setComments(enriched);
    setLoading(false);
  };

  const submit = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    const { error } = await supabase.from('comments').insert({
      target_type: targetType,
      target_id: targetId,
      user_id: user.id,
      content: newComment.trim()
    });
    if (error) {
      alert('댓글 작성 실패: ' + error.message);
    } else {
      setNewComment('');
      await load();
    }
    setPosting(false);
  };

  const remove = async (commentId) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    await supabase.from('comments').delete().eq('id', commentId);
    await load();
  };

  const isAdmin = user?.role === 'admin';

  return (
    <section className="mt-5 pt-5" style={{ borderTop: `1px solid ${COLORS.light}` }}>
      <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: COLORS.primary }}>
        ━━ Comments {comments.length > 0 && `(${comments.length})`}
      </p>

      {/* 댓글 작성 */}
      <div className="flex gap-2 mb-5 items-center">
        <Avatar user={user} size="sm" />
        <div className="flex-1 flex gap-2">
          <input type="text" value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="댓글을 남겨보세요"
            className="flex-1 font-body text-xs font-medium border-b py-2 bg-transparent outline-none"
            style={{ borderColor: COLORS.light, color: COLORS.ink }} />
          <button onClick={submit} disabled={posting || !newComment.trim()}
            className="px-3 rounded-full flex items-center disabled:opacity-40"
            style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>

      {/* 댓글 목록 */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin" style={{ color: COLORS.primary }} />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center font-body text-xs py-4" style={{ color: COLORS.stone }}>
          첫 댓글을 남겨보세요!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar user={c.profile} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading text-xs" style={{ color: COLORS.ink }}>{c.profile.name}</p>
                  {c.profile.role === 'admin' && (
                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>ADMIN</span>
                  )}
                  <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                    {new Date(c.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {(c.user_id === user.id || isAdmin) && (
                    <button onClick={() => remove(c.id)} className="ml-auto p-0.5">
                      <Trash2 size={11} style={{ color: COLORS.stone }} />
                    </button>
                  )}
                </div>
                <p className="font-body text-xs mt-1 leading-relaxed whitespace-pre-line break-words" style={{ color: COLORS.ink }}>
                  {c.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HomePage({ user, setCurrentPage, setSelectedNotice }) {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setNotices(data || []));
  }, []);

  // 2x2 그리드 메인 메뉴
  const mainGrid = [
    { id: 'online',    label: 'ONLINE CLASS', ko: '온라인 강의', icon: PlayCircle },
    { id: 'qna',       label: 'Q&A',          ko: '질문 답변',   icon: MessageCircle },
    { id: 'freeboard', label: 'BOARD',        ko: '자유게시판',  icon: Users },
    { id: 'market',    label: 'STORE',        ko: '재료샵',      icon: ShoppingBag },
  ];

  const heroLecture = useLatestLecture();
  const homeUpdates = useRecentUpdates();   // ← 이 줄 추가!

  return (
    <div className="pb-6">
      {/* 환영 메시지 */}
      <section className="px-5 pt-6 pb-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-16 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,92,31,0.4), rgba(255,92,31,0.12) 35%, transparent 70%)' }}></div>
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase relative" style={{ color: COLORS.primary }}>━━ Today</p>
        <h2 className="font-display text-[42px] leading-[1] mt-3 tracking-tighter relative" style={{ color: COLORS.ink }}>
          Hello,<br />
          <span style={{ color: COLORS.primary }} className="glow-text">{user.name?.length > 1 ? user.name.slice(1) : user.name}님</span>
        </h2>
      </section>

      {/* 🆕 NEW 업데이트 (수강생) */}
      {homeUpdates.length > 0 && (
        <section className="px-5 mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ NEW 업데이트</p>
            <span className="font-mono text-[9px]" style={{ color: COLORS.stone }}>최근 3일</span>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {homeUpdates.slice(0, 5).map((u, i) => (
              <button key={`${u.type}-${u.id}`} onClick={() => setCurrentPage(u.page)}
                className="w-full text-left flex items-center gap-2.5 p-3 transition-transform active:scale-[0.98]"
                style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none' }}>
                <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-1 rounded shrink-0" style={{ background: COLORS.peach, color: COLORS.deep }}>{u.type}</span>
                <p className="font-body text-xs flex-1 truncate" style={{ color: COLORS.ink }}>{u.title}</p>
                <span className="font-mono text-[9px] shrink-0" style={{ color: COLORS.stone }}>{new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                <ChevronRight size={12} style={{ color: COLORS.stone }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 히어로 카드 - 최신 강의 */}
      <section className="px-5 mb-5">
        <button onClick={() => setCurrentPage('online')} className="w-full rounded-3xl p-6 text-left relative overflow-hidden glow-primary" style={{ background: COLORS.primary }}>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
          <div className="relative" style={{ color: COLORS.white }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase opacity-80">━━ ONLINE CLASS{heroLecture.isNew && ' · NEW'}</p>
            <h3 className="font-display text-2xl mt-2 leading-tight tracking-tight">{heroLecture.isNew ? <>새로운 강의가<br />업데이트 되었습니다</> : <>온라인 강의로<br />실력을 키워보세요</>}</h3>
            {heroLecture.latest && (
              <p className="font-body text-xs mt-2 opacity-90 truncate">{heroLecture.isNew ? '🆕 ' : '최신 · '}{heroLecture.latest.title}</p>
            )}
            <div className="flex items-center justify-end mt-5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: COLORS.white }}>
                <Play size={15} fill={COLORS.primary} style={{ color: COLORS.primary }} className="ml-0.5" />
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* 2x2 메인 그리드 */}
      <section className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {mainGrid.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setCurrentPage(item.id)}
                className="aspect-square rounded-3xl p-5 flex flex-col justify-between transition-transform active:scale-95 text-left relative overflow-hidden"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                {/* 미묘한 오렌지 글로우 */}
                <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, rgba(255,92,31,0.2), transparent 70%)` }}></div>
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center glow-soft" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
                  <Icon size={22} strokeWidth={1.8} style={{ color: COLORS.primary }} />
                </div>
                <div className="relative">
                  <p className="font-display text-base tracking-tight" style={{ color: COLORS.ink }}>{item.label}</p>
                  <p className="font-mono text-[10px] mt-0.5 tracking-widest" style={{ color: COLORS.stone }}>{item.ko}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 공지 미리보기 */}
      <section className="px-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Notice</p>
            <h3 className="font-heading text-xl mt-1.5" style={{ color: COLORS.ink }}>공지사항</h3>
          </div>
          <button onClick={() => setCurrentPage('notice')} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: COLORS.stone }}>
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {notices.length === 0 ? (
            <p className="font-body text-xs text-center py-8" style={{ color: COLORS.stone }}>공지가 없습니다</p>
          ) : notices.map((n, i) => (
            <button key={n.id} onClick={() => { setSelectedNotice(n); setCurrentPage('notice-detail'); }}
              className="w-full text-left flex items-center gap-3 p-4 transition-transform active:scale-[0.98]"
              style={{ borderBottom: i !== notices.length - 1 ? `1px solid ${COLORS.light}` : 'none' }}>
              <span className="font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded" style={{
                background: n.urgent ? COLORS.primary : COLORS.peach,
                color: n.urgent ? COLORS.white : COLORS.deep
              }}>{n.tag}</span>
              <p className="font-body text-xs font-medium flex-1 truncate" style={{ color: COLORS.ink }}>{n.title}</p>
              <ChevronRight size={14} style={{ color: COLORS.stone }} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// =============================================================
// 📰 NoticeDetailPage - 공지 상세보기 (댓글 + 좋아요)
// =============================================================
function NoticeDetailPage({ notice, user }) {
  if (!notice) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>공지를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [/youtube\.com\/watch\?v=([^&\s]+)/, /youtu\.be\/([^?\s]+)/, /youtube\.com\/embed\/([^?\s]+)/, /youtube\.com\/shorts\/([^?\s]+)/];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return null;
  };
  const ytId = notice.video_url && isYouTubeUrl(notice.video_url) ? getYouTubeId(notice.video_url) : null;

  return (
    <div className="pb-6">
      <div className="px-5 pt-5 pb-4">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Notice</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
            background: notice.urgent ? COLORS.primary : COLORS.peach,
            color: notice.urgent ? COLORS.white : COLORS.deep
          }}>{notice.tag}</span>
          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(notice.created_at).toLocaleDateString('ko-KR')}</span>
        </div>
        <h1 className="font-display text-2xl mt-3 tracking-tight leading-tight" style={{ color: COLORS.ink }}>{notice.title}</h1>
      </div>

      {(() => {
        const images = notice.image_urls && notice.image_urls.length ? notice.image_urls : (notice.image_url ? [notice.image_url] : []);
        return images.length > 0 && (
          <div className="px-5 mb-3 space-y-2">
            {images.map((url, i) => (
              <div key={i} className="aspect-video w-full rounded-2xl overflow-hidden" style={{ background: COLORS.cream }}>
                <SkeletonImage src={url} alt={notice.title} className="w-full h-full" />
              </div>
            ))}
          </div>
        );
      })()}

      {notice.video_url && (
        <div className="px-5 mb-3">
          {ytId ? (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden" style={{ background: '#000' }}>
              <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`} title={notice.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" style={{ border: 'none' }} />
            </div>
          ) : (
            <video src={notice.video_url} controls playsInline className="w-full rounded-2xl" style={{ background: '#000', maxHeight: '70vh' }} />
          )}
        </div>
      )}

      <div className="px-5">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
            {notice.content || '내용이 없습니다.'}
          </p>

          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <LikeButton targetType="notice" targetId={notice.id} userId={user.id} size={16} />
          </div>

          <CommentSection targetType="notice" targetId={notice.id} user={user} />
        </div>
      </div>
    </div>
  );
}

function NoticePage({ user, setCurrentPage, setSelectedNotice }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setNotices(data || []); setLoading(false); });
  }, []);
 
  const openDetail = (n) => {
    setSelectedNotice(n);
    setCurrentPage('notice-detail');
  };
 
  if (loading) return <div className="flex justify-center p-10"><Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} /></div>;
 
  return (
    <>
      <PageIntro ko="학원공지" en="Notice" desc="HSSUP 학원의 최신 소식" />
      <div className="px-5 space-y-2">
        {notices.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>등록된 공지가 없습니다</p>
        ) : notices.map(n => (
          <button key={n.id} onClick={() => openDetail(n)} className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded" style={{
                background: n.urgent ? COLORS.primary : COLORS.peach,
                color: n.urgent ? COLORS.white : COLORS.deep
              }}>{n.tag}</span>
              <span className="font-mono text-[10px] font-medium" style={{ color: COLORS.stone }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <p className="font-heading text-sm leading-snug" style={{ color: COLORS.ink }}>{n.title}</p>
            {n.content && <p className="font-body text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: COLORS.stone }}>{n.content}</p>}
            <div className="flex items-center gap-1 mt-2 font-mono text-[10px]" style={{ color: COLORS.primary }}>
              자세히 보기 <ChevronRight size={11} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
 
function CoursePage({ user, setCurrentPage, setSelectedCourse, setSelectedProduct }) {
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('order');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('courses').select('*').eq('is_active', true).order('order_index', { ascending: true })
      .then(({ data }) => { setCourses(data || []); setLoading(false); });
  }, []);

  // 🍊 검색 + 정렬
  const filtered = courses
    .filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const enMatch = (c.en_title || '').toLowerCase().includes(q);
        const levelMatch = (c.level || '').toLowerCase().includes(q);
        if (!titleMatch && !enMatch && !levelMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      // 기본: 추천순 (order_index)
      return (a.order_index || 0) - (b.order_index || 0);
    });

  const isFiltering = searchQuery.trim().length > 0;

  return (
    <>
      <PageIntro ko="클래스" en="Class" desc="당신의 시그니처를 만들어보세요" />

      {/* 🔍 검색바 */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search size={16} style={{ color: COLORS.stone, position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="클래스명, 레벨 검색"
            className="w-full rounded-full pl-10 pr-10 py-3 font-body text-sm outline-none"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
              <X size={12} style={{ color: COLORS.stone }} />
            </button>
          )}
        </div>
      </div>

      {/* 📊 정렬 + 결과 카운트 */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
          {isFiltering ? '검색 결과 ' : '총 '}
          <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{filtered.length}개</span>
        </p>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="font-mono text-[11px] font-semibold rounded-full px-3 py-1.5 outline-none cursor-pointer"
          style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
          <option value="order">추천순</option>
          <option value="newest">최신순</option>
          <option value="price_low">가격 낮은순</option>
          <option value="price_high">가격 높은순</option>
        </select>
      </div>

      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다` : '아직 등록된 클래스가 없습니다'}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-3 font-heading text-xs px-4 py-2 rounded-full" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.35)' }}>
                검색 초기화
              </button>
            )}
          </div>
        ) : filtered.map(c => {
          const features = c.features ? c.features.split('\n').filter(f => f.trim()) : [];
          const discount = c.original_price && c.show_price && c.original_price > c.price
            ? Math.round(((c.original_price - c.price) / c.original_price) * 100)
            : 0;

          return (
            <div key={c.id} className="rounded-3xl overflow-hidden relative" style={{
              background: c.is_featured ? COLORS.cardElev : COLORS.card,
              border: `1px solid ${c.is_featured ? 'rgba(255, 92, 31, 0.4)' : COLORS.light}`,
              boxShadow: c.is_featured ? '0 0 40px rgba(255, 92, 31, 0.3), inset 0 0 30px rgba(255, 92, 31, 0.06)' : 'none'
            }}>
              {c.image_url && (
                <div className="aspect-video relative overflow-hidden">
                  <SkeletonImage src={c.image_url} alt={c.title} className="w-full h-full" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {c.badge && (
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                        background: c.badge === 'BEST' ? COLORS.ink : c.badge === 'NEW' ? COLORS.primary : COLORS.peach,
                        color: c.badge === 'SALE' ? COLORS.deep : (c.badge === 'BEST' ? COLORS.primary : COLORS.white),
                        boxShadow: c.badge === 'NEW' ? '0 0 16px rgba(255, 92, 31, 0.5)' : 'none'
                      }}>{c.badge}</span>
                    )}
                    {c.hot && (
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                        background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.5)'
                      }}>🔥 HOT</span>
                    )}
                    {c.is_featured && (
                      <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                        background: 'rgba(0,0,0,0.6)', color: COLORS.primary, backdropFilter: 'blur(8px)'
                      }}>⭐ FEATURED</span>
                    )}
                  </div>
                </div>
              )}

              {c.is_featured && (
                <>
                  <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, rgba(255,92,31,0.25), transparent 70%)` }}></div>
                  <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, rgba(255,92,31,0.15), transparent 70%)` }}></div>
                </>
              )}

              <div className="p-5 relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <p className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: COLORS.primary }}>{c.level}</p>
                      {!c.image_url && c.hot && (
                        <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 8px rgba(255,92,31,0.5)' }}>🔥 HOT</span>
                      )}
                      {!c.image_url && c.badge && (
                        <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{
                          background: c.badge === 'BEST' ? COLORS.ink : c.badge === 'NEW' ? COLORS.primary : COLORS.peach,
                          color: c.badge === 'BEST' ? COLORS.primary : (c.badge === 'SALE' ? COLORS.deep : COLORS.white),
                        }}>{c.badge}</span>
                      )}
                      {!c.image_url && c.is_featured && (
                        <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,92,31,0.15)', color: COLORS.primary }}>⭐ FEATURED</span>
                      )}
                    </div>
                    <h3 className="font-display text-3xl mt-1.5 tracking-tighter leading-none" style={{ color: COLORS.ink }}>{c.title}</h3>
                    {c.en_title && <p className="font-serif-italic text-sm mt-0.5" style={{ color: COLORS.stone, opacity: 0.7 }}>{c.en_title}</p>}
                  </div>
                  {c.duration && (
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-mono text-[10px] font-bold tracking-widest" style={{ color: COLORS.primary }}>DURATION</p>
                      <p className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>{c.duration}</p>
                    </div>
                  )}
                </div>

                {c.description && (
                  <p className="font-body text-sm font-medium leading-relaxed" style={{ color: COLORS.stone }}>{c.description}</p>
                )}

                {features.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: COLORS.primary, boxShadow: '0 0 8px rgba(255, 92, 31, 0.4)' }}>
                          <Check size={10} strokeWidth={3} style={{ color: COLORS.white }} />
                        </div>
                        <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.ink }}>{f}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${c.is_featured ? 'rgba(255,92,31,0.2)' : COLORS.light}` }}>
                  <div>
                    <p className="font-mono text-[9px] font-bold tracking-widest" style={{ color: COLORS.primary }}>
                      {c.show_price ? 'PRICE' : 'INQUIRY'}
                    </p>
                    {c.show_price ? (
                      <>
                        {discount > 0 && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="font-mono text-[10px] line-through" style={{ color: COLORS.stone }}>
                              ₩{(c.original_price / 10000).toFixed(0)}만
                            </p>
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 8px rgba(255,92,31,0.4)' }}>
                              {discount}% OFF
                            </span>
                          </div>
                        )}
                        <p className="font-display text-xl tracking-tight" style={{ color: COLORS.ink }}>
                          ₩{(c.price / 10000).toFixed(0)}<span className="font-body text-xs font-medium">만</span>
                        </p>
                      </>
                    ) : (
                      <p className="font-display text-xl tracking-tight" style={{ color: COLORS.ink }}>문의하기</p>
                    )}
                  </div>
                  <button onClick={() => {
                    if (!c.show_price) {
                      alert('📞 자세한 안내를 위해 원장님께 문의해주세요!');
                      return;
                    }
                    setSelectedProduct(null);
                    setSelectedCourse(c);
                    setCurrentPage('payment');
                  }}
                    className="font-heading text-xs px-5 py-2.5 rounded-full flex items-center gap-1.5"
                    style={{
                      background: COLORS.primary,
                      color: COLORS.white,
                      boxShadow: '0 0 20px rgba(255, 92, 31, 0.5)'
                    }}>
                    {c.show_price ? '신청하기' : '문의하기'} <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
 
function BestCasePage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cases')
      .select('*, profiles(name, avatar_color, course)')
      .eq('is_best', true)
      .order('created_at', { ascending: false });
    setCases(data || []);
    setLoading(false);
  };

  const filtered = filter === '전체' ? cases : cases.filter(c => c.category === filter);
  const categories = ['전체', '눈썹', '아이라인', '입술', '속눈썹', '헤어라인'];

  return (
    <>
      <PageIntro ko="베스트 케이스" en="Best Case" desc="동료들의 작품에서 영감을 얻으세요" />

      {/* 카테고리 필터 */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
                boxShadow: filter === cat ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Award size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '아직 베스트 케이스가 없습니다' : `${filter} 카테고리에 베스트가 없습니다`}
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>관리자가 우수 케이스를 선정하면 표시됩니다</p>
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="rounded-3xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {/* 이미지 */}
              {c.image_urls?.length > 0 && (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={c.image_urls[0]} alt={c.title} className="w-full h-full object-cover" />
                  {c.image_urls.length > 1 && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full font-mono text-[10px] font-bold flex items-center gap-1"
                      style={{ background: 'rgba(26,26,26,0.7)', color: COLORS.white }}>
                      <ImageIcon size={10} />{c.image_urls.length}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{c.category}</span>
                  <span className="absolute top-3 right-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded flex items-center gap-1" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
                    ★ BEST
                  </span>
                </div>
              )}

              {/* 정보 */}
              <div className="p-5">
                <h4 className="font-heading text-base mb-2" style={{ color: COLORS.ink }}>{c.title}</h4>

                {/* 작성자 정보 */}
                <div className="flex items-center gap-2 mb-3">
                  <Avatar user={c.profiles} size="xs" />
                  <div>
                    <p className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{c.profiles?.name || '익명'}</p>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>{c.profiles?.course}</p>
                  </div>
                </div>

                {c.memo && (
                  <p className="font-body text-xs leading-relaxed pt-3" style={{ color: COLORS.stone, borderTop: `1px solid ${COLORS.light}` }}>{c.memo}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
 
function MyCasePage({ user }) {
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: '눈썹',
    memo: '',
    imageFiles: [],
    imagePreviews: []
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setCases(data || []);
    setLoading(false);
  };

  // 이미지 파일 선택 처리
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // 최대 5장 제한
    const totalFiles = form.imageFiles.length + files.length;
    if (totalFiles > 5) {
      alert('이미지는 최대 5장까지 업로드 가능합니다');
      return;
    }

    // 미리보기 생성
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setForm({
      ...form,
      imageFiles: [...form.imageFiles, ...files],
      imagePreviews: [...form.imagePreviews, ...newPreviews]
    });
  };

  // 미리보기 이미지 제거
  const removePreview = (index) => {
    const newFiles = form.imageFiles.filter((_, i) => i !== index);
    const newPreviews = form.imagePreviews.filter((_, i) => i !== index);
    URL.revokeObjectURL(form.imagePreviews[index]);
    setForm({ ...form, imageFiles: newFiles, imagePreviews: newPreviews });
  };

  // 케이스 등록
  const submit = async () => {
    if (!form.title.trim()) return alert('제목을 입력해주세요');
    if (form.imageFiles.length === 0) return alert('이미지를 1장 이상 업로드해주세요');

    setUploading(true);
    try {
      // 모든 이미지 업로드
      const imageUrls = await Promise.all(
        form.imageFiles.map(file => uploadCaseImage(file, user.id))
      );

      // DB에 케이스 정보 저장
      const { error } = await supabase.from('cases').insert({
        user_id: user.id,
        title: form.title,
        category: form.category,
        memo: form.memo,
        image_urls: imageUrls
      });

      if (error) throw error;

      // 폼 초기화
      form.imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setForm({ title: '', category: '눈썹', memo: '', imageFiles: [], imagePreviews: [] });
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
      alert('업로드 실패: ' + err.message);
    }
    setUploading(false);
  };

  // 케이스 삭제
  const removeCase = async (caseItem) => {
    if (!confirm('이 케이스를 삭제하시겠습니까?\n사진도 함께 삭제됩니다.')) return;

    // 1. Storage에서 이미지들 삭제
    if (caseItem.image_urls?.length) {
      await Promise.all(caseItem.image_urls.map(url => deleteCaseImage(url)));
    }
    // 2. DB에서 케이스 삭제
    await supabase.from('cases').delete().eq('id', caseItem.id);
    await load();
  };

  return (
    <>
      <PageIntro ko="개별피드백" en="Personal Feedback" desc="원장님의 1:1 개별 피드백을 받아보세요 🔒" />
      <div className="px-5 space-y-3">

        {/* 새 케이스 추가 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={16} strokeWidth={2.5} />새 케이스 추가
          </button>
        )}

        {/* 새 케이스 작성 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>새 시술 케이스</h3>
              <button onClick={() => {
                form.imagePreviews.forEach(url => URL.revokeObjectURL(url));
                setForm({ title: '', category: '눈썹', memo: '', imageFiles: [], imagePreviews: [] });
                setShowForm(false);
              }}>
                <X size={18} style={{ color: COLORS.stone }} />
              </button>
            </div>

            {/* 카테고리 선택 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>눈썹</option><option>아이라인</option><option>입술</option><option>속눈썹</option><option>헤어라인</option>
              </select>
            </div>

            {/* 제목 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="예: 엠보 브로우 - 첫 모델"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 이미지 업로드 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>
                사진 ({form.imageFiles.length}/5)
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {/* 업로드된 이미지 미리보기 */}
                {form.imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={preview} alt={`미리보기 ${idx + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => removePreview(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(26,26,26,0.7)' }}>
                      <X size={12} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ))}

                {/* 추가 버튼 */}
                {form.imageFiles.length < 5 && (
                  <label className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer"
                    style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                    <Upload size={20} style={{ color: COLORS.stone }} />
                    <span className="font-mono text-[9px] mt-1" style={{ color: COLORS.stone }}>업로드</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>
              <p className="font-mono text-[10px] mt-1.5" style={{ color: COLORS.stone }}>※ 최대 5장, 각 5MB 이하</p>
            </div>

            {/* 메모 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>메모</label>
              <textarea value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })}
                placeholder="시술 과정, 컬러, 느낀점 등을 적어보세요" rows={3}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded" style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 등록 버튼 */}
            <button onClick={submit} disabled={uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  업로드 중...
                </>
              ) : '등록하기'}
            </button>
          </div>
        )}

        {/* 케이스 목록 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-10">
            <Camera size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>아직 등록된 케이스가 없습니다</p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>첫 시술 케이스를 기록해보세요!</p>
          </div>
        ) : (
          cases.map(c => (
            <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {/* 이미지 영역 */}
              {c.image_urls?.length > 0 && (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={c.image_urls[0]} alt={c.title} className="w-full h-full object-cover" />
                  {c.image_urls.length > 1 && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full font-mono text-[10px] font-bold"
                      style={{ background: 'rgba(26,26,26,0.7)', color: COLORS.white }}>
                      +{c.image_urls.length - 1}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{c.category}</span>
                  {c.is_best && (
                    <span className="absolute top-3 right-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>★ BEST</span>
                  )}
                </div>
              )}

              {/* 정보 */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading text-base" style={{ color: COLORS.ink }}>{c.title}</h4>
                    <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <button onClick={() => removeCase(c)} className="p-1.5 rounded-full" style={{ background: COLORS.cream }}>
                    <Trash2 size={12} style={{ color: COLORS.deep }} />
                  </button>
                </div>
                {c.memo && <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: COLORS.stone }}>{c.memo}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// =============================================================
// 💬 QnaDetailPage - Q&A 상세보기 (수정/삭제 + 답변 + 댓글 + 좋아요)
// =============================================================
function QnaDetailPage({ qna, user, setCurrentPage }) {
  const [author, setAuthor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', category: '시술' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!qna?.user_id) return;
    supabase.from('profiles').select('name, avatar_color, role').eq('id', qna.user_id).maybeSingle()
      .then(({ data }) => setAuthor(data));
    setEditForm({ 
      title: qna.title || '', 
      content: qna.content || '', 
      category: qna.category || '시술' 
    });
  }, [qna]);

  if (!qna) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>질문을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const isOwner = qna.user_id === user?.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const canEdit = isOwner;  // 수정은 본인만
  const canDelete = isOwner || isAdmin;  // 삭제는 본인 또는 관리자

  const handleUpdate = async () => {
    if (!editForm.title.trim()) return alert('제목을 입력해주세요');
    setActionLoading(true);
    const { error } = await supabase.from('questions').update({
      title: editForm.title.trim(),
      content: editForm.content.trim(),
      category: editForm.category,
    }).eq('id', qna.id);
    setActionLoading(false);
    if (error) {
      alert('❌ 수정 실패: ' + error.message);
    } else {
      alert('✏️ 수정 완료!');
      setEditing(false);
      setCurrentPage('qna');
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 질문을 삭제하시겠습니까?\n답변과 댓글도 함께 삭제됩니다.')) return;
    setActionLoading(true);
    
    try {
      // 1. 댓글 삭제
      const { error: commentsError } = await supabase.from('comments')
        .delete()
        .eq('target_type', 'qna')
        .eq('target_id', qna.id);
      if (commentsError) console.warn('댓글 삭제 경고:', commentsError);
      
      // 2. 좋아요 삭제
      const { error: likesError } = await supabase.from('likes')
        .delete()
        .eq('target_type', 'qna')
        .eq('target_id', qna.id);
      if (likesError) console.warn('좋아요 삭제 경고:', likesError);
      
      // 3. 질문 삭제
      const { error, count } = await supabase.from('questions')
        .delete({ count: 'exact' })
        .eq('id', qna.id);
      
      if (error) {
        console.error('삭제 에러:', error);
        alert('❌ 삭제 실패: ' + error.message);
        setActionLoading(false);
        return;
      }
      
      if (count === 0) {
        alert('⚠️ 삭제 권한이 없습니다.\n본인이 작성한 질문만 삭제할 수 있어요.');
        setActionLoading(false);
        return;
      }
      
      alert('🗑️ 삭제되었습니다');
      setCurrentPage('qna');
    } catch (err) {
      console.error('삭제 예외:', err);
      alert('❌ 삭제 실패: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ✏️ 수정 모드 UI
  if (editing) {
    return (
      <div className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Edit Q&A</p>
          <h1 className="font-display text-2xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>질문 수정</h1>
        </div>

        <div className="px-5">
          <div className="rounded-2xl p-5 space-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
              <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>시술</option><option>재료</option><option>수업</option><option>창업</option>
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목 *</label>
              <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                placeholder="질문 제목"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>내용</label>
              <textarea value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})}
                placeholder="질문 내용" rows={6}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(false)} disabled={actionLoading}
                className="flex-1 font-heading text-sm py-3 rounded-full"
                style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                취소
              </button>
              <button onClick={handleUpdate} disabled={actionLoading}
                className="flex-1 font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2"
                style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.4)' }}>
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 📖 일반 보기 모드
  return (
    <div className="pb-6">
      {/* 헤더 */}
      <div className="px-5 pt-5 pb-4">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Q&A</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
            background: qna.status === 'answered' ? COLORS.ink : COLORS.peach,
            color: qna.status === 'answered' ? COLORS.primary : COLORS.deep
          }}>{qna.status === 'answered' ? '답변완료' : '답변대기'}</span>
          <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>{qna.category}</span>
        </div>
        <h1 className="font-display text-2xl mt-3 tracking-tight leading-tight" style={{ color: COLORS.ink }}>{qna.title}</h1>
        {author && (
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {(() => {
                const showRealName = user?.role === 'admin' || user?.role === 'staff';
                const displayAuthor = showRealName ? author : { name: '익명', avatar_color: 'charcoal' };
                return (
                  <>
                    <Avatar user={displayAuthor} size="sm" />
                    <div>
                      <p className="font-heading text-xs" style={{ color: COLORS.ink }}>{displayAuthor.name}</p>
                      <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(qna.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric' })}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 🍊 수정/삭제 버튼 (본인 또는 관리자) */}
            {(canEdit || canDelete) && (
              <div className="flex gap-1.5">
                {canEdit && (
                  <button onClick={() => setEditing(true)} disabled={actionLoading}
                    className="font-heading text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                    <Edit3 size={10} strokeWidth={2.5} />수정
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleDelete} disabled={actionLoading}
                    className="font-heading text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
                    {actionLoading ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} strokeWidth={2.5} />}
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 질문 본문 */}
      <div className="px-5">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
            {qna.content || '내용이 없습니다.'}
          </p>
        </div>
      </div>

      {/* 답변 (있을 때만) */}
      {qna.answer && (
        <div className="px-5 mt-3">
          <div className="rounded-2xl p-5" style={{ background: COLORS.peach }}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded flex items-center gap-1" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
                <Shield size={10} strokeWidth={2.5} />관리자 답변
              </span>
              {qna.answered_at && (
                <span className="font-mono text-[10px]" style={{ color: COLORS.deep }}>
                  {new Date(qna.answered_at).toLocaleDateString('ko-KR')}
                </span>
              )}
            </div>
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>{qna.answer}</p>
          </div>
        </div>
      )}

      {/* 좋아요 + 댓글 */}
      <div className="px-5 mt-3">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <LikeButton targetType="qna" targetId={qna.id} userId={user.id} size={16} />
          <CommentSection targetType="qna" targetId={qna.id} user={user} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// 🔥 TrendsPage - 트렌드 속보 (학생용 피드)
// =============================================================
function TrendsPage({ user, setCurrentPage, setSelectedTrend }) {
  const [trends, setTrends] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trends')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setTrends(data || []);
    setLoading(false);
  };

  const categories = ['전체', '트렌드', '신상품', '시술기법', '업계소식', '마케팅팁'];
  const filtered = filter === '전체' ? trends : trends.filter(t => t.category === filter);

  return (
    <>
      <PageIntro ko="트렌드 속보" en="Trends" />

      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
                boxShadow: filter === cat ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mb-4">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
          {filter === '전체' ? '총 ' : `${filter} 카테고리 `}
          <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{filtered.length}개</span>
        </p>
      </div>

      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '아직 등록된 트렌드가 없어요' : `${filter} 카테고리 트렌드가 없어요`}
            </p>
          </div>
        ) : filtered.map(t => (
          <button key={t.id} onClick={() => { setSelectedTrend(t); setCurrentPage('trend-detail'); }}
            className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {t.image_url && (
              <div className="relative aspect-[16/9] overflow-hidden">
                <SkeletonImage src={t.image_url} alt={t.title} className="w-full h-full" />
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                    background: COLORS.card, color: COLORS.ink, backdropFilter: 'blur(8px)'
                  }}>
                    {t.category}
                  </span>
                </div>
                {t.video_url && (
                  <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <Play size={14} fill={COLORS.white} style={{ color: COLORS.white }} className="ml-0.5" />
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              {!t.image_url && (
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded inline-block mb-2" style={{
                  background: COLORS.peach, color: COLORS.deep
                }}>
                  {t.category}
                </span>
              )}
              <h4 className="font-heading text-base leading-snug" style={{ color: COLORS.ink }}>{t.title}</h4>
              {t.content && (
                <p className="font-body text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: COLORS.stone }}>
                  {t.content}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                  {new Date(t.created_at).toLocaleDateString('ko-KR')}
                </p>
                <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.primary }}>
                  자세히 보기 <ChevronRight size={11} />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 🔥 TrendDetailPage - 트렌드 속보 상세
// =============================================================
function TrendDetailPage({ trend, user }) {
  if (!trend) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>트렌드를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([^&\s]+)/,
      /youtu\.be\/([^?\s]+)/,
      /youtube\.com\/embed\/([^?\s]+)/,
      /youtube\.com\/shorts\/([^?\s]+)/,
    ];
    for (const p of patterns) {
      const match = url.match(p);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = trend.video_url ? getYouTubeId(trend.video_url) : null;

  return (
    <div className="pb-6">
      {trend.image_url && (
        <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: COLORS.cream }}>
          <SkeletonImage src={trend.image_url} alt={trend.title} className="w-full h-full" />
        </div>
      )}

      <div className="px-5 pt-5">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>
            {trend.category}
          </span>
          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
            {new Date(trend.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
        <h1 className="font-display text-2xl tracking-tight leading-tight" style={{ color: COLORS.ink }}>{trend.title}</h1>
      </div>

      {trend.content && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
              {trend.content}
            </p>
          </div>
        </div>
      )}

      {videoId && (
        <div className="px-5 mt-3">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>━━ 관련 영상</p>
          <div className="relative aspect-video rounded-2xl overflow-hidden" style={{ background: '#000' }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
              title={trend.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      )}

      {trend.link_url && (
        <div className="px-5 mt-3">
          <a href={trend.link_url} target="_blank" rel="noopener noreferrer"
            className="rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.peach }}>
              <ArrowUpRight size={16} style={{ color: COLORS.primary }} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 외부 링크</p>
              <p className="font-body text-xs mt-0.5 truncate" style={{ color: COLORS.ink }}>{trend.link_url}</p>
            </div>
          </a>
        </div>
      )}

      <div className="px-5 mt-3">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <LikeButton targetType="trend" targetId={trend.id} userId={user.id} size={16} />
          <CommentSection targetType="trend" targetId={trend.id} user={user} />
        </div>
      </div>
    </div>
  );
}

function QnaPage({ user, setCurrentPage, setSelectedQna }) {
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm, clearForm] = useDraft('qna', { title: '', content: '', category: '시술' });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('전체');
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
    setQuestions(data || []);
  };
 
  const submit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    await supabase.from('questions').insert({
      title: form.title, content: form.content, category: form.category, user_id: user.id
    });

    // 📢 관리자에게 알림
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `❓ [${form.category}] 새 질문이 등록되었어요`,
          body: `${user.name}: ${form.title}`,
          url: '/',
          targetRole: 'admin',
          excludeUserId: user.id,
        }),
      });
    } catch (e) { console.error('알림 발송 실패:', e); }

    clearForm();
    setShowForm(false);
    await load();
    setLoading(false);
  };

  const openDetail = (q) => {
    setSelectedQna(q);
    setCurrentPage('qna-detail');
  };
 
  const categories = ['전체', '시술', '재료', '수업', '창업'];
  const filtered = filter === '전체' ? questions : questions.filter(q => q.category === filter);

  return (
    <>
      <PageIntro ko="Q&A" en="Questions" desc="궁금한 점을 물어보세요" />

      {/* 🍊 카테고리 필터 - 재료샵 스타일 */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95 ${filter === cat ? 'glow-soft' : ''}`}
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 📊 결과 카운트 */}
      <div className="px-5 mb-4">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
          {filter === '전체' ? '총 ' : `${filter} 카테고리 `}
          <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{filtered.length}개</span>
        </p>
      </div>

      <div className="px-5 space-y-3">
        <button onClick={() => setShowForm(!showForm)} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
          <Plus size={16} strokeWidth={2.5} />질문하기
        </button>
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
              <option>시술</option><option>재료</option><option>수업</option><option>창업</option>
            </select>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="질문 제목" className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="질문 내용" rows={4} className="w-full font-body text-xs font-medium p-2 outline-none resize-none rounded" style={{ background: COLORS.cream, color: COLORS.ink }} />
            <button onClick={submit} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {loading && <Loader2 size={12} className="animate-spin" />}등록
            </button>
          </div>
        )}
        {filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {filter === '전체' ? '등록된 질문이 없습니다' : `${filter} 카테고리에 질문이 없습니다`}
          </p>
        ) : filtered.map(q => (
          <button key={q.id} onClick={() => openDetail(q)} className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                background: q.status === 'answered' ? COLORS.ink : COLORS.peach,
                color: q.status === 'answered' ? COLORS.primary : COLORS.deep
              }}>{q.status === 'answered' ? '답변완료' : '답변대기'}</span>
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>{q.category}</span>
            </div>
            <p className="font-heading text-sm leading-snug" style={{ color: COLORS.ink }}>{q.title}</p>
            {q.content && <p className="font-body text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: COLORS.stone }}>{q.content}</p>}
            <div className="flex items-center justify-between mt-2">
              <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(q.created_at).toLocaleDateString('ko-KR')}</p>
              <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.primary }}>
                자세히 보기 <ChevronRight size={11} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
 
// =============================================================
// 📚 LibraryPage - 자료실 (학생용 - 보기 + 다운로드만)
// =============================================================
function LibraryPage({ setCurrentPage, setSelectedLibrary }) {
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('library_files').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setFiles(data || []); setLoading(false); });
  }, []);

  const categories = ['전체', '시술 가이드', '색소 차트', '매뉴얼', '템플릿', '기타'];
  const filtered = filter === '전체' ? files : files.filter(f => f.category === filter);

  const openDetail = (file) => {
    setSelectedLibrary(file);
    setCurrentPage('library-detail');
  };

  return (
    <>
      <PageIntro ko="자료실" en="Library" />

      {/* 카테고리 탭 */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95 ${filter === cat ? 'glow-soft' : ''}`}
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <FolderOpen size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '등록된 자료가 없습니다' : `${filter} 카테고리 자료가 없습니다`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(f => (
              <button key={f.id} onClick={() => openDetail(f)}
                className="w-full rounded-2xl p-4 flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl glow-soft" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
                  <FolderOpen size={20} style={{ color: COLORS.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>
                    {f.category || '기타'}
                  </p>
                  <p className="font-heading text-xs mt-0.5 truncate" style={{ color: COLORS.ink }}>{f.name}</p>
                  {f.description && (
                    <p className="font-body text-[11px] mt-1 line-clamp-1" style={{ color: COLORS.stone }}>{f.description}</p>
                  )}
                  {f.file_url && (
                    <p className="font-mono text-[10px] font-medium mt-1 flex items-center gap-1" style={{ color: COLORS.primary }}>
                      <Download size={10} /> {f.file_type} · {f.file_size}
                    </p>
                  )}
                </div>
                <ChevronRight size={18} style={{ color: COLORS.stone }} className="shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
 
// =============================================================
// 📄 LibraryDetailPage - 자료 상세 (내용 보기 + 파일 다운로드)
// =============================================================
function LibraryDetailPage({ file, setCurrentPage }) {
  if (!file) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>자료를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const handleDownload = () => {
    if (!file.file_url) { alert('첨부파일이 없습니다'); return; }
    window.open(file.file_url, '_blank');
  };

  return (
    <div className="pb-6">
      <div className="px-5 pt-5 pb-4">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Library</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{file.category || '기타'}</span>
          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(file.created_at).toLocaleDateString('ko-KR')}</span>
        </div>
        <h1 className="font-display text-2xl mt-3 tracking-tight leading-tight" style={{ color: COLORS.ink }}>{file.name}</h1>
      </div>

      <div className="px-5">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
            {file.description || '내용이 없습니다.'}
          </p>
        </div>
      </div>

      {file.file_url ? (
        <div className="px-5 mt-4">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>━━ 첨부파일</p>
          <button onClick={handleDownload}
            className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}` }}>
            <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl glow-soft" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
              <FolderOpen size={20} style={{ color: COLORS.primary }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-heading text-xs truncate" style={{ color: COLORS.ink }}>{file.name}</p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{file.file_type} · {file.file_size}</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.primary, boxShadow: '0 0 16px rgba(255, 92, 31, 0.4)' }}>
              <Download size={14} style={{ color: COLORS.white }} />
            </div>
          </button>
        </div>
      ) : (
        <div className="px-5 mt-4">
          <p className="font-mono text-[11px] text-center" style={{ color: COLORS.muted }}>📎 첨부파일이 없는 자료입니다</p>
        </div>
      )}
    </div>
  );
}

function MarketPage({ setCurrentPage, setSelectedProduct }) {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  const openDetail = (p) => {
    setSelectedProduct(p);
    setCurrentPage('product-detail');
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. 상품 가져오기
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!productsData) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // 2. 모든 상품의 좋아요 수 한 번에 가져오기 (인기순 정렬용)
      const { data: likesData } = await supabase
        .from('likes')
        .select('target_id')
        .eq('target_type', 'product');

      // 3. product_id별 좋아요 수 카운트
      const likeCounts = {};
      (likesData || []).forEach(l => {
        likeCounts[l.target_id] = (likeCounts[l.target_id] || 0) + 1;
      });

      // 4. 각 상품에 like_count 추가
      const productsWithLikes = productsData.map(p => ({
        ...p,
        like_count: likeCounts[p.id] || 0
      }));

      setProducts(productsWithLikes);
      setLoading(false);
    };
    load();
  }, []);

  const categories = ['전체', '색소', '니들/머신', '마취제', '도구', '기타'];

  // 🍊 필터 + 검색 + 정렬
  const filtered = products
    .filter(p => {
      // 카테고리 필터
      if (filter !== '전체' && p.category !== filter) return false;
      // 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const brandMatch = (p.brand || '').toLowerCase().includes(q);
        if (!nameMatch && !brandMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'popular') return (b.like_count || 0) - (a.like_count || 0);
      // 기본: 최신순
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const isFiltering = searchQuery.trim() || filter !== '전체';

  return (
    <>
      <PageIntro ko="재료샵" en="Market" desc="수강생 전용 가격으로 만나보세요" />

      {/* 🔍 검색바 */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search size={16} style={{ color: COLORS.stone, position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="상품명, 브랜드 검색"
            className="w-full rounded-full pl-10 pr-10 py-3 font-body text-sm outline-none"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
              <X size={12} style={{ color: COLORS.stone }} />
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95 ${filter === cat ? 'glow-soft' : ''}`}
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 📊 정렬 + 결과 카운트 */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
          {isFiltering ? '검색 결과 ' : '총 '}
          <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{filtered.length}개</span>
        </p>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="font-mono text-[11px] font-semibold rounded-full px-3 py-1.5 outline-none cursor-pointer"
          style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
          <option value="newest">최신순</option>
          <option value="price_low">가격 낮은순</option>
          <option value="price_high">가격 높은순</option>
          <option value="popular">인기순</option>
        </select>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다` : filter === '전체' ? '아직 등록된 상품이 없습니다' : `${filter} 카테고리 상품이 없습니다`}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-3 font-heading text-xs px-4 py-2 rounded-full" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.35)' }}>
                검색 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(p => (
              <button key={p.id} onClick={() => openDetail(p)} className="rounded-2xl overflow-hidden transition-transform active:scale-[0.98] text-left" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                {/* 이미지 영역 */}
                <div className="relative aspect-square overflow-hidden" style={{ background: COLORS.cream }}>
                  {p.image_url ? (
                    <SkeletonImage src={p.image_url} alt={p.name} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-5xl" style={{ color: COLORS.primary }}>{p.emoji || '🛍️'}</span>
                    </div>
                  )}
                  {/* 배지 - BEST/NEW/SALE만 표시 */}
                  {['BEST', 'NEW', 'SALE'].includes(p.badge) && (
                    <span className="absolute top-2 left-2 font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{
                      background: p.badge === 'BEST' ? COLORS.ink : p.badge === 'NEW' ? COLORS.primary : COLORS.peach,
                      color: p.badge === 'BEST' ? COLORS.primary : p.badge === 'SALE' ? COLORS.deep : COLORS.white,
                      boxShadow: p.badge === 'NEW' ? '0 0 12px rgba(255, 92, 31, 0.5)' : 'none'
                    }}>{p.badge}</span>
                  )}
                  {/* 재고 부족 알림 */}
                  {p.stock !== undefined && p.stock <= 5 && p.stock > 0 && (
                    <span className="absolute top-2 right-2 font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>
                      {p.stock}개 남음
                    </span>
                  )}
                  {/* 품절 오버레이 */}
                  {p.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.white }}>
                        품절
                      </span>
                    </div>
                  )}
                </div>
                {/* 정보 */}
                <div className="p-3">
                  <p className="font-mono text-[8px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>{p.brand || '-'}</p>
                  <h4 className="font-body text-[11px] font-semibold mt-1 leading-tight line-clamp-2 min-h-[2.5em]" style={{ color: COLORS.ink }}>{p.name}</h4>
                  {p.original_price && p.original_price > p.price && (
                    <p className="font-mono text-[9px] line-through mt-1" style={{ color: COLORS.stone }}>{p.original_price.toLocaleString()}원</p>
                  )}
                  <p className="font-display text-base mt-0.5 tracking-tight" style={{ color: COLORS.ink }}>
                    {p.price?.toLocaleString()}<span className="font-body text-[10px] font-medium" style={{ color: COLORS.stone }}>원</span>
                  </p>
                  {/* 🔥 인기순일 때만 좋아요 수 표시 */}
                  {sortBy === 'popular' && p.like_count > 0 && (
                    <p className="font-mono text-[9px] mt-1 flex items-center gap-1" style={{ color: COLORS.primary }}>
                      <Heart size={9} fill={COLORS.primary} strokeWidth={2.5} />{p.like_count}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
 
function OnlineLecturePage({ setCurrentPage, setSelectedLecture }) {
  const [lectures, setLectures] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // 1. 강의 가져오기
      const { data: lecturesData } = await supabase
        .from('lectures')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (!lecturesData) {
        setLectures([]);
        setLoading(false);
        return;
      }

      // 2. 모든 강의의 좋아요 수 한 번에 가져오기 (인기순 정렬용)
      const { data: likesData } = await supabase
        .from('likes')
        .select('target_id')
        .eq('target_type', 'lecture');

      // 3. lecture_id별 좋아요 수 카운트
      const likeCounts = {};
      (likesData || []).forEach(l => {
        likeCounts[l.target_id] = (likeCounts[l.target_id] || 0) + 1;
      });

      // 4. 각 강의에 like_count 추가
      const lecturesWithLikes = lecturesData.map(l => ({
        ...l,
        like_count: likeCounts[l.id] || 0
      }));

      setLectures(lecturesWithLikes);
      setLoading(false);
    };
    load();
  }, []);

  const categories = ['전체', '기초', '심화', '테크닉'];

  // 🍊 카테고리 + 검색 + 정렬
  const filtered = lectures
    .filter(l => {
      // 카테고리 필터
      if (filter !== '전체' && l.category !== filter) return false;
      // 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (l.title || '').toLowerCase().includes(q);
        const instructorMatch = (l.instructor || '').toLowerCase().includes(q);
        if (!titleMatch && !instructorMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'popular') return (b.like_count || 0) - (a.like_count || 0);
      // 기본: 최신순
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const isFiltering = searchQuery.trim() || filter !== '전체';

  const openDetail = (lecture) => {
    setSelectedLecture(lecture);
    setCurrentPage('lecture-detail');
  };

  return (
    <>
      <PageIntro ko="온라인 강의" en="Lectures" desc="언제 어디서나 학습하세요" />

      {/* 🔍 검색바 */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search size={16} style={{ color: COLORS.stone, position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="강의명, 강사명 검색"
            className="w-full rounded-full pl-10 pr-10 py-3 font-body text-sm outline-none"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
              <X size={12} style={{ color: COLORS.stone }} />
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95 ${filter === cat ? 'glow-soft' : ''}`}
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 📊 정렬 + 결과 카운트 */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
          {isFiltering ? '검색 결과 ' : '총 '}
          <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{filtered.length}개</span>
        </p>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="font-mono text-[11px] font-semibold rounded-full px-3 py-1.5 outline-none cursor-pointer"
          style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
          <option value="newest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="popular">인기순</option>
        </select>
      </div>

      {/* 강의 목록 */}
      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <PlayCircle size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다` : filter === '전체' ? '아직 등록된 강의가 없습니다' : `${filter} 카테고리 강의가 없습니다`}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-3 font-heading text-xs px-4 py-2 rounded-full" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.35)' }}>
                검색 초기화
              </button>
            )}
          </div>
        ) : filtered.map(l => (
          <button key={l.id} onClick={() => openDetail(l)}
            className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="relative aspect-video">
              {l.thumbnail_url ? (
                <SkeletonImage src={l.thumbnail_url} alt={l.title} className="w-full h-full" />
              ) : (
                <div className="w-full h-full" style={{ background: COLORS.cardElev }}></div>
              )}
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: COLORS.primary, boxShadow: '0 0 24px rgba(255, 92, 31, 0.5)' }}>
                  <Play size={20} fill={COLORS.white} style={{ color: COLORS.white }} className="ml-1" />
                </div>
              </div>
              <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>
                {l.category || '기초'}
              </span>
              {l.duration && (
                <span className="absolute bottom-3 right-3 font-mono text-[10px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: COLORS.white }}>
                  {l.duration}
                </span>
              )}
            </div>
            <div className="p-4">
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{l.title}</h4>
              <div className="flex items-center justify-between mt-1">
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                  {l.instructor} · {l.level || 'Basic'}
                </p>
                {/* 🔥 인기순일 때만 좋아요 수 표시 */}
                {sortBy === 'popular' && l.like_count > 0 && (
                  <p className="font-mono text-[10px] flex items-center gap-1" style={{ color: COLORS.primary }}>
                    <Heart size={10} fill={COLORS.primary} strokeWidth={2.5} />{l.like_count}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 🎬 LectureDetailPage - 영상 강의 상세 (YouTube 임베드)
// =============================================================
function LectureDetailPage({ lecture, user }) {
  // 🍊 오리엔테이션 영상이면 자동 미션 체크
  useEffect(() => {
    if (lecture?.is_orientation && user && !user.onb_video) {
      supabase.from('profiles').update({ onb_video: true }).eq('id', user.id).then(() => {
        // 3초 후 자동 새로고침 (영상 시청 시간 확보)
        setTimeout(() => {
          if (!user.onb_greeting || !user.onb_review) {
            // 다른 미션 남았으면 알림
            alert('🎬 오리엔테이션 시청 완료!');
            window.location.reload();
          } else {
            // 마지막 미션이면 축하
            alert('🎉 모든 미션 완료! HSSUP 시작!');
            window.location.reload();
          }
        }, 3000);
      });
    }
  }, [lecture, user]);

  if (!lecture) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>강의를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([^&\s]+)/,
      /youtu\.be\/([^?\s]+)/,
      /youtube\.com\/embed\/([^?\s]+)/,
      /youtube\.com\/shorts\/([^?\s]+)/,
    ];
    for (const p of patterns) {
      const match = url.match(p);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getYouTubeId(lecture.video_url);

  return (
    <div className="pb-6">
      {/* YouTube 플레이어 */}
      <div className="relative aspect-video w-full" style={{ background: '#000' }}>
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={lecture.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            style={{ border: 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="font-body text-sm" style={{ color: COLORS.stone }}>영상 URL이 올바르지 않습니다</p>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>
            {lecture.category || '기초'}
          </span>
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>
            {lecture.level || 'Basic'}
          </span>
          {lecture.duration && (
            <span className="font-mono text-[10px] flex items-center gap-1" style={{ color: COLORS.stone }}>
              <Clock size={11} />{lecture.duration}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl tracking-tight leading-tight" style={{ color: COLORS.ink }}>{lecture.title}</h1>
        <p className="font-serif-italic text-base mt-2" style={{ color: COLORS.stone }}>{lecture.instructor}</p>
      </div>

      {/* 설명 */}
      {lecture.description && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>━━ About</p>
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>{lecture.description}</p>
          </div>
        </div>
      )}

      {/* 좋아요 + 댓글 */}
      <div className="px-5 mt-3">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <LikeButton targetType="lecture" targetId={lecture.id} userId={user.id} size={16} />
          <CommentSection targetType="lecture" targetId={lecture.id} user={user} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// 💬 PostDetailPage - 커뮤니티 글 상세보기 (수정/삭제 + 댓글 + 좋아요)
// =============================================================
function PostDetailPage({ post, user, setCurrentPage }) {
  const [author, setAuthor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ content: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!post?.user_id) return;
    supabase.from('profiles').select('name, avatar_color, role').eq('id', post.user_id).maybeSingle()
      .then(({ data }) => setAuthor(data));
    setEditForm({ content: post.content || '' });
  }, [post]);

  if (!post) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const isOwner = post.user_id === user?.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  const handleUpdate = async () => {
    if (!editForm.content.trim()) return alert('내용을 입력해주세요');
    setActionLoading(true);
    const { error } = await supabase.from('community_posts').update({
      content: editForm.content.trim(),
    }).eq('id', post.id);
    setActionLoading(false);
    if (error) {
      alert('❌ 수정 실패: ' + error.message);
    } else {
      alert('✏️ 수정 완료!');
      setEditing(false);
      // 카테고리별로 돌아갈 페이지 결정
      const backPage = post.category === '인사' ? 'greetings'
                      : post.category === '후기' ? 'reviews'
                      : 'freeboard';
      setCurrentPage(backPage);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 게시글을 삭제하시겠습니까?\n댓글과 좋아요도 함께 삭제됩니다.')) return;
    setActionLoading(true);
    try {
      // 1. 댓글 삭제
      await supabase.from('comments')
        .delete()
        .eq('target_type', 'community_post')
        .eq('target_id', post.id);
      
      // 2. 좋아요 삭제
      await supabase.from('likes')
        .delete()
        .eq('target_type', 'community_post')
        .eq('target_id', post.id);
      
      // 3. 글 삭제
      const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
      if (error) throw error;
      
      alert('🗑️ 삭제되었습니다');
      const backPage = post.category === '인사' ? 'greetings'
                      : post.category === '후기' ? 'reviews'
                      : 'freeboard';
      setCurrentPage(backPage);
    } catch (err) {
      alert('❌ 삭제 실패: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ✏️ 수정 모드 UI
  if (editing) {
    return (
      <div className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Edit Post</p>
          <h1 className="font-display text-2xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>게시글 수정</h1>
        </div>
        <div className="px-5">
          <div className="rounded-2xl p-5 space-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>내용 *</label>
              <textarea value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})}
                placeholder="내용을 입력하세요" rows={8}
                className="w-full font-body text-sm font-medium p-3 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing(false)} disabled={actionLoading}
                className="flex-1 font-heading text-sm py-3 rounded-full"
                style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                취소
              </button>
              <button onClick={handleUpdate} disabled={actionLoading}
                className="flex-1 font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2"
                style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.4)' }}>
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 📖 일반 보기 모드
  return (
    <div className="pb-6">
      <div className="px-5 pt-5 pb-4">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Community</p>
      </div>

      <div className="px-5">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {/* 작성자 + 수정/삭제 버튼 */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar user={author || { name: '익명' }} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{author?.name || '익명'}</p>
                {author?.role === 'admin' && (
                  <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>ADMIN</span>
                )}
              </div>
              <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(post.created_at).toLocaleString('ko-KR')}</p>
            </div>

            {/* 🍊 수정/삭제 버튼 (본인 또는 관리자) */}
            {(canEdit || canDelete) && (
              <div className="flex gap-1.5">
                {canEdit && (
                  <button onClick={() => setEditing(true)} disabled={actionLoading}
                    className="font-heading text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                    <Edit3 size={10} strokeWidth={2.5} />수정
                  </button>
                )}
                {canDelete && (
                  <button onClick={handleDelete} disabled={actionLoading}
                    className="font-heading text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1"
                    style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
                    {actionLoading ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} strokeWidth={2.5} />}
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
            {post.content}
          </p>

          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <LikeButton targetType="community_post" targetId={post.id} userId={user.id} size={16} />
          </div>

          <CommentSection targetType="community_post" targetId={post.id} user={user} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// 🛍️ ProductDetailPage - 상품 상세 (이미지 + 설명 + 좋아요/댓글)
// =============================================================
function ProductDetailPage({ product, user, setCurrentPage, setSelectedCourse }) {
  if (!product) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>상품을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div className="pb-32">
      {/* 큰 이미지 */}
      <div className="relative aspect-square w-full overflow-hidden" style={{ background: COLORS.cream }}>
        {product.image_url ? (
          <SkeletonImage src={product.image_url} alt={product.name} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-9xl" style={{ color: COLORS.primary }}>{product.emoji || '🛍️'}</span>
          </div>
        )}
        {product.badge && (
          <span className="absolute top-4 left-4 font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded" style={{
            background: product.badge === 'BEST' ? COLORS.ink : product.badge === 'NEW' ? COLORS.primary : COLORS.peach,
            color: product.badge === 'BEST' ? COLORS.primary : product.badge === 'SALE' ? COLORS.deep : COLORS.white,
            boxShadow: product.badge === 'NEW' ? '0 0 20px rgba(255, 92, 31, 0.5)' : 'none'
          }}>{product.badge}</span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <span className="font-mono text-sm font-bold tracking-widest uppercase px-5 py-2.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.white }}>
              품절
            </span>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>
            {product.category || '기타'}
          </span>
          {product.brand && (
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>
              {product.brand}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl tracking-tight leading-tight" style={{ color: COLORS.ink }}>{product.name}</h1>

        {/* 가격 */}
        <div className="mt-4">
          {product.original_price && product.original_price > product.price && (
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm line-through" style={{ color: COLORS.stone }}>
                {product.original_price.toLocaleString()}원
              </p>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 12px rgba(255, 92, 31, 0.4)' }}>
                {discount}% OFF
              </span>
            </div>
          )}
          <p className="font-display text-3xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>
            {product.price?.toLocaleString()}<span className="font-body text-base font-medium" style={{ color: COLORS.stone }}>원</span>
          </p>
        </div>

        {/* 재고 정보 */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-2 h-2 rounded-full" style={{ background: product.stock > 5 ? '#22C55E' : product.stock > 0 ? COLORS.primary : COLORS.stone }}></div>
          <p className="font-mono text-xs" style={{ color: COLORS.stone }}>
            {product.stock > 5 ? '재고 충분' : product.stock > 0 ? `${product.stock}개 남음 (서두르세요!)` : '품절'}
          </p>
        </div>
      </div>

      {/* 설명 */}
      {product.description && (
        <div className="px-5 mt-5">
          <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>━━ Description</p>
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>{product.description}</p>
          </div>
        </div>
      )}

      {/* 좋아요 + 댓글 */}
      <div className="px-5 mt-3">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <LikeButton targetType="product" targetId={product.id} userId={user.id} size={16} />
          <CommentSection targetType="product" targetId={product.id} user={user} />
        </div>
      </div>

      {/* 하단 구매 버튼 (고정) */}
      <div className="fixed left-0 right-0 px-5 py-3" style={{
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${COLORS.light}`,
        maxWidth: '480px',
        margin: '0 auto',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
      }}>
        <button onClick={() => {
                if (product.stock === 0) { alert('품절된 상품입니다.'); return; }
                setSelectedCourse(null);
                setCurrentPage('payment');
              }}
          disabled={product.stock === 0}
          className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{
            background: product.stock === 0 ? COLORS.cardElev : COLORS.primary,
            color: COLORS.white,
            boxShadow: product.stock === 0 ? 'none' : '0 0 24px rgba(255, 92, 31, 0.5)'
          }}>
          <ShoppingCart size={16} strokeWidth={2.5} />
          {product.stock === 0 ? '품절' : '구매하기'}
        </button>
      </div>
    </div>
  );
}

// =============================================================
// 💳 PaymentPage - 결제 페이지 (토스 결제창 호출)
// =============================================================
function PaymentPage({ course, product, user, setCurrentPage }) {
  const [loading, setLoading] = useState(false);
  const [agreedPurchase, setAgreedPurchase] = useState(false);
  const [agreedRefund, setAgreedRefund] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'refund' | 'terms' | 'privacy' | null
  const allAgreed = agreedPurchase && agreedRefund;

  // 배송 정보 (재료 구매 시만 사용)
  const [shippingRecipientName, setShippingRecipientName] = useState(user?.name || '');
  const [shippingRecipientPhone, setShippingRecipientPhone] = useState(user?.phone || '');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingAddressDetail, setShippingAddressDetail] = useState('');
  const [shippingMemo, setShippingMemo] = useState('');
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeContainerRef = useRef(null);

  // 다음 우편번호 API 호출 (재료 구매 시 사용)
  // ⚠️ open() 방식은 모바일에서 Daum이 자체 history.pushState/back을 사용해서
  //    SPA의 popstate 핸들러와 충돌 → 주소 선택 시 페이지가 뒤로 이동되는 버그 발생.
  //    embed() 방식 + 자체 모달로 history 충돌을 우회.
  const openPostcode = async () => {
    try {
      if (typeof window.daum === 'undefined' || !window.daum.Postcode) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('우편번호 API 로드 실패'));
          document.head.appendChild(script);
        });
      }
      setPostcodeOpen(true);
      // 실제 embed는 아래 useEffect에서 postcodeContainerRef 마운트 후 수행
    } catch (err) {
      console.error('우편번호 검색 에러:', err);
      alert('우편번호 검색 중 오류가 발생했어요. 다시 시도해주세요.');
    }
  };

  // 🔧 Bug fix: setTimeout(0) 방식은 첫 진입 시 ref가 아직 마운트되지 않아 흰 화면이 뜸.
  //   postcodeOpen 변화를 useEffect로 감지해서 ref 준비 + Daum 스크립트 준비를 폴링.
  useEffect(() => {
    if (!postcodeOpen) return;
    let cancelled = false;
    let tries = 0;
    const tryEmbed = () => {
      if (cancelled) return;
      if (!postcodeContainerRef.current || typeof window.daum === 'undefined' || !window.daum.Postcode) {
        if (tries++ < 40) setTimeout(tryEmbed, 50);
        return;
      }
      postcodeContainerRef.current.innerHTML = '';
      new window.daum.Postcode({
        width: '100%', height: '100%',
        oncomplete: (data) => {
          setShippingPostalCode(data.zonecode);
          setShippingAddress(data.roadAddress || data.jibunAddress);
          setPostcodeOpen(false);
        },
      }).embed(postcodeContainerRef.current);
    };
    tryEmbed();
    return () => { cancelled = true; };
  }, [postcodeOpen]);

  // course 또는 product 중 하나가 와야 함 (course 우선)
  const isProduct = !course && !!product;
  const item = course || product;

  if (!item) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>결제 정보를 찾을 수 없습니다.</p>
        <button onClick={() => setCurrentPage('home')} className="mt-4 font-heading text-xs px-4 py-2 rounded-full" style={{ background: COLORS.primary, color: COLORS.white }}>
          홈으로
        </button>
      </div>
    );
  }

  const itemName = isProduct ? product.name : course.title;
  const itemSubtitle = isProduct ? product.brand : course.en_title;
  const itemBadge = isProduct ? product.category : course.level;
  const itemImage = item.image_url;
  const itemDesc = item.description;
  const itemPrice = item.price;
  const itemOriginalPrice = item.original_price;

  const handlePayment = async () => {
    if (!allAgreed) {
      alert('필수 약관에 모두 동의해주세요.');
      return;
    }

    // 재료(product) 구매 시 배송 정보 검증
    if (isProduct) {
      if (!shippingRecipientName?.trim()) {
        alert('받는 사람 이름을 입력해주세요.');
        return;
      }
      if (!shippingRecipientPhone?.trim()) {
        alert('받는 사람 연락처를 입력해주세요.');
        return;
      }
      if (!shippingPostalCode || !shippingAddress) {
        alert('"주소 검색" 버튼을 눌러 주소를 입력해주세요.');
        return;
      }
      if (!shippingAddressDetail?.trim()) {
        alert('상세 주소를 입력해주세요. (동/호수 등)');
        return;
      }
    }

    setLoading(true);
    try {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // DB에 주문 정보 저장 (course 또는 product)
      const orderData = {
        order_id: orderId,
        user_id: user.id,
        course_id: isProduct ? null : course.id,
        product_id: isProduct ? product.id : null,
        course_title: itemName,
        item_type: isProduct ? 'product' : 'course',
        amount: itemPrice,
        status: 'pending',
        buyer_name: user.name,
        buyer_phone: user.phone,
        buyer_email: user.email,
        // 배송 정보 (재료일 때만)
        shipping_recipient_name: isProduct ? shippingRecipientName.trim() : null,
        shipping_recipient_phone: isProduct ? shippingRecipientPhone.trim() : null,
        shipping_postal_code: isProduct ? shippingPostalCode : null,
        shipping_address: isProduct ? shippingAddress : null,
        shipping_address_detail: isProduct ? shippingAddressDetail.trim() : null,
        shipping_memo: isProduct ? (shippingMemo?.trim() || null) : null,
        shipping_status: isProduct ? 'pending' : null,
      };

      const { error: insertError } = await supabase.from('orders').insert(orderData);
      if (insertError) throw insertError;

      // 나이스페이 SDK 동적 로드 (한 번 로드 후 재사용)
      if (typeof window.AUTHNICE === 'undefined') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://pay.nicepay.co.kr/v1/js/';
          script.onload = resolve;
          script.onerror = () => reject(new Error('나이스페이 SDK 로드 실패'));
          document.head.appendChild(script);
        });
      }

      const phoneOnly = user.phone?.replace(/[^0-9]/g, '') || '';
      const validPhone = (phoneOnly.length === 10 || phoneOnly.length === 11) ? phoneOnly : '';

      // returnUrl = Supabase Edge Function (nicepay-return)
      // → Edge Function이 amount 검증 + 결제 승인 + DB 업데이트 모두 처리한 뒤 
      //   결과를 ?payment=success|fail 쿼리로 SPA에 리다이렉트
      const returnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nicepay-return`;

      window.AUTHNICE.requestPay({
        clientId: import.meta.env.VITE_NICEPAY_CLIENT_KEY,
        method: 'card',
        orderId: orderId,
        amount: itemPrice,
        goodsName: itemName,
        returnUrl: returnUrl,
        buyerName: user.name || '고객',
        buyerTel: validPhone,
        buyerEmail: user.email || '',
        fnError: (result) => {
          // 사용자가 결제창 닫거나 실패 시
          console.log('나이스페이 결제 취소/실패:', result);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('결제 시작 에러:', err);
      alert('결제 시작 실패: ' + (err.message || err));
      setLoading(false);
    }
  };

  const discount = (itemOriginalPrice && itemOriginalPrice > itemPrice)
    ? Math.round((1 - itemPrice / itemOriginalPrice) * 100)
    : 0;

  return (
    <div className="pb-6">
      <PageIntro ko="결제하기" en="Payment" desc="안전한 결제를 진행해주세요" />

      <div className="px-5 space-y-3">
        {/* 상품/클래스 정보 */}
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {itemImage && (
            <div className="aspect-video">
              <SkeletonImage src={itemImage} alt={itemName} className="w-full h-full" />
            </div>
          )}
          <div className="p-4">
            {itemBadge && <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>{itemBadge}</p>}
            <h3 className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{itemName}</h3>
            {itemSubtitle && <p className="font-serif-italic text-sm mt-1" style={{ color: COLORS.stone }}>{itemSubtitle}</p>}
            {itemDesc && <p className="font-body text-xs mt-2" style={{ color: COLORS.stone }}>{itemDesc}</p>}
          </div>
        </div>

        {/* 구매자 정보 */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>━━ 구매자 정보</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>NAME</span>
              <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>EMAIL</span>
              <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>PHONE</span>
              <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{user.phone || '미등록'}</span>
            </div>
          </div>
        </div>

        {/* 📦 배송 정보 (재료 구매 시에만 표시) */}
        {isProduct && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 배송 정보</p>
              <span className="font-body text-[10px]" style={{ color: COLORS.muted }}>필수 입력</span>
            </div>

            {/* 받는 사람 이름 */}
            <input
              type="text"
              placeholder="받는 사람 이름"
              value={shippingRecipientName}
              onChange={e => setShippingRecipientName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}
            />

            {/* 받는 사람 연락처 */}
            <input
              type="tel"
              placeholder="받는 사람 연락처 (배송 알림용)"
              value={shippingRecipientPhone}
              onChange={e => setShippingRecipientPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}
            />

            {/* 우편번호 + 검색 버튼 */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="우편번호"
                value={shippingPostalCode}
                readOnly
                className="flex-1 px-3 py-2.5 rounded-lg font-body text-sm outline-none cursor-pointer"
                style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}
                onClick={openPostcode}
              />
              <button
                type="button"
                onClick={openPostcode}
                className="px-4 py-2.5 rounded-lg font-heading text-xs whitespace-nowrap"
                style={{ background: COLORS.primary, color: COLORS.white }}
              >
                주소 검색
              </button>
            </div>

            {/* 기본 주소 (자동입력) */}
            <input
              type="text"
              placeholder="기본 주소 (주소 검색 후 자동 입력)"
              value={shippingAddress}
              readOnly
              className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}
            />

            {/* 상세 주소 */}
            <input
              type="text"
              placeholder="상세 주소 (동/호수 등)"
              value={shippingAddressDetail}
              onChange={e => setShippingAddressDetail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}
            />

            {/* 배송 메모 (선택) */}
            <input
              type="text"
              placeholder="배송 메모 (선택, 예: 부재시 경비실)"
              value={shippingMemo}
              onChange={e => setShippingMemo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}
            />

            <p className="font-body text-[10px] mt-1" style={{ color: COLORS.muted }}>
              📦 결제 완료 시 1~3 영업일 내 발송됩니다
            </p>
          </div>
        )}

        {/* 결제 금액 */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.cardElev }}>
          {discount > 0 && (
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>정가</span>
              <span className="font-body text-xs line-through" style={{ color: COLORS.muted }}>{itemOriginalPrice.toLocaleString()}원</span>
            </div>
          )}
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{isProduct ? '판매가' : '수강료'}</span>
            <div className="flex items-center gap-1.5">
              {discount > 0 && (
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>{discount}% OFF</span>
              )}
              <span className="font-body text-sm" style={{ color: COLORS.ink }}>{itemPrice.toLocaleString()}원</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <span className="font-mono text-[12px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>TOTAL</span>
            <span className="font-display text-3xl tracking-tight" style={{ color: COLORS.ink }}>
              ₩{itemPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 결제 안내 */}
        <div className="rounded-xl p-3" style={{ background: COLORS.peach }}>
          <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.deep }}>
            💳 <strong>나이스페이먼츠로 안전 결제</strong><br />
            카드 / 계좌이체 / 간편결제 / 무통장 입금 가능
          </p>
        </div>

        {/* 📜 결제 동의 (필수) */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={agreedPurchase} onChange={e => setAgreedPurchase(e.target.checked)}
              className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
            <span className="font-body text-xs" style={{ color: COLORS.stone }}>
              <span style={{ color: COLORS.deep }}>[필수]</span> 구매조건을 확인했으며 결제에 동의합니다
            </span>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-3">
              <input type="checkbox" checked={agreedRefund} onChange={e => setAgreedRefund(e.target.checked)}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span className="font-body text-xs" style={{ color: COLORS.stone }}>
                <span style={{ color: COLORS.deep }}>[필수]</span> 환불정책에 동의합니다
              </span>
            </span>
            <button type="button" onClick={() => setLegalModal('refund')} className="font-mono text-[10px] underline"
              style={{ color: COLORS.primary }}>보기</button>
          </label>
        </div>

        {/* 결제 버튼 */}
        <button onClick={handlePayment} disabled={loading || !allAgreed}
          className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: allAgreed ? COLORS.primary : COLORS.cardElev, color: COLORS.white, boxShadow: allAgreed ? '0 0 24px rgba(255, 92, 31, 0.5)' : 'none' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} strokeWidth={2.5} />}
          {loading ? '결제창 호출 중...' : !allAgreed ? '약관 동의 후 결제 가능' : `${itemPrice.toLocaleString()}원 결제하기`}
        </button>

        <p className="font-mono text-[10px] text-center mt-2" style={{ color: COLORS.stone }}>
          🔒 안전하게 암호화되어 결제됩니다
        </p>
      </div>

      {/* 📜 약관 보기 모달 (결제 페이지용) */}
      {legalModal && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: COLORS.cream }}>
          <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
            <span className="font-heading text-base" style={{ color: COLORS.ink }}>
              {legalModal === 'refund' ? '환불정책' : legalModal === 'terms' ? '이용약관' : '개인정보처리방침'}
            </span>
            <button onClick={() => setLegalModal(null)} className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: COLORS.card }}>
              <X size={18} style={{ color: COLORS.ink }} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <pre style={{
              fontFamily: 'inherit',
              color: COLORS.stone,
              fontSize: '12px',
              lineHeight: '1.75',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              margin: 0
            }}>{legalModal === 'refund' ? LEGAL_REFUND : legalModal === 'terms' ? LEGAL_TERMS : LEGAL_PRIVACY}</pre>
          </div>
        </div>
      )}

      {/* 우편번호 검색 모달 (Daum Postcode embed) — 풀스크린 + 헤더 패턴
          ⚠️ Portal로 document.body에 렌더: 부모 <main>의 transform 인라인 스타일이
              containing block을 만들어 fixed가 갇히는 문제를 우회. */}
      {postcodeOpen && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: '#fff', zIndex: 9999,
          display: 'flex', flexDirection: 'column'
        }}>
          {/* 헤더 */}
          <div style={{
            flexShrink: 0, padding: '12px 16px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #e5e5e5', background: '#fff'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#000', margin: 0 }}>주소 검색</h3>
            <button onClick={() => setPostcodeOpen(false)}
              style={{ width: 36, height: 36, border: 'none', background: 'transparent',
                       fontSize: 24, lineHeight: 1, color: '#000', cursor: 'pointer' }}>
              ×
            </button>
          </div>
          {/* 본문 - Daum 위젯 임베드 영역 */}
          <div ref={postcodeContainerRef} style={{ flex: 1, width: '100%', overflow: 'auto' }} />
        </div>,
        document.body
      )}
    </div>
  );
}

// =============================================================
// ✅ PaymentSuccessPage - 결제 성공 페이지 (Edge Function이 검증 완료)
// =============================================================
function PaymentSuccessPage({ user, setCurrentPage }) {
  // 나이스페이는 Edge Function(nicepay-return)에서 amount 검증 + 결제 승인 + DB 업데이트가
  // 모두 끝난 뒤 ?payment=success&orderId=xxx 로 redirect 되어 옵니다.
  // 그러므로 이 페이지는 결과 표시만 하면 됩니다.
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('orderId');
        if (!orderId) {
          setLoading(false);
          return;
        }
        // DB에서 최신 주문 정보 가져오기 (Edge Function이 이미 'paid'로 업데이트함)
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('order_id', orderId)
          .single();
        setOrderInfo(order);
        // URL 정리
        window.history.replaceState({}, '', '/');
      } catch (err) {
        console.error('주문 조회 에러:', err);
      }
      setLoading(false);
    };
    fetchOrder();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin mb-4" style={{ color: COLORS.primary }} />
        <p className="font-heading text-base" style={{ color: COLORS.ink }}>결제 정보 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="px-5 pt-10 pb-6 text-center">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(255,92,31,0.1)', border: `2px solid ${COLORS.primary}` }}>
          <Check size={36} style={{ color: COLORS.primary }} strokeWidth={3} />
        </div>
        <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>결제가 완료되었습니다</h2>
        <p className="font-body text-xs mt-2" style={{ color: COLORS.stone }}>안전하게 결제 검증이 완료되었어요</p>
      </div>

      <div className="px-5">
        <div className="rounded-2xl p-5 space-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="flex justify-between">
            <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>상품</span>
            <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{orderInfo?.course_title || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>주문번호</span>
            <span className="font-mono text-[10px]" style={{ color: COLORS.ink }}>{orderInfo?.order_id?.substring(0, 20) || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>결제수단</span>
            <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{orderInfo?.payment_method || '카드'}</span>
          </div>
          {orderInfo?.card_company && (
            <div className="flex justify-between">
              <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>카드사</span>
              <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{orderInfo.card_company}</span>
            </div>
          )}
          <div className="flex justify-between pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <span className="font-mono text-[12px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>TOTAL</span>
            <span className="font-display text-xl tracking-tight" style={{ color: COLORS.ink }}>
              ₩{orderInfo?.amount?.toLocaleString() || 0}
            </span>
          </div>

          {orderInfo?.receipt_url && (
            <a href={orderInfo.receipt_url} target="_blank" rel="noopener noreferrer"
              className="w-full mt-4 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              <Download size={12} />영수증 보기
            </a>
          )}
        </div>

        <button onClick={() => { window.history.replaceState({}, '', '/'); setCurrentPage('home'); }} className="w-full mt-3 font-heading text-sm py-3.5 rounded-full" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255,92,31,0.5)' }}>
          홈으로 가기
        </button>
      </div>
    </div>
  );
}

// =============================================================
// ❌ PaymentFailPage - 결제 실패/취소 페이지
// =============================================================
function PaymentFailPage({ setCurrentPage }) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const message = params.get('message');

  return (
    <div className="pb-6">
      <div className="px-5 pt-10 pb-6 text-center">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(255,92,31,0.1)', border: `2px solid ${COLORS.primary}` }}>
          <X size={32} style={{ color: COLORS.primary }} strokeWidth={3} />
        </div>
        <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>결제가 취소되었습니다</h2>
        <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>{message || '다시 시도해주세요'}</p>
        {code && <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>오류 코드: {code}</p>}
      </div>

      <div className="px-5">
        <button onClick={() => { window.history.replaceState({}, '', '/'); setCurrentPage('course'); }} className="w-full font-heading text-sm py-3.5 rounded-full" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255,92,31,0.5)' }}>
          클래스 다시 보기
        </button>
      </div>
    </div>
  );
}

function CommunityPage({ user, setCurrentPage, setSelectedPost, fixedCategory, pageTitle, pageEn, pageDesc }) {
  const POSTS_PER_PAGE = 20;
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost, clearNewPost] = useDraft(`community_${fixedCategory || 'free'}`, '');
  const [loading, setLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(POSTS_PER_PAGE);
  const isAdmin = user?.role === 'admin';

  useEffect(() => { 
    load();
    setDisplayCount(POSTS_PER_PAGE);  // 카테고리 바꾸면 초기화
  }, [fixedCategory]);

  const load = async () => {
    let query = supabase.from('community_posts').select('*').order('created_at', { ascending: false });
    if (fixedCategory) {
      query = query.eq('category', fixedCategory);
    }
    const { data: postsData } = await query;

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      return;
    }

    const userIds = [...new Set(postsData.map(p => p.user_id).filter(Boolean))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, avatar_color, role')
      .in('id', userIds);

    const profileMap = {};
    (profilesData || []).forEach(p => { profileMap[p.id] = p; });

    const enriched = postsData.map(p => ({ ...p, profile: profileMap[p.user_id] || { name: '익명' } }));
    setPosts(enriched);
  };

  const remove = async (postId, e) => {
    e?.stopPropagation();
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    await supabase.from('community_posts').delete().eq('id', postId);
    await load();
  };

  const submit = async () => {
    if (!newPost.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('community_posts').insert({
      content: newPost,
      user_id: user.id,
      category: fixedCategory || '자유'
    });
    if (error) {
      console.error('글 작성 에러:', error);
      alert('글 작성 실패: ' + error.message);
    } else {
      // 🍊 온보딩 자동 미션 체크
      let missionDone = false;
      if (fixedCategory === '인사' && !user.onb_greeting) {
        await supabase.from('profiles').update({ onb_greeting: true }).eq('id', user.id);
        missionDone = true;
      } else if (fixedCategory === '후기' && !user.onb_review) {
        await supabase.from('profiles').update({ onb_review: true }).eq('id', user.id);
        missionDone = true;
      }
      if (missionDone) {
        alert('🎉 미션 완료! 온보딩으로 돌아갑니다.');
        clearNewPost();
        await load();
        setLoading(false);
        setTimeout(() => window.location.reload(), 500);
        return;
      }
      // 📢 알림 발송 (학생→관리자, 관리자→학생)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const categoryEmoji = fixedCategory === '인사' ? '👋' : fixedCategory === '후기' ? '⭐' : '💬';
        const targetRole = isAdmin ? 'student' : 'admin';
        const titlePrefix = isAdmin 
          ? `${categoryEmoji} [${pageTitle || '게시판'}] 원장님이 글을 남겼어요`
          : `${categoryEmoji} [${pageTitle || '게시판'}] 새 글이 등록됐어요`;
        
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: titlePrefix,
            body: `${user.name}: ${newPost.substring(0, 80)}`,
            url: '/',
            targetRole,
            excludeUserId: user.id,
          }),
        });
      } catch (e) { console.error('알림 발송 실패:', e); }

      setNewPost('');
      await load();
    }
    setLoading(false);
  };

  const openDetail = (p) => {
    setSelectedPost(p);
    setCurrentPage('post-detail');
  };

  const placeholder = fixedCategory === '후기'
    ? '수강 후기를 공유해보세요'
    : '무슨 생각을 하고 계세요?';

  const emptyMsg = fixedCategory === '후기'
    ? '첫 후기를 남겨보세요!'
    : '첫 게시글을 남겨보세요!';

  return (
    <>
      <PageIntro ko={pageTitle || "커뮤니티"} en={pageEn || "Community"} desc={pageDesc || "동료들과 이야기 나눠보세요"} />
      <div className="px-5 space-y-3">
        {/* 글 작성 */}
        <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
            placeholder={placeholder} rows={2}
            className="w-full font-body text-xs font-medium p-2 outline-none resize-none rounded"
            style={{ background: COLORS.cream, color: COLORS.ink }} />
          <button onClick={submit} disabled={loading} className="float-right mt-1 font-heading text-[11px] px-4 py-2 rounded-full flex items-center gap-1" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Post
          </button>
          <div className="clear-both"></div>
        </div>

        {/* 게시글 목록 */}
        {posts.length === 0 ? (
          <div className="text-center py-10">
            <Users size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>{emptyMsg}</p>
          </div>
        ) : posts.slice(0, displayCount).map(p => (
          <div key={p.id} onClick={() => openDetail(p)}
            className="rounded-2xl p-4 cursor-pointer transition-transform active:scale-[0.99]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Avatar user={p.profile} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-heading text-xs" style={{ color: COLORS.ink }}>{p.profile?.name || '익명'}</p>
                  {p.profile?.role === 'admin' && (
                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>ADMIN</span>
                  )}
                </div>
                <p className="font-mono text-[9px] font-medium" style={{ color: COLORS.stone }}>{new Date(p.created_at).toLocaleString('ko-KR')}</p>
              </div>
              {(p.user_id === user.id || isAdmin) && (
                <button onClick={(e) => remove(p.id, e)} className="p-1.5 rounded-full" style={{ background: COLORS.cream }}>
                  <Trash2 size={12} style={{ color: COLORS.deep }} />
                </button>
              )}
            </div>
            <p className="font-body text-xs font-medium leading-relaxed whitespace-pre-line line-clamp-4" style={{ color: COLORS.ink }}>{p.content}</p>
            <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <div onClick={(e) => e.stopPropagation()}>
                <LikeButton targetType="community_post" targetId={p.id} userId={user.id} size={12} />
              </div>
              <button onClick={(e) => { e.stopPropagation(); openDetail(p); }}
                className="flex items-center gap-1.5 font-mono text-[11px] font-semibold" style={{ color: COLORS.stone }}>
                <MessageCircle size={12} />댓글
              </button>
            </div>
          </div>
        ))}
        
        {/* 🍊 더 보기 버튼 */}
        {posts.length > displayCount && (
          <button onClick={() => setDisplayCount(c => c + POSTS_PER_PAGE)}
            className="w-full rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
            더 보기 ({posts.length - displayCount}개 남음) <ChevronRight size={12} />
          </button>
        )}
        
        {posts.length > 0 && posts.length <= displayCount && (
          <p className="text-center font-mono text-[10px] py-2" style={{ color: COLORS.stone }}>
            ━━ 마지막 게시글 ━━
          </p>
        )}
      </div>
    </>
  );
}

// =============================================================
// 📋 MyActivityPage - 내가 쓴 게시글/댓글/좋아요
// =============================================================
function MyActivityPage({ user, setCurrentPage, setSelectedPost }) {
  const [tab, setTab] = useState(() => {
    const savedTab = sessionStorage.getItem('hssup_activity_tab');
    if (savedTab && ['posts', 'comments', 'likes'].includes(savedTab)) {
      sessionStorage.removeItem('hssup_activity_tab');
      return savedTab;
    }
    return 'posts';
  });
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    load();
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    
    // 내 게시글
    const { data: postsData } = await supabase
      .from('community_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // 내 댓글 (어디에 단 건지도 표시)
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // 내가 좋아요 누른 게시글
    const { data: likesData } = await supabase
      .from('likes')
      .select('target_id, target_type, created_at')
      .eq('user_id', user.id)
      .eq('target_type', 'community_post')
      .order('created_at', { ascending: false });
    
    // 좋아요 누른 게시글 정보 가져오기
    let likedPostsData = [];
    if (likesData && likesData.length > 0) {
      const postIds = likesData.map(l => l.target_id);
      const { data: postsInfo } = await supabase
        .from('community_posts')
        .select('*')
        .in('id', postIds);
      
      likedPostsData = (postsInfo || []).map(p => {
        const like = likesData.find(l => l.target_id === p.id);
        return { ...p, liked_at: like?.created_at };
      }).sort((a, b) => new Date(b.liked_at) - new Date(a.liked_at));
    }
    
    setPosts(postsData || []);
    setComments(commentsData || []);
    setLikedPosts(likedPostsData);
    setLoading(false);
  };

  const openPost = async (postId) => {
    const { data } = await supabase.from('community_posts').select('*').eq('id', postId).maybeSingle();
    if (data) {
      setSelectedPost(data);
      setCurrentPage('post-detail');
    } else {
      alert('이 게시글은 삭제되었어요');
    }
  };

  return (
    <>
      <PageIntro ko="내 활동" en="My Activity" />
      
      <div className="px-5">
        {/* 탭 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'posts', label: '게시글', count: posts.length },
            { id: 'comments', label: '댓글', count: comments.length },
            { id: 'likes', label: '좋아요', count: likedPosts.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="rounded-2xl py-3 font-heading text-xs transition-transform active:scale-95"
              style={{
                background: tab === t.id ? COLORS.primary : COLORS.card,
                color: tab === t.id ? COLORS.white : COLORS.ink,
                border: `1px solid ${tab === t.id ? COLORS.primary : COLORS.light}`,
                boxShadow: tab === t.id ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>
              {t.label} <span className="font-mono text-[10px]">({t.count})</span>
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : (
          <div className="space-y-2">
            {/* 게시글 탭 */}
            {tab === 'posts' && (posts.length === 0 ? (
              <div className="text-center py-10">
                <Users size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
                <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>아직 작성한 게시글이 없어요</p>
              </div>
            ) : posts.map(p => (
              <button key={p.id} onClick={() => openPost(p.id)}
                className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98]"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" 
                    style={{ background: COLORS.peach, color: COLORS.deep }}>
                    {p.category || '자유'}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                    {new Date(p.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="font-body text-sm line-clamp-2 leading-relaxed" style={{ color: COLORS.ink }}>{p.content}</p>
              </button>
            )))}

            {/* 댓글 탭 */}
            {tab === 'comments' && (comments.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
                <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>아직 작성한 댓글이 없어요</p>
              </div>
            ) : comments.map(c => (
              <div key={c.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" 
                    style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                    {c.target_type === 'community_post' ? '게시글' : c.target_type === 'qna' ? 'Q&A' : c.target_type === 'notice' ? '공지' : c.target_type === 'trend' ? '트렌드' : c.target_type === 'product' ? '재료샵' : c.target_type === 'lecture' ? '강의' : '기타'}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                    {new Date(c.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink }}>{c.content}</p>
              </div>
            )))}

            {/* 좋아요 탭 */}
            {tab === 'likes' && (likedPosts.length === 0 ? (
              <div className="text-center py-10">
                <Heart size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
                <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>아직 좋아요 누른 글이 없어요</p>
              </div>
            ) : likedPosts.map(p => (
              <button key={p.id} onClick={() => openPost(p.id)}
                className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98]"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Heart size={11} fill={COLORS.primary} strokeWidth={2.5} style={{ color: COLORS.primary }} />
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" 
                    style={{ background: COLORS.peach, color: COLORS.deep }}>
                    {p.category || '자유'}
                  </span>
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                    {new Date(p.liked_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="font-body text-sm line-clamp-2 leading-relaxed" style={{ color: COLORS.ink }}>{p.content}</p>
              </button>
            )))}
          </div>
        )}
      </div>
    </>
  );
}

function MyPage({ user, handleLogout, setCurrentPage }) {
  const isAdmin = user.role === 'admin';
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState(user.avatar_color || 'orange');
  const [saving, setSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState('checking');
  const [notifLoading, setNotifLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (isAdmin) {
      alert('관리자 계정은 탈퇴할 수 없어요.');
      return;
    }
    if (!confirm('정말 회원 탈퇴하시겠습니까?\n\n탈퇴 후에는 되돌릴 수 없으며,\n작성한 글과 댓글은 "탈퇴한 회원"으로 표시됩니다.')) return;
    if (!confirm('마지막 확인입니다.\n정말 탈퇴를 진행하시겠습니까?')) return;
    
    try {
      const { error } = await supabase.from('profiles').update({
        status: 'deleted',
        role: 'student',  // 🍊 운영진 권한 자동 해제
        name: '탈퇴한 회원',
        phone: null,
        deleted_at: new Date().toISOString(),
      }).eq('id', user.id);
      
      if (error) {
        alert('탈퇴 실패: ' + error.message);
        return;
      }
      
      alert('탈퇴가 완료되었습니다.\n그동안 이용해주셔서 감사합니다.');
      await handleLogout();
    } catch (e) {
      alert('탈퇴 실패: ' + e.message);
    }
  };

  useEffect(() => {
    checkNotificationStatus().then(setNotifStatus);
  }, []);

  const handleEnableNotifications = async () => {
    setNotifLoading(true);
    const result = await subscribeToNotifications(user.id);
    if (result.success) {
      setNotifStatus('subscribed');
      alert('✨ 알림이 설정되었습니다!\n공지, Q&A 답변 등을 실시간으로 받아보세요.');
    } else {
      alert('알림 설정에 실패했습니다.\n' + result.error);
    }
    setNotifLoading(false);
  };

  const handleDisableNotifications = async () => {
    if (!confirm('알림을 끄시겠습니까?')) return;
    setNotifLoading(true);
    const result = await unsubscribeFromNotifications(user.id);
    if (result.success) {
      setNotifStatus('unsubscribed');
    }
    setNotifLoading(false);
  };

  const changeColor = async (newColor) => {
    setSaving(true);
    setCurrentColor(newColor);
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_color: newColor })
      .eq('id', user.id);
    if (error) {
      console.error('컬러 변경 에러:', error);
      alert('컬러 변경 실패. 다시 시도해주세요.');
    }
    setSaving(false);
  };

  // 표시용 user 객체 (실시간 미리보기)
  const displayUser = { ...user, avatar_color: currentColor };

  return (
    <>
      <PageIntro ko="마이페이지" en="My Page" />
      <div className="px-5 space-y-3">
        {/* 프로필 카드 */}
        <section className="rounded-3xl p-6 relative overflow-hidden" style={{ background: COLORS.cardElev }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, ${COLORS.primary}50, transparent 70%)` }}></div>
          <div className="relative flex items-center gap-4">
            <button onClick={() => setShowColorPicker(!showColorPicker)} className="relative">
              <Avatar user={displayUser} size="xxl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COLORS.primary, border: `2px solid ${COLORS.ink}` }}>
                <Palette size={11} style={{ color: COLORS.white }} />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.white }}>{user.name}</h2>
                {isAdmin && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>ADMIN</span>}
              </div>
              <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.ink, opacity: 0.6 }}>{user.email}</p>
              <p className="font-serif-italic text-sm mt-2" style={{ color: COLORS.primary }}>{user.course}</p>
            </div>
          </div>
        </section>

        {/* ⭐ 등급 카드 (admin 제외) */}
        {!isAdmin && <LevelCard userId={user.id} setCurrentPage={setCurrentPage} />}

        {/* 📋 내 활동 바로가기 */}
        {!isAdmin && (
          <button onClick={() => setCurrentPage('my-activity')}
            className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
              <BookOpen size={18} style={{ color: COLORS.primary }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-heading text-sm" style={{ color: COLORS.ink }}>내 활동</p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>게시글 · 댓글 · 좋아요 모아보기</p>
            </div>
            <ChevronRight size={16} style={{ color: COLORS.stone }} />
          </button>
        )}

        {/* 컬러 선택 (펼침/접힘) */}
        {showColorPicker && (
          <section className="rounded-2xl p-4 animate-fade-in" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Avatar Color</p>
                <h3 className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>아바타 컬러 변경</h3>
              </div>
              {saving && <Loader2 size={14} className="animate-spin" style={{ color: COLORS.primary }} />}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(AVATAR_COLORS).map(([key, c]) => (
                <button key={key} onClick={() => changeColor(key)} className="aspect-square rounded-full"
                  style={{
                    background: c.gradient,
                    border: currentColor === key ? `3px solid ${COLORS.ink}` : '2px solid transparent',
                    boxShadow: currentColor === key ? `0 0 0 2px ${COLORS.primary}33` : 'none',
                    transform: currentColor === key ? 'scale(0.9)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                  }}
                  title={c.name}
                ></button>
              ))}
            </div>
            <p className="font-mono text-[10px] mt-3 text-center" style={{ color: COLORS.stone }}>
              현재: <span style={{ color: COLORS.primary, fontWeight: 700 }}>{AVATAR_COLORS[currentColor].name}</span>
            </p>
          </section>
        )}

        {/* 알림 설정 */}
        <section className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Notifications</p>
              <h3 className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>푸시 알림</h3>
              <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: COLORS.stone }}>
                {notifStatus === 'subscribed' && '✨ 공지, 답변을 실시간으로 받습니다'}
                {notifStatus === 'unsubscribed' && '알림을 켜면 공지를 놓치지 않아요'}
                {notifStatus === 'default' && '알림을 켜면 공지를 놓치지 않아요'}
                {notifStatus === 'denied' && '⚠️ 브라우저 설정에서 알림을 허용해주세요'}
                {notifStatus === 'unsupported' && '이 기기는 알림을 지원하지 않습니다'}
                {notifStatus === 'checking' && '확인 중...'}
              </p>
            </div>
            <div className="ml-3 flex items-center">
              {notifStatus === 'checking' && <Loader2 size={16} className="animate-spin" style={{ color: COLORS.stone }} />}
              
              {(notifStatus === 'default' || notifStatus === 'unsubscribed') && (
                <button onClick={handleEnableNotifications} disabled={notifLoading}
                  className="font-heading text-xs px-4 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
                  {notifLoading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} strokeWidth={2.5} />}
                  알림 켜기
                </button>
              )}
              
              {notifStatus === 'subscribed' && (
                <button onClick={handleDisableNotifications} disabled={notifLoading}
                  className="font-heading text-xs px-4 py-2 rounded-full flex items-center gap-1.5 disabled:opacity-60"
                  style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
                  {notifLoading ? <Loader2 size={12} className="animate-spin" /> : <BellOff size={12} strokeWidth={2.5} />}
                  끄기
                </button>
              )}
              
              {notifStatus === 'denied' && (
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full" style={{ background: COLORS.cream, color: COLORS.deep }}>
                  차단됨
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 계정 정보 */}
        <section className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase p-4 pb-2" style={{ color: COLORS.primary }}>━━ Account</p>
          {[
            { label: 'Name', value: user.name },
            { label: 'Username', value: user.username || '미등록' },
            { label: 'Email', value: user.email },
            { label: 'Phone', value: user.phone || '미등록' },
            { label: 'Role', value: isAdmin ? 'Administrator' : 'Student' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>{row.label}</span>
              <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{row.value}</span>
            </div>
          ))}
        </section>

        <button onClick={handleLogout} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, color: COLORS.deep }}>
          <LogOut size={14} />로그아웃
        </button>

        {/* 회원 탈퇴 (관리자/운영진 제외) */}
        {!isAdmin && (
          <button onClick={handleDeleteAccount} 
            className="w-full mt-3 py-3 font-body text-xs"
            style={{ color: COLORS.stone, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            회원 탈퇴
          </button>
        )}
      </div>
    </>
  );
}

// =============================================================
// 🎯 OnboardingScreen - 신규 학생 온보딩 미션
// =============================================================
function OnboardingScreen({ user, setCurrentPage, setSelectedLecture }) {
  const [orientation, setOrientation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('lectures').select('*')
      .eq('is_orientation', true)
      .eq('is_published', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setOrientation(data);
        setLoading(false);
      });
  }, []);

  const missions = [
    {
      id: 'greeting',
      icon: Sparkles,
      title: '가입 인사 작성',
      desc: '학원 친구들에게 첫 인사를 남겨주세요',
      done: user.onb_greeting,
      action: () => setCurrentPage('greetings'),
    },
    {
      id: 'review',
      icon: Heart,
      title: '첫 수업 후기 작성',
      desc: '첫 수업의 인상을 후기로 남겨주세요',
      done: user.onb_review,
      action: () => setCurrentPage('reviews'),
    },
    // 🍊 신입생만 영상 미션 표시 (졸업생은 면제)
    ...(user.is_graduate ? [] : [{
      id: 'video',
      icon: PlayCircle,
      title: '오리엔테이션 영상 시청',
      desc: 'HSSUP 아카데미를 소개해드릴게요',
      done: user.onb_video,
      action: () => {
        if (orientation) {
          setSelectedLecture(orientation);
          setCurrentPage('lecture-detail');
        } else {
          alert('오리엔테이션 영상이 아직 준비되지 않았어요.\n원장님께 문의해주세요!');
        }
      },
    }]),
  ];

  const completed = missions.filter(m => m.done).length;
  const progress = (completed / missions.length) * 100;
  const allDone = completed === missions.length;

  return (
    <div className="pb-6">
      <div className="px-5 pt-6 pb-4">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Welcome</p>
        <h1 className="font-display text-[42px] leading-[1] mt-3 tracking-tighter" style={{ color: COLORS.ink }}>
          환영합니다,<br />
          <span className="glow-text" style={{ color: COLORS.primary }}>{user.name}</span>님
        </h1>
        <p className="font-serif-italic text-base mt-3" style={{ color: COLORS.stone }}>
          {allDone ? '모든 미션을 완료했어요! 🎉' : 'HSSUP에 오신 걸 환영해요 🍊'}
        </p>
      </div>

      <div className="px-5">
        {/* 진행률 */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.cardElev }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 미션 진행도</p>
            <p className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>
              {completed}<span className="font-body text-sm" style={{ color: COLORS.stone }}> / {missions.length}</span>
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.cream }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: COLORS.primary,
                boxShadow: '0 0 12px rgba(255, 92, 31, 0.5)'
              }}></div>
          </div>
        </div>

        {/* 미션 카드 */}
        <div className="space-y-3">
          {missions.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={m.action}
                disabled={m.done}
                className="w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-transform active:scale-[0.98] disabled:active:scale-100"
                style={{
                  background: m.done ? 'rgba(255,92,31,0.08)' : COLORS.card,
                  border: `1px solid ${m.done ? COLORS.primary : COLORS.light}`,
                  opacity: m.done ? 0.7 : 1
                }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: m.done ? COLORS.primary : 'rgba(255,92,31,0.1)',
                    border: m.done ? 'none' : `1px solid rgba(255,92,31,0.25)`
                  }}>
                  {m.done 
                    ? <Check size={20} style={{ color: COLORS.white }} strokeWidth={3} /> 
                    : <Icon size={20} style={{ color: COLORS.primary }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{m.title}</p>
                  <p className="font-body text-xs mt-0.5" style={{ color: m.done ? COLORS.primary : COLORS.stone }}>
                    {m.done ? '✓ 완료!' : m.desc}
                  </p>
                </div>
                {!m.done && <ChevronRight size={16} style={{ color: COLORS.stone }} />}
              </button>
            );
          })}
        </div>

        {/* 안내 */}
        {!allDone && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: COLORS.peach }}>
            <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.deep }}>
              💡 3가지 미션을 모두 완료하면<br/>모든 기능을 자유롭게 이용할 수 있어요!
            </p>
          </div>
        )}

        {/* 완료 시 안내 */}
        {allDone && (
          <button onClick={() => window.location.reload()}
            className="w-full mt-4 rounded-2xl py-4 font-display text-base font-bold transition-transform active:scale-95"
            style={{ 
              background: COLORS.primary, 
              color: COLORS.white,
              boxShadow: '0 0 24px rgba(255, 92, 31, 0.5)'
            }}>
            🎉 HSSUP 시작하기!
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================
// 💡 ImprovementsPage - 개선 제안 (학생용)
// =============================================================
function ImprovementsPage({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent, clearContent] = useDraft('improvement', '');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('improvements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return alert('내용을 입력해주세요');
    setSubmitting(true);
    const { error } = await supabase.from('improvements').insert({
      user_id: user.id,
      content: content.trim(),
      is_anonymous: isAnonymous,
      status: 'pending'
    });
    setSubmitting(false);
    if (error) {
      alert('등록 실패: ' + error.message);
    } else {
      clearContent();
      setIsAnonymous(false);
      setShowForm(false);
      loadItems();
      alert('소중한 의견 감사합니다! 원장님께 전달되었어요 🍊');
    }
  };

  return (
    <>
      <PageIntro ko="개선 제안" en="Improvements" desc="아카데미에게 바라는 점을 자유롭게 남겨주세요 🔒 원장님께만 보입니다" />

      <div className="px-5">
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full rounded-2xl py-4 font-display text-base font-bold mb-4 transition-transform active:scale-95 flex items-center justify-center gap-2"
            style={{ background: COLORS.primary, color: COLORS.white }}>
            <Plus size={18} /> 새 제안하기
          </button>
        )}

        {showForm && (
          <div className="rounded-2xl p-5 mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="아카데미의 개선점이나 바라는 점을 자유롭게 적어주세요..."
              className="w-full rounded-xl p-3 font-body text-sm focus:outline-none"
              rows={6}
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />

            <button onClick={() => setIsAnonymous(!isAnonymous)}
              className="w-full mt-3 rounded-xl p-3 flex items-center gap-2 transition-all"
              style={{ 
                background: isAnonymous ? 'rgba(255,92,31,0.1)' : COLORS.cardElev,
                border: `1px solid ${isAnonymous ? COLORS.primary : COLORS.light}` 
              }}>
              <div className="w-5 h-5 rounded border-2 flex items-center justify-center"
                style={{ borderColor: isAnonymous ? COLORS.primary : COLORS.stone, background: isAnonymous ? COLORS.primary : 'transparent' }}>
                {isAnonymous && <Check size={12} style={{ color: COLORS.white }} />}
              </div>
              <span className="font-body text-sm" style={{ color: COLORS.ink }}>
                {isAnonymous ? '🔒 익명으로 제출 (이름 숨김)' : '👤 익명으로 제출하지 않음'}
              </span>
            </button>

            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setContent(''); setIsAnonymous(false); }}
                className="flex-1 rounded-xl py-3 font-display text-sm font-bold transition-transform active:scale-95"
                style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                취소
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 rounded-xl py-3 font-display text-sm font-bold transition-transform active:scale-95"
                style={{ background: COLORS.primary, color: COLORS.white }}>
                {submitting ? '제출 중...' : '제출하기'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <Heart size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              아직 등록한 제안이 없어요
            </p>
            <p className="font-body text-xs mt-2" style={{ color: COLORS.muted }}>
              자유롭게 의견을 남겨주세요 🍊
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="rounded-2xl p-4"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                    style={{ 
                      background: item.status === 'replied' ? COLORS.peach : COLORS.cardElev, 
                      color: item.status === 'replied' ? COLORS.primary : COLORS.stone 
                    }}>
                    {item.status === 'replied' ? '✓ 답변 완료' : '⏳ 답변 대기'}
                  </span>
                  <span className="font-mono text-[9px] px-2 py-1 rounded"
                    style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                    {item.is_anonymous ? '🔒 익명' : '👤 실명'}
                  </span>
                  <p className="font-mono text-[10px] ml-auto" style={{ color: COLORS.stone }}>
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <p className="font-body text-sm leading-relaxed mb-3" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                  {item.content}
                </p>

                {item.status === 'replied' && item.admin_reply && (
                  <div className="mt-3 rounded-lg p-3" style={{ background: COLORS.cardElev, borderLeft: `3px solid ${COLORS.primary}` }}>
                    <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: COLORS.primary }}>
                      ━━ 원장님 답변
                    </p>
                    <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                      {item.admin_reply}
                    </p>
                    {item.admin_replied_at && (
                      <p className="font-mono text-[9px] mt-2" style={{ color: COLORS.stone }}>
                        {new Date(item.admin_replied_at).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// =============================================================
// 💡 AdminImprovements - 개선 제안 관리 (관리자용)
// =============================================================
function AdminImprovements({ user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [profiles, setProfiles] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('improvements')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_color')
        .in('id', userIds);

      const profileMap = {};
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
      setProfiles(profileMap);
    }

    setItems(data || []);
    setLoading(false);
  };

  const handleReply = async (item) => {
    if (!reply.trim()) return alert('답변을 입력해주세요');
    setSubmitting(true);
    const { error } = await supabase.from('improvements').update({
      admin_reply: reply.trim(),
      admin_replied_at: new Date().toISOString(),
      admin_replied_by: user.id,
      status: 'replied'
    }).eq('id', item.id);
    setSubmitting(false);
    if (error) {
      alert('답변 실패: ' + error.message);
    } else {
      // 학생에게 알림 보내기
      await supabase.from('notifications').insert({
        user_id: item.user_id,
        type: 'improvement_reply',
        title: '개선 제안에 답변이 등록되었어요',
        message: reply.substring(0, 50) + (reply.length > 50 ? '...' : ''),
        link_type: 'improvements',
        is_read: false
      });
      // 🍊 운영진이면 원장님께 별도 알림
      await notifyAdminsOfStaffActivity(user, `개선 제안 답변`, reply.substring(0, 60));

      setReply('');
      setSelectedId(null);
      loadItems();
    }
  };

  const toggleAnonymous = async (item) => {
    if (!window.confirm(item.is_anonymous ? '실명으로 공개 변경할까요?' : '익명으로 변경할까요?')) return;
    const { error } = await supabase.from('improvements').update({
      is_anonymous: !item.is_anonymous
    }).eq('id', item.id);
    if (error) {
      alert('변경 실패: ' + error.message);
    } else {
      loadItems();
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('정말 삭제할까요? (복구 불가)')) return;
    const { error } = await supabase.from('improvements').delete().eq('id', item.id);
    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      loadItems();
    }
  };

  const toggleFilter = (status) => {
    setFilter(prev => prev === status ? 'all' : status);
  };

  const pending = items.filter(i => i.status === 'pending');
  const replied = items.filter(i => i.status === 'replied');
  const filtered = filter === 'all' ? items : filter === 'pending' ? pending : replied;

  return (
    <>
      <PageIntro ko="개선 제안 관리" en="Improvements Admin" desc="학생들의 의견에 답변해주세요" />

      <div className="px-5 mb-4">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => toggleFilter('pending')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${filter === 'pending' ? 'glow-primary' : ''}`}
            style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>답변 대기</p>
            <p className="font-display text-2xl mt-1" style={{ color: COLORS.white }}>{pending.length}</p>
          </button>
          <button onClick={() => toggleFilter('replied')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${filter === 'replied' ? 'glow-primary' : ''}`}
            style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>답변 완료</p>
            <p className="font-display text-2xl mt-1" style={{ color: COLORS.ink }}>{replied.length}</p>
          </button>
        </div>

        {filter !== 'all' && (
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px]" style={{ color: COLORS.primary }}>
              <span className="font-bold">{filter === 'pending' ? '답변 대기' : '답변 완료'}</span> 만 보는 중
            </p>
            <button onClick={() => setFilter('all')} className="font-mono text-[10px] font-bold flex items-center gap-1" style={{ color: COLORS.stone }}>
              전체 보기 <X size={11} />
            </button>
          </div>
        )}
      </div>

      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {filter === 'pending' ? '답변 대기 중인 제안이 없습니다' :
             filter === 'replied' ? '답변 완료된 제안이 없습니다' :
             '등록된 제안이 없습니다'}
          </p>
        ) : filtered.map(item => {
          const profile = profiles[item.user_id];
          return (
            <div key={item.id} className="rounded-2xl p-4"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                    style={{ 
                      background: item.status === 'replied' ? COLORS.peach : COLORS.primary, 
                      color: item.status === 'replied' ? COLORS.primary : COLORS.white 
                    }}>
                    {item.status === 'replied' ? '완료' : '대기'}
                  </span>
                  <button onClick={() => toggleAnonymous(item)}
                    className="font-mono text-[9px] px-2 py-1 rounded transition-transform active:scale-95"
                    style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                    {item.is_anonymous ? '🔒 익명' : '👤 실명'} (변경)
                  </button>
                </div>
                <button onClick={() => handleDelete(item)} className="rounded p-1.5" style={{ background: COLORS.cardElev }}>
                  <Trash2 size={12} style={{ color: COLORS.muted }} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-bold"
                  style={{ background: profile?.avatar_color || COLORS.primary, color: COLORS.white }}>
                  {profile?.name?.[0] || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-body text-xs font-bold" style={{ color: COLORS.ink }}>
                    {profile?.name || '(알 수 없음)'}
                    {item.is_anonymous && <span className="ml-2 font-mono text-[9px]" style={{ color: COLORS.stone }}>(학생에게는 익명 표시)</span>}
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                    {new Date(item.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>

              <p className="font-body text-sm leading-relaxed mb-3" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                {item.content}
              </p>

              {item.status === 'replied' && item.admin_reply ? (
                <div className="rounded-lg p-3" style={{ background: COLORS.cardElev, borderLeft: `3px solid ${COLORS.primary}` }}>
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: COLORS.primary }}>━━ 답변</p>
                  <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
                    {item.admin_reply}
                  </p>
                </div>
              ) : selectedId === item.id ? (
                <div>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder="답변을 작성해주세요..."
                    className="w-full rounded-xl p-3 font-body text-sm focus:outline-none"
                    rows={4}
                    style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setSelectedId(null); setReply(''); }}
                      className="flex-1 rounded-xl py-2 font-display text-sm font-bold"
                      style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                      취소
                    </button>
                    <button onClick={() => handleReply(item)} disabled={submitting}
                      className="flex-1 rounded-xl py-2 font-display text-sm font-bold"
                      style={{ background: COLORS.primary, color: COLORS.white }}>
                      {submitting ? '전송...' : '답변 전송'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setSelectedId(item.id)}
                  className="w-full rounded-xl py-2 font-display text-sm font-bold transition-transform active:scale-95"
                  style={{ background: COLORS.primary, color: COLORS.white }}>
                  답변하기
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// =============================================================
// 🚫 SuspendedScreen - 정지/탈퇴된 계정 화면
// =============================================================
function SuspendedScreen({ profile, handleLogout }) {
  const isDeleted = profile?.status === 'deleted';
  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: COLORS.cream }}>
      <div className="text-center max-w-xs">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: COLORS.card, border: `2px solid #FF4444` }}>
          <AlertCircle size={32} style={{ color: '#FF4444' }} strokeWidth={2.5} />
        </div>
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#FF4444' }}>
          ━━ {isDeleted ? 'Account Deleted' : 'Account Suspended'}
        </p>
        <h2 className="font-display text-2xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>
          {isDeleted ? '탈퇴된 계정이에요' : '계정이 정지되었어요'}
        </h2>
        <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
          {isDeleted 
            ? '이 계정은 더 이상 사용할 수 없어요.'
            : (profile?.suspended_reason || '자세한 사항은 원장님께 문의해주세요.')}
        </p>
        <button onClick={handleLogout} className="mt-6 font-heading text-sm px-6 py-3 rounded-full"
          style={{ background: COLORS.cream, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

// =============================================================
// 🚫 NoPermissionScreen - 권한 없음 화면 (staff용)
// =============================================================
function NoPermissionScreen({ setCurrentPage }) {
  return (
    <div className="px-5 py-20 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: COLORS.card, border: `2px solid ${COLORS.stone}` }}>
        <Lock size={32} style={{ color: COLORS.stone }} strokeWidth={2.5} />
      </div>
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.stone }}>━━ Access Denied</p>
      <h2 className="font-display text-2xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>
        접근 권한이 없어요
      </h2>
      <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
        이 페이지는 원장님만 볼 수 있어요.
      </p>
      <button onClick={() => setCurrentPage('dashboard')}
        className="mt-6 font-heading text-sm px-6 py-3 rounded-full"
        style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.4)' }}>
        대시보드로 가기
      </button>
    </div>
  );
}

function AdminDashboard({ setCurrentPage, canViewRevenue }) {
  const newDays = 3;
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [stats, setStats] = useState({
    students: 0, 
    lectures: 0, 
    pendingQna: 0, 
    monthRevenue: 0,
    lastMonthRevenue: 0,
    newStudents: 0,
    monthOrders: 0,
    monthlyTrend: [],
  });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: students },
        { count: lectures },
        { count: pendingQna },
        { data: thisMonthOrders },
        { data: lastMonthOrders },
        { count: newStudents },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').neq('status', 'deleted'),
        supabase.from('lectures').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', thisMonthStart),
        supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', lastMonthStart).lt('paid_at', lastMonthEnd),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').neq('status', 'deleted').gte('created_at', thisMonthStart),
      ]);
      
      const monthRevenue = (thisMonthOrders || []).reduce((sum, o) => sum + Number(o.amount || 0), 0);
      const lastMonthRevenue = (lastMonthOrders || []).reduce((sum, o) => sum + Number(o.amount || 0), 0);

      // 📊 최근 6개월 매출 트렌드 로드
      const monthRanges = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStart = date.toISOString();
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString();
        monthRanges.push({ date, mStart, mEnd });
      }
      const trendData = await Promise.all(
        monthRanges.map(({ mStart, mEnd }) =>
          supabase.from('orders').select('amount').eq('status', 'paid').gte('paid_at', mStart).lt('paid_at', mEnd)
        )
      );
      const monthlyTrend = monthRanges.map((range, i) => {
        const orders = trendData[i].data || [];
        const revenue = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
        return {
          label: `${range.date.getMonth() + 1}월`,
          revenue
        };
      });

      setStats({
        students: students || 0, 
        lectures: lectures || 0, 
        pendingQna: pendingQna || 0,
        monthRevenue,
        lastMonthRevenue,
        newStudents: newStudents || 0,
        monthOrders: thisMonthOrders?.length || 0,
        monthlyTrend,
      });
    };
    load();
  }, []);

  useEffect(() => {
    const loadUpdates = async () => {
      const since = new Date(Date.now() - newDays * 24 * 60 * 60 * 1000).toISOString();
      const [notices, trends, tips, lectures, library] = await Promise.all([
        supabase.from('notices').select('id, title, created_at').gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('trends').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('tips').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('lectures').select('id, title, created_at').eq('is_published', true).gte('created_at', since).order('created_at', { ascending: false }),
        supabase.from('library_files').select('id, name, created_at').gte('created_at', since).order('created_at', { ascending: false }),
      ]);
      const all = [
        ...(notices.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '공지', page: 'admin-notice' })),
        ...(trends.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '트렌드', page: 'admin-trends' })),
        ...(tips.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '꿀팁', page: 'admin-tips' })),
        ...(lectures.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '강의', page: 'admin-lectures' })),
        ...(library.data || []).map(x => ({ id: x.id, title: x.name, created_at: x.created_at, type: '자료', page: 'admin-library' })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentUpdates(all);
    };
    loadUpdates();
  }, [newDays]);

  const formatRevenue = (n) => {
    if (!n || n === 0) return '0';
    if (n >= 10000) return (n / 10000).toFixed(0) + '만';
    return n.toLocaleString();
  };

  // 매출 변화율 계산
  const revenueChange = stats.lastMonthRevenue > 0 
    ? Math.round(((stats.monthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100)
    : null;

  const quickActions = [
    { id: 'admin-approvals',    label: 'APPROVE',  ko: '가입 승인',     icon: UserPlus },
    { id: 'admin-notice',       label: 'NOTICE',   ko: '학원공지',      icon: Bell },
    { id: 'admin-trends',       label: 'TRENDS',   ko: '트렌드',     icon: Sparkles },
    { id: 'admin-tips',         label: 'TIPS',     ko: '수업·꿀팁',     icon: Sparkles },
    { id: 'admin-students',     label: 'STUDENTS', ko: '수강생',        icon: UserCheck },
    { id: 'admin-qna',          label: 'Q&A',      ko: 'Q&A 답변',      icon: MessageCircle },
    { id: 'admin-improvements', label: 'FEEDBACK', ko: '개선 제안',     icon: Edit3 },
    { id: 'admin-cases',        label: 'CASES',    ko: '개별피드백',    icon: Camera },
    { id: 'admin-lectures',     label: 'LECTURES', ko: '강의 관리',     icon: PlayCircle },
    { id: 'admin-products',     label: 'PRODUCTS', ko: '재료샵',        icon: ShoppingBag },
    { id: 'admin-library',      label: 'LIBRARY',  ko: '자료실',        icon: FolderOpen },
    { id: 'admin-courses',      label: 'COURSES',  ko: '클래스',        icon: BookOpen },
  ];

  return (
    <div className="pb-6">
      {/* 헤더 */}
      <section className="px-5 pt-5 pb-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Admin</p>
        <h2 className="font-display text-[42px] leading-[1] mt-3 tracking-tighter" style={{ color: COLORS.ink }}>
          Dashboard<span className="glow-text" style={{ color: COLORS.primary }}>.</span>
        </h2>
        <p className="font-serif-italic text-base mt-2" style={{ color: COLORS.stone }}>오늘의 운영 현황</p>
      </section>

      {/* 💰 이번 달 매출 - 큰 강조 카드 (admin만) */}
      {canViewRevenue && (
      <section className="px-5 mb-3">
        <button onClick={() => setCurrentPage('admin-orders')} className="w-full rounded-3xl p-6 text-left relative overflow-hidden glow-primary" style={{ background: COLORS.primary }}>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
          <div className="relative" style={{ color: COLORS.white }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase opacity-80">━━ This Month Revenue</p>
            <p className="font-display text-5xl mt-2 leading-none tracking-tighter">
              {formatRevenue(stats.monthRevenue)}<span className="font-body text-2xl font-medium opacity-80">원</span>
            </p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                {revenueChange !== null && (
                  <span className="font-mono text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {revenueChange > 0 ? '↑' : revenueChange < 0 ? '↓' : '→'} {Math.abs(revenueChange)}%
                  </span>
                )}
                <p className="font-body text-xs opacity-90">
                  {revenueChange === null ? '지난 달 데이터 없음' : 
                   revenueChange > 0 ? `지난 달보다 ${revenueChange}% 증가` :
                   revenueChange < 0 ? `지난 달보다 ${Math.abs(revenueChange)}% 감소` :
                   '지난 달과 동일'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 ml-2" style={{ background: COLORS.white }}>
                <ArrowUpRight size={16} strokeWidth={2.5} style={{ color: COLORS.primary }} />
              </div>
            </div>
          </div>
        </button>
      </section>
      )}

      {/* 📊 매출 트렌드 - 최근 6개월 (admin만) */}
      {canViewRevenue && stats.monthlyTrend.length > 0 && (
        <section className="px-5 mb-3">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ Revenue Trend (6M)</p>
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {(() => {
              const maxRevenue = Math.max(...stats.monthlyTrend.map(m => m.revenue), 1);
              return (
                <div className="flex items-end justify-between gap-2" style={{ height: '140px' }}>
                  {stats.monthlyTrend.map((m, i) => {
                    const heightPercent = (m.revenue / maxRevenue) * 100;
                    const isCurrentMonth = i === stats.monthlyTrend.length - 1;
                    const formatVal = m.revenue >= 10000 ? `${(m.revenue / 10000).toFixed(0)}만` : m.revenue > 0 ? m.revenue.toLocaleString() : '-';
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <p className="font-mono text-[9px] font-bold" style={{ color: isCurrentMonth ? COLORS.primary : COLORS.stone }}>
                          {formatVal}
                        </p>
                        <div className="w-full rounded-t-lg" style={{ 
                          height: `${Math.max(heightPercent, 2)}%`,
                          background: isCurrentMonth ? COLORS.primary : 'rgba(255, 92, 31, 0.35)',
                          boxShadow: isCurrentMonth ? '0 0 16px rgba(255, 92, 31, 0.5)' : 'none',
                          transition: 'height 0.6s ease',
                          minHeight: '4px',
                        }}></div>
                        <p className="font-mono text-[10px] font-bold" style={{ color: isCurrentMonth ? COLORS.primary : COLORS.stone }}>
                          {m.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* 🚨 답변 대기 Q&A 알림 */}
      {stats.pendingQna > 0 && (
        <section className="px-5 mb-3">
          <button onClick={() => setCurrentPage('admin-qna')} className="w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-transform active:scale-[0.98]" 
            style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.primary}` }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 glow-primary" style={{ background: COLORS.primary }}>
              <MessageCircle size={20} style={{ color: COLORS.white }} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Today's Mission</p>
              <p className="font-heading text-base mt-0.5" style={{ color: COLORS.ink }}>답변 기다리는 질문 {stats.pendingQna}건</p>
            </div>
            <ChevronRight size={20} style={{ color: COLORS.primary }} />
          </button>
        </section>
      )}

      {/* 🆕 최근 업데이트 (NEW) */}
      <section className="px-5 mb-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ NEW 업데이트</p>
          <span className="font-mono text-[9px]" style={{ color: COLORS.stone }}>최근 3일</span>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {recentUpdates.length === 0 ? (
            <p className="font-body text-xs text-center py-6" style={{ color: COLORS.stone }}>최근 {newDays}일간 새 글이 없어요</p>
          ) : recentUpdates.slice(0, 10).map((u, i) => (
            <button key={`${u.type}-${u.id}`} onClick={() => setCurrentPage(u.page)}
              className="w-full text-left flex items-center gap-2.5 p-3 transition-transform active:scale-[0.98]"
              style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none' }}>
              <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-1 rounded shrink-0" style={{ background: COLORS.peach, color: COLORS.deep }}>{u.type}</span>
              <p className="font-body text-xs flex-1 truncate" style={{ color: COLORS.ink }}>{u.title}</p>
              <span className="font-mono text-[9px] shrink-0" style={{ color: COLORS.stone }}>{new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
              <ChevronRight size={12} style={{ color: COLORS.stone }} />
            </button>
          ))}
        </div>
      </section>

      {/* 📅 이번 달 통계 - 3개 카드 */}
      <section className="px-5 mb-3">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ This Month</p>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setCurrentPage('admin-approvals')} 
            className="rounded-2xl p-3 text-center transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,92,31,0.12)' }}>
              <UserPlus size={18} style={{ color: COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>{stats.newStudents}</p>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: COLORS.stone }}>신규</p>
          </button>
          <button onClick={() => setCurrentPage('admin-orders')}
            className="rounded-2xl p-3 text-center transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(255,92,31,0.12)' }}>
              <CreditCard size={18} style={{ color: COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="font-display text-2xl tracking-tight" style={{ color: COLORS.ink }}>{stats.monthOrders}</p>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: COLORS.stone }}>결제</p>
          </button>
          <button onClick={() => setCurrentPage('admin-qna')}
            className="rounded-2xl p-3 text-center transition-transform active:scale-95"
            style={{ background: stats.pendingQna > 0 ? COLORS.peach : COLORS.card, border: `1px solid ${stats.pendingQna > 0 ? COLORS.primary : COLORS.light}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: stats.pendingQna > 0 ? 'rgba(255,92,31,0.2)' : 'rgba(255,92,31,0.12)' }}>
              <MessageCircle size={18} style={{ color: COLORS.primary }} strokeWidth={2} />
            </div>
            <p className="font-display text-2xl tracking-tight" style={{ color: stats.pendingQna > 0 ? COLORS.primary : COLORS.ink }}>{stats.pendingQna}</p>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mt-1" style={{ color: COLORS.stone }}>답변대기</p>
          </button>
        </div>
      </section>

      {/* 👥 전체 통계 - 2개 카드 */}
      <section className="px-5 mb-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ All Time</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setCurrentPage('admin-students')}
            className="rounded-2xl p-4 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>전체 수강생</p>
            <p className="font-display text-3xl mt-1 leading-none tracking-tight" style={{ color: COLORS.ink }}>{stats.students}<span className="font-body text-base font-medium" style={{ color: COLORS.stone }}>명</span></p>
          </button>
          <button onClick={() => setCurrentPage('online')}
            className="rounded-2xl p-4 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>진행 강의</p>
            <p className="font-display text-3xl mt-1 leading-none tracking-tight" style={{ color: COLORS.ink }}>{stats.lectures}<span className="font-body text-base font-medium" style={{ color: COLORS.stone }}>개</span></p>
          </button>
        </div>
      </section>

      {/* ⚡ Quick Action 3열 그리드 */}
      <section className="px-5">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3 px-1" style={{ color: COLORS.primary }}>━━ Quick Action</p>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setCurrentPage(item.id)}
                className="rounded-2xl p-3 flex flex-col items-center text-center transition-transform active:scale-95"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-2 glow-soft" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
                  <Icon size={19} strokeWidth={1.8} style={{ color: COLORS.primary }} />
                </div>
                <p className="font-heading text-xs leading-tight" style={{ color: COLORS.ink }}>{item.ko}</p>
                <p className="font-mono text-[8px] mt-1 tracking-widest" style={{ color: COLORS.stone }}>{item.label}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// =============================================================
// 🔥 AdminTrends - 트렌드 속보 관리 (관리자용)
// =============================================================
function AdminTrends({ user }) {
  const [trends, setTrends] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm, clearForm] = useDraft('trend_form', {
    category: '트렌드', title: '', content: '',
    link_url: '', video_url: '',
    image_url: '', imageFile: null, imagePreview: null,
    is_active: true, sendPush: true,
  }, ['imageFile', 'imagePreview']);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('trends').select('*').order('created_at', { ascending: false });
    setTrends(data || []);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  const removePreview = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, imageFile: null, imagePreview: null });
  };

  const uploadTrendImage = async (file) => {
    const compressed = await compressImage(file, 1600, 0.85);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('trend-images').upload(fileName, compressed);
    if (error) throw error;
    const { data } = supabase.storage.from('trend-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteTrendImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/trend-images/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('trend-images').remove([pathParts[1]]);
    } catch (e) { console.error('이미지 삭제 에러:', e); }
  };

  const resetForm = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    clearForm();
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (trend) => {
    setForm({
      category: trend.category || '트렌드',
      title: trend.title || '',
      content: trend.content || '',
      link_url: trend.link_url || '',
      video_url: trend.video_url || '',
      image_url: trend.image_url || '',
      imageFile: null,
      imagePreview: null,
      is_active: trend.is_active !== false,
      sendPush: false,
    });
    setEditingId(trend.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return alert('제목을 입력해주세요');
    setLoading(true);
    try {
      let imageUrl = form.image_url;
      if (form.imageFile) {
        setUploading(true);
        if (editingId && form.image_url) await deleteTrendImage(form.image_url);
        imageUrl = await uploadTrendImage(form.imageFile);
        setUploading(false);
      }
      const trendData = {
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim() || null,
        link_url: form.link_url.trim() || null,
        video_url: form.video_url.trim() || null,
        image_url: imageUrl || null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('trends').update(trendData).eq('id', editingId);
        if (error) throw error;
      } else {
        trendData.created_by = user.id;
        const { error } = await supabase.from('trends').insert(trendData);
        if (error) throw error;

        // 푸시 알림 (신규 등록 + 체크 시)
        if (form.sendPush) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: `[${form.category}] 새 트렌드 속보!`,
                body: form.title,
                url: '/',
                targetRole: 'student',
              }),
            });
          } catch (e) { console.error('알림 발송 실패:', e); }
        }

        // 운영진이면 원장님께 별도 알림
        await notifyAdminsOfStaffActivity(user, `트렌드 속보 등록`, form.title);
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (trend) => {
    if (!confirm('이 트렌드를 삭제하시겠습니까?')) return;
    if (trend.image_url) await deleteTrendImage(trend.image_url);
    await supabase.from('trends').delete().eq('id', trend.id);
    await load();
  };

  const toggleActive = async (trend) => {
    await supabase.from('trends').update({ is_active: !trend.is_active }).eq('id', trend.id);
    await load();
  };

  const categories = ['전체', '트렌드', '신상품', '시술기법', '업계소식', '마케팅팁'];
  const filtered = filter === '전체' ? trends : trends.filter(t => t.category === filter);

  return (
    <>
      <PageIntro ko="트렌드 속보 관리" en="Trends Admin" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>공개 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{trends.filter(t => t.is_active).length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>숨김</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{trends.filter(t => !t.is_active).length}</p>
          </div>
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 트렌드 속보
          </button>
        )}

        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '트렌드 수정' : '새 트렌드 속보'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리 *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>트렌드</option><option>신상품</option><option>시술기법</option><option>업계소식</option><option>마케팅팁</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 일본에서 유행하는 신 엠보 기법"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>대표 이미지 (선택)</label>
              <div className="mt-2">
                {form.imagePreview ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={form.imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                    <button onClick={removePreview} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.image_url ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={form.image_url} alt="기존" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <span className="font-heading text-xs" style={{ color: COLORS.white }}>이미지 변경</span>
                      <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="aspect-video w-full rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                    <Upload size={24} style={{ color: COLORS.stone }} />
                    <span className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>이미지 업로드 (16:9 권장)</span>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>내용</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                placeholder="자세한 설명 (선택)" rows={5}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>외부 링크 (선택)</label>
              <input type="url" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})}
                placeholder="https://news.example.com/..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>💡 뉴스 기사, 인스타 등 URL 붙여넣기</p>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>유튜브 URL (선택)</label>
              <input type="url" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>💡 youtube.com, youtu.be, shorts 모두 가능</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span className="font-body text-xs" style={{ color: COLORS.ink }}>✨ 즉시 공개 (체크 해제 시 숨김)</span>
            </label>

            {!editingId && (
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
                <input type="checkbox" checked={form.sendPush} onChange={e => setForm({...form, sendPush: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span className="font-body text-xs" style={{ color: COLORS.ink }}>📢 푸시 알림 발송</span>
              </label>
            )}

            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '발행하기'}
            </button>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>등록된 트렌드가 없습니다</p>
          </div>
        ) : filtered.map(t => (
          <div key={t.id} onClick={() => startEdit(t)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: t.is_active ? 1 : 0.6 }}>
            {t.image_url && (
              <div className="aspect-video relative">
                <SkeletonImage src={t.image_url} alt={t.title} className="w-full h-full" />
                <span className="absolute top-2 left-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{t.category}</span>
                {!t.is_active && (
                  <span className="absolute top-2 right-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>
                )}
              </div>
            )}
            <div className="p-3">
              {!t.image_url && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{t.category}</span>
                  {!t.is_active && <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>}
                </div>
              )}
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{t.title}</h4>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{new Date(t.created_at).toLocaleDateString('ko-KR')}</p>
              {t.content && <p className="font-body text-xs mt-1.5 line-clamp-2" style={{ color: COLORS.stone }}>{t.content}</p>}
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: t.is_active ? COLORS.cream : COLORS.primary, color: t.is_active ? COLORS.stone : COLORS.white }}>
                  {t.is_active ? '숨김' : '공개'}
                </button>
                <button onClick={() => startEdit(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(t)} className="px-2 py-1.5 rounded-full" style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 💡 TipsPage - 수업·꿀팁 공유방 (학생용)
// =============================================================
function TipsPage({ user, setCurrentPage, setSelectedTip }) {
  const [tips, setTips] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tips')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    setTips(data || []);
    setLoading(false);
  };

  const categories = ['전체', '수업노트', '시술꿀팁', '운영꿀팁', '기타'];
  const filtered = filter === '전체' ? tips : tips.filter(t => t.category === filter);

  return (
    <>
      <PageIntro ko="수업·꿀팁" en="Tips" />

      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
                boxShadow: filter === cat ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mb-4">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
          {filter === '전체' ? '총 ' : `${filter} `}
          <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{filtered.length}개</span>
        </p>
      </div>

      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '아직 공유된 꿀팁이 없어요' : `${filter} 카테고리 글이 없어요`}
            </p>
          </div>
        ) : filtered.map(t => (
          <button key={t.id} onClick={() => { setSelectedTip(t); setCurrentPage('tip-detail'); }}
            className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {t.image_url && (
              <div className="relative aspect-[16/9] overflow-hidden">
                <SkeletonImage src={t.image_url} alt={t.title} className="w-full h-full" />
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                    background: COLORS.card, color: COLORS.ink, backdropFilter: 'blur(8px)'
                  }}>
                    {t.category}
                  </span>
                </div>
                {t.video_url && (
                  <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <Play size={14} fill={COLORS.white} style={{ color: COLORS.white }} className="ml-0.5" />
                  </div>
                )}
              </div>
            )}
            <div className="p-4">
              {!t.image_url && (
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded inline-block mb-2" style={{
                  background: COLORS.peach, color: COLORS.deep
                }}>
                  {t.category}
                </span>
              )}
              <h4 className="font-heading text-base leading-snug" style={{ color: COLORS.ink }}>{t.title}</h4>
              {t.content && (
                <p className="font-body text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: COLORS.stone }}>
                  {t.content}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                  {new Date(t.created_at).toLocaleDateString('ko-KR')}
                </p>
                <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.primary }}>
                  자세히 보기 <ChevronRight size={11} />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 💡 TipDetailPage - 수업·꿀팁 상세
// =============================================================
function TipDetailPage({ tip, user }) {
  if (!tip) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([^&\s]+)/,
      /youtu\.be\/([^?\s]+)/,
      /youtube\.com\/embed\/([^?\s]+)/,
      /youtube\.com\/shorts\/([^?\s]+)/,
    ];
    for (const p of patterns) {
      const match = url.match(p);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = tip.video_url ? getYouTubeId(tip.video_url) : null;

  return (
    <div className="pb-6">
      {tip.image_url && (
        <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: COLORS.cream }}>
          <SkeletonImage src={tip.image_url} alt={tip.title} className="w-full h-full" />
        </div>
      )}

      <div className="px-5 pt-5">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>
            {tip.category}
          </span>
          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
            {new Date(tip.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
        <h1 className="font-display text-2xl tracking-tight leading-tight" style={{ color: COLORS.ink }}>{tip.title}</h1>
      </div>

      {tip.content && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
              {tip.content}
            </p>
          </div>
        </div>
      )}

      {videoId && (
        <div className="px-5 mt-3">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>━━ 관련 영상</p>
          <div className="relative aspect-video rounded-2xl overflow-hidden" style={{ background: '#000' }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
              title={tip.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      )}

      {tip.video_url && !videoId && (
        <div className="px-5 mt-3">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>━━ 관련 영상</p>
          <video src={tip.video_url} controls playsInline className="w-full rounded-2xl" style={{ background: '#000', maxHeight: '70vh' }} />
        </div>
      )}

      {tip.link_url && (
        <div className="px-5 mt-3">
          <a href={tip.link_url} target="_blank" rel="noopener noreferrer"
            className="rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}` }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.peach }}>
              <ArrowUpRight size={16} style={{ color: COLORS.primary }} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 외부 링크</p>
              <p className="font-body text-xs mt-0.5 truncate" style={{ color: COLORS.ink }}>{tip.link_url}</p>
            </div>
          </a>
        </div>
      )}

      <div className="px-5 mt-3">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <LikeButton targetType="tip" targetId={tip.id} userId={user.id} size={16} />
          <CommentSection targetType="tip" targetId={tip.id} user={user} />
        </div>
      </div>
    </div>
  );
}

// =============================================================
// 💡 AdminTips - 수업·꿀팁 관리 (원장님·운영진)
// =============================================================
function AdminTips({ user }) {
  const [tips, setTips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm, clearForm] = useDraft('tip_form', {
    category: '수업노트', title: '', content: '',
    link_url: '', video_url: '',
    image_url: '', imageFile: null, imagePreview: null,
    videoFile: null, videoPreview: null,
    is_active: true, sendPush: true,
  }, ['imageFile', 'imagePreview', 'videoFile', 'videoPreview']);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('tips').select('*').order('created_at', { ascending: false });
    setTips(data || []);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  const removePreview = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, imageFile: null, imagePreview: null });
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      if (!confirm('⚠️ 영상이 100MB가 넘어요.\n업로드가 오래 걸리고 저장공간을 많이 차지해요.\n긴 영상은 유튜브 URL을 추천해요!\n\n그래도 이 파일을 올릴까요?')) return;
    }
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: file, videoPreview: URL.createObjectURL(file), video_url: '' });
  };

  const removeVideo = () => {
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: null, videoPreview: null });
  };

  const uploadTipImage = async (file) => {
    const compressed = await compressImage(file, 1600, 0.85);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('tip-images').upload(fileName, compressed);
    if (error) throw error;
    const { data } = supabase.storage.from('tip-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteTipImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/tip-images/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('tip-images').remove([pathParts[1]]);
    } catch (e) { console.error('이미지 삭제 에러:', e); }
  };

  const resetForm = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    clearForm();
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (tip) => {
    setForm({
      category: tip.category || '수업노트',
      title: tip.title || '',
      content: tip.content || '',
      link_url: tip.link_url || '',
      video_url: tip.video_url || '',
      image_url: tip.image_url || '',
      imageFile: null,
      imagePreview: null,
      videoFile: null,
      videoPreview: null,
      is_active: tip.is_active !== false,
      sendPush: false,
    });
    setEditingId(tip.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return alert('제목을 입력해주세요');
    setLoading(true);
    try {
      let imageUrl = form.image_url;
      if (form.imageFile) {
        setUploading(true);
        if (editingId && form.image_url) await deleteTipImage(form.image_url);
        imageUrl = await uploadTipImage(form.imageFile);
        setUploading(false);
      }

      // 🎥 영상 처리 (유튜브 URL 또는 파일 업로드)
      let videoUrl = form.video_url;
      if (form.videoFile) {
        setUploading(true);
        if (editingId && form.video_url && !isYouTubeUrl(form.video_url)) await deletePostVideo(form.video_url);
        videoUrl = await uploadPostVideo(form.videoFile);
        setUploading(false);
      }

      const tipData = {
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim() || null,
        link_url: form.link_url.trim() || null,
        video_url: (typeof videoUrl === 'string' ? videoUrl.trim() : videoUrl) || null,
        image_url: imageUrl || null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('tips').update(tipData).eq('id', editingId);
        if (error) throw error;
      } else {
        tipData.created_by = user.id;
        const { error } = await supabase.from('tips').insert(tipData);
        if (error) throw error;

        if (form.sendPush) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: `[${form.category}] 새 꿀팁이 올라왔어요!`,
                body: form.title,
                url: '/',
                targetRole: 'student',
              }),
            });
          } catch (e) { console.error('알림 발송 실패:', e); }
        }

        await notifyAdminsOfStaffActivity(user, `수업·꿀팁 등록`, form.title);
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (tip) => {
    if (!confirm('이 글을 삭제하시겠습니까?')) return;
    if (tip.image_url) await deleteTipImage(tip.image_url);
    if (tip.video_url) await deletePostVideo(tip.video_url);
    await supabase.from('tips').delete().eq('id', tip.id);
    await load();
  };

  const toggleActive = async (tip) => {
    await supabase.from('tips').update({ is_active: !tip.is_active }).eq('id', tip.id);
    await load();
  };

  const categories = ['전체', '수업노트', '시술꿀팁', '운영꿀팁', '기타'];
  const filtered = filter === '전체' ? tips : tips.filter(t => t.category === filter);

  return (
    <>
      <PageIntro ko="수업·꿀팁 관리" en="Tips Admin" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>공개 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{tips.filter(t => t.is_active).length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>숨김</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{tips.filter(t => !t.is_active).length}</p>
          </div>
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 꿀팁 공유
          </button>
        )}

        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '꿀팁 수정' : '새 꿀팁 공유'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리 *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>수업노트</option><option>시술꿀팁</option><option>운영꿀팁</option><option>기타</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 엠보 시술 시 통증 줄이는 꿀팁"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>대표 이미지 (선택)</label>
              <div className="mt-2">
                {form.imagePreview ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={form.imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                    <button onClick={removePreview} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.image_url ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={form.image_url} alt="기존" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <span className="font-heading text-xs" style={{ color: COLORS.white }}>이미지 변경</span>
                      <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="aspect-video w-full rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                    <Upload size={24} style={{ color: COLORS.stone }} />
                    <span className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>이미지 업로드 (16:9 권장)</span>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>내용</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                placeholder="수업 내용이나 꿀팁을 자세히 적어주세요" rows={10}
                className="w-full font-body text-sm font-medium p-3 mt-1 outline-none resize-none rounded leading-relaxed"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 🎥 동영상 (선택) - 파일 업로드 또는 유튜브 URL */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>동영상 (선택)</label>
              <div className="mt-2 space-y-2">
                {form.videoPreview ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.videoPreview} controls className="w-full max-h-64" />
                    <button onClick={removeVideo} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.video_url && !isYouTubeUrl(form.video_url) ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.video_url} controls className="w-full max-h-64" />
                    <button onClick={() => setForm({ ...form, video_url: '' })} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="w-full rounded-xl flex items-center justify-center gap-2 cursor-pointer py-3" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                      <Upload size={18} style={{ color: COLORS.primary }} />
                      <span className="font-heading text-xs" style={{ color: COLORS.ink }}>📱 영상 파일 올리기 (짧은 클립용)</span>
                      <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                    </label>
                    <input type="url" value={isYouTubeUrl(form.video_url) ? form.video_url : ''} onChange={e => setForm({...form, video_url: e.target.value, videoFile: null, videoPreview: null})}
                      placeholder="▶️ 또는 유튜브 주소 붙여넣기 (긴 영상용)"
                      className="w-full font-body text-sm font-medium border-b py-2 bg-transparent outline-none"
                      style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                  </>
                )}
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>💡 짧은 클립은 파일, 긴 영상은 유튜브를 추천해요</p>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>외부 링크 (선택)</label>
              <input type="url" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})}
                placeholder="https://..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span className="font-body text-xs" style={{ color: COLORS.ink }}>✨ 즉시 공개 (체크 해제 시 숨김)</span>
            </label>

            {!editingId && (
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded" style={{ background: COLORS.cream }}>
                <input type="checkbox" checked={form.sendPush} onChange={e => setForm({...form, sendPush: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span className="font-body text-xs" style={{ color: COLORS.ink }}>📢 푸시 알림 발송</span>
              </label>
            )}

            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '공유하기'}
            </button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>공유된 꿀팁이 없습니다</p>
          </div>
        ) : filtered.map(t => (
          <div key={t.id} onClick={() => startEdit(t)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: t.is_active ? 1 : 0.6 }}>
            {t.image_url && (
              <div className="aspect-video relative">
                <SkeletonImage src={t.image_url} alt={t.title} className="w-full h-full" />
                <span className="absolute top-2 left-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{t.category}</span>
                {!t.is_active && (
                  <span className="absolute top-2 right-2 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>
                )}
              </div>
            )}
            <div className="p-3">
              {!t.image_url && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{t.category}</span>
                  {!t.is_active && <span className="font-mono text-[8px] px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>숨김</span>}
                </div>
              )}
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{t.title}</h4>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{new Date(t.created_at).toLocaleDateString('ko-KR')}</p>
              {t.content && <p className="font-body text-xs mt-1.5 line-clamp-2" style={{ color: COLORS.stone }}>{t.content}</p>}
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: t.is_active ? COLORS.cream : COLORS.primary, color: t.is_active ? COLORS.stone : COLORS.white }}>
                  {t.is_active ? '숨김' : '공개'}
                </button>
                <button onClick={() => startEdit(t)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(t)} className="px-2 py-1.5 rounded-full" style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminNotice({ user, setCurrentPage, setSelectedNotice }) {
  const [notices, setNotices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm, clearForm] = useDraft('notice_form', { 
    title: '', content: '', tag: '안내', urgent: false, sendPush: true,
    image_urls: [], imageFiles: [], imagePreviews: [],
    video_url: '', videoFile: null, videoPreview: null,
  }, ['imageFiles', 'imagePreviews', 'videoFile', 'videoPreview']);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => { 
    load(); 
    loadSubscriberCount();
  }, []);

  const load = async () => {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    setNotices(data || []);
  };

  const loadSubscriberCount = async () => {
    const { count } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });
    setSubscriberCount(count || 0);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setForm({ ...form,
      imageFiles: [...form.imageFiles, ...files],
      imagePreviews: [...form.imagePreviews, ...newPreviews],
    });
  };

  const removeNewImage = (i) => {
    if (form.imagePreviews[i]) URL.revokeObjectURL(form.imagePreviews[i]);
    setForm({ ...form,
      imageFiles: form.imageFiles.filter((_, idx) => idx !== i),
      imagePreviews: form.imagePreviews.filter((_, idx) => idx !== i),
    });
  };

  const removeExistingImage = (i) => {
    setForm({ ...form, image_urls: form.image_urls.filter((_, idx) => idx !== i) });
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      if (!confirm('⚠️ 영상이 100MB가 넘어요.\n업로드가 오래 걸리고 저장공간을 많이 차지해요.\n긴 영상은 유튜브 URL을 추천해요!\n\n그래도 이 파일을 올릴까요?')) return;
    }
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: file, videoPreview: URL.createObjectURL(file), video_url: '' });
  };

  const removeVideo = () => {
    if (form.videoPreview) URL.revokeObjectURL(form.videoPreview);
    setForm({ ...form, videoFile: null, videoPreview: null });
  };

  const uploadNoticeImage = async (file) => {
    const compressed = await compressImage(file, 1600, 0.85);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('notice-images').upload(fileName, compressed);
    if (error) throw error;
    const { data } = supabase.storage.from('notice-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteNoticeImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/notice-images/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('notice-images').remove([pathParts[1]]);
    } catch (e) { console.error('이미지 삭제 에러:', e); }
  };

  const resetForm = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    clearForm();
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (notice) => {
    setForm({
      title: notice.title || '',
      content: notice.content || '',
      tag: notice.tag || '안내',
      urgent: notice.urgent || false,
      sendPush: false,
      image_urls: notice.image_urls && notice.image_urls.length ? notice.image_urls : (notice.image_url ? [notice.image_url] : []),
      imageFiles: [],
      imagePreviews: [],
      video_url: notice.video_url || '',
      videoFile: null,
      videoPreview: null,
    });
    setEditingId(notice.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      // 여러 이미지 업로드 (기존 유지된 것 + 새로 추가된 것)
      let imageUrls = [...form.image_urls];
      if (form.imageFiles.length > 0) {
        setUploading(true);
        for (const file of form.imageFiles) {
          const url = await uploadNoticeImage(file);
          imageUrls.push(url);
        }
        setUploading(false);
      }

      // 🎥 영상 처리 (유튜브 URL 또는 파일 업로드)
      let videoUrl = form.video_url;
      if (form.videoFile) {
        setUploading(true);
        if (editingId && form.video_url && !isYouTubeUrl(form.video_url)) await deletePostVideo(form.video_url);
        videoUrl = await uploadPostVideo(form.videoFile);
        setUploading(false);
      }

      const noticeData = {
        title: form.title,
        content: form.content,
        tag: form.tag,
        urgent: form.urgent,
        image_urls: imageUrls,
        image_url: imageUrls[0] || null,
        video_url: videoUrl || null,
      };

      if (editingId) {
        const { error } = await supabase.from('notices').update(noticeData).eq('id', editingId);
        if (error) throw error;
        alert('✏️ 공지 수정 완료!');
      } else {
        noticeData.author_id = user.id;
        const { error: insertError } = await supabase.from('notices').insert(noticeData);
        if (insertError) throw insertError;

        await notifyAdminsOfStaffActivity(user, `공지 등록: ${form.title}`, form.content?.substring(0, 60) || '');

        if (form.sendPush && subscriberCount > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: `${form.urgent ? '🔴 ' : ''}[${form.tag}] ${form.title}`,
                body: form.content.substring(0, 100) || '새 공지가 등록되었습니다',
                url: '/',
                targetRole: 'student',
                excludeUserId: user.id,
              }),
            }
          );
          const result = await response.json();
          if (result.sent > 0) {
            alert(`✅ 공지 등록 완료!\n📢 ${result.sent}명에게 알림 전송됨`);
          } else {
            alert('공지 등록 완료! (알림 전송 실패 또는 구독자 없음)');
          }
        } else {
          alert('공지 등록 완료!');
        }
      }

      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (id, e) => {
    e?.stopPropagation();
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const notice = notices.find(n => n.id === id);
    const imgs = notice?.image_urls && notice.image_urls.length ? notice.image_urls : (notice?.image_url ? [notice.image_url] : []);
    for (const u of imgs) await deleteNoticeImage(u);
    if (notice?.video_url) await deletePostVideo(notice.video_url);
    await supabase.from('notices').delete().eq('id', id);
    await load();
  };

  return (
    <>
      <PageIntro ko="학원공지 관리" en="Notice Admin" />
      <div className="px-5 space-y-3">
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 공지
          </button>
        )}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '공지 수정' : '새 공지'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            <select value={form.tag} onChange={e => setForm({...form, tag: e.target.value})}
              className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
              <option>필독</option><option>안내</option><option>이벤트</option>
            </select>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="공지 제목" className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="공지 내용" rows={10} className="w-full font-body text-sm font-medium p-3 outline-none resize-none rounded leading-relaxed" style={{ background: COLORS.cream, color: COLORS.ink }} />

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>이미지 (선택, 여러 장 가능)</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {form.image_urls.map((url, i) => (
                  <div key={`ex-${i}`} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={12} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ))}
                {form.imagePreviews.map((url, i) => (
                  <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeNewImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={12} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                  <Upload size={20} style={{ color: COLORS.stone }} />
                  <span className="font-mono text-[9px] mt-1" style={{ color: COLORS.stone }}>추가</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>💡 여러 장 선택 가능 (탭해서 계속 추가)</p>
            </div>

            {/* 🎥 동영상 (선택) - 파일 업로드 또는 유튜브 URL */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>동영상 (선택)</label>
              <div className="mt-2 space-y-2">
                {form.videoPreview ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.videoPreview} controls className="w-full max-h-64" />
                    <button onClick={removeVideo} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.video_url && !isYouTubeUrl(form.video_url) ? (
                  <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#000' }}>
                    <video src={form.video_url} controls className="w-full max-h-64" />
                    <button onClick={() => setForm({ ...form, video_url: '' })} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 파일 업로드 버튼 */}
                    <label className="w-full rounded-xl flex items-center justify-center gap-2 cursor-pointer py-3" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                      <Upload size={18} style={{ color: COLORS.primary }} />
                      <span className="font-heading text-xs" style={{ color: COLORS.ink }}>📱 영상 파일 올리기 (짧은 클립용)</span>
                      <input type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
                    </label>
                    {/* 유튜브 URL */}
                    <input type="url" value={isYouTubeUrl(form.video_url) ? form.video_url : ''} onChange={e => setForm({...form, video_url: e.target.value, videoFile: null, videoPreview: null})}
                      placeholder="▶️ 또는 유튜브 주소 붙여넣기 (긴 영상용)"
                      className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
                  </>
                )}
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>💡 짧은 클립은 파일, 긴 영상은 유튜브를 추천해요</p>
              </div>
            </div>

            <label className="flex items-center gap-2 font-body text-xs" style={{ color: COLORS.stone }}>
              <input type="checkbox" checked={form.urgent} onChange={e => setForm({...form, urgent: e.target.checked})} />
              긴급 공지로 표시
            </label>

            {!editingId && (
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: COLORS.cream }}>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input type="checkbox" checked={form.sendPush}
                    onChange={e => setForm({...form, sendPush: e.target.checked})}
                    className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                  <div>
                    <p className="font-heading text-xs flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                      <Bell size={11} strokeWidth={2.5} />
                      푸시 알림 전송
                    </p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                      {subscriberCount > 0 ? `${subscriberCount}명의 구독자에게 알림 발송` : '아직 구독자가 없습니다'}
                    </p>
                  </div>
                </label>
              </div>
            )}

            <button onClick={submit} disabled={loading || uploading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={12} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '발행'}
            </button>
          </div>
        )}
        {notices.map(n => (
          <div key={n.id} onClick={() => startEdit(n)}
            className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {n.image_url && (
              <div className="aspect-video relative overflow-hidden">
                <SkeletonImage src={n.image_url} alt={n.title} className="w-full h-full" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                  background: n.urgent ? COLORS.primary : COLORS.peach,
                  color: n.urgent ? COLORS.white : COLORS.deep
                }}>{n.tag}</span>
                <div onClick={e => e.stopPropagation()} className="flex gap-1">
                  <button onClick={() => startEdit(n)} className="p-1.5 rounded-full" style={{ background: COLORS.cardElev }}>
                    <Edit3 size={11} style={{ color: COLORS.white }} />
                  </button>
                  <button onClick={(e) => remove(n.id, e)} className="p-1.5 rounded-full" style={{ background: COLORS.cream }}>
                    <Trash2 size={12} style={{ color: COLORS.deep }} />
                  </button>
                </div>
              </div>
              <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{n.title}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
                <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.primary }}>
                  탭해서 수정 <Edit3 size={10} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 📊 AdminOrders - 결제 내역 관리 페이지
// =============================================================
function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles:user_id(name, email, phone, avatar_color, course)')
      .order('created_at', { ascending: false });
    if (error) console.error('orders load error:', error);
    setOrders(data || []);
    setLoading(false);
  };

  const moveMonth = (delta) => {
    setSelectedMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  };

  // 선택된 월의 시작/끝
  const monthStart = new Date(selectedMonth.year, selectedMonth.month, 1);
  const monthEnd = new Date(selectedMonth.year, selectedMonth.month + 1, 1);

  const paidOrders = orders.filter(o => o.status === 'paid');
  
  // 선택 월의 주문
  const monthAllOrders = orders.filter(o => {
    const orderDate = new Date(o.paid_at || o.created_at);
    return orderDate >= monthStart && orderDate < monthEnd;
  });
  const monthPaidOrders = monthAllOrders.filter(o => o.status === 'paid');
  const monthCancelledOrders = monthAllOrders.filter(o => o.status === 'cancelled');
  const monthRevenue = monthPaidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  // 이번 달인지 체크 (미래 월 못 가게)
  const now = new Date();
  const isCurrentMonth = selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();

  // 누적 통계 (전체 기간)
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  // 현재 필터 적용 (선택 월 내에서)
  const filtered = filter === 'all' ? monthAllOrders 
                  : filter === 'paid' ? monthPaidOrders 
                  : monthCancelledOrders;

  const formatPrice = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';

  return (
    <>
      <PageIntro ko="결제 내역" en="Orders" desc="월별 매출을 한눈에" />
      
      <div className="px-5 space-y-3">
        {/* 🗓️ 월 선택 네비게이션 */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <button onClick={() => moveMonth(-1)} 
            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90" 
            style={{ background: COLORS.cardElev }}>
            <ChevronLeft size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>
              {isCurrentMonth ? '━━ THIS MONTH' : '━━ SELECTED'}
            </p>
            <p className="font-display text-lg mt-0.5 tracking-tight" style={{ color: COLORS.ink }}>
              {selectedMonth.year}년 {selectedMonth.month + 1}월
            </p>
          </div>
          <button onClick={() => moveMonth(1)} disabled={isCurrentMonth}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 transition-all active:scale-90"
            style={{ background: COLORS.cardElev }}>
            <ChevronRight size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
        </div>

        {/* 💰 선택 월 매출 - 강조 카드 */}
        <div className="rounded-2xl p-5 glow-primary" style={{ background: COLORS.primary }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.white, opacity: 0.8 }}>
            {selectedMonth.year}년 {selectedMonth.month + 1}월 매출
          </p>
          <p className="font-display text-3xl mt-2 tracking-tight" style={{ color: COLORS.white }}>
            {formatPrice(monthRevenue)}
          </p>
          <p className="font-serif-italic text-sm mt-1" style={{ color: COLORS.white, opacity: 0.85 }}>{monthPaidOrders.length}건 결제됨</p>
        </div>

        {/* 누적 통계 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>누적 매출</p>
            <p className="font-display text-xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{formatPrice(totalRevenue)}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>전체 완료/취소</p>
            <p className="font-display text-xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>
              {paidOrders.length} <span style={{ color: COLORS.stone, fontSize: '14px' }}>/ {cancelledCount}</span>
            </p>
          </div>
        </div>

        {/* 필터 (선택 월 내에서) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id: 'all', label: `전체 ${monthAllOrders.length}` },
            { id: 'paid', label: `완료 ${monthPaidOrders.length}` },
            { id: 'cancelled', label: `취소 ${monthCancelledOrders.length}` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="font-heading text-xs px-4 py-2 rounded-full whitespace-nowrap transition-transform active:scale-95"
              style={{
                background: filter === f.id ? COLORS.primary : COLORS.card,
                color: filter === f.id ? COLORS.white : COLORS.stone,
                border: filter === f.id ? 'none' : `1px solid ${COLORS.light}`,
                boxShadow: filter === f.id ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>{f.label}</button>
          ))}
        </div>

        {/* 결제 목록 - 선택 월만 표시 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {selectedMonth.year}년 {selectedMonth.month + 1}월에는 결제 내역이 없습니다
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>← → 화살표로 다른 월을 확인해보세요</p>
          </div>
        ) : filtered.map(o => (
          <div key={o.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {/* 상단: 학생 + 금액 */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar user={o.profiles || { name: o.buyer_name }} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{o.profiles?.name || o.buyer_name || '익명'}</p>
                  <p className="font-mono text-[10px] truncate" style={{ color: COLORS.stone }}>{o.profiles?.email || o.buyer_email || ''}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-lg tracking-tight" style={{ 
                  color: o.status === 'paid' ? COLORS.primary : COLORS.stone, 
                  textDecoration: o.status === 'cancelled' ? 'line-through' : 'none' 
                }}>
                  {formatPrice(o.amount)}
                </p>
                <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{
                  background: o.status === 'paid' ? COLORS.primary : COLORS.cream,
                  color: o.status === 'paid' ? COLORS.white : COLORS.stone,
                  border: o.status === 'cancelled' ? `1px solid ${COLORS.muted}` : 'none'
                }}>{o.status === 'paid' ? '완료' : '취소'}</span>
              </div>
            </div>

            {/* 상품 정보 */}
            <div className="rounded-lg p-3" style={{ background: COLORS.cream }}>
              <div className="flex items-center gap-2">
                {o.item_type === 'product' ? (
                  <ShoppingBag size={14} style={{ color: COLORS.primary }} />
                ) : (
                  <BookOpen size={14} style={{ color: COLORS.primary }} />
                )}
                <p className="font-body text-sm flex-1 min-w-0 truncate" style={{ color: COLORS.ink }}>{o.course_title || '상품'}</p>
                <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded shrink-0" style={{ background: COLORS.peach, color: COLORS.deep }}>
                  {o.item_type === 'product' ? '재료샵' : '클래스'}
                </span>
              </div>
            </div>

            {/* 결제 정보 */}
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <div>
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
                  💳 {o.payment_method || '카드'}{o.card_company ? ` · ${o.card_company}` : ''}
                </p>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                  🕐 {new Date(o.paid_at || o.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {o.receipt_url && (
                <a href={o.receipt_url} target="_blank" rel="noopener noreferrer"
                  className="font-heading text-[10px] px-3 py-1.5 rounded-full shrink-0"
                  style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                  영수증 →
                </a>
              )}
            </div>

            {/* 취소 사유 */}
            {o.status === 'cancelled' && o.cancel_reason && (
              <div className="mt-2 p-2 rounded" style={{ background: COLORS.cream }}>
                <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>취소 사유</p>
                <p className="font-body text-xs mt-0.5" style={{ color: COLORS.ink }}>{o.cancel_reason}</p>
              </div>
            )}

            {/* 연락처 */}
            {(o.profiles?.phone || o.buyer_phone) && (
              <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>📞 {o.profiles?.phone || o.buyer_phone}</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 📦 AdminOrdersPage - 주문/배송 관리 (admin + staff)
//   admin: 매출·카드·영수증까지 표시
//   staff: 배송 정보·발송 처리만 표시
// =============================================================
function AdminOrdersPage({ user, setCurrentPage }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('product-pending');

  const [shippingModal, setShippingModal] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCompany, setTrackingCompany] = useState('');
  const [shipping, setShipping] = useState(false);

  const isRealAdmin = user?.role === 'admin';

  useEffect(() => { loadOrders(); }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false });

    if (filter === 'product-pending') {
      query = query.eq('item_type', 'product').eq('shipping_status', 'pending');
    } else if (filter === 'product-shipped') {
      query = query.eq('item_type', 'product').eq('shipping_status', 'shipped');
    } else if (filter === 'course') {
      query = query.eq('item_type', 'course');
    } else if (!isRealAdmin) {
      // staff는 'all' 필터에서도 클래스 주문 제외 (배송만 신경)
      query = query.eq('item_type', 'product');
    }

    const { data, error } = await query;
    if (error) console.error('주문 로드 에러:', error);
    setOrders(data || []);
    setLoading(false);
  };

  const openShippingModal = (order) => {
    setShippingModal(order);
    setTrackingNumber('');
    setTrackingCompany('');
  };

  const closeShippingModal = () => {
    setShippingModal(null);
    setTrackingNumber('');
    setTrackingCompany('');
  };

  const handleShip = async () => {
    if (!shippingModal) return;
    if (!trackingNumber.trim()) {
      alert('운송장 번호를 입력해주세요.');
      return;
    }
    setShipping(true);
    const { error } = await supabase.from('orders').update({
      shipping_status: 'shipped',
      shipped_at: new Date().toISOString(),
      shipped_by: user.id,
      tracking_number: trackingNumber.trim(),
      tracking_company: trackingCompany.trim() || null,
    }).eq('order_id', shippingModal.order_id);
    setShipping(false);

    if (error) {
      alert('발송 처리 실패: ' + error.message);
      return;
    }

    closeShippingModal();
    await loadOrders();
    alert('✅ 발송 처리 완료');
  };

  const formatPrice = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  const filters = [
    { id: 'product-pending', label: '배송 대기' },
    { id: 'product-shipped', label: '발송 완료' },
    ...(isRealAdmin ? [{ id: 'course', label: '클래스' }] : []),
    { id: 'all', label: '전체' },
  ];

  return (
    <>
      <PageIntro ko="주문 관리" en="Orders" desc={isRealAdmin ? '결제 내역과 배송 상태를 관리해요' : '재료 배송을 처리해요'} />

      {/* 필터 탭 */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95 ${filter === f.id ? 'glow-soft' : ''}`}
              style={{
                background: filter === f.id ? COLORS.primary : COLORS.card,
                color: filter === f.id ? COLORS.white : COLORS.stone,
                border: `1px solid ${filter === f.id ? COLORS.primary : COLORS.light}`,
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 카운트 */}
      <div className="px-5 mb-4">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>총 {orders.length}건</p>
      </div>

      {/* 목록 */}
      <div className="px-5 space-y-3 pb-6">
        {loading ? (
          <div className="text-center py-10">
            <Loader2 size={20} className="animate-spin mx-auto" style={{ color: COLORS.primary }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10">
            <Package size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>해당 조건의 주문이 없어요</p>
          </div>
        ) : orders.map(o => {
          const isProduct = o.item_type === 'product';
          const isShipped = o.shipping_status === 'shipped';
          const isDelivered = o.shipping_status === 'delivered';
          return (
            <div key={o.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {/* 헤더: 타입 + 발송 상태 */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded inline-flex items-center gap-1"
                  style={{ background: COLORS.peach, color: COLORS.deep }}>
                  {isProduct ? <><Package size={10} />재료</> : <><BookOpen size={10} />클래스</>}
                </span>
                {isProduct && (
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                    style={{
                      background: isShipped || isDelivered ? COLORS.primary : COLORS.cardElev,
                      color: isShipped || isDelivered ? COLORS.white : COLORS.stone,
                    }}>
                    {isDelivered ? '배송 완료' : isShipped ? '발송 완료' : '배송 대기'}
                  </span>
                )}
              </div>

              {/* 상품명 + 주문번호 */}
              <div className="mb-3">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{o.course_title || '-'}</p>
                <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.muted }}>
                  주문 {o.order_id?.substring(0, 20)}...
                </p>
              </div>

              {/* 구매자 정보 */}
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: COLORS.cream }}>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>구매자</span>
                  <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.buyer_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>연락처</span>
                  <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.buyer_phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>결제일</span>
                  <span className="font-mono text-[10px]" style={{ color: COLORS.ink }}>{formatDate(o.paid_at || o.created_at)}</span>
                </div>
              </div>

              {/* 결제 정보 (admin만) */}
              {isRealAdmin && (
                <div className="rounded-lg p-3 mt-2 space-y-1.5" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                  <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 결제 정보</p>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>금액</span>
                    <span className="font-body text-sm font-bold" style={{ color: COLORS.primary }}>{formatPrice(o.amount)}</span>
                  </div>
                  {(o.payment_method || o.card_company) && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>결제수단</span>
                      <span className="font-body text-xs" style={{ color: COLORS.ink }}>
                        {o.payment_method || '카드'}{o.card_company ? ` · ${o.card_company}` : ''}
                      </span>
                    </div>
                  )}
                  {o.receipt_url && (
                    <div className="pt-1">
                      <a href={o.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="font-heading text-[10px] px-3 py-1.5 rounded-full inline-block"
                        style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                        영수증 →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* 배송 정보 (재료) */}
              {isProduct && (
                <div className="rounded-lg p-3 mt-2 space-y-1.5" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                  <p className="font-mono text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1" style={{ color: COLORS.primary }}>
                    <Package size={10} />━━ 배송 정보
                  </p>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>받는분</span>
                    <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.shipping_recipient_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>연락처</span>
                    <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.shipping_recipient_phone || '-'}</span>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] mb-0.5" style={{ color: COLORS.stone }}>주소</p>
                    <p className="font-body text-xs" style={{ color: COLORS.ink }}>
                      {o.shipping_postal_code ? `(${o.shipping_postal_code}) ` : ''}{o.shipping_address || '-'}
                    </p>
                    {o.shipping_address_detail && (
                      <p className="font-body text-xs" style={{ color: COLORS.ink }}>{o.shipping_address_detail}</p>
                    )}
                  </div>
                  {o.shipping_memo && (
                    <div>
                      <p className="font-mono text-[10px] mb-0.5" style={{ color: COLORS.stone }}>배송 메모</p>
                      <p className="font-body text-xs" style={{ color: COLORS.ink, whiteSpace: 'pre-wrap' }}>{o.shipping_memo}</p>
                    </div>
                  )}

                  {/* 발송 정보 표시 (shipped/delivered) */}
                  {(isShipped || isDelivered) && (
                    <div className="pt-2 mt-2 space-y-1" style={{ borderTop: `1px solid ${COLORS.light}` }}>
                      <p className="font-mono text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1" style={{ color: COLORS.primary }}>
                        <Truck size={10} />━━ 발송 정보
                      </p>
                      {o.tracking_company && (
                        <div className="flex justify-between">
                          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>택배사</span>
                          <span className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{o.tracking_company}</span>
                        </div>
                      )}
                      {o.tracking_number && (
                        <div className="flex justify-between">
                          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>운송장</span>
                          <span className="font-mono text-xs" style={{ color: COLORS.ink }}>{o.tracking_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>발송일</span>
                        <span className="font-mono text-[10px]" style={{ color: COLORS.ink }}>{formatDate(o.shipped_at)}</span>
                      </div>
                    </div>
                  )}

                  {/* 발송 처리 버튼 (pending) */}
                  {o.shipping_status === 'pending' && (
                    <button onClick={() => openShippingModal(o)}
                      className="w-full mt-2 rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
                      style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
                      <Package size={14} strokeWidth={2.5} />발송 처리하기
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 발송 처리 모달 */}
      {shippingModal && (
        <div onClick={closeShippingModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()}
            className="animate-slide-up w-full"
            style={{ maxWidth: 480, background: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>발송 처리</h3>
              <button onClick={closeShippingModal}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.cardElev }}>
              <p className="font-body text-xs" style={{ color: COLORS.ink }}>{shippingModal.course_title}</p>
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>
                받는분: {shippingModal.shipping_recipient_name || '-'} · {shippingModal.shipping_recipient_phone || '-'}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>택배사 (선택)</label>
                <input type="text" value={trackingCompany} onChange={(e) => setTrackingCompany(e.target.value)}
                  placeholder="예: CJ대한통운 / 롯데택배 / 한진택배"
                  className="w-full font-body text-sm p-3 mt-1 outline-none rounded"
                  style={{ background: COLORS.cream, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>운송장 번호 *</label>
                <input type="text" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="운송장 번호 입력"
                  className="w-full font-body text-sm p-3 mt-1 outline-none rounded"
                  style={{ background: COLORS.cream, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={closeShippingModal} disabled={shipping}
                className="flex-1 rounded-full py-3 font-heading text-sm"
                style={{ background: COLORS.cardElev, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                취소
              </button>
              <button onClick={handleShip} disabled={shipping}
                className="flex-1 rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2"
                style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
                {shipping ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
                발송 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =============================================================
// 🔐 AdminApprovals - 가입 승인 관리 페이지
// =============================================================
function AdminApprovals({ user }) {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setAllUsers(data || []);
    setLoading(false);
  };

  const approve = async (userId, asGraduate = false) => {
    const msg = asGraduate 
      ? '🎓 졸업생으로 승인하시겠습니까?\n온보딩 미션이 면제됩니다.' 
      : '이 회원을 일반 학생으로 승인하시겠습니까?\n온보딩 미션을 받게 됩니다.';
    if (!confirm(msg)) return;
    
    const updates = {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejected_reason: null,
      is_graduate: asGraduate,
    };
    
    if (asGraduate) {
      // 졸업생 승인 = 영상 미션만 면제 (인사/후기는 작성해야 함)
      updates.onb_video = true;
      // onb_greeting, onb_review는 false 유지 (작성 필수)
    }
    
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) {
      alert('승인 실패: ' + error.message);
    } else {
      await load();
    }
  };

  const reject = async (userId) => {
    const reason = prompt('거절 사유를 입력하세요 (선택, 빈칸 가능):');
    if (reason === null) return;
    const { error } = await supabase.from('profiles').update({
      status: 'rejected',
      rejected_reason: reason || null,
    }).eq('id', userId);
    if (error) {
      alert('거절 실패: ' + error.message);
    } else {
      await load();
    }
  };

  const revoke = async (userId) => {
    if (!confirm('이 회원의 승인을 취소하시겠습니까?\n승인 대기 상태로 돌아갑니다.')) return;
    await supabase.from('profiles').update({ status: 'pending' }).eq('id', userId);
    await load();
  };

  const filtered = allUsers.filter(u => u.status === filter);
  const counts = {
    pending: allUsers.filter(u => u.status === 'pending').length,
    approved: allUsers.filter(u => u.status === 'approved').length,
    rejected: allUsers.filter(u => u.status === 'rejected').length,
  };

  return (
    <>
      <PageIntro ko="가입 승인" en="Approvals" desc="신규 회원을 검토하세요" />
      
      <div className="px-5 space-y-3">
        {/* 통계 + 필터 */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setFilter('pending')} 
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${filter === 'pending' ? 'glow-primary' : ''}`}
            style={{ background: filter === 'pending' ? COLORS.primary : COLORS.card, border: filter === 'pending' ? 'none' : `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: filter === 'pending' ? COLORS.white : COLORS.stone }}>대기</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: filter === 'pending' ? COLORS.white : COLORS.ink }}>{counts.pending}</p>
          </button>
          <button onClick={() => setFilter('approved')}
            className="rounded-2xl p-3 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${filter === 'approved' ? COLORS.primary : COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>승인</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{counts.approved}</p>
          </button>
          <button onClick={() => setFilter('rejected')}
            className="rounded-2xl p-3 text-left transition-transform active:scale-95"
            style={{ background: COLORS.card, border: `1px solid ${filter === 'rejected' ? COLORS.primary : COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>거절</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{counts.rejected}</p>
          </button>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <UserCheck size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === 'pending' ? '대기 중인 가입 신청이 없습니다' : filter === 'approved' ? '승인된 회원이 없습니다' : '거절된 회원이 없습니다'}
            </p>
          </div>
        ) : filtered.map(u => (
          <div key={u.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-start gap-3">
              <Avatar user={u} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{u.name}</p>
                  {u.role === 'admin' && (
                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>ADMIN</span>
                  )}
                </div>
                <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{u.email}</p>
                {u.phone && <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>📞 {u.phone}</p>}
                <p className="font-serif-italic text-xs mt-1" style={{ color: COLORS.primary }}>{u.course}</p>
                <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>가입: {new Date(u.created_at).toLocaleDateString('ko-KR')}</p>
                
                {/* 🎓 졸업생 신청 표시 */}
                {u.is_graduate && u.status === 'pending' && (
                  <div className="mt-2 p-2 rounded flex items-center gap-2" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid ${COLORS.primary}` }}>
                    <span className="text-base">🎓</span>
                    <p className="font-body text-xs font-semibold" style={{ color: COLORS.primary }}>
                      졸업생이라고 신청했어요!<br/>
                      <span className="font-mono text-[10px] font-normal" style={{ color: COLORS.deep }}>맞으면 "졸업생 승인" 눌러주세요</span>
                    </p>
                  </div>
                )}
                
                {/* 졸업생 표시 (승인 후) */}
                {u.is_graduate && u.status === 'approved' && (
                  <div className="mt-2 p-2 rounded flex items-center gap-2" style={{ background: 'rgba(255,92,31,0.08)' }}>
                    <span className="text-sm">🎓</span>
                    <p className="font-mono text-[10px] font-bold" style={{ color: COLORS.primary }}>졸업생 (미션 면제)</p>
                  </div>
                )}
                
                {u.rejected_reason && (
                  <div className="mt-2 p-2 rounded" style={{ background: COLORS.cream }}>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>거절 사유</p>
                    <p className="font-body text-xs mt-0.5" style={{ color: COLORS.ink }}>{u.rejected_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex flex-col gap-2 mt-3">
              {u.status === 'pending' && (
                <>
                  <div className="flex gap-2">
                    <button onClick={() => approve(u.id, false)}
                      className="flex-1 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1"
                      style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.4)' }}>
                      <Check size={12} strokeWidth={3} />일반 승인
                    </button>
                    <button onClick={() => reject(u.id)}
                      className="flex-1 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1"
                      style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
                      <X size={12} strokeWidth={3} />거절
                    </button>
                  </div>
                  {/* 졸업생 승인 (별도 버튼) */}
                  <button onClick={() => approve(u.id, true)}
                    className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
                    style={{ background: COLORS.cardElev, color: COLORS.primary, border: `1px solid ${COLORS.primary}` }}>
                    🎓 졸업생으로 승인 (미션 면제)
                  </button>
                </>
              )}
              {u.status === 'approved' && u.role !== 'admin' && (
                <button onClick={() => revoke(u.id)}
                  className="flex-1 font-heading text-xs py-2 rounded-full"
                  style={{ background: COLORS.cream, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                  승인 취소
                </button>
              )}
              {u.status === 'rejected' && (
                <button onClick={() => approve(u.id)}
                  className="flex-1 font-heading text-xs py-2 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Check size={12} strokeWidth={3} />다시 승인
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 👤 AdminStudentDetail - 수강생 상세 정보 페이지 (관리자용)
// =============================================================
function AdminStudentDetail({ student, setCurrentPage, canViewRevenue }) {
  const [cases, setCases] = useState([]);
  const [posts, setPosts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const toggleSuspend = async () => {
    const isSuspended = student.status === 'suspended';
    const msg = isSuspended
      ? `${student.name}님의 정지를 해제하시겠습니까?`
      : `${student.name}님의 계정을 정지하시겠습니까?\n\n정지된 사용자는 로그인 시 정지 화면이 표시되어 앱을 사용할 수 없어요.`;
    
    if (!confirm(msg)) return;
    
    let reason = null;
    if (!isSuspended) {
      reason = prompt('정지 사유 (선택사항, 사용자에게 표시됨)');
      if (reason === null) return;
    }
    
    setUpdating(true);
    const { error } = await supabase.from('profiles').update({
      status: isSuspended ? 'approved' : 'suspended',
      suspended_reason: isSuspended ? null : (reason || null)
    }).eq('id', student.id);
    
    if (error) {
      alert('변경 실패: ' + error.message);
    } else {
      alert(isSuspended ? '✅ 정지가 해제되었습니다' : '⚠️ 계정이 정지되었습니다');
      setCurrentPage('admin-students');
    }
    setUpdating(false);
  };

  const toggleStaff = async () => {
    const newRole = student.role === 'staff' ? 'student' : 'staff';
    const msg = newRole === 'staff' 
      ? `${student.name}님을 운영진으로 임명하시겠습니까?\n\n운영진은 매출을 제외한 모든 관리 기능을 사용할 수 있어요.`
      : `${student.name}님의 운영진 권한을 해제하시겠습니까?\n\n다시 일반 수강생으로 돌아갑니다.`;
    
    if (!confirm(msg)) return;
    setUpdating(true);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', student.id);
    if (error) {
      alert('변경 실패: ' + error.message);
    } else {
      // 📢 임명된 본인에게 알림
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newRole === 'staff' ? '🎉 운영진으로 임명되었어요!' : '운영진 권한이 해제되었어요',
            body: newRole === 'staff' 
              ? '이제 관리자 메뉴를 사용할 수 있어요. 환영합니다!' 
              : '일반 수강생으로 돌아갔어요.',
            url: '/',
            targetUserId: student.id,
          }),
        });
      } catch (e) { console.error('알림 발송 실패:', e); }

      alert(newRole === 'staff' ? '✅ 운영진으로 임명되었습니다' : '✅ 운영진 권한이 해제되었습니다');
      setCurrentPage('admin-students');
    }
    setUpdating(false);
  };

  useEffect(() => {
    if (!student?.id) return;
    const load = async () => {
      const [c, p, o] = await Promise.all([
        supabase.from('cases').select('*').eq('user_id', student.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('community_posts').select('*').eq('user_id', student.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('*').eq('user_id', student.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setCases(c.data || []);
      setPosts(p.data || []);
      setOrders(o.data || []);
      setLoading(false);
    };
    load();
  }, [student?.id]);

  if (!student) return (
    <div className="px-5 py-10 text-center">
      <p className="font-body text-sm" style={{ color: COLORS.stone }}>학생을 찾을 수 없습니다</p>
      <button onClick={() => setCurrentPage('admin-students')} className="mt-4 font-heading text-xs px-4 py-2 rounded-full" style={{ background: COLORS.primary, color: COLORS.white }}>
        수강생 목록으로
      </button>
    </div>
  );

  const formatPrice = (n) => Number(n || 0).toLocaleString('ko-KR') + '원';
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  return (
    <div className="pb-6">
      <PageIntro ko={student.name} en="Student Detail" desc={student.course} />
      
      <div className="px-5 space-y-3">
        {/* 기본 정보 */}
        <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: COLORS.cardElev }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, ${COLORS.primary}50, transparent 70%)` }}></div>
          <div className="relative flex items-center gap-4">
            <Avatar user={student} size="xxl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.white }}>{student.name}</h2>
                {student.status === 'pending' && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>승인 대기</span>}
                {student.status === 'rejected' && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>거절됨</span>}
              </div>
              <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.ink, opacity: 0.7 }}>{student.email}</p>
              <p className="font-serif-italic text-sm mt-2" style={{ color: COLORS.primary }}>{student.course}</p>
            </div>
          </div>
        </div>

        {/* 🛡️ 운영진 임명/해제 (admin만 가능) */}
        {canViewRevenue && student.role !== 'admin' && (
          <div className="rounded-2xl p-4" style={{ 
            background: COLORS.card, 
            border: `1px solid ${student.role === 'staff' ? COLORS.primary : COLORS.light}`,
            boxShadow: student.role === 'staff' ? '0 0 16px rgba(255, 92, 31, 0.2)' : 'none'
          }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Staff Role</p>
                {student.role === 'staff' ? (
                  <>
                    <p className="font-heading text-sm mt-1 flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                      <Shield size={14} style={{ color: COLORS.primary }} strokeWidth={2.5} />
                      현재 운영진이에요
                    </p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>매출 외 모든 관리 기능 사용 가능</p>
                  </>
                ) : (
                  <>
                    <p className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>운영진으로 임명할까요?</p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>매출 외 모든 관리 기능 사용 가능</p>
                  </>
                )}
              </div>
              <button onClick={toggleStaff} disabled={updating}
                className="font-heading text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                style={{
                  background: student.role === 'staff' ? COLORS.cream : COLORS.primary,
                  color: student.role === 'staff' ? COLORS.deep : COLORS.white,
                  border: student.role === 'staff' ? `1px solid ${COLORS.light}` : 'none',
                  boxShadow: student.role === 'staff' ? 'none' : '0 0 16px rgba(255, 92, 31, 0.4)'
                }}>
                {updating ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} strokeWidth={2.5} />}
                {student.role === 'staff' ? '해제' : '임명'}
              </button>
            </div>
          </div>
        )}

        {/* 🚨 계정 정지/해제 (admin만 가능) */}
        {canViewRevenue && student.role !== 'admin' && (
          <div className="rounded-2xl p-4" style={{ 
            background: COLORS.card, 
            border: `1px solid ${student.status === 'suspended' ? '#FF4444' : COLORS.light}`,
            boxShadow: student.status === 'suspended' ? '0 0 16px rgba(255, 68, 68, 0.2)' : 'none'
          }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: student.status === 'suspended' ? '#FF4444' : COLORS.stone }}>━━ Account Status</p>
                {student.status === 'suspended' ? (
                  <>
                    <p className="font-heading text-sm mt-1 flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                      <AlertCircle size={14} style={{ color: '#FF4444' }} strokeWidth={2.5} />
                      현재 정지됨
                    </p>
                    {student.suspended_reason && (
                      <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>사유: {student.suspended_reason}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>문제 발생 시 계정 정지</p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>정지된 사용자는 로그인 불가</p>
                  </>
                )}
              </div>
              <button onClick={toggleSuspend} disabled={updating}
                className="font-heading text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                style={{
                  background: student.status === 'suspended' ? COLORS.cream : '#FF4444',
                  color: student.status === 'suspended' ? COLORS.deep : COLORS.white,
                  border: student.status === 'suspended' ? `1px solid ${COLORS.light}` : 'none',
                }}>
                {updating ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} strokeWidth={2.5} />}
                {student.status === 'suspended' ? '해제' : '정지'}
              </button>
            </div>
          </div>
        )}

        {/* 등급 카드 (재사용) */}
        <LevelCard userId={student.id} hideRevenue={!canViewRevenue} />

        {/* 계정 정보 */}
        <section className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase p-4 pb-2" style={{ color: COLORS.primary }}>━━ Account Info</p>
          {[
            { label: 'Email', value: student.email },
            { label: 'Phone', value: student.phone || '미등록' },
            { label: 'Joined', value: new Date(student.created_at).toLocaleDateString('ko-KR') },
            { label: 'Status', value: student.status === 'approved' ? '✅ 승인됨' : student.status === 'pending' ? '⏳ 대기' : '❌ 거절' },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>{row.label}</span>
              <span className="font-body text-xs font-semibold truncate ml-2" style={{ color: COLORS.ink }}>{row.value}</span>
            </div>
          ))}
        </section>

        {/* 최근 결제 (admin만) */}
        {canViewRevenue && orders.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Recent Orders</p>
              <p className="font-mono text-[10px] font-bold" style={{ color: COLORS.primary }}>총 {formatPrice(totalSpent)}</p>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {orders.map((o, i) => (
                <div key={o.id} className="flex items-center justify-between p-3" style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none' }}>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-body text-xs truncate" style={{ color: COLORS.ink }}>{o.course_title}</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                      {o.item_type === 'product' ? '🛍️ 재료샵' : '📚 클래스'} · {new Date(o.paid_at || o.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display text-sm tracking-tight" style={{ 
                      color: o.status === 'paid' ? COLORS.primary : COLORS.stone,
                      textDecoration: o.status === 'cancelled' ? 'line-through' : 'none' 
                    }}>{formatPrice(o.amount)}</p>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>{o.status === 'paid' ? '완료' : '취소'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 최근 케이스 */}
        {cases.length > 0 && (
          <section>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ Portfolio ({cases.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {cases.slice(0, 6).map(c => (
                <div key={c.id} className="aspect-square rounded-xl overflow-hidden relative" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                  {c.image_urls?.length > 0 ? (
                    <SkeletonImage src={c.image_urls[0]} alt={c.title} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={20} style={{ color: COLORS.stone }} />
                    </div>
                  )}
                  {c.is_best && (
                    <span className="absolute top-1 right-1 font-mono text-[8px] font-bold tracking-widest uppercase px-1 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>★</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 최근 게시글 */}
        {posts.length > 0 && (
          <section>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2 px-1" style={{ color: COLORS.primary }}>━━ Recent Posts ({posts.length})</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {posts.slice(0, 3).map((p, i) => (
                <div key={p.id} className="p-3" style={{ borderTop: i !== 0 ? `1px solid ${COLORS.light}` : 'none' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{p.category || '자유'}</span>
                    <p className="font-mono text-[9px]" style={{ color: COLORS.stone }}>{new Date(p.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <p className="font-body text-xs line-clamp-2" style={{ color: COLORS.ink }}>{p.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 활동 없을 때 */}
        {!loading && cases.length === 0 && posts.length === 0 && orders.length === 0 && (
          <div className="text-center py-10">
            <p className="font-body text-sm" style={{ color: COLORS.stone }}>아직 활동 내역이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminStudents({ setCurrentPage, setSelectedStudent }) {
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from('profiles').select('*')
      .in('role', ['student', 'staff'])
      .neq('status', 'deleted')  // 🍊 탈퇴한 회원 제외
      .order('role', { ascending: false })  // staff 먼저
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAllUsers(data || []);
        setLoading(false);
      });
  }, []);

  const openDetail = (s) => {
    setSelectedStudent(s);
    setCurrentPage('admin-student-detail');
  };

  // 검색 필터
  const filtered = allUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.course || '').toLowerCase().includes(q)
    );
  });

  const staffCount = allUsers.filter(u => u.role === 'staff').length;
  const studentCount = allUsers.filter(u => u.role === 'student').length;

  return (
    <>
      <PageIntro ko="수강생 관리" en="Students" desc="수강생을 눌러서 상세 정보를 확인하세요" />
      <div className="px-5 space-y-3">
        {/* 통계 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3 text-center" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>수강생</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{studentCount}<span className="font-body text-base">명</span></p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.primary}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>운영진</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{staffCount}<span className="font-body text-base">명</span></p>
          </div>
        </div>

        {/* 🔍 검색바 */}
        <div className="relative">
          <Search size={16} style={{ color: COLORS.stone, position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="이름, 이메일, 연락처로 검색"
            className="w-full rounded-full pl-10 pr-10 py-3 font-body text-sm outline-none"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
              <X size={12} style={{ color: COLORS.stone }} />
            </button>
          )}
        </div>

        {searchQuery && (
          <p className="font-mono text-[10px] px-1" style={{ color: COLORS.stone }}>
            검색 결과: <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{filtered.length}명</span>
          </p>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {searchQuery ? '검색 결과가 없습니다' : '아직 등록된 수강생이 없습니다'}
          </p>
        ) : filtered.map(s => (
          <button key={s.id} onClick={() => openDetail(s)} 
            className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]" 
            style={{ 
              background: COLORS.card, 
              border: `1px solid ${s.role === 'staff' ? COLORS.primary : COLORS.light}`,
              boxShadow: s.role === 'staff' ? '0 0 16px rgba(255, 92, 31, 0.2)' : 'none'
            }}>
            <Avatar user={s} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{s.name}</p>
                {s.role === 'staff' && (
                  <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 8px rgba(255,92,31,0.5)' }}>
                    <Shield size={8} strokeWidth={3} />STAFF
                  </span>
                )}
                {s.status === 'pending' && <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>대기</span>}
                {s.status === 'rejected' && <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>거절</span>}
              </div>
              <p className="font-mono text-[10px] truncate" style={{ color: COLORS.stone }}>{s.email}</p>
              <p className="font-serif-italic text-xs mt-1" style={{ color: COLORS.primary }}>{s.course}</p>
            </div>
            <ChevronRight size={16} style={{ color: COLORS.stone }} />
          </button>
        ))}
      </div>
    </>
  );
}
 
function AdminCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cases')
      .select('*, profiles(name, avatar_color, course)')
      .order('created_at', { ascending: false });
    setCases(data || []);
    setLoading(false);
  };

  const toggleBest = async (caseItem) => {
    const newValue = !caseItem.is_best;
    await supabase
      .from('cases')
      .update({ is_best: newValue, best_badge: newValue ? 'TOP PICK' : null })
      .eq('id', caseItem.id);
    await load();
  };

  const filtered = filter === '전체' ? cases : filter === '베스트' ? cases.filter(c => c.is_best) : cases.filter(c => c.category === filter);
  const filters = ['전체', '베스트', '눈썹', '아이라인', '입술', '속눈썹', '헤어라인'];

  return (
    <>
      <PageIntro ko="케이스 관리" en="Cases Admin" />

      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: filter === f ? COLORS.primary : COLORS.card,
                color: filter === f ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === f ? COLORS.primary : COLORS.light}`,
                boxShadow: filter === f ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none'
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3">
        <div className="rounded-2xl p-3 text-center" style={{ background: COLORS.primary }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>현재 베스트</p>
          <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{cases.filter(c => c.is_best).length}개</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>케이스가 없습니다</p>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              {c.image_urls?.length > 0 && (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <SkeletonImage src={c.image_urls[0]} alt={c.title} className="w-full h-full" />
                  <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>{c.category}</span>
                  {c.is_best && (
                    <span className="absolute top-3 right-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>★ BEST</span>
                  )}
                </div>
              )}
              <div className="p-4">
                <h4 className="font-heading text-base" style={{ color: COLORS.ink }}>{c.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar user={c.profiles} size="xs" />
                  <p className="font-body text-xs font-semibold" style={{ color: COLORS.ink }}>{c.profiles?.name || '익명'}</p>
                  <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>· {new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                {c.memo && <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: COLORS.stone }}>{c.memo}</p>}

                <button onClick={() => toggleBest(c)}
                  className="w-full mt-3 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
                  style={{
                    background: c.is_best ? COLORS.cream : COLORS.primary,
                    color: c.is_best ? COLORS.deep : COLORS.card,
                    border: c.is_best ? `1px solid ${COLORS.light}` : 'none'
                  }}>
                  {c.is_best ? (
                    <>베스트 해제</>
                  ) : (
                    <>★ 베스트로 지정</>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function AdminLectures({ user }) {
  const [lectures, setLectures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', instructor: '', category: '기초', level: 'Basic',
    duration: '', video_url: '', description: '', is_published: true,
    is_orientation: false,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('lectures')
      .select('*')
      .order('created_at', { ascending: false });
    setLectures(data || []);
  };

  // YouTube URL에서 영상 ID 추출
  const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([^&\s]+)/,
      /youtu\.be\/([^?\s]+)/,
      /youtube\.com\/embed\/([^?\s]+)/,
      /youtube\.com\/shorts\/([^?\s]+)/,
    ];
    for (const p of patterns) {
      const match = url.match(p);
      if (match) return match[1];
    }
    return null;
  };

  const resetForm = () => {
    setForm({
      title: '', instructor: '', category: '기초', level: 'Basic',
      duration: '', video_url: '', description: '', is_published: true,
      is_orientation: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (lecture) => {
    setForm({
      title: lecture.title || '',
      instructor: lecture.instructor || '',
      category: lecture.category || '기초',
      level: lecture.level || 'Basic',
      duration: lecture.duration || '',
      video_url: lecture.video_url || '',
      description: lecture.description || '',
      is_published: lecture.is_published !== false,
      is_orientation: lecture.is_orientation || false,
    });
    setEditingId(lecture.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return alert('제목을 입력해주세요');
    if (!form.instructor.trim()) return alert('강사명을 입력해주세요');
    if (!form.video_url.trim()) return alert('YouTube URL을 입력해주세요');

    const videoId = getYouTubeId(form.video_url);
    if (!videoId) return alert('올바른 YouTube URL이 아닙니다.\n예: https://youtube.com/watch?v=XXXXX');

    setLoading(true);
    const data = {
      ...form,
      thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('lectures').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lectures').insert(data);
        if (error) throw error;
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    }
    setLoading(false);
  };

  const remove = async (id) => {
    if (!confirm('이 강의를 삭제하시겠습니까?')) return;
    await supabase.from('lectures').delete().eq('id', id);
    await load();
  };

  const togglePublish = async (lecture) => {
    await supabase
      .from('lectures')
      .update({ is_published: !lecture.is_published })
      .eq('id', lecture.id);
    await load();
  };

  const previewId = getYouTubeId(form.video_url);

  return (
    <>
      <PageIntro ko="강의 관리" en="Lectures Admin" />
      <div className="px-5 space-y-3">

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>공개 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>
              {lectures.filter(l => l.is_published).length}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>비공개</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>
              {lectures.filter(l => !l.is_published).length}
            </p>
          </div>
        </div>

        {/* + 새 강의 등록 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 강의 등록
          </button>
        )}

        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>
                {editingId ? '강의 수정' : '새 강의 등록'}
              </h3>
              <button onClick={resetForm}>
                <X size={18} style={{ color: COLORS.stone }} />
              </button>
            </div>

            {/* 제목 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 엠보 브로우 기초"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 강사명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>강사명 *</label>
              <input type="text" value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})}
                placeholder="예: 최용덕 원장"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 카테고리 + 레벨 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option>기초</option><option>심화</option><option>테크닉</option>
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>레벨</label>
                <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option>Basic</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
            </div>

            {/* 영상 시간 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>영상 시간</label>
              <input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                placeholder="예: 12:30"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* YouTube URL */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>YouTube URL *</label>
              <input type="url" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              <p className="font-mono text-[10px] mt-1.5" style={{ color: COLORS.stone }}>
                💡 youtube.com, youtu.be, shorts URL 모두 가능해요
              </p>
            </div>

            {/* 미리보기 */}
            {previewId && (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.light}` }}>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2" style={{ color: COLORS.primary, background: COLORS.cardElev }}>━━ Preview</p>
                <div className="relative aspect-video">
                  <img src={`https://i.ytimg.com/vi/${previewId}/hqdefault.jpg`} alt="썸네일" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: COLORS.primary, boxShadow: '0 0 20px rgba(255, 92, 31, 0.6)' }}>
                      <Play size={20} fill={COLORS.white} style={{ color: COLORS.white }} className="ml-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 설명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="강의 내용, 학습 포인트 등" rows={3}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 공개 여부 */}
            <label className="flex items-center gap-2 font-body text-xs cursor-pointer" style={{ color: COLORS.ink }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setForm({...form, is_published: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span>✨ 즉시 공개 (체크 해제하면 비공개로 등록)</span>
            </label>

            {/* 🎯 오리엔테이션 영상 지정 */}
            <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: 'rgba(255,92,31,0.08)' }}>
              <input type="checkbox" checked={form.is_orientation} onChange={e => setForm({...form, is_orientation: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span>🎬 오리엔테이션 영상으로 지정 (신규 학생 필수 시청)</span>
            </label>

            {/* 저장 버튼 */}
            <button onClick={submit} disabled={loading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 강의 목록 */}
        {lectures.length === 0 ? (
          <div className="text-center py-10">
            <PlayCircle size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>등록된 강의가 없습니다</p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>첫 강의를 등록해보세요!</p>
          </div>
        ) : lectures.map(l => (
          <div key={l.id} onClick={() => startEdit(l)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: l.is_published ? 1 : 0.6 }}>
            <div className="relative aspect-video">
              {l.thumbnail_url ? (
                <SkeletonImage src={l.thumbnail_url} alt={l.title} className="w-full h-full" />
              ) : (
                <div className="w-full h-full" style={{ background: COLORS.cardElev }}></div>
              )}
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: COLORS.card }}>
                  <Play size={16} fill={COLORS.primary} style={{ color: COLORS.primary }} className="ml-0.5" />
                </div>
              </div>
              <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.card, color: COLORS.ink }}>
                {l.category || '기초'}
              </span>
              {!l.is_published && (
                <span className="absolute top-3 right-3 font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                  비공개
                </span>
              )}
              {l.duration && (
                <span className="absolute bottom-3 right-3 font-mono text-[10px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: COLORS.white }}>
                  {l.duration}
                </span>
              )}
            </div>

            <div className="p-4">
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{l.title}</h4>
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>
                {l.instructor} · {l.level}
              </p>
              {l.description && (
                <p className="font-body text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: COLORS.stone }}>
                  {l.description}
                </p>
              )}

              <div onClick={e => e.stopPropagation()} className="flex gap-2 mt-3">
                <button onClick={() => togglePublish(l)}
                  className="flex-1 font-heading text-[11px] py-2 rounded-full"
                  style={{
                    background: l.is_published ? COLORS.cream : COLORS.primary,
                    color: l.is_published ? COLORS.stone : COLORS.white,
                    border: l.is_published ? `1px solid ${COLORS.light}` : 'none',
                  }}>
                  {l.is_published ? '비공개로' : '공개'}
                </button>
                <button onClick={() => startEdit(l)}
                  className="flex-1 font-heading text-[11px] py-2 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={11} />수정
                </button>
                <button onClick={() => remove(l.id)}
                  className="px-3 py-2 rounded-full flex items-center justify-center"
                  style={{ background: COLORS.cream }}>
                  <Trash2 size={12} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminProducts({ user }) {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm] = useState({
    name: '', brand: '', category: '색소', price: '', original_price: '',
    stock: 0, badge: '', description: '', image_url: '', is_active: true,
    imageFile: null, imagePreview: null,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts(data || []);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({
      ...form,
      imageFile: file,
      imagePreview: URL.createObjectURL(file)
    });
  };

  const removePreview = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, imageFile: null, imagePreview: null });
  };

  const uploadProductImage = async (file) => {
    // 🍊 압축 먼저
    const compressed = await compressImage(file, 1200, 0.85);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, compressed);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteProductImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/product-images/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('product-images').remove([pathParts[1]]);
    } catch (e) {
      console.error('이미지 삭제 에러:', e);
    }
  };

  const resetForm = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({
      name: '', brand: '', category: '색소', price: '', original_price: '',
      stock: 0, badge: '', description: '', image_url: '', is_active: true,
      imageFile: null, imagePreview: null,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (product) => {
    setForm({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || '색소',
      price: product.price || '',
      original_price: product.original_price || '',
      stock: product.stock || 0,
      badge: product.badge || '',
      description: product.description || '',
      image_url: product.image_url || '',
      is_active: product.is_active !== false,
      imageFile: null,
      imagePreview: null,
    });
    setEditingId(product.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.name.trim()) return alert('상품명을 입력해주세요');
    if (!form.price) return alert('판매가를 입력해주세요');

    setLoading(true);
    try {
      let imageUrl = form.image_url;

      if (form.imageFile) {
        setUploading(true);
        if (editingId && form.image_url) {
          await deleteProductImage(form.image_url);
        }
        imageUrl = await uploadProductImage(form.imageFile);
        setUploading(false);
      }

      const productData = {
        name: form.name,
        brand: form.brand,
        category: form.category,
        price: parseInt(form.price) || 0,
        original_price: form.original_price ? parseInt(form.original_price) : null,
        stock: parseInt(form.stock) || 0,
        badge: form.badge || null,
        description: form.description,
        image_url: imageUrl,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (product) => {
    // 🍊 1. 결제 내역 체크 (정보 제공용)
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', product.id);
    
    const msg = orderCount > 0 
      ? `📦 이 상품은 ${orderCount}건의 결제 내역이 있어요.\n\n✅ 삭제해도 결제 내역은 그대로 보존돼요\n   (회계/세무용으로 필요)\n✅ 상품명도 결제 내역에 저장돼 있어 추적 가능\n\n정말 삭제하시겠습니까?`
      : '이 상품을 삭제하시겠습니까?\n이미지도 함께 삭제됩니다.';
    
    if (!confirm(msg)) return;
    
    // 🍊 2. 이미지 삭제
    if (product.image_url) await deleteProductImage(product.image_url);
    
    // 🍊 3. 상품 삭제 (orders.product_id는 자동 NULL 처리됨)
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      alert('❌ 삭제 실패: ' + error.message);
      return;
    }
    
    alert('🗑️ 상품이 삭제되었습니다');
    await load();
  };

  const toggleActive = async (product) => {
    await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);
    await load();
  };

  const categories = ['전체', '색소', '니들/머신', '마취제', '도구', '기타'];
  const filtered = filter === '전체' ? products : products.filter(p => p.category === filter);

  return (
    <>
      <PageIntro ko="재료샵 관리" en="Products Admin" />
      <div className="px-5 space-y-3">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>판매 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>
              {products.filter(p => p.is_active).length}
            </p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>비활성</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>
              {products.filter(p => !p.is_active).length}
            </p>
          </div>
        </div>

        {/* + 새 상품 등록 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 상품 등록
          </button>
        )}

        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>
                {editingId ? '상품 수정' : '새 상품 등록'}
              </h3>
              <button onClick={resetForm}>
                <X size={18} style={{ color: COLORS.stone }} />
              </button>
            </div>

            {/* 이미지 업로드 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>상품 이미지</label>
              <div className="mt-2">
                {form.imagePreview ? (
                  <div className="relative aspect-square w-full max-w-[200px] rounded-xl overflow-hidden mx-auto" style={{ background: COLORS.cream }}>
                    <img src={form.imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                    <button onClick={removePreview} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.image_url ? (
                  <div className="relative aspect-square w-full max-w-[200px] rounded-xl overflow-hidden mx-auto" style={{ background: COLORS.cream }}>
                    <img src={form.image_url} alt="기존 이미지" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <span className="font-heading text-xs" style={{ color: COLORS.white }}>이미지 변경</span>
                      <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="aspect-square w-full max-w-[200px] rounded-xl flex flex-col items-center justify-center cursor-pointer mx-auto" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                    <Upload size={24} style={{ color: COLORS.stone }} />
                    <span className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>이미지 업로드</span>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* 상품명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>상품명 *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="예: 마이크로피그먼트 누드 5ml"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 브랜드 + 카테고리 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>브랜드</label>
                <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                  placeholder="BIOTEK"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option>색소</option><option>니들/머신</option><option>마취제</option><option>도구</option><option>기타</option>
                </select>
              </div>
            </div>

            {/* 판매가 + 원가 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>판매가 *</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                  placeholder="65000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>원가 (할인용)</label>
                <input type="number" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})}
                  placeholder="80000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            {/* 재고 + 배지 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>재고</label>
                <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                  placeholder="10"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>배지</label>
                <select value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                  <option value="">없음</option><option>BEST</option><option>NEW</option><option>SALE</option>
                </select>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>상품 설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="제품 특징, 사용법 등" rows={3}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 활성 여부 */}
            <label className="flex items-center gap-2 font-body text-xs cursor-pointer" style={{ color: COLORS.ink }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span>✨ 판매 활성화 (체크 해제하면 학생에게 안 보임)</span>
            </label>

            {/* 저장 버튼 */}
            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* 상품 목록 */}
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '등록된 상품이 없습니다' : `${filter} 카테고리 상품이 없습니다`}
            </p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} onClick={() => startEdit(p)} className="rounded-2xl overflow-hidden flex cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: p.is_active ? 1 : 0.55 }}>
            <div className="relative w-24 h-24 shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: COLORS.cream }}>
                  <span className="text-3xl">{p.emoji || '🛍️'}</span>
                </div>
              )}
              {p.badge && (
                <span className="absolute top-1 left-1 font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{
                  background: p.badge === 'BEST' ? COLORS.ink : p.badge === 'NEW' ? COLORS.primary : COLORS.peach,
                  color: p.badge === 'BEST' ? COLORS.primary : p.badge === 'SALE' ? COLORS.deep : COLORS.white
                }}>{p.badge}</span>
              )}
            </div>
            <div className="flex-1 p-3 min-w-0">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>
                {p.brand || '-'} · {p.category || '기타'}
              </p>
              <h4 className="font-heading text-xs mt-1 line-clamp-2 leading-tight" style={{ color: COLORS.ink }}>{p.name}</h4>
              <p className="font-display text-sm mt-1 tracking-tight" style={{ color: COLORS.ink }}>
                {p.price?.toLocaleString()}<span className="font-body text-[10px]" style={{ color: COLORS.stone }}>원</span>
                <span className="font-mono text-[10px] ml-2" style={{ color: COLORS.stone }}>재고 {p.stock || 0}</span>
              </p>
              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-2">
                <button onClick={() => toggleActive(p)}
                  className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{
                    background: p.is_active ? COLORS.cream : COLORS.primary,
                    color: p.is_active ? COLORS.stone : COLORS.white,
                  }}>
                  {p.is_active ? '비활성' : '활성'}
                </button>
                <button onClick={() => startEdit(p)}
                  className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(p)}
                  className="px-2 py-1.5 rounded-full flex items-center justify-center"
                  style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminCourses({ user }) {
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', en_title: '', level: 'BASIC', duration: '', price: '', original_price: '',
    show_price: true, description: '', features: '', badge: '',
    is_active: true, is_featured: false, hot: false, order_index: 0,
    image_url: '', imageFile: null, imagePreview: null,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('courses').select('*').order('order_index', { ascending: true });
    setCourses(data || []);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, imageFile: file, imagePreview: URL.createObjectURL(file) });
  };

  const removePreview = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, imageFile: null, imagePreview: null });
  };

  const uploadCourseImage = async (file) => {
    // 🍊 압축 먼저
    const compressed = await compressImage(file, 1600, 0.85);
    const fileExt = compressed.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage.from('course-images').upload(fileName, compressed);
    if (error) throw error;
    const { data } = supabase.storage.from('course-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteCourseImage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/course-images/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('course-images').remove([pathParts[1]]);
    } catch (e) {
      console.error('이미지 삭제 에러:', e);
    }
  };

  const resetForm = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({
      title: '', en_title: '', level: 'BASIC', duration: '', price: '', original_price: '',
      show_price: true, description: '', features: '', badge: '',
      is_active: true, is_featured: false, hot: false, order_index: 0,
      image_url: '', imageFile: null, imagePreview: null,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (course) => {
    setForm({
      title: course.title || '',
      en_title: course.en_title || '',
      level: course.level || 'BASIC',
      duration: course.duration || '',
      price: course.price || '',
      original_price: course.original_price || '',
      show_price: course.show_price !== false,
      description: course.description || '',
      features: course.features || '',
      badge: course.badge || '',
      is_active: course.is_active !== false,
      is_featured: course.is_featured || false,
      hot: course.hot || false,
      order_index: course.order_index || 0,
      image_url: course.image_url || '',
      imageFile: null,
      imagePreview: null,
    });
    setEditingId(course.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.title.trim()) return alert('클래스명을 입력해주세요');
    setLoading(true);
    try {
      let imageUrl = form.image_url;
      if (form.imageFile) {
        setUploading(true);
        if (editingId && form.image_url) await deleteCourseImage(form.image_url);
        imageUrl = await uploadCourseImage(form.imageFile);
        setUploading(false);
      }
      const courseData = {
        title: form.title, en_title: form.en_title, level: form.level, duration: form.duration,
        price: parseInt(form.price) || 0,
        original_price: form.original_price ? parseInt(form.original_price) : null,
        show_price: form.show_price, description: form.description, features: form.features,
        badge: form.badge || null, is_active: form.is_active, is_featured: form.is_featured,
        hot: form.hot, order_index: parseInt(form.order_index) || 0, image_url: imageUrl,
      };
      if (editingId) {
        const { error } = await supabase.from('courses').update(courseData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert(courseData);
        if (error) throw error;
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    }
    setLoading(false);
    setUploading(false);
  };

  const remove = async (course) => {
    // 🍊 결제 내역 체크
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course.id);
    
    const msg = orderCount > 0 
      ? `📦 이 클래스는 ${orderCount}건의 결제 내역이 있어요.\n\n✅ 삭제해도 결제 내역은 그대로 보존돼요\n✅ 클래스명도 결제 내역에 저장돼 있어 추적 가능\n\n정말 삭제하시겠습니까?`
      : '이 클래스를 삭제하시겠습니까?\n이미지도 함께 삭제됩니다.';
    
    if (!confirm(msg)) return;
    
    if (course.image_url) await deleteCourseImage(course.image_url);
    const { error } = await supabase.from('courses').delete().eq('id', course.id);
    if (error) {
      alert('❌ 삭제 실패: ' + error.message);
      return;
    }
    alert('🗑️ 클래스가 삭제되었습니다');
    await load();
  };

  const toggleActive = async (course) => {
    await supabase.from('courses').update({ is_active: !course.is_active }).eq('id', course.id);
    await load();
  };

  const togglePrice = async (course) => {
    await supabase.from('courses').update({ show_price: !course.show_price }).eq('id', course.id);
    await load();
  };

  return (
    <>
      <PageIntro ko="클래스 관리" en="Courses Admin" />
      <div className="px-5 space-y-3">
        {/* 통계 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>운영 중</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{courses.filter(c => c.is_active).length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>비활성</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{courses.filter(c => !c.is_active).length}</p>
          </div>
        </div>

        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 클래스 등록
          </button>
        )}

        {/* 등록/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>{editingId ? '클래스 수정' : '새 클래스 등록'}</h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            {/* 이미지 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>클래스 이미지 (선택)</label>
              <div className="mt-2">
                {form.imagePreview ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={form.imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                    <button onClick={removePreview} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
                      <X size={14} style={{ color: COLORS.white }} />
                    </button>
                  </div>
                ) : form.image_url ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                    <img src={form.image_url} alt="기존 이미지" className="w-full h-full object-cover" />
                    <label className="absolute inset-0 flex items-center justify-center cursor-pointer" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <span className="font-heading text-xs" style={{ color: COLORS.white }}>이미지 변경</span>
                      <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="aspect-video w-full rounded-xl flex flex-col items-center justify-center cursor-pointer" style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
                    <Upload size={24} style={{ color: COLORS.stone }} />
                    <span className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>이미지 업로드 (16:9 권장)</span>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>클래스명 *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="예: 눈썹 마스터 클래스"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>영문명</label>
                <input type="text" value={form.en_title} onChange={e => setForm({...form, en_title: e.target.value})}
                  placeholder="Eyebrow Master"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>레벨</label>
                <input type="text" value={form.level} onChange={e => setForm({...form, level: e.target.value})}
                  placeholder="MASTER"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>기간</label>
                <input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                  placeholder="10주"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>정렬 순서</label>
                <input type="number" value={form.order_index} onChange={e => setForm({...form, order_index: e.target.value})}
                  placeholder="1"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>판매가</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                  placeholder="3200000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>원가 (할인용)</label>
                <input type="number" value={form.original_price} onChange={e => setForm({...form, original_price: e.target.value})}
                  placeholder="3500000"
                  className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>배지</label>
              <select value={form.badge} onChange={e => setForm({...form, badge: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option value="">없음</option><option>BEST</option><option>NEW</option><option>SALE</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="클래스 한 줄 설명" rows={2}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>특징 (줄바꿈으로 구분)</label>
              <textarea value={form.features} onChange={e => setForm({...form, features: e.target.value})}
                placeholder="1:1 케어&#10;실습 모델 5명&#10;수료 후 평생 AS" rows={3}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            {/* 토글 옵션들 */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>✨ 운영 활성화 (학생에게 표시)</span>
              </label>
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.show_price} onChange={e => setForm({...form, show_price: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>💰 가격 공개 (체크 해제 시 "문의" 표시)</span>
              </label>
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>⭐ 특별 강조 (검정 배경 + 글로우)</span>
              </label>
              <label className="flex items-center gap-2 font-body text-xs cursor-pointer p-2 rounded" style={{ color: COLORS.ink, background: COLORS.cream }}>
                <input type="checkbox" checked={form.hot} onChange={e => setForm({...form, hot: e.target.checked})}
                  className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
                <span>🔥 HOT 라벨 표시</span>
              </label>
            </div>

            <button onClick={submit} disabled={loading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '이미지 업로드 중...' : editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 목록 */}
        {courses.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>등록된 클래스가 없습니다</p>
          </div>
        ) : courses.map(c => (
          <div key={c.id} onClick={() => startEdit(c)} className="rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: c.is_active ? 1 : 0.55 }}>
            {c.image_url && (
              <div className="aspect-video relative overflow-hidden">
                <SkeletonImage src={c.image_url} alt={c.title} className="w-full h-full" />
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>{c.level}</span>
                {c.hot && <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>🔥</span>}
                {c.is_featured && <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.ink, color: COLORS.primary }}>⭐</span>}
                {!c.show_price && <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.cardElev, color: COLORS.stone }}>가격숨김</span>}
              </div>
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{c.title}</h4>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>
                {c.duration} · {c.show_price ? `₩${(c.price / 10000).toFixed(0)}만` : '문의'}
              </p>
              {c.description && <p className="font-body text-xs mt-1.5 line-clamp-1" style={{ color: COLORS.stone }}>{c.description}</p>}

              <div onClick={e => e.stopPropagation()} className="flex gap-1 mt-3">
                <button onClick={() => toggleActive(c)}
                  style={{ background: c.is_active ? COLORS.cream : COLORS.primary, color: c.is_active ? COLORS.stone : COLORS.white }}>
                  {c.is_active ? '비활성' : '활성'}
                </button>
                <button onClick={() => togglePrice(c)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full"
                  style={{ background: c.show_price ? COLORS.cream : COLORS.ink, color: c.show_price ? COLORS.stone : COLORS.primary }}>
                  {c.show_price ? '가격숨김' : '가격공개'}
                </button>
                <button onClick={() => startEdit(c)} className="flex-1 font-heading text-[10px] py-1.5 rounded-full flex items-center justify-center gap-1"
                  style={{ background: COLORS.cardElev, color: COLORS.white }}>
                  <Edit3 size={10} />수정
                </button>
                <button onClick={() => remove(c)} className="px-2 py-1.5 rounded-full flex items-center justify-center" style={{ background: COLORS.cream }}>
                  <Trash2 size={10} style={{ color: COLORS.deep }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =============================================================
// 📚 AdminLibrary - 자료실 관리 (업로드 + 수정 + 삭제 + 드래그앤드롭)
// =============================================================
function AdminLibrary({ user }) {
  const [files, setFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [form, setForm] = useState({
    name: '', category: '시술 가이드', description: '',
    file: null, file_type: '', file_size: '',
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('library_files')
      .select('*')
      .order('created_at', { ascending: false });
    setFiles(data || []);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const setFileFromInput = (file) => {
    if (!file) return;
    setForm(prev => ({
      ...prev,
      file,
      name: prev.name || file.name.replace(/\.[^/.]+$/, ''),
      file_type: file.name.split('.').pop().toUpperCase(),
      file_size: formatFileSize(file.size),
    }));
  };

  const handleFileSelect = (e) => {
    setFileFromInput(e.target.files[0]);
  };

  // 🎯 드래그앤드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setFileFromInput(e.dataTransfer.files[0]);
  };

  const uploadLibraryFile = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage
      .from('library-files')
      .upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('library-files').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const deleteLibraryFile = async (fileUrl) => {
    if (!fileUrl) return;
    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/library-files/');
      if (pathParts.length < 2) return;
      await supabase.storage.from('library-files').remove([pathParts[1]]);
    } catch (e) { console.error('파일 삭제 에러:', e); }
  };

  const resetForm = () => {
    setForm({ name: '', category: '시술 가이드', description: '', file: null, file_type: '', file_size: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (f) => {
    setForm({
      name: f.name || '',
      category: f.category || '시술 가이드',
      description: f.description || '',
      file: null,
      file_type: f.file_type || '',
      file_size: f.file_size || '',
    });
    setEditingId(f.id);
    setShowForm(true);
    setTimeout(() => document.querySelector('.admin-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const submit = async () => {
    if (!form.name.trim()) return alert('자료명을 입력해주세요');

    setSubmitLoading(true);
    try {
      if (editingId) {
        // 🍊 수정 모드
        const updateData = {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
        };
        // 새 파일 업로드한 경우만 파일 교체
        if (form.file) {
          setUploading(true);
          const oldFile = files.find(f => f.id === editingId);
          if (oldFile?.file_url) await deleteLibraryFile(oldFile.file_url);
          const fileUrl = await uploadLibraryFile(form.file);
          updateData.file_url = fileUrl;
          updateData.file_type = form.file_type;
          updateData.file_size = form.file_size;
          setUploading(false);
        }
        const { error } = await supabase.from('library_files').update(updateData).eq('id', editingId);
        if (error) throw error;
        alert('✏️ 수정 완료!');
      } else {
        // 🍊 새 등록 (파일은 선택사항)
        const insertData = {
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
        };
        if (form.file) {
          setUploading(true);
          const fileUrl = await uploadLibraryFile(form.file);
          insertData.file_url = fileUrl;
          insertData.file_type = form.file_type;
          insertData.file_size = form.file_size;
          setUploading(false);
        }
        const { error } = await supabase.from('library_files').insert(insertData);
        if (error) throw error;
        alert('✅ 등록 완료!');
      }
      resetForm();
      await load();
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + err.message);
    }
    setSubmitLoading(false);
    setUploading(false);
  };

  const remove = async (file) => {
    if (!confirm('이 자료를 삭제하시겠습니까?\n파일도 함께 삭제됩니다.')) return;
    if (file.file_url) await deleteLibraryFile(file.file_url);
    await supabase.from('library_files').delete().eq('id', file.id);
    await load();
  };

  const categories = ['전체', '시술 가이드', '색소 차트', '매뉴얼', '템플릿', '기타'];
  const filtered = filter === '전체' ? files : files.filter(f => f.category === filter);

  return (
    <>
      <PageIntro ko="자료실 관리" en="Library Admin" />
      <div className="px-5 space-y-3">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>전체 자료</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{files.length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{categories.length - 1}</p>
          </div>
        </div>

        {/* 새 자료 업로드 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={14} strokeWidth={2.5} />새 자료 업로드
          </button>
        )}

        {/* 업로드/수정 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in admin-edit-form" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>
                {editingId ? '자료 수정' : '새 자료 업로드'}
              </h3>
              <button onClick={resetForm}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>

            {/* 🎯 파일 선택 (드래그앤드롭 지원) */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>
                {editingId ? '파일 (선택, 새 파일이면 교체)' : '파일 *'}
              </label>
              {form.file ? (
                <div className="mt-2 flex items-center gap-3 p-3 rounded-xl" style={{ background: COLORS.cream }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: COLORS.peach }}>
                    <FolderOpen size={18} style={{ color: COLORS.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-xs truncate" style={{ color: COLORS.ink }}>{form.file.name}</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{form.file_type} · {form.file_size}</p>
                  </div>
                  <button onClick={() => setForm({ ...form, file: null, file_type: editingId ? form.file_type : '', file_size: editingId ? form.file_size : '' })}
                    className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
                    <X size={12} style={{ color: COLORS.white }} />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className="mt-2 rounded-xl flex flex-col items-center justify-center cursor-pointer py-10 transition-all"
                  style={{
                    background: dragOver ? 'rgba(255,92,31,0.1)' : COLORS.cream,
                    border: `2px dashed ${dragOver ? COLORS.primary : COLORS.light}`,
                    transform: dragOver ? 'scale(1.02)' : 'scale(1)',
                  }}>
                  <Upload size={28} style={{ color: dragOver ? COLORS.primary : COLORS.stone }} />
                  <span className="font-heading text-sm mt-2" style={{ color: dragOver ? COLORS.primary : COLORS.ink }}>
                    {dragOver ? '🎯 여기에 놓으세요!' : '📁 파일을 드래그하거나 클릭'}
                  </span>
                  <span className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>모든 파일 형식 가능</span>
                  <input type="file" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </div>

            {/* 자료명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>자료명 *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="예: 엠보 브로우 시술 가이드"
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>카테고리</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full font-body text-sm font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>시술 가이드</option><option>색소 차트</option><option>매뉴얼</option><option>템플릿</option><option>기타</option>
              </select>
            </div>

            {/* 설명 */}
            <div>
              <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>설명</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="자료에 대한 간단한 설명" rows={2}
                className="w-full font-body text-xs font-medium p-2 mt-1 outline-none resize-none rounded"
                style={{ background: COLORS.cream, color: COLORS.ink }} />
            </div>

            <button onClick={submit} disabled={submitLoading || uploading}
              className="w-full font-heading text-sm py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {(submitLoading || uploading) && <Loader2 size={14} className="animate-spin" />}
              {uploading ? '업로드 중...' : editingId ? '수정 저장' : '등록하기'}
            </button>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.primary : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.primary : COLORS.light}`,
              }}>
              {cat}
            </button>
          ))}
        </div>

        {/* 자료 목록 */}
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <FolderOpen size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '등록된 자료가 없습니다' : `${filter} 카테고리 자료가 없습니다`}
            </p>
          </div>
        ) : filtered.map(f => (
          <div key={f.id} onClick={() => startEdit(f)} className="rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl" style={{ background: COLORS.peach }}>
              <FolderOpen size={20} style={{ color: COLORS.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>{f.category || '기타'}</p>
              <p className="font-heading text-xs mt-0.5 truncate" style={{ color: COLORS.ink }}>{f.name}</p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>{f.file_type} · {f.file_size}</p>
              {f.description && (
                <p className="font-body text-[11px] mt-1 line-clamp-1" style={{ color: COLORS.stone }}>{f.description}</p>
              )}
            </div>
            <div onClick={e => e.stopPropagation()} className="flex flex-col gap-1.5 shrink-0">
              <button onClick={() => startEdit(f)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
                <Edit3 size={11} style={{ color: COLORS.white }} />
              </button>
              <button onClick={() => remove(f)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.cream }}>
                <Trash2 size={12} style={{ color: COLORS.deep }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminQna({ user }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [qnaFilter, setQnaFilter] = useState('all'); // 'all' | 'pending' | 'answered'

  const toggleFilter = (status) => {
    setQnaFilter(prev => prev === status ? 'all' : status);
  };
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    // 질문 먼저 가져오기 (조인 없이 안전하게)
    const { data: qData, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (qErr) {
      console.error('Q&A 로드 에러:', qErr);
      setQuestions([]);
      return;
    }
    if (!qData || qData.length === 0) {
      setQuestions([]);
      return;
    }

    // 작성자 프로필 별도로 가져오기
    const userIds = [...new Set(qData.map(q => q.user_id).filter(Boolean))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, name, avatar_color')
      .in('id', userIds);
    
    const profileMap = {};
    (profilesData || []).forEach(p => { profileMap[p.id] = p; });
    
    const enriched = qData.map(q => ({ ...q, profiles: profileMap[q.user_id] || { name: '알 수 없음' } }));
    setQuestions(enriched);
  };
 
  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    await supabase.from('questions').update({
      answer, status: 'answered',
      answered_by: user.id, answered_at: new Date().toISOString()
    }).eq('id', selected.id);

    // 📢 질문자에게 알림
    if (selected.user_id && selected.user_id !== user.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `✅ 원장님이 답변을 남겼어요!`,
            body: `Q. ${selected.title}`,
            url: '/',
            targetUserId: selected.user_id,
          }),
        });
      } catch (e) { console.error('알림 발송 실패:', e); }
    }

    // 🍊 운영진이면 원장님께 별도 알림
    await notifyAdminsOfStaffActivity(user, `Q&A 답변: ${selected.title}`, answer.substring(0, 60));

    setAnswer(''); setSelected(null);
    await load();
    setLoading(false);
  };

  const deleteAnswer = async () => {
    if (!confirm('답변을 삭제하시겠습니까?\n질문은 "답변 대기" 상태로 돌아갑니다.')) return;
    setLoading(true);
    const { error } = await supabase.from('questions').update({
      answer: null,
      status: 'pending',
      answered_by: null,
      answered_at: null,
    }).eq('id', selected.id);
    setLoading(false);
    if (error) {
      alert('❌ 삭제 실패: ' + error.message);
    } else {
      alert('🗑️ 답변이 삭제되었습니다');
      setAnswer('');
      setSelected(null);
      await load();
    }
  };
 
  if (selected) {
    return (
      <div className="px-5 py-5">
        <button onClick={() => setSelected(null)} className="font-body text-xs flex items-center gap-1 mb-4" style={{ color: COLORS.stone }}>
          <ChevronLeft size={14} />목록으로
        </button>
        <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>{selected.category}</span>
          <h3 className="font-heading text-base mt-2" style={{ color: COLORS.ink }}>{selected.title}</h3>
          <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>{selected.profiles?.name}</p>
          {selected.content && <p className="font-body text-xs mt-3 leading-relaxed" style={{ color: COLORS.stone }}>{selected.content}</p>}
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.peach }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.deep }}>관리자 답변</p>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="답변을 작성해주세요" rows={6}
            className="w-full font-body text-xs p-3 outline-none resize-none rounded" style={{ background: COLORS.card, color: COLORS.ink }} />
          <button onClick={submitAnswer} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.white }}>
            {loading && <Loader2 size={12} className="animate-spin" />}{selected?.answer ? '답변 수정하기' : '답변 등록하기'}
          </button>
          
          {/* 🍊 답변 삭제 (답변 있을 때만 표시) */}
          {selected?.answer && (
            <button onClick={deleteAnswer} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cream, color: COLORS.deep, border: `1px solid ${COLORS.light}` }}>
              <Trash2 size={11} strokeWidth={2.5} />답변 삭제하기
            </button>
          )}
        </div>
      </div>
    );
  }
 
  const pending = questions.filter(q => q.status === 'pending');
  const answered = questions.filter(q => q.status === 'answered');
  const filtered = qnaFilter === 'all' ? questions : qnaFilter === 'pending' ? pending : answered;
 
  return (
    <>
      <PageIntro ko="Q&A 답변" en="Q&A Admin" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => toggleFilter('pending')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${qnaFilter === 'pending' ? 'glow-primary' : ''}`}
            style={{ background: COLORS.primary }}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>답변 대기</p>
              {qnaFilter === 'pending' && <span className="text-[10px]" style={{ color: COLORS.white }}>●</span>}
            </div>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{pending.length}</p>
          </button>
          <button onClick={() => toggleFilter('answered')}
            className={`rounded-2xl p-3 text-left transition-transform active:scale-95 ${qnaFilter === 'answered' ? 'glow-soft' : ''}`}
            style={{ background: COLORS.card, border: `1px solid ${qnaFilter === 'answered' ? COLORS.primary : COLORS.light}` }}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: qnaFilter === 'answered' ? COLORS.primary : COLORS.stone }}>답변 완료</p>
              {qnaFilter === 'answered' && <span className="text-[10px]" style={{ color: COLORS.primary }}>●</span>}
            </div>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{answered.length}</p>
          </button>
        </div>

        {/* 필터 활성 표시 */}
        {qnaFilter !== 'all' && (
          <div className="flex items-center justify-between px-1 -mt-1">
            <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
              <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{qnaFilter === 'pending' ? '답변 대기' : '답변 완료'}</span> 만 보는 중
            </p>
            <button onClick={() => setQnaFilter('all')} className="font-mono text-[10px] font-semibold flex items-center gap-1" style={{ color: COLORS.primary }}>
              전체 보기 <X size={10} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {filtered.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {qnaFilter === 'pending' ? '답변 대기 중인 질문이 없습니다' :
             qnaFilter === 'answered' ? '답변 완료된 질문이 없습니다' :
             '등록된 질문이 없습니다'}
          </p>
        ) : filtered.map(q => (
          <button key={q.id} onClick={() => { setSelected(q); setAnswer(q.answer || ''); }} className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.98]" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                background: q.status === 'answered' ? COLORS.ink : COLORS.primary,
                color: q.status === 'answered' ? COLORS.primary : COLORS.white
              }}>{q.status === 'answered' ? '완료' : '대기'}</span>
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{q.category}</span>
            </div>
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{q.title}</p>
            <p className="font-mono text-[10px] mt-1.5" style={{ color: COLORS.stone }}>{q.profiles?.name} · {new Date(q.created_at).toLocaleDateString('ko-KR')}</p>
            {q.answer && (
              <div className="mt-2 pt-2 rounded-lg flex items-start gap-1.5" style={{ borderTop: `1px solid ${COLORS.light}` }}>
                <span className="font-mono text-[9px] font-bold tracking-widest uppercase shrink-0 mt-0.5" style={{ color: COLORS.primary }}>답변</span>
                <p className="font-body text-[11px] line-clamp-2 leading-relaxed" style={{ color: COLORS.stone }}>{q.answer}</p>
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
 