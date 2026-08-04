create table public.telegram_meta_campaign_hourly_snapshots (
  id uuid primary key default gen_random_uuid(),
  ad_account_id text not null,
  entity_level text not null check (entity_level in ('account', 'campaign')),
  entity_id text not null,
  entity_name text not null default '',
  local_start_at timestamptz not null,
  local_end_at timestamptz not null,
  spend numeric(18, 2) not null check (spend >= 0),
  data_status text not null default 'final' check (data_status in ('final', 'partial', 'missing')),
  source text not null default 'facebook_ads_mcp' check (source = 'facebook_ads_mcp'),
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ad_account_id, entity_level, entity_id, local_start_at),
  check (local_end_at = local_start_at + interval '1 hour')
);

create index telegram_meta_campaign_hourly_snapshots_window_idx
  on public.telegram_meta_campaign_hourly_snapshots (ad_account_id, local_start_at, local_end_at);

alter table public.telegram_meta_campaign_hourly_snapshots enable row level security;

revoke all on table public.telegram_meta_campaign_hourly_snapshots from public, anon, authenticated;
grant select, insert, update, delete on table public.telegram_meta_campaign_hourly_snapshots to service_role;

comment on table public.telegram_meta_campaign_hourly_snapshots is
  'Service-role-only hourly Meta Ads snapshots synchronized through Facebook Ads MCP for Telegram business reports.';
