-- =============================================================
-- 🛠️ attendance 테이블 깨끗하게 재생성 (2026-06-14)
-- 증상: 출석 upsert가 계속 400 (on_conflict=user_id,day 매칭 실패).
-- 원인: 예전에 남아있던 attendance 테이블이 (user_id, day) 유니크 제약을
--       제대로 못 갖춰서 PostgREST의 ON CONFLICT가 매칭 안 됨.
-- 해결: 기본키(user_id, day)를 가진 새 테이블로 재생성.
--       출석은 오늘 새로 만든 기능이고 insert가 계속 실패해왔으므로 보존할 데이터 없음.
--
-- ⚠️ 실행 전 확인: select count(*) from public.attendance;  (0 또는 오늘치 몇 개면 안전)
-- Supabase SQL Editor 에서 실행.
-- =============================================================

drop table if exists public.attendance cascade;

create table public.attendance (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  constraint attendance_pkey primary key (user_id, day)   -- ON CONFLICT(user_id,day) 매칭용 확실한 제약
);

alter table public.attendance enable row level security;

create policy attendance_select_own on public.attendance
  for select using (auth.uid() = user_id);

create policy attendance_insert_own on public.attendance
  for insert with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
