-- =============================================================
-- 🏅 등급 체계용 출석 기록 (2026-06-14)
-- MEMBER / CREW / MASTER 등급 중 MASTER 판정에 쓰는 "최근 30일 활동 점수"의
-- 출석(그날 접속 = 1회) 데이터를 저장. 하루 1행(중복은 무시).
-- Supabase SQL Editor 에서 실행. (재실행 안전)
--
-- ⚠️ 이 SQL을 실행하기 전엔 출석 점수만 0으로 집계되고(앱은 안 깨짐),
--    실행 후부터 접속일이 쌓여 점수에 반영됩니다.
--
-- 🔧 이미 잘못된 형태의 attendance 테이블이 있어도 안전하게 보강합니다
--    ("column day does not exist" 오류 대응 — 컬럼/인덱스를 if not exists 로 보강).
-- =============================================================

create table if not exists public.attendance (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 예전 테이블이 남아 있으면 컬럼 보강 (데이터 보존)
alter table public.attendance add column if not exists user_id    uuid;
alter table public.attendance add column if not exists day        date;
alter table public.attendance add column if not exists created_at timestamptz not null default now();

-- upsert(onConflict: user_id,day)용 유니크 + 최근 30일 집계 인덱스
create unique index if not exists attendance_user_day_uniq on public.attendance (user_id, day);

-- RLS: 본인 것만 기록/조회 (운영진은 별도 정책 불필요 — 점수는 본인 화면에서만 계산)
alter table public.attendance enable row level security;

drop policy if exists attendance_select_own on public.attendance;
create policy attendance_select_own on public.attendance
  for select using (auth.uid() = user_id);

drop policy if exists attendance_insert_own on public.attendance;
create policy attendance_insert_own on public.attendance
  for insert with check (auth.uid() = user_id);

-- (선택) PostgREST 스키마 캐시 새로고침
notify pgrst, 'reload schema';
