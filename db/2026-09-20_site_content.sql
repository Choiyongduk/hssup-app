-- =============================================================
-- 📝 site_content (2026-09-20)
-- 코드 수정 없이 관리자가 바꿀 수 있는 문구(배너 등)를 저장하는 범용 테이블.
-- key로 각 문구를 구분. 지금은 온라인 강의 페이지의 "오픈 예정" 안내 배너에 사용.
-- (앞으로 비슷하게 "관리자가 직접 바꾸면 좋은 문구"가 생기면 이 테이블에 key만 추가하면 됨)
-- Supabase SQL Editor 에서 실행. (재실행 안전)
-- =============================================================

create table if not exists public.site_content (
  key text primary key,
  title text,
  body text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.site_content enable row level security;

drop policy if exists "site_content_select_all" on public.site_content;
create policy "site_content_select_all" on public.site_content
  for select using (true);

drop policy if exists "site_content_write_admin" on public.site_content;
create policy "site_content_write_admin" on public.site_content
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'staff'))
  );

insert into public.site_content (key, title, body) values
  ('online_lecture_banner', '온라인 강의 11월 오픈 예정', '현재 강의 영상을 정성껏 준비하고 있어요. 11월에 오픈되면 알려드릴게요!')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
