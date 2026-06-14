import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { COLORS, AVATAR_COLORS } from '../lib/colors';
import { uploadCaseImage, deleteCaseImage, isYouTubeUrl, getRowImages, uploadImageToBucket, deleteImageFromBucket, persistFormImages, uploadPostVideo, deletePostVideo } from '../lib/images';
import { toast } from '../lib/toast';
import { confirmDialog } from '../lib/dialog';
import { subscribeToNotifications, unsubscribeFromNotifications, checkNotificationStatus } from '../lib/notifications';
import { LEGAL_TERMS, LEGAL_PRIVACY, LEGAL_REFUND } from '../lib/legal';
import { useDraft, useLatestLecture, useRecentUpdates, useDetailItem } from '../hooks';
import {
  ImageCarousel, SkeletonImage, Avatar, LevelCard, PageIntro, LikeButton, CommentSection, MultiImageField, CategoryMover,
} from '../components/common';
import { Bell, BellOff, BookOpen, Award, MessageCircle, FolderOpen, Sparkles, ShoppingBag, PlayCircle, Users, Heart, ChevronRight, Clock, Check, Plus, Send, Edit3, Download, Play, Upload, Palette, Trash2, ChevronLeft, ShoppingCart, Shield, Camera, Image as ImageIcon, ArrowRight, ArrowUpRight, Loader2, LogOut, X, Search, Package, Truck, Calendar, Gift } from 'lucide-react';

export function HomePage({ user, setCurrentPage, setSelectedNotice }) {
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

      {/* NEW 업데이트 (수강생) */}
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
              <p className="font-body text-xs mt-2 opacity-90 truncate">{heroLecture.isNew ? '' : '최신 · '}{heroLecture.latest.title}</p>
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
            <button key={n.id} onClick={() => { setSelectedNotice(n); setCurrentPage('notice-detail', n.id); }}
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

export function NoticeDetailPage({ notice: propNotice, user, routeId }) {
  const { item: notice, fetching } = useDetailItem(propNotice, routeId, 'notices');
  if (!notice) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>공지를 찾을 수 없습니다.</p>}
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

export function NoticePage({ user, setCurrentPage, setSelectedNotice }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    supabase.from('notices').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setNotices(data || []); setLoading(false); });
  }, []);
 
  const openDetail = (n) => {
    setSelectedNotice(n);
    setCurrentPage('notice-detail', n.id);
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

export function CoursePage({ user, setCurrentPage, setSelectedCourse, setSelectedProduct }) {
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('order');
  const [courseCategory, setCourseCategory] = useState('전체');
  const [loading, setLoading] = useState(true);
  const COURSE_CATEGORIES = ['전체', 'PMU', '원데이', 'SMP', '속눈썹', '기타'];

  useEffect(() => {
    supabase.from('courses').select('*').eq('is_active', true).order('order_index', { ascending: true })
      .then(({ data }) => { setCourses(data || []); setLoading(false); });
  }, []);

  // 🍊 검색 + 정렬
  const filtered = courses
    .filter(c => {
      if (courseCategory !== '전체' && c.category !== courseCategory) return false;
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

  const isFiltering = searchQuery.trim().length > 0 || courseCategory !== '전체';

  const openCourse = (c) => {
    setSelectedCourse(c);
    setCurrentPage('course-detail', c.id);
  };

  return (
    <>
      <PageIntro ko="클래스" en="Class" desc="당신의 시그니처를 만들어보세요" />

      {/* 검색바 */}
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

      {/* 카테고리 탭 */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {COURSE_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCourseCategory(cat)}
              className="shrink-0 px-4 py-2 rounded-full font-body text-xs font-semibold transition-transform active:scale-95"
              style={{
                background: courseCategory === cat ? COLORS.primary : COLORS.card,
                color: courseCategory === cat ? COLORS.white : COLORS.ink,
                border: `1px solid ${courseCategory === cat ? COLORS.primary : COLORS.light}`,
                boxShadow: courseCategory === cat ? '0 0 16px rgba(255, 92, 31, 0.3)' : 'none',
              }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 정렬 + 결과 카운트 */}
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
          const discount = c.original_price && c.show_price && c.original_price > c.price
            ? Math.round(((c.original_price - c.price) / c.original_price) * 100)
            : 0;
          return (
            <button key={c.id} onClick={() => openCourse(c)}
              className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
              style={{
                background: c.is_featured ? COLORS.cardElev : COLORS.card,
                border: `1px solid ${c.is_featured ? 'rgba(255, 92, 31, 0.4)' : COLORS.light}`,
                boxShadow: c.is_featured ? '0 0 24px rgba(255, 92, 31, 0.2)' : 'none',
              }}>
              {getRowImages(c).length > 0 ? (
                <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.light}` }}>
                  <img src={getRowImages(c)[0]} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
                  <BookOpen size={22} style={{ color: COLORS.primary }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase" style={{ color: COLORS.primary }}>{c.level}</p>
                  {c.badge && (
                    <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{
                      background: c.badge === 'BEST' ? COLORS.ink : c.badge === 'NEW' ? COLORS.primary : COLORS.peach,
                      color: c.badge === 'BEST' ? COLORS.primary : (c.badge === 'SALE' ? COLORS.deep : COLORS.white),
                    }}>{c.badge}</span>
                  )}
                  {c.hot && (
                    <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>HOT</span>
                  )}
                </div>
                <h3 className="font-heading text-base mt-0.5 truncate" style={{ color: COLORS.ink }}>{c.title}</h3>
                {c.duration && <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: COLORS.stone }}>{c.duration}</p>}
              </div>
              <div className="text-right shrink-0 flex flex-col items-end">
                {c.show_price ? (
                  <>
                    {discount > 0 && (
                      <p className="font-mono text-[9px] line-through" style={{ color: COLORS.muted }}>₩{(c.original_price / 10000).toFixed(0)}만</p>
                    )}
                    <p className="font-display text-lg tracking-tight" style={{ color: COLORS.ink }}>₩{(c.price / 10000).toFixed(0)}<span className="font-body text-[11px]">만</span></p>
                  </>
                ) : (
                  <p className="font-heading text-xs" style={{ color: COLORS.primary }}>문의</p>
                )}
                <ChevronRight size={14} style={{ color: COLORS.stone }} className="mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function CourseDetailPage({ course: propCourse, user, setCurrentPage, setSelectedCourse, setSelectedProduct, routeId }) {
  const { item: c, fetching } = useDetailItem(propCourse, routeId, 'courses');
  if (!c) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>클래스를 찾을 수 없습니다.</p>}
      </div>
    );
  }
  const features = c.features ? c.features.split('\n').filter(f => f.trim()) : [];
  const discount = c.original_price && c.show_price && c.original_price > c.price
    ? Math.round(((c.original_price - c.price) / c.original_price) * 100) : 0;

  const apply = () => {
    if (!c.show_price) { toast('자세한 안내를 위해 원장님께 문의해주세요!'); return; }
    setSelectedProduct?.(null);
    sessionStorage.removeItem('hssup_sel_product');
    setSelectedCourse?.(c);
    setCurrentPage('payment');
  };

  return (
    <div className="pb-28">
      {getRowImages(c).length > 0 && (
        <ImageCarousel images={getRowImages(c)} className="aspect-video w-full" rounded="" bordered={false} zoomable />
      )}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <p className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: COLORS.primary }}>{c.level}</p>
          {c.badge && (
            <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{
              background: c.badge === 'BEST' ? COLORS.ink : c.badge === 'NEW' ? COLORS.primary : COLORS.peach,
              color: c.badge === 'BEST' ? COLORS.primary : (c.badge === 'SALE' ? COLORS.deep : COLORS.white),
            }}>{c.badge}</span>
          )}
          {c.hot && <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>HOT</span>}
        </div>
        <h1 className="font-display text-3xl tracking-tight leading-tight" style={{ color: COLORS.ink }}>{c.title}</h1>
        {c.en_title && <p className="font-serif-italic text-base mt-1" style={{ color: COLORS.stone, opacity: 0.7 }}>{c.en_title}</p>}
        {c.duration && <p className="font-mono text-xs mt-2" style={{ color: COLORS.primary }}>{c.duration}</p>}
      </div>

      {c.description && (
        <div className="px-5 mt-4">
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.stone }}>{c.description}</p>
          </div>
        </div>
      )}

      {features.length > 0 && (
        <div className="px-5 mt-4">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>━━ 커리큘럼</p>
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: COLORS.primary, boxShadow: '0 0 8px rgba(255,92,31,0.4)' }}>
                  <Check size={10} strokeWidth={3} style={{ color: COLORS.white }} />
                </div>
                <p className="font-body text-sm leading-relaxed" style={{ color: COLORS.ink }}>{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 mt-4">
        <div className="rounded-2xl p-4" style={{ background: COLORS.cardElev }}>
          <p className="font-mono text-[9px] font-bold tracking-widest" style={{ color: COLORS.primary }}>{c.show_price ? 'PRICE' : 'INQUIRY'}</p>
          {c.show_price ? (
            <>
              {discount > 0 && (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-mono text-[11px] line-through" style={{ color: COLORS.stone }}>₩{(c.original_price / 10000).toFixed(0)}만</p>
                  <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white }}>{discount}% OFF</span>
                </div>
              )}
              <p className="font-display text-3xl tracking-tight" style={{ color: COLORS.ink }}>₩{(c.price / 10000).toFixed(0)}<span className="font-body text-sm">만</span></p>
            </>
          ) : (
            <p className="font-display text-2xl tracking-tight mt-1" style={{ color: COLORS.ink }}>문의하기</p>
          )}
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed left-0 right-0 px-5 py-3" style={{
        background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${COLORS.light}`, maxWidth: '480px', margin: '0 auto',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}>
        <button onClick={apply} className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2"
          style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255,92,31,0.5)' }}>
          {c.show_price ? `₩${(c.price / 10000).toFixed(0)}만원 신청하기` : '문의하기'} <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function BestCasePage() {
  const PER_PAGE = 12;
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체');
  const [displayCount, setDisplayCount] = useState(PER_PAGE);

  // 필터 바뀌면 페이지 초기화
  useEffect(() => { setDisplayCount(PER_PAGE); }, [filter]);
  // 🚀 필터·페이지에 맞춰 필요한 만큼만 조회 (서버 필터 + 페이지네이션)
  useEffect(() => { load(); }, [filter, displayCount]);

  const load = async () => {
    if (displayCount === PER_PAGE) setLoading(true);
    let query = supabase
      .from('cases')
      .select('*', { count: 'exact' })
      .eq('is_best', true)
      .order('created_at', { ascending: false })
      .range(0, displayCount - 1);
    if (filter !== '전체') query = query.eq('category', filter);
    const { data, count } = await query;
    const rows = data || [];
    // 작성자 이름·아바타는 공개 뷰에서 (이메일·전화는 노출 안 함)
    const userIds = [...new Set(rows.map(c => c.user_id).filter(Boolean))];
    const pmap = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from('public_profiles')
        .select('id, name, avatar_color, avatar_url, course')
        .in('id', userIds);
      (profs || []).forEach(p => { pmap[p.id] = p; });
    }
    setCases(rows.map(c => ({ ...c, profiles: pmap[c.user_id] || { name: '익명' } })));
    setTotal(count || 0);
    setLoading(false);
  };

  const categories = ['전체', '눈썹', '아이라인', '입술', '속눈썹', '헤어라인'];

  return (
    <>
      <PageIntro ko="베스트 케이스" en="Best Case" desc="동료들의 작품에서 영감을 얻으세요" />

      {/* 베스트 케이스 선정 혜택 안내 */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: COLORS.peach, border: `1px solid ${COLORS.primary}` }}>
          <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.primary, boxShadow: '0 0 16px rgba(255, 92, 31, 0.35)' }}>
            <Gift size={16} style={{ color: COLORS.white }} />
          </div>
          <div>
            <p className="font-heading text-sm" style={{ color: COLORS.deep }}>베스트 케이스에 선정되면?</p>
            <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: COLORS.ink }}>
              올려주신 작업 사진이 베스트 케이스로 선정되면 <b>추후 수강 할인 혜택</b> 또는 <b>소정의 선물</b>을 드려요. 멋진 작업물을 1:1 피드백에 많이 남겨주세요! 
            </p>
          </div>
        </div>
      </div>

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
        ) : cases.length === 0 ? (
          <div className="text-center py-10">
            <Award size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>
              {filter === '전체' ? '아직 베스트 케이스가 없습니다' : `${filter} 카테고리에 베스트가 없습니다`}
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>관리자가 우수 케이스를 선정하면 표시됩니다</p>
          </div>
        ) : (
          <>
          {cases.map(c => (
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
          ))}
          {total > cases.length && (
            <button onClick={() => setDisplayCount(n => n + PER_PAGE)}
              className="w-full rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
              style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
              더 보기 ({total - cases.length}개 남음) <ChevronRight size={12} />
            </button>
          )}
          </>
        )}
      </div>
    </>
  );
}

