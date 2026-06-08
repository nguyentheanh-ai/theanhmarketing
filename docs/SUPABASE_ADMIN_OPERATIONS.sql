-- Admin operations tables for lead activities, notes, and email lifecycle logs.
-- Run in Supabase SQL editor after verifying the target project.

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid null references public.leads(id) on delete set null,
  actor_id uuid null,
  actor_email text null,
  actor_name text null,
  activity_type text not null,
  title text not null,
  description text null,
  old_value text null,
  new_value text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_activities_lead_id on public.lead_activities(lead_id);
create index if not exists idx_lead_activities_created_at on public.lead_activities(created_at desc);
create index if not exists idx_lead_activities_type on public.lead_activities(activity_type);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  content text not null,
  note_type text not null default 'care',
  created_by_admin_id uuid null,
  created_by_email text null,
  updated_by_admin_id uuid null,
  updated_by_email text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lead_notes_lead_id on public.lead_notes(lead_id);
create index if not exists idx_lead_notes_created_at on public.lead_notes(created_at desc);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid null references public.leads(id) on delete set null,
  customer_id uuid null,
  student_id uuid null,
  email text not null,
  subject text not null,
  template_key text not null,
  resend_email_id text null,
  status text not null default 'queued',
  error_message text null,
  sent_at timestamptz null,
  delivered_at timestamptz null,
  opened_at timestamptz null,
  clicked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_logs_lead_id on public.email_logs(lead_id);
create index if not exists idx_email_logs_email on public.email_logs(email);
create index if not exists idx_email_logs_resend_email_id on public.email_logs(resend_email_id);
create index if not exists idx_email_logs_created_at on public.email_logs(created_at desc);

alter table public.lead_activities enable row level security;
alter table public.lead_notes enable row level security;
alter table public.email_logs enable row level security;

drop policy if exists "admin read lead activities" on public.lead_activities;
drop policy if exists "admin write lead activities" on public.lead_activities;
drop policy if exists "admin read lead notes" on public.lead_notes;
drop policy if exists "admin write lead notes" on public.lead_notes;
drop policy if exists "admin read email logs" on public.email_logs;
drop policy if exists "admin write email logs" on public.email_logs;

create policy "admin read lead activities" on public.lead_activities for select
  using ((auth.jwt() -> 'app_metadata' ->> 'admin_role') in ('owner', 'editor'));
create policy "admin write lead activities" on public.lead_activities for all
  using ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = 'owner')
  with check ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = 'owner');

create policy "admin read lead notes" on public.lead_notes for select
  using ((auth.jwt() -> 'app_metadata' ->> 'admin_role') in ('owner', 'editor'));
create policy "admin write lead notes" on public.lead_notes for all
  using ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = 'owner')
  with check ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = 'owner');

create policy "admin read email logs" on public.email_logs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'admin_role') in ('owner', 'editor'));
create policy "admin write email logs" on public.email_logs for all
  using ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = 'owner')
  with check ((auth.jwt() -> 'app_metadata' ->> 'admin_role') = 'owner');
