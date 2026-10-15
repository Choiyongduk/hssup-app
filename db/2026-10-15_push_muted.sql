-- 🔔 마이페이지 '알림 끄기' = 기기 등록은 남기고 muted만 켬
--    send-push: force=true(원장님 공지)면 muted 기기에도 발송, 아니면 muted 제외
alter table public.push_subscriptions
  add column if not exists muted boolean not null default false;
