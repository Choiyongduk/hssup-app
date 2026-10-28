-- =============================================================
-- 🧾 주문 품목(order_items) 읽기 권한 (2026-10-28)
--
-- 장바구니 주문은 orders 에 "OO 외 N건" 만 남고 실제 품목은 order_items 에 있다.
-- 결제 내역 / 주문 관리 화면에서 품목을 보여주려면 원장님·운영진이 읽을 수 있어야 하고,
-- 구매한 본인도 자기 주문 품목은 읽을 수 있게 한다.
-- 기존 정책은 건드리지 않고 읽기 정책만 더한다.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

drop policy if exists "order_items_select_staff" on public.order_items;
create policy "order_items_select_staff" on public.order_items
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.order_id = order_items.order_id and o.user_id = auth.uid())
  );
