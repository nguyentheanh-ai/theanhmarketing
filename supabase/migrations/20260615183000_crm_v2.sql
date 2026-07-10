create schema if not exists crm_v2;
create extension if not exists pgcrypto with schema extensions;

create or replace function crm_v2.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function crm_v2.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'admin_role') in ('owner', 'editor'), false);
$$;

create table if not exists crm_v2.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text,
  phone text,
  normalized_email text,
  normalized_phone text,
  source text,
  owner_id uuid,
  lifecycle_stage text not null default 'lead',
  lead_score integer not null default 0,
  marketing_consent boolean not null default true,
  unsubscribed_at timestamptz,
  bounce_status text,
  complained_at timestamptz,
  avatar_url text,
  custom_fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.leads (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references crm_v2.contacts(id),
  course_id uuid,
  owner_id uuid,
  stage text not null default 'new',
  status text not null default 'open',
  source text,
  lead_score integer not null default 0,
  email_status text not null default 'unknown',
  potential_value numeric not null default 0,
  currency text not null default 'VND',
  next_action text,
  last_touch_at timestamptz,
  qualified_at timestamptz,
  paid_at timestamptz,
  lost_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.crm_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  lead_id uuid references crm_v2.leads(id),
  event_type text not null,
  event_source text not null default 'crm_v2',
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  source_table text,
  source_id text,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists crm_v2.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text not null default 'blue',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.contact_tags (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references crm_v2.contacts(id),
  tag_id uuid not null references crm_v2.tags(id),
  added_by uuid,
  created_at timestamptz not null default now(),
  unique (contact_id, tag_id)
);

create table if not exists crm_v2.segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'draft',
  audience_goal text,
  channel text,
  current_size integer not null default 0,
  version integer not null default 1,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.segment_rules (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references crm_v2.segments(id),
  version integer not null default 1,
  rules jsonb not null default '{"combinator":"and","conditions":[]}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (segment_id, version)
);

create table if not exists crm_v2.segment_memberships (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references crm_v2.segments(id),
  contact_id uuid not null references crm_v2.contacts(id),
  matched_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (segment_id, contact_id)
);

create table if not exists crm_v2.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  preheader text,
  html_body text not null,
  text_body text,
  status text not null default 'draft',
  owner_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment_id uuid references crm_v2.segments(id),
  template_id uuid references crm_v2.email_templates(id),
  campaign_type text not null default 'broadcast',
  status text not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  owner_id uuid,
  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.email_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references crm_v2.email_campaigns(id),
  template_id uuid references crm_v2.email_templates(id),
  contact_id uuid references crm_v2.contacts(id),
  provider text not null default 'mock',
  provider_message_id text,
  recipient_email text,
  status text not null default 'queued',
  subject text,
  idempotency_key text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.email_events (
  id uuid primary key default gen_random_uuid(),
  email_send_id uuid references crm_v2.email_sends(id),
  contact_id uuid references crm_v2.contacts(id),
  provider text not null default 'mock',
  provider_event_id text,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  url text,
  user_agent text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists crm_v2.email_suppression_list (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  email text,
  normalized_email text,
  reason text not null,
  provider text,
  source_event_id uuid references crm_v2.email_events(id),
  suppressed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (normalized_email, reason)
);

create table if not exists crm_v2.workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'draft',
  owner_id uuid,
  active_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references crm_v2.workflows(id),
  version integer not null,
  status text not null default 'draft',
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (workflow_id, version)
);

create table if not exists crm_v2.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid not null references crm_v2.workflow_versions(id),
  node_key text not null,
  node_type text not null,
  config jsonb not null default '{}'::jsonb,
  position jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_version_id, node_key)
);

create table if not exists crm_v2.workflow_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_version_id uuid not null references crm_v2.workflow_versions(id),
  edge_key text not null,
  source_node_key text not null,
  target_node_key text not null,
  condition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_version_id, edge_key)
);

