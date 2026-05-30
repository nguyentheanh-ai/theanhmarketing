-- Product Ads Performance report configuration.
-- Run in Supabase SQL Editor before using inline KPI edits in /admin/facebook-ads.

create table if not exists public.product_ads_mappings (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  course_slug text,
  campaign_keywords text[] not null default '{}',
  adset_keywords text[] not null default '{}',
  utm_campaign_keywords text[] not null default '{}',
  utm_source_keywords text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_ads_mappings_course_slug_idx
  on public.product_ads_mappings(course_slug);

create index if not exists product_ads_mappings_active_idx
  on public.product_ads_mappings(active);

create table if not exists public.product_ads_kpis (
  product_name text primary key,
  kpi_leads_per_day numeric not null default 0,
  target_cpl numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_ads_mappings enable row level security;
alter table public.product_ads_kpis enable row level security;

-- If the project already has current_user_is_admin(), these policies keep writes admin-only.
do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'current_user_is_admin'
  ) then
    drop policy if exists "Admin read product ads mappings" on public.product_ads_mappings;
    create policy "Admin read product ads mappings"
    on public.product_ads_mappings for select
    to authenticated
    using (public.current_user_is_admin());

    drop policy if exists "Admin write product ads mappings" on public.product_ads_mappings;
    create policy "Admin write product ads mappings"
    on public.product_ads_mappings for all
    to authenticated
    using (public.current_user_is_admin())
    with check (public.current_user_is_admin());

    drop policy if exists "Admin read product ads kpis" on public.product_ads_kpis;
    create policy "Admin read product ads kpis"
    on public.product_ads_kpis for select
    to authenticated
    using (public.current_user_is_admin());

    drop policy if exists "Admin write product ads kpis" on public.product_ads_kpis;
    create policy "Admin write product ads kpis"
    on public.product_ads_kpis for all
    to authenticated
    using (public.current_user_is_admin())
    with check (public.current_user_is_admin());
  end if;
end $$;

-- Starter mappings. Adjust keywords to match real Meta campaign/adset naming.
insert into public.product_ads_mappings (
  product_name,
  course_slug,
  campaign_keywords,
  adset_keywords,
  utm_campaign_keywords,
  utm_source_keywords
)
values
  ('Quảng cáo Facebook Master 2026', 'facebook-ads-2026', array['facebook ads', 'fb master', 'facebook master'], array['facebook ads', 'facebook master'], array['facebook-ads-2026', 'fb-master'], array['facebook', 'fb']),
  ('Tạo AI Agent cá nhân X10 hiệu suất', 'tao-ai-agent-ca-nhan-x10-hieu-suat', array['ai agent ca nhan', 'agent x10'], array['ai agent'], array['ai-agent-ca-nhan', 'agent-x10'], array['facebook', 'fb']),
  ('AI Marketing x5 hiệu suất công việc', 'ai-marketing-x5-hieu-suat-cong-viec', array['ai marketing x5'], array['ai marketing'], array['ai-marketing-x5'], array['facebook', 'fb']),
  ('AI Agent Master 2026', 'ai-agent-master-2026', array['ai agent master'], array['agent master'], array['ai-agent-master'], array['facebook', 'fb']),
  ('Performance Marketing With AI', 'performance-marketing-with-ai', array['performance marketing'], array['performance'], array['performance-marketing'], array['facebook', 'fb']),
  ('Bộ Agent Kit X10 hiệu suất công việc', 'bo-agent-kit-x10-hieu-suat-cong-viec', array['agent kit', 'bo agent kit'], array['agent kit'], array['agent-kit-x10'], array['facebook', 'fb']),
  ('Biến tri thức thành tiền', 'bien-tri-thuc-thanh-tien', array['bien tri thuc thanh tien'], array['tri thuc'], array['bien-tri-thuc'], array['facebook', 'fb']),
  ('AI Master x10 hiệu suất', 'ai-master-x10-hieu-suat', array['ai master x10', 'ai master'], array['ai master'], array['ai-master-x10'], array['facebook', 'fb']),
  ('Marketing giỏi phải kiếm được tiền', 'marketing-gioi-phai-kiem-duoc-tien', array['marketing gioi phai kiem duoc tien'], array['marketing gioi'], array['marketing-gioi'], array['facebook', 'fb'])
on conflict do nothing;
