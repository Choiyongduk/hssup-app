-- =============================================================
-- 클래스(courses) 전면 교체 + 카테고리 (2026-06-13)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 한 번 실행.
-- 보내주신 과정 안내 이미지 4종 기준 + 카테고리(PMU/원데이/SMP/속눈썹/기타).
--
-- ⚠️ 기존 클래스를 전부 삭제하고 새로 등록합니다.
--    (결제 내역 orders.course_id 는 자동 NULL 처리되고, 과정명은 주문에 보존됨)
-- 이미지는 비워둠 — 등록 후 "클래스 관리"에서 각 과정에 사진을 추가하시면 됩니다.
-- =============================================================

-- 0) 카테고리 컬럼 추가 (없으면)
alter table public.courses add column if not exists category text;

-- 1) 기존 클래스 전부 삭제
delete from public.courses;

-- 2) 새 클래스 등록
insert into public.courses
  (title, en_title, level, duration, price, original_price, show_price, description, features, badge, is_active, is_featured, hot, order_index, category)
values
-- ── PMU (반영구 마스터 과정) ───────────────────────
('반영구 토탈 풀마스터 과정', 'Total Full Master', 'MASTER', '8주 · 연습기간 무제한',
 6500000, 10000000, true,
 E'2시간 교육 · 매년 수억대 연봉 히썹 대표원장의 창업 성공 노하우가 담긴 자체제작 교재\n[뷰티 브랜드 마케팅 + 마케팅 교육 수강권] 무료 제공\n최고급 수강키트 + 프리미엄 머신 + 스페셜 색소 포함 (카드 결제 시 VAT 별도)',
 E'자연눈썹(엠보기법)\n새도우눈썹(수지)\n콤보(엠보+수지)\n쎈아이라인(+꼬리디자인)\n윤곽 헤어라인\n틴트립(볼륨틴트립)\n미인점\n뷰티브랜드마케팅교육(+인스타그램, 네이버)\n1:1 창업맞춤컨설팅\n복구눈썹(중화작업)\n마인드셋 교육\n3D반영구(애교반영구)',
 'BEST', true, true, true, 1, 'PMU'),

('반영구 풀마스터 과정', 'Full Master', 'MASTER', '7주 · 연습기간 무제한',
 5900000, 9000000, true,
 E'2시간 교육 · 매년 수억대 연봉 히썹 대표원장의 창업 성공 노하우가 담긴 자체제작 교재\n[뷰티 브랜드 마케팅 + 마케팅 교육 수강권] 무료 제공\n최고급 수강키트 + 프리미엄 머신 + 스페셜 색소 포함 (카드 결제 시 VAT 별도)',
 E'자연눈썹(엠보기법)\n새도우눈썹(수지)\n콤보(엠보+수지)\n쎈아이라인(+꼬리디자인)\n윤곽 헤어라인\n틴트립(볼륨틴트립)\n미인점\n뷰티브랜드마케팅교육(+인스타그램, 네이버)\n1:1 창업맞춤컨설팅\n복구눈썹(중화작업)\n마인드셋 교육',
 'SALE', true, false, false, 2, 'PMU'),

('브로우 마스터 과정', 'Brow Master', 'BROW', '6주 · 연습기간 무제한',
 4500000, 7000000, true,
 E'2시간 교육 · 매년 수억대 연봉 히썹 대표원장의 창업 성공 노하우가 담긴 자체제작 교재\n[뷰티 브랜드 마케팅 + 마케팅 교육 수강권] 무료 제공\n수강키트 포함 (카드 결제 시 VAT 별도)',
 E'자연눈썹(엠보기법)\n새도우눈썹(수지)\n콤보(엠보+수지)\n뷰티브랜드마케팅교육(+인스타그램, 네이버)\n1:1 창업맞춤컨설팅\n복구눈썹(중화작업)\n마인드셋 교육',
 'SALE', true, false, false, 3, 'PMU'),

-- ── 원데이 / 단과 (반영구 단기) ────────────────────
('트렌디볼륨수지 원데이', 'Trendy Volume', 'ONE-DAY', '원데이',
 800000, null, true, E'원데이 80만원 · 개인재료 사용 가능 (재료 추가 시 10만원 추가)', null, null, true, false, false, 10, '원데이'),

('리얼엠보결 원데이', 'Real Embo', 'ONE-DAY', '원데이',
 800000, null, true, E'원데이 80만원 · 개인재료 사용 가능 (재료 추가 시 10만원 추가)', null, null, true, false, false, 11, '원데이'),

('입술 (입술반영구)', 'Lip', 'ONE-DAY', '원데이 · 단과반',
 800000, null, true, E'원데이 80만원 (개인재료 사용 가능, 재료 추가 시 10만원 추가)\n단과반 170만원', null, null, true, false, false, 12, '원데이'),

('애교반영구', 'Aegyo', 'ONE-DAY', '원데이 · 단과반',
 800000, null, true, E'원데이 80만원 (선등록 할인) · 단과반 190만원', null, null, true, false, false, 13, '원데이'),

-- ── SMP (두피) ─────────────────────────────────────
('SMP (두피문신)', 'Scalp Micropigmentation', 'SMP', '원데이 · 단과반',
 800000, null, true, E'원데이 80만원 · 단과반 280만원', null, null, true, false, false, 20, 'SMP'),

('두피컬러링', 'Scalp Coloring', 'SMP', '원데이',
 800000, null, true, E'원데이 80만원', null, null, true, false, false, 21, 'SMP'),

-- ── 속눈썹 ─────────────────────────────────────────
('속눈썹펌', 'Eyelash Perm', 'LASH', '원데이 · 단과반',
 800000, null, true, E'원데이 80만원 · 단과반 190만원', null, null, true, false, false, 30, '속눈썹'),

-- ── 기타 (자격증 · 재수강 · 지부) ──────────────────
('미용사 메이크업(국가) 자격증 과정', 'Makeup License', 'ETC', '자격증 과정',
 1900000, null, true, E'국가자격증 대비 과정', null, null, true, false, false, 40, '기타'),

('재수강', 'Re-enrollment', 'ETC', null,
 2290000, null, true, E'재수강 과정', null, null, true, false, false, 41, '기타'),

('지부가입', 'Branch Membership', 'ETC', null,
 1000000, null, true, E'지부 가입', null, null, true, false, false, 42, '기타');
