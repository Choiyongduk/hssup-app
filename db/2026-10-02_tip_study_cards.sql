-- 꿀팁 글마다 복습 카드(질문 → 눌러서 답).
-- 자동화(히썹인스타자동 make_study_cards.py)가 원장님이 쓴 글 내용만으로 만든다.
-- 원장님이 글 아래에서 "공개" 를 눌러야 수강생에게 보인다(study_cards_ok).
--   study_cards: {"hash": 글 내용 지문, "cards": [{"q": 질문, "a": 답}]}
--   글을 고치면 지문이 달라져 다음 실행 때 카드를 새로 만들고 다시 검수 전으로 돌린다.

alter table public.tips add column if not exists study_cards jsonb;
alter table public.tips add column if not exists study_cards_ok boolean not null default false;
