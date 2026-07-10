-- CRM v2 range-aware server-only read RPCs.
-- Additive only: creates overloaded RPC signatures, no legacy public data mutation.

create or replace function public.crm_v2_dashboard_raw(
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language sql
stable
set search_path = public, crm_v2
as $$
  with params as (
    select
      coalesce(p_date_from, current_date - interval '29 days')::date as date_from,
      coalesce(p_date_to, current_date)::date as date_to
  ),
  daily as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.metric_date), '[]'::jsonb) as data
    from (
      select metric_date, new_leads, mql, paid_orders, revenue, email_revenue, active_automation
      from crm_v2.crm_daily_metrics, params
      where metric_date between params.date_from and params.date_to
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
      from effective_leads, params
      where created_at::date between params.date_from and params.date_to
      group by source
      order by total desc
      limit 8
    ) row_data
  ),
  orders_in_range as (
    select id, status, coalesce(net_amount, amount, 0)::numeric as amount, product_name, course_slug, metadata, coalesce(paid_at, created_at) as metric_at
    from crm_v2.orders, params
    where created_at::date between params.date_from and params.date_to
  ),
  order_summary as (
    select jsonb_build_object(
      'paid_orders', count(*) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed'))::int,
      'revenue', coalesce(sum(amount) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed')), 0)
    ) as data
    from orders_in_range
  ),
  course_summary as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.revenue desc), '[]'::jsonb) as data
    from (
      select
        coalesce(nullif(product_name, ''), metadata->>'course_title', nullif(course_slug, ''), 'Legacy order') as name,
        count(*) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed'))::int as paid,
        coalesce(sum(amount) filter (where lower(coalesce(status, '')) in ('paid', 'success', 'completed')), 0) as revenue
      from orders_in_range
      group by coalesce(nullif(product_name, ''), metadata->>'course_title', nullif(course_slug, ''), 'Legacy order')
      order by revenue desc
      limit 5
    ) row_data
  ),
  email_events as (
    select coalesce(jsonb_agg(jsonb_build_object('event_type', event_type, 'count', total) order by event_type), '[]'::jsonb) as data
    from (
      select lower(coalesce(event_type, 'unknown')) as event_type, count(*)::int as total
      from crm_v2.email_events, params
      where occurred_at::date between params.date_from and params.date_to
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

create or replace function public.crm_v2_leads_list_raw(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default '',
  p_sort_by text default 'createdAt',
  p_sort_direction text default 'desc',
  p_filters jsonb default '{}'::jsonb,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language sql
stable
set search_path = public, crm_v2
as $$
  with params as (
    select
      greatest(1, coalesce(p_page, 1)) as page_number,
      greatest(1, least(coalesce(p_page_size, 20), 50)) as page_size,
      lower(trim(coalesce(p_search, ''))) as search_term,
      coalesce(p_sort_by, 'createdAt') as sort_by,
      lower(coalesce(p_sort_direction, 'desc')) as sort_direction,
      coalesce(p_filters, '{}'::jsonb) as filters,
      coalesce(p_date_from, current_date - interval '29 days')::date as date_from,
      coalesce(p_date_to, current_date)::date as date_to
  ),
  base as (
    select
      l.id, l.contact_id, l.stage, l.status, l.source, l.lead_score, l.email_status,
      l.potential_value, l.next_action, l.last_touch_at, l.metadata, l.course_id, l.course_slug,
      l.owner_id, l.created_at,
      c.full_name, c.email, c.phone, c.metadata as contact_metadata,
      max(coalesce(l.lead_score, 0)) over (partition by coalesce(l.contact_id::text, l.id::text)) as effective_lead_score,
      max(coalesce(l.potential_value, 0)) over (partition by coalesce(l.contact_id::text, l.id::text)) as effective_potential_value,
      max(coalesce(l.last_touch_at, l.created_at)) over (partition by coalesce(l.contact_id::text, l.id::text)) as effective_last_touch_at
    from crm_v2.leads l
    left join crm_v2.contacts c on c.id = l.contact_id
    cross join params p
    where coalesce(l.status, '') <> 'archived'
      and l.created_at::date between p.date_from and p.date_to
      and (coalesce(p.filters->>'source', '') = '' or l.source = p.filters->>'source')
      and (coalesce(p.filters->>'owner', '') = '' or l.owner_id::text = p.filters->>'owner')
      and (coalesce(p.filters->>'course', '') = '' or l.course_slug = p.filters->>'course')
      and (
        p.search_term = ''
        or lower(coalesce(c.full_name, '')) like '%' || p.search_term || '%'
        or lower(coalesce(c.email, '')) like '%' || p.search_term || '%'
        or lower(coalesce(c.phone, '')) like '%' || p.search_term || '%'
        or lower(coalesce(l.source, '')) like '%' || p.search_term || '%'
        or lower(coalesce(l.course_slug, '')) like '%' || p.search_term || '%'
        or lower(coalesce(l.metadata->>'course_title', '')) like '%' || p.search_term || '%'
      )
  ),
  ranked as (
    select
      base.*,
      row_number() over (
        partition by coalesce(base.contact_id::text, base.id::text)
        order by crm_v2.lead_stage_rank(base.stage) desc, base.created_at desc
      ) as row_number_for_contact
    from base
  ),
  chosen as (
    select ranked.*
    from ranked
    cross join params p
    where ranked.row_number_for_contact = 1
      and (coalesce(p.filters->>'stage', '') = '' or ranked.stage = p.filters->>'stage')
      and (coalesce(p.filters->>'status', '') = '' or ranked.status = p.filters->>'status')
  ),
  paged as (
    select chosen.*
    from chosen
    cross join params p
    order by
      case when p.sort_by = 'leadScore' and p.sort_direction = 'asc' then chosen.effective_lead_score end asc nulls last,
      case when p.sort_by = 'leadScore' and p.sort_direction <> 'asc' then chosen.effective_lead_score end desc nulls last,
      case when p.sort_by <> 'leadScore' and p.sort_direction = 'asc' then chosen.created_at end asc nulls last,
      case when p.sort_by <> 'leadScore' and p.sort_direction <> 'asc' then chosen.created_at end desc nulls last
    limit (select page_size from params)
    offset ((select page_number - 1 from params) * (select page_size from params))
  )
  select jsonb_build_object(
    'total', (select count(*)::int from chosen),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'contact_id', contact_id,
      'stage', stage,
      'status', status,
      'source', source,
      'lead_score', effective_lead_score,
      'email_status', email_status,
      'potential_value', effective_potential_value,
      'next_action', next_action,
      'last_touch_at', effective_last_touch_at,
      'metadata', metadata,
      'course_id', course_id,
      'course_slug', course_slug,
      'owner_id', owner_id,
      'created_at', created_at,
      'contact', jsonb_build_object('full_name', full_name, 'email', email, 'phone', phone, 'metadata', contact_metadata)
    )), '[]'::jsonb)
  )
  from paged;
