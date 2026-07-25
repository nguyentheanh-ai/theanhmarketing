create table if not exists public.support_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text not null,
  topic text not null,
  note text not null,
  appointment_date date not null,
  appointment_time time not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'held',
  hold_expires_at timestamptz not null,
  amount bigint not null default 500000,
  order_id uuid references public.orders(id) on delete set null,
  order_code text,
  paid_at timestamptz,
  telegram_sent_at timestamptz,
  telegram_last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_bookings_status_check
    check (status in ('held', 'confirmed', 'needs_review', 'cancelled')),
  constraint support_bookings_duration_check
    check (ends_at = starts_at + interval '30 minutes'),
  constraint support_bookings_amount_check
    check (amount = 500000),
  constraint support_bookings_note_check
    check (char_length(note) between 10 and 2000)
);

create table if not exists public.support_busy_dates (
  busy_date date primary key,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_bookings_date_start_idx
  on public.support_bookings (appointment_date, starts_at);

create index if not exists support_bookings_status_starts_at_idx
  on public.support_bookings (status, starts_at);

create index if not exists support_bookings_order_id_idx
  on public.support_bookings (order_id)
  where order_id is not null;

create unique index if not exists support_bookings_active_start_idx
  on public.support_bookings (starts_at)
  where status in ('held', 'confirmed');

alter table public.support_bookings enable row level security;
alter table public.support_busy_dates enable row level security;

revoke all on table public.support_bookings from anon, authenticated;
revoke all on table public.support_busy_dates from anon, authenticated;
grant all on table public.support_bookings to service_role;
grant all on table public.support_busy_dates to service_role;

create or replace function public.reserve_support_booking(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_topic text,
  p_note text,
  p_appointment_date date,
  p_appointment_time time,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_hold_expires_at timestamptz
)
returns public.support_bookings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_booking public.support_bookings;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_starts_at::text, 0));

  update public.support_bookings
  set status = 'cancelled', updated_at = now()
  where status = 'held'
    and hold_expires_at <= now();

  if exists (
    select 1
    from public.support_busy_dates
    where busy_date = p_appointment_date
  ) then
    raise exception using errcode = 'P0001', message = 'SUPPORT_DATE_BUSY';
  end if;

  if exists (
    select 1
    from public.support_bookings
    where starts_at = p_starts_at
      and status in ('held', 'confirmed')
  ) then
    raise exception using errcode = 'P0001', message = 'SUPPORT_SLOT_TAKEN';
  end if;

  insert into public.support_bookings (
    customer_name,
    email,
    phone,
    topic,
    note,
    appointment_date,
    appointment_time,
    starts_at,
    ends_at,
    hold_expires_at
  ) values (
    p_customer_name,
    lower(p_email),
    p_phone,
    p_topic,
    p_note,
    p_appointment_date,
    p_appointment_time,
    p_starts_at,
    p_ends_at,
    p_hold_expires_at
  )
  returning * into created_booking;

  return created_booking;
end;
$$;

revoke all on function public.reserve_support_booking(
  text, text, text, text, text, date, time, timestamptz, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.reserve_support_booking(
  text, text, text, text, text, date, time, timestamptz, timestamptz, timestamptz
) to service_role;

create or replace function public.confirm_support_booking(
  p_order_id uuid,
  p_order_code text,
  p_paid_at timestamptz
)
returns public.support_bookings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_booking public.support_bookings;
begin
  select * into current_booking
  from public.support_bookings
  where order_id = p_order_id or order_code = p_order_code
  order by created_at desc
  limit 1
  for update;

  if current_booking.id is null then
    raise exception using errcode = 'P0001', message = 'SUPPORT_BOOKING_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_booking.starts_at::text, 0));

  if current_booking.status = 'confirmed' then
    return current_booking;
  end if;

  if current_booking.status <> 'held' or current_booking.hold_expires_at <= p_paid_at then
    update public.support_bookings
    set status = 'needs_review', paid_at = p_paid_at, updated_at = now()
    where id = current_booking.id
    returning * into current_booking;
    return current_booking;
  end if;

  update public.support_bookings
  set status = 'confirmed', paid_at = p_paid_at, updated_at = now()
  where id = current_booking.id
  returning * into current_booking;

  return current_booking;
end;
$$;

revoke all on function public.confirm_support_booking(uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.confirm_support_booking(uuid, text, timestamptz)
  to service_role;
