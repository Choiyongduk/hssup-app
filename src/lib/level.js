// 등급(MEMBER / CREW / MASTER) 체계 — 정의 · 점수 · 판정 · 데이터 로딩 · 훅
//  - MEMBER : 가입 승인 완료 회원(기본)
//  - CREW   : 수강후기 1회 + 1:1 피드백(케이스) 1회 (한 번 달성하면 유지)
//  - MASTER : CREW 조건 + 누적 활동 점수 100점 이상 (누적이라 한 번 달성하면 사실상 유지)
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { notifyUsers } from './notifications';

export const MASTER_SCORE = 100;

// 누적 활동 점수 가중치
export const POINTS = {
  attendance: 2,  // 출석 1회(그날 접속)
  like: 1,        // 좋아요 1회
  comment: 2,     // 댓글 1개
  post: 10,       // 게시글 1개
  case: 20,       // 연습 사진(1:1 피드백) 업로드
  best: 50,       // 베스트 케이스 선정
};

// 등급별 메타(설명/혜택/승급조건) — 카드 UI가 그대로 렌더
// 🍊 기능 제한은 전부 없앴음(등급과 무관하게 전 기능 이용 가능). 등급은 이제 순수 활동 인증 배지 개념.
export const TIERS = {
  member: {
    key: 'member', label: 'MEMBER', color: '#9CA3AF',
    tagline: '가입 승인 완료 회원',
    conditions: null,
    benefits: ['전체 기능 이용 가능', '공지사항 · 트렌드 · 수업 꿀팁 · Q&A · 자료실 · 연습베드 예약 · 온라인 강의 · 재료샵 · 게시판'],
  },
  crew: {
    key: 'crew', label: 'CREW', color: '#FF5C1F',
    tagline: '수강 후기 인증 회원',
    conditions: ['가입 인사 작성', '수강 후기 작성 1회'],
    benefits: ['활동 인증 배지 (이용 가능한 기능은 모든 등급이 동일해요)'],
  },
  master: {
    key: 'master', label: 'MASTER', color: '#FFB020',
    tagline: '커뮤니티 활동 우수 회원',
    conditions: ['누적 활동 점수 100점 이상'],
    benefits: ['우수 활동 인증 배지 (이용 가능한 기능은 모든 등급이 동일해요)'],
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

// 누적 점수 계산
export function scoreAll(s) {
  return (s.attendanceAll || 0) * POINTS.attendance
    + (s.likesAll || 0) * POINTS.like
    + (s.commentsAll || 0) * POINTS.comment
    + (s.postsAll || 0) * POINTS.post
    + (s.casesAll || 0) * POINTS.case
    + (s.bestAll || 0) * POINTS.best;
}

// 통계 → 등급 판정
// CREW 승급 = 가입 인사 작성(onb_greeting) AND 수강 후기 1회.
// crewMet은 liveCrew(현재 조건 충족) 또는 crewEarned(한 번이라도 달성) 중 하나면 true → 영구 유지.
export function computeTier(s) {
  const score = scoreAll(s);
  const liveCrew = !!s.greetingDone && (s.reviewsAll || 0) >= 1;
  const crewMet = liveCrew || !!s.crewEarned;
  let tier = 'member';
  if (crewMet && score >= MASTER_SCORE) tier = 'master';
  else if (crewMet) tier = 'crew';
  return { tier, score, crewMet, liveCrew, ...s };
}

const ZERO = {
  reviewsAll: 0, greetingDone: false,
  attendanceAll: 0, likesAll: 0, commentsAll: 0, postsAll: 0, casesAll: 0, bestAll: 0,
};

// 등급 산정에 필요한 통계 로딩 (오류 나는 테이블은 0으로 처리해 앱이 안 깨지게)
export async function loadLevelStats(userId) {
  if (!userId) return { ...ZERO };
  const cnt = async (q) => { const { count, error } = await q; return error ? 0 : (count || 0); };
  const profRow = async () => {
    const { data, error } = await supabase.from('profiles').select('crew_earned, master_earned, onb_greeting').eq('id', userId).maybeSingle();
    return error ? {} : (data || {});
  };

  const [reviewsAll, attendanceAll, likesAll, commentsAll, postsAll, casesAll, bestAll, prof] = await Promise.all([
    cnt(supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('category', '후기')),
    cnt(supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('user_id', userId)),
    cnt(supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', userId)),
    cnt(supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId)),
    cnt(supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('user_id', userId)),
    cnt(supabase.from('cases').select('*', { count: 'exact', head: true }).eq('user_id', userId)),
    cnt(supabase.from('cases').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_best', true)),
    profRow(),
  ]);
  return {
    reviewsAll, attendanceAll, likesAll, commentsAll, postsAll, casesAll, bestAll,
    crewEarned: !!prof.crew_earned, masterEarned: !!prof.master_earned, greetingDone: !!prof.onb_greeting,
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
      // CREW를 이번에 처음 달성했으면 영구 플래그 저장 + 본인 세션(mark)에서만 알림
      if (result.liveCrew && !stats.crewEarned) {
        supabase.from('profiles').update({ crew_earned: true }).eq('id', userId).then(() => {}, () => {});
        if (mark) notifyUsers({ title: '축하해요! CREW 등급 달성', body: '연습베드 예약, 자료실, Q&A, 수업 꿀팁을 이용할 수 있어요', url: '/mypage', userIds: userId });
      }
      // MASTER를 이번에 처음 달성했으면 영구 플래그 저장 + 본인 세션(mark)에서만 알림
      if (result.tier === 'master' && !stats.masterEarned) {
        supabase.from('profiles').update({ master_earned: true }).eq('id', userId).then(() => {}, () => {});
        if (mark) notifyUsers({ title: '축하해요! MASTER 등급 달성', body: '온라인 강의를 무료로 이용할 수 있어요', url: '/mypage', userIds: userId });
      }
    })();
    return () => { alive = false; };
  }, [userId, mark]);
  return state;
}
