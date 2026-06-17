import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';

// 🔗 currentPage(문자열) ↔ URL 경로 매핑 (점진적 react-router 전환용 어댑터)
// 상세 페이지: currentPage ↔ URL prefix (딥링크 /prefix/:id)
const DETAIL_PAGES = {
  'product-detail': 'product',
  'course-detail': 'course',
  'notice-detail': 'notice',
  'post-detail': 'post',
  'lecture-detail': 'lecture',
  'qna-detail': 'qna',
  'trend-detail': 'trend',
  'tip-detail': 'tip',
  'library-detail': 'library',
};
const PREFIX_TO_DETAIL = Object.fromEntries(
  Object.entries(DETAIL_PAGES).map(([page, prefix]) => [prefix, page])
);

const pageToPath = (p, id) => {
  if (!p || p === 'home') return '/';
  const prefix = DETAIL_PAGES[p];
  if (prefix && id != null && id !== '') return '/' + prefix + '/' + id;
  return '/' + p;
};
const pathToPage = (path) => {
  const segs = (path || '/').split('/').filter(Boolean);
  if (segs.length === 0) return 'home';
  // /product/123 처럼 2세그먼트 + 알려진 prefix → 상세 페이지
  if (segs.length >= 2 && PREFIX_TO_DETAIL[segs[0]]) return PREFIX_TO_DETAIL[segs[0]];
  return segs[0];
};
const pathToId = (path) => {
  const segs = (path || '/').split('/').filter(Boolean);
  if (segs.length >= 2 && PREFIX_TO_DETAIL[segs[0]]) return decodeURIComponent(segs[1]);
  return null;
};
import {
  Home, Bell, BellOff, BookOpen, Award, MessageCircle, FolderOpen, Sparkles,
  ShoppingBag, PlayCircle, Users, Heart, ChevronRight, Clock,
  Check, Plus, Send, Lock, Mail, Edit3, Download, Play, Upload,
  Palette, BarChart3, Trash2, ChevronLeft, ShoppingCart,
  Shield, UserCheck, UserPlus, CreditCard, AlertCircle, Camera, Image as ImageIcon,
  ArrowRight, ArrowUpRight, Loader2,
  User, LogOut, Menu, X, Search, FileText, Package, Truck, Calendar
} from 'lucide-react';
import { AVATAR_COLORS, getInitial, COLORS } from './lib/colors';
import { LEGAL_TERMS, LEGAL_PRIVACY, LEGAL_REFUND } from './lib/legal';
import {
  compressImage, uploadCaseImage, deleteCaseImage, isYouTubeUrl,
  uploadPostVideo, deletePostVideo, uploadImageToBucket, deleteImageFromBucket,
  persistFormImages, getRowImages,
} from './lib/images';
import {
  subscribeToNotifications, unsubscribeFromNotifications,
  notifyAdminsOfStaffActivity, checkNotificationStatus,
} from './lib/notifications';
import { useDraft, useNewPages, useLatestLecture, useRecentUpdates } from './hooks';
import {
  MultiImageField, ImageCarousel, LegalPage, SkeletonImage, Avatar, LevelCard, PageIntro, LikeButton, CommentSection, ToastHost, ConfirmHost,
} from './components/common';
import { useLevel, FEATURE_TIER, TIER_RANK, TIERS } from './lib/level';
import {
  HomePage, NoticeDetailPage, NoticePage, CoursePage, CourseDetailPage, BestCasePage, MyCasePage, QnaDetailPage, TrendsPage, TrendDetailPage, QnaPage, LibraryPage, LibraryDetailPage, MarketPage, OnlineLecturePage, LectureDetailPage, PostDetailPage, ProductDetailPage, PaymentPage, PaymentSuccessPage, PaymentFailPage, CommunityPage, MyActivityPage, MyPage, MyProfileEditPage, MyOrdersPage, MyPracticeBookingsPage, CartPage, CartCheckoutPage, OnboardingScreen, ImprovementsPage, TipsPage, TipDetailPage, PracticeBookingPage,
} from './pages/student';
// 🚀 admin 페이지는 코드 스플리팅 — 운영진이 admin 화면에 진입할 때만 별도 청크를 로드합니다.
//    (학생 사용자는 admin 코드를 다운로드하지 않음 → 초기 로딩 가벼워짐)
const lazyAdmin = (name) => lazy(() => import('./pages/admin').then(m => ({ default: m[name] })));
const AdminImprovements = lazyAdmin('AdminImprovements');
const AdminDashboard = lazyAdmin('AdminDashboard');
const AdminTrends = lazyAdmin('AdminTrends');
const AdminTips = lazyAdmin('AdminTips');
const AdminNotice = lazyAdmin('AdminNotice');
const AdminOrders = lazyAdmin('AdminOrders');
const AdminOrdersPage = lazyAdmin('AdminOrdersPage');
const PracticeAdminPage = lazyAdmin('PracticeAdminPage');
const AdminApprovals = lazyAdmin('AdminApprovals');
const AdminStudentDetail = lazyAdmin('AdminStudentDetail');
const AdminStudents = lazyAdmin('AdminStudents');
const AdminCases = lazyAdmin('AdminCases');
const AdminLectures = lazyAdmin('AdminLectures');
const AdminProducts = lazyAdmin('AdminProducts');
const AdminCourses = lazyAdmin('AdminCourses');
const AdminLibrary = lazyAdmin('AdminLibrary');
const AdminQna = lazyAdmin('AdminQna');