create table if not exists crm_v2.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references crm_v2.workflows(id),
  workflow_version_id uuid not null references crm_v2.workflow_versions(id),
  contact_id uuid references crm_v2.contacts(id),
  lead_id uuid references crm_v2.leads(id),
  status text not null default 'pending',
  trigger_event_id uuid references crm_v2.crm_events(id),
  idempotency_key text,
  started_at timestamptz,
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.workflow_step_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references crm_v2.workflow_runs(id),
  node_key text not null,
  status text not null default 'pending',
  idempotency_key text,
  started_at timestamptz,
  waiting_until timestamptz,
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.orders (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  lead_id uuid references crm_v2.leads(id),
  course_id uuid,
  order_code text,
  product_name text,
  amount numeric not null default 0,
  discount_amount numeric not null default 0,
  net_amount numeric not null default 0,
  currency text not null default 'VND',
  status text not null default 'pending',
  payment_gateway text,
  source text,
  owner_id uuid,
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references crm_v2.orders(id),
  contact_id uuid references crm_v2.contacts(id),
  amount numeric not null default 0,
  currency text not null default 'VND',
  status text not null default 'pending',
  gateway text,
  gateway_transaction_id text,
  paid_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references crm_v2.orders(id),
  payment_id uuid references crm_v2.payments(id),
  amount numeric not null default 0,
  currency text not null default 'VND',
  reason text,
  status text not null default 'requested',
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  coupon_type text not null default 'fixed',
  value numeric not null default 0,
  status text not null default 'active',
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.enrollments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  course_id uuid,
  order_id uuid references crm_v2.orders(id),
  status text not null default 'active',
  activated_at timestamptz,
  last_seen_at timestamptz,
  owner_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.course_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid references crm_v2.enrollments(id),
  contact_id uuid references crm_v2.contacts(id),
  course_id uuid,
  lesson_id uuid,
  progress_percent numeric not null default 0,
  status text not null default 'not_started',
  last_activity_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.student_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  enrollment_id uuid references crm_v2.enrollments(id),
  owner_id uuid,
  note text not null,
  visibility text not null default 'internal',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.support_tickets (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  enrollment_id uuid references crm_v2.enrollments(id),
  subject text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  owner_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  lead_id uuid references crm_v2.leads(id),
  title text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  due_at timestamptz,
  owner_id uuid,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  lead_id uuid references crm_v2.leads(id),
  owner_id uuid,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists crm_v2.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  account_name text,
  status text not null default 'mock',
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, account_name)
);

create table if not exists crm_v2.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  event_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  status text not null default 'received',
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists crm_v2.lead_score_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_v2.contacts(id),
  lead_id uuid references crm_v2.leads(id),
  event_type text not null,
  score_delta integer not null,
  score_after integer,
  source_event_id uuid references crm_v2.crm_events(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists crm_v2.legacy_id_map (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id text not null,
  target_table text not null,
  target_id uuid not null,
  migration_run_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_table, source_id, target_table)
);

