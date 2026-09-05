-- Extend the existing support booking flow; existing 30-minute rows keep their amount.
alter table public.support_bookings
  add column duration_minutes integer not null default 30,
  add column booking_type text not null default 'student';

alter table public.support_bookings
  drop constraint support_bookings_duration_check,
  drop constraint support_bookings_amount_check,
  add constraint support_bookings_duration_check check (
    duration_minutes in (30, 60, 90, 120)
    and ends_at = starts_at + duration_minutes * interval '1 minute'
  ),
  add constraint support_bookings_type_check check (booking_type in ('student', 'consultation')),
  add constraint support_bookings_amount_check check (
    (booking_type = 'student' and (
      (duration_minutes = 30 and amount in (500000, 1000000))
      or (duration_minutes > 30 and amount = 1000000 + ((duration_minutes - 30) / 30) * 500000)
    ))
    or (booking_type = 'consultation' and duration_minutes >= 60
      and amount = 2000000 + ((duration_minutes - 60) / 30) * 700000)
  ),
  add constraint support_bookings_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('held', 'confirmed'));

create or replace function public.reserve_support_booking_v2(
  p_customer_name text, p_email text, p_phone text, p_topic text, p_note text,
  p_appointment_date date, p_appointment_time time,
  p_starts_at timestamptz, p_ends_at timestamptz, p_hold_expires_at timestamptz,
  p_duration_minutes integer, p_booking_type text
)
returns public.support_bookings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_booking public.support_bookings;
  booking_amount bigint;
  vietnam_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  starts_minute integer;
  ends_minute integer;
begin
  if p_booking_type is null or p_booking_type not in ('student', 'consultation')
    or p_duration_minutes is null or p_duration_minutes not in (30, 60, 90, 120)
    or (p_booking_type = 'consultation' and p_duration_minutes < 60) then
    raise exception using errcode = 'P0001', message = 'SUPPORT_DURATION_INVALID';
  end if;
  if p_appointment_date is null or p_appointment_date < vietnam_today + 3
    or p_appointment_date > vietnam_today + 30 or extract(dow from p_appointment_date) = 0 then
    raise exception using errcode = 'P0001', message = 'SUPPORT_DATE_INVALID';
  end if;
  starts_minute := extract(hour from p_appointment_time)::integer * 60 + extract(minute from p_appointment_time)::integer;
  ends_minute := starts_minute + p_duration_minutes;
  if p_appointment_time is null or extract(second from p_appointment_time) <> 0
    or starts_minute % 30 <> 0
    or not ((starts_minute >= 540 and ends_minute <= 720) or (starts_minute >= 810 and ends_minute <= 1230))
    or p_starts_at is distinct from ((p_appointment_date + p_appointment_time) at time zone 'Asia/Ho_Chi_Minh')
    or p_ends_at is distinct from (p_starts_at + p_duration_minutes * interval '1 minute') then
    raise exception using errcode = 'P0001', message = 'SUPPORT_TIME_INVALID';
  end if;

  booking_amount := case when p_booking_type = 'student'
    then 1000000 + ((p_duration_minutes - 30) / 30) * 500000
    else 2000000 + ((p_duration_minutes - 60) / 30) * 700000 end;

  -- Same lock order as confirmation: appointment day, then booking row.
  perform pg_advisory_xact_lock(hashtextextended('support-booking:' || p_appointment_date::text, 0));
  update public.support_bookings set status = 'cancelled', updated_at = now()
    where appointment_date = p_appointment_date and status = 'held' and hold_expires_at <= now();

  if exists (select 1 from public.support_busy_dates where busy_date = p_appointment_date) then
    raise exception using errcode = 'P0001', message = 'SUPPORT_DATE_BUSY';
  end if;
  if exists (select 1 from public.support_bookings
    where status in ('held', 'confirmed') and starts_at < p_ends_at and ends_at > p_starts_at) then
    raise exception using errcode = 'P0001', message = 'SUPPORT_SLOT_TAKEN';
  end if;

  insert into public.support_bookings (
    customer_name, email, phone, topic, note, appointment_date, appointment_time,
    starts_at, ends_at, hold_expires_at, duration_minutes, booking_type, amount
  ) values (
    p_customer_name, lower(p_email), p_phone, p_topic, p_note, p_appointment_date, p_appointment_time,
    p_starts_at, p_ends_at, p_hold_expires_at, p_duration_minutes, p_booking_type, booking_amount
  ) returning * into created_booking;
  return created_booking;
exception when exclusion_violation or unique_violation then
  raise exception using errcode = 'P0001', message = 'SUPPORT_SLOT_TAKEN';
end;
$$;
revoke all on function public.reserve_support_booking_v2(text,text,text,text,text,date,time,timestamptz,timestamptz,timestamptz,integer,text)
  from public, anon, authenticated;
grant execute on function public.reserve_support_booking_v2(text,text,text,text,text,date,time,timestamptz,timestamptz,timestamptz,integer,text)
  to service_role;

-- Old application releases can still reserve their fixed 30-minute student product.
create or replace function public.reserve_support_booking(
  p_customer_name text, p_email text, p_phone text, p_topic text, p_note text,
  p_appointment_date date, p_appointment_time time,
  p_starts_at timestamptz, p_ends_at timestamptz, p_hold_expires_at timestamptz
)
returns public.support_bookings
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return public.reserve_support_booking_v2(
    p_customer_name,p_email,p_phone,p_topic,p_note,p_appointment_date,p_appointment_time,
    p_starts_at,p_ends_at,p_hold_expires_at,30,'student'
  );
end;
$$;

create or replace function public.confirm_support_booking(p_order_id uuid, p_order_code text, p_paid_at timestamptz)
returns public.support_bookings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_booking public.support_bookings;
begin
  select * into current_booking from public.support_bookings
    where order_id = p_order_id or order_code = p_order_code
    order by created_at desc limit 1;
  if current_booking.id is null then
    raise exception using errcode = 'P0001', message = 'SUPPORT_BOOKING_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('support-booking:' || current_booking.appointment_date::text, 0));
  select * into current_booking from public.support_bookings where id = current_booking.id for update;
  if current_booking.status = 'confirmed' then return current_booking; end if;
  if current_booking.status <> 'held' or current_booking.hold_expires_at <= p_paid_at then
    update public.support_bookings set status = 'needs_review', paid_at = p_paid_at, updated_at = now()
      where id = current_booking.id returning * into current_booking;
    return current_booking;
  end if;
  update public.support_bookings set status = 'confirmed', paid_at = p_paid_at, updated_at = now()
    where id = current_booking.id returning * into current_booking;
  return current_booking;
end;
$$;
