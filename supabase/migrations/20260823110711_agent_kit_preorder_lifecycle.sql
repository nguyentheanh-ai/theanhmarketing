alter table public.orders
  add column if not exists payment_plan text,
  add column if not exists parent_order_code text;

alter table public.orders
  drop constraint if exists orders_parent_order_code_fkey;

alter table public.orders
  add constraint orders_parent_order_code_fkey
  foreign key (parent_order_code)
  references public.orders(order_code)
  on delete restrict;

create unique index if not exists orders_agent_kit_remaining_parent_unique
  on public.orders (parent_order_code)
  where payment_plan = 'agent-kit-preorder-remaining-400';

create index if not exists orders_payment_plan_status_idx
  on public.orders (payment_plan, status, created_at desc);

update public.orders
set payment_plan = 'agent-kit-preorder-deposit-399'
where payment_plan is null
  and course_slug = 'bo-agent-kit-x10-hieu-suat-cong-viec'
  and amount = 399000
  and lower(coalesce(course_title, '')) like '%cọc preorder%';
