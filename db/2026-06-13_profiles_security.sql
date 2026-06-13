-- =============================================================
-- 🔐 profiles 개인정보 보호 강화 (2026-06-13)
-- 목적: 이메일·전화번호 등 민감정보는 "본인 + 운영진"만,
--       이름·아바타 같은 공개정보는 모두가 볼 수 있게 분리.
-- Supabase SQL Editor 에서 실행. (재실행 안전)
--
-- ⚠️ 순서 중요: 먼저 이 SQL 실행 → 그 다음 앱 배포(코드도 public_profiles 사용).
--    SQL만 실행하고 코드가 옛날이면 게시판 등에서 작성자 이름이 "익명"으로 보일 수 있어요.
-- =============================================================

-- 1) 안전한 공개 컬럼만 노출하는 뷰
--    (definer view: 일부러 profiles RLS를 우회해 '안전 컬럼만' 공개)
create or replace view public.public_profiles as
  select id, name, avatar_color, avatar_url, role, course
  from public.profiles;

-- 로그인 사용자에게 뷰 조회 권한 (비로그인 anon 에게는 주지 않음)
grant select on public.public_profiles to authenticated;

-- 2) profiles 전체공개 SELECT 정책 제거
--    → 이제 profiles 직접 조회는 "본인(id=auth.uid()) 또는 운영진"만 가능
--      (profiles_select_policy / "Admins can view all profiles" 가 그 역할)
drop policy if exists "Users can view all profiles" on public.profiles;

-- (선택) PostgREST 스키마 캐시 새로고침
notify pgrst, 'reload schema';
