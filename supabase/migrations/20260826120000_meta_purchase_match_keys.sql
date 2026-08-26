alter table public.orders
  add column if not exists ip_address text,
  add column if not exists user_agent text;

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
      'ip_address', o.ip_address,
      'user_agent', o.user_agent,
      'meta_purchase_attempt_count', o.meta_purchase_attempt_count,
      'meta_purchase_lease_token', o.meta_purchase_lease_token
    ) as payload
  )
  select coalesce(jsonb_agg(payload), '[]'::jsonb) into v_claimed from claimed;

  return coalesce(v_claimed, '[]'::jsonb);
end;
$$;

revoke all on function public.claim_meta_purchase_orders(integer, text) from public, anon, authenticated;
grant execute on function public.claim_meta_purchase_orders(integer, text) to service_role;
