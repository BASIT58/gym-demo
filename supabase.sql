-- =====================================================================
-- GRIT Gym - حماية جدول الحجوزات (شغّله مرة واحدة: SQL Editor -> New query -> Run)
-- آمن لو شغّلته أكتر من مرة، ومايمسحش بيانات.
-- =====================================================================

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  phone       text not null,
  plan        text not null,
  price       text,
  source      text,
  status      text not null default 'new'
);

-- 1) الفاليديشن على السيرفر (حتى لو حد تخطى الصفحة وبعت طلب مباشر للـ API)
--    NOT VALID = بيتطبق على أي إدخال جديد ومايفشلش بسبب صفوف قديمة.
alter table public.bookings drop constraint if exists bookings_name_ck;
alter table public.bookings add  constraint bookings_name_ck
  check (char_length(name) between 2 and 60 and name !~ '[<>{}`$=;"()/\\]') not valid;

alter table public.bookings drop constraint if exists bookings_phone_ck;
alter table public.bookings add  constraint bookings_phone_ck
  check (phone ~ '^01[0125][0-9]{8}$') not valid;

alter table public.bookings drop constraint if exists bookings_plan_ck;
alter table public.bookings add  constraint bookings_plan_ck
  check (char_length(plan) between 1 and 60 and plan !~ '[<>{}`$=;"()/\\]') not valid;

alter table public.bookings drop constraint if exists bookings_price_ck;
alter table public.bookings add  constraint bookings_price_ck
  check (price is null or (char_length(price) <= 60 and price !~ '[<>{}`$=;"()/\\]')) not valid;

alter table public.bookings drop constraint if exists bookings_source_ck;
alter table public.bookings add  constraint bookings_source_ck
  check (source is null or source in ('modal','form')) not valid;

alter table public.bookings drop constraint if exists bookings_status_ck;
alter table public.bookings add  constraint bookings_status_ck
  check (status in ('new','contacted','confirmed','cancelled')) not valid;

-- 2) Row Level Security: الزائر يضيف حجز جديد بس
alter table public.bookings enable row level security;

drop policy if exists "anyone can create booking" on public.bookings;
create policy "anyone can create booking"
  on public.bookings for insert
  to anon
  with check (status = 'new');

revoke all on public.bookings from anon, authenticated;
grant insert on public.bookings to anon;
-- مفيش select / update / delete للزوار. انت بتشوف الحجوزات من Table Editor.

-- 3) Rate limit على السيرفر (ضد السبام والفلود)
create or replace function public.bookings_rate_limit()
returns trigger
language plpgsql
security definer            -- لازم، لأن الزائر مالوش صلاحية قراءة الجدول
set search_path = public
as $$
begin
  -- نفس الرقم: أقصى 3 حجوزات كل 10 دقايق
  if (select count(*) from public.bookings
        where phone = new.phone and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'rate limit: phone' using errcode = 'P0001';
  end if;
  -- الموقع كله: أقصى 30 حجز في الدقيقة
  if (select count(*) from public.bookings
        where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate limit: global' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_rate_limit_trg on public.bookings;
create trigger bookings_rate_limit_trg
  before insert on public.bookings
  for each row execute function public.bookings_rate_limit();
