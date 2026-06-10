# Tracking Audit - Facebook Pixel / Meta CAPI

Date: 2026-06-10

## Pixel chinh

- Pixel ID: `1315653423712065`
- Pixel name: `Pixel 01 - Khoa hoc FB ADS 799.000d`
- Browser Pixel: `NEXT_PUBLIC_META_PIXEL_ID=1315653423712065`
- Meta CAPI dataset: forced to `1315653423712065` in `lib/meta/conversions-api.ts`

## Pixel da go/chan

- `1966683547571929`: removed from static HTML under `public/ladipage` and `public/academy`.
- `1297209809285103`: not found in local code/env examples.
- `2364261364083192`: not found in local code/env examples.
- Runtime multi-pixel support via `NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS` is no longer used by code.

## File da chinh sua

- `.env.example`
- `components/site/marketing-scripts.tsx`
- `lib/marketing-settings.ts`
- `lib/tracking/events.ts`
- `lib/tracking/client-attribution.ts`
- `lib/tracking/attribution.ts`
- `lib/meta/conversions-api.ts`
- `services/leadService.ts`
- `services/orderService.ts`
- `lib/notifications/google-sheets.ts`
- `app/api/leads/route.ts`
- `app/api/orders/route.ts`
- `app/api/payment/confirm/route.ts`
- `app/api/sepay/webhook/route.ts`
- `components/payment/payment-status-poller.tsx`
- `components/forms/lead-form.tsx`
- `components/auth/register-form.tsx`
- `components/cart/cart-page-client.tsx`
- `app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-checkout-form.tsx`
- `app/thanh-toan/[code]/page.tsx`
- `components/admin/admin-growth-os-dashboard.tsx`
- `public/ladipage/facebook-ads-2026.html`
- `public/academy/facebook-ads-master-2026.html`
- `public/ladipage/ai-master-x10-hieu-suat.html`
- `public/academy/ai-master-x10-hieu-suat.html`
- `docs/SUPABASE_TRACKING_ATTRIBUTION.sql`
- `tests/meta-conversions-api.test.mjs`

## Event dang ban o dau

- `PageView`: root app route changes via `TrackingPageView`; static landing HTML on page load.
- `ViewContent`: course/landing detail pages and static sales landing pages.
- `Lead`: only after `/api/leads` or `/api/orders` succeeds and real lead/order data has been accepted.
- `InitiateCheckout`: after an order code is created or when a real checkout page for an order is opened.
- `Purchase`: server-side only after paid confirmation from SePay webhook or `POST /api/payment/confirm`.

## Event flow

1. Visitor lands on page: browser sends `PageView`.
2. Visitor views main landing/course page: browser sends `ViewContent`.
3. Visitor submits real contact/payment form: API stores lead with UTM/fbclid/fbc/fbp, then browser/CAPI send `Lead` with `event_id=lead_id`.
4. System creates a real order/checkout code: browser sends `InitiateCheckout` with `event_id=order_code`.
5. SePay or protected manual confirm marks order paid: server sends CAPI `Purchase` with `event_id=order_code`, value, VND currency, product, order id, campaign/adset/ad, hashed email/phone, fbc/fbp.
6. If Meta CAPI request succeeds, `orders.purchase_event_sent=true`.

## UTM va attribution

All supported forms/landing flows now collect:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_id`
- `utm_term`
- `ad_id`
- `fbclid`
- `campaign_id`
- `campaign_name`
- `adset_id`
- `ad_name`
- `_fbp`
- `_fbc`

If URL contains `fbclid` and `_fbc` cookie is missing, the client creates:

```text
fb.1.<timestamp>.<fbclid>
```

If there is no `campaign_id`, attribution source remains `organic/unknown`.

## Database

Apply:

```text
docs/SUPABASE_TRACKING_ATTRIBUTION.sql
```

This adds attribution columns to `leads` and `orders`, plus `orders.purchase_event_sent`.

Production status:

- Supabase project `vsxxgdzwtscuxcmjfckt` applied migration `tracking_attribution_meta_pixel_20260610` on 2026-06-10.
- Verified production columns for `public.leads`, `public.orders`, and `orders.purchase_event_sent`.
- Existing old orders are not backfilled as sent Purchase events, to avoid sending historical revenue as new Meta purchases.

## Production deploy

- Commit: `ac62003 fix: standardize meta tracking attribution`
- Production alias: `https://www.theanhmarketing.com`
- Production env `NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS` was removed after deploy. Runtime code also ignores this variable.

Live smoke:

- `/` returns 200 and includes only pixel `1315653423712065`.
- `/academy/facebook-ads-master-2026.html` returns 200 and includes only pixel `1315653423712065`.
- `/ladipage/facebook-ads-2026.html` returns 200 and includes only pixel `1315653423712065`.
- `/ladipage/ai-master-x10-hieu-suat.html` returns 200 and includes only pixel `1315653423712065`.
- `/api/payment/confirm` without API key returns 401.

## Dashboard va CSV

Admin Growth OS tracking tab now includes campaign reporting:

- Revenue by campaign
- Lead count by campaign
- Paid order count by campaign
- Lead to paid rate
- Spend
- CPA
- ROAS
- Export CSV

Spend is currently `0` until a real Ads Insights spend source is connected. The dashboard does not guess ad spend.

## Test bang Meta Pixel Helper

1. Open an incognito browser.
2. Visit a landing page with sample URL params:
   `?utm_source=facebook&utm_medium=cpc&utm_campaign=test_campaign&utm_content=test_content&utm_id=test_campaign_id&utm_term=test_term&ad_id=test_ad&fbclid=test_click`
3. Confirm only pixel `1315653423712065` appears.
4. Confirm `PageView` fires on load.
5. Confirm `ViewContent` fires on main landing/course pages.
6. Submit a real test form and confirm `Lead` fires once after successful submit.
7. Confirm `InitiateCheckout` fires after order code exists.
8. Do not expect browser `Purchase` on reload; Purchase is server-side CAPI.

## Test bang Events Manager

1. Use Test Events for dataset `1315653423712065`.
2. Temporarily set `META_CAPI_TEST_EVENT_CODE` only while testing.
3. Submit test lead/order and confirm `Lead` arrives with `event_id=lead_id`.
4. Confirm a paid test order via SePay webhook or `POST /api/payment/confirm`.
5. Confirm `Purchase` arrives with:
   - `event_name=Purchase`
   - `event_id=order_code`
   - `currency=VND`
   - `value=paid amount`
   - hashed email/phone when present
   - `fbc`/`fbp` when present
6. Remove `META_CAPI_TEST_EVENT_CODE` after testing.

## Rui ro con lai

- Google Tag Manager remote container cannot be audited from local source. Local code only controls the configured GTM ID, not remote tags inside GTM UI.
- Meta Events Manager still needs a real Test Events run for browser + CAPI deduplication.
- Real ad spend is not connected yet, so CPA/ROAS show `N/A` until a verified spend source is added.
