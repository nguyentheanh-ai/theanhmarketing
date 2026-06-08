-- Admin soft-delete retention for leads and student rows.
-- UI hides records immediately; purge job hard-deletes eligible lead/admin-access data after 30 days.

alter table if exists public.leads
  add column if not exists deleted_at timestamptz,
  add column if not exists delete_after timestamptz,
  add column if not exists delete_reason text;

create index if not exists leads_deleted_at_idx on public.leads (deleted_at);
create index if not exists leads_delete_after_idx on public.leads (delete_after) where deleted_at is not null;

comment on column public.leads.deleted_at is 'Admin soft-delete marker. Null means visible in Admin Lead.';
comment on column public.leads.delete_after is 'When the protected purge cron may hard-delete this lead.';
comment on column public.leads.delete_reason is 'Admin-facing reason for soft delete.';

create table if not exists public.admin_deleted_students (
  id uuid primary key default gen_random_uuid(),
  student_key text not null,
  email text,
  phone text,
  name text,
  reason text not null default '',
  deleted_at timestamptz not null default now(),
  delete_after timestamptz not null default (now() + interval '30 days'),
  restored_at timestamptz,
  purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_deleted_students_student_key_unique unique (student_key)
);

create index if not exists admin_deleted_students_delete_after_idx
  on public.admin_deleted_students (delete_after)
  where restored_at is null and purged_at is null;

create index if not exists admin_deleted_students_email_idx on public.admin_deleted_students (email);
create index if not exists admin_deleted_students_phone_idx on public.admin_deleted_students (phone);

alter table public.admin_deleted_students enable row level security;

comment on table public.admin_deleted_students is
  'Owner-only admin tombstones for hiding student records immediately while retaining data for the 30-day purge window.';
comment on column public.admin_deleted_students.student_key is
  'Stable normalized key such as email:name@example.com or phone:8490... used by Admin Student view to hide rows.';
comment on column public.admin_deleted_students.purged_at is
  'Set by protected purge cron after eligible admin-created lead/access data and auth account are purged.';