export function MyCasePage({ user }) {
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
      toast('이미지는 최대 5장까지 업로드 가능합니다');
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
    if (!form.title.trim()) return toast('제목을 입력해주세요');
    if (form.imageFiles.length === 0) return toast('이미지를 1장 이상 업로드해주세요');

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
      toast('업로드 실패: ' + err.message);
    }
    setUploading(false);
  };

  // 케이스 삭제
  const removeCase = async (caseItem) => {
    if (!await confirmDialog('이 케이스를 삭제하시겠습니까?\n사진도 함께 삭제됩니다.')) return;

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
      <PageIntro ko="1:1 피드백" en="Personal Feedback" desc="원장님의 1:1 개별 피드백을 받아보세요 " />
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

export function QnaDetailPage({ qna: propQna, user, setCurrentPage, routeId }) {
  const { item: qna, fetching } = useDetailItem(propQna, routeId, 'questions');
  const [author, setAuthor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', category: '시술' });
  const [actionLoading, setActionLoading] = useState(false);
  const [catOverride, setCatOverride] = useState(null);

  useEffect(() => {
    if (!qna?.user_id) return;
    supabase.from('public_profiles').select('name, avatar_color, avatar_url, role').eq('id', qna.user_id).maybeSingle()
      .then(({ data }) => setAuthor(data));
    setEditForm({
      title: qna.title || '',
      content: qna.content || '',
      category: qna.category || '시술'
    });
    setCatOverride(null);
  }, [qna]);

  if (!qna) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>질문을 찾을 수 없습니다.</p>}
      </div>
    );
  }

  const isOwner = qna.user_id === user?.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const canEdit = isOwner;  // 수정은 본인만
  const canDelete = isOwner || isAdmin;  // 삭제는 본인 또는 관리자

  const handleUpdate = async () => {
    if (!editForm.title.trim()) return toast('제목을 입력해주세요');
    setActionLoading(true);
    const { error } = await supabase.from('questions').update({
      title: editForm.title.trim(),
      content: editForm.content.trim(),
      category: editForm.category,
    }).eq('id', qna.id);
    setActionLoading(false);
    if (error) {
      toast('수정 실패: ' + error.message);
    } else {
      toast('수정 완료!');
      setEditing(false);
      setCurrentPage('qna');
    }
  };

  const handleDelete = async () => {
    if (!await confirmDialog('이 질문을 삭제하시겠습니까?\n답변과 댓글도 함께 삭제됩니다.')) return;
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
        toast('삭제 실패: ' + error.message);
        setActionLoading(false);
        return;
      }
      
      if (count === 0) {
        toast('삭제 권한이 없습니다.\n본인이 작성한 질문만 삭제할 수 있어요.');
        setActionLoading(false);
        return;
      }
      
      toast('삭제되었습니다');
      setCurrentPage('qna');
    } catch (err) {
      console.error('삭제 예외:', err);
      toast('삭제 실패: ' + err.message);
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
          <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>{catOverride ?? qna.category}</span>
        </div>
        {isAdmin && (
          <div className="mt-3">
            <CategoryMover table="questions" itemId={qna.id} current={catOverride ?? qna.category} options={['시술', '재료', '수업', '창업']} onMoved={setCatOverride} />
          </div>
        )}
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

            {/* 수정/삭제 버튼 (본인 또는 관리자) */}
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

export function TrendsPage({ user, setCurrentPage, setSelectedTrend }) {
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
          <button key={t.id} onClick={() => { setSelectedTrend(t); setCurrentPage('trend-detail', t.id); }}
            className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {getRowImages(t).length > 0 && (
              <div className="relative aspect-[16/9] overflow-hidden">
                <SkeletonImage src={getRowImages(t)[0]} alt={t.title} className="w-full h-full" />
                {getRowImages(t).length > 1 && (
                  <span className="absolute top-3 right-3 font-mono text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', color: COLORS.white }}>+{getRowImages(t).length - 1}</span>
                )}
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
              {getRowImages(t).length === 0 && (
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

export function TrendDetailPage({ trend: propTrend, user, routeId }) {
  const { item: trend, fetching } = useDetailItem(propTrend, routeId, 'trends');
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const [catOverride, setCatOverride] = useState(null);
  useEffect(() => { setCatOverride(null); }, [trend?.id]);
  if (!trend) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>트렌드를 찾을 수 없습니다.</p>}
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
      <div className="px-5 pt-5">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>
            {catOverride ?? trend.category}
          </span>
          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
            {new Date(trend.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
        {isAdmin && (
          <div className="mb-3">
            <CategoryMover table="trends" itemId={trend.id} current={catOverride ?? trend.category} options={['트렌드', '신상품', '시술기법', '업계소식', '마케팅팁']} onMoved={setCatOverride} />
          </div>
        )}
        <h1 className="font-display text-2xl tracking-tight leading-tight" style={{ color: COLORS.ink }}>{trend.title}</h1>
      </div>

      {getRowImages(trend).length > 0 && (
        <div className="px-5 mt-4">
          <ImageCarousel images={getRowImages(trend)} className="w-full" fit="contain" zoomable />
        </div>
      )}

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

export function QnaPage({ user, setCurrentPage, setSelectedQna }) {
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm, clearForm] = useDraft('qna', { title: '', content: '', category: '시술' });
  const PER_PAGE = 20;
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('전체');
  const [total, setTotal] = useState(0);
  const [displayCount, setDisplayCount] = useState(PER_PAGE);

  useEffect(() => { setDisplayCount(PER_PAGE); }, [filter]);
  useEffect(() => { load(); }, [filter, displayCount]);

  const load = async () => {
    let query = supabase.from('questions').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(0, displayCount - 1);
    if (filter !== '전체') query = query.eq('category', filter);
    const { data, count } = await query;
    setQuestions(data || []);
    setTotal(count || 0);
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
          title: `[${form.category}] 새 질문이 등록되었어요`,
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
    setCurrentPage('qna-detail', q.id);
  };
 
  const categories = ['전체', '시술', '재료', '수업', '창업'];

  return (
    <>
      <PageIntro ko="Q&A" en="Questions" desc="궁금한 점을 물어보세요" />

      {/* 카테고리 필터 - 재료샵 스타일 */}
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

      {/* 결과 카운트 */}
      <div className="px-5 mb-4">
        <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
          {filter === '전체' ? '총 ' : `${filter} 카테고리 `}
          <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>{total}개</span>
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
        {questions.length === 0 ? (
          <p className="text-center py-10 font-body text-sm" style={{ color: COLORS.stone }}>
            {filter === '전체' ? '등록된 질문이 없습니다' : `${filter} 카테고리에 질문이 없습니다`}
          </p>
        ) : (
          <>
          {questions.map(q => (
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
          {total > questions.length && (
            <button onClick={() => setDisplayCount(n => n + PER_PAGE)}
              className="w-full rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
              style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
              더 보기 ({total - questions.length}개 남음) <ChevronRight size={12} />
            </button>
          )}
          </>
        )}
      </div>
    </>
  );
}

export function LibraryPage({ setCurrentPage, setSelectedLibrary }) {
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
    setCurrentPage('library-detail', file.id);
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
                {getRowImages(f).length > 0 ? (
                  <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden relative" style={{ border: `1px solid ${COLORS.light}` }}>
                    <img src={getRowImages(f)[0]} alt="" className="w-full h-full object-cover" />
                    {getRowImages(f).length > 1 && (
                      <span className="absolute bottom-0 right-0 font-mono text-[8px] font-bold px-1 rounded-tl" style={{ background: 'rgba(0,0,0,0.6)', color: COLORS.white }}>{getRowImages(f).length}</span>
                    )}
                  </div>
                ) : (
                  <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl glow-soft" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
                    <FolderOpen size={20} style={{ color: COLORS.primary }} />
                  </div>
                )}
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

export function LibraryDetailPage({ file: propFile, setCurrentPage, routeId }) {
  const { item: file, fetching } = useDetailItem(propFile, routeId, 'library_files');
  if (!file) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>자료를 찾을 수 없습니다.</p>}
      </div>
    );
  }

  const handleDownload = () => {
    if (!file.file_url) { toast('첨부파일이 없습니다'); return; }
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

      {getRowImages(file).length > 0 && (
        <div className="px-5 mb-4">
          <ImageCarousel images={getRowImages(file)} className="w-full" fit="contain" zoomable />
        </div>
      )}

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
          <p className="font-mono text-[11px] text-center" style={{ color: COLORS.muted }}>첨부파일이 없는 자료입니다</p>
        </div>
      )}
    </div>
  );
}

export function MarketPage({ setCurrentPage, setSelectedProduct }) {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  const openDetail = (p) => {
    setSelectedProduct(p);
    setCurrentPage('product-detail', p.id);
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

      {/* 검색바 */}
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

      {/* 정렬 + 결과 카운트 */}
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
                      <span className="text-5xl" style={{ color: COLORS.primary }}>{p.emoji || ''}</span>
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
                  {/* 인기순일 때만 좋아요 수 표시 */}
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

export function OnlineLecturePage({ setCurrentPage, setSelectedLecture }) {
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
    setCurrentPage('lecture-detail', lecture.id);
  };

  return (
    <>
      <PageIntro ko="온라인 강의" en="Lectures" desc="언제 어디서나 학습하세요 · 9월 오픈 예정" />

      {/* 9월 오픈 안내 배너 */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: COLORS.peach, border: `1px solid ${COLORS.primary}` }}>
          <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: COLORS.primary, boxShadow: '0 0 16px rgba(255, 92, 31, 0.35)' }}>
            <PlayCircle size={16} style={{ color: COLORS.white }} />
          </div>
          <div>
            <p className="font-heading text-sm" style={{ color: COLORS.deep }}>온라인 강의 9월 오픈 예정 </p>
            <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: COLORS.ink }}>
              현재 강의 영상을 정성껏 준비하고 있어요. 9월에 오픈되면 알려드릴게요!
            </p>
          </div>
        </div>
      </div>

      {/* 검색바 */}
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

      {/* 정렬 + 결과 카운트 */}
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
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <span className="font-heading text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                  <Clock size={12} /> 영상 준비중
                </span>
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
                {/* 인기순일 때만 좋아요 수 표시 */}
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

export function LectureDetailPage({ lecture: propLecture, user, routeId }) {
  const { item: lecture, fetching } = useDetailItem(propLecture, routeId, 'lectures');
  // 🍊 오리엔테이션 영상이면 자동 미션 체크
  useEffect(() => {
    if (lecture?.is_orientation && user && !user.onb_video) {
      supabase.from('profiles').update({ onb_video: true }).eq('id', user.id).then(() => {
        // 3초 후 자동 새로고침 (영상 시청 시간 확보)
        setTimeout(() => {
          if (!user.onb_greeting || !user.onb_review) {
            // 다른 미션 남았으면 알림
            toast('오리엔테이션 시청 완료!');
            window.location.reload();
          } else {
            // 마지막 미션이면 축하
            toast('모든 미션 완료! HSSUP 시작!');
            window.location.reload();
          }
        }, 3000);
      });
    }
  }, [lecture, user]);

  if (!lecture) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>강의를 찾을 수 없습니다.</p>}
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

export function PostDetailPage({ post: propPost, user, setCurrentPage, routeId }) {
  const { item: post, fetching } = useDetailItem(propPost, routeId, 'community_posts');
  const [author, setAuthor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ content: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!post?.user_id) return;
    supabase.from('public_profiles').select('name, avatar_color, avatar_url, role').eq('id', post.user_id).maybeSingle()
      .then(({ data }) => setAuthor(data));
    setEditForm({ content: post.content || '' });
  }, [post]);

  if (!post) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>게시글을 찾을 수 없습니다.</p>}
      </div>
    );
  }

  const isOwner = post.user_id === user?.id;
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  const handleUpdate = async () => {
    if (!editForm.content.trim()) return toast('내용을 입력해주세요');
    setActionLoading(true);
    const { error } = await supabase.from('community_posts').update({
      content: editForm.content.trim(),
    }).eq('id', post.id);
    setActionLoading(false);
    if (error) {
      toast('수정 실패: ' + error.message);
    } else {
      toast('수정 완료!');
      setEditing(false);
      // 카테고리별로 돌아갈 페이지 결정
      const backPage = post.category === '인사' ? 'greetings'
                      : post.category === '후기' ? 'reviews'
                      : 'freeboard';
      setCurrentPage(backPage);
    }
  };

  const handleDelete = async () => {
    if (!await confirmDialog('이 게시글을 삭제하시겠습니까?\n댓글과 좋아요도 함께 삭제됩니다.')) return;
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

      // 2-1. 첨부 사진·영상 삭제
      for (const url of getRowImages(post)) await deleteImageFromBucket(url, 'community-images');
      if (post.video_url) await deletePostVideo(post.video_url);

      // 3. 글 삭제
      const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
      if (error) throw error;
      
      toast('삭제되었습니다');
      const backPage = post.category === '인사' ? 'greetings'
                      : post.category === '후기' ? 'reviews'
                      : 'freeboard';
      setCurrentPage(backPage);
    } catch (err) {
      toast('삭제 실패: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 📂 게시판(카테고리) 이동 — 관리자/스태프 전용
  const BOARD_CATEGORIES = [
    { value: '자유', label: '자유게시판', page: 'freeboard' },
    { value: '인사', label: '가입 인사', page: 'greetings' },
    { value: '후기', label: '수강후기', page: 'reviews' },
  ];

  const handleMoveCategory = async (newCat) => {
    const target = BOARD_CATEGORIES.find(c => c.value === newCat);
    if (!target || newCat === post.category) return;
    if (!await confirmDialog(`이 게시글을 "${target.label}"(으)로 이동할까요?`)) return;
    setActionLoading(true);
    const { error } = await supabase.from('community_posts').update({ category: newCat }).eq('id', post.id);
    setActionLoading(false);
    if (error) { toast('이동 실패: ' + error.message); return; }
    toast(`"${target.label}"(으)로 이동했어요`);
    setCurrentPage(target.page);
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

  // 유튜브 ID 추출
  const getYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([^&\s]+)/, /youtu\.be\/([^?\s]+)/,
      /youtube\.com\/embed\/([^?\s]+)/, /youtube\.com\/shorts\/([^?\s]+)/,
    ];
    for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
    return null;
  };
  const ytId = post.video_url && isYouTubeUrl(post.video_url) ? getYouTubeId(post.video_url) : null;

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

            {/* 수정/삭제 버튼 (본인 또는 관리자) */}
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

          {/* 카테고리 이동 (관리자/스태프 전용) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 flex-wrap mb-4 pb-4" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase mr-1" style={{ color: COLORS.stone }}>이동</span>
              {BOARD_CATEGORIES.map(c => {
                const active = c.value === post.category;
                return (
                  <button key={c.value} onClick={() => handleMoveCategory(c.value)} disabled={actionLoading || active}
                    className="font-heading text-[10px] px-3 py-1.5 rounded-full"
                    style={{
                      background: active ? COLORS.primary : COLORS.cardElev,
                      color: active ? COLORS.white : COLORS.ink,
                      border: `1px solid ${active ? COLORS.primary : COLORS.light}`,
                    }}>
                    {c.label}{active ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          )}

          {post.content && (
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>
              {post.content}
            </p>
          )}

          {getRowImages(post).length > 0 && (
            <div className="mt-3">
              <ImageCarousel images={getRowImages(post)} className="w-full" fit="contain" zoomable />
            </div>
          )}

          {post.video_url && (
            <div className="mt-3 rounded-xl overflow-hidden" style={{ background: '#000' }}>
              {ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                  title="영상" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen className="w-full aspect-video" style={{ border: 'none' }} />
              ) : (
                <video src={post.video_url} controls playsInline className="w-full" style={{ maxHeight: '70vh' }} />
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <LikeButton targetType="community_post" targetId={post.id} userId={user.id} size={16} />
          </div>

          <CommentSection targetType="community_post" targetId={post.id} user={user} />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailPage({ product: propProduct, user, setCurrentPage, setSelectedCourse, routeId }) {
  const [addingToCart, setAddingToCart] = useState(false);
  const { item: product, fetching } = useDetailItem(propProduct, routeId, 'products');

  if (!product) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>상품을 찾을 수 없습니다.</p>}
      </div>
    );
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const addToCart = async () => {
    if (!user) return;
    if (product.stock === 0) { toast('품절된 상품입니다.'); return; }
    setAddingToCart(true);
    try {
      // 이미 담겨있으면 수량 +1, 없으면 insert
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();
      if (existing) {
        const newQty = (existing.quantity || 1) + 1;
        const { error } = await supabase.from('cart_items').update({ quantity: newQty }).eq('id', existing.id);
        if (error) throw error;
        toast(`장바구니에 추가됐어요\n현재 수량: ${newQty}개`);
      } else {
        const { error } = await supabase.from('cart_items').insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
        });
        if (error) throw error;
        toast('장바구니에 담겼어요');
      }
    } catch (err) {
      toast('장바구니 담기 실패: ' + err.message);
    }
    setAddingToCart(false);
  };

  return (
    <div className="pb-32">
      {/* 큰 이미지 */}
      <div className="relative aspect-square w-full overflow-hidden" style={{ background: COLORS.cream }}>
        {getRowImages(product).length > 0 ? (
          <ImageCarousel images={getRowImages(product)} className="w-full h-full" rounded="" bordered={false} zoomable />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-9xl" style={{ color: COLORS.primary }}>{product.emoji || ''}</span>
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

      {/* 좋아요 (재료 상품은 댓글 없이 좋아요만) */}
      <div className="px-5 mt-3">
        <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <LikeButton targetType="product" targetId={product.id} userId={user.id} size={16} />
        </div>
      </div>

      {/* 하단 구매/장바구니 버튼 (고정) */}
      <div className="fixed left-0 right-0 px-5 py-3" style={{
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${COLORS.light}`,
        maxWidth: '480px',
        margin: '0 auto',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
      }}>
        <div className="flex gap-2">
          <button onClick={addToCart}
            disabled={product.stock === 0 || addingToCart}
            className="flex-1 rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: COLORS.card,
              color: COLORS.ink,
              border: `1px solid ${COLORS.light}`,
            }}>
            {addingToCart ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} strokeWidth={2.5} />}
            장바구니
          </button>
          <button onClick={() => {
                  if (product.stock === 0) { toast('품절된 상품입니다.'); return; }
                  setSelectedCourse(null);
                  sessionStorage.removeItem('hssup_sel_course');  // stale 클래스 제거 (새로고침 시 혼동 방지)
                  setCurrentPage('payment');
                }}
            disabled={product.stock === 0}
            className="flex-1 rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: product.stock === 0 ? COLORS.cardElev : COLORS.primary,
              color: COLORS.white,
              boxShadow: product.stock === 0 ? 'none' : '0 0 24px rgba(255, 92, 31, 0.5)'
            }}>
            <ShoppingCart size={16} strokeWidth={2.5} />
            {product.stock === 0 ? '품절' : '바로 구매'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaymentPage({ course, product, user, setCurrentPage }) {
  const [loading, setLoading] = useState(false);
  const [agreedPurchase, setAgreedPurchase] = useState(false);
  const [agreedRefund, setAgreedRefund] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'refund' | 'terms' | 'privacy' | null
  const allAgreed = agreedPurchase && agreedRefund;

  // 배송 정보 (재료 구매 시만 사용) — 저장된 기본 배송지가 있으면 자동 입력
  const [shippingRecipientName, setShippingRecipientName] = useState(user?.ship_name || user?.name || '');
  const [shippingRecipientPhone, setShippingRecipientPhone] = useState(user?.ship_phone || user?.phone || '');
  const [shippingPostalCode, setShippingPostalCode] = useState(user?.ship_postal || '');
  const [shippingAddress, setShippingAddress] = useState(user?.ship_addr || '');
  const [shippingAddressDetail, setShippingAddressDetail] = useState(user?.ship_addr_detail || '');
  const [shippingMemo, setShippingMemo] = useState(user?.ship_memo || '');
  const [saveDefaultShip, setSaveDefaultShip] = useState(true);
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
      toast('우편번호 검색 중 오류가 발생했어요. 다시 시도해주세요.');
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
      toast('필수 약관에 모두 동의해주세요.');
      return;
    }

    // 재료(product) 구매 시 배송 정보 검증
    if (isProduct) {
      if (!shippingRecipientName?.trim()) {
        toast('받는 사람 이름을 입력해주세요.');
        return;
      }
      if (!shippingRecipientPhone?.trim()) {
        toast('받는 사람 연락처를 입력해주세요.');
        return;
      }
      if (!shippingPostalCode || !shippingAddress) {
        toast('"주소 검색" 버튼을 눌러 주소를 입력해주세요.');
        return;
      }
      if (!shippingAddressDetail?.trim()) {
        toast('상세 주소를 입력해주세요. (동/호수 등)');
        return;
      }
      // 기본 배송지 저장 (선택)
      if (saveDefaultShip) {
        supabase.from('profiles').update({
          ship_name: shippingRecipientName.trim(),
          ship_phone: shippingRecipientPhone.trim(),
          ship_postal: shippingPostalCode,
          ship_addr: shippingAddress,
          ship_addr_detail: shippingAddressDetail.trim(),
          ship_memo: shippingMemo?.trim() || null,
        }).eq('id', user.id).then(() => {}, () => {});
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
      toast('결제 시작 실패: ' + (err.message || err));
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

        {/* 배송 정보 (재료 구매 시에만 표시) */}
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

            <label className="flex items-center gap-2 font-body text-xs cursor-pointer pt-1" style={{ color: COLORS.ink }}>
              <input type="checkbox" checked={saveDefaultShip} onChange={e => setSaveDefaultShip(e.target.checked)}
                className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
              <span>이 배송지를 기본 배송지로 저장</span>
            </label>

            <p className="font-body text-[10px] mt-1" style={{ color: COLORS.muted }}>
              결제 완료 시 1~3 영업일 내 발송됩니다
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
            <strong>나이스페이먼츠로 안전 결제</strong><br />
            카드 / 계좌이체 / 간편결제 / 무통장 입금 가능
          </p>
        </div>

        {/* 결제 동의 (필수) */}
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
          안전하게 암호화되어 결제됩니다
        </p>
      </div>

      {/* 약관 보기 모달 (결제 페이지용) */}
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
          Portal로 document.body에 렌더: 부모 <main>의 transform 인라인 스타일이
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

export function PaymentSuccessPage({ user, setCurrentPage }) {
  // 나이스페이는 Edge Function(nicepay-return)에서 amount 검증 + 결제 승인 + DB 업데이트가
  // 모두 끝난 뒤 ?payment=success&orderId=xxx 로 redirect 되어 옵니다.
  // 그러므로 이 페이지는 결과 표시만 하면 됩니다.
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🍊 iOS PWA 제약: NicePay redirect 체인이 Safari를 거치면서 사용자가 Safari에 남게 됨.
  //    standalone(PWA) 모드인지 감지해서 안내 UI를 다르게 표시.
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
  // 🍊 과거에 PWA로 진입한 적이 있는지 (Safari에서 결제 후 PWA로 돌아가라고 안내할지 판단)
  const hasPwaInstalled = typeof window !== 'undefined' && localStorage.getItem('hssup_is_pwa_user') === '1';

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        // URL의 orderId가 우선, 없으면 localStorage 완료 플래그 사용 (PWA 재진입 시)
        let orderId = params.get('orderId');
        if (!orderId) {
          try {
            const raw = localStorage.getItem('hssup_payment_completed');
            if (raw) {
              const c = JSON.parse(raw);
              if (Date.now() - (c.ts || 0) < 30 * 60 * 1000) orderId = c.orderId;
            }
          } catch (e) { /* 무시 */ }
        }
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

        // 🍊 Safari에서 열렸다면 localStorage에 완료 플래그를 적어둠 → PWA로 돌아왔을 때 이 페이지 자동 표시
        if (!isStandalone && order) {
          try {
            localStorage.setItem('hssup_payment_completed', JSON.stringify({
              orderId: order.order_id,
              userId: order.user_id,
              ts: Date.now(),
            }));
          } catch (e) { /* 무시 */ }
        } else if (isStandalone) {
          // PWA에서 이 페이지를 본 시점에 완료 플래그는 더 이상 필요 없음
          localStorage.removeItem('hssup_payment_completed');
        }

        // (URL은 react-router가 관리 — 수동 정리 불필요)
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

      {/* Safari에서 열렸으면 PWA로 돌아가도록 안내.
          iOS PWA와 Safari의 localStorage가 분리돼서 hasPwaInstalled를 신뢰할 수 없어
          기준을 단순화: standalone이 아니면(=Safari) 안내 노출. */}
      {!isStandalone && (
        <div className="mx-5 mb-3 rounded-2xl p-4" style={{ background: COLORS.peach, border: `1px solid ${COLORS.primary}` }}>
          <p className="font-heading text-sm" style={{ color: COLORS.deep }}>HSSUP 앱에서 자세한 내역을 확인하세요</p>
          <p className="font-body text-xs mt-1" style={{ color: COLORS.deep, opacity: 0.85 }}>
            홈 화면의 HSSUP 아이콘을 누르시면 결제 상세와 배송 정보를 보실 수 있어요.
            (방금 받은 푸시 알림을 눌러도 앱이 열려요.)
          </p>
        </div>
      )}

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

        <button onClick={() => setCurrentPage('home')} className="w-full mt-3 font-heading text-sm py-3.5 rounded-full" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255,92,31,0.5)' }}>
          홈으로 가기
        </button>
      </div>
    </div>
  );
}

export function PaymentFailPage({ setCurrentPage }) {
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
        <button onClick={() => setCurrentPage('course')} className="w-full font-heading text-sm py-3.5 rounded-full" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255,92,31,0.5)' }}>
          클래스 다시 보기
        </button>
      </div>
    </div>
  );
}

export function CommunityPage({ user, setCurrentPage, setSelectedPost, fixedCategory, pageTitle, pageEn, pageDesc }) {
  const POSTS_PER_PAGE = 20;
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [newPost, setNewPost, clearNewPost] = useDraft(`community_${fixedCategory || 'free'}`, '');
  const [loading, setLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(POSTS_PER_PAGE);
  const isAdmin = user?.role === 'admin';

  // 📎 첨부: 사진(여러 장) + 영상(파일 또는 유튜브)
  const [media, setMedia] = useState({ image_urls: [], imageFiles: [], imagePreviews: [] });
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const videoInputRef = useRef(null);

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast('영상 파일은 50MB까지만 올릴 수 있어요.\n긴 영상은 유튜브에 올린 뒤 링크를 붙여넣어 주세요!\n(저장공간·데이터 절약)');
      return;
    }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setYoutubeUrl('');
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  };

  const resetComposer = () => {
    media.imagePreviews.forEach(p => URL.revokeObjectURL(p));
    setMedia({ image_urls: [], imageFiles: [], imagePreviews: [] });
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setYoutubeUrl('');
    setShowAttach(false);
  };

  // 카테고리 바뀌면 페이지 초기화
  useEffect(() => { setDisplayCount(POSTS_PER_PAGE); }, [fixedCategory]);
  // 🚀 필요한 만큼만 DB에서 조회 (displayCount 증가 시 추가 로드) — 전체 풀로딩 방지
  useEffect(() => { load(); }, [fixedCategory, displayCount]);

  const load = async () => {
    let query = supabase.from('community_posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, displayCount - 1);
    if (fixedCategory) {
      query = query.eq('category', fixedCategory);
    }
    const { data: postsData, count } = await query;
    setTotal(count || 0);

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      return;
    }

    const userIds = [...new Set(postsData.map(p => p.user_id).filter(Boolean))];
    const { data: profilesData } = await supabase
      .from('public_profiles')
      .select('id, name, avatar_color, avatar_url, role')
      .in('id', userIds);

    const profileMap = {};
    (profilesData || []).forEach(p => { profileMap[p.id] = p; });

    const enriched = postsData.map(p => ({ ...p, profile: profileMap[p.user_id] || { name: '익명' } }));
    setPosts(enriched);
  };

  const remove = async (post, e) => {
    e?.stopPropagation();
    if (!await confirmDialog('이 게시글을 삭제하시겠습니까?')) return;
    for (const url of getRowImages(post)) await deleteImageFromBucket(url, 'community-images');
    if (post.video_url) await deletePostVideo(post.video_url);
    await supabase.from('community_posts').delete().eq('id', post.id);
    await load();
  };

  const submit = async () => {
    const hasMedia = media.imageFiles.length > 0 || !!videoFile || !!youtubeUrl.trim();
    if (!newPost.trim() && !hasMedia) return;
    setLoading(true);
    let imageUrls = [];
    let videoUrlFinal = null;
    try {
      if (media.imageFiles.length > 0) imageUrls = await persistFormImages(media, 'community-images', 1280);
      if (videoFile) videoUrlFinal = await uploadPostVideo(videoFile);
      else if (youtubeUrl.trim()) videoUrlFinal = youtubeUrl.trim();
    } catch (err) {
      console.error('미디어 업로드 실패:', err);
      toast('사진/영상 업로드에 실패했어요: ' + (err.message || err));
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('community_posts').insert({
      content: newPost,
      user_id: user.id,
      category: fixedCategory || '자유',
      image_urls: imageUrls,
      video_url: videoUrlFinal,
    });
    if (error) {
      console.error('글 작성 에러:', error);
      toast('글 작성 실패: ' + error.message);
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
        toast('미션 완료! 온보딩으로 돌아갑니다.');
        clearNewPost();
        resetComposer();
        await load();
        setLoading(false);
        setTimeout(() => window.location.reload(), 500);
        return;
      }
      // 📢 알림 발송 (학생→관리자, 관리자→학생)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const targetRole = isAdmin ? 'student' : 'admin';
        const titlePrefix = isAdmin
          ? `[${pageTitle || '게시판'}] 원장님이 글을 남겼어요`
          : `[${pageTitle || '게시판'}] 새 글이 등록됐어요`;
        
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
      resetComposer();
      await load();
    }
    setLoading(false);
  };

  const openDetail = (p) => {
    setSelectedPost(p);
    setCurrentPage('post-detail', p.id);
  };

  const placeholder = fixedCategory === '후기'
    ? '수강 후기를 공유해보세요'
    : '무슨 생각을 하고 계세요?';

  const emptyMsg = fixedCategory === '후기'
    ? '첫 후기를 남겨보세요!'
    : '첫 게시글을 남겨보세요!';

  // 👋 가입 인사 양식 (인사 게시판 전용)
  const GREETING_TEMPLATE = `안녕하세요. 히썹 아카데미에 합류하게 된 OOO입니다.

• 닉네임 / 이름 :
• 수강 클래스 :
• 거주 지역 :
• 반영구를 시작하게 된 계기 :
• 앞으로의 목표 한마디 :

잘 부탁드립니다.`;

  return (
    <>
      <PageIntro ko={pageTitle || "커뮤니티"} en={pageEn || "Community"} desc={pageDesc || "동료들과 이야기 나눠보세요"} />
      <div className="px-5 space-y-3">
        {/* 가입 인사 양식 + 규정 안내 (인사 게시판 전용) */}
        {fixedCategory === '인사' && (
          <div className="rounded-2xl p-4" style={{ background: COLORS.peach, border: `1px solid ${COLORS.primary}` }}>
            <p className="font-heading text-sm flex items-center gap-1.5" style={{ color: COLORS.deep }}>
              <Sparkles size={14} /> 가입 인사 작성 안내
            </p>
            <div className="rounded-xl p-3 mt-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>━━ 양식 예시</p>
              <p className="font-body text-xs leading-relaxed whitespace-pre-line" style={{ color: COLORS.ink }}>{GREETING_TEMPLATE}</p>
            </div>
            <div className="rounded-xl p-3 mt-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-1.5" style={{ color: COLORS.primary }}>━━ 규정 안내</p>
              <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.ink }}>
                • 가입 후 첫 인사를 남겨주세요.<br />
                • <b>수강 후기를 작성</b>하시면 <b>등업 예정</b>입니다.<br />
                • 서로 존중하는 커뮤니티를 함께 만들어가요.
              </p>
            </div>
            <button onClick={() => setNewPost(GREETING_TEMPLATE)}
              className="w-full mt-3 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5"
              style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255, 92, 31, 0.35)' }}>
              <Edit3 size={12} /> 양식 불러와서 작성하기
            </button>
          </div>
        )}
        {/* 글 작성 */}
        <div className="rounded-2xl p-3 space-y-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
            placeholder={placeholder} rows={fixedCategory === '인사' ? 11 : 3}
            className="w-full font-body text-sm font-medium p-3 outline-none resize-y rounded leading-relaxed"
            style={{ background: COLORS.cream, color: COLORS.ink }} />

          {/* 첨부 영역 */}
          {showAttach && (
            <div className="space-y-2 animate-fade-in">
              <MultiImageField label="사진 (여러 장)" value={media} onChange={(v) => setMedia({ ...media, ...v })} max={6} />

              {/* 영상 */}
              {videoPreview ? (
                <div className="relative rounded-xl overflow-hidden" style={{ background: COLORS.cream }}>
                  <video src={videoPreview} className="w-full max-h-48" controls playsInline />
                  <button onClick={removeVideo} className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)' }}>
                    <X size={13} style={{ color: COLORS.white }} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => videoInputRef.current?.click()}
                    className="font-heading text-[11px] px-3 py-2 rounded-full flex items-center gap-1.5"
                    style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                    <Play size={11} /> 영상 파일
                  </button>
                  <input value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)}
                    placeholder="또는 유튜브 링크 붙여넣기"
                    className="flex-1 font-body text-[11px] px-3 py-2 rounded-full outline-none"
                    style={{ background: COLORS.cream, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
                </div>
              )}
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => setShowAttach(v => !v)}
              className="font-heading text-[11px] px-3 py-2 rounded-full flex items-center gap-1.5"
              style={{ background: showAttach ? COLORS.peach : COLORS.cream, color: showAttach ? COLORS.primary : COLORS.stone, border: `1px solid ${COLORS.light}` }}>
              <ImageIcon size={12} /> 사진/영상
            </button>
            <button onClick={submit} disabled={loading} className="font-heading text-[11px] px-4 py-2 rounded-full flex items-center gap-1" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}Post
            </button>
          </div>
        </div>

        {/* 게시글 목록 */}
        {posts.length === 0 ? (
          <div className="text-center py-10">
            <Users size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
            <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>{emptyMsg}</p>
          </div>
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
                <button onClick={(e) => remove(p, e)} className="p-1.5 rounded-full" style={{ background: COLORS.cream }}>
                  <Trash2 size={12} style={{ color: COLORS.deep }} />
                </button>
              )}
            </div>
            {p.content && <p className="font-body text-xs font-medium leading-relaxed whitespace-pre-line line-clamp-4" style={{ color: COLORS.ink }}>{p.content}</p>}
            {(getRowImages(p).length > 0 || p.video_url) && (
              <div className="flex items-center gap-2 mt-2">
                {getRowImages(p).length > 0 && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${COLORS.light}` }}>
                    <img src={getRowImages(p)[0]} alt="" className="w-full h-full object-cover" />
                    {getRowImages(p).length > 1 && (
                      <span className="absolute bottom-0 right-0 font-mono text-[8px] font-bold px-1 rounded-tl" style={{ background: 'rgba(0,0,0,0.6)', color: COLORS.white }}>+{getRowImages(p).length - 1}</span>
                    )}
                  </div>
                )}
                {p.video_url && (
                  <span className="font-mono text-[10px] px-2 py-1 rounded-full flex items-center gap-1" style={{ background: COLORS.cream, color: COLORS.stone }}>
                    <Play size={10} /> 영상
                  </span>
                )}
              </div>
            )}
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
        
        {/* 더 보기 버튼 */}
        {total > posts.length && (
          <button onClick={() => setDisplayCount(c => c + POSTS_PER_PAGE)}
            className="w-full rounded-full py-3 font-heading text-xs flex items-center justify-center gap-2"
            style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
            더 보기 ({total - posts.length}개 남음) <ChevronRight size={12} />
          </button>
        )}

        {posts.length > 0 && total <= posts.length && (
          <p className="text-center font-mono text-[10px] py-2" style={{ color: COLORS.stone }}>
            ━━ 마지막 게시글 ━━
          </p>
        )}
      </div>
    </>
  );
}

