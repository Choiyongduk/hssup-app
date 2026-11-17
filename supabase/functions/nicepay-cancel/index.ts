import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  try {
    const { orderId, reason } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: '주문번호 누락' }), { status: 400, headers: cors });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 🔒 호출자가 admin/staff인지 검증 (Authorization 헤더의 user JWT 사용)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증 필요' }), { status: 401, headers: cors });
    }
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser } } = await userClient.auth.getUser();
    if (!callerUser) {
      return new Response(JSON.stringify({ error: '인증 실패' }), { status: 401, headers: cors });
    }
    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', callerUser.id).single();
    if (!callerProfile || !['admin', 'staff'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: '권한 없음 (admin/staff 전용)' }), { status: 403, headers: cors });
    }

    // 주문 조회
    const { data: order } = await supabase.from('orders')
      .select('*').eq('order_id', orderId).single();
    if (!order || order.status !== 'paid') {
      return new Response(JSON.stringify({ error: '취소할 수 없는 주문입니다' }), { status: 400, headers: cors });
    }
    if (!order.payment_key) {
      return new Response(JSON.stringify({ error: '결제 정보가 없어 취소할 수 없습니다' }), { status: 400, headers: cors });
    }

    // 나이스페이 결제 취소 API
    const clientKey = Deno.env.get('NICEPAY_CLIENT_KEY')!;
    const secretKey = Deno.env.get('NICEPAY_SECRET_KEY')!;
    const credentials = btoa(`${clientKey}:${secretKey}`);

    const resp = await fetch(
      `https://api.nicepay.co.kr/v1/payments/${order.payment_key}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        // 나이스페이 취소 요청에는 reason, orderId 가 꼭 있어야 한다(없으면 'orderId 필수입력항목이 누락').
        // cancelAmt 를 빼면 전액 취소. (예전에 보내던 amount 는 나이스페이가 쓰지 않는 항목이었다)
        body: JSON.stringify({
          reason: reason || '고객 요청',
          orderId: order.order_id,
        }),
      }
    );
    const result = await resp.json();

    if (result.resultCode !== '0000') {
      return new Response(JSON.stringify({
        error: result.resultMsg || '나이스페이 취소 실패',
      }), { status: 400, headers: cors });
    }

    // DB 업데이트
    await supabase.from('orders').update({
      status: 'cancelled',
      cancel_status: 'approved',
      cancel_reason: reason || '고객 요청',
    }).eq('order_id', orderId);

    // 재고 복구
    if (order.item_type === 'product') {
      if (order.product_id) {
        // 단일 상품 결제
        const { data: p } = await supabase.from('products').select('stock').eq('id', order.product_id).single();
        if (p && typeof p.stock === 'number') {
          await supabase.from('products').update({ stock: p.stock + 1 }).eq('id', order.product_id);
        }
      } else {
        // 장바구니 결제 (order_items 기반)
        const { data: lines } = await supabase
          .from('order_items').select('product_id, quantity').eq('order_id', orderId);
        if (lines) {
          for (const line of lines) {
            if (!line.product_id) continue;
            const { data: p } = await supabase.from('products').select('stock').eq('id', line.product_id).single();
            if (p && typeof p.stock === 'number') {
              await supabase.from('products').update({ stock: p.stock + (line.quantity || 0) }).eq('id', line.product_id);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: cors });
  }
});