// =============================================================
// 🖼️ MultiImageField - admin 폼 공용 여러 장 이미지 선택/미리보기
//   value: { image_urls: string[](기존 유지), imageFiles: File[](새로), imagePreviews: string[] }
//   onChange(nextValue)
// =============================================================

// =============================================================
// 🖼️ ImageCarousel - 여러 이미지를 가로 스와이프로 표시 (점 인디케이터)
// =============================================================

// 약관 공통 페이지 컴포넌트 (콘텐츠는 ./lib/legal)

export default function HSSUPApp() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // 🔗 페이지 상태를 URL과 연결 (뒤로가기·새로고침·딥링크는 react-router가 처리)
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = pathToPage(location.pathname);
  const routeId = pathToId(location.pathname);  // 상세 페이지 딥링크용 id (/product/:id)
  const setCurrentPage = useCallback((p, id) => { navigate(pageToPath(p, id)); }, [navigate]);
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
  const scrollPositions = useRef({}); // 페이지별 스크롤 위치(목록 복원용)
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

    // 🍊 PWA로 한 번이라도 진입한 적이 있으면 표시 (Safari에서 결제 후 안내 UI 분기에 사용)
    if (standalone) {
      try { localStorage.setItem('hssup_is_pwa_user', '1'); } catch (e) {}
    }

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
    // 쿼리(?orderId= 등)를 보존해야 PaymentSuccessPage가 주문을 조회할 수 있음
    if (paymentStatus === 'success') {
      navigate('/payment-success' + window.location.search, { replace: true });
    } else if (paymentStatus === 'fail') {
      navigate('/payment-fail' + window.location.search, { replace: true });
    }
  }, [profile]);

  // 🔔 푸시 알림 클릭 등에서 ?page=XXX 로 진입 시 해당 페이지로 라우팅
  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams(window.location.search);
    const targetPage = params.get('page');
    if (!targetPage) return;
    setCurrentPage(targetPage);  // navigate가 ?page= 쿼리를 정리함
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

  // 🍊 스크롤 처리: 상세 페이지는 맨 위에서 시작, 목록 페이지는 떠날 때 위치를 저장했다가
  //    뒤로 돌아오면 그 위치로 복원(상세 보고 목록 복귀 시 보던 곳 유지). 목록은 비동기 로드라
  //    높이가 늦게 잡히는 점을 감안해 잠깐 재시도.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const isDetail = /(-detail$)|^payment/.test(currentPage);
    const target = isDetail ? 0 : (scrollPositions.current[currentPage] ?? 0);
    let cancelled = false, tries = 0;
    const restore = () => {
      if (cancelled || !el) return;
      el.scrollTop = target;
      if (++tries < 12 && el.scrollTop < target - 2) setTimeout(restore, 40);
    };
    requestAnimationFrame(restore);
    return () => {
      cancelled = true;
      if (!isDetail) scrollPositions.current[currentPage] = el.scrollTop; // 목록 위치 저장
    };
  }, [currentPage, routeId]);

  const loadProfile = async (userId) => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      const defaultPage = (data.role === 'admin' || data.role === 'staff') ? 'dashboard' : 'home';
      const atRoot = window.location.pathname === '/';
      // ?payment= / ?page= 로 진입했으면 복원하지 않음(아래 별도 useEffect가 처리, 쿼리 보존)
      const hasDeepLinkParam = /[?&](payment|page)=/.test(window.location.search);

      // 🍊 최우선: Safari에서 결제 완료된 직후 PWA로 돌아왔다면 결제 성공 페이지로 자동 이동
      //    (PaymentSuccessPage가 Safari에서 작성한 flag를 PWA가 읽음)
      //    standalone(PWA) 모드일 때만 자동 라우팅 — Safari 사용자가 다음 방문 때마다 성공 페이지로
      //    튕기는 것 방지
      const isStandaloneNow = window.matchMedia('(display-mode: standalone)').matches
                          || window.navigator.standalone === true;
      if (isStandaloneNow) {
        try {
          const completedRaw = localStorage.getItem('hssup_payment_completed');
          if (completedRaw) {
            const c = JSON.parse(completedRaw);
            const COMPLETED_TTL = 30 * 60 * 1000;
            if (Date.now() - (c.ts || 0) < COMPLETED_TTL && c.userId === data.id && c.orderId) {
              setCurrentPage('payment-success');
              setLoading(false);
              return;
            } else {
              localStorage.removeItem('hssup_payment_completed');
            }
          }
        } catch (e) { /* 무시 */ }
      }

      if (hasDeepLinkParam) {
        // ?payment= / ?page= 진입 → 아래 useEffect 가 처리 (여기선 복원 스킵)
      } else if (atRoot) {
        // 루트로 진입(PWA 콜드스타트 등) → 마지막 페이지·결제 resume 복원
        const lastPage = sessionStorage.getItem('hssup_last_page');
        if (lastPage === 'payment' || lastPage === 'product-detail') {
          try {
            const sp = sessionStorage.getItem('hssup_sel_product');
            const sc = sessionStorage.getItem('hssup_sel_course');
            if (sp) setSelectedProduct(JSON.parse(sp));
            if (sc) setSelectedCourse(JSON.parse(sc));
          } catch (e) { /* 무시 */ }
          setCurrentPage(lastPage);
        } else if (lastPage) {
          setCurrentPage(lastPage);
        } else {
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
          if (!restored && defaultPage !== 'home') setCurrentPage(defaultPage);
        }
      } else {
        // URL이 특정 페이지를 가리킴(새로고침/딥링크) → 그 페이지 유지.
        //   결제 페이지(/payment, URL에 id 없음)만 selectedX 복원.
        //   상세 페이지(/product/:id 등)는 routeId로 직접 로딩하므로 복원 안 함(stale 방지).
        const cp = pathToPage(window.location.pathname);
        if (cp === 'payment') {
          try {
            const sp = sessionStorage.getItem('hssup_sel_product');
            const sc = sessionStorage.getItem('hssup_sel_course');
            if (sp) setSelectedProduct(JSON.parse(sp));
            if (sc) setSelectedCourse(JSON.parse(sc));
          } catch (e) { /* 무시 */ }
        }
      }
    }
    setLoading(false);
  };
 
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null); setSession(null); setDrawerOpen(false);
  };

  // 🍊 현재 로그인된 사용자의 profile만 다시 읽어와 상태 갱신 (loadProfile의 페이지 복원 로직 우회)
  const refreshUser = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) setProfile(data);
  };
 
  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  const canViewRevenue = profile?.role === 'admin';

  // 🏅 등급(수강생만 계산; 운영진은 null → 로딩 없이 면제). mark:true → 점수조회 전 오늘 출석 기록
  const studentId = isAdmin ? null : profile?.id;
  const level = useLevel(studentId, { mark: true });

  // 🔝 탑 레벨 페이지 (뒤로가기 버튼 안 보임, 햄버거만)
  const TOP_LEVEL_PAGES = isAdmin
    ? ['dashboard', 'admin-students', 'admin-qna', 'admin-notice', 'mypage']
    : ['home', 'course', 'market', 'community', 'mypage'];
  const isSubPage = profile && !TOP_LEVEL_PAGES.includes(currentPage);

  // 뒤로가기/앞으로가기·히스토리 기록은 이제 react-router(URL)가 처리합니다.

  // 🍊 페이지 상태를 sessionStorage에 저장 (PWA 콜드스타트 복원용)
  useEffect(() => {
    if (!profile || !currentPage) return;
    const SAVABLE_PAGES = [
      'home', 'dashboard', 'mypage', 'notice', 'qna', 'course', 'online',
      'best', 'mycase', 'library', 'market', 'community', 'freeboard',
      'greetings', 'reviews', 'improvements', 'my-activity', 'my-orders', 'my-profile-edit',
      'cart', 'cart-checkout', 'practice-booking', 'practice-admin', 'my-bookings',
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
    if (selectedProduct) sessionStorage.setItem('hssup_sel_product', JSON.stringify(selectedProduct));
  }, [selectedProduct]);
  useEffect(() => {
    if (selectedCourse) sessionStorage.setItem('hssup_sel_course', JSON.stringify(selectedCourse));
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

  // 🍊 드로어가 열려 있을 때 뒤로가기 → 드로어만 닫기 (페이지 이동 대신)
  useEffect(() => {
    if (!drawerOpen) return;
    window.history.pushState({ drawer: true }, '');
    const onPop = () => setDrawerOpen(false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [drawerOpen]);

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
      { id: 'mycase', label: '1:1 피드백', icon: Camera },
      { id: 'best', label: '베스트 케이스', icon: Award },
      { id: 'practice-booking', label: '연습 예약', icon: Calendar },
    ]},
    { section: 'CONNECT', items: [
      { id: 'notice', label: '학원공지', icon: Bell },
      { id: 'trends', label: '트렌드 속보', icon: Sparkles },
      { id: 'qna', label: 'Q&A', icon: MessageCircle },
      { id: 'greetings', label: '가입 인사', icon: Sparkles },
      { id: 'reviews', label: '수강후기', icon: Heart },
      { id: 'freeboard', label: '자유게시판', icon: Users },
      { id: 'improvements', label: '어플개선제안', icon: Edit3 },
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
      { id: 'admin-notice', label: '학원공지 관리', icon: Bell },
      { id: 'admin-trends', label: '트렌드 속보 관리', icon: Sparkles },
      { id: 'admin-tips', label: '수업·꿀팁 관리', icon: Sparkles },
      { id: 'admin-cases', label: '1:1 피드백 관리', icon: Camera },
      { id: 'admin-lectures', label: '강의 관리', icon: PlayCircle },
      { id: 'admin-products', label: '재료샵 관리', icon: ShoppingBag },
      { id: 'admin-library', label: '자료실 관리', icon: FolderOpen },
      { id: 'admin-courses', label: '클래스 관리', icon: BookOpen },
      { id: 'practice-admin', label: '연습 베드 관리', icon: Calendar },
      { id: 'admin-improvements', label: '어플개선제안 답변', icon: Edit3 },
    ]},
    { section: 'LEARN', items: [
      { id: 'home', label: '홈', icon: Home },
      { id: 'course', label: '클래스', icon: BookOpen },
      { id: 'online', label: '온라인 강의', icon: PlayCircle },
      { id: 'tips', label: '수업·꿀팁', icon: Sparkles },
    ]},
    { section: 'PRACTICE', items: [
      { id: 'mycase', label: '1:1 피드백', icon: Camera },
      { id: 'best', label: '베스트 케이스', icon: Award },
      { id: 'practice-booking', label: '연습 예약', icon: Calendar },
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
                {/* Pull-to-Refresh 인디케이터 */}
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
                  <Suspense fallback={<LoadingScreen />}>
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
                    user={profile} handleLogout={handleLogout} isAdmin={isAdmin} canViewRevenue={canViewRevenue}
                    refreshUser={refreshUser} routeId={routeId} level={level} />
                  </Suspense>
                </div>
              </main>
              <BottomTabBar tabs={tabs} currentPage={currentPage} setCurrentPage={setCurrentPage} setDrawerOpen={setDrawerOpen} />
              {drawerOpen && (
                <Drawer fullMenu={fullMenu} user={profile} isAdmin={isAdmin}
                  currentPage={currentPage}
                  setCurrentPage={(p) => { setCurrentPage(p); setDrawerOpen(false); }}
                  onClose={() => setDrawerOpen(false)} handleLogout={handleLogout} level={level} />
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

      {/* 전역 토스트 + 확인 모달 */}
      <ToastHost />
      <ConfirmHost />
    </div>
  );
}

// =============================================================
// 🖼️ SkeletonImage - 로딩 중 스켈레톤 깜빡임 (Instagram 스타일)
// =============================================================


// =============================================================
// ⭐ 등급 계산 헬퍼 (활동 + 매출 기반)
// =============================================================

// =============================================================
// ⭐ LevelCard - 등급 카드 (활동 + 매출 통합)
// =============================================================

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
          <p className="font-heading text-sm" style={{ color: COLORS.white }}>새 버전이 있어요! </p>
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
          <strong>{user.name}</strong>님 안녕하세요! <br /><br />
          가입 신청이 접수되었어요.<br />
          원장님께서 확인 후 승인해드릴게요.<br /><br />
          승인되면 모든 콘텐츠를 이용하실 수 있어요!
        </p>
      </div>

      <div className="mt-6 p-3 rounded-xl max-w-sm" style={{ background: COLORS.peach }}>
        <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.deep }}>
          보통 1~24시간 내에 승인됩니다.<br />
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
      icon: ''
    },
    {
      n: '2',
      title: '"홈 화면에 추가" 선택',
      desc: '메뉴를 아래로 스크롤해서 찾아주세요',
      icon: ''
    },
    {
      n: '3',
      title: '"추가" 탭',
      desc: '우측 상단의 "추가" 버튼을 눌러 완료!',
      icon: ''
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
            iPhone은 Apple 정책상 자동 설치가 불가능해서<br />수동으로 추가해주셔야 해요!
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
    phone: '', course: '토탈풀마스터', avatar_color: 'orange',
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
    } else {
      // 📢 가입승인 가능한 사람들(원장+운영진)에게 새 가입신청 알림
      //    send-push의 targetRole:'admin'은 내부적으로 admin+staff 모두 포함
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
            title: '새 가입 신청',
            body: `${signupForm.name || '신규 회원'}님 · ${signupForm.course || ''}`,
            url: '/?page=admin-approvals',
            targetRole: 'admin',
          }),
        });
      } catch (e) { console.error('가입 신청 알림 발송 실패:', e); }
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
      setInfo(`${findPwEmail}로 비밀번호 재설정 메일을 보냈어요!\n메일을 확인해주세요.`);
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
              가입 시 사용한 이메일을 입력하면<br/>비밀번호 재설정 링크를 보내드려요 
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
                    <option>토탈풀마스터</option><option>풀마스터</option><option>브로우마스터</option>
                    <option>원데이</option><option>단과반(엠보)</option><option>단과반(수지)</option><option>단과반(콤보)</option>
                  </select>
                </div>

                {/* 신입생 / 졸업생 선택 */}
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
                      <p className="font-body text-xs font-semibold" style={{ color: !signupForm.is_graduate ? COLORS.primary : COLORS.ink }}>
                        신입생
                      </p>
                    </button>
                    <button type="button" onClick={() => setSignupForm({ ...signupForm, is_graduate: true })}
                      className="rounded-xl p-3 transition-all text-center"
                      style={{ 
                        background: signupForm.is_graduate ? 'rgba(255,92,31,0.1)' : COLORS.card,
                        border: `1px solid ${signupForm.is_graduate ? COLORS.primary : COLORS.light}`,
                        boxShadow: signupForm.is_graduate ? '0 0 16px rgba(255, 92, 31, 0.2)' : 'none'
                      }}>
                      <p className="font-body text-xs font-semibold" style={{ color: signupForm.is_graduate ? COLORS.primary : COLORS.ink }}>
                        졸업생
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

                {/* 약관 동의 (필수) */}
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

      {/* 약관 보기 모달 (회원가입 화면용) */}
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
 
