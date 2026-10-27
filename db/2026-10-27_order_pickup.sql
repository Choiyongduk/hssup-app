-- =============================================================
-- 📦 재료 주문 수령 방법 orders.fulfillment (2026-10-27)
--
-- 재료를 살 때 "배송으로 받기" / "샵에서 받아가기" 중 하나를 고른다.
--  - delivery: 지금처럼 주소를 받고 운송장으로 발송 처리 (기존 주문은 모두 delivery)
--  - pickup:   주소 없이 받는 사람 이름과 연락처만 받고, 운영진이 "수령 완료"로 처리
--              (shipping_status: pending → delivered, 발송 단계 없음)
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.orders add column if not exists fulfillment text not null default 'delivery';

alter table public.orders drop constraint if exists orders_fulfillment_check;
alter table public.orders add constraint orders_fulfillment_check check (fulfillment in ('delivery', 'pickup'));

notify pgrst, 'reload schema';
