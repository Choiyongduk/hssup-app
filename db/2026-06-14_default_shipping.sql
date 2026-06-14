-- =============================================================
-- 📦 기본 배송지 저장 (2026-06-14)
-- 재료샵 결제 시 배송지를 매번 입력하지 않도록 profiles에 기본 배송지 저장.
-- 결제 화면에서 자동 입력 + "기본 배송지로 저장" 체크 시 갱신.
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.profiles add column if not exists ship_name        text;
alter table public.profiles add column if not exists ship_phone       text;
alter table public.profiles add column if not exists ship_postal      text;
alter table public.profiles add column if not exists ship_addr        text;
alter table public.profiles add column if not exists ship_addr_detail text;
alter table public.profiles add column if not exists ship_memo        text;

notify pgrst, 'reload schema';
