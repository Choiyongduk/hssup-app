// 커스텀 훅 모음
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// =============================================================
// 🔗 useDetailItem - 상세 페이지 딥링크용
//   앱 내 이동 시엔 propItem(state)을 그대로, URL 직접 진입/새로고침 시엔
//   routeId로 DB에서 단건 조회. { item, fetching } 반환.
// =============================================================
export function useDetailItem(propItem, routeId, table) {
  const [loaded, setLoaded] = useState(null);
  const [fetching, setFetching] = useState(!!routeId && !propItem);
  useEffect(() => {
    let alive = true;
    if (!propItem && routeId) {
      setFetching(true);
      supabase.from(table).select('*').eq('id', routeId).maybeSingle()
        .then(({ data }) => { if (alive) { setLoaded(data); setFetching(false); } });
    }
    return () => { alive = false; };
  }, [propItem, routeId, table]);
  return { item: propItem || loaded, fetching };
}

// =============================================================
// 📝 useDraft - 작성 중 글 자동 저장 (localStorage)
// =============================================================
export function useDraft(key, initialValue, excludeKeys = []) {
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
export function useNewPages() {
  const [newPages, setNewPages] = useState([]);
  useEffect(() => {
    const check = async () => {
      try {
        const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const [n, t, ti, l, lf, cf, cg, cr, q] = await Promise.all([
          supabase.from('notices').select('id', { count: 'exact', head: true }).gte('created_at', since),
          supabase.from('trends').select('id', { count: 'exact', head: true }).eq('is_active', true).gte('created_at', since),
          supabase.from('tips').select('id', { count: 'exact', head: true }).eq('is_active', true).gte('created_at', since),
          supabase.from('lectures').select('id', { count: 'exact', head: true }).eq('is_published', true).gte('created_at', since),
          supabase.from('library_files').select('id', { count: 'exact', head: true }).gte('created_at', since),
          // 👥 회원이 쓰는 커뮤니티 글(자유/인사/후기) + Q&A 도 새 글로 표시
          supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('category', '자유').gte('created_at', since),
          supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('category', '인사').gte('created_at', since),
          supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('category', '후기').gte('created_at', since),
          supabase.from('questions').select('id', { count: 'exact', head: true }).gte('created_at', since),
        ]);
        const s = [];
        if ((n.count || 0) > 0) s.push('notice');
        if ((t.count || 0) > 0) s.push('trends');
        if ((ti.count || 0) > 0) s.push('tips');
        if ((l.count || 0) > 0) s.push('online');
        if ((lf.count || 0) > 0) s.push('library');
        if ((cf.count || 0) > 0) s.push('freeboard');
        if ((cg.count || 0) > 0) s.push('greetings');
        if ((cr.count || 0) > 0) s.push('reviews');
        if ((q.count || 0) > 0) s.push('qna');
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
export function useLatestLecture() {
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
export function useRecentUpdates() {
  const [updates, setUpdates] = useState([]);
  useEffect(() => {
    const load = async () => {
      try {
        const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const [notices, trends, tips, lectures, library, posts, questions] = await Promise.all([
          supabase.from('notices').select('id, title, created_at').gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('trends').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('tips').select('id, title, created_at').eq('is_active', true).gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('lectures').select('id, title, created_at').eq('is_published', true).gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('library_files').select('id, name, created_at').gte('created_at', since).order('created_at', { ascending: false }),
          // 👥 회원이 쓰는 커뮤니티 글 + Q&A
          supabase.from('community_posts').select('id, content, category, created_at').gte('created_at', since).order('created_at', { ascending: false }),
          supabase.from('questions').select('id, title, created_at').gte('created_at', since).order('created_at', { ascending: false }),
        ]);
        // 커뮤니티 카테고리 → 이동 페이지 / 표시 라벨
        const catPage = { '자유': 'freeboard', '인사': 'greetings', '후기': 'reviews' };
        const catType = { '자유': '자유', '인사': '가입인사', '후기': '수강후기' };
        const all = [
          ...(notices.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '공지', page: 'notice' })),
          ...(trends.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '트렌드', page: 'trends' })),
          ...(tips.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '꿀팁', page: 'tips' })),
          ...(lectures.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: '강의', page: 'online' })),
          ...(library.data || []).map(x => ({ id: x.id, title: x.name, created_at: x.created_at, type: '자료', page: 'library' })),
          ...(posts.data || []).map(x => ({ id: x.id, title: (x.content || '').trim().slice(0, 40) || '(사진)', created_at: x.created_at, type: catType[x.category] || '게시글', page: catPage[x.category] || 'freeboard' })),
          ...(questions.data || []).map(x => ({ id: x.id, title: x.title, created_at: x.created_at, type: 'Q&A', page: 'qna' })),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setUpdates(all);
      } catch (e) { console.error('홈 업데이트 조회 실패:', e); }
    };
    load();
  }, []);
  return updates;
}
