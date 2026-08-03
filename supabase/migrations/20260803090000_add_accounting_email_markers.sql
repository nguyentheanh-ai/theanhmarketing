alter table public.orders
  add column if not exists accounting_email_sent_at timestamptz,
  add column if not exists accounting_email_last_error text;
