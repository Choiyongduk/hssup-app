-- =============================================================
-- 🤖 ai_reports (2026-09-26)
-- 히썹 자동화(hssup-cardnews)가 만든 분석 리포트를 앱에서 읽기 위한 테이블.
-- 피드 분석, 직원 계정 분석 등이 여기에 쌓이고, 앱의 AI OFFICE 탭에서 보여준다.
--
-- 쓰기는 자동화 쪽에서 service_role 키로만 한다(RLS 우회).
-- 읽기는 원장(admin)만 허용 — 직원 계정 분석처럼 민감한 내용이 들어가기 때문.
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_reports (
  id bigint generated always as identity primary key,
  kind text not null,                 -- 'feed' | 'staff' 등 리포트 종류
  target text,                        -- 분석 대상 (채널 slug, 계정명 등)
  title text not null,
  body text not null,                 -- 마크다운 본문
  period_days int,
  created_at timestamptz not null default now()
);

create index if not exists ai_reports_created_idx on public.ai_reports (created_at desc);
create index if not exists ai_reports_kind_idx on public.ai_reports (kind, created_at desc);

alter table public.ai_reports enable row level security;

-- 원장만 읽을 수 있다. staff도 제외한다.
drop policy if exists "ai_reports_select_admin" on public.ai_reports;
create policy "ai_reports_select_admin" on public.ai_reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 앱에서는 쓰지 않는다. 자동화가 service_role 키로 넣으며, 그 키는 RLS를 우회한다.
