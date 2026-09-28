-- =============================================================
-- 📌 ai_requests (2026-09-28)
-- 원장이 올리는 콘텐츠 요청.
--
-- 지금까지는 아이디어를 적어둘 자리가 없었다. 텔레그램은 사진이나 영상이 있어야만
-- 처리하고, 사업 상황 메모는 지속적인 방향을 적는 자리지 콘텐츠 하나를 요청하는 곳이 아니다.
--
-- urgency='now'  → 몇 분 안에 기획안이 나온다 (자동화가 주기적으로 훑는다)
-- urgency='weekly' → 월요일 기획에 반영된다
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_requests (
  id bigint generated always as identity primary key,
  body text not null,
  urgency text not null default 'weekly',   -- 'now' | 'weekly'
  status text not null default 'open',      -- 'open' | 'done'
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  done_at timestamptz
);

create index if not exists ai_requests_open_idx on public.ai_requests (status, urgency, created_at);

alter table public.ai_requests enable row level security;

drop policy if exists "ai_requests_select_admin" on public.ai_requests;
create policy "ai_requests_select_admin" on public.ai_requests
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_requests_write_admin" on public.ai_requests;
create policy "ai_requests_write_admin" on public.ai_requests
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
