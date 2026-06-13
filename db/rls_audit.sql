-- =============================================================
-- 🔐 RLS(Row Level Security) 점검용 SQL
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행한 뒤,
-- 결과 두 개(특히 rls_enabled = false 인 테이블)를 캡처해서 보여주세요.
-- (이 SQL은 읽기만 합니다. 아무것도 바꾸지 않아요.)
-- =============================================================

-- 1) public 스키마 테이블별 RLS 활성화 여부
--    rls_enabled = false  →  ⚠️ anon key 로 누구나 읽기/쓰기 가능 (위험)
select
  c.relname               as table_name,
  c.relrowsecurity        as rls_enabled,
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;

-- 2) 현재 걸려 있는 정책 상세
select
  tablename, policyname, cmd as command, roles,
  qual        as using_expression,
  with_check  as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) 스토리지 버킷 공개 여부 + 정책 개수
select b.id as bucket, b.public as is_public,
  (select count(*) from pg_policies p
     where p.schemaname='storage' and p.tablename='objects'
       and p.qual like '%'||b.id||'%') as object_policy_hits
from storage.buckets b
order by b.id;