$$;

create or replace function public.crm_v2_orders_list_raw(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default '',
  p_sort_by text default 'created',
  p_sort_direction text default 'desc',
  p_filters jsonb default '{}'::jsonb,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language sql
stable
set search_path = public, crm_v2
as $$
  with params as (
    select
      greatest(1, coalesce(p_page, 1)) as page_number,
      greatest(1, least(coalesce(p_page_size, 20), 50)) as page_size,
      lower(trim(coalesce(p_search, ''))) as search_term,
      coalesce(p_sort_by, 'created') as sort_by,
      lower(coalesce(p_sort_direction, 'desc')) as sort_direction,
      coalesce(p_filters, '{}'::jsonb) as filters,
      coalesce(p_date_from, current_date - interval '29 days')::date as date_from,
      coalesce(p_date_to, current_date)::date as date_to
  ),
  filtered as (
    select
      o.id, o.contact_id, o.order_code, o.product_name, o.amount, o.discount_amount,
      o.net_amount, o.currency, o.status, o.payment_gateway, o.source, o.owner_id,
      o.due_at, o.created_at, o.course_slug, o.metadata,
      c.full_name, c.email, c.phone
    from crm_v2.orders o
    left join crm_v2.contacts c on c.id = o.contact_id
    cross join params p
    where o.created_at::date between p.date_from and p.date_to
      and (coalesce(p.filters->>'status', '') = '' or o.status = p.filters->>'status')
      and (coalesce(p.filters->>'source', '') = '' or o.source = p.filters->>'source')
      and (coalesce(p.filters->>'owner', '') = '' or o.owner_id::text = p.filters->>'owner')
      and (coalesce(p.filters->>'course', '') = '' or o.course_slug = p.filters->>'course')
      and (
        p.search_term = ''
        or lower(coalesce(o.order_code, '')) like '%' || p.search_term || '%'
        or lower(coalesce(o.product_name, '')) like '%' || p.search_term || '%'
        or lower(coalesce(o.status, '')) like '%' || p.search_term || '%'
        or lower(coalesce(o.source, '')) like '%' || p.search_term || '%'
        or lower(coalesce(o.course_slug, '')) like '%' || p.search_term || '%'
        or lower(coalesce(c.full_name, '')) like '%' || p.search_term || '%'
        or lower(coalesce(c.email, '')) like '%' || p.search_term || '%'
        or lower(coalesce(c.phone, '')) like '%' || p.search_term || '%'
      )
  ),
  paged as (
    select filtered.*
    from filtered
    cross join params p
    order by
      case when p.sort_by = 'value' and p.sort_direction = 'asc' then coalesce(filtered.net_amount, filtered.amount, 0) end asc nulls last,
      case when p.sort_by = 'value' and p.sort_direction <> 'asc' then coalesce(filtered.net_amount, filtered.amount, 0) end desc nulls last,
      case when p.sort_by <> 'value' and p.sort_direction = 'asc' then filtered.created_at end asc nulls last,
      case when p.sort_by <> 'value' and p.sort_direction <> 'asc' then filtered.created_at end desc nulls last
    limit (select page_size from params)
    offset ((select page_number - 1 from params) * (select page_size from params))
  )
  select jsonb_build_object(
    'total', (select count(*)::int from filtered),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'contact_id', contact_id,
      'order_code', order_code,
      'product_name', product_name,
      'amount', amount,
      'discount_amount', discount_amount,
      'net_amount', net_amount,
      'currency', currency,
      'status', status,
      'payment_gateway', payment_gateway,
      'source', source,
      'owner_id', owner_id,
      'due_at', due_at,
      'created_at', created_at,
      'course_slug', course_slug,
      'metadata', metadata,
      'contact', jsonb_build_object('full_name', full_name, 'email', email, 'phone', phone)
    )), '[]'::jsonb)
  )
  from paged;
