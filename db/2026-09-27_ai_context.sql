-- =============================================================
-- 🗒️ ai_context (2026-09-27)
-- 원장이 남기는 사업 상황 메모.
--
-- 기획자는 게시물 성과로 "릴스가 피드보다 낫다" 같은 건 스스로 찾아내지만,
-- "10월부터 창업반 모집" 이나 "색소 판매 시작" 처럼 데이터에 없는 사정은 알 수가 없다.
-- 그때마다 대화로 알려주면 그 주에만 반영되고 다음 주 기획자는 모른다.
-- 여기 적어두면 매번 읽고 반영한다.
--
-- 사업 계획이 담기므로 원장(admin)만 읽고 쓴다.
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_context (
  key text primary key,                 -- 'business' 등. 나중에 채널별로 나눌 수 있게 키로 둔다
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.ai_context enable row level security;

drop policy if exists "ai_context_select_admin" on public.ai_context;
create policy "ai_context_select_admin" on public.ai_context
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_context_write_admin" on public.ai_context;
create policy "ai_context_write_admin" on public.ai_context
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
