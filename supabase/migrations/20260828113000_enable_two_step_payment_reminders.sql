-- Replace the retired seven-email sequence with two payment reminders.
-- This migration intentionally seeds only orders inserted after the trigger is installed.

do $block$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'payment-remarketing-send-due'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$block$;

delete from public.payment_remarketing_runs where status <> 'sent';

alter table public.payment_remarketing_runs
  drop constraint if exists payment_remarketing_runs_sequence_index_check,
  drop constraint if exists payment_remarketing_runs_product_key_check,
  drop constraint if exists payment_remarketing_runs_status_check;

alter table public.payment_remarketing_runs
  add constraint payment_remarketing_runs_sequence_index_check check (sequence_index between 1 and 2),
  add constraint payment_remarketing_runs_product_key_check check (
    product_key in ('facebook_ads_2026', 'ebook_facebook_ads_2026', 'pending_order')
  ),
  add constraint payment_remarketing_runs_status_check check (
    status in ('queued', 'sending', 'retry', 'sent', 'cancelled')
  );

create or replace function public.seed_payment_remarketing_runs(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_order public.orders%rowtype;
begin
  select o.* into v_order
  from public.orders o
  where o.id = p_order_id
    and o.status = 'pending'
    and coalesce(trim(o.email), '') <> '';

  if v_order.id is null then
    return;
  end if;

  insert into public.payment_remarketing_runs (
    order_id, sequence_index, product_key, due_at, status
  ) values (
    v_order.id, 1, 'pending_order', v_order.created_at + interval '10 minutes', 'queued'
  )
  on conflict (order_id, sequence_index) do nothing;
end;
$function$;

create or replace function public.seed_payment_remarketing_runs_on_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  perform public.seed_payment_remarketing_runs(new.id);
  return new;
end;
$function$;

drop trigger if exists payment_remarketing_runs_after_order_insert on public.orders;
create trigger payment_remarketing_runs_after_order_insert
after insert on public.orders
for each row execute function public.seed_payment_remarketing_runs_on_order();

create or replace function public.cancel_payment_remarketing_runs_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  if new.status <> 'pending' then
    update public.payment_remarketing_runs
    set status = 'cancelled',
        lease_token = null,
        lease_expires_at = null,
        next_attempt_at = null,
        last_error = 'Order is no longer pending',
        updated_at = clock_timestamp()
    where order_id = new.id
      and status in ('queued', 'retry', 'sending');
  end if;
  return new;
end;
$function$;

drop trigger if exists payment_remarketing_runs_after_order_status_update on public.orders;
create trigger payment_remarketing_runs_after_order_status_update
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.cancel_payment_remarketing_runs_on_order_status();

create or replace function public.claim_due_payment_remarketing_runs(p_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_local_time time := (v_now at time zone 'Asia/Ho_Chi_Minh')::time;
  v_claimed jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 25 then
    raise exception 'invalid_payment_remarketing_claim' using errcode = '22023';
  end if;

  with candidates as (
    select r.id
    from public.payment_remarketing_runs r
    join public.orders o on o.id = r.order_id
    where o.status = 'pending'
      and coalesce(trim(o.email), '') <> ''
      and r.due_at <= v_now
      and (
        (r.status in ('queued', 'retry') and coalesce(r.next_attempt_at, r.due_at) <= v_now)
        or (r.status = 'sending' and r.lease_expires_at <= v_now)
      )
      and (
        r.sequence_index = 1
        or (
          r.sequence_index = 2
          and v_local_time >= time '09:00'
          and v_local_time < time '21:00'
          and exists (
            select 1
            from public.payment_remarketing_runs previous_run
            where previous_run.order_id = r.order_id
              and previous_run.sequence_index = 1
              and previous_run.status = 'sent'
          )
        )
      )
    order by r.due_at asc, r.id asc
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.payment_remarketing_runs r
    set status = 'sending',
        attempt_count = r.attempt_count + 1,
        next_attempt_at = null,
        lease_token = extensions.gen_random_uuid(),
        lease_expires_at = v_now + interval '10 minutes',
        updated_at = v_now
    from candidates c
    where r.id = c.id
    returning r.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'run_id', c.id,
    'order_id', c.order_id,
    'order_code', o.order_code,
    'sequence_index', c.sequence_index,
    'lease_token', c.lease_token
  ) order by c.due_at, c.id), '[]'::jsonb)
  into v_claimed
  from claimed c
  join public.orders o on o.id = c.order_id;

  return v_claimed;
