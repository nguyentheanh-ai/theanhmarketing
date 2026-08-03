create extension if not exists "pgcrypto";

alter table public.orders
  add column if not exists meta_purchase_state text,
  add column if not exists meta_purchase_attempt_count integer not null default 0,
  add column if not exists meta_purchase_last_attempt_at timestamptz,
  add column if not exists meta_purchase_next_attempt_at timestamptz,
  add column if not exists meta_purchase_lease_token uuid,
  add column if not exists meta_purchase_lease_expires_at timestamptz,
  add column if not exists meta_purchase_last_error text,
  add column if not exists meta_purchase_sent_at timestamptz,
  add column if not exists meta_purchase_fbtrace_id text;

alter table public.orders
  drop constraint if exists orders_meta_purchase_state_check;
alter table public.orders
  add constraint orders_meta_purchase_state_check
  check (meta_purchase_state is null or meta_purchase_state in ('pending', 'sending', 'retry', 'sent'));

alter table public.orders
  drop constraint if exists orders_meta_purchase_lease_pair_check;
alter table public.orders
  add constraint orders_meta_purchase_lease_pair_check
  check ((meta_purchase_lease_token is null) = (meta_purchase_lease_expires_at is null));

update public.orders
set meta_purchase_state = 'sent',
    meta_purchase_sent_at = coalesce(meta_purchase_sent_at, updated_at, paid_at, created_at),
    meta_purchase_next_attempt_at = null,
    meta_purchase_lease_token = null,
    meta_purchase_lease_expires_at = null
where purchase_event_sent is true
  and meta_purchase_state is distinct from 'sent';

update public.orders
set meta_purchase_state = 'pending',
    meta_purchase_next_attempt_at = coalesce(meta_purchase_next_attempt_at, clock_timestamp())
where status = 'paid'
  and coalesce(purchase_event_sent, false) is false
  and paid_at >= clock_timestamp() - interval '7 days'
  and meta_purchase_state is null;

create index if not exists idx_orders_meta_purchase_dispatch
  on public.orders(meta_purchase_next_attempt_at, paid_at)
  where status = 'paid'
    and coalesce(purchase_event_sent, false) is false
    and meta_purchase_state in ('pending', 'retry', 'sending');

create or replace function public.claim_meta_purchase_orders(
  p_limit integer default 10,
  p_order_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_claimed jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 25
     or (p_order_code is not null and (length(p_order_code) not between 1 and 120
       or upper(p_order_code) !~ '^TAM[A-Z0-9]+$')) then
    raise exception 'invalid_meta_purchase_claim' using errcode = '22023';
  end if;

  with candidates as (
    select o.id
    from public.orders o
    where o.status = 'paid'
      and coalesce(o.purchase_event_sent, false) is false
      and o.paid_at >= clock_timestamp() - interval '7 days'
      and (p_order_code is null or o.order_code = upper(p_order_code))
      and (
        o.meta_purchase_state is null
        or (
          o.meta_purchase_state in ('pending', 'retry')
          and coalesce(o.meta_purchase_next_attempt_at, v_now) <= v_now
        )
        or (
          o.meta_purchase_state = 'sending'
          and o.meta_purchase_lease_expires_at <= v_now
        )
      )
    order by o.paid_at asc
    for update skip locked
    limit p_limit
  ), claimed as (
    update public.orders o
    set meta_purchase_state = 'sending',
        meta_purchase_attempt_count = coalesce(o.meta_purchase_attempt_count, 0) + 1,
        meta_purchase_last_attempt_at = v_now,
        meta_purchase_next_attempt_at = null,
        meta_purchase_lease_token = gen_random_uuid(),
        meta_purchase_lease_expires_at = v_now + interval '5 minutes',
        updated_at = v_now
    from candidates c
    where o.id = c.id
    returning jsonb_build_object(
      'id', o.id,
      'order_code', o.order_code,
      'student_name', o.student_name,
      'email', o.email,
      'phone', o.phone,
      'course_slug', o.course_slug,
      'course_title', o.course_title,
      'amount', o.amount,
      'currency', o.currency,
      'status', o.status,
      'paid_at', o.paid_at,
      'order_items', o.order_items,
      'utm_source', o.utm_source,
      'utm_medium', o.utm_medium,
      'utm_campaign', o.utm_campaign,
      'utm_content', o.utm_content,
      'utm_id', o.utm_id,
      'utm_term', o.utm_term,
      'campaign_id', o.campaign_id,
      'campaign_name', o.campaign_name,
      'adset_id', o.adset_id,
      'ad_id', o.ad_id,
      'ad_name', o.ad_name,
      'fbclid', o.fbclid,
      'fbc', o.fbc,
      'fbp', o.fbp,
      'landing_page', o.landing_page,
      'meta_purchase_attempt_count', o.meta_purchase_attempt_count,
      'meta_purchase_lease_token', o.meta_purchase_lease_token
    ) as payload
  )
  select coalesce(jsonb_agg(payload), '[]'::jsonb) into v_claimed from claimed;

  return coalesce(v_claimed, '[]'::jsonb);
end;
$$;

create or replace function public.finish_meta_purchase_order(
  p_order_code text,
  p_lease_token uuid,
  p_succeeded boolean,
  p_next_attempt_at timestamptz default null,
  p_error text default null,
  p_fbtrace_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_order public.orders%rowtype;
begin
  if p_order_code is null or upper(p_order_code) !~ '^TAM[A-Z0-9]+$'
     or p_lease_token is null or p_succeeded is null
     or (not p_succeeded and (p_next_attempt_at is null or p_next_attempt_at <= v_now))
     or length(coalesce(p_error, '')) > 800
     or length(coalesce(p_fbtrace_id, '')) > 160 then
    raise exception 'invalid_meta_purchase_finish' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where order_code = upper(p_order_code)
  for update;

  if v_order.id is null
     or v_order.meta_purchase_state <> 'sending'
     or v_order.meta_purchase_lease_token is distinct from p_lease_token
     or v_order.meta_purchase_lease_expires_at is null
     or v_order.meta_purchase_lease_expires_at <= v_now then
    return jsonb_build_object('finish_state', 'lost_lease');
  end if;

  update public.orders
  set purchase_event_sent = p_succeeded,
      meta_purchase_state = case when p_succeeded then 'sent' else 'retry' end,
      meta_purchase_next_attempt_at = case when p_succeeded then null else p_next_attempt_at end,
      meta_purchase_last_error = case when p_succeeded then null else nullif(trim(p_error), '') end,
      meta_purchase_sent_at = case when p_succeeded then v_now else meta_purchase_sent_at end,
      meta_purchase_fbtrace_id = case when p_succeeded then nullif(trim(p_fbtrace_id), '') else meta_purchase_fbtrace_id end,
      meta_purchase_lease_token = null,
      meta_purchase_lease_expires_at = null,
      updated_at = v_now
  where id = v_order.id;

  return jsonb_build_object('finish_state', case when p_succeeded then 'sent' else 'retry' end);
end;
$$;

revoke all on function public.claim_meta_purchase_orders(integer, text) from public, anon, authenticated;
grant execute on function public.claim_meta_purchase_orders(integer, text) to service_role;
revoke all on function public.finish_meta_purchase_order(text, uuid, boolean, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.finish_meta_purchase_order(text, uuid, boolean, timestamptz, text, text) to service_role;
