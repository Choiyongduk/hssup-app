-- =============================================================
-- 🎨 사진 없이 만들기 + 완성본 그대로 (2026-10-02)
--
-- 소재 올리기는 사진이 있어야만 됐다. 이제 디자인 담당이 새 그림(일러스트, 배경)까지
-- 그릴 수 있어서(Cloudflare 무료 FLUX), 글로만 요청해도 한 장을 만든다.
-- 그런 요청은 원본 사진이 없으므로 media_url, storage_path 가 비어 있다.
-- media_type = 'design', ref_urls = "이런 느낌으로" 붙인 참고 사진.
--
-- 2026-10-02_ai_media_as_is.sql(완성본 그대로)을 아직 안 돌렸어도 여기서 같이 된다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.ai_media_queue alter column media_url drop not null;
alter table public.ai_media_queue alter column storage_path drop not null;
alter table public.ai_media_queue add column if not exists ref_urls jsonb not null default '[]'::jsonb;
alter table public.ai_media_queue add column if not exists as_is boolean not null default false;