function Drawer({ fullMenu, user, isAdmin, currentPage, setCurrentPage, onClose, handleLogout, level }) {
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
              <p className="font-body text-xs opacity-70 mt-0.5" style={{ color: COLORS.stone }}>{user.course}</p>
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
                const needTier = !isAdmin ? FEATURE_TIER[item.id] : null;
                const locked = needTier && TIER_RANK[level?.tier || 'member'] < TIER_RANK[needTier];
                return (
                  <button key={item.id} onClick={() => setCurrentPage(item.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-body text-sm font-medium transition-transform active:scale-[0.98]"
                    style={{ background: isActive ? COLORS.primary : 'transparent', color: isActive ? COLORS.white : (locked ? COLORS.stone : COLORS.ink), boxShadow: isActive ? '0 0 12px rgba(255, 92, 31, 0.3)' : 'none' }}>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                    {locked && (
                      <span className="ml-auto flex items-center gap-1">
                        <span className="font-mono text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ background: TIERS[needTier].color, color: '#fff' }}>{TIERS[needTier].label}</span>
                        <Lock size={12} style={{ color: COLORS.stone }} />
                      </span>
                    )}
                    {!locked && newPages.includes(item.id) && (
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
 
function PageRouter({ currentPage, setCurrentPage, selectedNotice, setSelectedNotice, selectedQna, setSelectedQna, selectedPost, setSelectedPost, selectedLecture, setSelectedLecture, selectedCourse, setSelectedCourse, selectedProduct, setSelectedProduct, selectedStudent, setSelectedStudent, selectedTrend, setSelectedTrend, selectedTip, setSelectedTip, selectedLibrary, setSelectedLibrary, user, handleLogout, isAdmin, canViewRevenue, refreshUser, routeId, level }) {
  // Debug route removed
  // 🍊 온보딩 체크 - 가입 인사만 작성하면 전체 오픈 (신입생/졸업생 동일)
  const needsOnboarding = !isAdmin && user && !user.onb_greeting;
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
    if (currentPage === 'practice-admin') return <PracticeAdminPage user={user} setCurrentPage={setCurrentPage} />;
    if (currentPage === 'admin-students') return <AdminStudents setCurrentPage={setCurrentPage} setSelectedStudent={setSelectedStudent} />;
    if (currentPage === 'admin-student-detail') return <AdminStudentDetail student={selectedStudent} setCurrentPage={setCurrentPage} canViewRevenue={canViewRevenue} />;
    if (currentPage === 'admin-qna') return <AdminQna user={user} />;
    if (currentPage === 'admin-cases') return <AdminCases />;
    if (currentPage === 'admin-lectures') return <AdminLectures user={user} />;
    if (currentPage === 'admin-products') return <AdminProducts user={user} />;
    if (currentPage === 'admin-library') return <AdminLibrary user={user} />;
    if (currentPage === 'admin-courses') return <AdminCourses user={user} />;
    if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} setCurrentPage={setCurrentPage} refreshUser={refreshUser} />;
  }

  // 🏅 등급별 기능 잠금 (수강생만; 운영진 면제). 등급이 아직 안 정해졌으면(로딩/프로필 미확정) 잠금 대신 로딩 표시.
  if (!isAdmin && user) {
    const need = FEATURE_TIER[currentPage];
    if (need) {
      if (!level || level.loading) return <LoadingScreen />;
      if (TIER_RANK[level.tier || 'member'] < TIER_RANK[need]) {
        return <TierLockScreen need={need} level={level} setCurrentPage={setCurrentPage} />;
      }
    }
  }

  if (currentPage === 'notice-detail') return <NoticeDetailPage notice={selectedNotice} user={user} routeId={routeId} />;
  if (currentPage === 'qna-detail') return <QnaDetailPage qna={selectedQna} user={user} setCurrentPage={setCurrentPage} routeId={routeId} />;
  if (currentPage === 'post-detail') return <PostDetailPage post={selectedPost} user={user} setCurrentPage={setCurrentPage} routeId={routeId} />;
  if (currentPage === 'lecture-detail') return <LectureDetailPage lecture={selectedLecture} user={user} routeId={routeId} />;
  if (currentPage === 'payment') return <PaymentPage course={selectedCourse} product={selectedProduct} user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'payment-success') return <PaymentSuccessPage user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'payment-fail') return <PaymentFailPage setCurrentPage={setCurrentPage} />;
  if (currentPage === 'product-detail') return <ProductDetailPage product={selectedProduct} user={user} setCurrentPage={setCurrentPage} setSelectedCourse={setSelectedCourse} routeId={routeId} />;
  if (currentPage === 'course-detail') return <CourseDetailPage course={selectedCourse} user={user} setCurrentPage={setCurrentPage} setSelectedCourse={setSelectedCourse} setSelectedProduct={setSelectedProduct} routeId={routeId} />;
  if (currentPage === 'home') return <HomePage user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
  if (currentPage === 'notice') return <NoticePage user={user} setCurrentPage={setCurrentPage} setSelectedNotice={setSelectedNotice} />;
  if (currentPage === 'course') return <CoursePage user={user} setCurrentPage={setCurrentPage} setSelectedCourse={setSelectedCourse} setSelectedProduct={setSelectedProduct} />;
  if (currentPage === 'best') return <BestCasePage />;
  if (currentPage === 'mycase') return <MyCasePage user={user} />;
  if (currentPage === 'qna') return <QnaPage user={user} setCurrentPage={setCurrentPage} setSelectedQna={setSelectedQna} />;
  if (currentPage === 'trends') return <TrendsPage user={user} setCurrentPage={setCurrentPage} setSelectedTrend={setSelectedTrend} />;
  if (currentPage === 'trend-detail') return <TrendDetailPage trend={selectedTrend} user={user} routeId={routeId} />;
  if (currentPage === 'admin-trends') return <AdminTrends user={user} />;
  if (currentPage === 'tips') return <TipsPage user={user} setCurrentPage={setCurrentPage} setSelectedTip={setSelectedTip} />;
  if (currentPage === 'tip-detail') return <TipDetailPage tip={selectedTip} user={user} routeId={routeId} />;
  if (currentPage === 'admin-tips') return <AdminTips user={user} />;
  if (currentPage === 'library') return <LibraryPage setCurrentPage={setCurrentPage} setSelectedLibrary={setSelectedLibrary} />;
  if (currentPage === 'library-detail') return <LibraryDetailPage file={selectedLibrary} setCurrentPage={setCurrentPage} routeId={routeId} />;
  if (currentPage === 'market') return <MarketPage setCurrentPage={setCurrentPage} setSelectedProduct={setSelectedProduct} />;
  if (currentPage === 'online') return <OnlineLecturePage setCurrentPage={setCurrentPage} setSelectedLecture={setSelectedLecture} />;
  if (currentPage === 'community') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="자유" pageTitle="자유게시판" pageEn="Free Board" pageDesc="자유롭게 이야기 나눠보세요" />;
  if (currentPage === 'greetings') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="인사" pageTitle="가입 인사" pageEn="Greetings" pageDesc="신규 회원들을 따뜻하게 환영해주세요" />;
  if (currentPage === 'reviews') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="후기" pageTitle="수강후기" pageEn="Reviews" pageDesc="동료들의 수강 후기를 만나보세요" />;
  if (currentPage === 'freeboard') return <CommunityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} fixedCategory="자유" pageTitle="자유게시판" pageEn="Free Board" pageDesc="자유롭게 이야기 나눠보세요" />;
  if (currentPage === 'terms') return <LegalPage ko="이용약관" en="Terms of Service" desc="서비스 이용 규칙" content={LEGAL_TERMS} />;
  if (currentPage === 'privacy') return <LegalPage ko="개인정보처리방침" en="Privacy Policy" desc="개인정보 수집·이용 안내" content={LEGAL_PRIVACY} />;
  if (currentPage === 'refund') return <LegalPage ko="환불정책" en="Refund Policy" desc="수강료·상품 환불 안내" content={LEGAL_REFUND} />;
  if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} setCurrentPage={setCurrentPage} refreshUser={refreshUser} />;
  if (currentPage === 'my-activity') return <MyActivityPage user={user} setCurrentPage={setCurrentPage} setSelectedPost={setSelectedPost} />;
  if (currentPage === 'my-orders') return <MyOrdersPage user={user} />;
  if (currentPage === 'my-profile-edit') return <MyProfileEditPage user={user} setCurrentPage={setCurrentPage} refreshUser={refreshUser} />;
  if (currentPage === 'cart') return <CartPage user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'cart-checkout') return <CartCheckoutPage user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'practice-booking') return <PracticeBookingPage user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'my-bookings') return <MyPracticeBookingsPage user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'improvements') return <ImprovementsPage user={user} />;
  if (currentPage === 'admin-improvements') return <AdminImprovements user={user} />;
  return <HomePage user={user} setCurrentPage={setCurrentPage} />;
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

