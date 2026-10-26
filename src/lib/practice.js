// 🛏️ 연습 예약 공용 — 2시간 단위 시간대, 휴무 판정, 설정 불러오기
//   티칭 연습: practice_slots / practice_bookings (운영진이 연 슬롯에만 신청)
//   개인 연습: practice_personal_bookings (휴무만 빼고 자유 신청, db/2026-10-26_personal_practice.sql)
import { supabase } from './supabase';

export const PRACTICE_PRESETS = [
  { start: '10:00', end: '12:00' },
  { start: '12:00', end: '14:00' },
  { start: '14:00', end: '16:00' },
  { start: '16:00', end: '18:00' },
  { start: '18:00', end: '20:00' },
];

export const DEFAULT_PRACTICE_SETTINGS = { closed_weekdays: [], personal_capacity: 2 };

// 'YYYY-MM-DD' → 요일 (0=일)
export const weekdayOf = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

export const isClosedDay = (dateStr, settings, closedDates) =>
  (settings?.closed_weekdays || []).includes(weekdayOf(dateStr)) || closedDates.has(dateStr);

// 설정 + 해당 기간 휴무일 (SQL 미실행이면 기본값으로 동작)
export const loadPracticeCalendar = async (first, last) => {
  const [{ data: st }, { data: cd }] = await Promise.all([
    supabase.from('practice_settings').select('closed_weekdays, personal_capacity').eq('id', 1).maybeSingle(),
    supabase.from('practice_closed_days').select('closed_date, memo').gte('closed_date', first).lte('closed_date', last),
  ]);
  return {
    settings: st || DEFAULT_PRACTICE_SETTINGS,
    closedDays: cd || [],
  };
};
