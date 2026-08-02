alter table public.orders
  add column if not exists invoice_requested boolean not null default false,
  add column if not exists invoice_tax_code text,
  add column if not exists invoice_company_name text,
  add column if not exists invoice_company_address text,
  add column if not exists invoice_email text;

comment on column public.orders.invoice_requested is
  'Customer requested a business invoice for this order.';
