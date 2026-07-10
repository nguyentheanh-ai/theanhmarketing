-- CRM v2 workflow hardening. Additive only: no legacy schema changes and no destructive data operations.

create unique index if not exists idx_crm_v2_workflow_runs_idempotency_key
  on crm_v2.workflow_runs (idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workflow_runs_status_check'
      and conrelid = 'crm_v2.workflow_runs'::regclass
  ) then
    alter table crm_v2.workflow_runs
      add constraint workflow_runs_status_check
      check (status in ('pending', 'running', 'waiting', 'success', 'failed', 'skipped', 'cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workflow_step_runs_status_check'
      and conrelid = 'crm_v2.workflow_step_runs'::regclass
  ) then
    alter table crm_v2.workflow_step_runs
      add constraint workflow_step_runs_status_check
      check (status in ('pending', 'running', 'waiting', 'success', 'failed', 'skipped'));
  end if;
end $$;

create or replace function crm_v2.prevent_published_workflow_version_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.status = 'published' then
    raise exception 'Published workflow versions are immutable';
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' and to_jsonb(old) is distinct from to_jsonb(new) then
    raise exception 'Published workflow versions are immutable';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_prevent_published_workflow_version_mutation'
      and tgrelid = 'crm_v2.workflow_versions'::regclass
  ) then
    create trigger trg_prevent_published_workflow_version_mutation
      before update or delete on crm_v2.workflow_versions
      for each row
      execute function crm_v2.prevent_published_workflow_version_mutation();
  end if;
end $$;
