-- =============================================================
-- 💰 클래스(과정) 가격 숨기고 "문의" 표시 (2026-06-14)
-- 모든 과정의 가격을 노출하지 않고 "문의하기"로 표시.
-- (UI는 show_price=false 면 자동으로 "문의" 표시 — 코드 변경 불필요)
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

-- 기존 과정 전부 가격 숨김
update public.courses set show_price = false;

-- 앞으로 새로 등록하는 과정도 기본은 숨김 (admin 폼에서 필요할 때만 체크)
alter table public.courses alter column show_price set default false;

-- 확인: 가격 공개된 과정이 없어야 함
select count(*) as 가격공개_과정수 from public.courses where show_price = true;
