# Sepay Payment Setup

Sepay flow in this project:

1. Student adds one or many courses to `/gio-hang`.
2. Student creates an account at `/dang-ky`.
3. The app creates a pending row in `orders`.
4. Student is redirected to `/thanh-toan/[orderCode]`.
5. The page displays a VietQR image from `https://qr.sepay.vn/img`.
6. Sepay posts the bank transaction webhook to `/api/sepay/webhook`.
7. The app matches the Sepay `code` or transfer content with `orders.order_code` and marks the order as paid.
8. When an order changes from `pending` to `paid`, the app creates a student account if needed.
9. The app sends one payment confirmation email to the customer.
10. A Vercel Cron job calls `/api/orders/expire` every 10 minutes to mark overdue pending orders as `expired`.
11. Expired orders send the failed-payment email with a retry payment link, without blocking a later successful Sepay webhook.

## Environment

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SEPAY_BANK_CODE=VPB
SEPAY_BANK_ACCOUNT_NUMBER=0367928921
SEPAY_BANK_ACCOUNT_NAME=NGUYEN THE ANH
SEPAY_WEBHOOK_API_KEY=your-sepay-webhook-api-key
RESEND_API_KEY=your-resend-api-key
PAYMENT_SUCCESS_EMAIL_FROM=The Anh Marketing <onboarding@resend.dev>
CRON_SECRET=your-vercel-cron-secret
```

`SUPABASE_SERVICE_ROLE_KEY` is recommended for webhook updates. Keep it server-only.
`PAYMENT_SUCCESS_EMAIL_FROM` is optional; if empty, the app falls back to `REGISTRATION_NOTIFICATION_FROM`.
For real customer delivery, verify a sending domain in Resend and use a `from` address on that domain.
Resend test mode only sends to the account owner email.
`CRON_SECRET` is required in production for the expired-order job. Vercel Cron sends it as `Authorization: Bearer CRON_SECRET`, and the route rejects requests without that header.

## Student Account After Payment

After Sepay confirms a paid order, the webhook attempts to create a Supabase Auth account:

- Username: the customer's order email.
- Temporary password: last word in the customer name, with the first letter capitalized and Vietnamese marks removed, plus phone digits.
- Example: `Nguyễn Thế Anh` + `0901234567` becomes `Anh0901234567`.
- The account is created with `must_change_password=true`.
- On first login, the student is redirected to `/doi-mat-khau`; after changing password, they continue to `/dashboard`.

If the account already exists, the webhook skips account creation and still keeps the payment/email flow working.

## Webhook URL

Configure this URL in Sepay:

```txt
https://www.theanhmarketing.com/api/sepay/webhook
```

Important: avoid a URL that redirects (3xx).  
If your apex domain redirects to `www`, always use the final `www` webhook URL directly.

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
  payment_email_sent_at timestamptz,
  payment_email_last_error text,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_order_code_idx on public.orders(order_code);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

alter table public.orders add column if not exists order_items jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists payment_email_sent_at timestamptz;
alter table public.orders add column if not exists payment_email_last_error text;

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
