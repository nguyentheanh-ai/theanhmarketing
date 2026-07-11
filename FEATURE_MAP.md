# Feature Map - theanh-main

## Admin student provisioning orchestration

Description: Safely coordinate paid, free, or trial account creation, access grants, email dispatch, and replay recovery through one durable operation journal.

Routes: `/admin/hoc-vien?add_student=1`, `POST /api/admin/students/grant`, `GET /api/admin/students/provisioning-status`, `POST /api/admin/students/provisioning-review`.

Main files: `components/admin/student-provisioning-wizard.tsx`, `lib/admin/student-provisioning-request.ts`, `services/studentProvisioningService.ts`, `services/studentProvisioningOperationService.ts`, `services/studentProvisioningControlService.ts`, `services/studentAccountService.ts`, `services/lmsService.ts`.

Database: `public.admin_student_provisioning_operations`, `public.orders`, `public.leads`, `public.activity_logs`, `crm_v2.enrollments`.

Migration: `supabase/migrations/20260711110000_admin_student_provisioning_operations.sql`, `supabase/migrations/20260711120000_student_provisioning_idempotency.sql`.

Search: `StudentProvisioningWizard`, `provisionStudent`, `finalizeProvisioningOutcome`, `manual_review`, `resolveProvisioningEmailReview`, `finalize_admin_student_provisioning_operation`.

Guard: the create route accepts strict bounded JSON and derives its actor from the authenticated session. It never accepts or returns a password. Never retry an attempted/ambiguous email provider call automatically; owner review must use the canonical current auth role and one of the two explicit decisions. Never finalize without the current operation lease. Apply the pending migration before enabling this flow in production.

## Authentication and account recovery

Routes: `/dang-nhap`, `/dang-ky`, `/quen-mat-khau`, `/doi-mat-khau`, `/api/auth/forgot-password`, `/api/auth/recovery/confirm`.

Files: `components/auth/login-form.tsx`, `components/auth/register-form.tsx`, `components/auth/forgot-password-form.tsx`, `lib/auth/session.ts`, `lib/auth/student-account.ts`.

Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Search: `login-form`, `register-form`, `forgot-password`, `student-account`.

Guard: preserve admin authentication and checkout redirect behavior.

## Orders, checkout and SePay

Routes: `/thanh-toan/[code]`, `/api/orders`, `/api/orders/[code]`, `/api/payment/confirm`, `/api/sepay/webhook`.

Files: `services/orderService.ts`, `services/checkoutNotificationService.ts`, `components/payment/transfer-details.tsx`, `components/payment/payment-status-poller.tsx`, `lib/payments/sepay.ts`.

Database: `public.orders`, `public.activity_logs`.

Environment: `SEPAY_BANK_CODE`, `SEPAY_BANK_ACCOUNT_NUMBER`, `SEPAY_BANK_ACCOUNT_NAME`, `SEPAY_WEBHOOK_API_KEY`.

Guard: do not create a second order/payment/email flow; keep notification markers and idempotency.

## Student access and LMS

Routes: `/dashboard`, `/learn/[course]/[lesson]`, `/admin/crm-v2/students`, `/api/admin/crm-v2/lms`, `/api/student/progress`.

Files: `services/lmsService.ts`, `services/studentAccessService.ts`, `services/studentAccountService.ts`, `components/crm-v2/lms-management-client.tsx`, `lib/student-dashboard-courses.ts`.

Database: `public.courses`, `public.course_modules`, `public.lessons`, `public.lesson_resources`, `crm_v2.enrollments`, `crm_v2.course_progress`.

Search: `lmsService`, `enrollments`, `course_progress`, `publishedLessonsOnly`.

Guard: private/draft lessons must not leak before authentication/entitlement checks.

## CRM V2

Routes: `/admin/crm-v2`, `/admin/crm-v2/leads`, `/admin/crm-v2/orders`, `/admin/crm-v2/reports` and matching `/api/admin/crm-v2/*` routes.

Files: `lib/crm-v2/data.ts`, `lib/crm-v2/query.ts`, `lib/crm-v2/types.ts`, `components/crm-v2/leads-page-client.tsx`, `components/crm-v2/orders-page-client.tsx`.

Database: `public.leads`, `public.orders`, CRM V2 schema/RPCs in `supabase/migrations`.

Guard: protected routes must redirect/return 403 when unauthenticated, never become 404 after deploy.

## Transactional email and bridge links

Routes: `/go`, `/vao-khoa-hoc`, `/api/webhooks/resend`, `/api/resend/webhook`.

Files: `lib/notifications/email-link-bridge.ts`, `lib/notifications/pending-payment-email.ts`, `lib/notifications/payment-success-email.ts`, `lib/notifications/student-access-email.ts`.

Environment: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`.

Guard: canonical email links stay on `www.theanhmarketing.com` and use `/go`; preserve frame exemptions for `/go` and `/vao-khoa-hoc`.

## Facebook Ads ebook

Routes: `/doc-thu/ebook-facebook-ads-2026`, `/thu-vien/facebook-ads`, `/api/ebook/facebook-ads/page`, `/api/ebook/facebook-ads/pdf`.

Files: `components/ebook/facebook-ebook-reader.tsx`, `lib/ebook/facebook-ebook.ts`, `lib/ebook/facebook-ebook-access.ts`, `data/facebook-ebook-manifest.json`.

Guard: paid/private pages must be served through access checks; do not expose the source bucket publicly.

## Meta tracking

Files: `components/auth/register-form.tsx`, `lib/meta/conversions-api.ts`, `proxy.ts`.

Environment: `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_CAPI_DATASET_ID`.

Guard: keep one production Pixel; checkout must continue even when browser tracking is skipped.

## Google Sheets order backup

Routes: `/api/orders/sync-google-sheet`, `/api/admin/leads/resync-google-sheet`.

Files: `services/orderSheetSyncService.ts`, `lib/notifications/google-sheets-order-sync.ts`, `scripts/backfill-google-sheets-orders.mjs`.

Environment: `GOOGLE_SHEETS_WEBHOOK_URL`, `CRON_SECRET`.

Guard: order payload and lead payload are different contracts; preserve text formatting for phone numbers.
