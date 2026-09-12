-- Production audit: preserve public catalog reads and server checkout; remove prototype writes.
set lock_timeout = '5s';
set statement_timeout = '30s';

create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'admin_role') in ('owner','editor'), false)
    or exists (select 1 from public.admin_users where lower(email) = lower(coalesce(auth.jwt() ->> 'email','')))
  );
$$;

drop policy if exists "Anon manage orders demo" on public.orders;
drop policy if exists "Authenticated read orders demo" on public.orders;
drop policy if exists "Allow all insert courses" on public.courses;
drop policy if exists "Allow all update courses" on public.courses;
drop policy if exists "Allow all delete courses" on public.courses;
drop policy if exists "Allow all insert modules" on public.course_modules;
drop policy if exists "Allow all update modules" on public.course_modules;
drop policy if exists "Allow all delete modules" on public.course_modules;
drop policy if exists "Authenticated manage lessons" on public.lessons;
drop policy if exists "Authenticated manage lesson resources" on public.lesson_resources;

-- These existing admin policies mistakenly allowed every signed-in user.
alter policy "Authenticated manage additive admin tables" on public.landing_pages using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
alter policy "Authenticated manage click events" on public.click_events using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
alter policy "Authenticated manage email templates" on public.email_templates using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
alter policy "Authenticated manage automation flows" on public.automation_flows using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
alter policy "Authenticated manage automation runs" on public.automation_runs using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
alter policy "Authenticated manage coupons" on public.coupons using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));
alter policy "Authenticated manage app settings" on public.app_settings using ((select public.current_user_is_admin())) with check ((select public.current_user_is_admin()));

alter function public.set_updated_at() set search_path = '';
alter function crm_v2.set_updated_at() set search_path = '';
alter function crm_v2.is_admin() set search_path = '';
alter function crm_v2.prevent_published_workflow_version_mutation() set search_path = '';
alter function crm_v2.lead_stage_rank(text) set search_path = '';
-- Trigger functions are invoked by PostgreSQL, not by public RPC callers.
revoke execute on function public.cancel_payment_remarketing_runs_on_order_status() from public, anon, authenticated;
revoke execute on function public.seed_payment_remarketing_runs_on_order() from public, anon, authenticated;
revoke execute on function public.sync_payment_remarketing_engagement() from public, anon, authenticated;