export function MyActivityPage({ user, setCurrentPage, setSelectedPost }) {
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
      setCurrentPage('post-detail', data.id);
    } else {
      toast('이 게시글은 삭제되었어요');
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

export function MyPage({ user, handleLogout, setCurrentPage, refreshUser }) {
  const isAdmin = user.role === 'admin' || user.role === 'staff';
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState(user.avatar_color || 'orange');
  const [currentAvatar, setCurrentAvatar] = useState(user.avatar_url || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [notifStatus, setNotifStatus] = useState('checking');
  const [notifLoading, setNotifLoading] = useState(false);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoUploading(true);
    try {
      const oldUrl = currentAvatar;
      const url = await uploadImageToBucket(file, 'avatars', 512);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (error) throw error;
      setCurrentAvatar(url);
      if (oldUrl) await deleteImageFromBucket(oldUrl, 'avatars');
      await refreshUser?.();
    } catch (err) {
      console.error('프로필 사진 업로드 실패:', err);
      toast('사진 업로드에 실패했어요: ' + (err.message || err));
    }
    setPhotoUploading(false);
  };

  const removePhoto = async () => {
    if (!currentAvatar) return;
    if (!await confirmDialog('프로필 사진을 삭제할까요?')) return;
    setPhotoUploading(true);
    try {
      const oldUrl = currentAvatar;
      const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      if (error) throw error;
      setCurrentAvatar(null);
      await deleteImageFromBucket(oldUrl, 'avatars');
      await refreshUser?.();
    } catch (err) {
      console.error('프로필 사진 삭제 실패:', err);
      toast('사진 삭제에 실패했어요: ' + (err.message || err));
    }
    setPhotoUploading(false);
  };

  const handleDeleteAccount = async () => {
    if (isAdmin) {
      toast('관리자 계정은 탈퇴할 수 없어요.');
      return;
    }
    if (!await confirmDialog('정말 회원 탈퇴하시겠습니까?\n\n탈퇴 후에는 되돌릴 수 없으며,\n작성한 글과 댓글은 "탈퇴한 회원"으로 표시됩니다.')) return;
    if (!await confirmDialog('마지막 확인입니다.\n정말 탈퇴를 진행하시겠습니까?')) return;
    
    try {
      const { error } = await supabase.from('profiles').update({
        status: 'deleted',
        role: 'student',  // 운영진 권한 자동 해제
        name: '탈퇴한 회원',
        phone: null,
        deleted_at: new Date().toISOString(),
      }).eq('id', user.id);
      
      if (error) {
        toast('탈퇴 실패: ' + error.message);
        return;
      }
      
      toast('탈퇴가 완료되었습니다.\n그동안 이용해주셔서 감사합니다.');
      await handleLogout();
    } catch (e) {
      toast('탈퇴 실패: ' + e.message);
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
      toast('알림이 설정되었습니다!\n공지, Q&A 답변 등을 실시간으로 받아보세요.');
    } else {
      toast('알림 설정에 실패했습니다.\n' + result.error);
    }
    setNotifLoading(false);
  };

  const handleDisableNotifications = async () => {
    if (!await confirmDialog('알림을 끄시겠습니까?')) return;
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
      toast('컬러 변경 실패. 다시 시도해주세요.');
    }
    setSaving(false);
  };

  // 표시용 user 객체 (실시간 미리보기)
  const displayUser = { ...user, avatar_color: currentColor, avatar_url: currentAvatar };

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
                <Camera size={11} style={{ color: COLORS.white }} />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl tracking-tight" style={{ color: COLORS.white }}>{user.name}</h2>
                {isAdmin && <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded" style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255, 92, 31, 0.35)' }}>ADMIN</span>}
              </div>
              <p className="font-mono text-[10px] mt-1 truncate" style={{ color: COLORS.ink, opacity: 0.6 }}>{user.email}</p>
              <p className="font-body text-sm mt-2" style={{ color: COLORS.primary }}>{user.course}</p>
            </div>
          </div>
        </section>

        {/* 프로필 사진·아바타 컬러 (아바타 누르면 펼침) */}
        {showColorPicker && (
          <section className="rounded-2xl p-4 animate-fade-in" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {/* 프로필 사진 */}
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>━━ Profile Photo</p>
            <div className="flex items-center gap-3 mb-4">
              <Avatar user={displayUser} size="xl" />
              <div className="flex-1 flex gap-2">
                <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
                  className="flex-1 font-heading text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{ background: COLORS.primary, color: COLORS.white }}>
                  {photoUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} strokeWidth={2.5} />}
                  {currentAvatar ? '사진 변경' : '사진 올리기'}
                </button>
                {currentAvatar && (
                  <button onClick={removePhoto} disabled={photoUploading}
                    className="px-3 py-2.5 rounded-full flex items-center justify-center disabled:opacity-60"
                    style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                    <Trash2 size={13} style={{ color: COLORS.stone }} />
                  </button>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
            </div>
            <div className="h-px w-full mb-4" style={{ background: COLORS.light }} />

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Avatar Color</p>
                <h3 className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>아바타 컬러 변경</h3>
                <p className="font-body text-[10px] mt-1" style={{ color: COLORS.muted }}>사진이 없을 때 표시돼요</p>
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

        {/* 등급 카드 (admin 제외) */}
        {!isAdmin && <LevelCard userId={user.id} setCurrentPage={setCurrentPage} />}

        {/* 내 활동 바로가기 (모든 사용자) */}
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

        {/* 주문 내역 (모든 사용자) */}
        <button onClick={() => setCurrentPage('my-orders')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
            <ShoppingBag size={18} style={{ color: COLORS.primary }} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>주문 내역</p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>결제 · 배송 상태 확인</p>
          </div>
          <ChevronRight size={16} style={{ color: COLORS.stone }} />
        </button>

        {/* 내 정보 수정 (모든 사용자) */}
        <button onClick={() => setCurrentPage('my-profile-edit')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
            <Edit3 size={18} style={{ color: COLORS.primary }} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>내 정보 수정</p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>이름 · 전화번호 변경</p>
          </div>
          <ChevronRight size={16} style={{ color: COLORS.stone }} />
        </button>

        {/* 장바구니 (모든 사용자) */}
        <button onClick={() => setCurrentPage('cart')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
            <ShoppingCart size={18} style={{ color: COLORS.primary }} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>장바구니</p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>담아둔 재료 한번에 결제</p>
          </div>
          <ChevronRight size={16} style={{ color: COLORS.stone }} />
        </button>

        {/* 내 예약 (모든 사용자) */}
        <button onClick={() => setCurrentPage('my-bookings')}
          className="w-full rounded-2xl p-4 flex items-center gap-3 transition-transform active:scale-[0.98]"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,92,31,0.1)', border: `1px solid rgba(255,92,31,0.25)` }}>
            <Calendar size={18} style={{ color: COLORS.primary }} />
          </div>
          <div className="flex-1 text-left">
            <p className="font-heading text-sm" style={{ color: COLORS.ink }}>내 예약</p>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: COLORS.stone }}>다가오는 연습 예약 확인</p>
          </div>
          <ChevronRight size={16} style={{ color: COLORS.stone }} />
        </button>


        {/* 알림 설정 */}
        <section className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ Notifications</p>
              <h3 className="font-heading text-sm mt-1" style={{ color: COLORS.ink }}>푸시 알림</h3>
              <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: COLORS.stone }}>
                {notifStatus === 'subscribed' && '공지, 답변을 실시간으로 받습니다'}
                {notifStatus === 'unsubscribed' && '알림을 켜면 공지를 놓치지 않아요'}
                {notifStatus === 'default' && '알림을 켜면 공지를 놓치지 않아요'}
                {notifStatus === 'denied' && '브라우저 설정에서 알림을 허용해주세요'}
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

export function MyProfileEditPage({ user, setCurrentPage, refreshUser }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), phone: phone.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast('저장 실패: ' + error.message);
      return;
    }
    if (refreshUser) await refreshUser();
    toast('저장되었습니다');
    setCurrentPage('mypage');
  };

  return (
    <>
      <PageIntro ko="내 정보 수정" en="Edit Profile" desc="이름과 연락처를 변경할 수 있어요" />
      <div className="px-5 space-y-3">
        {/* 이메일 (읽기 전용) */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
          <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>이메일 (변경 불가)</label>
          <p className="font-body text-sm mt-1.5" style={{ color: COLORS.muted }}>{user?.email || '-'}</p>
        </div>

        {/* 이름 */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>이름 *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
        </div>

        {/* 전화번호 */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>전화번호</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-full font-body text-sm p-3 mt-1.5 outline-none rounded"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
        </div>

        {/* 저장 / 취소 */}
        <div className="flex gap-2 mt-2">
          <button onClick={() => setCurrentPage('mypage')} disabled={saving}
            className="flex-1 rounded-full py-3.5 font-heading text-sm"
            style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
            취소
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 rounded-full py-3.5 font-heading text-sm flex items-center justify-center gap-2"
            style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255, 92, 31, 0.5)' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
            저장
          </button>
        </div>
      </div>
    </>
  );
}

export function MyOrdersPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['paid', 'cancelled'])
      .order('paid_at', { ascending: false });
    if (error) console.error('주문 내역 로드 에러:', error);
    setOrders(data || []);
    setLoading(false);
  };

  // 취소 요청 가능: 결제완료 + 취소 미요청 + (클래스 OR 배송대기 재료)
  const canCancel = (o) =>
    o.status === 'paid' && !o.cancel_status &&
    (o.item_type === 'course' || o.shipping_status === 'pending');

  const openCancelModal = (order) => {
    setCancelModalOrder(order);
    setCancelReason('');
  };
  const closeCancelModal = () => {
    setCancelModalOrder(null);
    setCancelReason('');
  };

  const requestCancel = async () => {
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) {
      toast('취소 사유를 입력해주세요.');
      return;
    }
    setCancelling(true);
    const { data, error } = await supabase.from('orders').update({
      cancel_status: 'requested',
      cancel_requested_at: new Date().toISOString(),
      cancel_reason_user: cancelReason.trim(),
    }).eq('order_id', cancelModalOrder.order_id).select();
    setCancelling(false);
    if (error) {
      toast('취소 요청 실패: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast('취소 요청이 반영되지 않았어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    closeCancelModal();
    await load();
    toast('취소 요청이 접수되었습니다.\n원장님 확인 후 처리됩니다.');
  };

  const formatPrice = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');
  const formatDate = (iso) => iso ? new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <>
      <PageIntro ko="주문 내역" en="My Orders" desc="결제하신 클래스와 재료를 확인하세요" />

      {loading ? (
        <div className="text-center py-10">
          <Loader2 size={20} className="animate-spin mx-auto" style={{ color: COLORS.primary }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10 px-5">
          <ShoppingBag size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
          <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>아직 주문 내역이 없어요</p>
        </div>
      ) : (
        <div className="px-5 space-y-3 pb-6">
          {orders.map(o => {
            const isProduct = o.item_type === 'product';
            const isCancelled = o.status === 'cancelled';
            const isShipped = o.shipping_status === 'shipped';
            const isDelivered = o.shipping_status === 'delivered';
            const cancelRequested = o.cancel_status === 'requested';
            const cancelRejected = o.cancel_status === 'rejected';

            let statusText = '결제 완료';
            let statusBg = COLORS.primary;
            let statusColor = COLORS.white;
            if (isCancelled) {
              statusText = '취소됨'; statusBg = COLORS.cardElev; statusColor = COLORS.stone;
            } else if (cancelRequested) {
              statusText = '취소 요청 중'; statusBg = COLORS.peach; statusColor = COLORS.deep;
            } else if (cancelRejected) {
              statusText = '취소 거절됨'; statusBg = COLORS.cardElev; statusColor = COLORS.stone;
            }

            return (
              <div key={o.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                {/* 헤더: 타입 + 상태 */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded inline-flex items-center gap-1"
                    style={{ background: COLORS.peach, color: COLORS.deep }}>
                    {isProduct ? <><Package size={10} />재료</> : <><BookOpen size={10} />클래스</>}
                  </span>
                  <span className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded"
                    style={{ background: statusBg, color: statusColor }}>
                    {statusText}
                  </span>
                </div>

                {/* 상품명 + 금액 */}
                <div className="mb-3">
                  <p className="font-heading text-sm" style={{ color: COLORS.ink, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                    {o.course_title || '-'}
                  </p>
                  <p className="font-display text-xl tracking-tight mt-1" style={{ color: isCancelled ? COLORS.stone : COLORS.primary, textDecoration: isCancelled ? 'line-through' : 'none' }}>
                    {formatPrice(o.amount)}
                  </p>
                </div>

                {/* 결제 정보 */}
                <div className="rounded-lg p-3 space-y-1.5" style={{ background: COLORS.cardElev }}>
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>결제일</span>
                    <span className="font-mono text-[10px]" style={{ color: COLORS.ink }}>{formatDate(o.paid_at || o.created_at)}</span>
                  </div>
                  {(o.payment_method || o.card_company) && (
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>결제수단</span>
                      <span className="font-body text-xs" style={{ color: COLORS.ink }}>
                        {o.payment_method || '카드'}{o.card_company ? ` · ${o.card_company}` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>주문번호</span>
                    <span className="font-mono text-[10px] truncate ml-2" style={{ color: COLORS.ink, maxWidth: '60%' }}>{o.order_id?.substring(0, 20)}...</span>
                  </div>
                </div>

                {/* 배송 상태 (재료, 결제완료만) */}
                {isProduct && !isCancelled && (
                  <div className="rounded-lg p-3 mt-2" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
                    <p className="font-mono text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1 mb-2" style={{ color: COLORS.primary }}>
                      <Truck size={10} />━━ 배송 상태
                    </p>
                    {isShipped || isDelivered ? (
                      <>
                        <div className="flex justify-between">
                          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>상태</span>
                          <span className="font-body text-xs font-semibold" style={{ color: COLORS.primary }}>{isDelivered ? '배송 완료' : '발송 완료'}</span>
                        </div>
                        {o.tracking_company && (
                          <div className="flex justify-between mt-1">
                            <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>택배사</span>
                            <span className="font-body text-xs" style={{ color: COLORS.ink }}>{o.tracking_company}</span>
                          </div>
                        )}
                        {o.tracking_number && (
                          <div className="flex justify-between mt-1">
                            <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>운송장</span>
                            <span className="font-mono text-xs" style={{ color: COLORS.ink }}>{o.tracking_number}</span>
                          </div>
                        )}
                        {o.shipped_at && (
                          <div className="flex justify-between mt-1">
                            <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>발송일</span>
                            <span className="font-mono text-[10px]" style={{ color: COLORS.ink }}>{formatDate(o.shipped_at)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="font-body text-xs" style={{ color: COLORS.stone }}>배송 대기 중 — 결제 완료 후 1-3 영업일 내 발송</p>
                    )}
                  </div>
                )}

                {/* 취소 사유 (취소된 경우) */}
                {isCancelled && o.cancel_reason && (
                  <div className="rounded-lg p-3 mt-2" style={{ background: COLORS.cardElev, borderLeft: `3px solid ${COLORS.stone}` }}>
                    <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>취소 사유</p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.ink }}>{o.cancel_reason}</p>
                  </div>
                )}

                {/* 사용자 취소 요청 사유 (요청 중·거절됨) */}
                {(cancelRequested || cancelRejected) && o.cancel_reason_user && (
                  <div className="rounded-lg p-3 mt-2" style={{ background: COLORS.cardElev, borderLeft: `3px solid ${cancelRequested ? COLORS.primary : COLORS.stone}` }}>
                    <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: cancelRequested ? COLORS.primary : COLORS.stone }}>
                      취소 요청 사유
                    </p>
                    <p className="font-body text-xs mt-1" style={{ color: COLORS.ink }}>{o.cancel_reason_user}</p>
                    {cancelRequested && (
                      <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>원장님 확인 후 처리됩니다.</p>
                    )}
                  </div>
                )}

                {/* 취소 요청 버튼 + 영수증 */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {!isCancelled && o.receipt_url && (
                    <a href={o.receipt_url} target="_blank" rel="noopener noreferrer"
                      className="font-heading text-[11px] px-3 py-2 rounded-full inline-flex items-center gap-1.5"
                      style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }}>
                      <Download size={12} />영수증
                    </a>
                  )}
                  {canCancel(o) && (
                    <button onClick={() => openCancelModal(o)}
                      className="font-heading text-[11px] px-3 py-2 rounded-full inline-flex items-center gap-1.5"
                      style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                      <X size={12} />주문 취소 요청
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 취소 요청 모달 (Portal + 풀스크린) */}
      {cancelModalOrder && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: COLORS.cream, zIndex: 9999,
          display: 'flex', flexDirection: 'column'
        }}>
          {/* 헤더 */}
          <div style={{
            flexShrink: 0, padding: '12px 16px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${COLORS.light}`, background: COLORS.card
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.ink, margin: 0, fontFamily: 'Pretendard, sans-serif' }}>주문 취소 요청</h3>
            <button onClick={closeCancelModal}
              style={{ width: 36, height: 36, border: 'none', background: 'transparent', color: COLORS.stone, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>

          {/* 본문 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div className="rounded-lg p-3 mb-4" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
              <p className="font-body text-xs" style={{ color: COLORS.ink }}>{cancelModalOrder.course_title}</p>
              <p className="font-display text-lg tracking-tight mt-1" style={{ color: COLORS.primary }}>
                {formatPrice(cancelModalOrder.amount)}
              </p>
            </div>

            <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>취소 사유 *</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder="취소 사유를 적어주세요"
              rows={5}
              className="w-full font-body text-sm p-3 mt-1.5 outline-none resize-none rounded"
              style={{ background: COLORS.card, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />

            <p className="font-body text-xs mt-3" style={{ color: COLORS.stone }}>
              원장님이 검토한 뒤 승인/거절이 결정됩니다. 승인 시 결제 금액이 결제 카드로 자동 환불됩니다.
            </p>
          </div>

          {/* 푸터 */}
          <div style={{
            flexShrink: 0, padding: 16,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            borderTop: `1px solid ${COLORS.light}`, background: COLORS.card,
            display: 'flex', gap: 8
          }}>
            <button onClick={closeCancelModal} disabled={cancelling}
              className="flex-1 rounded-full py-3 font-heading text-sm"
              style={{ background: COLORS.cardElev, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
              닫기
            </button>
            <button onClick={requestCancel} disabled={cancelling}
              className="flex-1 rounded-full py-3 font-heading text-sm flex items-center justify-center gap-2"
              style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 16px rgba(255,92,31,0.35)' }}>
              {cancelling ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
              취소 요청
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export function MyPracticeBookingsPage({ user, setCurrentPage }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('practice_bookings')
      .select('id, status, created_at, slot:slot_id(id, slot_date, start_time, end_time, capacity, memo)')
      .eq('user_id', user.id)
      .eq('status', 'booked')
      .order('created_at', { ascending: false });
    if (error) console.error('내 예약 로드 에러:', error);
    const valid = (data || [])
      .filter(b => b.slot)
      .sort((a, b) => {
        const aKey = a.slot.slot_date + (a.slot.start_time || '');
        const bKey = b.slot.slot_date + (b.slot.start_time || '');
        return bKey.localeCompare(aKey);  // 최신순
      });
    setBookings(valid);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancelBooking = async (b) => {
    if (!await confirmDialog('예약을 취소할까요?')) return;
    setActionLoading(b.id);
    const { data, error } = await supabase.from('practice_bookings')
      .update({ status: 'cancelled' })
      .eq('id', b.id).eq('status', 'booked')
      .select();
    setActionLoading(null);
    if (error) { toast('취소 실패: ' + error.message); return; }
    if (!data || data.length === 0) {
      toast('취소가 적용되지 않았어요.');
      return;
    }
    await load();
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const upcoming = bookings.filter(b => b.slot.slot_date >= todayStr);
  const past = bookings.filter(b => b.slot.slot_date < todayStr);

  const weekday = (slot_date) => {
    const [yy, mm, dd] = slot_date.split('-').map(Number);
    return ['일', '월', '화', '수', '목', '금', '토'][new Date(yy, (mm || 1) - 1, dd || 1).getDay()];
  };

  return (
    <>
      <PageIntro ko="내 예약" en="My Bookings" desc="다가오는 연습 예약과 지난 예약을 확인하세요" />

      <div className="px-5 space-y-4 pb-6">
        {/* 다가오는 예약 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>
              ━━ 다가오는 예약{upcoming.length > 0 && ` (${upcoming.length})`}
            </p>
            <button onClick={() => setCurrentPage('practice-booking')}
              className="font-heading text-[11px] px-3 py-1.5 rounded-full inline-flex items-center gap-1"
              style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 12px rgba(255,92,31,0.35)' }}>
              <Plus size={11} strokeWidth={2.5} />새 예약
            </button>
          </div>

          {loading ? (
            <div className="text-center py-6"><Loader2 size={16} className="animate-spin mx-auto" style={{ color: COLORS.primary }} /></div>
          ) : upcoming.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
              <Calendar size={28} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
              <p className="font-body text-sm mt-2" style={{ color: COLORS.stone }}>다가오는 예약이 없어요</p>
              <button onClick={() => setCurrentPage('practice-booking')}
                className="mt-3 font-heading text-xs px-4 py-2 rounded-full"
                style={{ background: COLORS.primary, color: COLORS.white }}>
                연습 예약하기
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(b => (
                <div key={b.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.primary}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-base inline-flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                        <Calendar size={14} style={{ color: COLORS.primary }} />
                        {b.slot.slot_date} ({weekday(b.slot.slot_date)})
                      </p>
                      <p className="font-body text-sm mt-1 inline-flex items-center gap-1.5" style={{ color: COLORS.stone }}>
                        <Clock size={12} style={{ color: COLORS.muted }} />
                        {(b.slot.start_time || '').substring(0, 5)} ~ {(b.slot.end_time || '').substring(0, 5)}
                      </p>
                      {b.slot.memo && <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.muted }}>{b.slot.memo}</p>}
                    </div>
                    <button onClick={() => cancelBooking(b)} disabled={actionLoading === b.id}
                      className="font-heading text-[11px] px-3 py-2 rounded-full inline-flex items-center gap-1 shrink-0"
                      style={{ background: COLORS.cardElev, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                      {actionLoading === b.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      취소
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 지난 예약 */}
        {past.length > 0 && (
          <div>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.stone }}>━━ 지난 예약 ({past.length})</p>
            <div className="space-y-2">
              {past.map(b => (
                <div key={b.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, opacity: 0.6 }}>
                  <p className="font-heading text-sm inline-flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                    <Calendar size={12} style={{ color: COLORS.muted }} />
                    {b.slot.slot_date} ({weekday(b.slot.slot_date)})
                  </p>
                  <p className="font-body text-xs mt-1 inline-flex items-center gap-1.5" style={{ color: COLORS.stone }}>
                    <Clock size={11} style={{ color: COLORS.muted }} />
                    {(b.slot.start_time || '').substring(0, 5)} ~ {(b.slot.end_time || '').substring(0, 5)}
                  </p>
                  {b.slot.memo && <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.muted }}>{b.slot.memo}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function CartPage({ user, setCurrentPage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);  // id 저장

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error('장바구니 로드 에러:', error);
    setItems(data || []);
    setLoading(false);
  };

  const changeQty = async (item, delta) => {
    const next = (item.quantity || 1) + delta;
    if (next < 1) return;
    const stock = item.product?.stock;
    if (typeof stock === 'number' && stock > 0 && next > stock) {
      toast(`재고가 ${stock}개 남았어요`);
      return;
    }
    setUpdating(item.id);
    const { error } = await supabase.from('cart_items').update({ quantity: next }).eq('id', item.id);
    setUpdating(null);
    if (error) {
      toast('수량 변경 실패: ' + error.message);
      return;
    }
    await load();
  };

  const removeItem = async (item) => {
    if (!await confirmDialog(`${item.product?.name || '상품'}을 장바구니에서 빼시겠습니까?`)) return;
    setUpdating(item.id);
    const { error } = await supabase.from('cart_items').delete().eq('id', item.id);
    setUpdating(null);
    if (error) {
      toast('삭제 실패: ' + error.message);
      return;
    }
    await load();
  };

  // 합계 (재고 부족·품절 상품 제외)
  const validItems = items.filter(it => it.product && (it.product.stock === null || it.product.stock === undefined || it.product.stock > 0));
  const total = validItems.reduce((sum, it) => sum + (it.product?.price || 0) * (it.quantity || 1), 0);

  const goCheckout = () => {
    if (validItems.length === 0) {
      toast('결제할 상품이 없어요.');
      return;
    }
    // 재고 초과 검증
    for (const it of validItems) {
      if (typeof it.product?.stock === 'number' && it.quantity > it.product.stock) {
        toast(`${it.product.name}: 재고가 ${it.product.stock}개로 부족해요. 수량을 줄여주세요.`);
        return;
      }
    }
    setCurrentPage('cart-checkout');
  };

  const formatPrice = (n) => Number(n || 0).toLocaleString('ko-KR');

  return (
    <>
      <PageIntro ko="장바구니" en="Cart" desc="담아두신 재료를 한번에 결제하세요" />

      {loading ? (
        <div className="text-center py-10">
          <Loader2 size={20} className="animate-spin mx-auto" style={{ color: COLORS.primary }} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 px-5">
          <ShoppingBag size={32} style={{ color: COLORS.stone, margin: '0 auto', opacity: 0.4 }} />
          <p className="font-body text-sm mt-3" style={{ color: COLORS.stone }}>장바구니가 비어 있어요</p>
          <button onClick={() => setCurrentPage('market')}
            className="mt-4 font-heading text-xs px-5 py-2.5 rounded-full"
            style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 20px rgba(255,92,31,0.35)' }}>
            재료샵 둘러보기
          </button>
        </div>
      ) : (
        <div className="px-5 pb-32 space-y-3">
          {items.map(it => {
            const p = it.product;
            const outOfStock = !p || (typeof p.stock === 'number' && p.stock <= 0);
            const overStock = p && typeof p.stock === 'number' && p.stock > 0 && it.quantity > p.stock;
            return (
              <div key={it.id} className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${outOfStock || overStock ? COLORS.stone : COLORS.light}` }}>
                <div className="flex gap-3">
                  {/* 이미지 */}
                  <div className="w-20 h-20 rounded-xl shrink-0 overflow-hidden" style={{ background: COLORS.cream }}>
                    {p?.image_url ? (
                      <SkeletonImage src={p.image_url} alt={p?.name} className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: COLORS.primary }}>{p?.emoji || ''}</div>
                    )}
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm truncate" style={{ color: COLORS.ink }}>{p?.name || '(삭제된 상품)'}</p>
                    {p?.brand && <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: COLORS.stone }}>{p.brand}</p>}
                    <p className="font-display text-base mt-1 tracking-tight" style={{ color: COLORS.primary }}>
                      ₩{formatPrice((p?.price || 0) * it.quantity)}
                    </p>
                    {outOfStock && <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.stone }}>품절</p>}
                    {overStock && <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.primary }}>재고 {p.stock}개로 부족</p>}
                  </div>
                  {/* 삭제 */}
                  <button onClick={() => removeItem(it)} disabled={updating === it.id}
                    className="w-8 h-8 rounded-full flex items-center justify-center self-start"
                    style={{ background: COLORS.cardElev }}>
                    <Trash2 size={14} style={{ color: COLORS.stone }} />
                  </button>
                </div>
                {/* 수량 + 단가 */}
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
                  <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>단가 ₩{formatPrice(p?.price || 0)}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(it, -1)} disabled={updating === it.id || it.quantity <= 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
                      style={{ background: COLORS.cardElev, color: COLORS.ink }}>
                      −
                    </button>
                    <span className="font-heading text-sm w-8 text-center" style={{ color: COLORS.ink }}>{it.quantity}</span>
                    <button onClick={() => changeQty(it, 1)} disabled={updating === it.id || outOfStock}
                      className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
                      style={{ background: COLORS.cardElev, color: COLORS.ink }}>
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 합계 */}
          <div className="rounded-2xl p-4 mt-4" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-[12px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>TOTAL</span>
              <span className="font-display text-3xl tracking-tight" style={{ color: COLORS.ink }}>₩{formatPrice(total)}</span>
            </div>
            <p className="font-mono text-[10px] mt-1 text-right" style={{ color: COLORS.stone }}>{validItems.length}개 상품</p>
          </div>
        </div>
      )}

      {/* 결제 버튼 (하단 고정) */}
      {!loading && items.length > 0 && (
        <div className="fixed left-0 right-0 px-5 py-3" style={{
          background: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${COLORS.light}`,
          maxWidth: '480px', margin: '0 auto',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
        }}>
          <button onClick={goCheckout}
            disabled={validItems.length === 0}
            className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255,92,31,0.5)' }}>
            <ShoppingCart size={16} strokeWidth={2.5} />
            ₩{formatPrice(total)} 전체 결제하기
          </button>
        </div>
      )}
    </>
  );
}

export function CartCheckoutPage({ user, setCurrentPage }) {
  const [items, setItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [loading, setLoading] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedRefund, setAgreedRefund] = useState(false);

  const [shippingRecipientName, setShippingRecipientName] = useState(user?.ship_name || user?.name || '');
  const [shippingRecipientPhone, setShippingRecipientPhone] = useState(user?.ship_phone || user?.phone || '');
  const [shippingPostalCode, setShippingPostalCode] = useState(user?.ship_postal || '');
  const [shippingAddress, setShippingAddress] = useState(user?.ship_addr || '');
  const [shippingAddressDetail, setShippingAddressDetail] = useState(user?.ship_addr_detail || '');
  const [shippingMemo, setShippingMemo] = useState(user?.ship_memo || '');
  const [saveDefaultShip, setSaveDefaultShip] = useState(true);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const postcodeContainerRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoadingCart(true);
      const { data } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', user.id);
      setItems(data || []);
      setLoadingCart(false);
    })();
  }, []);

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
    } catch (err) {
      console.error('우편번호 검색 에러:', err);
      toast('우편번호 검색 중 오류가 발생했어요. 다시 시도해주세요.');
    }
  };

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

  const validItems = items.filter(it => it.product && (it.product.stock === null || it.product.stock === undefined || it.product.stock > 0));
  const total = validItems.reduce((sum, it) => sum + (it.product?.price || 0) * (it.quantity || 1), 0);
  const allAgreed = agreedTerms && agreedRefund;
  const repName = validItems[0]?.product?.name || '재료';
  const goodsName = validItems.length > 1 ? `${repName} 외 ${validItems.length - 1}건` : repName;

  const handlePayment = async () => {
    if (!allAgreed) { toast('필수 약관에 모두 동의해주세요.'); return; }
    if (validItems.length === 0) { toast('결제할 상품이 없어요.'); return; }
    if (!shippingRecipientName?.trim()) { toast('받는 사람 이름을 입력해주세요.'); return; }
    if (!shippingRecipientPhone?.trim()) { toast('받는 사람 연락처를 입력해주세요.'); return; }
    if (!shippingPostalCode || !shippingAddress) { toast('"주소 검색" 버튼을 눌러 주소를 입력해주세요.'); return; }
    if (!shippingAddressDetail?.trim()) { toast('상세 주소를 입력해주세요. (동/호수 등)'); return; }

    // 기본 배송지 저장 (선택)
    if (saveDefaultShip) {
      supabase.from('profiles').update({
        ship_name: shippingRecipientName.trim(),
        ship_phone: shippingRecipientPhone.trim(),
        ship_postal: shippingPostalCode,
        ship_addr: shippingAddress,
        ship_addr_detail: shippingAddressDetail.trim(),
        ship_memo: shippingMemo?.trim() || null,
      }).eq('id', user.id).then(() => {}, () => {});
    }

    setLoading(true);
    try {
      // 결제 직전 가격·재고 재확인
      const productIds = validItems.map(it => it.product.id);
      const { data: latestProducts, error: fetchErr } = await supabase
        .from('products')
        .select('id, price, stock, name')
        .in('id', productIds);
      if (fetchErr || !latestProducts) {
        toast('상품 정보를 확인할 수 없습니다. 다시 시도해주세요.');
        setLoading(false);
        return;
      }
      let verifiedTotal = 0;
      const verifiedLineItems = [];
      for (const it of validItems) {
        const latest = latestProducts.find(p => p.id === it.product.id);
        if (!latest) {
          toast(`${it.product.name}: 상품을 찾을 수 없어요`); setLoading(false); return;
        }
        if (Number(latest.price) !== Number(it.product.price)) {
          toast(`${it.product.name}: 가격이 변경됐어요 (현재 ${Number(latest.price).toLocaleString()}원). 장바구니를 새로고침해 주세요.`);
          setLoading(false); return;
        }
        if (typeof latest.stock === 'number' && latest.stock <= 0) {
          toast(`${latest.name}: 품절된 상품입니다.`); setLoading(false); return;
        }
        if (typeof latest.stock === 'number' && latest.stock < it.quantity) {
          toast(`${latest.name}: 재고가 ${latest.stock}개로 부족해요.`); setLoading(false); return;
        }
        verifiedTotal += Number(latest.price) * it.quantity;
        verifiedLineItems.push({
          product_id: it.product.id,
          product_name: latest.name,
          unit_price: Number(latest.price),
          quantity: it.quantity,
        });
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // 1) orders insert (product_id = null, 장바구니 주문 식별)
      const orderData = {
        order_id: orderId,
        user_id: user.id,
        course_id: null,
        product_id: null,   // ★ 장바구니 주문은 null
        course_title: goodsName,
        item_type: 'product',
        amount: verifiedTotal,
        status: 'pending',
        buyer_name: user.name,
        buyer_phone: user.phone,
        buyer_email: user.email,
        shipping_recipient_name: shippingRecipientName.trim(),
        shipping_recipient_phone: shippingRecipientPhone.trim(),
        shipping_postal_code: shippingPostalCode,
        shipping_address: shippingAddress,
        shipping_address_detail: shippingAddressDetail.trim(),
        shipping_memo: shippingMemo?.trim() || null,
        shipping_status: 'pending',
      };
      const { error: orderErr } = await supabase.from('orders').insert(orderData);
      if (orderErr) throw orderErr;

      // 2) order_items insert (각 라인)
      const linesWithOrderId = verifiedLineItems.map(l => ({ ...l, order_id: orderId }));
      const { error: linesErr } = await supabase.from('order_items').insert(linesWithOrderId);
      if (linesErr) {
        // 라인 insert 실패 시 orders도 삭제 (best-effort)
        await supabase.from('orders').delete().eq('order_id', orderId).catch(() => {});
        throw linesErr;
      }

      // 3) 나이스페이 SDK 로드 + 결제창 호출
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
      const returnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nicepay-return`;

      window.AUTHNICE.requestPay({
        clientId: import.meta.env.VITE_NICEPAY_CLIENT_KEY,
        method: 'card',
        orderId: orderId,
        amount: verifiedTotal,
        goodsName: goodsName,
        returnUrl: returnUrl,
        buyerName: user.name || '고객',
        buyerTel: validPhone,
        buyerEmail: user.email || '',
        fnError: (result) => {
          console.log('나이스페이 결제 취소/실패:', result);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('장바구니 결제 시작 에러:', err);
      toast('결제 시작 실패: ' + (err.message || err));
      setLoading(false);
    }
  };

  if (loadingCart) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin" style={{ color: COLORS.primary }} />
      </div>
    );
  }

  if (validItems.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="font-body text-sm" style={{ color: COLORS.stone }}>결제할 상품이 없어요.</p>
        <button onClick={() => setCurrentPage('cart')} className="mt-4 font-heading text-xs px-4 py-2 rounded-full" style={{ background: COLORS.primary, color: COLORS.white }}>
          장바구니로
        </button>
      </div>
    );
  }

  const formatPrice = (n) => Number(n || 0).toLocaleString('ko-KR');

  return (
    <div className="pb-6">
      <PageIntro ko="장바구니 결제" en="Checkout" desc="안전한 결제를 진행해주세요" />

      <div className="px-5 space-y-3">
        {/* 상품 목록 요약 */}
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase p-4 pb-2" style={{ color: COLORS.primary }}>━━ 주문 상품 ({validItems.length}건)</p>
          {validItems.map(it => (
            <div key={it.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden" style={{ background: COLORS.cream }}>
                {it.product.image_url ? (
                  <SkeletonImage src={it.product.image_url} alt={it.product.name} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl" style={{ color: COLORS.primary }}></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs truncate" style={{ color: COLORS.ink }}>{it.product.name}</p>
                <p className="font-mono text-[10px]" style={{ color: COLORS.stone }}>{it.quantity}개 × ₩{formatPrice(it.product.price)}</p>
              </div>
              <p className="font-heading text-sm shrink-0" style={{ color: COLORS.primary }}>₩{formatPrice(it.product.price * it.quantity)}</p>
            </div>
          ))}
        </div>

        {/* 배송 정보 */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 배송 정보</p>
          <input type="text" placeholder="받는 사람 이름" value={shippingRecipientName} onChange={(e) => setShippingRecipientName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          <input type="tel" placeholder="받는 사람 연락처 (010-0000-0000)" value={shippingRecipientPhone} onChange={(e) => setShippingRecipientPhone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          <div className="flex gap-2">
            <input type="text" placeholder="우편번호" value={shippingPostalCode} readOnly onClick={openPostcode}
              className="flex-1 px-3 py-2.5 rounded-lg font-body text-sm outline-none cursor-pointer"
              style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
            <button type="button" onClick={openPostcode}
              className="px-4 py-2.5 rounded-lg font-heading text-xs whitespace-nowrap"
              style={{ background: COLORS.primary, color: COLORS.white }}>
              주소 검색
            </button>
          </div>
          <input type="text" placeholder="기본 주소 (주소 검색 후 자동 입력)" value={shippingAddress} readOnly
            className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          <input type="text" placeholder="상세 주소 (동/호수 등)" value={shippingAddressDetail} onChange={(e) => setShippingAddressDetail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          <input type="text" placeholder="배송 메모 (선택, 예: 부재시 경비실)" value={shippingMemo} onChange={(e) => setShippingMemo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg font-body text-sm outline-none"
            style={{ background: COLORS.cardElev, color: COLORS.ink, border: `1px solid ${COLORS.light}` }} />
          <label className="flex items-center gap-2 font-body text-xs cursor-pointer pt-1" style={{ color: COLORS.ink }}>
            <input type="checkbox" checked={saveDefaultShip} onChange={(e) => setSaveDefaultShip(e.target.checked)}
              className="w-4 h-4 cursor-pointer" style={{ accentColor: COLORS.primary }} />
            <span>이 배송지를 기본 배송지로 저장</span>
          </label>
        </div>

        {/* 합계 */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.cardElev }}>
          <div className="flex justify-between items-baseline pt-1">
            <span className="font-mono text-[12px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>TOTAL</span>
            <span className="font-display text-3xl tracking-tight" style={{ color: COLORS.ink }}>₩{formatPrice(total)}</span>
          </div>
        </div>

        {/* 약관 동의 */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
            <span className="font-body text-xs flex-1" style={{ color: COLORS.ink }}>[필수] 구매조건을 확인했으며 결제에 동의합니다</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={agreedRefund} onChange={(e) => setAgreedRefund(e.target.checked)} />
            <span className="font-body text-xs flex-1" style={{ color: COLORS.ink }}>[필수] 환불정책에 동의합니다</span>
            <button onClick={() => setLegalModal('refund')} className="font-mono text-[10px] underline" style={{ color: COLORS.stone }}>보기</button>
          </label>
        </div>

        {/* 결제 버튼 */}
        <button onClick={handlePayment} disabled={loading}
          className="w-full rounded-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 24px rgba(255, 92, 31, 0.5)' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} strokeWidth={2.5} />}
          {loading ? '결제창 호출 중...' : `₩${formatPrice(total)} 결제하기`}
        </button>
      </div>

      {/* 약관 모달 */}
      {legalModal && createPortal(
        <div onClick={() => setLegalModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 480, height: '80vh', background: COLORS.card, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${COLORS.light}` }}>
              <h3 className="font-heading text-base" style={{ color: COLORS.ink }}>환불정책</h3>
              <button onClick={() => setLegalModal(null)}><X size={18} style={{ color: COLORS.stone }} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <pre style={{ fontFamily: 'inherit', color: COLORS.stone, fontSize: '12px', lineHeight: '1.75', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', margin: 0 }}>
                {LEGAL_REFUND}
              </pre>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 주소 검색 모달 */}
      {postcodeOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, padding: '12px 16px', paddingTop: 'max(12px, env(safe-area-inset-top))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e5e5', background: '#fff' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#000', margin: 0 }}>주소 검색</h3>
            <button onClick={() => setPostcodeOpen(false)}
              style={{ width: 36, height: 36, border: 'none', background: 'transparent', fontSize: 24, lineHeight: 1, color: '#000', cursor: 'pointer' }}>×</button>
          </div>
          <div ref={postcodeContainerRef} style={{ flex: 1, width: '100%', overflow: 'auto' }} />
        </div>,
        document.body
      )}
    </div>
  );
}

export function OnboardingScreen({ user, setCurrentPage, setSelectedLecture }) {
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
      desc: '인사를 남기면 모든 기능이 바로 열려요',
      done: user.onb_greeting,
      action: () => setCurrentPage('greetings'),
    },
    {
      id: 'review',
      icon: Heart,
      title: '첫 수업 후기 작성',
      desc: '첫 수업의 인상을 후기로 남겨주세요',
      optional: true,
      done: user.onb_review,
      action: () => setCurrentPage('reviews'),
    },
    // 🍊 오리엔테이션 영상 (선택)
    {
      id: 'video',
      icon: PlayCircle,
      title: '오리엔테이션 영상 시청',
      desc: 'HSSUP 아카데미를 소개해드릴게요',
      optional: true,
      done: user.onb_video,
      action: () => {
        if (orientation) {
          setSelectedLecture(orientation);
          setCurrentPage('lecture-detail', orientation.id);
        } else {
          toast('오리엔테이션 영상이 아직 준비되지 않았어요.\n원장님께 문의해주세요!');
        }
      },
    },
  ];

  const completed = missions.filter(m => m.done).length;
  const progress = (completed / missions.length) * 100;
  // 🍊 가입 인사만 작성하면 전체 잠금 해제 (나머지는 선택)
  const unlocked = !!user.onb_greeting;
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
          {unlocked ? '가입 인사 완료! 모든 기능이 열렸어요 ' : 'HSSUP에 오신 걸 환영해요 '}
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
                  <div className="flex items-center gap-1.5">
                    <p className="font-heading text-sm" style={{ color: COLORS.ink }}>{m.title}</p>
                    {m.optional && !m.done && (
                      <span className="font-mono text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: COLORS.cream, color: COLORS.stone }}>선택</span>
                    )}
                  </div>
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
        {!unlocked && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: COLORS.peach }}>
            <p className="font-body text-xs leading-relaxed" style={{ color: COLORS.deep }}>
              <b>가입 인사</b>만 작성하면 모든 기능을 바로 이용할 수 있어요!<br/>수강 후기·오리엔테이션 영상은 천천히 완료해주세요.
            </p>
          </div>
        )}

        {/* 잠금 해제 시 안내 */}
        {unlocked && (
          <button onClick={() => window.location.reload()}
            className="w-full mt-4 rounded-2xl py-4 font-display text-base font-bold transition-transform active:scale-95"
            style={{ 
              background: COLORS.primary, 
              color: COLORS.white,
              boxShadow: '0 0 24px rgba(255, 92, 31, 0.5)'
            }}>
            HSSUP 시작하기!
          </button>
        )}
      </div>
    </div>
  );
}

export function ImprovementsPage({ user }) {
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
    if (!content.trim()) return toast('내용을 입력해주세요');
    setSubmitting(true);
    const { error } = await supabase.from('improvements').insert({
      user_id: user.id,
      content: content.trim(),
      is_anonymous: isAnonymous,
      status: 'pending'
    });
    setSubmitting(false);
    if (error) {
      toast('등록 실패: ' + error.message);
    } else {
      clearContent();
      setIsAnonymous(false);
      setShowForm(false);
      loadItems();
      toast('소중한 의견 감사합니다! 원장님께 전달되었어요 ');
    }
  };

  return (
    <>
      <PageIntro ko="어플개선제안" en="Improvements" desc="앱을 사용하며 개선되었으면 하는 점을 자유롭게 남겨주세요 원장님께만 보입니다" />

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
                {isAnonymous ? '익명으로 제출 (이름 숨김)' : '익명으로 제출하지 않음'}
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
              자유롭게 의견을 남겨주세요 
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
                    {item.status === 'replied' ? '✓ 답변 완료' : '답변 대기'}
                  </span>
                  <span className="font-mono text-[9px] px-2 py-1 rounded"
                    style={{ background: COLORS.cardElev, color: COLORS.stone }}>
                    {item.is_anonymous ? '익명' : '실명'}
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

export function TipsPage({ user, setCurrentPage, setSelectedTip }) {
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
          <button key={t.id} onClick={() => { setSelectedTip(t); setCurrentPage('tip-detail', t.id); }}
            className="w-full text-left rounded-3xl overflow-hidden transition-transform active:scale-[0.98]"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            {getRowImages(t).length > 0 && (
              <div className="relative aspect-[16/9] overflow-hidden">
                <SkeletonImage src={getRowImages(t)[0]} alt={t.title} className="w-full h-full" />
                {getRowImages(t).length > 1 && (
                  <span className="absolute top-3 right-3 font-mono text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', color: COLORS.white }}>+{getRowImages(t).length - 1}</span>
                )}
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
              {getRowImages(t).length === 0 && (
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

export function TipDetailPage({ tip: propTip, user, routeId }) {
  const { item: tip, fetching } = useDetailItem(propTip, routeId, 'tips');
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const [catOverride, setCatOverride] = useState(null);
  useEffect(() => { setCatOverride(null); }, [tip?.id]);
  if (!tip) {
    return (
      <div className="px-5 py-10 text-center">
        {fetching
          ? <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary, margin: '0 auto' }} />
          : <p className="font-body text-sm" style={{ color: COLORS.stone }}>글을 찾을 수 없습니다.</p>}
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
      <div className="px-5 pt-5">
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded" style={{ background: COLORS.peach, color: COLORS.deep }}>
            {catOverride ?? tip.category}
          </span>
          <span className="font-mono text-[10px]" style={{ color: COLORS.stone }}>
            {new Date(tip.created_at).toLocaleDateString('ko-KR')}
          </span>
        </div>
        {isAdmin && (
          <div className="mb-3">
            <CategoryMover table="tips" itemId={tip.id} current={catOverride ?? tip.category} options={['수업노트', '시술꿀팁', '운영꿀팁', '기타']} onMoved={setCatOverride} />
          </div>
        )}
        <h1 className="font-display text-2xl tracking-tight leading-tight" style={{ color: COLORS.ink }}>{tip.title}</h1>
      </div>

      {getRowImages(tip).length > 0 && (
        <div className="px-5 mt-4">
          <ImageCarousel images={getRowImages(tip)} className="w-full" fit="contain" zoomable />
        </div>
      )}

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

export function PracticeBookingPage({ user, setCurrentPage }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [slots, setSlots] = useState([]);
  const [bookingCounts, setBookingCounts] = useState({});
  const [myBookings, setMyBookings] = useState([]);  // slot_id 배열
  const [myUpcoming, setMyUpcoming] = useState([]);  // 다가오는 예약 (slot 정보 포함)
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);  // slot_id 저장

  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

  const loadMonth = async () => {
    setLoading(true);
    const { year: y, month: m } = viewMonth;
    const first = fmtDate(y, m, 1);
    const last = fmtDate(y, m, new Date(y, m + 1, 0).getDate());

    const { data: s } = await supabase.from('practice_slots')
      .select('*')
      .gte('slot_date', first).lte('slot_date', last)
      .order('slot_date').order('start_time');
    setSlots(s || []);

    const slotIds = (s || []).map(x => x.id);
    if (slotIds.length) {
      const { data: bk } = await supabase.from('practice_bookings')
        .select('slot_id, user_id').eq('status', 'booked').in('slot_id', slotIds);
      const counts = {};
      const mine = [];
      (bk || []).forEach(b => {
        counts[b.slot_id] = (counts[b.slot_id] || 0) + 1;
        if (b.user_id === user.id) mine.push(b.slot_id);
      });
      setBookingCounts(counts);
      setMyBookings(mine);
    } else {
      setBookingCounts({});
      setMyBookings([]);
    }
    setLoading(false);
  };

  // 다가오는 내 예약 (오늘 이후, 최대 5건)
  const loadMyUpcoming = async () => {
    const today = new Date();
    const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
    const { data } = await supabase.from('practice_bookings')
      .select('slot_id, slot:slot_id(slot_date, start_time, end_time, memo, capacity)')
      .eq('user_id', user.id).eq('status', 'booked')
      .order('created_at', { ascending: false });
    const upcoming = (data || [])
      .filter(b => b.slot && b.slot.slot_date >= todayStr)
      .sort((a, b) => {
        if (a.slot.slot_date !== b.slot.slot_date) return a.slot.slot_date.localeCompare(b.slot.slot_date);
        return (a.slot.start_time || '').localeCompare(b.slot.start_time || '');
      });
    setMyUpcoming(upcoming);
  };

  useEffect(() => { loadMonth(); }, [viewMonth.year, viewMonth.month]);
  useEffect(() => { loadMyUpcoming(); }, []);

  const moveMonth = (delta) => {
    setSelectedDate(null);
    setViewMonth(prev => {
      let m = prev.month + delta, y = prev.year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  };

  const book = async (slot) => {
    setActionLoading(slot.id);
    const { data, error } = await supabase.rpc('book_practice_slot', { p_slot_id: slot.id });
    setActionLoading(null);
    if (error) { toast('예약 실패: ' + error.message); return; }
    if (!data?.success) { toast(data?.error || '예약 실패'); return; }

    // 📢 admin/staff에게 푸시 알림 (실패해도 예약은 정상)
    //    send-push의 targetRole:'admin'은 내부적으로 admin+staff 모두 포함
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const timeStr = `${(slot.start_time || '').slice(0, 5)}~${(slot.end_time || '').slice(0, 5)}`;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '새 연습 예약',
          body: `${user.name || '수강생'}님 · ${slot.slot_date} ${timeStr}`,
          url: '/?page=practice-admin',
          targetRole: 'admin',
          excludeUserId: user.id,
        }),
      });
    } catch (e) { console.error('연습 예약 알림 발송 실패:', e); }

    toast('예약 완료!');
    await Promise.all([loadMonth(), loadMyUpcoming()]);
  };

  const cancelBooking = async (slot) => {
    if (!await confirmDialog('예약을 취소할까요?')) return;
    setActionLoading(slot.id);
    const { data, error } = await supabase.from('practice_bookings')
      .update({ status: 'cancelled' })
      .eq('slot_id', slot.id).eq('user_id', user.id).eq('status', 'booked')
      .select();
    setActionLoading(null);
    if (error) { toast('취소 실패: ' + error.message); return; }
    if (!data || data.length === 0) {
      toast('취소가 적용되지 않았어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    await Promise.all([loadMonth(), loadMyUpcoming()]);
  };

  // 달력 데이터
  const { year: y, month: m } = viewMonth;
  const firstDayWeek = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const slotsByDate = {};
  slots.forEach(s => {
    if (!slotsByDate[s.slot_date]) slotsByDate[s.slot_date] = [];
    slotsByDate[s.slot_date].push(s);
  });
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  const daySlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  // 오늘 이전 날짜는 신청 불가 (관리자가 과거 슬롯을 만들 일은 없지만 안전망)
  const today = new Date();
  const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <>
      <PageIntro ko="연습 예약" en="Practice Booking" desc="원하는 날짜와 시간을 선택해 신청하세요" />

      <div className="px-5 space-y-3 pb-6">
        {/* 다가오는 내 예약 — 빈 상태도 표시 */}
        <div className="rounded-2xl p-4" style={{ background: COLORS.cardElev, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ 내 연습 예약</p>
          {myUpcoming.length === 0 ? (
            <p className="font-body text-xs text-center py-4 mt-2" style={{ color: COLORS.stone }}>예약한 연습이 없어요</p>
          ) : (
            <div className="space-y-2 mt-2">
              {myUpcoming.map(b => {
                const [yy, mm, dd] = (b.slot.slot_date || '').split('-').map(Number);
                const wd = ['일','월','화','수','목','금','토'][new Date(yy, (mm || 1) - 1, dd || 1).getDay()];
                const slotForCancel = { id: b.slot_id, ...b.slot };
                return (
                  <div key={b.slot_id} className="rounded-lg p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm inline-flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                          <Calendar size={12} style={{ color: COLORS.primary }} />
                          {b.slot.slot_date} ({wd})
                        </p>
                        <p className="font-body text-xs mt-1 inline-flex items-center gap-1.5" style={{ color: COLORS.stone }}>
                          <Clock size={11} style={{ color: COLORS.muted }} />
                          {(b.slot.start_time || '').substring(0, 5)} ~ {(b.slot.end_time || '').substring(0, 5)}
                        </p>
                        {b.slot.memo && <p className="font-mono text-[10px] mt-1" style={{ color: COLORS.muted }}>{b.slot.memo}</p>}
                      </div>
                      <button onClick={() => cancelBooking(slotForCancel)} disabled={actionLoading === b.slot_id}
                        className="font-heading text-[11px] px-3 py-2 rounded-full inline-flex items-center gap-1 shrink-0"
                        style={{ background: COLORS.cardElev, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                        {actionLoading === b.slot_id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        예약 취소
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 월 네비게이션 */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <button onClick={() => moveMonth(-1)} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90" style={{ background: COLORS.cardElev }}>
            <ChevronLeft size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ {y}</p>
            <p className="font-display text-lg mt-0.5 tracking-tight" style={{ color: COLORS.ink }}>{m + 1}월</p>
          </div>
          <button onClick={() => moveMonth(1)} className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90" style={{ background: COLORS.cardElev }}>
            <ChevronRight size={16} style={{ color: COLORS.ink }} strokeWidth={2.5} />
          </button>
        </div>

        {/* 달력 */}
        <div className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          {loading && <div className="text-center py-4"><Loader2 size={16} className="animate-spin mx-auto" style={{ color: COLORS.primary }} /></div>}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map((d, i) => (
              <div key={d} className="text-center font-mono text-[10px] font-bold py-1.5" style={{ color: i === 0 ? COLORS.primary : i === 6 ? COLORS.stone : COLORS.muted }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayWeek }).map((_, i) => <div key={`b-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const dateStr = fmtDate(y, m, d);
              const hasSlots = !!slotsByDate[dateStr];
              const isSelected = selectedDate === dateStr;
              const isPast = dateStr < todayStr;
              const hasMine = (slotsByDate[dateStr] || []).some(s => myBookings.includes(s.id));
              return (
                <button key={d} onClick={() => setSelectedDate(dateStr)}
                  disabled={!hasSlots && !isSelected}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
                  style={{
                    background: isSelected ? COLORS.primary : hasSlots ? COLORS.cardElev : 'transparent',
                    border: isSelected ? `1px solid ${COLORS.primary}` : `1px solid ${COLORS.light}`,
                    opacity: isPast && !isSelected ? 0.4 : 1,
                  }}>
                  <span className="font-body text-sm" style={{ color: isSelected ? COLORS.white : COLORS.ink, fontWeight: hasSlots ? 700 : 400 }}>{d}</span>
                  {hasSlots && (
                    <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: isSelected ? COLORS.white : hasMine ? '#22C55E' : COLORS.primary }}></span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${COLORS.light}` }}>
            <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.stone }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.primary }}></span>예약가능
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px]" style={{ color: COLORS.stone }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }}></span>내 예약
            </span>
          </div>
        </div>

        {/* 선택 날짜 슬롯 목록 */}
        {selectedDate && (
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ {selectedDate}</p>
            {daySlots.length === 0 ? (
              <p className="font-body text-xs text-center py-6 mt-2" style={{ color: COLORS.stone }}>이 날짜에는 열린 슬롯이 없어요</p>
            ) : (
              <div className="space-y-2 mt-3">
                {daySlots.map(s => {
                  const count = bookingCounts[s.id] || 0;
                  const full = count >= s.capacity;
                  const mine = myBookings.includes(s.id);
                  const isPast = selectedDate < todayStr;
                  return (
                    <div key={s.id} className="rounded-lg p-3" style={{ background: COLORS.cardElev, border: `1px solid ${mine ? COLORS.primary : COLORS.light}` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-sm inline-flex items-center gap-1.5" style={{ color: COLORS.ink }}>
                            <Clock size={12} style={{ color: COLORS.primary }} />
                            {(s.start_time || '').substring(0, 5)} ~ {(s.end_time || '').substring(0, 5)}
                          </p>
                          <p className="font-mono text-[10px] mt-1" style={{ color: full && !mine ? COLORS.primary : COLORS.stone }}>
                            <Users size={10} className="inline mr-1" />{count}/{s.capacity}{full && !mine ? ' · 마감' : ''}
                          </p>
                          {s.memo && <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>{s.memo}</p>}
                        </div>
                        {mine ? (
                          <button onClick={() => cancelBooking(s)} disabled={actionLoading === s.id || isPast}
                            className="font-heading text-[11px] px-3 py-2 rounded-full inline-flex items-center gap-1 shrink-0"
                            style={{ background: COLORS.card, color: COLORS.stone, border: `1px solid ${COLORS.light}` }}>
                            {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                            예약 취소
                          </button>
                        ) : full ? (
                          <span className="font-heading text-[11px] px-3 py-2 rounded-full shrink-0"
                            style={{ background: COLORS.card, color: COLORS.muted, border: `1px solid ${COLORS.light}` }}>
                            마감
                          </span>
                        ) : (
                          <button onClick={() => book(s)} disabled={actionLoading === s.id || isPast}
                            className="font-heading text-[11px] px-3 py-2 rounded-full inline-flex items-center gap-1 shrink-0 disabled:opacity-50"
                            style={{ background: COLORS.primary, color: COLORS.white, boxShadow: '0 0 12px rgba(255,92,31,0.35)' }}>
                            {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
                            신청하기
                          </button>
                        )}
                      </div>
                      {mine && <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.primary }}>✓ 내가 예약한 슬롯</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
