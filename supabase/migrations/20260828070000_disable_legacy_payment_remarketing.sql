-- Disable only the legacy seven-step payment reminder automation.
-- Transactional order/payment emails and order records are intentionally untouched.

drop trigger if exists payment_remarketing_runs_after_order_insert on public.orders;

create or replace function public.seed_payment_remarketing_runs(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  return;
end;
$function$;

create or replace function public.claim_due_payment_remarketing_runs(p_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
begin
  if p_limit is null or p_limit < 1 or p_limit > 25 then
    raise exception 'invalid_payment_remarketing_claim' using errcode = '22023';
  end if;

  return '[]'::jsonb;
end;
$function$;

delete from public.payment_remarketing_runs
where status <> 'sent';