end;
$function$;

create or replace function public.finish_payment_remarketing_run(
  p_run_id uuid,
  p_lease_token uuid,
  p_succeeded boolean,
  p_resend_email_id text default null,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_run public.payment_remarketing_runs%rowtype;
begin
  if p_run_id is null or p_lease_token is null or p_succeeded is null
    or length(coalesce(p_resend_email_id, '')) > 160
    or length(coalesce(p_error, '')) > 800 then
    raise exception 'invalid_payment_remarketing_finish' using errcode = '22023';
  end if;

  select * into v_run
  from public.payment_remarketing_runs
  where id = p_run_id
  for update;

  if v_run.id is null
    or v_run.status <> 'sending'
    or v_run.lease_token is distinct from p_lease_token
    or v_run.lease_expires_at is null
    or v_run.lease_expires_at <= v_now then
    return jsonb_build_object('finish_state', 'lost_lease');
  end if;

  update public.payment_remarketing_runs
  set status = case when p_succeeded then 'sent' else 'retry' end,
      resend_email_id = case when p_succeeded then nullif(trim(p_resend_email_id), '') else resend_email_id end,
      sent_at = case when p_succeeded then v_now else sent_at end,
      next_attempt_at = case when p_succeeded then null else v_now + interval '1 hour' end,
      last_error = case when p_succeeded then null else nullif(trim(p_error), '') end,
      lease_token = null,
      lease_expires_at = null,
      updated_at = v_now
  where id = v_run.id;

  if p_succeeded and v_run.sequence_index = 1 then
    insert into public.payment_remarketing_runs (
      order_id, sequence_index, product_key, due_at, status
    ) values (
      v_run.order_id, 2, 'pending_order', v_now + interval '4 hours', 'queued'
    )
    on conflict (order_id, sequence_index) do nothing;
  end if;

  return jsonb_build_object('finish_state', case when p_succeeded then 'sent' else 'retry' end);
end;
$function$;

create or replace function public.cancel_payment_remarketing_run(
  p_run_id uuid,
  p_lease_token uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_updated uuid;
begin
  if p_run_id is null or p_lease_token is null or length(coalesce(p_reason, '')) > 800 then
    raise exception 'invalid_payment_remarketing_cancel' using errcode = '22023';
  end if;

  update public.payment_remarketing_runs
  set status = 'cancelled',
      lease_token = null,
      lease_expires_at = null,
      next_attempt_at = null,
      last_error = nullif(trim(p_reason), ''),
      updated_at = clock_timestamp()
  where id = p_run_id
    and status = 'sending'
    and lease_token = p_lease_token
  returning id into v_updated;

  return jsonb_build_object('finish_state', case when v_updated is null then 'lost_lease' else 'cancelled' end);
end;
$function$;

revoke all on function public.seed_payment_remarketing_runs(uuid) from public, anon, authenticated;
revoke all on function public.claim_due_payment_remarketing_runs(integer) from public, anon, authenticated;
grant execute on function public.claim_due_payment_remarketing_runs(integer) to service_role;
revoke all on function public.finish_payment_remarketing_run(uuid, uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.finish_payment_remarketing_run(uuid, uuid, boolean, text, text) to service_role;
revoke all on function public.cancel_payment_remarketing_run(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_payment_remarketing_run(uuid, uuid, text) to service_role;
