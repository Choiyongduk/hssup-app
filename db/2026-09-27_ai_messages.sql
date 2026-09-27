-- =============================================================
-- 💬 ai_messages (2026-09-27)
-- 원장과 AI 직원이 리포트를 두고 주고받는 대화.
-- 기획안을 받기만 하고 끝나면 소용이 없어서, "이건 15초로 줄여줘" 같은 피드백을
-- 남기면 담당 직원이 읽고 답하거나 고친 기획안을 다시 올린다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_messages (
  id bigint generated always as identity primary key,
  report_id bigint not null references public.ai_reports(id) on delete cascade,
  role text not null,                   -- 'owner'(원장) | 'staff'(AI 직원)
  body text not null,
  answered boolean not null default false,  -- 원장 메시지에 직원이 답했는지
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_report_idx on public.ai_messages (report_id, created_at);
create index if not exists ai_messages_pending_idx on public.ai_messages (answered, created_at)
  where role = 'owner' and answered = false;

alter table public.ai_messages enable row level security;

drop policy if exists "ai_messages_select_admin" on public.ai_messages;
create policy "ai_messages_select_admin" on public.ai_messages
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 원장은 자기 메시지만 남길 수 있다. 직원 답변은 자동화가 service_role 키로 넣는다.
drop policy if exists "ai_messages_insert_admin" on public.ai_messages;
create policy "ai_messages_insert_admin" on public.ai_messages
  for insert with check (
    role = 'owner'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
