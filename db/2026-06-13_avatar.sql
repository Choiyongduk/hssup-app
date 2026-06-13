-- =============================================================
-- 프로필 사진 기능 마이그레이션 (2026-06-13)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행하세요. (재실행 안전)
-- =============================================================

-- 1) profiles 에 프로필 사진 URL 컬럼 추가
alter table public.profiles add column if not exists avatar_url text;

-- 2) 프로필 사진 저장용 공개 버킷 생성
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3) 스토리지 정책 (avatars 버킷)
--    - 읽기: 공개 버킷이라 publicUrl 로 누구나 조회 가능 (별도 정책 불필요)
--    - 업로드/수정/삭제: 로그인(authenticated) 사용자 허용
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_write_authenticated'
  ) then
    create policy avatars_write_authenticated
      on storage.objects for all to authenticated
      using (bucket_id = 'avatars')
      with check (bucket_id = 'avatars');
  end if;
end $$;
