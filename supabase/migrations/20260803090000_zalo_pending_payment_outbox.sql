create extension if not exists "pgcrypto";

alter table public.orders
  add column if not exists zns_pending_payment_state text,
  add column if not exists zns_pending_payment_attempt_count integer not null default 0,
  add column if not exists zns_pending_payment_last_attempt_at timestamptz,
  add column if not exists zns_pending_payment_next_attempt_at timestamptz,
  add column if not exists zns_pending_payment_lease_token uuid,
  add column if not exists zns_pending_payment_lease_expires_at timestamptz,
  add column if not exists zns_pending_payment_last_error text,
  add column if not exists zns_pending_payment_sent_at timestamptz,
  add column if not exists zns_pending_payment_message_id text;

alter table public.orders
  drop constraint if exists orders_zns_pending_payment_state_check;
alter table public.orders
  add constraint orders_zns_pending_payment_state_check
  check (
    zns_pending_payment_state is null
    or zns_pending_payment_state in ('pending', 'sending', 'retry', 'sent', 'cancelled', 'dead')
  );

alter table public.orders
  drop constraint if exists orders_zns_pending_payment_lease_pair_check;
alter table public.orders
  add constraint orders_zns_pending_payment_lease_pair_check
  check (
    (zns_pending_payment_lease_token is null)
    = (zns_pending_payment_lease_expires_at is null)
  );

alter table public.orders
  drop constraint if exists orders_zns_pending_payment_error_length_check;
alter table public.orders
  add constraint orders_zns_pending_payment_error_length_check
  check (length(coalesce(zns_pending_payment_last_error, '')) <= 800);

alter table public.orders
  drop constraint if exists orders_zns_pending_payment_message_id_length_check;
alter table public.orders
  add constraint orders_zns_pending_payment_message_id_length_check
  check (length(coalesce(zns_pending_payment_message_id, '')) <= 160);

create index if not exists idx_orders_zns_pending_payment_dispatch
  on public.orders(created_at, zns_pending_payment_next_attempt_at)
  where status = 'pending'
    and zns_pending_payment_sent_at is null
    and zns_pending_payment_state is distinct from 'sent';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.zalo_oauth_credentials (
  integration text primary key check (integration = 'zbs'),
  access_token text not null check (length(access_token) between 16 and 4096),
  refresh_token text not null check (length(refresh_token) between 16 and 4096),
  access_expires_at timestamptz not null,
  refresh_lease_token uuid,
  refresh_lease_expires_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  constraint zalo_oauth_refresh_lease_pair_check check (
    (refresh_lease_token is null) = (refresh_lease_expires_at is null)
  )
);

revoke all on table private.zalo_oauth_credentials from public, anon, authenticated;

