-- Facebook Ads attribution + Meta CAPI dedupe fields.
-- Safe to run more than once. Does not delete or rewrite old customer data.

alter table if exists public.leads
  add column if not exists full_name text,
  add column if not exists source text default 'organic/unknown',
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_id text,
  add column if not exists utm_term text,
  add column if not exists campaign_id text,
  add column if not exists campaign_name text,
  add column if not exists adset_id text,
  add column if not exists ad_id text,
  add column if not exists ad_name text,
  add column if not exists fbclid text,
  add column if not exists fbc text,
  add column if not exists fbp text,
  add column if not exists landing_page text,
  add column if not exists lead_status text default 'new',
  add column if not exists payment_status text default 'unpaid',
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz default now();

update public.leads
set
  full_name = coalesce(nullif(full_name, ''), nullif(name, ''), full_name),
  source = coalesce(nullif(source, ''), 'organic/unknown'),
  lead_status = coalesce(nullif(lead_status, ''), nullif(status, ''), 'new'),
  payment_status = coalesce(nullif(payment_status, ''), 'unpaid'),
  updated_at = coalesce(updated_at, created_at, now())
where true;

alter table if exists public.orders
  add column if not exists lead_id uuid references public.leads(id) on delete set null,
  add column if not exists customer_name text,
  add column if not exists product_name text,
  add column if not exists payment_status text,
  add column if not exists purchase_event_sent boolean not null default false,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_id text,
  add column if not exists utm_term text,
  add column if not exists campaign_id text,
  add column if not exists campaign_name text,
  add column if not exists adset_id text,
  add column if not exists ad_id text,
  add column if not exists ad_name text,
  add column if not exists fbclid text,
  add column if not exists fbc text,
  add column if not exists fbp text,
  add column if not exists landing_page text,
  add column if not exists updated_at timestamptz default now();

update public.orders
set
  customer_name = coalesce(nullif(customer_name, ''), nullif(student_name, ''), customer_name),
  product_name = coalesce(nullif(product_name, ''), nullif(course_title, ''), product_name),
  payment_status = coalesce(nullif(payment_status, ''), nullif(status, ''), 'pending'),
  purchase_event_sent = coalesce(purchase_event_sent, false),
  updated_at = coalesce(updated_at, created_at, now())
where true;

create index if not exists idx_leads_campaign_id_created_at on public.leads(campaign_id, created_at desc);
create index if not exists idx_leads_phone on public.leads(phone);
create index if not exists idx_leads_email on public.leads(email);
create index if not exists idx_orders_campaign_id_paid_at on public.orders(campaign_id, paid_at desc);
create index if not exists idx_orders_lead_id on public.orders(lead_id);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_purchase_event_sent on public.orders(purchase_event_sent);
