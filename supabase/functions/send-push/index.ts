import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

// =============================================================
// 📣 send-push — 푸시 알림 발송 + 알림함 기록
//
//  누가 무엇을 보낼 수 있나 (예전에는 주소만 알면 누구나 전 회원에게 보낼 수 있었다)
//   - 서버(서비스 키로 부르는 다른 엣지 함수: 결제 완료 알림 등) : 전부
//   - 원장님(admin)                                           : 전부 (force 포함)
//   - 운영진(staff)                                           : 전부, 단 force(알림 꺼둔 회원에게도 발송)는 원장님만
//   - 승인된 회원                                             : 한 사람에게(targetUserId), 또는 운영진에게(targetRole:'admin')
//   - 로그인 안 한 요청, 승인 전 회원                           : 운영진에게만 (가입 신청 알림)
//
//  보낸 알림은 user_notifications 표에도 적는다 → 앱 알림함에서 다시 볼 수 있다.
//  (표가 아직 없으면 조용히 넘어가고 푸시만 보낸다)
//
//  배포: npx supabase functions deploy send-push --remote=xxrrcdfgwstrtknucxsl --no-verify-jwt --use-api --yes
// =============================================================

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@hssup.co.kr";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const INBOX_KEEP_DAYS = 60;   // 알림함 보관 기간
const PUSH_BATCH = 25;        // 한 번에 함께 보내는 푸시 수

type Caller =
  | { kind: "service" }
  | { kind: "user"; id: string; role: string; approved: boolean }
  | { kind: "anon" };

// 요청을 보낸 사람이 누구인지 확인한다
async function identifyCaller(req: Request, supabase: any): Promise<Caller> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { kind: "anon" };
  if (token === SERVICE_KEY) return { kind: "service" };
  try {
    // anon 키는 사람이 아니라서 여기서 걸러진다
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return { kind: "anon" };
    const { data: profile } = await supabase.from("profiles").select("role, status").eq("id", data.user.id).maybeSingle();
    const role = profile?.role || "student";
    return { kind: "user", id: data.user.id, role, approved: profile?.status === "approved" || role === "admin" || role === "staff" };
  } catch (_e) {
    return { kind: "anon" };
  }
}

// 보낼 수 있는 요청인지 판단. allowForce: 알림을 꺼둔 기기에도 보낼 수 있는지(원장님 공지)
function authorize(caller: Caller, targetUserId: unknown, targetRole: unknown): { ok: boolean; status?: number; allowForce: boolean } {
  if (caller.kind === "service") return { ok: true, allowForce: true };
  if (caller.kind === "user" && caller.role === "admin") return { ok: true, allowForce: true };
  if (caller.kind === "user" && caller.role === "staff") return { ok: true, allowForce: false };
  const toOperators = !targetUserId && targetRole === "admin";
  if (caller.kind === "user" && caller.approved) {
    if (targetUserId || toOperators) return { ok: true, allowForce: false };
    return { ok: false, status: 403, allowForce: false };
  }
  // 로그인 안 한 요청, 승인 전 회원: 운영진에게만
  if (toOperators) return { ok: true, allowForce: false };
  return { ok: false, status: caller.kind === "anon" ? 401 : 403, allowForce: false };
}

// 알림을 눌렀을 때 열 주소는 앱 안 주소만 허용 (바깥 사이트로 보내는 알림을 막는다)
function safeUrl(url: unknown): string {
  if (typeof url !== "string") return "/";
  const u = url.trim();
  if (!u.startsWith("/") || u.startsWith("//") || u.includes("\\")) return "/";
  return u.slice(0, 300);
}

