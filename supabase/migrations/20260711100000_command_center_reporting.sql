create index if not exists idx_crm_v2_enrollments_command_center_dates
  on crm_v2.enrollments(coalesce(activated_at, created_at), id);

create index if not exists idx_crm_v2_enrollments_command_center_status
  on crm_v2.enrollments(status, id);

create or replace function public.crm_v2_command_center_enrollments_page(
  p_analysis_from timestamptz,
  p_analysis_to timestamptz,
  p_offset integer default 0,
  p_limit integer default 500
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, crm_v2
as $$
declare
  v_total_count bigint;
  v_rows jsonb;
begin
  if p_analysis_from is null
     or p_analysis_to is null
     or p_analysis_from >= p_analysis_to
     or p_offset < 0
     or p_limit < 1
     or p_limit > 500 then
    raise exception 'invalid_command_center_page';
  end if;

  -- Current operational access remains visible even when it predates the analysis
  -- window. Revoked historical access is included only when created/activated in
  -- the selected current+previous analysis window.
  select count(*)
  into v_total_count
  from crm_v2.enrollments e
  where e.status in ('active', 'paused', 'completed')
     or (
       coalesce(e.activated_at, e.created_at) >= p_analysis_from
       and coalesce(e.activated_at, e.created_at) < p_analysis_to
     );

  select coalesce(jsonb_agg(page.row_value order by page.sort_time, page.id), '[]'::jsonb)
  into v_rows
  from (
    select
      e.id,
      coalesce(e.activated_at, e.created_at) as sort_time,
      jsonb_build_object(
        'id', e.id,
        'contact_id', e.contact_id,
        'user_id', e.user_id,
        'course_slug', e.course_slug,
        'status', e.status,
        'activated_at', e.activated_at,
        'created_at', e.created_at,
        'expires_at', e.expires_at,
        'order_id', e.order_id,
        'metadata', jsonb_build_object(
          'access_kind', e.metadata->>'access_kind',
          'course_slug', e.metadata->>'course_slug',
          'student_email', e.metadata->>'student_email',
          'student_phone', e.metadata->>'student_phone'
        ),
        'contacts', jsonb_build_object(
          'email', c.email,
          'phone', c.phone
        )
      ) as row_value
    from crm_v2.enrollments e
    left join crm_v2.contacts c on c.id = e.contact_id
    where e.status in ('active', 'paused', 'completed')
       or (
         coalesce(e.activated_at, e.created_at) >= p_analysis_from
         and coalesce(e.activated_at, e.created_at) < p_analysis_to
       )
    order by coalesce(e.activated_at, e.created_at), e.id
    limit p_limit
    offset p_offset
  ) page;

  return jsonb_build_object(
    'rows', v_rows,
    'total_count', v_total_count,
    'has_more', p_offset + jsonb_array_length(v_rows) < v_total_count
  );
end;
$$;

revoke all on function public.crm_v2_command_center_enrollments_page(timestamptz, timestamptz, integer, integer)
  from public, anon, authenticated;
grant execute on function public.crm_v2_command_center_enrollments_page(timestamptz, timestamptz, integer, integer)
  to service_role;
