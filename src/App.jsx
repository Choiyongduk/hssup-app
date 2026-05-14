import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  Home, Bell, BookOpen, Award, MessageCircle, FolderOpen, Sparkles,
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

const COLORS = {
  primary: '#FF5C1F', deep: '#D94614', peach: '#FFE8DD',
  cream: '#FAF6F1', ink: '#1A1A1A', stone: '#6B6661',
  light: '#E8E4DE', white: '#FFFFFF',
};
 
export default function HSSUPApp() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
 
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
 
  const studentTabs = [
    { id: 'home', label: '홈', icon: Home },
    { id: 'course', label: '클래스', icon: BookOpen },
    { id: 'simulator', label: '시뮬', icon: Palette },
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
      { id: 'simulator', label: '색소 시뮬레이터', icon: Palette },
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
    { section: 'OPERATE', items: [
      { id: 'dashboard', label: '대시보드', icon: BarChart3 },
      { id: 'admin-students', label: '수강생', icon: UserCheck },
      { id: 'admin-qna', label: 'Q&A 답변', icon: MessageCircle },
    ]},
    { section: 'CONTENT', items: [
      { id: 'admin-notice', label: '공지 관리', icon: Bell },
    ]},
    { section: 'MY', items: [
      { id: 'mypage', label: '마이페이지', icon: User },
    ]},
  ];
  const fullMenu = isAdmin ? adminMenu : studentMenu;
 
  return (
    <div className="min-h-screen flex items-center justify-center py-6 px-4" style={{ background: '#0A0A0A' }}>
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
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
 
      <div className="relative" style={{
        width: '390px', height: '844px', maxHeight: 'calc(100vh - 48px)',
        borderRadius: '54px', padding: '12px',
        background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <div className="relative w-full h-full overflow-hidden flex flex-col" style={{ borderRadius: '42px', background: COLORS.cream }}>
          <div className="shrink-0 px-7 pt-3 pb-1 flex items-center justify-between font-body text-xs font-semibold" style={{ color: COLORS.ink }}>
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal size={13} /><Wifi size={13} /><Battery size={15} />
            </div>
          </div>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-7 rounded-full z-50" style={{ background: '#1a1a1a' }}></div>
 
          {loading ? <LoadingScreen /> :
           !session || !profile ? <AuthScreen /> : (
            <>
              <AppHeader user={profile} isAdmin={isAdmin}
                onMenuClick={() => setDrawerOpen(true)}
                onLogoClick={() => setCurrentPage(isAdmin ? 'dashboard' : 'home')}
                onProfileClick={() => setCurrentPage('mypage')} />
              <main className="flex-1 overflow-y-auto scrollbar-hide pb-20">
                <div className="animate-fade-in">
                  <PageRouter currentPage={currentPage} setCurrentPage={setCurrentPage} user={profile} handleLogout={handleLogout} isAdmin={isAdmin} />
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
      </div>
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

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center" style={{ background: COLORS.cream }}>
      <h1 className="font-display text-5xl tracking-tighter" style={{ color: COLORS.ink }}>HSSUP<span style={{ color: COLORS.primary }}>.</span></h1>
      <p className="font-mono text-[10px] font-bold tracking-[0.4em] uppercase mt-2" style={{ color: COLORS.stone }}>Beauty Academy</p>
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
      <div className="relative h-[45%] flex flex-col justify-end p-7 overflow-hidden" style={{ background: COLORS.primary }}>
        <div className="absolute top-12 right-0 opacity-10">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="98" stroke={COLORS.white} strokeWidth="1" />
            <circle cx="100" cy="100" r="70" stroke={COLORS.white} strokeWidth="1" />
            <circle cx="100" cy="100" r="42" stroke={COLORS.white} strokeWidth="1" />
          </svg>
        </div>
        <div style={{ color: COLORS.white }}>
          <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase opacity-80">Beauty Academy</p>
          <h1 className="font-display text-[72px] leading-[0.85] mt-3 tracking-tighter">HSSUP<span style={{ fontSize: '60%' }}>.</span></h1>
          <p className="font-serif-italic text-2xl mt-4 opacity-90">Where craft meets <br />artistry.</p>
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
              style={{ background: COLORS.ink, color: COLORS.cream, borderRadius: '999px' }}>
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
              style={{ background: COLORS.ink, color: COLORS.cream, borderRadius: '999px' }}>
              <span className="flex items-center gap-2">{loading && <Loader2 size={14} className="animate-spin" />}Join HSSUP</span>
              <ArrowUpRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
 
function AppHeader({ user, isAdmin, onMenuClick, onProfileClick, onLogoClick }) {
  return (
    <header className="shrink-0 px-5 py-3.5 flex items-center justify-between" style={{ background: COLORS.cream, borderBottom: `1px solid ${COLORS.light}` }}>
      <button onClick={onMenuClick} className="p-1"><Menu size={20} style={{ color: COLORS.ink }} strokeWidth={2.5} /></button>
      <button onClick={onLogoClick} className="font-display text-xl tracking-tighter" style={{ color: COLORS.ink, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        HSSUP<span style={{ color: COLORS.primary }}>.</span>
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
      background: 'rgba(250, 246, 241, 0.95)', backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${COLORS.light}`, paddingBottom: '20px'
    }}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentPage === tab.id;
        return (
          <button key={tab.id} onClick={() => setCurrentPage(tab.id)} className="py-2.5 flex flex-col items-center gap-1 relative">
            {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full" style={{ background: COLORS.primary }}></span>}
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
        <div className="p-5 pt-12" style={{ background: COLORS.ink, color: COLORS.cream }}>
          <div className="flex items-center gap-3">
            <Avatar user={user} size="lg" />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-heading text-sm">{user.name}</p>
                {isAdmin && <span className="font-body text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>ADMIN</span>}
              </div>
              <p className="font-serif-italic text-xs opacity-70 mt-0.5">{user.course}</p>
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
 
function PageRouter({ currentPage, setCurrentPage, user, handleLogout, isAdmin }) {
  if (isAdmin) {
    if (currentPage === 'dashboard') return <AdminDashboard setCurrentPage={setCurrentPage} />;
    if (currentPage === 'admin-notice') return <AdminNotice user={user} />;
    if (currentPage === 'admin-students') return <AdminStudents />;
    if (currentPage === 'admin-qna') return <AdminQna user={user} />;
    if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} />;
  }
  if (currentPage === 'home') return <HomePage user={user} setCurrentPage={setCurrentPage} />;
  if (currentPage === 'notice') return <NoticePage />;
  if (currentPage === 'course') return <CoursePage />;
  if (currentPage === 'best') return <BestCasePage />;
  if (currentPage === 'mycase') return <MyCasePage user={user} />;
  if (currentPage === 'qna') return <QnaPage user={user} />;
  if (currentPage === 'library') return <LibraryPage />;
  if (currentPage === 'market') return <MarketPage />;
  if (currentPage === 'online') return <OnlineLecturePage />;
  if (currentPage === 'simulator') return <SimulatorPage />;
  if (currentPage === 'community') return <CommunityPage user={user} />;
  if (currentPage === 'attendance') return <AttendancePage user={user} />;
  if (currentPage === 'mypage') return <MyPage user={user} handleLogout={handleLogout} />;
  return <HomePage user={user} setCurrentPage={setCurrentPage} />;
}
 
function PageIntro({ ko, en, desc }) {
  return (
    <div className="px-5 pt-5 pb-6">
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ {en}</p>
      <h1 className="font-display text-4xl mt-3 tracking-tighter" style={{ color: COLORS.ink }}>{ko}<span style={{ color: COLORS.primary }}>.</span></h1>
      {desc && <p className="font-serif-italic text-base mt-2" style={{ color: COLORS.stone }}>{desc}</p>}
    </div>
  );
}
 
function HomePage({ user, setCurrentPage }) {
  const [notices, setNotices] = useState([]);
 
  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setNotices(data || []));
  }, []);
 
  return (
    <div className="pb-6">
      <section className="px-5 pt-6 pb-8">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Today</p>
        <h2 className="font-display text-[42px] leading-[1] mt-3 tracking-tighter" style={{ color: COLORS.ink }}>
          Hello,<br />
          <span style={{ color: COLORS.primary }}>{user.name}</span>
        </h2>
        <p className="font-serif-italic text-lg mt-3" style={{ color: COLORS.stone }}>Where craft meets artistry.</p>
      </section>
 
      <section className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '출석', value: user.attendance_rate || 87, unit: '%' },
            { label: '진도', value: user.progress_rate || 58, unit: '%' },
            { label: 'D-DAY', value: 42, unit: 'd' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-2xl" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
              <p className="font-mono text-[9px] font-bold tracking-widest" style={{ color: COLORS.stone }}>{s.label}</p>
              <p className="font-display text-3xl mt-1 leading-none" style={{ color: COLORS.ink }}>
                {s.value}<span className="font-body text-xs font-medium" style={{ color: COLORS.stone }}>{s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </section>
 
      <section className="px-5 mb-6">
        <button onClick={() => setCurrentPage('online')} className="w-full rounded-3xl p-6 text-left relative overflow-hidden" style={{ background: COLORS.primary }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}></div>
          <div className="relative" style={{ color: COLORS.white }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase opacity-80">Lesson 14</p>
            <h3 className="font-display text-2xl mt-2 leading-tight tracking-tight">콤보 브로우<br />디자인의 정수</h3>
            <div className="flex items-center justify-between mt-5">
              <p className="font-body text-xs font-medium opacity-90">김원장 · 42분</p>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: COLORS.white }}>
                <Play size={14} fill={COLORS.primary} style={{ color: COLORS.primary }} className="ml-0.5" />
              </div>
            </div>
          </div>
        </button>
      </section>
 
      <section className="mb-6">
        <div className="flex items-baseline justify-between px-5 mb-4">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Category</p>
            <h3 className="font-heading text-xl mt-1.5" style={{ color: COLORS.ink }}>시술 분야</h3>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-5 pb-1">
          {[
            { name: '눈썹', en: 'Eyebrow' }, { name: '아이라인', en: 'Eye Line' },
            { name: '입술', en: 'Lip' }, { name: '속눈썹', en: 'Lash' }, { name: '헤어라인', en: 'Hairline' },
          ].map((c, i) => (
            <button key={c.name} className="shrink-0 rounded-2xl px-5 py-4 text-left" style={{
              background: i === 0 ? COLORS.ink : COLORS.white,
              border: `1px solid ${i === 0 ? COLORS.ink : COLORS.light}`, minWidth: '110px'
            }}>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: i === 0 ? COLORS.primary : COLORS.stone }}>{c.en}</p>
              <p className="font-heading text-base mt-1" style={{ color: i === 0 ? COLORS.white : COLORS.ink }}>{c.name}</p>
            </button>
          ))}
        </div>
      </section>
 
      <section className="px-5 mb-6">
        <button onClick={() => setCurrentPage('simulator')} className="w-full rounded-3xl p-5 text-left relative overflow-hidden" style={{ background: COLORS.ink }}>
          <div className="absolute top-0 right-0 w-32 h-32" style={{ background: `radial-gradient(circle at top right, ${COLORS.primary}40, transparent 70%)` }}></div>
          <div className="relative" style={{ color: COLORS.white }}>
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ New</p>
            <h3 className="font-display text-2xl mt-2 tracking-tight">색소 시뮬레이터<span style={{ color: COLORS.primary }}>.</span></h3>
            <p className="font-body text-xs font-medium mt-2 opacity-80">피부톤과 색소를 매칭해 발색을 미리 확인하세요</p>
            <div className="inline-flex items-center gap-1.5 mt-4 font-body text-xs font-semibold" style={{ color: COLORS.primary }}>Try Now <ArrowUpRight size={14} /></div>
          </div>
        </button>
      </section>
 
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
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
          {notices.length === 0 ? (
            <p className="font-body text-xs text-center py-8" style={{ color: COLORS.stone }}>공지가 없습니다</p>
          ) : notices.map((n, i) => (
            <div key={n.id} className="flex items-center gap-3 p-4" style={{ borderBottom: i !== notices.length - 1 ? `1px solid ${COLORS.light}` : 'none' }}>
              <span className="font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded" style={{
                background: n.urgent ? COLORS.primary : COLORS.peach,
                color: n.urgent ? COLORS.white : COLORS.deep
              }}>{n.tag}</span>
              <p className="font-body text-xs font-medium flex-1 truncate" style={{ color: COLORS.ink }}>{n.title}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
 
function NoticePage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setNotices(data || []); setLoading(false); });
  }, []);
 
  if (loading) return <div className="flex justify-center p-10"><Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} /></div>;
 
  return (
    <>
      <PageIntro ko="공지사항" en="Notice" desc="최신 소식을 확인하세요" />
      <div className="px-5 space-y-2">
        {notices.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>등록된 공지가 없습니다</p>
        ) : notices.map(n => (
          <div key={n.id} className="rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded" style={{
                background: n.urgent ? COLORS.primary : COLORS.peach,
                color: n.urgent ? COLORS.white : COLORS.deep
              }}>{n.tag}</span>
              <span className="font-mono text-[10px] font-medium" style={{ color: COLORS.stone }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <p className="font-heading text-sm leading-snug" style={{ color: COLORS.ink }}>{n.title}</p>
            {n.content && <p className="font-body text-xs mt-2 leading-relaxed" style={{ color: COLORS.stone }}>{n.content}</p>}
          </div>
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
            background: c.featured ? COLORS.ink : COLORS.white,
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
  return (
    <>
      <PageIntro ko="베스트 케이스" en="Best Case" desc="동료들의 작품에서 영감을 얻으세요" />
      <div className="px-5 text-center py-10">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>아직 베스트 케이스가 없습니다</p>
        <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>관리자가 우수 케이스를 선정하면 표시됩니다</p>
      </div>
    </>
  );
}
 
function MyCasePage({ user }) {
  return (
    <>
      <PageIntro ko="포트폴리오" en="My Portfolio" desc="나만의 시술 기록을 남기세요" />
      <div className="px-5">
        <button className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white }}>
          <Plus size={16} strokeWidth={2.5} />새 케이스 추가
        </button>
        <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>아직 등록된 케이스가 없습니다</p>
      </div>
    </>
  );
}
 
function QnaPage({ user }) {
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
 
  return (
    <>
      <PageIntro ko="Q&A" en="Questions" desc="궁금한 점을 물어보세요" />
      <div className="px-5 space-y-3">
        <button onClick={() => setShowForm(!showForm)} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white }}>
          <Plus size={16} strokeWidth={2.5} />질문하기
        </button>
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }}>
              <option>시술</option><option>재료</option><option>수업</option><option>창업</option>
            </select>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="질문 제목" className="w-full font-body text-xs font-medium border-b py-2 bg-transparent outline-none" style={{ borderColor: COLORS.light, color: COLORS.ink }} />
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
              placeholder="질문 내용" rows={4} className="w-full font-body text-xs font-medium p-2 outline-none resize-none rounded" style={{ background: COLORS.cream, color: COLORS.ink }} />
            <button onClick={submit} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.ink, color: COLORS.white }}>
              {loading && <Loader2 size={12} className="animate-spin" />}등록
            </button>
          </div>
        )}
        {questions.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>등록된 질문이 없습니다</p>
        ) : questions.map(q => (
          <div key={q.id} className="rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                background: q.status === 'answered' ? COLORS.ink : COLORS.peach,
                color: q.status === 'answered' ? COLORS.primary : COLORS.deep
              }}>{q.status === 'answered' ? '답변완료' : '답변대기'}</span>
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>{q.category}</span>
            </div>
            <p className="font-heading text-sm leading-snug" style={{ color: COLORS.ink }}>{q.title}</p>
            {q.content && <p className="font-body text-xs mt-1.5 leading-relaxed" style={{ color: COLORS.stone }}>{q.content}</p>}
            <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>{new Date(q.created_at).toLocaleDateString('ko-KR')}</p>
            {q.answer && (
              <div className="mt-3 p-3 rounded-xl" style={{ background: COLORS.peach }}>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: COLORS.deep }}>답변</p>
                <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.ink }}>{q.answer}</p>
              </div>
            )}
          </div>
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
              <div key={f.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
                <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl" style={{ background: COLORS.peach }}>
                  <FolderOpen size={20} style={{ color: COLORS.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-xs truncate" style={{ color: COLORS.ink }}>{f.name}</p>
                  <p className="font-mono text-[10px] font-medium mt-0.5" style={{ color: COLORS.stone }}>{f.file_type} · {f.file_size}</p>
                </div>
                <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.ink }}>
                  <Download size={14} style={{ color: COLORS.cream }} />
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
            <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
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
 
function OnlineLecturePage() {
  const [lectures, setLectures] = useState([]);
  useEffect(() => {
    supabase.from('lectures').select('*').eq('is_published', true).order('created_at', { ascending: false })
      .then(({ data }) => setLectures(data || []));
  }, []);
  const gradients = [
    'linear-gradient(135deg, #FF5C1F, #D94614)',
    'linear-gradient(135deg, #FF9580, #FF5C1F)',
    'linear-gradient(135deg, #FFE8DD, #FF9580)',
    'linear-gradient(135deg, #1A1A1A, #FF5C1F)',
  ];
  return (
    <>
      <PageIntro ko="온라인 강의" en="Lectures" desc="언제 어디서나 학습하세요" />
      <div className="px-5 space-y-3">
        {lectures.map((l, i) => (
          <div key={l.id} className="rounded-3xl overflow-hidden" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <div className="relative aspect-video" style={{ background: gradients[i % 4] }}>
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(26,26,26,0.15)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: COLORS.white }}>
                  <Play size={16} className="ml-0.5" fill={COLORS.primary} style={{ color: COLORS.primary }} />
                </div>
              </div>
              <span className="absolute top-3 left-3 font-mono text-[9px] font-bold tracking-widest px-2 py-1 rounded" style={{ background: COLORS.white, color: COLORS.ink }}>{l.level}</span>
              <span className="absolute bottom-3 right-3 font-mono text-[9px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(26,26,26,0.85)', color: COLORS.cream }}>{l.duration}</span>
            </div>
            <div className="p-4">
              <h4 className="font-heading text-sm" style={{ color: COLORS.ink }}>{l.title}</h4>
              <p className="font-serif-italic text-xs mt-1" style={{ color: COLORS.stone }}>{l.instructor}</p>
            </div>
          </div>
        ))}
      </div>
    </>
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
        <section className="rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>01 / Area</p>
          <h3 className="font-heading text-sm mt-1 mb-3" style={{ color: COLORS.ink }}>시술 부위</h3>
          <div className="grid grid-cols-3 gap-2">
            {[{ id: 'eyebrow', label: '눈썹' }, { id: 'lip', label: '입술' }, { id: 'eyeline', label: '아이라인' }].map(a => (
              <button key={a.id} onClick={() => setArea(a.id)} className="py-3 rounded-xl font-body text-xs font-semibold"
                style={{ background: area === a.id ? COLORS.ink : COLORS.cream, color: area === a.id ? COLORS.cream : COLORS.ink }}>{a.label}</button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>02 / Skin</p>
          <h3 className="font-heading text-sm mt-1 mb-3" style={{ color: COLORS.ink }}>피부톤</h3>
          <div className="grid grid-cols-5 gap-1.5">
            {skinTones.map(v => (
              <button key={v} onClick={() => setSkinTone(v)} className="aspect-square rounded-xl"
                style={{ background: v, border: skinTone === v ? `3px solid ${COLORS.ink}` : `1px solid ${COLORS.light}`, transform: skinTone === v ? 'scale(0.92)' : 'scale(1)' }}></button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>03 / Pigment</p>
          <h3 className="font-heading text-sm mt-1 mb-3" style={{ color: COLORS.ink }}>색소</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {pigments.map(p => (
              <button key={p.value} onClick={() => setPigment(p.value)} className="aspect-square rounded-xl flex items-end justify-center pb-1"
                style={{ background: p.value, border: pigment === p.value ? `3px solid ${COLORS.ink}` : `1px solid ${COLORS.light}`, transform: pigment === p.value ? 'scale(0.92)' : 'scale(1)' }}>
                <span className="font-body text-[8px] font-bold" style={{ color: COLORS.white, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{p.name}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-3xl p-5" style={{ background: COLORS.ink }}>
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
 
function CommunityPage({ user }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    const { data } = await supabase.from('community_posts').select('*, profiles(name, avatar)').order('created_at', { ascending: false });
    setPosts(data || []);
  };

  const remove = async (postId) => {
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
 
  return (
    <>
      <PageIntro ko="커뮤니티" en="Community" desc="동료들과 이야기 나눠보세요" />
      <div className="px-5 space-y-3">
        <div className="rounded-2xl p-3" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="무슨 생각을 하고 계세요?" rows={2}
            className="w-full font-body text-xs font-medium p-2 outline-none resize-none rounded" style={{ color: COLORS.ink }} />
          <button onClick={submit} disabled={loading} className="float-right mt-1 font-heading text-[11px] px-4 py-2 rounded-full flex items-center gap-1" style={{ background: COLORS.primary, color: COLORS.white }}>
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Post
          </button>
          <div className="clear-both"></div>
        </div>
        {posts.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>첫 게시글을 남겨보세요!</p>
        ) : posts.map(p => (
          <div key={p.id} className="rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xl">{p.profiles?.avatar || '🍊'}</div>
              <div className="flex-1">
                <p className="font-heading text-xs" style={{ color: COLORS.ink }}>{p.profiles?.name || '익명'}</p>
                <p className="font-mono text-[9px] font-medium" style={{ color: COLORS.stone }}>{new Date(p.created_at).toLocaleString('ko-KR')}</p>
              </div>
              {p.user_id === user.id && (
                <button onClick={() => remove(p.id)} className="p-1.5 rounded-full" style={{ background: COLORS.cream }}>
                  <Trash2 size={12} style={{ color: COLORS.deep }} />
                </button>
              )}
            </div>
            <p className="font-body text-xs font-medium leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>{p.content}</p>
            <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <button className="flex items-center gap-1 font-mono text-[11px] font-semibold" style={{ color: COLORS.primary }}><Heart size={12} />{p.likes || 0}</button>
              <button className="flex items-center gap-1 font-mono text-[11px] font-semibold" style={{ color: COLORS.stone }}><MessageCircle size={12} />{p.comments_count || 0}</button>
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
              background: s.highlight ? COLORS.primary : COLORS.white,
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
        <section className="rounded-3xl p-6 relative overflow-hidden" style={{ background: COLORS.ink }}>
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
                {isAdmin && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>ADMIN</span>}
              </div>
              <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.cream, opacity: 0.6 }}>{user.email}</p>
              <p className="font-serif-italic text-sm mt-2" style={{ color: COLORS.primary }}>{user.course}</p>
            </div>
          </div>
        </section>

        {/* 컬러 선택 (펼침/접힘) */}
        {showColorPicker && (
          <section className="rounded-2xl p-4 animate-fade-in" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
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

        {/* 계정 정보 */}
        <section className="rounded-2xl overflow-hidden" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
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

        <button onClick={handleLogout} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}`, color: COLORS.deep }}>
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
  return (
    <div className="pb-6">
      <section className="px-5 pt-5 pb-6">
        <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ Admin</p>
        <h2 className="font-display text-[42px] leading-[1] mt-3 tracking-tighter" style={{ color: COLORS.ink }}>Dashboard<span style={{ color: COLORS.primary }}>.</span></h2>
        <p className="font-serif-italic text-base mt-2" style={{ color: COLORS.stone }}>오늘의 운영 현황</p>
      </section>
      <div className="px-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '수강생', value: stats.students, highlight: true },
            { label: '진행 강의', value: stats.lectures },
            { label: '미답변 Q&A', value: stats.pendingQna },
            { label: '월 매출', value: '0' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4" style={{
              background: s.highlight ? COLORS.primary : COLORS.white,
              border: s.highlight ? 'none' : `1px solid ${COLORS.light}`
            }}>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: s.highlight ? COLORS.white : COLORS.stone, opacity: s.highlight ? 0.9 : 1 }}>{s.label}</p>
              <p className="font-display text-3xl mt-1 leading-none tracking-tight" style={{ color: s.highlight ? COLORS.white : COLORS.ink }}>{s.value}</p>
            </div>
          ))}
        </div>
        <section>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-3 px-1" style={{ color: COLORS.primary }}>━━ Quick Action</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'admin-notice', label: '공지', icon: Bell },
              { id: 'admin-students', label: '수강생', icon: UserCheck },
              { id: 'admin-qna', label: 'Q&A', icon: MessageCircle },
            ].map(a => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => setCurrentPage(a.id)} className="rounded-2xl p-3 flex flex-col items-center gap-2" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
                  <div className="w-10 h-10 flex items-center justify-center rounded-xl" style={{ background: COLORS.peach }}>
                    <Icon size={16} style={{ color: COLORS.primary }} />
                  </div>
                  <p className="font-body text-[10px] font-semibold" style={{ color: COLORS.ink }}>{a.label}</p>
                </button>
              );
            })}
          </div>
        </section>
        <div className="rounded-xl p-4" style={{ background: COLORS.peach }}>
          <p className="font-serif-italic text-sm" style={{ color: COLORS.deep }}>🎉 모든 숫자는 실제 Supabase DB에서 가져온 실시간 데이터입니다!</p>
        </div>
      </div>
    </div>
  );
}
 
