-- CRM v2 dashboard RPC: align KPI/funnel/source counts with deduped lead contact rows.
-- Additive only: replaces a server-only read function, no legacy data mutation.

create or replace function public.crm_v2_dashboard_raw()
returns jsonb
language sql
stable
set search_path = public, crm_v2
as $$
  with daily as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.metric_date), '[]'::jsonb) as data
    from (
      select metric_date, new_leads, mql, paid_orders, revenue, email_revenue, active_automation
      from crm_v2.crm_daily_metrics
      where metric_date >= current_date - interval '29 days'
      order by metric_date
    ) row_data
  ),
  ranked_leads as (
    select
      l.id,
      l.contact_id,
      coalesce(l.stage, 'new') as stage,
      l.status,
      coalesce(nullif(l.source, ''), 'unknown') as source,
      l.potential_value,
      l.created_at,
      l.metadata,
      row_number() over (
        partition by coalesce(l.contact_id::text, l.id::text)
        order by crm_v2.lead_stage_rank(l.stage) desc, l.created_at desc
      ) as row_number_for_contact
    from crm_v2.leads l
    where coalesce(l.status, '') <> 'archived'
  ),
  effective_leads as (
    select *
    from ranked_leads
    where row_number_for_contact = 1
  ),
  lead_stages as (
    select coalesce(jsonb_agg(jsonb_build_object('stage', stage, 'count', total) order by stage), '[]'::jsonb) as data
    from (
      select stage, count(*)::int as total
      from effective_leads
      group by stage
    ) row_data
  ),
  lead_sources as (
    select coalesce(jsonb_agg(jsonb_build_object('source', source, 'count', total) order by total desc), '[]'::jsonb) as data
    from (
      select source, count(*)::int as total
      from effective_leads
      where created_at >= now() - interval '29 days'
      group by source
      order by total desc
      limit 8
    ) row_data
  ),
  orders_30 as (
    select id, status, coalesce(net_amount, amount, 0)::numeric as amount, product_name, course_slug, metadata, coalesce(paid_at, created_at) as metric_at
    from crm_v2.orders
    where created_at >= now() - interval '29 days'
  ),
  order_summary as (
    select jsonb_build_object(
      'paid_orders', count(*) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed'))::int,
      'revenue', coalesce(sum(amount) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed')), 0)
    ) as data
    from orders_30
  ),
  course_summary as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.revenue desc), '[]'::jsonb) as data
    from (
      select
        coalesce(nullif(product_name, ''), metadata->>'course_title', nullif(course_slug, ''), 'Legacy order') as name,
        count(*) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed'))::int as paid,
        coalesce(sum(amount) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed')), 0) as revenue
      from orders_30
      group by coalesce(nullif(product_name, ''), metadata->>'course_title', nullif(course_slug, ''), 'Legacy order')
      order by revenue desc
      limit 5
    ) row_data
  ),
  email_events as (
    select coalesce(jsonb_agg(jsonb_build_object('event_type', event_type, 'count', total) order by event_type), '[]'::jsonb) as data
    from (
      select lower(coalesce(event_type, 'unknown')) as event_type, count(*)::int as total
      from crm_v2.email_events
      where occurred_at >= now() - interval '29 days'
      group by lower(coalesce(event_type, 'unknown'))
    ) row_data
  ),
  recent_events as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.occurred_at desc), '[]'::jsonb) as data
    from (
      select id, event_type, event_source, occurred_at, metadata
      from crm_v2.crm_events
      order by occurred_at desc
      limit 10
    ) row_data
  ),
  active_workflows as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.updated_at desc), '[]'::jsonb) as data
    from (
      select id, name, status, updated_at
      from crm_v2.workflows
      where status in ('active', 'published', 'running')
      order by updated_at desc
      limit 5
    ) row_data
  ),
  open_tasks as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.due_at asc nulls last), '[]'::jsonb) as data
    from (
      select title, status, due_at, metadata
      from crm_v2.tasks
      where status in ('open', 'in_progress')
      order by due_at asc nulls last
      limit 5
    ) row_data
  ),
  live_counts as (
    select jsonb_build_object(
      'new_leads_today',
        (
          select count(distinct coalesce(l.contact_id::text, l.id::text))::int
          from crm_v2.leads l
          where coalesce(l.status, '') <> 'archived'
            and l.created_at::date = current_date
            and coalesce(l.metadata->>'source_table', 'public.leads') <> 'public.orders'
        ),
      'mql',
        count(*) filter (where stage in ('consulting', 'high_intent', 'pending_payment', 'paid'))::int
    ) as data
    from effective_leads
  )
  select jsonb_build_object(
    'daily', daily.data,
    'lead_stages', lead_stages.data,
    'lead_sources', lead_sources.data,
    'orders', order_summary.data,
    'email_events', email_events.data,
    'recent_events', recent_events.data,
    'workflows', active_workflows.data,
    'tasks', open_tasks.data,
    'courses', course_summary.data,
    'counts', live_counts.data
  )
  from daily, lead_stages, lead_sources, order_summary, email_events, recent_events, active_workflows, open_tasks, course_summary, live_counts;
$$;

revoke all on function public.crm_v2_dashboard_raw() from public, anon, authenticated;
grant execute on function public.crm_v2_dashboard_raw() to service_role;
