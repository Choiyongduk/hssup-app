-- =============================================================
-- ✅ ai_approvals (2026-09-26)
-- 인스타그램 게시와 DM 답장을 앱에서 승인하기 위한 테이블.
-- 지금은 텔레그램 봇으로 승인하고 있는데, 그 기록이 공개 깃 저장소에 파일로 쌓이는 구조라
-- 고객이 보낸 DM 원문이 외부에 노출될 수 있었다. 이 테이블로 옮기면 그 문제가 사라진다.
--
-- 전환 기간에는 텔레그램과 앱 양쪽에 같은 건이 올라간다. 어느 쪽에서 승인하든
-- 자동화가 status를 보고 처리하며, 이미 처리된 건은 건너뛴다.
--
-- 쓰기는 자동화가 service_role 키로 한다(RLS 우회).
-- 읽기와 승인은 원장(admin)만 — 고객 DM 원문이 들어가기 때문.
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_approvals (
  id bigint generated always as identity primary key,
  kind text not null,                   -- 'post'(인스타 게시) | 'dm'(DM 답장)
  channel text not null,                -- 채널 slug (hssup-academy 등)
  ref_key text not null,                -- 자동화 쪽 식별자 (게시는 날짜, DM은 해시 키)
  title text,                           -- 목록에 보여줄 한 줄
  body text,                            -- 게시 캡션 또는 DM 답장 초안
  incoming_text text,                   -- DM일 때 고객이 보낸 원문
  image_urls jsonb,                     -- 게시일 때 미리보기 이미지
  payload jsonb,                        -- 화면에는 안 보이지만 처리에 필요한 값 (DM 수신자 ID 등)
  status text not null default 'awaiting',  -- awaiting | approved | skipped | sent | failed
  error text,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (kind, channel, ref_key)
);

create index if not exists ai_approvals_status_idx on public.ai_approvals (status, created_at desc);

alter table public.ai_approvals enable row level security;

drop policy if exists "ai_approvals_select_admin" on public.ai_approvals;
create policy "ai_approvals_select_admin" on public.ai_approvals
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 원장은 승인/건너뛰기만 할 수 있다. 내용 자체를 앱에서 고치지는 않는다.
drop policy if exists "ai_approvals_decide_admin" on public.ai_approvals;
create policy "ai_approvals_decide_admin" on public.ai_approvals
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
