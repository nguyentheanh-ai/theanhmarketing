-- Admin Lead CRM, Google Sheet sync metadata, sale status and resend email logs.
-- Safe to run multiple times in Supabase SQL Editor. It only adds missing columns/tables.

alter table public.leads
  add column if not exists status text not null default 'new',
  add column if not exists sale_status text not null default 'Chưa liên hệ',
  add column if not exists google_sheet_synced_at timestamptz,
  add column if not exists google_sheet_row_id text,
  add column if not exists google_sheet_sync_error text,
  add column if not exists updated_at timestamptz not null default now();

update public.leads
set sale_status = 'Chưa liên hệ'
where sale_status is null or sale_status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_sale_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_sale_status_check
      check (sale_status in ('Chưa liên hệ', 'Đã liên hệ', 'K nhu cầu'));
  end if;
end $$;

create index if not exists leads_sale_status_idx on public.leads(sale_status);
create index if not exists leads_google_sheet_synced_at_idx on public.leads(google_sheet_synced_at);

create table if not exists public.lead_email_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  order_code text,
  email text not null,
  template text not null,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists lead_email_logs_lead_id_idx on public.lead_email_logs(lead_id);
create index if not exists lead_email_logs_order_code_idx on public.lead_email_logs(order_code);
create index if not exists lead_email_logs_created_at_idx on public.lead_email_logs(created_at desc);

alter table public.lead_email_logs enable row level security;

drop policy if exists "Admin lead email logs via service role" on public.lead_email_logs;
create policy "Admin lead email logs via service role"
on public.lead_email_logs for all
to service_role
using (true)
with check (true);
