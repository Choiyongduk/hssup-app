// 공용 프레젠테이션/공유 컴포넌트
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { COLORS, getInitial, AVATAR_COLORS } from '../lib/colors';
import { subscribeToast, toast } from '../lib/toast';
import { subscribeConfirm, confirmDialog } from '../lib/dialog';
import { useLevel, TIERS, TIER_ORDER, SCORE_TABLE, POINTS, MASTER_SCORE } from '../lib/level';
import { Heart, Plus, Send, Trash2, Image as ImageIcon, Loader2, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// =============================================================
// 📂 CategoryMover - 관리자/스태프용 카테고리 이동 버튼 (공용)
//   table: 대상 테이블, itemId: 행 id, current: 현재 카테고리,
//   options: 선택 가능한 카테고리 배열, onMoved: 이동 후 콜백(newCat)
// =============================================================
export function CategoryMover({ table, itemId, current, options, onMoved }) {
  const [loading, setLoading] = useState(false);
  const move = async (cat) => {
    if (cat === current || loading) return;
    if (!await confirmDialog(`이 게시글을 "${cat}" 카테고리로 이동할까요?`)) return;
    setLoading(true);
    const { error } = await supabase.from(table).update({ category: cat }).eq('id', itemId);
    setLoading(false);
    if (error) { toast('이동 실패: ' + error.message); return; }
    toast(`"${cat}" 카테고리로 이동했어요`);
    onMoved?.(cat);
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-mono text-[10px] font-bold tracking-widest uppercase mr-1" style={{ color: COLORS.stone }}>이동</span>
      {options.map(o => {
        const active = o === current;
        return (
          <button key={o} onClick={() => move(o)} disabled={loading || active}
            className="font-heading text-[10px] px-3 py-1.5 rounded-full"
            style={{
              background: active ? COLORS.primary : COLORS.cardElev,
              color: active ? COLORS.white : COLORS.ink,
              border: `1px solid ${active ? COLORS.primary : COLORS.light}`,
            }}>
            {o}{active ? ' ✓' : ''}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================
// ❓ ConfirmHost - 전역 확인 모달 (App 최상단에 한 번 마운트)
// =============================================================
export function ConfirmHost() {
  const [req, setReq] = useState(null);
  useEffect(() => subscribeConfirm((r) => setReq(r)), []);
  if (!req) return null;
  const close = (val) => { req.resolve(val); setReq(null); };
  return createPortal(
    <div onClick={() => close(false)} style={{
      position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.62)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="animate-fade-in" style={{
        width: '100%', maxWidth: 340, background: COLORS.cardElev, border: `1px solid ${COLORS.border}`,
        borderRadius: 20, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <p style={{ color: COLORS.ink, fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-line', fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.01em' }}>{req.message}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={() => close(false)} style={{
            flex: 1, padding: 12, borderRadius: 999, border: `1px solid ${COLORS.light}`,
            background: COLORS.card, color: COLORS.stone, fontFamily: 'Pretendard', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>{req.cancelText}</button>
          <button onClick={() => close(true)} style={{
            flex: 1, padding: 12, borderRadius: 999, border: 'none',
            background: COLORS.primary, color: COLORS.white, fontFamily: 'Pretendard', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 0 20px rgba(255,92,31,0.4)',
          }}>{req.confirmText}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// =============================================================
// 🔔 ToastHost - 전역 토스트 표시 (App 최상단에 한 번 마운트)
// =============================================================
export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => subscribeToast((t) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3200);
  }), []);

  if (toasts.length === 0) return null;
  return createPortal(
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)',
      zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      pointerEvents: 'none', padding: '0 16px',
    }}>
      {toasts.map((t) => {
        const isErr = t.type === 'error' || /실패|오류|에러|없어요|없습니다/.test(t.message);
        return (
          <div key={t.id} className="animate-slide-up" style={{
            maxWidth: 448, width: '100%', background: COLORS.cardElev, color: COLORS.ink,
            border: `1px solid ${isErr ? COLORS.primary : COLORS.border}`,
            borderRadius: 14, padding: '12px 16px',
            boxShadow: '0 10px 34px rgba(0,0,0,0.55)',
            fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-line',
            fontFamily: 'Pretendard, sans-serif', letterSpacing: '-0.01em',
          }}>
            {t.message}
          </div>
        );
      })}
    </div>,
    document.body
  );
}

export function MultiImageField({ value, onChange, max = 10, label = '이미지', help }) {
  const image_urls = value?.image_urls || [];
  const imageFiles = value?.imageFiles || [];
  const imagePreviews = value?.imagePreviews || [];
  const total = image_urls.length + imagePreviews.length;

  const handleSelect = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // 같은 파일 다시 선택 가능하도록 초기화
    if (!files.length) return;
    const room = Math.max(0, max - total);
    if (room <= 0) { toast(`이미지는 최대 ${max}장까지 올릴 수 있어요.`); return; }
    const picked = files.slice(0, room);
    if (files.length > room) toast(`최대 ${max}장까지만 추가됩니다.`);
    onChange({
      ...value,
      imageFiles: [...imageFiles, ...picked],
      imagePreviews: [...imagePreviews, ...picked.map(f => URL.createObjectURL(f))],
    });
  };

  const removeExisting = (i) => {
    onChange({ ...value, image_urls: image_urls.filter((_, idx) => idx !== i) });
  };

  const removeNew = (i) => {
    if (imagePreviews[i]) URL.revokeObjectURL(imagePreviews[i]);
    onChange({
      ...value,
      imageFiles: imageFiles.filter((_, idx) => idx !== i),
      imagePreviews: imagePreviews.filter((_, idx) => idx !== i),
    });
  };

  const Tile = ({ src, onRemove, badge }) => (
    <div className="relative aspect-square rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.light}` }}>
      <img src={src} alt="" className="w-full h-full object-cover" />
      {badge && (
        <span className="absolute bottom-1 left-1 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', color: COLORS.white }}>{badge}</span>
      )}
      <button type="button" onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.65)' }}>
        <X size={12} style={{ color: COLORS.white }} />
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>
          {label} <span style={{ color: COLORS.muted }}>({total}/{max})</span>
        </label>
        {help && <span className="font-body text-[10px]" style={{ color: COLORS.muted }}>{help}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {image_urls.map((url, i) => (
          <Tile key={`u-${i}`} src={url} onRemove={() => removeExisting(i)} badge={i === 0 ? '대표' : null} />
        ))}
        {imagePreviews.map((src, i) => (
          <Tile key={`n-${i}`} src={src} onRemove={() => removeNew(i)} badge={(image_urls.length + i) === 0 ? '대표' : null} />
        ))}
        {total < max && (
          <label className="aspect-square rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors"
            style={{ background: COLORS.cream, border: `2px dashed ${COLORS.light}` }}>
            <Plus size={20} style={{ color: COLORS.stone }} />
            <span className="font-mono text-[9px] mt-1" style={{ color: COLORS.stone }}>추가</span>
            <input type="file" accept="image/*" multiple onChange={handleSelect} className="hidden" />
          </label>
        )}
      </div>
      {total > 0 && (
        <p className="font-body text-[10px] mt-1.5" style={{ color: COLORS.muted }}>첫 번째 사진이 대표 이미지로 표시돼요.</p>
      )}
    </div>
  );
}

// fit: 'cover'(목록 카드 — 균일 비율로 채움/크롭) | 'contain'(상세 — 전체가 보이게, 잘림 없음)
// zoomable: true면 탭/클릭 시 전체화면 라이트박스로 확대(여러 장은 스와이프)
export function ImageCarousel({ images, className = '', rounded = 'rounded-2xl', bordered = true, fit = 'cover', zoomable = false }) {
  const list = (images || []).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [box, setBox] = useState(-1); // 라이트박스 시작 인덱스(-1=닫힘)
  const ref = useRef(null);
  const borderStyle = bordered ? { border: `1px solid ${COLORS.light}` } : {};
  if (list.length === 0) return null;

  const zoomCls = zoomable ? 'cursor-zoom-in' : '';
  const openBox = (i) => { if (zoomable) setBox(i); };
  const lb = box >= 0 ? <Lightbox images={list} index={box} onClose={() => setBox(-1)} /> : null;
  // contain은 이미지 본래 높이를 따르므로 슬라이드에 고정 높이를 주지 않는다(잘림 방지).
  const hCls = fit === 'contain' ? '' : 'h-full';

  if (list.length === 1) {
    return (
      <>
        <div className={`${rounded} overflow-hidden ${className} ${zoomCls}`} style={borderStyle} onClick={() => openBox(0)}>
          <SkeletonImage src={list[0]} alt="" fit={fit} className={`w-full ${hCls}`} />
        </div>
        {lb}
      </>
    );
  }
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <>
      <div className={`relative ${rounded} overflow-hidden ${className} ${zoomCls}`} style={borderStyle}>
        <div ref={ref} onScroll={onScroll}
          className={`flex overflow-x-auto scrollbar-hide snap-x snap-mandatory w-full ${hCls}`}>
          {list.map((src, i) => (
            <div key={i} className={`shrink-0 w-full ${hCls} snap-center`} onClick={() => openBox(i)}>
              <SkeletonImage src={src} alt="" fit={fit} className={`w-full ${hCls}`} />
            </div>
          ))}
        </div>
        {/* 점 인디케이터 */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {list.map((_, i) => (
            <span key={i} className="rounded-full transition-all" style={{
              width: i === idx ? 16 : 6, height: 6,
              background: i === idx ? COLORS.white : 'rgba(255,255,255,0.5)',
            }} />
          ))}
        </div>
        {/* 장수 배지 */}
        <span className="absolute top-2 right-2 font-mono text-[9px] font-bold px-2 py-1 rounded-full pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.55)', color: COLORS.white }}>
          {idx + 1} / {list.length}
        </span>
      </div>
      {lb}
    </>
  );
}

// 전체화면 이미지 뷰어 + 두 손가락 핀치줌(앱 전역 user-scalable=no라 직접 구현).
// 갇힘 방지: 상단 바(닫기)는 이미지와 분리된 flex 형제라 확대 상태에서도 항상 누를 수 있음.
//  - 두 손가락 핀치: 확대/축소(1~4배), 확대 후 한 손가락 드래그로 이동
//  - 더블탭: 확대(2.5배) ↔ 원래대로 토글
//  - 배경(이미지 바깥) 탭/X/Esc: 닫기 · 여러 장은 좌우 화살표/스와이프(원본 크기일 때)
export function Lightbox({ images, index = 0, onClose }) {
  const list = (images || []).filter(Boolean);
  const [idx, setIdx] = useState(index);
  const [t, setT] = useState({ scale: 1, x: 0, y: 0 });
  const [gesturing, setGesturing] = useState(false);
  const imgRef = useRef(null);
  const g = useRef({});

  useEffect(() => { setT({ scale: 1, x: 0, y: 0 }); }, [idx]); // 사진 바뀌면 확대 초기화

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, list.length - 1));
      else if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, list.length]);

  if (list.length === 0) return null;
  const go = (d) => setIdx(i => Math.max(0, Math.min(list.length - 1, i + d)));
  const btn = { background: 'rgba(255,255,255,0.18)', color: '#fff' };

  const distOf = (touches) => Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
  // 화면 밖으로 사라지지 않게 이동 범위 제한 (base = 원본 크기일 때 실제 표시 크기)
  const clampPan = (scale, x, y) => {
    const b = g.current.base;
    if (!b) return { x, y };
    const maxX = Math.max(0, (b.w * scale - window.innerWidth) / 2);
    const maxY = Math.max(0, (b.h * scale - window.innerHeight) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };

  const onTouchStart = (e) => {
    setGesturing(true);
    if (t.scale === 1 && imgRef.current) {
      const r = imgRef.current.getBoundingClientRect();
      g.current.base = { w: r.width, h: r.height }; // 원본(맞춤) 크기 기억
    }
    if (e.touches.length === 2) {
      g.current.mode = 'pinch';
      g.current.startDist = distOf(e.touches);
      g.current.startScale = t.scale;
    } else if (e.touches.length === 1) {
      g.current.mode = t.scale > 1 ? 'pan' : 'swipe';
      g.current.startX = e.touches[0].clientX;
      g.current.startY = e.touches[0].clientY;
      g.current.origX = t.x;
      g.current.origY = t.y;
    }
  };
  const onTouchMove = (e) => {
    if (g.current.mode === 'pinch' && e.touches.length === 2) {
      let scale = g.current.startScale * (distOf(e.touches) / g.current.startDist);
      scale = Math.max(1, Math.min(4, scale));
      setT(s => ({ scale, ...clampPan(scale, s.x, s.y) }));
    } else if (g.current.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - g.current.startX;
      const dy = e.touches[0].clientY - g.current.startY;
      setT(s => ({ scale: s.scale, ...clampPan(s.scale, g.current.origX + dx, g.current.origY + dy) }));
    }
  };
  const onTouchEnd = (e) => {
    setGesturing(false);
    const cx = e.changedTouches[0]?.clientX ?? 0;
    const cy = e.changedTouches[0]?.clientY ?? 0;
    const moved = Math.abs(cx - g.current.startX) + Math.abs(cy - g.current.startY);
    if (g.current.mode === 'swipe' && list.length > 1 && moved > 50) {
      go(cx < g.current.startX ? 1 : -1);
    } else if (g.current.mode !== 'pinch' && moved < 10 && e.touches.length === 0) {
      // 더블탭 = 확대 토글
      const now = Date.now();
      if (now - (g.current.lastTap || 0) < 300) {
        setT(s => s.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 });
        g.current.lastTap = 0;
      } else {
        g.current.lastTap = now;
      }
    }
    if (e.touches.length === 0 && t.scale <= 1.02) setT({ scale: 1, x: 0, y: 0 }); // 거의 원본이면 스냅
    if (e.touches.length === 0) g.current.mode = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: 'rgba(0,0,0,0.96)' }} onClick={onClose}>
      {/* 상단 바 — 이미지와 분리되어 항상 탭 가능 */}
      <div className="shrink-0 flex items-center justify-between px-3 z-20"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)', paddingBottom: 10 }}
        onClick={(e) => e.stopPropagation()}>
        <span className="font-body text-[11px] px-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
          두 손가락으로 확대
        </span>
        <span className="font-mono text-xs font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {list.length > 1 ? `${idx + 1} / ${list.length}` : ''}
        </span>
        <button onClick={onClose} aria-label="닫기"
          className="w-11 h-11 rounded-full flex items-center justify-center" style={btn}>
          <X size={24} />
        </button>
      </div>

      {/* 이미지 영역: 핀치/팬 제스처 처리. 이미지 바깥(배경) 탭은 닫기 */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 pb-4"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ touchAction: 'none' }}>
        <img ref={imgRef} src={list[idx]} alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
          style={{
            transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`,
            transformOrigin: 'center center',
            transition: gesturing ? 'none' : 'transform 0.2s ease-out',
          }} />
      </div>

      {/* 좌우 이동 (여러 장, 원본 크기일 때) */}
      {list.length > 1 && t.scale === 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ ...btn, opacity: idx === 0 ? 0.3 : 1 }}>
            <ChevronLeft size={24} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ ...btn, opacity: idx === list.length - 1 ? 0.3 : 1 }}>
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

export function LegalPage({ ko, en, desc, content }) {
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

export function SkeletonImage({ src, alt, className = '', style = {}, onError, fit = 'cover', ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setError(false);
    // 🍊 캐시된 이미지는 onLoad가 안 뜰 수 있어(뒤로가기 재진입 시 사진 안 뜨는 문제),
    //    이미 로드 완료된 상태면 즉시 표시한다.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ ...style, background: COLORS.cardElev }}>
        <ImageIcon size={32} style={{ color: COLORS.stone, opacity: 0.4 }} />
      </div>
    );
  }

  // contain: 전체가 보이게(잘림 없음), 본문에 어울리는 미리보기 높이로 제한(원본은 탭하면 라이트박스). cover: 채우고 넘치면 크롭.
  const imgCls = fit === 'contain' ? 'w-full max-h-[360px] object-contain' : 'w-full h-full object-cover';
  return (
    <div className={`relative overflow-hidden ${className}`}
      style={{ ...style, background: COLORS.cardElev, ...(fit === 'contain' && !loaded ? { minHeight: 160 } : {}) }}>
      {!loaded && <div className="absolute inset-0 skeleton-shimmer"></div>}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={imgCls}
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

export function Avatar({ user, size = 'md', onClick }) {
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
  const photo = user?.avatar_url;

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-center rounded-full shrink-0 overflow-hidden"
      style={{
        width: s.w,
        height: s.h,
        background: gradient,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {photo ? (
        <img src={photo} alt={user?.name || ''} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
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
      )}
    </div>
  );
}

// 등급 카드 — MEMBER / CREW / MASTER. 현재 등급 + 승급 진행 + 점수내역 + 전체 등급 안내.
export function LevelCard({ userId, setCurrentPage }) {
  const lv = useLevel(userId);

  if (lv.loading) {
    return (
      <div className="rounded-2xl p-5 flex items-center justify-center" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}`, minHeight: '160px' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: COLORS.primary }} />
      </div>
    );
  }

  const def = TIERS[lv.tier];
  const isMember = lv.tier === 'member';
  const isCrew = lv.tier === 'crew';
  const isMaster = lv.tier === 'master';
  const scorePct = Math.min(100, Math.round((lv.score / MASTER_SCORE) * 100));

  const Cond = ({ done, label }) => (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
        style={{ background: done ? COLORS.primary : 'transparent', border: done ? 'none' : `1.5px solid ${COLORS.light}` }}>
        {done && <Check size={11} style={{ color: '#fff' }} strokeWidth={3} />}
      </span>
      <span className="font-body text-xs" style={{ color: done ? COLORS.ink : COLORS.stone, textDecoration: done ? 'none' : 'none' }}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* 현재 등급 */}
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: COLORS.cardElev }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${def.color}55, transparent 70%)` }}></div>
        <div className="relative">
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.primary }}>━━ My Grade</p>
          <div className="mt-3">
            <p className="font-display text-3xl tracking-tight" style={{ color: def.color }}>{def.label}</p>
            <p className="font-body text-xs mt-1" style={{ color: COLORS.stone }}>{def.tagline}</p>
          </div>

          {/* 승급 진행 */}
          {isMember && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <p className="font-body text-xs font-bold" style={{ color: COLORS.ink }}>
                다음 등급 <span style={{ color: TIERS.crew.color }}>CREW</span> 승급 조건
              </p>
              <Cond done={lv.reviewsAll >= 1} label="수강 후기 작성 1회" />
              <Cond done={lv.casesAll >= 1} label="시술·연습 사진(1:1 피드백) 업로드 1회" />
            </div>
          )}
          {isCrew && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.light}` }}>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.cream }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${scorePct}%`, background: COLORS.primary, boxShadow: '0 0 12px rgba(255,92,31,0.4)' }}></div>
              </div>
              <p className="font-mono text-[10px] mt-2" style={{ color: COLORS.stone }}>
                다음 등급 <span style={{ color: TIERS.master.color, fontWeight: 'bold' }}>MASTER</span>까지 최근 30일 점수 <span style={{ color: COLORS.ink, fontWeight: 'bold' }}>{lv.score}</span> / {MASTER_SCORE}점
              </p>
            </div>
          )}
          {isMaster && (
            <p className="font-serif-italic text-sm mt-3" style={{ color: def.color }}>최고 등급입니다 · 최근 30일 {lv.score}점</p>
          )}
        </div>
      </div>

      {/* 최근 30일 점수 내역 (CREW/MASTER) */}
      {!isMember && (
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
          <p className="font-mono text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.stone }}>최근 30일 활동</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['출석', lv.attendance30, POINTS.attendance],
              ['좋아요', lv.likes30, POINTS.like],
              ['댓글', lv.comments30, POINTS.comment],
              ['게시글', lv.posts30, POINTS.post],
              ['연습사진', lv.cases30, POINTS.case],
              ['베스트', lv.best30, POINTS.best],
            ].map(([label, n, pt]) => (
              <div key={label} className="text-center rounded-lg py-2" style={{ background: COLORS.cardElev }}>
                <p className="font-display text-base" style={{ color: COLORS.ink }}>{n * pt}</p>
                <p className="font-mono text-[9px] mt-0.5" style={{ color: COLORS.stone }}>{label} {n}×{pt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 등급 안내 */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.light}` }}>
        <p className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: COLORS.stone }}>등급 안내</p>
        {TIER_ORDER.map(key => {
          const t = TIERS[key];
          const cur = key === lv.tier;
          return (
            <div key={key} className="rounded-xl p-3" style={{ background: cur ? `${t.color}14` : 'transparent', border: `1px solid ${cur ? t.color : COLORS.light}` }}>
              <div className="flex items-center gap-2">
                <span className="font-display text-base tracking-tight" style={{ color: t.color }}>{t.label}</span>
                {cur && <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: t.color, color: '#fff' }}>현재</span>}
                <span className="font-body text-[11px] ml-auto" style={{ color: COLORS.stone }}>{t.tagline}</span>
              </div>
              {t.conditions && (
                <p className="font-body text-[11px] mt-2" style={{ color: COLORS.stone }}>
                  <span style={{ color: COLORS.ink, fontWeight: 'bold' }}>승급조건</span> · {t.conditions.join(' / ')}
                </p>
              )}
              <p className="font-body text-[11px] mt-1" style={{ color: COLORS.ink }}>
                <span style={{ color: COLORS.primary, fontWeight: 'bold' }}>혜택</span> · {t.benefits.join(' · ')}
              </p>
            </div>
          );
        })}
        <p className="font-body text-[10px]" style={{ color: COLORS.stone }}>
          ※ MASTER는 최근 30일 활동 점수로 유지됩니다 · 점수: {SCORE_TABLE.map(([l, p]) => `${l} ${p}점`).join(', ')}
        </p>
      </div>
    </div>
  );
}

export function PageIntro({ ko, en, desc }) {
  return (
    <div className="px-5 pt-5 pb-6">
      <p className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: COLORS.primary }}>━━ {en}</p>
      <h1 className="font-display text-4xl mt-3 tracking-tighter" style={{ color: COLORS.ink }}>{ko}<span className="glow-text" style={{ color: COLORS.primary }}>.</span></h1>
    </div>
  );
}

export function LikeButton({ targetType, targetId, userId, size = 14 }) {
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
      toast('로그인 정보가 없습니다');
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
        toast('좋아요 취소 실패: ' + error.message);
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
        toast('좋아요 실패: ' + error.message);
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

export function CommentSection({ targetType, targetId, user }) {
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

    // 작성자 프로필 가져오기 (이름·아바타만 공개 뷰에서)
    const userIds = [...new Set(cData.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('public_profiles')
      .select('id, name, avatar_color, avatar_url, role')
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
      toast('댓글 작성 실패: ' + error.message);
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
