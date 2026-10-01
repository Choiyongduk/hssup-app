-- =============================================================
-- 🎨 저장한 디자인 ai_styles (2026-10-02)
--
-- 사진 게시물은 정해진 틀(로고 + 왼쪽 아래 헤드라인) 하나뿐이었다.
-- 이제 디자인 담당이 틀 없이 처음부터 그릴 수 있고, 마음에 든 디자인은
-- 시안 대화에서 "앞으로 후기는 이걸로" 하면 이름 붙여 저장된다.
-- 소재 올리기에서 그 이름을 고르면 제목만 바꿔 같은 디자인으로 그린다.
--
-- 저장은 자동화가 service_role 키로 한다. 앱은 읽고, 고르고, 지우기만 한다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_styles (
  id bigint generated always as identity primary key,
  channel text not null,                       -- hssup-academy / hssup-artmake
  name text not null,                          -- 예: 후기
  html text not null,                          -- 디자인. data-slot="headline" 자리에 제목이 들어간다
  fonts jsonb not null default '[]'::jsonb,    -- 추가로 쓰는 구글 글꼴
  preview_url text,                            -- 저장할 때의 시안 그림
  created_at timestamptz not null default now(),
  unique (channel, name)
);

alter table public.ai_styles enable row level security;

drop policy if exists "ai_styles_select_admin" on public.ai_styles;
create policy "ai_styles_select_admin" on public.ai_styles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_styles_delete_admin" on public.ai_styles;
create policy "ai_styles_delete_admin" on public.ai_styles
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 올릴 때 고른 디자인. 비어 있으면 기본 틀.
alter table public.ai_media_queue
  add column if not exists style_id bigint references public.ai_styles(id) on delete set null;
