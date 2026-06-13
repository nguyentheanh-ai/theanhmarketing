-- Checkout entry notification idempotency markers.
-- Apply before deploying the checkout notification timing change.

alter table public.orders
  add column if not exists pending_payment_email_sent_at timestamptz,
  add column if not exists pending_payment_email_last_error text,
  add column if not exists order_created_telegram_sent_at timestamptz,
  add column if not exists order_created_telegram_last_error text;

create index if not exists orders_pending_payment_email_sent_idx
  on public.orders (pending_payment_email_sent_at)
  where pending_payment_email_sent_at is not null;

create index if not exists orders_order_created_telegram_sent_idx
  on public.orders (order_created_telegram_sent_at)
  where order_created_telegram_sent_at is not null;
