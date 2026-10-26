-- =============================================================
-- 🛏️ 개인 연습 예약 (2026-10-26)
--
-- 연습 예약을 두 가지로 나눈다.
--  - 티칭 연습: 지금처럼 운영진이 날짜와 시간을 열어 둔 슬롯에만 신청 (practice_slots / practice_bookings)
--  - 개인 연습: 학원 휴무만 빼고 수강생이 원하는 날짜와 시간대를 골라 바로 신청 (이 파일)
--
-- 휴무 = 매주 쉬는 요일(practice_settings.closed_weekdays) + 따로 지정한 날짜(practice_closed_days)
-- 시간대는 앱의 2시간 단위(10~20시)를 쓰고, 시간대마다 정원(practice_settings.personal_capacity)만큼 받는다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

-- 1) 설정 (한 줄짜리 테이블)
create table if not exists public.practice_settings (
  id int primary key default 1 check (id = 1),
  closed_weekdays int[] not null default '{}',      -- 0=일 ~ 6=토
  personal_capacity int not null default 2 check (personal_capacity between 1 and 20),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.practice_settings (id) values (1) on conflict (id) do nothing;

alter table public.practice_settings enable row level security;

drop policy if exists "practice_settings_select" on public.practice_settings;
create policy "practice_settings_select" on public.practice_settings
  for select using (auth.uid() is not null);

drop policy if exists "practice_settings_write_staff" on public.practice_settings;
create policy "practice_settings_write_staff" on public.practice_settings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

-- 2) 따로 지정한 휴무일
create table if not exists public.practice_closed_days (
  closed_date date primary key,
  memo text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.practice_closed_days enable row level security;

drop policy if exists "practice_closed_days_select" on public.practice_closed_days;
create policy "practice_closed_days_select" on public.practice_closed_days
  for select using (auth.uid() is not null);

drop policy if exists "practice_closed_days_write_staff" on public.practice_closed_days;
create policy "practice_closed_days_write_staff" on public.practice_closed_days
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

-- 3) 개인 연습 예약
create table if not exists public.practice_personal_bookings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  practice_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'booked',    -- booked / cancelled
  created_at timestamptz not null default now()
);

-- 같은 사람이 같은 시간대를 두 번 잡지 못하게 (취소한 건 제외)
create unique index if not exists practice_personal_bookings_once
  on public.practice_personal_bookings(user_id, practice_date, start_time) where status = 'booked';
create index if not exists practice_personal_bookings_date
  on public.practice_personal_bookings(practice_date) where status = 'booked';

alter table public.practice_personal_bookings enable row level security;

-- 남은 자리를 보여 주려면 다른 사람 예약 수도 세야 해서 로그인한 사람은 모두 읽을 수 있다.
-- (이름 등은 profiles 쪽 권한을 따른다)
drop policy if exists "practice_personal_select" on public.practice_personal_bookings;
create policy "practice_personal_select" on public.practice_personal_bookings
  for select using (auth.uid() is not null);

-- 신청은 아래 함수로만 한다 (휴무와 정원 확인). 직접 insert 정책은 두지 않는다.

-- 본인은 취소만, 운영진은 무엇이든
drop policy if exists "practice_personal_update_own" on public.practice_personal_bookings;
create policy "practice_personal_update_own" on public.practice_personal_bookings
  for update using (user_id = auth.uid() and status = 'booked')
  with check (user_id = auth.uid() and status = 'cancelled');

drop policy if exists "practice_personal_update_staff" on public.practice_personal_bookings;
create policy "practice_personal_update_staff" on public.practice_personal_bookings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

-- 4) 신청 함수
create or replace function public.book_personal_practice(p_date date, p_start time, p_end time)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_settings public.practice_settings;
  v_count int;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', '로그인이 필요합니다');
  end if;
  if p_date < v_today then
    return jsonb_build_object('success', false, 'error', '지난 날짜는 신청할 수 없습니다');
  end if;
  if p_end <= p_start then
    return jsonb_build_object('success', false, 'error', '시간이 올바르지 않습니다');
  end if;

  select * into v_settings from public.practice_settings where id = 1;
  if extract(dow from p_date)::int = any(coalesce(v_settings.closed_weekdays, '{}')) then
    return jsonb_build_object('success', false, 'error', '학원 휴무일입니다');
  end if;
  if exists (select 1 from public.practice_closed_days where closed_date = p_date) then
    return jsonb_build_object('success', false, 'error', '학원 휴무일입니다');
  end if;

  -- 같은 시간대 동시 신청이 정원을 넘지 않도록 잠금
  perform pg_advisory_xact_lock(hashtext('personal_practice:' || p_date::text || ':' || p_start::text));

  if exists (
    select 1 from public.practice_personal_bookings
    where user_id = v_uid and practice_date = p_date and start_time = p_start and status = 'booked'
  ) then
    return jsonb_build_object('success', false, 'error', '이미 신청한 시간대입니다');
  end if;

  select count(*) into v_count from public.practice_personal_bookings
  where practice_date = p_date and start_time = p_start and status = 'booked';
  if v_count >= coalesce(v_settings.personal_capacity, 2) then
    return jsonb_build_object('success', false, 'error', '이 시간대는 마감되었습니다');
  end if;

  insert into public.practice_personal_bookings (user_id, practice_date, start_time, end_time)
  values (v_uid, p_date, p_start, p_end);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.book_personal_practice(date, time, time) from public, anon;
grant execute on function public.book_personal_practice(date, time, time) to authenticated;

notify pgrst, 'reload schema';
