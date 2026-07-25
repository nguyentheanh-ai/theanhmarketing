# Public Guide And Paid Support Booking Design

Date: 2026-07-25
Project: `theanh-main`
Production source: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`
Release constraint: local demo only; do not deploy until the owner explicitly requests it.

## Outcome

Add a public customer guide and a paid 30-minute support-booking flow to `theanhmarketing.com`. The guide and booking page require no account. A booking costs 500,000 VND and is recorded as confirmed only after SePay confirms full payment. Paid bookings appear in the owner admin and trigger a Telegram notification.

## Public guide

- Route: `/huong-dan`.
- Public, indexable, and usable without authentication.
- Explain the visible customer journey: payment, checking Inbox and Spam, finding the account email and temporary password, logging in, opening the purchased course, reading the Ebook online, and downloading the Ebook PDF.
- Use screenshots captured from the local application with synthetic customer information. Never expose a real password, customer email, phone number, order code, bank account secret, or admin session.
- Link to `/dang-nhap`, the public booking page, and the existing Ebook actions where appropriate.

## Booking experience

- Route: `/dat-lich-ho-tro`.
- Public and usable without authentication.
- Duration: 30 minutes. Price: 500,000 VND.
- Display dates from today through day 30 in Vietnam time.
- Today through day 6 are always unavailable. The earliest bookable date is day 7.
- Default daily slots follow the supplied reference: 09:00 through 11:30 and 13:30 through 20:00, every 30 minutes.
- Owner-blocked dates and already held or paid slots are unavailable.
- Collect customer name, email, phone, support topic, and a required detailed note. Suggested topics include ad-account review, sample-ad setup, and system-building consultation.
- Submitting a valid request creates a 20-minute slot hold and a 500,000 VND pending SePay order, then redirects to the existing `/thanh-toan/[code]` checkout.
- A hold is not a confirmed booking. The owner-facing confirmed list must only contain paid bookings.

## Payment and confirmation

- Reuse the existing SePay order, QR, polling, and webhook infrastructure.
- Identify the product with a dedicated non-course slug, `support-session-30m`, and preserve all existing course-order behavior.
- Do not provision course access or a student account for this product.
- Do not send the generic `[NEW ORDER]` Telegram message when the customer merely opens the support checkout.
- On full payment, atomically promote the held booking to `confirmed`, associate the paid order, and send a booking-specific Telegram message containing the time, customer contact, topic, note, amount, and admin link.
- Webhook retries remain idempotent: no duplicate confirmation and no duplicate paid Telegram message.
- If a payment arrives after the hold expired or the slot is no longer available, retain the paid order and mark the booking for owner review rather than silently overwriting another booking.

## Admin

- Route: `/admin/crm-v2/support-bookings`, owner-only.
- Add `Lịch hỗ trợ` to the canonical CRM navigation.
- Show confirmed bookings with date/time, customer, phone, email, topic, note, amount, order code, and payment time.
- Provide a date calendar/list for setting or clearing whole busy days.
- The rolling day-0-through-day-6 rule cannot be overridden by admin.
- Admin mutations require the existing owner authorization guard and use no service-role credentials in the browser.

## Student dashboard

- Replace the old email/Zalo support card actions with one primary `Đặt lịch hỗ trợ` action linking to `/dat-lich-ho-tro`.
- Keep the section anchor and current dark/light visual behavior.

## Data model

- `public.support_bookings`: customer details, Vietnam-local appointment date/time, UTC start/end, topic, note, status (`held`, `confirmed`, `needs_review`, `cancelled`), hold expiry, order id/code, paid timestamp, Telegram marker, and timestamps.
- `public.support_busy_dates`: unique Vietnam-local date, optional owner note, actor, and timestamps.
- Public clients do not receive direct table access. Booking creation and availability use server routes with validation and service-role access. Admin routes require owner auth.
- Database constraints prevent duplicate active/confirmed occupancy for the same start time; server logic clears expired holds before reserving.

## Error handling

- Invalid contact details, missing note, invalid date, blocked date, stale availability, or duplicate slot return a customer-safe Vietnamese error.
- Booking creation is idempotent for a single form submission and never produces an orphan booking without an order link.
- Missing SePay configuration keeps the current checkout fallback behavior.
- Telegram failure does not roll back a paid booking; it records an error/unsent marker for admin visibility and retry.

## Verification

- TDD contract/unit coverage for the rolling seven-day lock, 30-day horizon, slot generation, validation, duplicate holds, paid-only confirmation, idempotent webhook behavior, Telegram suppression before payment, and owner-only admin mutations.
- Run focused tests, the full Node suite, TypeScript, ESLint, `git diff --check`, and the Next.js production build.
- Run the local app and verify `/huong-dan`, `/dat-lich-ho-tro`, dashboard support CTA, checkout redirect, and owner admin layout at desktop and mobile widths using synthetic data.
- Capture final local screenshots for owner review. Do not run a Vercel production deploy.

## Scope exclusions

- No production deployment.
- No Google Calendar or external scheduling provider.
- No recurring weekly availability editor; only the fixed default hours and owner busy-day control.
- No reschedule/refund automation in this first version.
