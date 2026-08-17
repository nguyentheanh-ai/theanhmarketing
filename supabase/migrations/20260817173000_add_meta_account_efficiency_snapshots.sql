alter table public.telegram_meta_campaign_hourly_snapshots
  add column if not exists impressions bigint not null default 0 check (impressions >= 0),
  add column if not exists clicks bigint not null default 0 check (clicks >= 0),
  add column if not exists purchases numeric(18, 4) not null default 0 check (purchases >= 0),
  add column if not exists purchase_value numeric(18, 2) not null default 0 check (purchase_value >= 0);

comment on column public.telegram_meta_campaign_hourly_snapshots.impressions is
  'Meta Ads impressions for the exact hourly entity snapshot.';
comment on column public.telegram_meta_campaign_hourly_snapshots.clicks is
  'Meta Ads clicks (all) for the exact hourly entity snapshot.';
comment on column public.telegram_meta_campaign_hourly_snapshots.purchases is
  'Meta-attributed omni purchases for the exact hourly entity snapshot.';
comment on column public.telegram_meta_campaign_hourly_snapshots.purchase_value is
  'Meta-attributed purchase value for the exact hourly entity snapshot.';
