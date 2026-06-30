-- =============================================================
-- 💬 댓글 대댓글(1단계) 지원 (2026-06-30)
-- comments 테이블에 parent_id 추가.
--   - NULL  → 원댓글
--   - 값 있음 → 그 댓글에 대한 답글
-- 답글의 답글(2단계 이상)은 앱(CommentSection)에서 막는다. DB는 1단계만 사용.
-- 원댓글 삭제 시 달린 답글도 함께 삭제(on delete cascade).
-- ⚠️ comments 테이블은 Supabase에서 직접 생성돼 있어 컬럼만 추가한다.
-- Supabase SQL Editor 에서 실행.
-- =============================================================

alter table public.comments
  add column if not exists parent_id uuid
    references public.comments(id) on delete cascade;

create index if not exists comments_parent_id_idx
  on public.comments(parent_id);

notify pgrst, 'reload schema';
