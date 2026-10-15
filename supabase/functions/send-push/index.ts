import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@hssup.co.kr";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, body, url, targetRole, excludeUserId, targetUserId, force } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. 대상 사용자 ID 결정
    let targetUserIds: string[] = [];

    if (targetUserId) {
      // 특정 사용자 1명
      targetUserIds = [targetUserId];
    } else if (targetRole) {
      // 역할별 (admin/staff/student)
      let query = supabase.from("profiles").select("id");
      
      if (targetRole === "admin") {
        // admin + staff 모두 포함
        query = query.in("role", ["admin", "staff"]);
      } else if (targetRole === "student") {
        query = query.eq("role", "student").eq("status", "approved");
      } else {
        query = query.eq("role", targetRole);
      }
      
      const { data } = await query;
      targetUserIds = (data || []).map((p) => p.id);
    } else {
      // 전체 (legacy)
      const { data } = await supabase.from("profiles").select("id");
      targetUserIds = (data || []).map((p) => p.id);
    }

    // 작성자 본인 제외
    if (excludeUserId) {
      targetUserIds = targetUserIds.filter((id) => id !== excludeUserId);
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No target users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. 푸시 구독 정보 가져오기
    const { data: allSubscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    // 마이페이지에서 알림을 꺼둔(muted) 기기는 제외. 단 원장님 공지(force)는 꺼둔 기기에도 보낸다.
    const subscriptions = (allSubscriptions || []).filter((s) => force || !s.muted);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. 푸시 발송
    const payload = JSON.stringify({ title, body, url: url || "/" });
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        console.error("Push failed:", err.statusCode, err.body);
        failed++;
        // 만료된 구독 자동 정리
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(JSON.stringify({ sent, failed, total: subscriptions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});