-- =============================================================
-- ♻️ 의료폐기물 수거 신청 waste_shops (2026-10-21)
--
-- 반영구 시술 폐기물도 의료폐기물 기준으로 처리해야 해서,
-- 제휴 업체 메디환경산업(mediace.co.kr)에 넘길 반영구 샵 목록을 앱에서 모은다.
--  - 회원: 내 샵 정보를 직접 신청 (메디환경 정보 제공 동의 필수)
--  - 운영진: 목록 확인·상태 변경·직접 추가·엑셀(CSV) 내려받기
--  - user_id 가 비어 있는 행 = 운영진이 전화 등으로 받아 직접 넣은 샵
--
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.waste_shops (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  shop_name text not null,
  owner_name text not null,
  phone text not null,
  address text not null,
  biz_no text,                                  -- 사업자등록번호 (선택)
  waste_amount text,                            -- 월 예상 배출량: 적음 / 보통 / 많음
  note text,                                    -- 신청자 요청사항
  agree_share boolean not null default false,   -- 메디환경산업 정보 제공 동의
  status text not null default 'pending',       -- pending 접수 / sent 메디환경 전달 / contracted 계약 완료 / hold 보류
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 회원 한 명당 신청서 하나 (운영진이 직접 넣은 행은 user_id 가 비어 있어 제한 없음)
create unique index if not exists waste_shops_user_id_key on public.waste_shops(user_id) where user_id is not null;

alter table public.waste_shops enable row level security;

drop policy if exists "waste_shops_select" on public.waste_shops;
create policy "waste_shops_select" on public.waste_shops
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

drop policy if exists "waste_shops_insert" on public.waste_shops;
create policy "waste_shops_insert" on public.waste_shops
  for insert with check (
    (user_id = auth.uid() and agree_share and status = 'pending')
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

-- 회원은 '접수' 상태일 때만 내 신청서를 고칠 수 있다. 상태는 못 바꾼다.
drop policy if exists "waste_shops_update_own" on public.waste_shops;
create policy "waste_shops_update_own" on public.waste_shops
  for update using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending' and agree_share);

drop policy if exists "waste_shops_update_staff" on public.waste_shops;
create policy "waste_shops_update_staff" on public.waste_shops
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

drop policy if exists "waste_shops_delete" on public.waste_shops;
create policy "waste_shops_delete" on public.waste_shops
  for delete using (
    (user_id = auth.uid() and status = 'pending')
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );
