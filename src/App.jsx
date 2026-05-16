import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  Home, Bell, BellOff, BookOpen, Award, MessageCircle, FolderOpen, Sparkles,
  ShoppingBag, PlayCircle, Users, Calendar, Video, FileCheck, Gift,
  User, LogOut, Menu, X, Search, Heart, ChevronRight, Clock,
  Check, Plus, Send, Eye, Lock, Mail, Edit3, Download, Play, Upload,
  Palette, BarChart3, Trash2, ChevronLeft, ShoppingCart,
  Shield, UserCheck, AlertCircle, Camera, Image as ImageIcon,
  Wifi, Battery, Signal, ArrowRight, ArrowUpRight, Loader2
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

// 이미지 업로드 헬퍼 함수
const uploadCaseImage = async (file, userId) => {
  // 파일 이름 생성 (timestamp + random)
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Supabase Storage에 업로드
  const { error: uploadError } = await supabase.storage
    .from('case-images')
    .upload(filePath, file);

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
 
export default function HSSUPApp() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
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
        console.log('PWA 설치 성공!');
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
 
  const loadProfile = async (userId) => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      setCurrentPage(data.role === 'admin' ? 'dashboard' : 'home');
    }
    setLoading(false);
  };
 
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null); setSession(null); setDrawerOpen(false);
  };
 
  const isAdmin = profile?.role === 'admin';

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
    window.history.pushState({ page: currentPage }, '', '');
  }, [currentPage, profile]);

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
  { id: 'course', label: '강의', icon: BookOpen },
  { id: 'market', label: '재료샵', icon: ShoppingBag },
  { id: 'community', label: '커뮤니티', icon: Users },
  { id: 'mypage', label: 'MY', icon: User },
  ];
  const adminTabs = [
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
      { id: 'attendance', label: '출석·진도', icon: Calendar },
    ]},
    { section: 'PRACTICE', items: [
      { id: 'mycase', label: '내 포트폴리오', icon: Camera },
      { id: 'best', label: '베스트 케이스', icon: Award },
      
    ]},
    { section: 'CONNECT', items: [
      { id: 'notice', label: '공지', icon: Bell },
      { id: 'qna', label: 'Q&A', icon: MessageCircle },
      { id: 'community', label: '커뮤니티', icon: Users },
    ]},
    { section: 'RESOURCE', items: [
      { id: 'library', label: '자료실', icon: FolderOpen },
      { id: 'market', label: '재료샵', icon: ShoppingBag },
    ]},
    { section: 'MY', items: [
      { id: 'mypage', label: '마이페이지', icon: User },
    ]},
  ];
  const adminMenu = [
    { section: 'ADMIN', items: [
      { id: 'dashboard', label: '대시보드', icon: BarChart3 },
      { id: 'admin-students', label: '수강생', icon: UserCheck },
      { id: 'admin-qna', label: 'Q&A 답변', icon: MessageCircle },
      { id: 'admin-notice', label: '공지 관리', icon: Bell },
      { id: 'admin-cases', label: '케이스 관리', icon: Camera },
      { id: 'admin-lectures', label: '강의 관리', icon: PlayCircle },
    ]},
    { section: 'LEARN', items: [
      { id: 'home', label: '홈', icon: Home },
      { id: 'course', label: '클래스', icon: BookOpen },
      { id: 'online', label: '온라인 강의', icon: PlayCircle },
      { id: 'attendance', label: '출석·진도', icon: Calendar },
    ]},
    { section: 'PRACTICE', items: [
      { id: 'mycase', label: '내 포트폴리오', icon: Camera },
      { id: 'best', label: '베스트 케이스', icon: Award },
      
    ]},
    { section: 'CONNECT', items: [
      { id: 'notice', label: '공지', icon: Bell },
      { id: 'qna', label: 'Q&A', icon: MessageCircle },
      { id: 'community', label: '커뮤니티', icon: Users },
    ]},
    { section: 'RESOURCE', items: [
      { id: 'library', label: '자료실', icon: FolderOpen },
      { id: 'market', label: '재료샵', icon: ShoppingBag },
    ]},
    { section: 'MY', items: [
      { id: 'mypage', label: '마이페이지', icon: User },
    ]},
  ];
  const fullMenu = isAdmin ? adminMenu : studentMenu;
 
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.cream }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        .font-display { font-family: 'Pretendard', sans-serif; font-weight: 800; letter-spacing: -0.03em; }
        .font-heading { font-family: 'Pretendard', sans-serif; font-weight: 700; letter-spacing: -0.025em; }
        .font-body { font-family: 'Pretendard', sans-serif; letter-spacing: -0.01em; }
        .font-serif-italic { font-family: 'Instrument Serif', serif; font-style: italic; }
        .font-mono { font-family: 'Pretendard', sans-serif; font-feature-settings: "tnum"; }
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
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (min-width: 481px) {
          .app-container {
            max-width: 480px;
            margin: 0 auto;
            box-shadow: 0 0 40px rgba(0,0,0,0.08);
          }
        }
      `}</style>

<div className="app-container relative w-full overflow-hidden flex flex-col" style={{ background: COLORS.cream, height: '100dvh' }}>
 
          {loading ? <LoadingScreen /> :
           !session || !profile ? <AuthScreen /> : (
            <>
              <AppHeader user={profile} isAdmin={isAdmin}
                onMenuClick={() => setDrawerOpen(true)}
                onLogoClick={() => setCurrentPage(isAdmin ? 'dashboard' : 'home')}
                onProfileClick={() => setCurrentPage('mypage')}
                showBackButton={isSubPage}
                onBackClick={() => window.history.back()} />
              <main className="flex-1 overflow-y-auto scrollbar-hide pb-20">
                <div className="animate-fade-in">
                  <PageRouter currentPage={currentPage} setCurrentPage={setCurrentPage} 
                    selectedNotice={selectedNotice} setSelectedNotice={setSelectedNotice}
                    selectedQna={selectedQna} setSelectedQna={setSelectedQna}
                    selectedPost={selectedPost} setSelectedPost={setSelectedPost}
                    selectedLecture={selectedLecture} setSelectedLecture={setSelectedLecture}
                    user={profile} handleLogout={handleLogout} isAdmin={isAdmin} />
                </div>
              </main>
              <BottomTabBar tabs={tabs} currentPage={currentPage} setCurrentPage={setCurrentPage} />
              {drawerOpen && (
                <Drawer fullMenu={fullMenu} user={profile} isAdmin={isAdmin}
                  currentPage={currentPage}
                  setCurrentPage={(p) => { setCurrentPage(p); setDrawerOpen(false); }}
                  onClose={() => setDrawerOpen(false)} handleLogout={handleLogout} />
              )}
            </>
          )}
      </div>

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
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '', email: '', password: '', passwordConfirm: '',
    phone: '', course: '눈썹 마스터 클래스', avatar_color: 'orange'
  });
 
  const handleLogin = async () => {
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email, password: loginForm.password
    });
    if (error) setError(error.message);
    setLoading(false);
  };
 
  const handleSignup = async () => {
    setError('');
    if (!signupForm.name || !signupForm.email || !signupForm.password) return setError('필수 항목을 모두 입력해주세요');
    if (signupForm.password !== signupForm.passwordConfirm) return setError('비밀번호가 일치하지 않습니다');
    if (signupForm.password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다');
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupForm.email, password: signupForm.password,
      options: { data: { name: signupForm.name, phone: signupForm.phone, course: signupForm.course, avatar_color: signupForm.avatar_color } }
    });
    if (error) setError(error.message);
    setLoading(false);
  };
 
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative h-[45%] flex flex-col justify-end p-7 overflow-hidden" style={{ background: COLORS.cream }}>
        {/* 오렌지 라디얼 글로우 (배경) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[120%] h-[120%] rounded-full"
            style={{
              background: `radial-gradient(circle at 70% 50%, rgba(255,92,31,0.45) 0%, rgba(255,92,31,0.12) 30%, transparent 60%)`,
              filter: 'blur(20px)'
            }}></div>
        </div>
        {/* 동심원 데코 */}
        <div className="absolute top-12 right-0 opacity-30">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="98" stroke={COLORS.primary} strokeWidth="0.5" />
            <circle cx="100" cy="100" r="70" stroke={COLORS.primary} strokeWidth="0.5" />
            <circle cx="100" cy="100" r="42" stroke={COLORS.primary} strokeWidth="0.5" />
          </svg>
        </div>
        {/* 미세한 가로선 (오렌지 라이트) */}
        <div className="absolute top-1/3 left-0 right-0 h-px opacity-40"
          style={{ background: `linear-gradient(90deg, transparent 0%, ${COLORS.primary} 50%, transparent 100%)` }}></div>

        <div className="relative" style={{ color: COLORS.ink }}>
          <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase" style={{ color: COLORS.primary }}>Beauty Academy</p>
          <img src="/logo-white.png" alt="HSSUP Academy" style={{ height: '60px', marginTop: '12px', filter: 'drop-shadow(0 0 24px rgba(255, 92, 31, 0.5))' }} />
          <p className="font-serif-italic text-2xl mt-4" style={{ color: COLORS.stone }}>Where craft meets <br />artistry.</p>
        </div>
      </div>
 
      <div className="flex-1 px-7 py-6 overflow-y-auto scrollbar-hide">
        <div className="flex gap-6 mb-6">
          <button onClick={() => setMode('login')} className="font-heading text-base"
            style={{ color: mode === 'login' ? COLORS.ink : COLORS.stone, opacity: mode === 'login' ? 1 : 0.4 }}>로그인</button>
          <button onClick={() => setMode('signup')} className="font-heading text-base"
            style={{ color: mode === 'signup' ? COLORS.ink : COLORS.stone, opacity: mode === 'signup' ? 1 : 0.4 }}>회원가입</button>
        </div>
 
        {mode === 'login' ? (
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: COLORS.stone }}>Email</label>
              <input type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="your@email.com" className="w-full font-body text-base font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>
            <div>
              <label className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: COLORS.stone }}>Password</label>
              <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••"
                className="w-full font-body text-base font-medium border-b py-2 mt-1 bg-transparent outline-none"
                style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            </div>
            {error && <p className="font-body text-xs" style={{ color: COLORS.deep }}>{error}</p>}
            <button onClick={handleLogin} disabled={loading} className="w-full font-heading text-sm py-4 mt-4 flex items-center justify-between px-5 disabled:opacity-60"
              style={{ background: COLORS.primary, color: COLORS.white, borderRadius: '999px', boxShadow: '0 0 32px rgba(255, 92, 31, 0.5), 0 0 8px rgba(255, 92, 31, 0.3)' }}>
              <span className="flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}Enter HSSUP</span>
              <ArrowUpRight size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { key: 'name', type: 'text', label: 'NAME', placeholder: '홍길동' },
              { key: 'email', type: 'email', label: 'EMAIL', placeholder: 'your@email.com' },
              { key: 'password', type: 'password', label: 'PASSWORD', placeholder: '6자 이상' },
              { key: 'passwordConfirm', type: 'password', label: 'CONFIRM', placeholder: '비밀번호 재입력' },
              { key: 'phone', type: 'tel', label: 'PHONE', placeholder: '010-0000-0000' },
            ].map(f => (
              <div key={f.key}>
                <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>{f.label}</label>
                <input type={f.type} value={signupForm[f.key]} onChange={e => setSignupForm({ ...signupForm, [f.key]: e.target.value })}
                  placeholder={f.placeholder} className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none"
                  style={{ borderColor: COLORS.light, color: COLORS.ink }} />
              </div>
            ))}
            <div>
              <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>CLASS</label>
              <select value={signupForm.course} onChange={e => setSignupForm({ ...signupForm, course: e.target.value })}
                className="w-full font-body text-sm font-medium border-b py-1.5 mt-0.5 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
                <option>눈썹 베이직 클래스</option><option>눈썹 마스터 클래스</option><option>아이라인 클래스</option>
                <option>입술 문신 클래스</option><option>속눈썹 펌·연장 클래스</option><option>올인원 마스터 클래스</option>
              </select>
            </div>

            <div className="pt-2">
              <label className="font-mono text-[10px] font-semibold tracking-[0.15em]" style={{ color: COLORS.stone }}>AVATAR COLOR</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center justify-center rounded-full shrink-0"
                  style={{
                    width: '52px', height: '52px',
                    background: AVATAR_COLORS[signupForm.avatar_color].gradient,
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
              <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>
                선택: <span style={{ color: COLORS.primary, fontWeight: 700 }}>{AVATAR_COLORS[signupForm.avatar_color].name}</span>
              </p>
            </div>

            {error && <p className="font-body text-xs" style={{ color: COLORS.deep }}>{error}</p>}
            <button onClick={handleSignup} disabled={loading} className="w-full font-heading text-sm py-4 mt-4 flex items-center justify-between px-5 disabled:opacity-60"
              style={{ background: COLORS.primary, color: COLORS.white, borderRadius: '999px', boxShadow: '0 0 32px rgba(255, 92, 31, 0.5), 0 0 8px rgba(255, 92, 31, 0.3)' }}>
              <span className="flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}Join HSSUP</span>
              <ArrowUpRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
 
function AppHeader({ user, isAdmin, onMenuClick, onProfileClick, onLogoClick, showBackButton, onBackClick }) {
  return (
    <header className="shrink-0 px-5 py-3.5 flex items-center justify-between" style={{ background: COLORS.cream, borderBottom: `1px solid ${COLORS.light}` }}>
      {showBackButton ? (
        <button onClick={onBackClick} className="p-1 -ml-1 flex items-center" aria-label="뒤로가기">
          <ChevronLeft size={24} style={{ color: COLORS.ink }} strokeWidth={2.5} />
        </button>
      ) : (
        <button onClick={onMenuClick} className="p-1" aria-label="메뉴">
          <Menu size={20} style={{ color: COLORS.ink }} strokeWidth={2.5} />
        </button>
      )}
      <button onClick={onLogoClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        <img src="/logo-white.png" alt="HSSUP Academy" style={{ height: '20px', filter: 'drop-shadow(0 0 8px rgba(255, 92, 31, 0.5))' }} />
      </button>
      <button onClick={onProfileClick} className="relative">
        <Avatar user={user} size="sm" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: COLORS.primary }}></span>
      </button>
    </header>
  );
}
 
function BottomTabBar({ tabs, currentPage, setCurrentPage }) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 shrink-0 grid grid-cols-5" style={{
      background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${COLORS.light}`, paddingBottom: '20px'
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentPage === tab.id;
        return (
          <button key={tab.id} onClick={() => setCurrentPage(tab.id)} className="py-2.5 flex flex-col items-center gap-1 relative">
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
                  <button key={item.id} onClick={() => setCurrentPage(item.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm font-medium"
                    style={{ background: isActive ? COLORS.ink : 'transparent', color: isActive ? COLORS.cream : COLORS.ink }}>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />{item.label}
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
 
function PageRouter({ currentPage, setCurrentPage, selectedNotice, setSelectedNotice, selectedQna, setSelectedQna, selectedPost, setSelectedPost, selectedLecture, setSelectedLecture, user, handleLogout, isAdmin }) {
  if (isAdmin) {
    if (currentPage === 'dashboard') return <AdminDashboard setCurrentPage={setCurrentPage} />;
    if (currentPage === 'admin-notice') return <AdminNotice user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
    if (currentPage === 'admin-students') return <AdminStudents />;
    if (currentPage === 'admin-qna') return <AdminQna user={user} />;
    if (currentPage === 'admin-cases') return <AdminCases />;
    if (currentPage === 'admin-lectures') return <AdminLectures user={user} />;
    if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} />;
  }
  if (currentPage === 'notice-detail') return <NoticeDetailPage notice={selectedNotice} user={user} />;
  if (currentPage === 'qna-detail') return <QnaDetailPage qna={selectedQna} user={user} />;
  if (currentPage === 'post-detail') return <PostDetailPage post={selectedPost} user={user} />;
  if (currentPage === 'lecture-detail') return <LectureDetailPage lecture={selectedLecture} user={user} />;
  if (currentPage === 'home') return <HomePage user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
  if (currentPage === 'notice') return <NoticePage user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
  if (currentPage === 'course') return <CoursePage />;
  if (currentPage === 'best') return <BestCasePage />;
  if (currentPage === 'mycase') return <MyCasePage user={user} />;
  if (currentPage === 'qna') return <QnaPage user={user} setCurrentPage={setCurrentPage} setSelectedQna={setSelectedQna} />;
  if (currentPage === 'library') return <LibraryPage />;
  if (currentPage === 'market') return <MarketPage />;
  if (currentPage === 'online') return <OnlineLecturePage setCurrentPage={setCurrentPage} setSelectedLecture={setSelectedLecture} />;
  if (currentPage === 'community') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} />;
  if (currentPage === 'attendance') return <AttendancePage user={user} />;
  if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} />;
  return <HomePage user={user} setCurrentPage={setCurrentPage} />;
}
 