function AdminNotice({ user }) {
  const [notices, setNotices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tag: '안내', urgent: false });
  const [loading, setLoading] = useState(false);
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    setNotices(data || []);
  };
 
  const submit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    await supabase.from('notices').insert({ ...form, author_id: user.id });
    setForm({ title: '', content: '', tag: '안내', urgent: false });
    setShowForm(false);
    await load();
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
        <button onClick={() => setShowForm(!showForm)} className="w-full rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2" style={{ background: COLORS.primary, color: COLORS.white }}>
          <Plus size={14} strokeWidth={2.5} />새 공지
        </button>
        {showForm && (
          <div className="rounded-2xl p-4 space-y-3 animate-fade-in" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
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
            <button onClick={submit} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.ink, color: COLORS.white }}>
              {loading && <Loader2 size={12} className="animate-spin" />}발행
            </button>
          </div>
        )}
        {notices.map(n => (
          <div key={n.id} className="rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                background: n.urgent ? COLORS.primary : COLORS.peach,
                color: n.urgent ? COLORS.white : COLORS.deep
              }}>{n.tag}</span>
              <button onClick={() => remove(n.id)}><Trash2 size={12} style={{ color: COLORS.stone }} /></button>
            </div>
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{n.title}</p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</p>
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
          <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
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
 
function AdminQna({ user }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
 
  useEffect(() => { load(); }, []);
 
  const load = async () => {
    const { data } = await supabase.from('questions').select('*, profiles(name)').order('created_at', { ascending: false });
    setQuestions(data || []);
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
        <div className="rounded-2xl p-4 mb-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
          <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>{selected.category}</span>
          <h3 className="font-heading text-base mt-2" style={{ color: COLORS.ink }}>{selected.title}</h3>
          <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>{selected.profiles?.name}</p>
          {selected.content && <p className="font-body text-xs mt-3 leading-relaxed" style={{ color: COLORS.stone }}>{selected.content}</p>}
        </div>
        <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.peach }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.deep }}>관리자 답변</p>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="답변을 작성해주세요" rows={6}
            className="w-full font-body text-xs p-3 outline-none resize-none rounded" style={{ background: COLORS.white, color: COLORS.ink }} />
          <button onClick={submitAnswer} disabled={loading} className="w-full font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-2" style={{ background: COLORS.ink, color: COLORS.white }}>
            {loading && <Loader2 size={12} className="animate-spin" />}답변 등록
          </button>
        </div>
      </div>
    );
  }
 
  const pending = questions.filter(q => q.status === 'pending');
  const answered = questions.filter(q => q.status === 'answered');
 
  return (
    <>
      <PageIntro ko="Q&A 답변" en="Q&A Admin" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3" style={{ background: COLORS.primary }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.white }}>답변 대기</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.white }}>{pending.length}</p>
          </div>
          <div className="rounded-2xl p-3" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>답변 완료</p>
            <p className="font-display text-2xl mt-1 tracking-tight" style={{ color: COLORS.ink }}>{answered.length}</p>
          </div>
        </div>
        {questions.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>등록된 질문이 없습니다</p>
        ) : questions.map(q => (
          <button key={q.id} onClick={() => q.status === 'pending' && setSelected(q)} className="w-full text-left rounded-2xl p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.light}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{
                background: q.status === 'answered' ? COLORS.ink : COLORS.primary,
                color: q.status === 'answered' ? COLORS.primary : COLORS.white
              }}>{q.status === 'answered' ? '완료' : '대기'}</span>
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>{q.category}</span>
            </div>
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{q.title}</p>
            <p className="font-mono text-[10px] mt-1.5" style={{ color: COLORS.stone }}>{q.profiles?.name} · {new Date(q.created_at).toLocaleDateString('ko-KR')}</p>
          </button>
        ))}
      </div>
    </>
  );
}
 