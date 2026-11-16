-- =============================================================
-- 🔔 알림함 user_notifications (2026-11-16)
--
-- 지금까지 알림은 푸시로만 나갔다. 푸시를 꺼 두었거나 받을 수 없는 기기(아이폰 사파리 등)에서는
-- 답변, 댓글, 발송 소식을 알 길이 없었고, 받은 사람도 알림을 놓치면 다시 볼 수 없었다.
-- send-push 가 알림을 보낼 때 이 표에도 한 줄씩 적어 두고, 앱 윗줄의 종 아이콘(알림함)에서 다시 본다.
--
--  - 읽기, 읽음 표시, 지우기: 본인 것만
--  - 쓰기: 앱(회원)은 못 쓴다. send-push 엣지 함수(서비스 키)만 쓴다.
--  - 60일 지난 알림은 send-push 가 보낼 때마다 조금씩 지운다.
--
-- 이 SQL 을 실행하기 전에는 앱에 종 아이콘이 보이지 않는다(앱은 그대로 동작).
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.user_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_idx on public.user_notifications (user_id, created_at desc);
create index if not exists user_notifications_created_idx on public.user_notifications (created_at);

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own" on public.user_notifications
  for select using (user_id = auth.uid());

-- 읽음 표시만 바꾼다 (내용을 고쳐 쓰지 못하게 아래 트리거로 한 번 더 막는다)
drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own" on public.user_notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_notifications_delete_own" on public.user_notifications;
create policy "user_notifications_delete_own" on public.user_notifications
  for delete using (user_id = auth.uid());

-- 회원이 바꿀 수 있는 것은 is_read 뿐. 제목, 내용, 주소는 처음 적힌 그대로 둔다.
create or replace function public.user_notifications_keep_content()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    new.user_id := old.user_id;
    new.title := old.title;
    new.body := old.body;
    new.url := old.url;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists user_notifications_keep_content on public.user_notifications;
create trigger user_notifications_keep_content
  before update on public.user_notifications
  for each row execute function public.user_notifications_keep_content();

grant select, update, delete on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;

notify pgrst, 'reload schema';