function PageIntro({ ko, en, desc }) {
  return (
    <div className="px-5 pt-5 pb-6">
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ {en}</p>
      <h1 className="font-display text-4xl mt-3 tracking-tighter" style={{ color: COLORS.ink }}>{ko}<span className="glow-text" style={{ color: COLORS.primary }}>.</span></h1>
      {desc && <p className="font-serif-italic text-base mt-2" style={{ color: COLORS.stone }}>{desc}</p>}
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
    { id: 'community', label: 'COMMUNITY',    ko: '커뮤니티',    icon: Users },
    { id: 'market',    label: 'STORE',        ko: '재료샵',      icon: ShoppingBag },
  ];

  return (
    <div className="pb-6">
      {/* 환영 메시지 */}
      <section className="px-5 pt-6 pb-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Today</p>
        <h2 className="font-display text-[42px] leading-[1] mt-3 tracking-tighter" style={{ color: COLORS.ink }}>
          Hello,<br />
          <span style={{ color: COLORS.primary }} className="glow-text">{user.name}</span>
        </h2>
        <p className="font-serif-italic text-lg mt-3" style={{ color: COLORS.stone }}>Where craft meets artistry.</p>
      </section>

      {/* 히어로 카드 - 최신 강의 */}
      <section className="px-5 mb-5">
        <button onClick={() => setCurrentPage('online')} className="w-full rounded-3xl p-6 text-left relative overflow-hidden glow-primary" style={{ background: COLORS.primary }}>
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
          <div className="relative" style={{ color: COLORS.white }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase opacity-80">━━ ONLINE CLASS</p>
            <h3 className="font-display text-2xl mt-2 leading-tight tracking-tight">새로운 강의가<br />업데이트 되었습니다</h3>
            <div className="flex items-center justify-between mt-5">
              <p className="font-body text-xs font-medium opacity-90">03 / 10</p>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: COLORS.white }}>
                <Play size={15} fill={COLORS.primary} style={{ color: COLORS.primary }} className="ml-0.5" />
              </div>
            </div>
            {/* 진도 바 */}
            <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <div className="h-full rounded-full" style={{ width: '30%', background: COLORS.white }}></div>
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
      <PageIntro ko="공지사항" en="Notice" desc="최신 소식을 확인하세요" />
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
 
function CoursePage() {
  const courses = [
    { level: 'Basic', title: '눈썹', en: 'Eyebrow Basic', duration: '6w', price: 1800000, desc: '엠보·콤보 기초 입문' },
    { level: 'Master', title: '눈썹', en: 'Eyebrow Master', duration: '10w', price: 3200000, desc: '콤보·머신까지 전문가 과정' },
    { level: 'Lip', title: '입술', en: 'Lip Tattoo', duration: '8w', price: 2800000, desc: '풀립부터 입술라인까지', hot: true },
    { level: 'Eye', title: '아이라인', en: 'Eye Line', duration: '6w', price: 2200000, desc: '내·외·점막 아이라인' },
    { level: 'All', title: '올인원', en: 'All-in-One Master', duration: '24w', price: 8500000, desc: '모든 반영구를 한번에', featured: true },
  ];
  return (
    <>
      <PageIntro ko="클래스" en="Class" desc="당신의 시그니처를 만들어보세요" />
      <div className="px-5 space-y-3">
        {courses.map((c, i) => (
          <div key={i} className="rounded-3xl p-5 relative overflow-hidden" style={{
            background: c.featured ? COLORS.ink : COLORS.card,
            border: c.featured ? 'none' : `1px solid ${COLORS.light}`
          }}>
            {c.featured && <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: `radial-gradient(circle, ${COLORS.primary}60, transparent 70%)` }}></div>}
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: COLORS.primary }}>{c.level}{c.hot && ' · HOT'}</p>
                  <h3 className="font-display text-3xl mt-1.5 tracking-tighter" style={{ color: c.featured ? COLORS.white : COLORS.ink }}>{c.title}</h3>
                  <p className="font-serif-italic text-sm mt-0.5" style={{ color: c.featured ? COLORS.cream : COLORS.stone, opacity: 0.7 }}>{c.en}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] font-bold tracking-widest" style={{ color: c.featured ? COLORS.primary : COLORS.stone }}>DURATION</p>
                  <p className="font-display text-2xl tracking-tight" style={{ color: c.featured ? COLORS.white : COLORS.ink }}>{c.duration}</p>
                </div>
              </div>
              <p className="font-body text-xs font-medium" style={{ color: c.featured ? COLORS.cream : COLORS.stone, opacity: c.featured ? 0.8 : 1 }}>{c.desc}</p>
              <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${c.featured ? 'rgba(255,255,255,0.15)' : COLORS.light}` }}>
                <div>
                  <p className="font-mono text-[9px] font-bold tracking-widest" style={{ color: c.featured ? COLORS.primary : COLORS.stone }}>PRICE</p>
                  <p className="font-display text-xl tracking-tight" style={{ color: c.featured ? COLORS.white : COLORS.ink }}>₩{(c.price / 10000).toFixed(0)}<span className="font-body text-xs font-medium">만</span></p>
                </div>
                <button className="font-heading text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5" style={{ background: c.featured ? COLORS.primary : COLORS.ink, color: COLORS.white }}>
                  신청하기 <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
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
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === cat ? COLORS.ink : COLORS.card,
                color: filter === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === cat ? COLORS.ink : COLORS.light}`
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
      <PageIntro ko="포트폴리오" en="My Portfolio" desc="나만의 시술 기록을 남기세요" />
      <div className="px-5 space-y-3">

        {/* 새 케이스 추가 버튼 */}
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            <Plus size={16} strokeWidth={2.5} />새 케이스 추가
          </button>
        )}

        {/* 새 케이스 작성 폼 */}
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
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
// 💬 QnaDetailPage - Q&A 상세보기 (답변 + 댓글 + 좋아요)
// =============================================================
function QnaDetailPage({ qna, user }) {
  const [author, setAuthor] = useState(null);

  useEffect(() => {
    if (!qna?.user_id) return;
    supabase.from('profiles').select('name, avatar_color, role').eq('id', qna.user_id).maybeSingle()
      .then(({ data }) => setAuthor(data));
  }, [qna?.user_id]);

  if (!qna) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>질문을 찾을 수 없습니다.</p>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 mt-3">
            <Avatar user={author} size="sm" />
            <div>
              <p className="font-heading text-xs" style={{ color: COLORS.ink }}>{author.name}</p>
              <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(qna.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric' })}</p>
            </div>
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

function QnaPage({ user, setCurrentPage, setSelectedQna }) {
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: '시술' });
  const [loading, setLoading] = useState(false);
 
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
    setForm({ title: '', content: '', category: '시술' });
    setShowForm(false);
    await load();
    setLoading(false);
  };

  const openDetail = (q) => {
    setSelectedQna(q);
    setCurrentPage('qna-detail');
  };
 
  return (
    <>
      <PageIntro ko="Q&A" en="Questions" desc="궁금한 점을 물어보세요" />
      <div className="px-5 space-y-3">
        <button onClick={() => setShowForm(!showForm)} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
          <Plus size={16} strokeWidth={2.5} />질문하기
        </button>
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
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
        {questions.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>등록된 질문이 없습니다</p>
        ) : questions.map(q => (
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
 
function LibraryPage() {
  const [files, setFiles] = useState([]);
  useEffect(() => {
    supabase.from('library_files').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setFiles(data || []));
  }, []);
  return (
    <>
      <PageIntro ko="자료실" en="Library" desc="언제든 다운로드 받으세요" />
      <div className="px-5">
        {files.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>등록된 자료가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl" style={{ background: COLORS.peach }}>
                  <FolderOpen size={20} style={{ color: COLORS.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-xs truncate" style={{ color: COLORS.ink }}>{f.name}</p>
                  <p className="font-mono text-[10px] font-medium mt-0.5" style={{ color: COLORS.stone }}>{f.file_type} · {f.file_size}</p>
                </div>
                <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.cardElev }}>
                  <Download size={14} style={{ color: COLORS.ink }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
 
function MarketPage() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => setProducts(data || []));
  }, []);
  return (
    <>
      <PageIntro ko="재료샵" en="Market" desc="수강생 전용 가격으로 만나보세요" />
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          {products.map(p => (
            <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <div className="relative aspect-square flex items-center justify-center" style={{ background: COLORS.cream }}>
                <span className="text-5xl" style={{ color: COLORS.primary }}>{p.emoji}</span>
                {p.colors && p.colors.length > 0 && (
                  <div className="absolute bottom-2 flex gap-1">
                    {p.colors.map((c, j) => <div key={j} className="w-4 h-4 rounded-full" style={{ background: c, border: `1.5px solid ${COLORS.white}` }}></div>)}
                  </div>
                )}
                {p.badge && (
                  <span className="absolute top-2 left-2 font-mono text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded" style={{
                    background: p.badge === 'BEST' ? COLORS.ink : p.badge === 'NEW' ? COLORS.primary : COLORS.peach,
                    color: p.badge === 'SALE' ? COLORS.deep : COLORS.white
                  }}>{p.badge}</span>
                )}
              </div>
              <div className="p-3">
                <p className="font-mono text-[8px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>{p.brand}</p>
                <h4 className="font-body text-[11px] font-semibold mt-1 leading-tight line-clamp-2 min-h-[2.5em]" style={{ color: COLORS.ink }}>{p.name}</h4>
                {p.original_price > p.price && <p className="font-mono text-[9px] line-through mt-1" style={{ color: COLORS.stone }}>{p.original_price.toLocaleString()}원</p>}
                <p className="font-display text-base mt-0.5 tracking-tight" style={{ color: COLORS.ink }}>{p.price.toLocaleString()}<span className="font-body text-[10px] font-medium" style={{ color: COLORS.stone }}>원</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
 
function OnlineLecturePage({ setCurrentPage, setSelectedLecture }) {
  const [lectures, setLectures] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('lectures').select('*').eq('is_published', true).order('created_at', { ascending: false })
      .then(({ data }) => { setLectures(data || []); setLoading(false); });
  }, []);

  const categories = ['전체', '기초', '심화', '테크닉'];
  const filtered = filter === '전체' ? lectures : lectures.filter(l => l.category === filter);

  const openDetail = (lecture) => {
    setSelectedLecture(lecture);
    setCurrentPage('lecture-detail');
  };

  return (
    <>
      <PageIntro ko="온라인 강의" en="Lectures" desc="언제 어디서나 학습하세요" />

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
              {filter === '전체' ? '아직 등록된 강의가 없습니다' : `${filter} 카테고리 강의가 없습니다`}
            </p>
          </div>
        ) : filtered.map(l => (
          <button key={l.id} onClick={() => openDetail(l)}
            className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="relative aspect-video">
              {l.thumbnail_url ? (
                <img src={l.thumbnail_url} alt={l.title} className="w-full h-full object-cover" />
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
              <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>
                {l.instructor} · {l.level || 'Basic'}
              </p>
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
 
function SimulatorPage() {
  const [skinTone, setSkinTone] = useState('#F5DEB3');
  const [pigment, setPigment] = useState('#FF5C1F');
  const [area, setArea] = useState('eyebrow');
  const mixColors = (c1, c2, ratio = 0.55) => {
    const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => '#' + [r,g,b].map(x => Math.round(x).toString(16).padStart(2,'0')).join('');
    const a = hex2rgb(c1), b = hex2rgb(c2);
    return rgb2hex([0,1,2].map(i => a[i] * (1-ratio) + b[i] * ratio));
  };
  const result = mixColors(skinTone, pigment, 0.45);
  const faded2w = mixColors(skinTone, pigment, 0.32);
  const faded1m = mixColors(skinTone, pigment, 0.22);
  const skinTones = ['#FFE4D0', '#F5D4B5', '#E8C29D', '#D2A07A', '#A87454'];
  const pigments = [
    { name: '브라운', value: '#8B6F5C' }, { name: '딥브라운', value: '#5C463A' },
    { name: '소프트', value: '#A08770' }, { name: '오렌지', value: '#FF5C1F' },
    { name: '코랄', value: '#FF7556' }, { name: '누드', value: '#D4A593' },
    { name: '블랙', value: '#2D2520' }, { name: '차콜', value: '#4A4036' },
  ];
  return (
    <>
      <PageIntro ko="색소 시뮬레이터" en="Simulator" desc="피부톤과 색소의 만남" />
      <div className="px-5 space-y-3">
        <section className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>01 / Area</p>
          <h3 className="font-heading text-sm mt-1 mb-3" style={{ color: COLORS.ink }}>시술 부위</h3>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'eyebrow', label: '눈썹' }, { id: 'lip', label: '입술' }, { id: 'eyeline', label: '아이라인' }].map(a => (
              <button key={a.id} onClick={() => setArea(a.id)} className="py-3 rounded-xl font-body text-xs font-semibold"
                style={{ background: area === a.id ? COLORS.ink : COLORS.cream, color: area === a.id ? COLORS.cream : COLORS.ink }}>{a.label}</button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>02 / Skin</p>
          <h3 className="font-heading text-sm mt-1 mb-3" style={{ color: COLORS.ink }}>피부톤</h3>
          <div className="grid grid-cols-5 gap-1.5">
            {skinTones.map(v => (
              <button key={v} onClick={() => setSkinTone(v)} className="aspect-square rounded-xl"
                style={{ background: v, border: skinTone === v ? `3px solid ${COLORS.ink}` : `1px solid ${COLORS.light}`, transform: skinTone === v ? 'scale(0.92)' : 'scale(1)' }}></button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>03 / Pigment</p>
          <h3 className="font-heading text-sm mt-1 mb-3" style={{ color: COLORS.ink }}>색소</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {pigments.map(p => (
              <button key={p.value} onClick={() => setPigment(p.value)} className="aspect-square rounded-xl flex items-end justify-center pb-1"
                style={{ background: p.value, border: pigment === p.value ? `3px solid ${COLORS.ink}` : `1px solid ${COLORS.light}`, transform: pigment === p.value ? 'scale(0.92)' : 'scale(1)' }}>
                <span className="font-body text-[8px] font-bold" style={{ color: COLORS.card, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{p.name}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-3xl p-5" style={{ background: COLORS.cardElev }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Result</p>
          <h3 className="font-display text-2xl mt-1 mb-4 tracking-tight" style={{ color: COLORS.white }}>발색 예측</h3>
          <div className="aspect-video flex items-center justify-center rounded-2xl mb-4 overflow-hidden" style={{ background: skinTone }}>
            {area === 'eyebrow' && (<svg width="180" height="60" viewBox="0 0 240 80"><path d="M 20 50 Q 60 20, 120 30 T 220 45" stroke={result} strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.85" /></svg>)}
            {area === 'lip' && (<svg width="180" height="90" viewBox="0 0 240 120"><path d="M 30 60 Q 80 40, 120 50 Q 160 40, 210 60 Q 160 90, 120 80 Q 80 90, 30 60 Z" fill={result} opacity="0.85" /></svg>)}
            {area === 'eyeline' && (<svg width="180" height="60" viewBox="0 0 240 80"><path d="M 30 45 Q 120 35, 210 45" stroke={result} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.9" /></svg>)}
          </div>
          <div className="space-y-2">
            {[{ label: '시술 직후', color: result }, { label: '2주 후', color: faded2w }, { label: '1개월 후', color: faded1m }].map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="w-10 h-10 shrink-0 rounded-lg" style={{ background: p.color }}></div>
                <p className="font-body text-xs font-semibold flex-1" style={{ color: COLORS.white }}>{p.label}</p>
                <p className="font-mono text-[10px] font-bold" style={{ color: COLORS.primary }}>{p.color}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// =============================================================
// 💬 PostDetailPage - 커뮤니티 글 상세보기 (댓글 + 좋아요)
// =============================================================
function PostDetailPage({ post, user }) {
  const [author, setAuthor] = useState(null);

  useEffect(() => {
    if (!post?.user_id) return;
    supabase.from('profiles').select('name, avatar_color, role').eq('id', post.user_id).maybeSingle()
      .then(({ data }) => setAuthor(data));
  }, [post?.user_id]);

  if (!post) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="px-5 pt-5 pb-4">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Community</p>
      </div>

      <div className="px-5">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {/* 작성자 */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar user={author || { name: '익명' }} size="md" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{author?.name || '익명'}</p>
                {author?.role === 'admin' && (
                  <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>ADMIN</span>
                )}
              </div>
              <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(post.created_at).toLocaleString('ko-KR')}</p>
            </div>
          </div>

          {/* 본문 */}
          <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
            {post.content}
          </p>

          {/* 좋아요 */}
          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <LikeButton targetType="community_post" targetId={post.id} userId={user.id} size={16} />
          </div>

          {/* 댓글 */}
          <CommentSection targetType="community_post" targetId={post.id} user={user} />
        </div>
      </div>
    </div>
  );
}

function CommunityPage({ user, setCurrentPage, setSelectedPost }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === 'admin';
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    // 게시글 가져오기
    const { data: postsData } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!postsData || postsData.length === 0) {
      setPosts([]);
      return;
    }
    
    // 작성자 프로필 가져오기
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
    await supabase.from('community_posts').insert({ content: newPost, user_id: user.id });
    setNewPost('');
    await load();
    setLoading(false);
  };

  const openDetail = (p) => {
    setSelectedPost(p);
    setCurrentPage('post-detail');
  };
 
  return (
    <>
      <PageIntro ko="커뮤니티" en="Community" desc="동료들과 이야기 나눠보세요" />
      <div className="px-5 space-y-3">
        {/* 글 작성 */}
        <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="무슨 생각을 하고 계세요?" rows={2}
            className="w-full font-body text-xs font-medium p-2 outline-none resize-none rounded" style={{ color: COLORS.ink }} />
          <button onClick={submit} disabled={loading} className="float-right mt-1 font-heading text-[11px] px-4 py-2 rounded-full flex items-center gap-1" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Post
          </button>
          <div className="clear-both"></div>
        </div>

        {/* 게시글 목록 */}
        {posts.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>첫 게시글을 남겨보세요!</p>
        ) : posts.map(p => (
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
      </div>
    </>
  );
}
 
function AttendancePage({ user }) {
  return (
    <>
      <PageIntro ko="출석·진도" en="Attendance" desc="나의 학습 현황" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '출석', value: user.attendance_rate || 0, unit: '%', highlight: true },
            { label: '진도', value: user.progress_rate || 0, unit: '%' },
            { label: '상태', value: user.status === 'completed' ? '수료' : '진행', unit: '' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-2xl" style={{
              background: s.highlight ? COLORS.primary : COLORS.card,
              border: s.highlight ? 'none' : `1px solid ${COLORS.light}`
            }}>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: s.highlight ? COLORS.white : COLORS.stone, opacity: s.highlight ? 0.9 : 1 }}>{s.label}</p>
              <p className="font-display text-3xl mt-1 leading-none tracking-tight" style={{ color: s.highlight ? COLORS.white : COLORS.ink }}>{s.value}<span className="font-body text-sm font-medium">{s.unit}</span></p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
 
function MyPage({ user, handleLogout }) {
  const isAdmin = user.role === 'admin';
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState(user.avatar_color || 'orange');
  const [saving, setSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState('checking');
  const [notifLoading, setNotifLoading] = useState(false);

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
      </div>
    </>
  );
}
 
function AdminDashboard({ setCurrentPage }) {
  const [stats, setStats] = useState({ students: 0, lectures: 0, pendingQna: 0 });

  useEffect(() => {
    const load = async () => {
      const [{ count: students }, { count: lectures }, { count: pendingQna }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('lectures').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setStats({ students: students || 0, lectures: lectures || 0, pendingQna: pendingQna || 0 });
    };
    load();
  }, []);

  // 통계 데이터
  const statsList = [
    { label: '수강생',      value: stats.students,   highlight: true, target: 'admin-students' },
    { label: '진행 강의',   value: stats.lectures,                    target: 'online' },
    { label: '미답변 Q&A',  value: stats.pendingQna,                  target: 'admin-qna' },
    { label: '월 매출',     value: '0',                               target: 'revenue-soon' },
  ];

  // Quick Action 그리드 (홈 화면과 같은 디자인 언어)
  const quickActions = [
    { id: 'admin-notice',   label: 'NOTICE',   ko: '공지 관리',   icon: Bell },
    { id: 'admin-students', label: 'STUDENTS', ko: '수강생 관리', icon: UserCheck },
    { id: 'admin-qna',      label: 'Q&A',      ko: 'Q&A 답변',    icon: MessageCircle },
    { id: 'admin-cases',    label: 'CASES',    ko: '케이스 관리', icon: Camera },
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

      {/* 오늘의 미션 - 답변 대기 Q&A 있을 때 */}
      {stats.pendingQna > 0 && (
        <section className="px-5 mb-5">
          <button onClick={() => setCurrentPage('admin-qna')} className="w-full rounded-3xl p-6 text-left relative overflow-hidden glow-primary" style={{ background: COLORS.primary }}>
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
            <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }}></div>
            <div className="relative" style={{ color: COLORS.white }}>
              <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase opacity-80">━━ Today's Mission</p>
              <h3 className="font-display text-2xl mt-2 leading-tight tracking-tight">답변 기다리는<br />질문 {stats.pendingQna}건</h3>
              <div className="flex items-center justify-between mt-5">
                <p className="font-body text-xs font-medium opacity-90">수강생들이 기다려요</p>
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: COLORS.white }}>
                  <ArrowUpRight size={16} strokeWidth={2.5} style={{ color: COLORS.primary }} />
                </div>
              </div>
            </div>
          </button>
        </section>
      )}

      {/* 통계 카드 */}
      <section className="px-5 mb-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3 px-1" style={{ color: COLORS.primary }}>━━ Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {statsList.map((s, i) => (
            <button key={i} onClick={() => {
              if (s.target === 'revenue-soon') {
                alert('💳 결제 시스템(토스페이먼츠) 도입 후 표시됩니다!');
              } else {
                setCurrentPage(s.target);
              }
            }} className={`rounded-2xl p-4 text-left transition-transform active:scale-95 ${s.highlight ? 'glow-primary' : ''}`} style={{
              background: s.highlight ? COLORS.primary : COLORS.card,
              border: s.highlight ? 'none' : `1px solid ${COLORS.light}`
            }}>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: s.highlight ? COLORS.white : COLORS.stone, opacity: s.highlight ? 0.9 : 1 }}>{s.label}</p>
              <p className="font-display text-3xl mt-1 leading-none tracking-tight" style={{ color: s.highlight ? COLORS.white : COLORS.ink }}>{s.value}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Action 2x2 그리드 */}
      <section className="px-5">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase mb-3 px-1" style={{ color: COLORS.primary }}>━━ Quick Action</p>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setCurrentPage(item.id)}
                className="aspect-square rounded-3xl p-5 flex flex-col justify-between transition-transform active:scale-95 text-left relative overflow-hidden"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
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
    </div>
  );
}

function AdminNotice({ user, setCurrentPage, setSelectedNotice }) {
  const [notices, setNotices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tag: '안내', urgent: false, sendPush: true });
  const [loading, setLoading] = useState(false);
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

  const submit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('notices').insert({
        title: form.title,
        content: form.content,
        tag: form.tag,
        urgent: form.urgent,
        author_id: user.id
      });
      if (insertError) throw insertError;

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
            }),
          }
        );
        const result = await response.json();
        console.log('알림 전송 결과:', result);
        if (result.sent > 0) {
          alert(`✅ 공지 등록 완료!\n📢 ${result.sent}명에게 알림 전송됨`);
        } else {
          alert('공지 등록 완료! (알림 전송 실패 또는 구독자 없음)');
        }
      } else {
        alert('공지 등록 완료!');
      }

      setForm({ title: '', content: '', tag: '안내', urgent: false, sendPush: true });
      setShowForm(false);
      await load();
    } catch (err) {
      console.error(err);
      alert('등록 실패: ' + err.message);
    }
    setLoading(false);
  };

  const remove = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await supabase.from('notices').delete().eq('id', id);
    await load();
  };

  return (
    <>
      <PageIntro ko="공지 관리" en="Notice Admin" />
      <div className="px-5 space-y-3">
        <button onClick={() => setShowForm(!showForm)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
          <Plus size={14} strokeWidth={2.5} />새 공지
        </button>
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <select value={form.tag} onChange={e => setForm({...form, tag: e.target.value})}
              className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
              <option>필독</option><option>안내</option><option>이벤트</option>
            </select>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="공지 제목" className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="공지 내용" rows={4} className="w-full font-body text-xs font-medium p-2 outline-none resize-none rounded" style={{ background: COLORS.cream, color: COLORS.ink }} />
            <label className="flex items-center gap-2 font-body text-xs" style={{ color: COLORS.stone }}>
              <input type="checkbox" checked={form.urgent} onChange={e => setForm({...form, urgent: e.target.checked})} />
              긴급 공지로 표시
            </label>

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

            <button onClick={submit} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.cardElev, color: COLORS.white }}>
              {loading && <Loader2 size={12} className="animate-spin" />}발행
            </button>
          </div>
        )}
        {notices.map(n => (
          <div key={n.id} onClick={() => { setSelectedNotice(n); setCurrentPage('notice-detail'); }}
            className="rounded-2xl p-4 cursor-pointer transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                background: n.urgent ? COLORS.primary : COLORS.peach,
                color: n.urgent ? COLORS.white : COLORS.deep
              }}>{n.tag}</span>
              <button onClick={(e) => { e.stopPropagation(); remove(n.id); }} className="p-1">
                <Trash2 size={12} style={{ color: COLORS.stone }} />
              </button>
            </div>
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{n.title}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
              <div className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.primary }}>
                자세히 보기 <ChevronRight size={11} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AdminStudents() {
  const [students, setStudents] = useState([]);
  useEffect(() => {
    supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false })
      .then(({ data }) => setStudents(data || []));
  }, []);
  return (
    <>
      <PageIntro ko="수강생 관리" en="Students" />
      <div className="px-5 space-y-3">
        <div className="rounded-2xl p-3 text-center" style={{ background: COLORS.primary }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>전체 수강생</p>
          <p className="font-display text-3xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{students.length}명</p>
        </div>
        {students.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>아직 등록된 수강생이 없습니다</p>
        ) : students.map(s => (
          <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <div className="text-3xl">{s.avatar}</div>
            <div className="flex-1">
              <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{s.name}</p>
              <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{s.email}</p>
              <p className="font-serif-italic text-xs mt-1" style={{ color: COLORS.primary }}>{s.course}</p>
            </div>
          </div>
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
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold"
              style={{
                background: filter === f ? COLORS.ink : COLORS.card,
                color: filter === f ? COLORS.white : COLORS.ink,
                border: `1px solid ${filter === f ? COLORS.ink : COLORS.light}`
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
                  <img src={c.image_urls[0]} alt={c.title} className="w-full h-full object-cover" />
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
    });
    setEditingId(lecture.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
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
          <div key={l.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: l.is_published ? 1 : 0.6 }}>
            <div className="relative aspect-video">
              {l.thumbnail_url ? (
                <img src={l.thumbnail_url} alt={l.title} className="w-full h-full object-cover" />
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

              <div className="flex gap-2 mt-3">
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
    console.log('Q&A 로드됨:', enriched.length, '건');
  };
 
  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    await supabase.from('questions').update({
      answer, status: 'answered',
      answered_by: user.id, answered_at: new Date().toISOString()
    }).eq('id', selected.id);
    setAnswer(''); setSelected(null);
    await load();
    setLoading(false);
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
        {questions.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>등록된 질문이 없습니다</p>
        ) : questions.map(q => (
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
 