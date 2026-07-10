-- CRM v2 lead read RPC: one operational row per contact.
-- Additive only: replaces server-only read functions, no legacy data mutation.

create or replace function crm_v2.lead_stage_rank(p_stage text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(p_stage, 'new'))
    when 'paid' then 70
    when 'pending_payment' then 60
    when 'disqualified' then 50
    when 'high_intent' then 40
    when 'consulting' then 30
    when 'not_contacted' then 20
    when 'new' then 10
    else 0
  end;
$$;

grant execute on function crm_v2.lead_stage_rank(text) to service_role;

create or replace function public.crm_v2_stage_counts_raw()
returns jsonb
language sql
stable
set search_path = public, crm_v2
as $$
  with ranked as (
    select
      l.stage,
      row_number() over (
        partition by coalesce(l.contact_id::text, l.id::text)
        order by crm_v2.lead_stage_rank(l.stage) desc, l.created_at desc
      ) as row_number_for_contact
    from crm_v2.leads l
    where coalesce(l.status, '') <> 'archived'
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('stage', stage, 'count', total) order by stage),
    '[]'::jsonb
  )
  from (
    select coalesce(stage, 'new') as stage, count(*)::int as total
    from ranked
    where row_number_for_contact = 1
    group by coalesce(stage, 'new')
  ) counts;
$$;

create or replace function public.crm_v2_leads_list_raw(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default '',
  p_sort_by text default 'createdAt',
  p_sort_direction text default 'desc',
  p_filters jsonb default '{}'::jsonb
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
      coalesce(p_filters, '{}'::jsonb) as filters
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

revoke all on function public.crm_v2_stage_counts_raw() from public, anon, authenticated;
revoke all on function public.crm_v2_leads_list_raw(integer, integer, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.crm_v2_stage_counts_raw() to service_role;
grant execute on function public.crm_v2_leads_list_raw(integer, integer, text, text, text, jsonb) to service_role;
