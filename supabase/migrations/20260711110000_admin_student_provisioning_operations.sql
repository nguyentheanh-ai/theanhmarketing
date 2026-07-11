create extension if not exists "pgcrypto";

create table if not exists public.admin_student_provisioning_operations (
  id uuid primary key default gen_random_uuid(),
  operation_id text not null unique,
  request_fingerprint text not null,
  mode text not null check (mode in ('paid', 'free', 'trial')),
  status text not null check (status in ('running', 'partial', 'completed', 'failed')),
  current_step text not null check (current_step in ('validate', 'resolve_student', 'create_order', 'ensure_account', 'grant_access', 'send_email', 'complete')),
  order_code text check (order_code is null or (length(order_code) between 1 and 120 and order_code ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$')),
  safe_result jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_result) = 'object'),
  actor_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'completed' or current_step = 'complete'),
  check ((lease_token is null) = (lease_expires_at is null))
);

create index if not exists idx_admin_student_provisioning_operations_status_updated_at
  on public.admin_student_provisioning_operations(status, updated_at);

create index if not exists idx_admin_student_provisioning_operations_lease_expires_at
  on public.admin_student_provisioning_operations(lease_expires_at)
  where lease_expires_at is not null;

alter table public.admin_student_provisioning_operations enable row level security;

revoke all on table public.admin_student_provisioning_operations from public, anon, authenticated;
grant select, insert, update on table public.admin_student_provisioning_operations to service_role;
