// 🏠 홈 화면 — 앱을 열면 가장 먼저 보이는 화면이라 나머지 수강생 화면(student.jsx)과 따로 둔다.
//    student.jsx 는 필요할 때 따로 받아서(지연 로딩) 첫 화면이 빨리 뜬다.
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { COLORS } from '../lib/colors';
import { useLatestLecture, useRecentUpdates } from '../hooks';
import { Bell, Award, MessageCircle, FolderOpen, Sparkles, ShoppingBag, PlayCircle, Users, Heart, ChevronRight, Play, Camera, ArrowRight, ArrowUpRight, Loader2, X, Search, Calendar, Gift, Biohazard } from 'lucide-react';

// 홈 검색바 입력값 → 결과(게시물/Q&A/공지/트렌드/꿀팁/강의/상품)를 그 자리에서 보여주는 훅
function useHomeSearch(query) {
  const [debounced, setDebounced] = useState(query); // 초기값을 query로 둬서 복원 시 깜빡임 없이 바로 결과 표시
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) { setResults(null); setLoading(false); return; }
    let alive = true;
    setLoading(true);
    const q = `%${debounced}%`;
    const dedupe = (a, b) => {
      const map = new Map();
      [...(a.data || []), ...(b.data || [])].forEach(x => map.set(x.id, x));
      return [...map.values()].sort((x, y) => new Date(y.created_at) - new Date(x.created_at)).slice(0, 5);
    };
    (async () => {
      const [posts, notices, trends, tips, qna, lecturesByTitle, lecturesByInstructor, productsByName, productsByBrand] = await Promise.all([
        supabase.from('community_posts').select('id, content, category, created_at').ilike('content', q).order('created_at', { ascending: false }).limit(8),
        supabase.from('notices').select('id, title, created_at').ilike('title', q).order('created_at', { ascending: false }).limit(5),
        supabase.from('trends').select('id, title, created_at').eq('is_active', true).ilike('title', q).order('created_at', { ascending: false }).limit(5),
        supabase.from('tips').select('id, title, created_at').eq('is_active', true).ilike('title', q).order('created_at', { ascending: false }).limit(5),
        supabase.from('questions').select('id, title, created_at').ilike('title', q).order('created_at', { ascending: false }).limit(5),
        supabase.from('lectures').select('id, title, instructor, created_at').eq('is_published', true).ilike('title', q).order('created_at', { ascending: false }).limit(5),
        supabase.from('lectures').select('id, title, instructor, created_at').eq('is_published', true).ilike('instructor', q).order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('id, name, brand, created_at').eq('is_active', true).ilike('name', q).order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('id, name, brand, created_at').eq('is_active', true).ilike('brand', q).order('created_at', { ascending: false }).limit(5),
      ]);
      if (!alive) return;
      setResults({
        posts: posts.data || [],
        notices: notices.data || [],
        trends: trends.data || [],
        tips: tips.data || [],
        qna: qna.data || [],
        lectures: dedupe(lecturesByTitle, lecturesByInstructor),
        products: dedupe(productsByName, productsByBrand),
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [debounced]);

  return { debounced, loading, results };
}

const HOME_SEARCH_STORAGE_KEY = 'hssup_home_search';

export function HomePage({ user, setCurrentPage, setSelectedNotice, setSelectedPost, setSelectedQna, setSelectedTrend, setSelectedTip, setSelectedProduct, setSelectedLecture }) {
  const [notices, setNotices] = useState([]);
  // 검색 후 상세로 들어갔다가 뒤로가기 하면 홈이 아니라 검색 결과 화면이 그대로 보이도록 세션 동안 유지
  const [query, setQuery] = useState(() => {
    try { return sessionStorage.getItem(HOME_SEARCH_STORAGE_KEY) || ''; } catch (e) { return ''; }
  });
  const c = COLORS;

  useEffect(() => {
    try {
      if (query) sessionStorage.setItem(HOME_SEARCH_STORAGE_KEY, query);
      else sessionStorage.removeItem(HOME_SEARCH_STORAGE_KEY);
    } catch (e) { /* 무시 */ }
  }, [query]);

  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setNotices(data || []));
  }, []);

  const { debounced, loading, results } = useHomeSearch(query);
  const searching = !!debounced;
  const total = results ? Object.values(results).reduce((s, arr) => s + arr.length, 0) : 0;

  // 퀵메뉴 (상단으로 이동 · 클래스·온라인강의는 위 히어로 카드와 겹쳐서 제외, 3줄 12개)
  const mainGrid = [
    { id: 'tips',             ko: '수업 꿀팁',     icon: Sparkles },
    { id: 'mycase',           ko: '1:1 피드백',    icon: Camera },
    { id: 'best',             ko: '베스트 케이스', icon: Award },
    { id: 'practice-booking', ko: '연습 예약',     icon: Calendar },
    { id: 'notice',           ko: '학원공지',      icon: Bell },
    { id: 'trends',           ko: '트렌드 속보',   icon: ArrowUpRight },
    { id: 'qna',              ko: 'Q&A',           icon: MessageCircle },
    { id: 'greetings',        ko: '가입 인사',     icon: Gift },
    { id: 'reviews',          ko: '수강후기',      icon: Heart },
    { id: 'freeboard',        ko: '자유게시판',    icon: Users },
    { id: 'library',          ko: '자료실',        icon: FolderOpen },
    { id: 'market',           ko: '재료샵',        icon: ShoppingBag },
  ];

  const heroLecture = useLatestLecture();
  const homeUpdates = useRecentUpdates();
  // 👥 회원이 쓴 새 글만(자유게시판·가입인사·수강후기·Q&A) 필터
  const memberPages = ['post-detail', 'qna-detail'];
  const memberPosts = homeUpdates.filter(u => memberPages.includes(u.page));

  const SearchResultSection = ({ title, icon: Icon, items, label, onClick }) => items.length === 0 ? null : (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 px-5 mb-2">
        <Icon size={13} style={{ color: c.primary }} />
        <p className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: c.stone }}>{title}</p>
      </div>
      <div className="mx-5 rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.light}` }}>
        {items.map((item, i) => (
          <button key={item.id} onClick={() => onClick(item)}
            className="w-full text-left flex items-center gap-2.5 py-3 px-4 transition-transform active:scale-[0.98]"
            style={{ borderTop: i !== 0 ? `1px solid ${c.light}` : 'none' }}>
            <p className="font-body text-sm flex-1 truncate" style={{ color: c.ink }}>{label(item)}</p>
            <ChevronRight size={14} style={{ color: c.stone, flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pb-6">
      {/* 검색바 (상단으로 이동 · 홈 화면에서 바로 검색) */}
      <section className="px-5 pt-4">
        <div className="relative">
          <Search size={16} style={{ color: c.muted, position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="강의, 재료, 게시물 검색"
            className="w-full rounded-2xl pl-10 pr-10 py-3 font-body text-sm outline-none"
            style={{ background: c.cardElev, color: c.ink, border: `1px solid ${c.light}` }} />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: c.card }}>
              <X size={12} style={{ color: c.stone }} />
            </button>
          )}
        </div>
      </section>

      {searching ? (
        <div className="pt-4">
          {loading && (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: c.primary }} /></div>
          )}
          {!loading && results && total === 0 && (
            <div className="px-5 py-16 text-center">
              <p className="font-body text-sm" style={{ color: c.stone }}>"{debounced}" 검색 결과가 없어요</p>
            </div>
          )}
          {!loading && results && total > 0 && (
            <>
              {/* 검색 결과는 일부 컬럼만 가져온 상태라, 상세로 넘어갈 땐 selected*를 비워서
                  상세 페이지가 routeId로 전체 데이터를 다시 조회하게 한다(안 그러면 이미지·가격 등이 비어 보임) */}
              <SearchResultSection title="게시물" icon={Users} items={results.posts}
                label={(p) => (p.content || '').replace(/\n/g, ' ').slice(0, 50) || '(사진)'}
                onClick={(p) => { setSelectedPost(null); setCurrentPage('post-detail', p.id); }} />
              <SearchResultSection title="Q&A" icon={MessageCircle} items={results.qna}
                label={(q) => q.title}
                onClick={(q) => { setSelectedQna(null); setCurrentPage('qna-detail', q.id); }} />
              <SearchResultSection title="공지사항" icon={Bell} items={results.notices}
                label={(n) => n.title}
                onClick={(n) => { setSelectedNotice(null); setCurrentPage('notice-detail', n.id); }} />
              <SearchResultSection title="트렌드 속보" icon={ArrowUpRight} items={results.trends}
                label={(t) => t.title}
                onClick={(t) => { setSelectedTrend(null); setCurrentPage('trend-detail', t.id); }} />
              <SearchResultSection title="수업 꿀팁" icon={Sparkles} items={results.tips}
                label={(t) => t.title}
                onClick={(t) => { setSelectedTip(null); setCurrentPage('tip-detail', t.id); }} />
              <SearchResultSection title="온라인 강의" icon={PlayCircle} items={results.lectures}
                label={(l) => l.title}
                onClick={(l) => { setSelectedLecture(null); setCurrentPage('lecture-detail', l.id); }} />
              <SearchResultSection title="재료샵" icon={ShoppingBag} items={results.products}
                label={(p) => p.name}
                onClick={(p) => { setSelectedProduct(null); setCurrentPage('product-detail', p.id); }} />
            </>
          )}
        </div>
      ) : (
      <>
      {/* 환영 메시지 + 온라인 강의(축소 카드) */}
      <section className="px-5 pt-5 pb-5 relative overflow-hidden">
        <div className="absolute -top-12 -right-16 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,69,0,0.22), rgba(255,69,0,0.06) 35%, transparent 70%)' }}></div>
        <div className="relative flex items-stretch gap-3">
          {/* 인사말 */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: c.primary }}>━━ Today</p>
            <h2 className="font-display text-[34px] leading-[1] mt-2 tracking-tighter" style={{ color: c.ink }}>
              Hello,<br />
              <span style={{ color: c.primary }}>{user.name?.length > 1 ? user.name.slice(1) : user.name}님</span>
            </h2>
          </div>
          {/* 온라인 강의 (축소) */}
          <button onClick={() => setCurrentPage('online')}
            className="shrink-0 w-[60%] rounded-2xl p-3.5 text-left relative overflow-hidden flex flex-col justify-between"
            style={{ background: 'linear-gradient(135deg, #FF4500 0%, #FF9A55 100%)', boxShadow: '0 8px 24px rgba(255, 69, 0, 0.25)' }}>
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}></div>
            <div className="relative" style={{ color: COLORS.white }}>
              <p className="font-mono text-[8px] font-bold tracking-widest uppercase opacity-80">ONLINE{heroLecture.isNew && ' · NEW'}</p>
              <h3 className="font-display text-base mt-1 leading-tight tracking-tight">{heroLecture.isNew ? <>새 강의<br />업데이트</> : <>온라인<br />강의</>}</h3>
              {heroLecture.latest && (
                <p className="font-body text-[10px] mt-1 opacity-90 truncate">{heroLecture.latest.title}</p>
              )}
            </div>
            <div className="relative flex justify-end mt-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: COLORS.white }}>
                <Play size={12} fill={COLORS.primary} style={{ color: COLORS.primary }} className="ml-0.5" />
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 퀵메뉴 (상단으로 이동 · 카테고리 전체를 작은 아이콘 그리드로) */}
      <section className="px-5 mb-6">
        <div className="grid grid-cols-4 gap-2.5">
          {mainGrid.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setCurrentPage(item.id)}
                className="rounded-2xl py-3 px-1 flex flex-col items-center gap-2 transition-transform active:scale-95"
                style={{ background: c.card, border: `1px solid ${c.light}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,69,0,0.1)' }}>
                  <Icon size={18} strokeWidth={1.8} style={{ color: c.primary }} />
                </div>
                <p className="font-body text-[10px] font-semibold text-center leading-tight" style={{ color: c.ink }}>{item.ko}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ♻️ 의료폐기물 수거 신청 (제휴: 메디환경산업) */}
      <section className="px-5 mb-6">
        <button onClick={() => setCurrentPage('medical-waste')}
          className="w-full rounded-2xl p-4 text-left relative overflow-hidden flex items-center gap-3 transition-transform active:scale-[0.98]"
          style={{ background: c.ink }}>
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255, 69, 0, 0.35)', filter: 'blur(18px)' }}></div>
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Biohazard size={20} strokeWidth={1.8} style={{ color: c.primary }} />
          </div>
          <div className="relative flex-1 min-w-0" style={{ color: COLORS.white }}>
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.deep }}>Partner 메디환경산업</p>
            <h3 className="font-heading text-sm mt-0.5">의료폐기물 수거 신청</h3>
            <p className="font-body text-[11px] mt-0.5 opacity-75 truncate">내년부터 반영구 폐기물도 의료폐기물로 처리해야 합니다</p>
          </div>
          <ChevronRight size={18} className="relative shrink-0" style={{ color: COLORS.white, opacity: 0.7 }} />
        </button>
      </section>

      {/* 공지사항 */}
      <section className="px-5 mb-4">
        <div className="flex items-baseline justify-between mb-2 px-1">
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: c.primary }}>━━ Notice</p>
            <h3 className="font-heading text-base" style={{ color: c.ink }}>공지사항</h3>
          </div>
          <button onClick={() => setCurrentPage('notice')} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: c.stone }}>
            전체보기 <ArrowRight size={12} />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.light}` }}>
          {notices.length === 0 ? (
            <p className="font-body text-xs text-center py-5" style={{ color: c.stone }}>공지가 없습니다</p>
          ) : notices.slice(0, 3).map((n, i) => (
            <button key={n.id} onClick={() => { setSelectedNotice(n); setCurrentPage('notice-detail', n.id); }}
              className="w-full text-left flex items-center gap-2.5 py-2.5 px-3 transition-transform active:scale-[0.98]"
              style={{ borderBottom: i !== Math.min(notices.length, 3) - 1 ? `1px solid ${c.light}` : 'none' }}>
              <span className="font-mono text-[8px] font-bold tracking-widest px-1.5 py-1 rounded shrink-0" style={{
                background: n.urgent ? c.primary : c.peach,
                color: n.urgent ? c.white : c.deep
              }}>{n.tag}</span>
              <p className="font-body text-xs font-medium flex-1 truncate" style={{ color: c.ink }}>{n.title}</p>
              <ChevronRight size={13} style={{ color: c.stone }} />
            </button>
          ))}
        </div>
      </section>

      {/* 회원 새글 (최근 3일 · 회원이 쓴 글 · 최근 3개) */}
      <section className="px-5 mb-5">
        <div className="flex items-baseline justify-between mb-2 px-1">
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: c.primary }}>━━ Community</p>
            <h3 className="font-heading text-base" style={{ color: c.ink }}>회원 새글</h3>
          </div>
          <button onClick={() => setCurrentPage('freeboard')} className="font-body text-xs font-semibold flex items-center gap-1" style={{ color: c.stone }}>
            게시판 <ArrowRight size={12} />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: c.card, border: `1px solid ${c.light}` }}>
          {memberPosts.length === 0 ? (
            <p className="font-body text-xs text-center py-5" style={{ color: c.stone }}>최근 3일간 새 글이 없어요</p>
          ) : memberPosts.slice(0, 3).map((u, i) => (
            <button key={`${u.type}-${u.id}`} onClick={() => setCurrentPage(u.page, u.id)}
              className="w-full text-left flex items-center gap-2.5 py-2.5 px-3 transition-transform active:scale-[0.98]"
              style={{ borderTop: i !== 0 ? `1px solid ${c.light}` : 'none' }}>
              <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-1 rounded shrink-0" style={{ background: c.peach, color: c.deep }}>{u.type}</span>
              <p className="font-body text-xs flex-1 truncate" style={{ color: c.ink }}>{u.title}</p>
              <span className="font-mono text-[9px] shrink-0" style={{ color: c.stone }}>{new Date(u.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
              <ChevronRight size={12} style={{ color: c.stone }} />
            </button>
          ))}
        </div>
      </section>
      </>
      )}
    </div>
  );
}
