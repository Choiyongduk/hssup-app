// 등급(MEMBER / CREW / MASTER) 체계 — 정의 · 점수 · 판정 · 데이터 로딩 · 훅
//  - MEMBER : 가입 승인 완료 회원(기본)
//  - CREW   : 수강후기 1회 + 1:1 피드백(케이스) 1회 (한 번 달성하면 유지)
//  - MASTER : CREW 조건 + 최근 30일 활동 점수 100점 이상 (점수 떨어지면 CREW로 강등)
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export const TIER_RANK = { member: 0, crew: 1, master: 2 };
export const MASTER_SCORE = 100;

// 최근 30일 활동 점수 가중치
export const POINTS = {
  attendance: 2,  // 출석 1회(그날 접속)
  like: 1,        // 좋아요 1회
  comment: 2,     // 댓글 1개
  post: 10,       // 게시글 1개
  case: 20,       // 연습 사진(1:1 피드백) 업로드
  best: 50,       // 베스트 케이스 선정
};

// 등급별 메타(설명/혜택/승급조건) — 카드 UI가 그대로 렌더
export const TIERS = {
  member: {
    key: 'member', label: 'MEMBER', color: '#9CA3AF',
    tagline: '가입 승인 완료 회원',
    conditions: null,
    benefits: ['공지사항', '재료샵', '1:1 피드백', '자유게시판'],
  },
  crew: {
    key: 'crew', label: 'CREW', color: '#FF5C1F',
    tagline: '수강 후기 인증 회원',
    conditions: ['가입 인사 작성', '수강 후기 작성 1회'],
    benefits: ['MEMBER 혜택 전체', '연습베드 예약', '자료실', 'Q&A', '수업 꿀팁'],
  },
  master: {
    key: 'master', label: 'MASTER', color: '#FFB020',
    tagline: '커뮤니티 활동 우수 회원',
    conditions: ['최근 30일 활동 점수 100점 이상'],
    benefits: ['CREW 혜택 전체', '트렌드 속보', '온라인 강의 무료 제공', '추가 수강 할인(추후 적용)', 'MASTER 전용 콘텐츠(추후 제작)'],
  },
};
export const TIER_ORDER = ['member', 'crew', 'master'];

// 점수표(카드 안내용)
export const SCORE_TABLE = [
  ['출석 1회', POINTS.attendance],
  ['좋아요 1회', POINTS.like],
  ['댓글 1개', POINTS.comment],
  ['게시글 1개', POINTS.post],
  ['연습 사진 업로드', POINTS.case],
  ['베스트케이스 선정', POINTS.best],
];

// 등급별 잠금 기능 (수강생만 적용 / 운영진 면제) — App PageRouter에서 사용
export const FEATURE_TIER = {
  // CREW 부터
  'practice-booking': 'crew',
  'qna': 'crew', 'qna-detail': 'crew',
  'tips': 'crew', 'tip-detail': 'crew',
  'library': 'crew', 'library-detail': 'crew',
  // MASTER 부터 (lecture-detail은 온보딩 영상과 겹쳐 잠그지 않음)
  'trends': 'master', 'trend-detail': 'master',
  'online': 'master',
};

// 30일 점수 계산
export function score30(s) {
  return (s.attendance30 || 0) * POINTS.attendance
    + (s.likes30 || 0) * POINTS.like
    + (s.comments30 || 0) * POINTS.comment
    + (s.posts30 || 0) * POINTS.post
    + (s.cases30 || 0) * POINTS.case
    + (s.best30 || 0) * POINTS.best;
}

// 통계 → 등급 판정
// CREW 승급 = 가입 인사 작성(onb_greeting) AND 수강 후기 1회.
// crewMet은 liveCrew(현재 조건 충족) 또는 crewEarned(한 번이라도 달성) 중 하나면 true → 영구 유지.
export function computeTier(s) {
  const score = score30(s);
  const liveCrew = !!s.greetingDone && (s.reviewsAll || 0) >= 1;
  const crewMet = liveCrew || !!s.crewEarned;
  let tier = 'member';
  if (crewMet && score >= MASTER_SCORE) tier = 'master';
  else if (crewMet) tier = 'crew';
  return { tier, score, crewMet, liveCrew, ...s };
}

const ZERO = {
  reviewsAll: 0, greetingDone: false,
  attendance30: 0, likes30: 0, comments30: 0, posts30: 0, cases30: 0, best30: 0,
};

// 등급 산정에 필요한 통계 로딩 (오류 나는 테이블은 0으로 처리해 앱이 안 깨지게)
export async function loadLevelStats(userId) {
  if (!userId) return { ...ZERO };
  const sinceTs = new Date(Date.now() - 30 * 86400000).toISOString();
  const sinceDay = sinceTs.slice(0, 10);
  const cnt = async (q) => { const { count, error } = await q; return error ? 0 : (count || 0); };
  const profRow = async () => {
    const { data, error } = await supabase.from('profiles').select('crew_earned, onb_greeting').eq('id', userId).maybeSingle();
    return error ? {} : (data || {});
  };

  const [reviewsAll, attendance30, likes30, comments30, posts30, cases30, best30, prof] = await Promise.all([
    cnt(supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', '후기')),
    cnt(supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('day', sinceDay)),
    cnt(supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', sinceTs)),
    cnt(supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', sinceTs)),
    cnt(supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', sinceTs)),
    cnt(supabase.from('cases').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', sinceTs)),
    cnt(supabase.from('cases').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_best', true).gte('created_at', sinceTs)),
    profRow(),
  ]);
  return {
    reviewsAll, attendance30, likes30, comments30, posts30, cases30, best30,
    crewEarned: !!prof.crew_earned, greetingDone: !!prof.onb_greeting,
  };
}

// 오늘 출석 기록 (그날 처음 접속 시 1회) — 수강생용
export async function markAttendance(userId) {
  if (!userId) return;
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  try {
    await supabase.from('attendance').upsert({ user_id: userId, day }, { onConflict: 'user_id,day', ignoreDuplicates: true });
  } catch { /* attendance 테이블 미생성 등은 무시(점수만 0) */ }
}

// 등급 상태 훅 — userId 없으면(운영진 등) 로딩 없이 member 기본값.
// opts.mark=true면 점수 조회 전에 오늘 출석을 먼저 기록(본인 화면에서만 사용 — 남의 등급 조회 시엔 false).
export function useLevel(userId, { mark = false } = {}) {
  const [state, setState] = useState({ loading: !!userId, tier: 'member', score: 0, crewMet: false, ...ZERO });
  useEffect(() => {
    if (!userId) { setState({ loading: false, tier: 'member', score: 0, crewMet: false, ...ZERO }); return; }
    let alive = true;
    setState(s => ({ ...s, loading: true }));
    (async () => {
      if (mark) { try { await markAttendance(userId); } catch { /* 출석 실패 무시 */ } }
      const stats = await loadLevelStats(userId);
      if (!alive) return;
      const result = computeTier(stats);
      setState({ loading: false, ...result });
      // CREW를 이번에 처음 달성했으면 영구 플래그 저장
      if (result.liveCrew && !stats.crewEarned) {
        supabase.from('profiles').update({ crew_earned: true }).eq('id', userId).then(() => {}, () => {});
      }
    })();
    return () => { alive = false; };
  }, [userId, mark]);
  return state;
}
