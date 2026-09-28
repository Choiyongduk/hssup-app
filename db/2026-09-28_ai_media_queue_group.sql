-- =============================================================
-- 🖼 ai_media_queue 에 group_key 추가 (2026-09-28)
--
-- 사진 여러 장을 한 게시물(캐러셀)로 올리기 위한 묶음 표시.
-- 같은 group_key 를 가진 행들은 자동화가 하나의 게시물로 합친다.
--
-- 사진은 한 번에 고른 것들이 같은 key 를 갖고, 영상은 각자 따로 간다.
-- (인스타 캐러셀에 영상을 섞으려면 업로드 방식이 달라서 지금은 사진만 묶는다.)
--
-- 예전에 올린 행들은 group_key 가 비어 있는데, 그때는 id 를 묶음으로 친다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.ai_media_queue add column if not exists group_key text;
alter table public.ai_media_queue add column if not exists sort_order int not null default 0;

create index if not exists ai_media_queue_group_idx
  on public.ai_media_queue (group_key, sort_order);
