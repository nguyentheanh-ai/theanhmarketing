-- CRM v2 live data alignment.
-- Additive/idempotent only: keeps legacy public tables untouched and repairs CRM v2 read models.

alter table crm_v2.leads add column if not exists course_slug text;
alter table crm_v2.orders add column if not exists course_slug text;
alter table crm_v2.enrollments add column if not exists course_slug text;

create index if not exists idx_crm_v2_leads_course_slug on crm_v2.leads(course_slug);
create index if not exists idx_crm_v2_orders_course_slug on crm_v2.orders(course_slug);
create index if not exists idx_crm_v2_enrollments_course_slug on crm_v2.enrollments(course_slug);

update crm_v2.leads
set course_slug = nullif(metadata->>'course_slug', ''),
    updated_at = now()
where course_slug is null
  and nullif(metadata->>'course_slug', '') is not null;

update crm_v2.orders
set course_slug = nullif(metadata->>'course_slug', ''),
    updated_at = now()
where course_slug is null
  and nullif(metadata->>'course_slug', '') is not null;

update crm_v2.enrollments
set course_slug = nullif(metadata->>'course_slug', ''),
    updated_at = now()
where course_slug is null
  and nullif(metadata->>'course_slug', '') is not null;

with lead_sources as (
  select
    l.id,
    l.stage as previous_stage,
    lower(coalesce(l.metadata->>'source_table', '')) as source_table,
    lower(coalesce(l.metadata->>'source_status', '')) as source_status,
    lower(coalesce(l.metadata->>'payment_status', '')) as payment_status,
    lower(coalesce(l.metadata->>'lead_status', '')) as lead_status,
    lower(coalesce(l.metadata->>'sale_status', '')) as sale_status,
    exists (
      select 1
      from crm_v2.legacy_id_map map
      join public.leads legacy_lead
        on legacy_lead.id::text = map.source_id
      where map.source_table = 'public.leads'
        and map.target_table = 'crm_v2.leads'
        and map.target_id = l.id
        and legacy_lead.deleted_at is not null
    ) as is_deleted_legacy_lead
  from crm_v2.leads l
),
normalized as (
  select
    id,
    previous_stage,
    is_deleted_legacy_lead,
    case
      when is_deleted_legacy_lead then 'disqualified'
      when payment_status in ('paid', 'success', 'completed') or source_status in ('paid', 'success', 'completed') then 'paid'
      when source_table = 'public.orders' and source_status in ('pending', 'waiting') then 'pending_payment'
      when source_table = 'public.orders' and source_status in ('expired', 'failed', 'cancelled', 'canceled') then 'disqualified'
      when sale_status ilike '%chưa liên hệ%' or sale_status ilike '%chua lien he%' then 'not_contacted'
      when sale_status ilike '%đã liên hệ%' or sale_status ilike '%da lien he%' or sale_status ilike '%đang tư vấn%' or sale_status ilike '%dang tu van%' then 'consulting'
      when sale_status ilike '%quan tâm cao%' or sale_status ilike '%quan tam cao%' then 'high_intent'
      when sale_status ilike '%không%' or sale_status ilike '%khong%' or sale_status ilike '%k nhu cầu%' or sale_status ilike '%k nhu cau%' or sale_status ilike '%lost%' then 'disqualified'
      when lead_status in ('paid', 'won') then 'paid'
      else 'new'
    end as next_stage
  from lead_sources
)
update crm_v2.leads l
set stage = n.next_stage,
    status = case
      when n.is_deleted_legacy_lead then 'archived'
      when n.next_stage = 'paid' then 'won'
      when n.next_stage = 'disqualified' then 'lost'
      else 'open'
    end,
    metadata = coalesce(l.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'legacy_stage', coalesce(l.metadata->>'legacy_stage', n.previous_stage),
        'crm_v2_alignment', '20260616-live-data-alignment'
      ),
    updated_at = now()
from normalized n
where l.id = n.id
  and (
    l.stage is distinct from n.next_stage
    or l.status is distinct from case
      when n.is_deleted_legacy_lead then 'archived'
      when n.next_stage = 'paid' then 'won'
      when n.next_stage = 'disqualified' then 'lost'
      else 'open'
    end
  );

insert into crm_v2.crm_daily_metrics (
  metric_date,
  new_leads,
  mql,
  paid_orders,
  revenue,
  email_revenue,
  active_automation,
  metadata,
  updated_at
)
select
  day::date as metric_date,
  coalesce(leads.new_leads, 0)::integer as new_leads,
  coalesce(leads.mql, 0)::integer as mql,
  coalesce(orders.paid_orders, 0)::integer as paid_orders,
  coalesce(orders.revenue, 0)::numeric as revenue,
  0::numeric as email_revenue,
  0::integer as active_automation,
  jsonb_build_object('source', '20260616-live-data-alignment'),
  now()
from generate_series(current_date - interval '29 days', current_date, interval '1 day') as day
left join (
  select
    created_at::date as metric_date,
    count(*) filter (
      where status <> 'archived'
        and coalesce(metadata->>'source_table', 'public.leads') <> 'public.orders'
    ) as new_leads,
    count(*) filter (where stage in ('consulting', 'high_intent', 'pending_payment', 'paid')) as mql
  from crm_v2.leads
  where created_at >= current_date - interval '29 days'
  group by created_at::date
) leads on leads.metric_date = day::date
left join (
  select
    coalesce(paid_at, created_at)::date as metric_date,
    count(*) filter (where lower(status) in ('paid', 'success', 'completed')) as paid_orders,
    sum(coalesce(net_amount, amount, 0)) filter (where lower(status) in ('paid', 'success', 'completed')) as revenue
  from crm_v2.orders
  where coalesce(paid_at, created_at) >= current_date - interval '29 days'
  group by coalesce(paid_at, created_at)::date
) orders on orders.metric_date = day::date
on conflict (metric_date) do update
set new_leads = excluded.new_leads,
    mql = excluded.mql,
    paid_orders = excluded.paid_orders,
    revenue = excluded.revenue,
    email_revenue = excluded.email_revenue,
    active_automation = excluded.active_automation,
    metadata = excluded.metadata,
    updated_at = now();

insert into crm_v2.crm_pipeline_metrics (
  metric_date,
  stage,
  lead_count,
  potential_value,
  won_count,
  lost_count,
  metadata,
  updated_at
)
select
  current_date,
  stage,
  count(*)::integer,
  sum(coalesce(potential_value, 0)),
  count(*) filter (where stage = 'paid')::integer,
  count(*) filter (where stage = 'disqualified')::integer,
  jsonb_build_object('source', '20260616-live-data-alignment'),
  now()
from crm_v2.leads
where status <> 'archived'
group by stage
on conflict (metric_date, stage) do update
set lead_count = excluded.lead_count,
    potential_value = excluded.potential_value,
    won_count = excluded.won_count,
    lost_count = excluded.lost_count,
    metadata = excluded.metadata,
    updated_at = now();