create or replace function public.claim_pending_payment_zns_orders(
  p_limit integer,
  p_rollout_at timestamptz,
  p_daily_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_day_start timestamptz;
  v_used_today integer;
  v_claim_limit integer;
  v_claimed jsonb;
begin
  if p_limit is null or p_limit not between 1 and 25
     or p_daily_limit is null or p_daily_limit not between 1 and 1000
     or p_rollout_at is null or p_rollout_at > v_now then
    raise exception 'invalid_pending_payment_zns_claim' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('pending-payment-zns-daily-cap', 0));
  v_day_start := date_trunc('day', v_now at time zone 'Asia/Ho_Chi_Minh')
    at time zone 'Asia/Ho_Chi_Minh';

  select count(*)::integer into v_used_today
  from public.orders o
  where o.zns_pending_payment_sent_at >= v_day_start
     or (
       o.zns_pending_payment_state = 'sending'
       and o.zns_pending_payment_last_attempt_at >= v_day_start
       and o.zns_pending_payment_lease_expires_at > v_now
     );

  v_claim_limit := least(p_limit, greatest(0, p_daily_limit - v_used_today));
  if v_claim_limit = 0 then
    return '[]'::jsonb;
  end if;

  with candidates as (
    select o.id
    from public.orders o
    where o.status = 'pending'
      and o.created_at >= p_rollout_at
      and o.created_at <= v_now - interval '5 minutes'
      and o.created_at >= v_now - interval '24 hours'
      and o.zns_pending_payment_sent_at is null
      and o.zns_pending_payment_attempt_count < 3
      and (
        o.zns_pending_payment_state is null
        or (
          o.zns_pending_payment_state in ('pending', 'retry')
          and coalesce(o.zns_pending_payment_next_attempt_at, v_now) <= v_now
        )
        or (
          o.zns_pending_payment_state = 'sending'
          and o.zns_pending_payment_lease_expires_at <= v_now
        )
      )
      and (
        exists (
          select 1
          from unnest(string_to_array(coalesce(o.course_slug, ''), ',')) as raw_slug
          where trim(raw_slug) in ('facebook-ads-2026', 'ebook-facebook-ads-2026')
        )
        or exists (
          select 1
          from jsonb_array_elements(
            case
              when jsonb_typeof(to_jsonb(o.order_items)) = 'array' then to_jsonb(o.order_items)
              else '[]'::jsonb
            end
          ) as item
          where item->>'slug' in ('facebook-ads-2026', 'ebook-facebook-ads-2026')
        )
      )
      and not exists (
        select 1
        from (
          select trim(raw_slug) as slug
          from unnest(string_to_array(coalesce(o.course_slug, ''), ',')) as raw_slug
          union all
          select trim(item->>'slug') as slug
          from jsonb_array_elements(
            case
              when jsonb_typeof(to_jsonb(o.order_items)) = 'array' then to_jsonb(o.order_items)
              else '[]'::jsonb
            end
          ) as item
        ) normalized
        where normalized.slug <> ''
          and normalized.slug not in ('facebook-ads-2026', 'ebook-facebook-ads-2026')
      )
    order by o.created_at asc
    for update skip locked
    limit v_claim_limit
  ), claimed as (
    update public.orders o
    set zns_pending_payment_state = 'sending',
        zns_pending_payment_attempt_count = o.zns_pending_payment_attempt_count + 1,
        zns_pending_payment_last_attempt_at = v_now,
        zns_pending_payment_next_attempt_at = null,
        zns_pending_payment_lease_token = gen_random_uuid(),
        zns_pending_payment_lease_expires_at = v_now + interval '10 minutes',
        zns_pending_payment_last_error = null,
        updated_at = v_now
    from candidates c
    where o.id = c.id
    returning jsonb_build_object(
      'order_code', o.order_code,
      'student_name', o.student_name,
      'phone', o.phone,
      'course_slug', o.course_slug,
      'course_title', o.course_title,
      'amount', o.amount,
      'currency', o.currency,
      'status', o.status,
      'created_at', o.created_at,
      'order_items', o.order_items,
      'zns_pending_payment_attempt_count', o.zns_pending_payment_attempt_count,
      'zns_pending_payment_lease_token', o.zns_pending_payment_lease_token
    ) as payload
  )
  select coalesce(jsonb_agg(payload), '[]'::jsonb)
  into v_claimed
  from claimed;

  return coalesce(v_claimed, '[]'::jsonb);
end;
$$;

