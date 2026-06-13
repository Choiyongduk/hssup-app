-- =============================================================
-- 여러 장 이미지 지원 마이그레이션 (2026-06-13)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행하세요.
-- 안전하게 여러 번 실행해도 괜찮도록 작성되어 있습니다 (idempotent).
-- =============================================================

-- 1) image_urls (여러 장) 컬럼 추가 ----------------------------
--    notices, cases 테이블은 이미 image_urls 를 사용 중이라 제외.
alter table public.trends        add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.tips          add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.products      add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.courses       add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.library_files add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- 2) 기존 단일 이미지(image_url)를 배열로 백필 -----------------
--    아직 image_urls 가 비어있는 행만 채웁니다 (재실행 안전).
update public.trends
   set image_urls = jsonb_build_array(image_url)
 where image_url is not null and image_url <> '' and image_urls = '[]'::jsonb;

update public.tips
   set image_urls = jsonb_build_array(image_url)
 where image_url is not null and image_url <> '' and image_urls = '[]'::jsonb;

update public.products
   set image_urls = jsonb_build_array(image_url)
 where image_url is not null and image_url <> '' and image_urls = '[]'::jsonb;

update public.courses
   set image_urls = jsonb_build_array(image_url)
 where image_url is not null and image_url <> '' and image_urls = '[]'::jsonb;

-- library_files 는 기존에 이미지 컬럼이 없었으므로 백필 불필요.
-- (자료실은 다운로드 파일 file_url 과 별개로 image_urls 에 사진을 담습니다.)
