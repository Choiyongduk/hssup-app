-- =============================================================
-- 👁 조회수 (2026-09-19)
-- 게시물(자유게시판·가입인사·수강후기), 공지, 트렌드, 꿀팁, Q&A 상세를
-- 열 때마다 +1 (사용자별 중복 방지 없음 — 볼 때마다 카운트하는 단순 방식).
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.community_posts add column if not exists view_count integer not null default 0;
alter table public.notices        add column if not exists view_count integer not null default 0;
alter table public.trends         add column if not exists view_count integer not null default 0;
alter table public.tips           add column if not exists view_count integer not null default 0;
alter table public.questions      add column if not exists view_count integer not null default 0;

-- 조회수 +1 함수. 글쓴이 본인이 아니어도(RLS의 update 정책은 보통 작성자 본인만 허용) 아무 로그인 사용자나
-- 조회수는 올릴 수 있어야 하므로 security definer로 RLS를 우회. p_table은 아래 5개로 고정(SQL 인젝션 방지).
-- p_id는 text로 받고 id::text로 비교 — 테이블마다 id 컬럼 타입이 uuid/정수로 달라도(예: tips는 정수 id) 안전하게 동작.
drop function if exists public.increment_view_count(text, uuid);

create or replace function public.increment_view_count(p_table text, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_table not in ('community_posts', 'notices', 'trends', 'tips', 'questions') then
    raise exception 'invalid table: %', p_table;
  end if;
  execute format('update public.%I set view_count = view_count + 1 where id::text = $1', p_table) using p_id;
end;
$$;

grant execute on function public.increment_view_count(text, text) to authenticated;

notify pgrst, 'reload schema';
