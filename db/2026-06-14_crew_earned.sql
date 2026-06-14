-- =============================================================
-- 🏅 CREW 등급 영구 유지 플래그 (2026-06-14)
-- CREW 승급 조건(가입 인사 작성 + 수강 후기 1회)을 한 번이라도 달성하면 true로 고정.
-- 이후 후기를 삭제해도 CREW가 풀리지 않도록(앱이 자동으로 true 기록).
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.profiles add column if not exists crew_earned boolean not null default false;

-- 이미 조건을 충족한 기존 회원은 즉시 true로 백필 (가입인사 onb_greeting + 후기 글)
update public.profiles p set crew_earned = true
where crew_earned = false
  and p.onb_greeting = true
  and exists (select 1 from public.community_posts cp where cp.user_id = p.id and cp.category = '후기');

notify pgrst, 'reload schema';
