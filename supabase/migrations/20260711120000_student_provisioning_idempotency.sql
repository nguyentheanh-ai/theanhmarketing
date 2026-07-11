-- Durable, non-sensitive correlation keys for crash-safe admin provisioning.
-- Apply this migration before enabling the unified provisioning endpoint.

alter table public.orders
  add column if not exists provisioning_operation_id text;

alter table public.orders
  drop constraint if exists orders_provisioning_operation_id_format;
alter table public.orders
  add constraint orders_provisioning_operation_id_format check (
    provisioning_operation_id is null or (
      length(provisioning_operation_id) between 8 and 128
      and provisioning_operation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
    )
  );

create unique index if not exists idx_orders_provisioning_operation_id
  on public.orders (provisioning_operation_id)
  where provisioning_operation_id is not null;

alter table public.leads
  add column if not exists provisioning_operation_id text;

alter table public.leads
  drop constraint if exists leads_provisioning_operation_id_format;
alter table public.leads
  add constraint leads_provisioning_operation_id_format check (
    provisioning_operation_id is null or (
      length(provisioning_operation_id) between 8 and 128
      and provisioning_operation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]+$'
    )
  );

create unique index if not exists idx_leads_provisioning_operation_id
  on public.leads (provisioning_operation_id)
  where provisioning_operation_id is not null;

alter table public.admin_student_provisioning_operations
  add column if not exists email_dispatch_state text,
  add column if not exists email_dispatch_attempt integer not null default 0,
  add column if not exists email_dispatch_idempotency_key text,
  add column if not exists email_provider_message_id text,
  add column if not exists email_dispatch_started_at timestamptz,
  add column if not exists email_dispatch_finished_at timestamptz;

alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_dispatch_state_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_dispatch_state_check check (
    email_dispatch_state is null or email_dispatch_state in ('started', 'sent', 'manual_review', 'retry_authorized')
  );
alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_dispatch_attempt_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_dispatch_attempt_check check (email_dispatch_attempt between 0 and 100);
alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_dispatch_payload_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_dispatch_payload_check check (
    (email_dispatch_state is null and email_dispatch_attempt = 0 and email_dispatch_idempotency_key is null)
    or (email_dispatch_state is not null and email_dispatch_attempt >= 1
      and email_dispatch_idempotency_key is not null
      and email_dispatch_idempotency_key ~ '^[A-Za-z0-9/._:-]{8,200}$')
  );
alter table public.admin_student_provisioning_operations
  drop constraint if exists admin_student_provisioning_operations_email_provider_id_check;
alter table public.admin_student_provisioning_operations
  add constraint admin_student_provisioning_operations_email_provider_id_check check (
    email_provider_message_id is null or (length(email_provider_message_id) between 1 and 160
      and email_provider_message_id ~ '^[A-Za-z0-9._:-]+$')
  );
