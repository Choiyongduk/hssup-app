-- =============================================================
-- 🔒 회원이 스스로 권한이나 주문 상태를 바꾸지 못하게 잠그기 (2026-11-17)
--
-- 앱 화면에는 그런 버튼이 없지만, 로그인한 회원은 앱을 거치지 않고 DB 에 직접 요청을 보낼 수 있다.
-- 기존 권한 설정(RLS)이 "자기 행은 고칠 수 있다"까지만 막고 있으면
--   - 자기 권한을 운영진/원장님으로 바꾸거나, 승인 전인데 승인 상태로 바꾸거나
--   - 결제하지 않은 주문을 결제 완료로 바꾸거나, 결제한 주문에 품목을 더 끼워 넣을 수 있다.
-- 기존 설정이 어떻든 상관없이, 표에 트리거를 걸어 한 번 더 막는다. 기존 정책은 건드리지 않는다.
--
--  원장님(admin): 전부 가능 / 운영진(staff): 회원 관리와 주문 처리 가능, 권한(role) 변경과 원장님 계정 수정은 불가
--  회원: 자기 정보 중 이름, 연락처, 사진, 배송지 등만. 주문은 새로 만들기(결제 전 상태)와 취소 요청만.
--  서버(결제 함수 등 서비스 키)와 SQL Editor 는 그대로 통과.
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- 되돌리기: 맨 아래 주석의 drop trigger 4줄을 실행.
-- =============================================================

-- 요청한 사람의 구분: 'server'(서비스 키, SQL Editor) / 'admin' / 'staff' / 'member' / 'anon'
create or replace function public.guard_caller_kind()
returns text language plpgsql stable security definer set search_path = public as $$
declare
  r text;
begin
  if auth.uid() is null then
    if coalesce(auth.role(), '') = 'anon' then return 'anon'; end if;
    return 'server';
  end if;
  select role into r from public.profiles where id = auth.uid();
  if r in ('admin', 'staff') then return r; end if;
  return 'member';
end $$;

-- ---------- profiles ----------
create or replace function public.guard_profiles_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  kind text := public.guard_caller_kind();
  locked text[] := array['role', 'approved_at', 'approved_by', 'rejected_reason', 'suspended_reason', 'is_graduate', 'email', 'username'];
  k text;
begin
  if kind in ('server', 'admin') then return new; end if;
  if kind = 'anon' then raise exception '로그인이 필요합니다'; end if;

  if kind = 'staff' then
    if new.role is distinct from old.role then raise exception '권한은 원장님만 바꿀 수 있습니다'; end if;
    if old.role = 'admin' and old.id is distinct from auth.uid() then raise exception '원장님 계정은 수정할 수 없습니다'; end if;
    return new;
  end if;

  -- 일반 회원
  if old.id is distinct from auth.uid() then raise exception '다른 회원의 정보는 바꿀 수 없습니다'; end if;
  foreach k in array locked loop
    if (to_jsonb(new) -> k) is distinct from (to_jsonb(old) -> k) then
      raise exception '이 항목은 스스로 바꿀 수 없습니다 (%)', k;
    end if;
  end loop;
  -- 상태는 탈퇴(deleted)로만 바꿀 수 있다
  if new.status is distinct from old.status and new.status is distinct from 'deleted' then
    raise exception '승인 상태는 스스로 바꿀 수 없습니다';
  end if;
  return new;
end $$;

drop trigger if exists guard_profiles_update on public.profiles;
create trigger guard_profiles_update before update on public.profiles
  for each row execute function public.guard_profiles_update();

-- ---------- orders ----------
create or replace function public.guard_orders_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  kind text := public.guard_caller_kind();
  cancel_keys text[] := array['cancel_status', 'cancel_requested_at', 'cancel_reason_user'];
begin
  if kind in ('server', 'admin', 'staff') then return coalesce(new, old); end if;
  if kind = 'anon' then raise exception '로그인이 필요합니다'; end if;

  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() then raise exception '본인 주문만 만들 수 있습니다'; end if;
    if new.status is distinct from 'pending' then raise exception '주문은 결제 전 상태로만 만들 수 있습니다'; end if;
    if (to_jsonb(new) ->> 'payment_key') is not null or (to_jsonb(new) ->> 'paid_at') is not null
       or (to_jsonb(new) ->> 'cancel_status') is not null
       or coalesce(to_jsonb(new) ->> 'shipping_status', 'pending') <> 'pending' then
      raise exception '결제, 배송 정보는 직접 넣을 수 없습니다';
    end if;
    return new;
  end if;

  if old.user_id is distinct from auth.uid() then raise exception '본인 주문이 아닙니다'; end if;

  if tg_op = 'DELETE' then
    if old.status is distinct from 'pending' then raise exception '결제된 주문은 지울 수 없습니다'; end if;
    return old;
  end if;

  -- UPDATE: 결제 완료된 주문의 취소 요청만 (다른 칸은 그대로여야 한다)
  if (to_jsonb(new) - cancel_keys) is distinct from (to_jsonb(old) - cancel_keys) then
    raise exception '주문 내용은 직접 바꿀 수 없습니다';
  end if;
  if new.cancel_status is distinct from old.cancel_status
     and not (old.status = 'paid' and old.cancel_status is null and new.cancel_status = 'requested') then
    raise exception '취소 요청만 할 수 있습니다';
  end if;
  return new;
end $$;

drop trigger if exists guard_orders_write on public.orders;
create trigger guard_orders_write before insert or update or delete on public.orders
  for each row execute function public.guard_orders_write();

-- ---------- order_items (주문 품목) ----------
create or replace function public.guard_order_items_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  kind text := public.guard_caller_kind();
  oid text := coalesce(new.order_id, old.order_id);
  o record;
begin
  if kind in ('server', 'admin', 'staff') then return coalesce(new, old); end if;
  if kind = 'anon' then raise exception '로그인이 필요합니다'; end if;
  if tg_op = 'UPDATE' and new.order_id is distinct from old.order_id then raise exception '주문 품목은 다른 주문으로 옮길 수 없습니다'; end if;
  select user_id, status into o from public.orders where order_id = oid;
  -- 주문이 지워지면서 품목이 함께 지워지는 경우(주문은 이미 없음)는 그대로 둔다
  if tg_op = 'DELETE' and not found then return old; end if;
  if not found or o.user_id is distinct from auth.uid() or o.status is distinct from 'pending' then
    raise exception '결제 전인 본인 주문의 품목만 바꿀 수 있습니다';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists guard_order_items_write on public.order_items;
create trigger guard_order_items_write before insert or update or delete on public.order_items
  for each row execute function public.guard_order_items_write();

-- 되돌리기 (문제가 생기면 아래 줄의 주석을 풀어 실행)
-- drop trigger if exists guard_profiles_update on public.profiles;
-- drop trigger if exists guard_orders_write on public.orders;
-- drop trigger if exists guard_order_items_write on public.order_items;
