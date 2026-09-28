-- New reservations cost 500,000 VND. Preserve historical amounts and scheduling guards.
begin;
alter table public.support_bookings
  alter column amount set default 500000,
  drop constraint support_bookings_amount_check,
  add constraint support_bookings_amount_check check (
    (amount = 500000 and (booking_type = 'student' or (booking_type = 'consultation' and duration_minutes >= 60)))
    or (
    (booking_type = 'student' and (
      (duration_minutes = 30 and amount in (500000, 1000000))
      or (duration_minutes > 30 and amount = 1000000 + ((duration_minutes - 30) / 30) * 500000)
    ))
    or (booking_type = 'consultation' and duration_minutes >= 60
      and amount = 2000000 + ((duration_minutes - 60) / 30) * 700000)

    )
  );

create or replace function public.reserve_support_booking_v3(
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

  booking_amount := 500000;

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
revoke all on function public.reserve_support_booking_v3(text,text,text,text,text,date,time,timestamptz,timestamptz,timestamptz,integer,text)
  from public, anon, authenticated;
grant execute on function public.reserve_support_booking_v3(text,text,text,text,text,date,time,timestamptz,timestamptz,timestamptz,integer,text)
  to service_role;


commit;