$$;

create or replace function public.crm_v2_students_list_raw(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default '',
  p_sort_by text default 'lastLearned',
  p_sort_direction text default 'desc',
  p_filters jsonb default '{}'::jsonb,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language sql
stable
set search_path = public, crm_v2
as $$
  with params as (
    select
      greatest(1, coalesce(p_page, 1)) as page_number,
      greatest(1, least(coalesce(p_page_size, 20), 50)) as page_size,
      lower(trim(coalesce(p_search, ''))) as search_term,
      lower(coalesce(p_sort_direction, 'desc')) as sort_direction,
      coalesce(p_filters, '{}'::jsonb) as filters,
      coalesce(p_date_from, current_date - interval '29 days')::date as date_from,
      coalesce(p_date_to, current_date)::date as date_to
  ),
  filtered as (
    select
      e.id, e.contact_id, e.course_id, e.course_slug, e.order_id, e.status, e.activated_at,
      e.last_seen_at, e.owner_id, e.metadata, e.created_at,
      c.full_name, c.email, c.phone,
      o.product_name, o.order_code
    from crm_v2.enrollments e
    left join crm_v2.contacts c on c.id = e.contact_id
    left join crm_v2.orders o on o.id = e.order_id
    cross join params p
    where e.created_at::date between p.date_from and p.date_to
      and (coalesce(p.filters->>'status', '') = '' or e.status = p.filters->>'status')
      and (coalesce(p.filters->>'owner', '') = '' or e.owner_id::text = p.filters->>'owner')
      and (coalesce(p.filters->>'course', '') = '' or e.course_slug = p.filters->>'course')
      and (
        p.search_term = ''
        or lower(coalesce(c.full_name, '')) like '%' || p.search_term || '%'
        or lower(coalesce(c.email, '')) like '%' || p.search_term || '%'
        or lower(coalesce(c.phone, '')) like '%' || p.search_term || '%'
        or lower(coalesce(e.course_slug, '')) like '%' || p.search_term || '%'
        or lower(coalesce(e.status, '')) like '%' || p.search_term || '%'
        or lower(coalesce(o.product_name, '')) like '%' || p.search_term || '%'
      )
  ),
  paged as (
    select filtered.*
    from filtered
    cross join params p
    order by
      case when p.sort_direction = 'asc' then coalesce(filtered.last_seen_at, filtered.created_at) end asc nulls last,
      case when p.sort_direction <> 'asc' then coalesce(filtered.last_seen_at, filtered.created_at) end desc nulls last
    limit (select page_size from params)
    offset ((select page_number - 1 from params) * (select page_size from params))
  )
  select jsonb_build_object(
    'total', (select count(*)::int from filtered),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'contact_id', contact_id,
      'course_id', course_id,
      'course_slug', course_slug,
      'order_id', order_id,
      'status', status,
      'activated_at', activated_at,
      'last_seen_at', last_seen_at,
      'owner_id', owner_id,
      'metadata', metadata,
      'created_at', created_at,
      'contact', jsonb_build_object('full_name', full_name, 'email', email, 'phone', phone),
      'order', jsonb_build_object('product_name', product_name, 'order_code', order_code)
    )), '[]'::jsonb)
  )
  from paged;
$$;

revoke all on function public.crm_v2_dashboard_raw(date, date) from public, anon, authenticated;
revoke all on function public.crm_v2_leads_list_raw(integer, integer, text, text, text, jsonb, date, date) from public, anon, authenticated;
revoke all on function public.crm_v2_orders_list_raw(integer, integer, text, text, text, jsonb, date, date) from public, anon, authenticated;
revoke all on function public.crm_v2_students_list_raw(integer, integer, text, text, text, jsonb, date, date) from public, anon, authenticated;

grant execute on function public.crm_v2_dashboard_raw(date, date) to service_role;
grant execute on function public.crm_v2_leads_list_raw(integer, integer, text, text, text, jsonb, date, date) to service_role;
grant execute on function public.crm_v2_orders_list_raw(integer, integer, text, text, text, jsonb, date, date) to service_role;
grant execute on function public.crm_v2_students_list_raw(integer, integer, text, text, text, jsonb, date, date) to service_role;
