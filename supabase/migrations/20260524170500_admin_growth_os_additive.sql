create extension if not exists pgcrypto;

-- Additive admin platform tables only.
-- Do not recreate or rewrite the website source-of-truth tables:
-- courses, course_modules, lessons, lesson_resources, lesson_comments,
-- resources, leads, orders, testimonials, blog_posts, site_settings.

create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  course_id uuid,
  campaign text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  visits_count bigint not null default 0,
  conversion_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.click_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  course_id uuid,
  landing_page_id uuid references public.landing_pages(id) on delete set null,
  event_name text not null,
  event_type text not null check (
    event_type in (
      'phone_click',
      'zalo_click',
      'messenger_click',
      'cta_click',
      'form_submit',
      'scroll_depth',
      'pricing_view',
      'add_to_cart',
      'checkout_start',
      'payment_success',
      'payment_failed'
    )
  ),
  button_name text,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  browser text,
  ip_address inet,
  country text,
  city text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  subject text not null,
  preview_text text,
  body_html text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trigger_type text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  audience_count integer not null default 0,
  open_rate numeric(5,2) not null default 0,
  click_rate numeric(5,2) not null default 0,
  revenue_vnd bigint not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_flow_id uuid not null references public.automation_flows(id) on delete cascade,
  lead_id uuid,
  status text not null default 'queued' check (status in ('queued', 'running', 'sent', 'failed', 'skipped')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  course_id uuid,
  discount_type text not null check (discount_type in ('percent', 'fixed_amount')),
  discount_value integer not null check (discount_value >= 0),
  expires_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'paused', 'expired')),
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  module text not null,
  action text not null,
  target_table text,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  device text,
  browser text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create index if not exists landing_pages_slug_idx on public.landing_pages (slug);
create index if not exists click_events_created_at_idx on public.click_events (created_at desc);
create index if not exists click_events_landing_page_idx on public.click_events (landing_page_id, event_type, created_at desc);
create index if not exists click_events_session_idx on public.click_events (session_id, created_at desc);
create index if not exists automation_runs_flow_status_idx on public.automation_runs (automation_flow_id, status, scheduled_at);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_target_idx on public.activity_logs (target_table, target_id, created_at desc);

alter table public.landing_pages enable row level security;
alter table public.click_events enable row level security;
alter table public.email_templates enable row level security;
alter table public.automation_flows enable row level security;
alter table public.automation_runs enable row level security;
alter table public.coupons enable row level security;
alter table public.activity_logs enable row level security;
alter table public.app_settings enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.click_events to anon, authenticated;
grant select, insert, update, delete on
  public.landing_pages,
  public.click_events,
  public.email_templates,
  public.automation_flows,
  public.automation_runs,
  public.coupons,
  public.activity_logs,
  public.app_settings
to authenticated;

drop policy if exists "Public insert click events" on public.click_events;
create policy "Public insert click events"
on public.click_events for insert
to anon, authenticated
with check (true);

drop policy if exists "Authenticated manage additive admin tables" on public.landing_pages;
create policy "Authenticated manage additive admin tables"
on public.landing_pages for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage click events" on public.click_events;
create policy "Authenticated manage click events"
on public.click_events for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage email templates" on public.email_templates;
create policy "Authenticated manage email templates"
on public.email_templates for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage automation flows" on public.automation_flows;
create policy "Authenticated manage automation flows"
on public.automation_flows for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage automation runs" on public.automation_runs;
create policy "Authenticated manage automation runs"
on public.automation_runs for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage coupons" on public.coupons;
create policy "Authenticated manage coupons"
on public.coupons for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage activity logs" on public.activity_logs;
create policy "Authenticated manage activity logs"
on public.activity_logs for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage app settings" on public.app_settings;
create policy "Authenticated manage app settings"
on public.app_settings for all
to authenticated
using (true)
with check (true);
