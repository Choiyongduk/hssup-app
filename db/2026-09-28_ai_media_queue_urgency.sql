-- =============================================================
-- ⚡ ai_media_queue 에 urgency 추가 (2026-09-28)
--
-- 지금까지 올린 소재는 낮 12시 30분과 저녁 8시에만 처리됐다.
-- 급한 건 그때까지 기다릴 수 없어서 "지금 바로" 를 고를 수 있게 한다.
--
--   scheduled : 정해진 시간에 (지금까지의 방식)
--   now       : 몇 분 안에 캡션·로고를 붙여 승인 요청으로 올린다
--
-- 'now' 라도 인스타에 바로 올라가지는 않는다. 승인은 여전히 원장님이 한다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.ai_media_queue
  add column if not exists urgency text not null default 'scheduled';

create index if not exists ai_media_queue_urgent_idx
  on public.ai_media_queue (status, urgency);
