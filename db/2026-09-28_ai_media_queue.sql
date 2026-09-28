-- =============================================================
-- 📤 ai_media_queue (2026-09-28)
-- 앱에서 올린 사진·영상의 게시 대기열.
--
-- 지금까지 소재는 텔레그램으로만 받을 수 있었다. 앱에서 바로 올리면
-- 두 군데를 오가지 않아도 되고, 사진과 설명을 따로 보내다 설명이 날아갈 일도 없다.
--
-- 원본은 Supabase Storage(content-media 버킷)에 **임시로만** 둔다.
-- 자동화가 내려받아 오버레이를 입혀 에셋 저장소에 올리고, 게시가 끝나면 원본을 지운다.
-- 그래서 여기 쌓이는 건 대기 중인 것뿐이다.
--
-- ⚠️ Storage 탭에서 'content-media' 버킷을 만들고 Public 으로 설정해야 한다.
--    인스타그램이 URL 로 내려받기 때문에 공개여야 한다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.ai_media_queue (
  id bigint generated always as identity primary key,
  channel text not null,                    -- hssup-academy | hssup-artmake
  media_url text not null,                  -- 공개 URL (자동화가 내려받는다)
  storage_path text not null,               -- 게시 후 삭제할 때 쓴다
  media_type text not null,                 -- image | video
  user_caption text,
  status text not null default 'queued',    -- queued | done | failed
  error text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  done_at timestamptz
);

create index if not exists ai_media_queue_open_idx on public.ai_media_queue (status, created_at);

alter table public.ai_media_queue enable row level security;

drop policy if exists "ai_media_queue_select_admin" on public.ai_media_queue;
create policy "ai_media_queue_select_admin" on public.ai_media_queue
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "ai_media_queue_write_admin" on public.ai_media_queue;
create policy "ai_media_queue_write_admin" on public.ai_media_queue
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