const clip = (value: unknown, max: number) => String(value ?? "").slice(0, max);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, body, url, targetRole, excludeUserId, targetUserId, force } = await req.json();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 0. 권한 확인
    const caller = await identifyCaller(req, supabase);
    const permission = authorize(caller, targetUserId, targetRole);
    if (!permission.ok) return json({ error: "not allowed" }, permission.status || 403);
    const useForce = !!force && permission.allowForce;

    const cleanTitle = clip(title, 120).trim();
    const cleanBody = clip(body, 500);
    const cleanUrl = safeUrl(url);
    if (!cleanTitle) return json({ error: "title required" }, 400);

    // 1. 대상 사용자 ID 결정
    let targetUserIds: string[] = [];

    if (targetUserId) {
      // 특정 사용자 1명
      targetUserIds = [String(targetUserId)];
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
      targetUserIds = (data || []).map((p: any) => p.id);
    } else {
      // 전체 (legacy)
      const { data } = await supabase.from("profiles").select("id");
      targetUserIds = (data || []).map((p: any) => p.id);
    }

    // 작성자 본인 제외
    if (excludeUserId) {
      targetUserIds = targetUserIds.filter((id) => id !== excludeUserId);
    }

    if (targetUserIds.length === 0) {
      return json({ sent: 0, saved: 0, message: "No target users" });
    }

    // 2. 알림함에 기록 (푸시를 못 받는 기기에서도 앱 안에서 볼 수 있게). 실패해도 푸시는 그대로 보낸다.
    let saved = 0;
    try {
      const rows = targetUserIds.map((id) => ({ user_id: id, title: cleanTitle, body: cleanBody || null, url: cleanUrl }));
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error } = await supabase.from("user_notifications").insert(chunk);
        if (!error) { saved += chunk.length; continue; }
        // 표가 아직 없으면(SQL 실행 전) 그만둔다
        if (/does not exist|schema cache|PGRST205|42P01/i.test(`${error.code || ""} ${error.message || ""}`)) break;
        // 묶음 중 한 명이 잘못된 경우(탈퇴 등) — 한 명씩 다시 넣는다
        for (const row of chunk) {
          const { error: oneError } = await supabase.from("user_notifications").insert(row);
          if (!oneError) saved += 1;
        }
      }
      if (saved > 0) {
        const cutoff = new Date(Date.now() - INBOX_KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from("user_notifications").delete().lt("created_at", cutoff);
      }
    } catch (inboxError: any) {
      console.error("inbox save failed:", inboxError?.message || inboxError);
    }

    // 3. 푸시 구독 정보 가져오기
    const { data: allSubscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    // 마이페이지에서 알림을 꺼둔(muted) 기기는 제외. 단 원장님 공지(force)는 꺼둔 기기에도 보낸다.
    // 한 기기(endpoint)에 두 계정이 로그인한 적 있으면 행이 계정마다 하나씩 있다.
    // (예: 원장님 폰에 원장님·운영진 계정 둘 다 등록 → 운영진 전체 알림이 두 번 옴) → 기기당 한 번만 보낸다.
    const seen = new Set<string>();
    const subscriptions = (allSubscriptions || [])
      .filter((s: any) => useForce || !s.muted)
      .filter((s: any) => (seen.has(s.endpoint) ? false : (seen.add(s.endpoint), true)));

    if (subscriptions.length === 0) {
      return json({ sent: 0, saved, message: "No subscriptions" });
    }

    // 4. 푸시 발송 — 한 건씩 기다리면 전체 공지가 오래 걸려서 묶음으로 함께 보낸다
    const payload = JSON.stringify({ title: cleanTitle, body: cleanBody, url: cleanUrl });
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < subscriptions.length; i += PUSH_BATCH) {
      const batch = subscriptions.slice(i, i + PUSH_BATCH);
      const results = await Promise.allSettled(batch.map((sub: any) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          payload,
        )
      ));
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") { sent++; continue; }
        const err: any = result.reason;
        console.error("Push failed:", err?.statusCode, err?.body);
        failed++;
        // 만료된 구독 자동 정리
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", batch[j].endpoint);
        }
      }
    }

    return json({ sent, failed, total: subscriptions.length, saved });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