// =============================================================
// 💬 CommentSection 컴포넌트 (만능 댓글창)
// =============================================================


// =============================================================
// 📰 NoticeDetailPage - 공지 상세보기 (댓글 + 좋아요)
// =============================================================

 
 
 

// =============================================================
// 💬 QnaDetailPage - Q&A 상세보기 (수정/삭제 + 답변 + 댓글 + 좋아요)
// =============================================================

// =============================================================
// 🔥 TrendsPage - 트렌드 속보 (학생용 피드)
// =============================================================

// =============================================================
// 🔥 TrendDetailPage - 트렌드 속보 상세
// =============================================================

 
// =============================================================
// 📚 LibraryPage - 자료실 (학생용 - 보기 + 다운로드만)
// =============================================================
 
// =============================================================
// 📄 LibraryDetailPage - 자료 상세 (내용 보기 + 파일 다운로드)
// =============================================================

 

// =============================================================
// 🎬 LectureDetailPage - 영상 강의 상세 (YouTube 임베드)
// =============================================================

// =============================================================
// 💬 PostDetailPage - 커뮤니티 글 상세보기 (수정/삭제 + 댓글 + 좋아요)
// =============================================================

// =============================================================
// 🛍️ ProductDetailPage - 상품 상세 (이미지 + 설명 + 좋아요/댓글)
// =============================================================

