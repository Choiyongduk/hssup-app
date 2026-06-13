-- =============================================================
-- 자유게시판(커뮤니티) 사진·영상 첨부 마이그레이션 (2026-06-13)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행하세요. (재실행 안전)
-- =============================================================

-- 1) community_posts 에 사진(여러 장)·영상 컬럼 추가
alter table public.community_posts add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.community_posts add column if not exists video_url text;

-- 2) 커뮤니티 사진 저장용 공개 버킷 (영상은 기존 'post-videos' 버킷 재사용)
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', true)
on conflict (id) do nothing;

-- 3) 스토리지 정책 (community-images 버킷) — 로그인 사용자 업로드/수정/삭제 허용
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'community_images_write_authenticated'
  ) then
    create policy community_images_write_authenticated
      on storage.objects for all to authenticated
      using (bucket_id = 'community-images')
      with check (bucket_id = 'community-images');
  end if;
end $$;
