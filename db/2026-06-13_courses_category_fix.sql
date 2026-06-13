-- =============================================================
-- 클래스 카테고리 채우기 (삭제 없이 UPDATE만 — 사진/데이터 보존)
-- "전체" 탭엔 과정이 보이는데 PMU/원데이 등 탭엔 안 뜰 때 사용.
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

alter table public.courses add column if not exists category text;

update public.courses set category = 'PMU'
 where title in ('반영구 토탈 풀마스터 과정', '반영구 풀마스터 과정', '브로우 마스터 과정');

update public.courses set category = '원데이'
 where title in ('트렌디볼륨수지 원데이', '리얼엠보결 원데이', '입술 (입술반영구)', '애교반영구');

update public.courses set category = 'SMP'
 where title in ('SMP (두피문신)', '두피컬러링');

update public.courses set category = '속눈썹'
 where title = '속눈썹펌';

update public.courses set category = '기타'
 where title in ('미용사 메이크업(국가) 자격증 과정', '재수강', '지부가입');

-- 확인: 카테고리별 개수
select category, count(*) from public.courses group by category order by category;