// =============================================================
// 💳 PaymentPage - 결제 페이지 (토스 결제창 호출)
// =============================================================

// =============================================================
// ✅ PaymentSuccessPage - 결제 성공 페이지 (Edge Function이 검증 완료)
// =============================================================

// =============================================================
// ❌ PaymentFailPage - 결제 실패/취소 페이지
// =============================================================


// =============================================================
// 📋 MyActivityPage - 내가 쓴 게시글/댓글/좋아요
// =============================================================


// =============================================================
// ✏️ MyProfileEditPage - 내 정보 수정 (이름·전화)
// =============================================================

// =============================================================
// 📦 MyOrdersPage - 학생용 주문 내역 (결제 + 배송 상태)
// =============================================================

// =============================================================
// 🛏️ MyPracticeBookingsPage - 학생용 내 연습 예약 (다가오는 + 지난)
// =============================================================

// =============================================================
// 🛒 CartPage - 장바구니 (재료 상품)
// =============================================================

// =============================================================
// 🛒💳 CartCheckoutPage - 장바구니 결제 (orders 1건 + order_items N건)
//   기존 단일 결제(PaymentPage)와 완전히 별도. 결제 흐름은 동일하게 NicePay 사용.
//   금액 검증은 nicepay-return Edge Function에서 order_items 합계로 재검증.
// =============================================================

