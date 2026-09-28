-- =============================================================
-- 💬 ai_approval_messages (2026-09-28)
-- 승인 대기 중인 게시물을 두고 나누는 대화.
--
-- 지금까지는 캡션 글자를 직접 고치는 것만 됐다. "캡션 좀 더 짧게",
-- "헤드라인 바꿔줘" 처럼 말로 요청할 수 있어야 한 번에 안 끝나도 이어갈 수 있다.
--
-- 캡션만 바꾸는 요청은 글만 새로 쓰면 되지만, 헤드라인이나 로고를 바꾸려면
-- 오버레이를 다시 입혀야 한다. 그래서 앱에 올린 원본을 게시 전까지 남겨둔다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_approval_messages (
  id bigint generated always as identity primary key,
  approval_id bigint not null references public.ai_approvals(id) on delete cascade,
  role text not null,                    -- 'owner' | 'staff'
  body text not null,
  answered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ai_approval_msg_idx on public.ai_approval_messages (approval_id, created_at);
create index if not exists ai_approval_msg_pending_idx on public.ai_approval_messages (answered, created_at)
  where role = 'owner' and answered = false;

alter table public.ai_approval_messages enable row level security;

drop policy if exists "ai_approval_msg_select_admin" on public.ai_approval_messages;
create policy "ai_approval_msg_select_admin" on public.ai_approval_messages
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_approval_msg_insert_admin" on public.ai_approval_messages;
create policy "ai_approval_msg_insert_admin" on public.ai_approval_messages
  for insert with check (
    role = 'owner'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
