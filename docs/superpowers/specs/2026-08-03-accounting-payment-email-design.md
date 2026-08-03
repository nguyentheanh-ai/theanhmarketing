# Accounting payment email design

Date: 2026-08-03
App: `main-site` (`theanhmarketing.com`)
Project ID: `theanh-main`
Recipient: `thuthaoch@gmail.com`

## Goal

Send one internal accounting email whenever a customer payment first becomes paid. Cover courses, Ebook products, consultations, support bookings, and manual payment confirmations. After release, send the same notification once for eligible Greezhub payments paid from 2026-08-02 onward.

The existing customer email, student-account provisioning, SePay reconciliation, Meta Purchase, Telegram, Google Sheets, support-booking, consultation, and invoice-request flows must remain intact.

## Chosen approach

Create one shared accounting-payment notification service and call it from every authoritative paid transition. Persist dedicated accounting-email delivery markers on `public.orders` so SePay retries, route retries, and the historical backfill cannot send the same order twice.

This is preferred over adding a webhook-only send because the webhook-only approach would omit manual payment confirmation. A database-trigger/outbox implementation is not selected because it adds unnecessary infrastructure for the current volume and scope.

## Email contract

Every accounting email contains:

- Customer name
- Phone number
- Customer email
- Course, product, or service name
- Paid amount in full Vietnamese đồng formatting
- Order code
- Payment time in `Asia/Ho_Chi_Minh`
- Payment method

When `order.invoice.requested` is true, the email also contains:

- Tax code
- Company name
- Company address
- Invoice delivery email

The subject identifies the message as a paid-order accounting notification and includes the order code. The HTML and text versions carry the same business data. Customer credentials, secrets, raw provider payloads, and internal tokens must never appear.

The recipient is configured server-side with `ACCOUNTING_NOTIFICATION_EMAIL`. Production sets it to `thuthaoch@gmail.com`. A missing or invalid recipient fails closed for the accounting send and records an operational error; it does not redirect mail to another address.

## Data model and idempotency

Add two nullable columns to `public.orders` through an additive migration:

- `accounting_email_sent_at timestamptz`
- `accounting_email_last_error text`

The notification service checks `accounting_email_sent_at` before calling the provider. A successful provider response sets the sent timestamp and clears the last error. A failed or skipped provider response leaves the timestamp empty and records a bounded, non-secret error message so an operator can retry it.

The implementation must re-read or conditionally update the order marker around delivery so duplicate SePay callbacks and backfill reruns do not intentionally resend an already-marked order. No accounting-email failure may revert a paid order, block the customer payment-success flow, or change entitlement.

## Runtime flow

### SePay webhook

After `confirmOrderFromSepay` returns a newly paid order, invoke the accounting notification independently of the customer-email branch. This includes course, Ebook, consultation, and support-booking orders. `wasAlreadyPaid=true` callbacks do not send again.

### Manual payment confirmation

After `confirmPaymentManually` returns a newly paid order, invoke the same accounting notification. Existing Meta Purchase and Google Sheets behavior remains unchanged. An already-paid replay does not send again.

### Failure behavior

The accounting send runs as a best-effort post-payment side effect. Its failure is logged and persisted to the dedicated error marker, while the API still reports the successful payment confirmation. Provider credentials and raw provider errors are not returned in production responses.

## Historical Greezhub backfill

Provide a one-off, rerunnable operational script that:

1. Reads paid production orders with `paid_at >= 2026-08-01T17:00:00.000Z`, which is 2026-08-02 00:00 in `Asia/Ho_Chi_Minh`.
2. Limits the source to payments belonging to the current Greezhub receiving-account period, using the stored SePay receiving-account evidence when present and an explicitly reviewed fallback for rows whose provider payload omits the account number.
3. Includes courses, Ebook products, consultations, and support bookings.
4. Skips every row already carrying `accounting_email_sent_at`.
5. Uses the same production notification service and marker logic as live payments.
6. Supports a dry run that prints only non-sensitive aggregates and order codes, followed by an explicit live-send mode.
7. Reports attempted, sent, already-sent, ineligible, and failed counts without printing customer PII or secrets.

Before live send, compare the eligible count and total paid amount with a read-only production query. Do not send the backfill if account ownership or eligibility cannot be proven for any ambiguous rows; list only their order codes for review.

## Testing

Use test-driven development.

Required focused coverage:

- Renders all mandatory customer, product/service, amount, order, time, and payment-method fields in HTML and text.
- Adds invoice fields only when an invoice was requested.
- Uses the configured accounting recipient and fails closed when it is missing or invalid.
- Sends for a newly paid SePay course, Ebook, consultation, and support-booking order.
- Sends for a newly paid manual confirmation.
- Does not send for an already-paid replay or an order with a sent marker.
- Persists success and failure markers correctly.
- Accounting failure does not change paid status or block the existing customer, access, Meta, Telegram, Google Sheets, consultation, or support-booking behavior.
- Backfill dry run respects the start boundary, Greezhub eligibility, and sent marker.

After focused tests, run the complete Node test suite, TypeScript check, lint, production build, and diff check required by the repository. No real customer email or production mutation is part of automated verification.

## Release and operations

1. Apply and verify the additive migration before deploying code that reads or writes the new markers.
2. Configure `ACCOUNTING_NOTIFICATION_EMAIL=thuthaoch@gmail.com` in Production without exposing other environment values.
3. Deploy through the protected `theanh-main` production source and run the existing public/protected payment smoke checks.
4. Confirm the live unauthenticated SePay route still rejects invalid credentials.
5. Run the backfill dry run, review counts and ambiguous order codes, then run the approved live send once.
6. Re-run the dry run to prove all eligible orders are now already sent and no duplicates remain.
7. Record aggregate send results in workspace handoff documents without customer PII.

## Out of scope

- Changing customer-facing payment or success emails
- Changing prices, course titles, landing pages, checkout fields, bank details, or SePay authentication
- Creating invoices automatically
- Sending attachments or invoice PDFs
- Refactoring the broader payment pipeline
- Retrying ambiguous provider calls automatically
