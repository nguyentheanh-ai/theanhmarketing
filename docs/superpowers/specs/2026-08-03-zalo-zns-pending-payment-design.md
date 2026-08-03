# Zalo ZNS Pending-Payment Reminder Design

## Goal

Send exactly one Zalo ZNS payment reminder about five minutes after an eligible order is created, but only when the order is still pending.

## Scope

- Eligible product identities: `ebook-facebook-ads-2026` and `facebook-ads-2026`.
- A Facebook Ads order that also contains the Ebook remains eligible.
- Consultation, support booking, AI Master, Agent Kit and every other product are excluded.
- The timing source is the authoritative `public.orders.created_at` value.
- The reminder is sent no earlier than five minutes after creation; a one-minute worker cadence means normal delivery is between minute five and minute six.
- A paid order must never be deliberately selected. The service checks status during the claim and again immediately before the provider call.

## Customer message

Use the ZBS `Mẫu yêu cầu chuyển khoản` template with the following copy and variables:

- Title: `Hoàn tất thanh toán khóa học`
- Body: `Chào <customer_name>, khóa học <product_name> của bạn vẫn đang chờ thanh toán. Vui lòng hoàn tất để hệ thống xác nhận và gửi quyền truy cập.`
- Bill rows: registration code, course, amount, transfer content and `Chờ thanh toán` status.
- Primary action: `MỞ APP NGÂN HÀNG`.

The action points to `https://www.theanhmarketing.com/thanh-toan/<order_code>?openBank=1`. The URL contains only the order code and the fixed handoff flag. The server resolves product, amount, bank account and transfer content from the stored order; the browser cannot override them.

## Bank-app handoff

The existing `/thanh-toan/[code]` page remains the payment source of truth. The `openBank=1` query flag requests the bank-app handoff. On a supported mobile device the page attempts the verified VietQR/bank-app flow. If that handoff is unsupported, blocked or returns to the browser, the same page remains visible with the current QR and copy-first transfer controls.

No direct bank account, amount or credential is embedded in the ZBS action URL. No new payment provider or reconciliation flow is introduced.

## Visual asset

Use a 16:9 The Anh Marketing banner for both eligible products. It uses royal blue, cyan and warm yellow-gold; the right side shows the real Ebook Facebook Ads 2026 mockup and the real Quảng cáo Facebook Master 2026 course artwork. The top-left uses the official black-and-gold TA logo from `public/brand/ta-logo.svg`, not a generated text wordmark. Exact visible copy:

- `THE ANH MARKETING`
- `HOÀN TẤT THANH TOÁN KHÓA HỌC`
- `Khóa học của bạn đang chờ xác nhận`
- `Thanh toán an toàn qua VietQR`
- `NHẬN QUYỀN TRUY CẬP NGAY`

The image contains no `đơn hàng` wording, price, account number, scannable QR, bank logo, Zalo logo, lending claim or third-party brand.

## Scheduling and delivery

1. Supabase Cron invokes a protected website worker every minute.
2. The worker finds eligible orders whose `created_at` is at least five minutes old and whose status is still `pending`.
3. An atomic ten-minute lease prevents concurrent workers from selecting the same order and allows recovery from a crashed worker.
4. Immediately before sending, the service rereads the order and exits if it is no longer `pending`.
5. The ZNS provider receives the approved template ID and server-derived variables.
6. A successful send writes the provider-safe result and permanent sent marker. Failure writes a bounded error, increments attempts and releases or expires the lease. A single order receives at most three total attempts within 24 hours; success remains terminal.

## Persistence and idempotency

Follow the existing order-notification marker pattern. Add only the fields needed to distinguish claim, success, bounded error and attempt count. Do not reuse the pending-email marker, because email and ZNS are independent channels.

The worker must treat a success marker as terminal. Repeated cron calls, duplicate callbacks and overlapping executions return a skipped result without sending again.

## Secrets and permissions

- OA access and refresh tokens remain server-only environment secrets.
- The access token is refreshed through the official Zalo flow and never returned to the browser, logs, docs or API responses.
- Cron authentication reuses a protected server-side secret boundary.
- Public endpoints expose no token, customer list or bulk-send capability.

## Failure handling

- Missing phone, invalid phone, unsupported product, non-pending status, missing approved template or missing Zalo configuration are safe skips/failures with no send.
- Provider timeouts and transient errors retry only within the approved bounded policy.
- Payment, order creation, SePay reconciliation, existing pending-payment email, Telegram and student provisioning continue independently when ZNS fails.
- No production customer receives a message until the ZBS template is approved and a controlled test has passed.

## Cost

The Zalo UI currently estimates roughly 310 VND per phone-delivered message for the transfer template plus one business-website action. Actual provider pricing at send time remains authoritative. Template creation, code and controlled testing do not authorize recurring production charges; production enablement remains blocked until the owner supplies and confirms a daily or monthly operating limit.

## Verification

- Contract tests cover product allowlisting, the five-minute boundary, paid exclusion, second status check, atomic duplicate prevention, bounded retry and secret-safe responses.
- Template tests cover exact variables, phone normalization and the allowlisted payment URL.
- Payment-page tests cover mobile bank-app handoff and QR/copy fallback without changing order amount or reconciliation.
- Run the focused tests, full Node tests, TypeScript, ESLint, production build and protected-route smoke checks before deployment.
- Production verification starts with a controlled test order/phone approved by the owner; no broad backfill is allowed.