create or replace function public.finish_pending_payment_zns_order(
  p_order_code text,
  p_lease_token uuid,
  p_outcome text,
  p_next_attempt_at timestamptz default null,
  p_error text default null,
  p_message_id text default null
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
  if p_order_code is null
     or upper(p_order_code) !~ '^TAM[A-Z0-9]+$'
     or p_lease_token is null
     or p_outcome is null
     or p_outcome not in ('sent', 'retry', 'cancelled', 'dead')
     or (p_outcome = 'retry' and (p_next_attempt_at is null or p_next_attempt_at <= v_now))
     or (p_outcome <> 'retry' and p_next_attempt_at is not null)
     or length(coalesce(p_error, '')) > 800
     or length(coalesce(p_message_id, '')) > 160 then
    raise exception 'invalid_pending_payment_zns_finish' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where order_code = upper(p_order_code)
  for update;

  if v_order.id is null
     or v_order.zns_pending_payment_state <> 'sending'
     or v_order.zns_pending_payment_lease_token is distinct from p_lease_token
     or v_order.zns_pending_payment_lease_expires_at is null
     or v_order.zns_pending_payment_lease_expires_at <= v_now then
    return jsonb_build_object('finish_state', 'lost_lease');
  end if;

  if p_outcome = 'retry' and v_order.zns_pending_payment_attempt_count >= 3 then
    raise exception 'pending_payment_zns_retry_limit_reached' using errcode = '22023';
  end if;

  update public.orders
  set zns_pending_payment_state = p_outcome,
      zns_pending_payment_next_attempt_at = case
        when p_outcome = 'retry' then p_next_attempt_at
        else null
      end,
      zns_pending_payment_last_error = case
        when p_outcome = 'sent' then null
        else nullif(trim(p_error), '')
      end,
      zns_pending_payment_sent_at = case
        when p_outcome = 'sent' then v_now
        else zns_pending_payment_sent_at
      end,
      zns_pending_payment_message_id = case
        when p_outcome = 'sent' then nullif(trim(p_message_id), '')
        else zns_pending_payment_message_id
      end,
      zns_pending_payment_lease_token = null,
      zns_pending_payment_lease_expires_at = null,
      updated_at = v_now
  where id = v_order.id;

  return jsonb_build_object('finish_state', p_outcome);
end;
$$;

create or replace function public.get_zalo_oauth_credentials()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_credentials private.zalo_oauth_credentials%rowtype;
begin
  select * into v_credentials
  from private.zalo_oauth_credentials
  where integration = 'zbs';

  if v_credentials.integration is null then
    return jsonb_build_object('credential_state', 'missing');
  end if;

  return jsonb_build_object(
    'credential_state', 'ready',
    'access_token', v_credentials.access_token,
    'refresh_token', v_credentials.refresh_token,
    'access_expires_at', v_credentials.access_expires_at
  );
end;
$$;

create or replace function public.replace_zalo_oauth_credentials(
  p_access_token text,
  p_refresh_token text,
  p_access_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
begin
  if length(coalesce(trim(p_access_token), '')) not between 16 and 4096
     or length(coalesce(trim(p_refresh_token), '')) not between 16 and 4096
     or p_access_expires_at is null
     or p_access_expires_at <= clock_timestamp() then
    raise exception 'invalid_zalo_oauth_credentials' using errcode = '22023';
  end if;

  insert into private.zalo_oauth_credentials (
    integration,
    access_token,
    refresh_token,
    access_expires_at,
    refresh_lease_token,
    refresh_lease_expires_at,
    updated_at
  ) values (
    'zbs',
    trim(p_access_token),
    trim(p_refresh_token),
    p_access_expires_at,
    null,
    null,
    clock_timestamp()
  )
  on conflict (integration) do update
  set access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      access_expires_at = excluded.access_expires_at,
      refresh_lease_token = null,
      refresh_lease_expires_at = null,
      updated_at = excluded.updated_at;

  return jsonb_build_object('credential_state', 'ready');
end;
$$;

create or replace function public.claim_zalo_oauth_refresh(
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_credentials private.zalo_oauth_credentials%rowtype;
  v_lease_token uuid;
begin
  select * into v_credentials
  from private.zalo_oauth_credentials
  where integration = 'zbs'
  for update;

  if v_credentials.integration is null then
    return jsonb_build_object('refresh_state', 'missing');
  end if;

  if not coalesce(p_force, false)
     and v_credentials.access_expires_at > v_now + interval '5 minutes' then
    return jsonb_build_object(
      'refresh_state', 'fresh',
      'access_token', v_credentials.access_token,
      'access_expires_at', v_credentials.access_expires_at
    );
  end if;

  if v_credentials.refresh_lease_expires_at > v_now then
    return jsonb_build_object('refresh_state', 'busy');
  end if;

  v_lease_token := gen_random_uuid();
  update private.zalo_oauth_credentials
  set refresh_lease_token = v_lease_token,
      refresh_lease_expires_at = v_now + interval '30 seconds',
      updated_at = v_now
  where integration = 'zbs';

  return jsonb_build_object(
    'refresh_state', 'claimed',
    'lease_token', v_lease_token,
    'refresh_token', v_credentials.refresh_token
  );
end;
$$;

create or replace function public.finish_zalo_oauth_refresh(
  p_lease_token uuid,
  p_access_token text,
  p_refresh_token text,
  p_access_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_credentials private.zalo_oauth_credentials%rowtype;
begin
  if p_lease_token is null
     or length(coalesce(trim(p_access_token), '')) not between 16 and 4096
     or length(coalesce(trim(p_refresh_token), '')) not between 16 and 4096
     or p_access_expires_at is null
     or p_access_expires_at <= v_now then
    raise exception 'invalid_zalo_oauth_refresh_finish' using errcode = '22023';
  end if;

  select * into v_credentials
  from private.zalo_oauth_credentials
  where integration = 'zbs'
  for update;

  if v_credentials.integration is null
     or v_credentials.refresh_lease_token is distinct from p_lease_token
     or v_credentials.refresh_lease_expires_at is null
     or v_credentials.refresh_lease_expires_at <= v_now then
    return jsonb_build_object('refresh_state', 'lost_lease');
  end if;

  update private.zalo_oauth_credentials
  set access_token = trim(p_access_token),
      refresh_token = p_refresh_token,
      access_expires_at = p_access_expires_at,
      refresh_lease_token = null,
      refresh_lease_expires_at = null,
      updated_at = v_now
  where integration = 'zbs';

  return jsonb_build_object('refresh_state', 'ready');
end;
$$;

revoke all on function public.claim_pending_payment_zns_orders(integer, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_pending_payment_zns_orders(integer, timestamptz, integer) to service_role;
revoke all on function public.finish_pending_payment_zns_order(text, uuid, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.finish_pending_payment_zns_order(text, uuid, text, timestamptz, text, text) to service_role;
revoke all on function public.get_zalo_oauth_credentials() from public, anon, authenticated;
grant execute on function public.get_zalo_oauth_credentials() to service_role;
revoke all on function public.replace_zalo_oauth_credentials(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.replace_zalo_oauth_credentials(text, text, timestamptz) to service_role;
revoke all on function public.claim_zalo_oauth_refresh(boolean) from public, anon, authenticated;
grant execute on function public.claim_zalo_oauth_refresh(boolean) to service_role;
revoke all on function public.finish_zalo_oauth_refresh(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.finish_zalo_oauth_refresh(uuid, text, text, timestamptz) to service_role;
