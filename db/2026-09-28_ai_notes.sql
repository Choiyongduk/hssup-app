-- =============================================================
-- 📝 ai_notes (2026-09-28)
-- 사업 상황 메모를 여러 장으로.
--
-- 지금까지는 큰 칸 하나에 다 적는 방식이라, 한 줄 추가하려고 전체를 열어
-- 고쳐야 했고 지난 내용을 지우기도 번거로웠다. 이제 메모를 한 장씩 넣고 뺀다.
--
-- 기존 ai_context 는 남겨둔다 — 자동화가 둘 다 읽어서 합친다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_notes (
  id bigint generated always as identity primary key,
  key text not null default 'business',
  body text not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists ai_notes_key_idx on public.ai_notes (key, created_at desc);

alter table public.ai_notes enable row level security;

drop policy if exists "ai_notes_select_admin" on public.ai_notes;
create policy "ai_notes_select_admin" on public.ai_notes
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_notes_write_admin" on public.ai_notes;
create policy "ai_notes_write_admin" on public.ai_notes
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
