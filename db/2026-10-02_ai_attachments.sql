-- =============================================================
-- 📎 AI 오피스 대화에 사진 붙이기 (2026-10-02)
--
-- "이 사진처럼 바꿔줘" 를 말로만 설명하기는 어렵다. 대화와 콘텐츠 요청에
-- 참고 사진을 붙일 수 있게 사진 주소 목록을 담는 칸을 둔다.
--
-- 사진은 content-media 버킷의 chat/ 아래에 올라간다. 업로드 권한은
-- 2026-09-28_content_media_policy.sql 이 이미 원장에게 열어두었다.
-- 게시용 원본과 달리 자동으로 지워지지 않는다(대화 기록으로 남는다).
--
-- 글만 보낼 때는 이 칸을 건드리지 않으니, 실행 전에도 기존 대화는 그대로 된다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.ai_approval_messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.ai_messages          add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.ai_requests          add column if not exists attachments jsonb not null default '[]'::jsonb;
