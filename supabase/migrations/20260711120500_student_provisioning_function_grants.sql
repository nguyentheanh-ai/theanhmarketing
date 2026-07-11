revoke all on function public.begin_admin_student_provisioning_email_dispatch(text, uuid) from public, anon, authenticated;
grant execute on function public.begin_admin_student_provisioning_email_dispatch(text, uuid) to service_role;
revoke all on function public.finish_admin_student_provisioning_email_dispatch(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.finish_admin_student_provisioning_email_dispatch(text, uuid, text, text) to service_role;
revoke all on function public.resolve_admin_student_provisioning_email_review(text, uuid, text) from public, anon, authenticated;
grant execute on function public.resolve_admin_student_provisioning_email_review(text, uuid, text) to service_role;
revoke all on function public.finalize_admin_student_provisioning_operation(text, uuid, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_admin_student_provisioning_operation(text, uuid, text, text, text, jsonb, jsonb)
  to service_role;

