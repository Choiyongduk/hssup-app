import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 나이스페이는 returnUrl로 form POST를 보냄 → SPA로 redirect 처리

Deno.serve(async (req) => {
  const appUrl = Deno.env.get('APP_URL') || 'https://app.hssup.co.kr';

  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const redirectFail = (msg: string, orderId?: string) => {
    const url = new URL(`${appUrl}/`);
    url.searchParams.set('payment', 'fail');
    url.searchParams.set('error', msg);
    if (orderId) url.searchParams.set('orderId', orderId);
    return Response.redirect(url.toString(), 303);
  };

  const redirectSuccess = (orderId: string) => {
    const url = new URL(`${appUrl}/`);
    url.searchParams.set('payment', 'success');
    url.searchParams.set('orderId', orderId);
    return Response.redirect(url.toString(), 303);
  };

  try {
    // 나이스페이는 application/x-www-form-urlencoded로 POST
    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      for (const [k, v] of formData.entries()) {
        body[k] = v.toString();
      }
    }

    const authResultCode = body.authResultCode;
    const authResultMsg = body.authResultMsg || '인증 실패';
    const tid = body.tid;
    const amount = Number(body.amount);
    const orderId = body.orderId;

    // 1️⃣ 인증 실패 → 실패 페이지로
    if (authResultCode !== '0000') {
      return redirectFail(authResultMsg, orderId);
    }

    if (!tid || !orderId || !amount) {
      return redirectFail('필수 정보 누락', orderId);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2️⃣ DB에서 주문 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return redirectFail('주문을 찾을 수 없습니다', orderId);
    }

    // 🔒 중복 결제 방지
    if (order.status === 'paid') {
      return redirectSuccess(orderId);
    }
    if (order.status === 'fraud' || order.status === 'cancelled') {
      return redirectFail('처리할 수 없는 주문입니다', orderId);
    }

    // 3️⃣ ★ 진짜 가격 조회 (DB의 courses/products/order_items에서 직접)
    let realPrice: number | null = null;

    if (order.item_type === 'product' && order.product_id === null) {
      // 🆕 장바구니 주문 → order_items 합계로 가격 검증
      const { data: lines } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .eq('order_id', orderId);

      if (!lines || lines.length === 0) {
        return redirectFail('주문 상세를 찾을 수 없습니다', orderId);
      }

      let total = 0;
      for (const line of lines) {
        if (!line.product_id) {
          return redirectFail('상품 정보 오류', orderId);
        }
        const { data: product } = await supabase
          .from('products')
          .select('price, stock')
          .eq('id', line.product_id)
          .single();
        if (!product) {
          return redirectFail('상품을 찾을 수 없습니다', orderId);
        }
        if (product.stock !== null && product.stock !== undefined && product.stock < line.quantity) {
          return redirectFail('재고 부족', orderId);
        }
        total += Number(product.price) * Number(line.quantity);
      }
      realPrice = total;

    } else if (order.item_type === 'product' && order.product_id) {
      // 기존 단일 상품 결제
      const { data: product } = await supabase
        .from('products')
        .select('price, stock')
        .eq('id', order.product_id)
        .single();

      if (!product) return redirectFail('상품을 찾을 수 없습니다', orderId);
      if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
        return redirectFail('품절된 상품입니다', orderId);
      }
      realPrice = product.price;
    } else if (order.item_type === 'course' && order.course_id) {
      // 기존 클래스 결제
      const { data: course } = await supabase
        .from('courses')
        .select('price')
        .eq('id', order.course_id)
        .single();

      if (!course) return redirectFail('강의를 찾을 수 없습니다', orderId);
      realPrice = course.price;
    }

    if (realPrice === null || realPrice === undefined) {
      return redirectFail('상품 정보를 확인할 수 없습니다', orderId);
    }

    // 🚚 재료 택배 주문 배송비 — 앱(src/lib/shipping.js)과 같은 숫자여야 한다
    //    샵 수령은 무료, 상품 합계 30,000원 이상이면 무료, 미만이면 3,000원
    const SHIPPING_FEE = 3000;
    const FREE_SHIPPING_MIN = 30000;
    if (order.item_type === 'product' && order.fulfillment !== 'pickup' && Number(realPrice) < FREE_SHIPPING_MIN) {
      realPrice = Number(realPrice) + SHIPPING_FEE;
    }

    // 4️⃣ ★★★ 위변조 검증 (3중 체크)
    if (realPrice !== amount || realPrice !== order.amount) {
      console.error('🚨 가격 위변조 감지:', {
        orderId, userId: order.user_id,
        realPrice, clientAmount: amount, orderAmount: order.amount,
      });

      await supabase.from('orders').update({
        status: 'fraud',
        cancel_reason: `가격 위변조 (real:${realPrice}, client:${amount}, order:${order.amount})`,
      }).eq('order_id', orderId);

      return redirectFail('결제 금액이 일치하지 않습니다', orderId);
    }

    // 5️⃣ 나이스페이 승인 API 호출 (Basic 인증: clientKey:secretKey)
    const clientKey = Deno.env.get('NICEPAY_CLIENT_KEY')!;
    const secretKey = Deno.env.get('NICEPAY_SECRET_KEY')!;
    const credentials = btoa(`${clientKey}:${secretKey}`);

    const nicepayResp = await fetch(`https://api.nicepay.co.kr/v1/payments/${tid}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: realPrice }),
    });

    const nicepayData = await nicepayResp.json();

    if (nicepayData.resultCode !== '0000') {
      await supabase.from('orders').update({
        status: 'failed',
        cancel_reason: nicepayData.resultMsg || '결제 승인 실패',
      }).eq('order_id', orderId);

      return redirectFail(nicepayData.resultMsg || '결제 승인 실패', orderId);
    }

    // 6️⃣ 결제 성공 → DB 업데이트
    await supabase.from('orders').update({
      status: 'paid',
      payment_key: tid,
      payment_method: nicepayData.payMethod || 'card',
      card_company: nicepayData.card?.cardName || nicepayData.cardName || null,
      receipt_url: nicepayData.receipt?.url || nicepayData.receiptUrl || null,
      paid_at: nicepayData.paidAt || new Date().toISOString(),
    }).eq('order_id', orderId);

    // ============================================================
    // 🆕 admin 푸시 알림 (실패해도 결제는 성공 처리)
    // ============================================================
    try {
      // 사장님·원장님(role='admin')만 알림.
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const isProduct = order.item_type === "product";
        const itemLabel = isProduct ? "재료" : "클래스";
        const title = `💳 새 ${itemLabel} 결제 ₩${Number(realPrice).toLocaleString()}`;

        let pushBody = `${order.course_title} · ${order.buyer_name}`;
        if (isProduct) {
          pushBody += `\n📦 받는분: ${order.shipping_recipient_name || "-"}`;
        }

        for (const admin of admins) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                targetUserId: admin.id,
                title,
                body: pushBody,
                url: "/?page=admin-shipments",
              }),
            });
          } catch (e) {
            console.error("admin 푸시 실패 (개별):", admin.id, e);
          }
        }
      }
    } catch (pushErr) {
      console.error("admin 푸시 알림 실패:", pushErr);
      // 푸시 실패는 무시 — 결제는 정상 처리
    }

    // ============================================================
    // 🆕 학생 본인에게 결제 완료 푸시 (PWA로 돌아가도록 유도)
    // ============================================================
    try {
      const isProductForUser = order.item_type === "product";
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: order.user_id,
          title: `✅ ${isProductForUser ? "재료" : "클래스"} 결제 완료`,
          body: order.course_title,
          url: `/?payment=success&orderId=${orderId}`,
        }),
      });
    } catch (pushErr) {
      console.error("학생 결제 완료 푸시 실패:", pushErr);
      // 무시 — 결제는 정상 처리
    }

    // 7️⃣ 재고 감소
    if (order.item_type === 'product' && order.product_id === null) {
      // 🆕 장바구니 주문 → 각 라인별 재고 감소
      const { data: lines } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', orderId);
      if (lines) {
        for (const line of lines) {
          if (!line.product_id) continue;
          const { data: p } = await supabase
            .from('products').select('stock').eq('id', line.product_id).single();
          if (p && typeof p.stock === 'number') {
            const newStock = Math.max(0, p.stock - (line.quantity || 0));
            await supabase.from('products').update({ stock: newStock }).eq('id', line.product_id);
          }
        }
      }

      // 🛒 장바구니 결제 성공 → 해당 상품들 카트에서 제거
      if (lines && lines.length > 0) {
        const productIds = lines.map((l) => l.product_id).filter(Boolean);
        if (productIds.length > 0) {
          await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', order.user_id)
            .in('product_id', productIds);
        }
      }
    } else if (order.item_type === 'product' && order.product_id) {
      // 기존 단일 상품 결제
      const { data: currentProduct } = await supabase
        .from('products')
        .select('stock')
        .eq('id', order.product_id)
        .single();
      if (currentProduct && currentProduct.stock !== null && currentProduct.stock > 0) {
        await supabase.from('products').update({
          stock: currentProduct.stock - 1
        }).eq('id', order.product_id);
      }
    }

    return redirectSuccess(orderId);

  } catch (err) {
    console.error('나이스페이 returnUrl 에러:', err);
    return redirectFail(err.message || '서버 오류');
  }
});