// =============================================================
// 🎯 OnboardingScreen - 신규 학생 온보딩 미션
// =============================================================

// =============================================================
// 💡 ImprovementsPage - 개선 제안 (학생용)
// =============================================================

// =============================================================
// 💡 AdminImprovements - 개선 제안 관리 (관리자용)
// =============================================================

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

// =============================================================
// 🔒 TierLockScreen - 등급 미달 잠금 화면 (수강생용)
// =============================================================
function TierLockScreen({ need, level, setCurrentPage }) {
  const t = TIERS[need];
  return (
    <div className="px-5 py-16 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: COLORS.card, border: `2px solid ${t.color}` }}>
        <Lock size={32} style={{ color: t.color }} strokeWidth={2.5} />
      </div>
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.stone }}>━━ {t.label} 전용</p>
      <h2 className="font-display text-2xl mt-3 tracking-tight" style={{ color: COLORS.ink }}>
        <span style={{ color: t.color }}>{t.label}</span> 등급부터 이용할 수 있어요
      </h2>
      <p className="font-body text-sm mt-2" style={{ color: COLORS.stone }}>{t.tagline}</p>

      <div className="mt-6 rounded-2xl p-5 text-left max-w-sm mx-auto" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
        <p className="font-body text-xs font-bold mb-2" style={{ color: COLORS.ink }}>승급 조건</p>
        {need === 'crew' && (
          <>
            <LockCond done={level?.greetingDone} label="가입 인사 작성" />
            <LockCond done={(level?.reviewsAll || 0) >= 1} label="수강 후기 작성 1회" />
          </>
        )}
        {need === 'master' && (
          <>
            <LockCond done={level?.crewMet} label="CREW 등급 달성" />
            <LockCond done={(level?.score || 0) >= 100} label={`최근 30일 활동 점수 100점 이상 (현재 ${level?.score || 0}점)`} />
          </>
        )}
        <p className="font-body text-[11px] mt-3" style={{ color: COLORS.primary }}>혜택 · {t.benefits.join(' · ')}</p>
      </div>

      <div className="flex gap-2 justify-center mt-6">
        <button onClick={() => setCurrentPage('mypage')}
          className="font-heading text-sm px-6 py-3 rounded-full"
          style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.4)' }}>
          내 등급 확인
        </button>
        <button onClick={() => setCurrentPage('home')}
          className="font-heading text-sm px-6 py-3 rounded-full"
          style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
          홈으로
        </button>
      </div>
    </div>
  );
}
function LockCond({ done, label }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 font-bold"
        style={{ background: done ? COLORS.primary : 'transparent', border: done ? 'none' : `1.5px solid ${COLORS.light}`, color: '#fff', fontSize: 10 }}>
        {done ? '✓' : ''}
      </span>
      <span className="font-body text-xs" style={{ color: done ? COLORS.ink : COLORS.stone }}>{label}</span>
    </div>
  );
}


