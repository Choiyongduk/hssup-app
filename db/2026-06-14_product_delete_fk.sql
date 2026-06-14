-- =============================================================
-- 🗑️ 상품 삭제 FK 정리 (2026-06-14)
-- 증상: 주문/장바구니에 담긴 적 있는 상품 삭제 시
--   "violates foreign key constraint order_items_product_id_fkey" 오류.
-- 원인: orders.product_id 는 ON DELETE SET NULL 인데, order_items / cart_items 는
--   삭제 규칙이 없어 상품 삭제를 막음.
-- 해결:
--   - order_items: product_id 만 NULL 처리(라인엔 product_name·unit_price 스냅샷이 있어 내역 보존)
--   - cart_items : 상품이 사라지면 장바구니에서 자동 제거(CASCADE)
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

-- order_items: 상품 삭제 시 라인 보존 + product_id 만 NULL
alter table public.order_items alter column product_id drop not null;
alter table public.order_items drop constraint if exists order_items_product_id_fkey;
alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

-- cart_items: 상품 삭제 시 장바구니에서 제거
alter table public.cart_items drop constraint if exists cart_items_product_id_fkey;
alter table public.cart_items
  add constraint cart_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete cascade;

notify pgrst, 'reload schema';
