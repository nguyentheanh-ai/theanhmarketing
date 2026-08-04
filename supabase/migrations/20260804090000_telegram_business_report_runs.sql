create extension if not exists "pgcrypto";

create table if not exists public.telegram_business_report_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique check (length(run_key) between 20 and 180),
  slot text not null check (slot in ('morning', 'full-day')),
  window_start timestamptz not null,
  window_end timestamptz not null check (window_end > window_start),
  state text not null check (state in ('processing', 'sent', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 100),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error text check (length(coalesce(last_error, '')) <= 800),
  started_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint telegram_business_report_lease_pair check ((lease_token is null) = (lease_expires_at is null))
);

alter table public.telegram_business_report_runs enable row level security;
revoke all on table public.telegram_business_report_runs from public, anon, authenticated;
grant select, insert, update on table public.telegram_business_report_runs to service_role;

create or replace function public.claim_telegram_business_report(
  p_run_key text,
  p_slot text,
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_row public.telegram_business_report_runs%rowtype;
  v_lease uuid := gen_random_uuid();
begin
  if p_run_key is null or length(p_run_key) not between 20 and 180
     or p_slot not in ('morning', 'full-day')
     or p_window_start is null or p_window_end is null or p_window_end <= p_window_start then
    raise exception 'invalid_telegram_business_report_claim' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('telegram-business-report:' || p_run_key, 0));
  select * into v_row from public.telegram_business_report_runs where run_key = p_run_key for update;

  if not found then
    insert into public.telegram_business_report_runs (
      run_key, slot, window_start, window_end, state, attempt_count,
      lease_token, lease_expires_at, started_at, updated_at
    ) values (
      p_run_key, p_slot, p_window_start, p_window_end, 'processing', 1,
      v_lease, v_now + interval '10 minutes', v_now, v_now
    );
    return jsonb_build_object('claimed', true, 'lease_token', v_lease);
  end if;

  if v_row.slot <> p_slot or v_row.window_start <> p_window_start or v_row.window_end <> p_window_end then
    raise exception 'telegram_business_report_window_mismatch' using errcode = '22023';
  end if;
  if v_row.state = 'sent' or (v_row.state = 'processing' and v_row.lease_expires_at > v_now) then
    return jsonb_build_object('claimed', false);
  end if;

  update public.telegram_business_report_runs
  set state = 'processing', attempt_count = attempt_count + 1, lease_token = v_lease,
      lease_expires_at = v_now + interval '10 minutes', last_error = null,
      started_at = v_now, updated_at = v_now
  where run_key = p_run_key;
  return jsonb_build_object('claimed', true, 'lease_token', v_lease);
end;
$$;

create or replace function public.finish_telegram_business_report(
  p_run_key text,
  p_lease_token uuid,
  p_outcome text,
  p_error text default null
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_changed integer;
begin
  if p_outcome not in ('sent', 'failed') or p_lease_token is null then
    raise exception 'invalid_telegram_business_report_finish' using errcode = '22023';
  end if;

  update public.telegram_business_report_runs
  set state = p_outcome,
      sent_at = case when p_outcome = 'sent' then v_now else sent_at end,
      last_error = case when p_outcome = 'failed' then left(coalesce(p_error, 'Unknown delivery failure'), 800) else null end,
      lease_token = null, lease_expires_at = null, updated_at = v_now
  where run_key = p_run_key and state = 'processing' and lease_token = p_lease_token;
  get diagnostics v_changed = row_count;
  return v_changed = 1;
end;
$$;

revoke all on function public.claim_telegram_business_report(text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.finish_telegram_business_report(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_telegram_business_report(text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.finish_telegram_business_report(text, uuid, text, text) to service_role;