create table if not exists crm_v2.migration_runs (
  id uuid primary key default gen_random_uuid(),
  run_label text not null,
  script_name text not null,
  dry_run boolean not null default true,
  status text not null default 'started',
  source_counts jsonb not null default '{}'::jsonb,
  target_counts_before jsonb not null default '{}'::jsonb,
  target_counts_after jsonb not null default '{}'::jsonb,
  duplicate_counts jsonb not null default '{}'::jsonb,
  missing_mappings jsonb not null default '{}'::jsonb,
  drift_detected boolean not null default false,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists crm_v2.crm_daily_metrics (
  metric_date date primary key,
  new_leads integer not null default 0,
  mql integer not null default 0,
  paid_orders integer not null default 0,
  revenue numeric not null default 0,
  email_revenue numeric not null default 0,
  active_automation integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists crm_v2.crm_email_metrics (
  metric_date date not null,
  campaign_id uuid,
  sent integer not null default 0,
  opened integer not null default 0,
  clicked integer not null default 0,
  bounced integer not null default 0,
  complained integer not null default 0,
  unsubscribed integer not null default 0,
  revenue numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (metric_date, campaign_id)
);

create table if not exists crm_v2.crm_pipeline_metrics (
  metric_date date not null,
  stage text not null,
  lead_count integer not null default 0,
  potential_value numeric not null default 0,
  won_count integer not null default 0,
  lost_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (metric_date, stage)
);

create unique index if not exists idx_crm_v2_contacts_normalized_email on crm_v2.contacts (normalized_email) where normalized_email is not null;
create unique index if not exists idx_crm_v2_contacts_normalized_phone on crm_v2.contacts (normalized_phone) where normalized_phone is not null;
create index if not exists idx_crm_v2_contacts_created_at on crm_v2.contacts (created_at desc);
create index if not exists idx_crm_v2_contacts_owner_id on crm_v2.contacts (owner_id);
create index if not exists idx_crm_v2_leads_contact_id on crm_v2.leads (contact_id);
create index if not exists idx_crm_v2_leads_created_at on crm_v2.leads (created_at desc);
create index if not exists idx_crm_v2_leads_stage on crm_v2.leads (stage);
create index if not exists idx_crm_v2_leads_status on crm_v2.leads (status);
create index if not exists idx_crm_v2_leads_owner_id on crm_v2.leads (owner_id);
create index if not exists idx_crm_v2_leads_source on crm_v2.leads (source);
create index if not exists idx_crm_v2_leads_course_id on crm_v2.leads (course_id);
create index if not exists idx_crm_v2_events_contact_time on crm_v2.crm_events (contact_id, occurred_at desc);
create index if not exists idx_crm_v2_events_lead_time on crm_v2.crm_events (lead_id, occurred_at desc);
create unique index if not exists idx_crm_v2_events_idempotency_key on crm_v2.crm_events (idempotency_key) where idempotency_key is not null;
create index if not exists idx_crm_v2_email_sends_contact_id on crm_v2.email_sends (contact_id);
create index if not exists idx_crm_v2_email_sends_status on crm_v2.email_sends (status);
create index if not exists idx_crm_v2_email_events_type on crm_v2.email_events (event_type);
create index if not exists idx_crm_v2_orders_contact_id on crm_v2.orders (contact_id);
create index if not exists idx_crm_v2_orders_created_at on crm_v2.orders (created_at desc);
create index if not exists idx_crm_v2_orders_status on crm_v2.orders (status);
create index if not exists idx_crm_v2_orders_owner_id on crm_v2.orders (owner_id);
create index if not exists idx_crm_v2_orders_source on crm_v2.orders (source);
create index if not exists idx_crm_v2_orders_course_id on crm_v2.orders (course_id);
create index if not exists idx_crm_v2_enrollments_contact_id on crm_v2.enrollments (contact_id);
create index if not exists idx_crm_v2_enrollments_course_id on crm_v2.enrollments (course_id);
create unique index if not exists idx_crm_v2_workflow_step_idempotency_key on crm_v2.workflow_step_runs (idempotency_key) where idempotency_key is not null;
create index if not exists idx_crm_v2_legacy_source on crm_v2.legacy_id_map (source_table, source_id);

alter table crm_v2.contacts enable row level security;
alter table crm_v2.leads enable row level security;
alter table crm_v2.crm_events enable row level security;
alter table crm_v2.tags enable row level security;
alter table crm_v2.contact_tags enable row level security;
alter table crm_v2.segments enable row level security;
alter table crm_v2.segment_rules enable row level security;
alter table crm_v2.segment_memberships enable row level security;
alter table crm_v2.email_templates enable row level security;
alter table crm_v2.email_campaigns enable row level security;
alter table crm_v2.email_sends enable row level security;
alter table crm_v2.email_events enable row level security;
alter table crm_v2.email_suppression_list enable row level security;
alter table crm_v2.workflows enable row level security;
alter table crm_v2.workflow_versions enable row level security;
alter table crm_v2.workflow_nodes enable row level security;
alter table crm_v2.workflow_edges enable row level security;
alter table crm_v2.workflow_runs enable row level security;
alter table crm_v2.workflow_step_runs enable row level security;
alter table crm_v2.orders enable row level security;
alter table crm_v2.payments enable row level security;
alter table crm_v2.refunds enable row level security;
alter table crm_v2.coupons enable row level security;
alter table crm_v2.enrollments enable row level security;
alter table crm_v2.course_progress enable row level security;
alter table crm_v2.student_notes enable row level security;
alter table crm_v2.support_tickets enable row level security;
alter table crm_v2.tasks enable row level security;
alter table crm_v2.notes enable row level security;
alter table crm_v2.audit_logs enable row level security;
alter table crm_v2.integration_accounts enable row level security;
alter table crm_v2.webhook_events enable row level security;
alter table crm_v2.lead_score_events enable row level security;
alter table crm_v2.legacy_id_map enable row level security;
alter table crm_v2.migration_runs enable row level security;
alter table crm_v2.crm_daily_metrics enable row level security;
alter table crm_v2.crm_email_metrics enable row level security;
alter table crm_v2.crm_pipeline_metrics enable row level security;

grant usage on schema crm_v2 to authenticated, service_role;
grant select, insert, update on all tables in schema crm_v2 to authenticated, service_role;
grant usage, select on all sequences in schema crm_v2 to authenticated, service_role;

do $$
declare
  crm_table text;
begin
  foreach crm_table in array array[
    'contacts', 'leads', 'crm_events', 'tags', 'contact_tags',
    'segments', 'segment_rules', 'segment_memberships',
    'email_templates', 'email_campaigns', 'email_sends', 'email_events', 'email_suppression_list',
    'workflows', 'workflow_versions', 'workflow_nodes', 'workflow_edges', 'workflow_runs', 'workflow_step_runs',
    'orders', 'payments', 'refunds', 'coupons',
    'enrollments', 'course_progress', 'student_notes', 'support_tickets',
    'tasks', 'notes', 'audit_logs', 'integration_accounts', 'webhook_events',
    'lead_score_events', 'legacy_id_map', 'migration_runs',
    'crm_daily_metrics', 'crm_email_metrics', 'crm_pipeline_metrics'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'crm_v2'
        and tablename = crm_table
        and policyname = 'crm_v2_admin_all'
    ) then
      execute format(
        'create policy crm_v2_admin_all on crm_v2.%I for all to authenticated using (crm_v2.is_admin()) with check (crm_v2.is_admin())',
        crm_table
      );
    end if;
  end loop;
end;
$$;
