alter table public.support_bookings
  drop constraint if exists support_bookings_amount_check;

alter table public.support_bookings
  alter column amount set default 1000000;

alter table public.support_bookings
  add constraint support_bookings_amount_check
    check (amount in (500000, 1000000));
