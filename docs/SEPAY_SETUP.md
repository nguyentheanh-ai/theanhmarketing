# Sepay Payment Setup

Sepay flow in this project:

1. Student adds one or many courses to `/gio-hang`.
2. Student creates an account at `/dang-ky`.
3. The app creates a pending row in `orders`.
4. Student is redirected to `/thanh-toan/[orderCode]`.
5. The page displays a VietQR image from `https://qr.sepay.vn/img`.
6. Sepay posts the bank transaction webhook to `/api/sepay/webhook`.
7. The app matches the Sepay `code` or transfer content with `orders.order_code` and marks the order as paid.

## Environment

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SEPAY_BANK_CODE=VCB
SEPAY_BANK_ACCOUNT_NUMBER=1017588888
SEPAY_BANK_ACCOUNT_NAME=THE ANH MARKETING
SEPAY_WEBHOOK_API_KEY=your-sepay-webhook-api-key
```

`SUPABASE_SERVICE_ROLE_KEY` is recommended for webhook updates. Keep it server-only.

## Webhook URL

Configure this URL in Sepay:

```txt
https://your-domain.com/api/sepay/webhook
```

Use API key authentication. Sepay sends:

```txt
Authorization: Apikey YOUR_KEY
```

The code currently accepts unauthenticated webhooks only in local development when `SEPAY_WEBHOOK_API_KEY` is empty.

## SQL

Run this once in Supabase SQL Editor:

```sql
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  student_name text,
  email text,
  phone text,
  course_slug text,
  course_title text,
  amount numeric not null default 0,
  currency text not null default 'VND',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired')),
  payment_method text not null default 'sepay',
  payment_qr_url text,
  sepay_transaction_id text,
  sepay_reference_code text,
  sepay_payload jsonb,
  order_items jsonb not null default '[]'::jsonb,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_order_code_idx on public.orders(order_code);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

alter table public.orders add column if not exists order_items jsonb not null default '[]'::jsonb;

alter table public.orders enable row level security;

drop policy if exists "Anon manage orders demo" on public.orders;
create policy "Anon manage orders demo"
on public.orders for all
to anon
using (true)
with check (true);

drop policy if exists "Authenticated read orders demo" on public.orders;
create policy "Authenticated read orders demo"
on public.orders for select
to authenticated
using (true);
```

Before production, replace the anon demo policy with server-only writes and admin/student scoped reads.
