-- =============================================================
-- 🔐 content-media 버킷 업로드 정책 (2026-09-28)
--
-- 버킷을 Public 으로 만들어도 그건 **읽기**만 공개다. 업로드(storage.objects INSERT)는
-- 별도 정책이 없으면 "new row violates row-level security policy" 로 막힌다.
--
-- 다른 버킷들은 로그인한 사람 누구나 올릴 수 있게 돼 있지만, 여기는 아직 게시하지 않은
-- 콘텐츠가 들어가므로 원장(admin)만 쓰게 좁혔다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'content_media_write_admin'
  ) then
    create policy content_media_write_admin
      on storage.objects for all to authenticated
      using (
        bucket_id = 'content-media'
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        bucket_id = 'content-media'
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end $$;
