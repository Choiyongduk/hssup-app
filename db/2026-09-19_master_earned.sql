-- =============================================================
-- 🏅 MASTER 등급 최초 달성 플래그 (2026-09-19)
-- CREW의 crew_earned와 동일한 목적: MASTER를 한 번이라도 달성하면 true로 고정.
-- 이후 점수가 떨어져 강등되더라도 이 플래그는 유지 — "MASTER 등급 달성" 축하 알림을
-- 매번 다시 보내지 않고 최초 1회만 보내기 위한 용도(등급 자체의 강등/승급 판정과는 무관).
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.profiles add column if not exists master_earned boolean not null default false;

notify pgrst, 'reload schema';
