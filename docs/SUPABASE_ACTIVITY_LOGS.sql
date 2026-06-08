-- Central student/admin activity timeline.
-- Production note 2026-06-08:
-- A legacy public.activity_logs table already existed in production, so this
-- migration reconciles the schema instead of dropping data.

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.activity_logs
  add column if not exists student_id uuid null,
  add column if not exists lead_id uuid null,
  add column if not exists user_id uuid null,
  add column if not exists student_email text null,
  add column if not exists student_phone text null,
  add column if not exists event_type text null,
  add column if not exists event_title text null,
  add column if not exists event_description text null,
  add column if not exists status text not null default 'info',
  add column if not exists actor_type text not null default 'system',
  add column if not exists actor_email text null,
  add column if not exists actor_name text null,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists user_agent text null;

-- Keep legacy columns compatible with older admin audit code, but do not force
-- the new student-timeline writer to provide them.
alter table public.activity_logs
  alter column module drop not null,
  alter column action drop not null;

alter table public.activity_logs
  alter column ip_address type text using ip_address::text;

update public.activity_logs
set
  event_type = coalesce(event_type, action, 'legacy_activity'),
  event_title = coalesce(event_title, action, module, 'Legacy activity'),
  status = coalesce(status, 'info'),
  actor_type = coalesce(actor_type, 'system'),
  metadata = coalesce(metadata, '{}'::jsonb)
where event_type is null
  or event_title is null
  or status is null
  or actor_type is null
  or metadata is null;

alter table public.activity_logs
  alter column event_type set not null,
  alter column event_title set not null,
  alter column status set not null,
  alter column actor_type set not null,
  alter column metadata set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_status_check'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_status_check check (status in ('success', 'failed', 'pending', 'info'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_actor_type_check'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_actor_type_check check (actor_type in ('system', 'student', 'admin', 'sale', 'support'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'activity_logs_lead_id_fkey'
  ) then
    alter table public.activity_logs
      add constraint activity_logs_lead_id_fkey foreign key (lead_id) references public.leads(id) on delete set null;
  end if;
end $$;

create index if not exists idx_activity_logs_student_email on public.activity_logs(student_email);
create index if not exists idx_activity_logs_lead_id on public.activity_logs(lead_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_event_type on public.activity_logs(event_type);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "Authenticated manage activity logs" on public.activity_logs;
drop policy if exists "admin read activity logs" on public.activity_logs;
drop policy if exists "service role write activity logs" on public.activity_logs;

create policy "admin read activity logs" on public.activity_logs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'admin_role') in ('owner', 'editor'));

create policy "service role write activity logs" on public.activity_logs for all
  to service_role
  using (true)
  with check (true);

-- Supported event_type values used by code:
-- payment_email_sent, payment_email_failed, payment_success_email_sent,
-- payment_success_email_failed, student_account_created, course_access_granted,
-- course_access_revoked, student_login_success, student_login_failed,
-- student_entered_learning, password_changed, password_reset_requested,
-- password_reset_completed, profile_updated, payment_status_updated,
-- sale_status_updated, sheet_sync_success, sheet_sync_failed.
