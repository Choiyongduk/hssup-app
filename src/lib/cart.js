// 장바구니 담기 — 주문 내역의 '다시 담기'처럼 여러 상품을 한 번에 담을 때 쓴다
import { supabase } from './supabase';
import { cartChanged } from './inbox';

// items: [{ product_id, quantity }]
// 이미 담긴 상품이면 수량을 더하고, 판매를 멈췄거나 품절인 상품은 건너뛴다. 재고보다 많이는 담지 않는다.
// 반환: { added: 담은 가짓수, skipped: 건너뛴 상품 이름들 }
export async function addItemsToCart(userId, items) {
  const wanted = new Map();
  (items || []).forEach(({ product_id, quantity }) => {
    if (product_id == null) return;
    const key = String(product_id);
    wanted.set(key, { id: product_id, quantity: (wanted.get(key)?.quantity || 0) + (Number(quantity) || 1) });
  });
  const ids = [...wanted.values()].map((w) => w.id);
  if (ids.length === 0) return { added: 0, skipped: [] };

  const [productsRes, cartRes] = await Promise.all([
    supabase.from('products').select('id, name, stock, is_active').in('id', ids),
    supabase.from('cart_items').select('id, product_id, quantity').eq('user_id', userId).in('product_id', ids),
  ]);
  if (productsRes.error) throw productsRes.error;
  if (cartRes.error) throw cartRes.error;
  const products = new Map((productsRes.data || []).map((p) => [String(p.id), p]));
  const inCart = new Map((cartRes.data || []).map((c) => [String(c.product_id), c]));

  let added = 0;
  const skipped = [];
  for (const [key, want] of wanted) {
    const product = products.get(key);
    if (!product || product.is_active === false || product.stock === 0) {
      skipped.push(product?.name || '판매가 끝난 상품');
      continue;
    }
    const existing = inCart.get(key);
    let quantity = (existing?.quantity || 0) + want.quantity;
    if (typeof product.stock === 'number' && product.stock > 0) quantity = Math.min(quantity, product.stock);
    const { error } = existing
      ? await supabase.from('cart_items').update({ quantity }).eq('id', existing.id)
      : await supabase.from('cart_items').insert({ user_id: userId, product_id: want.id, quantity });
    if (error) throw error;
    added += 1;
  }
  cartChanged();
  return { added, skipped };
}