// =============================================================
// 🔥 AdminTrends - 트렌드 속보 관리 (관리자용)
// =============================================================

// =============================================================
// 💡 TipsPage - 수업·꿀팁 공유방 (학생용)
// =============================================================

// =============================================================
// 💡 TipDetailPage - 수업·꿀팁 상세
// =============================================================

// =============================================================
// 💡 AdminTips - 수업·꿀팁 관리 (원장님·운영진)
// =============================================================


// =============================================================
// 📊 AdminOrders - 결제 내역 관리 페이지
// =============================================================

// =============================================================
// 📦 AdminOrdersPage - 주문/배송 관리 (admin + staff)
//   admin: 매출·카드·영수증까지 표시
//   staff: 배송 정보·발송 처리만 표시
// =============================================================

// =============================================================
// 🛏️ PracticeBookingPage - 연습 베드 예약 (수강생)
// =============================================================

// =============================================================
// 🛏️ PracticeAdminPage - 연습 베드 슬롯 관리 (admin/staff)
// =============================================================

// =============================================================
// 🔐 AdminApprovals - 가입 승인 관리 페이지
// =============================================================

// =============================================================
// 👤 AdminStudentDetail - 수강생 상세 정보 페이지 (관리자용)
// =============================================================

 




// =============================================================
// 📚 AdminLibrary - 자료실 관리 (업로드 + 수정 + 삭제 + 드래그앤드롭)
// =============================================================

 