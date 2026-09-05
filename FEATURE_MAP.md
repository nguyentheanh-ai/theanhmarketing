# Feature Map - theanh-main

## 2026-09-05 - Đặt lịch theo thời lượng đã triển khai và kiểm tra

- Anh đã xác nhận “làm đi em”. Bản mã `ae7fcdaaeff0df6d7420faa81ef0a159dbf1fb21` đã được tích hợp và đẩy lên nhánh chính thức `codex/production-canonical-20260826`; kiểm tra trước phát hành đạt. Bản thử `dpl_CkoZgg1dHU1XFHQHSAXC6cTNJQcp` đã dựng thành công; bản chính thức `dpl_DagSJSL4JnARvKKZD5GLBokCMbQD` ở trạng thái READY trên cả tên miền chính và www.
- Migration `20260905055235_support_booking_public_duration.sql` đã áp dụng vào Supabase `vsxxgdzwtscuxcmjfckt`. Tên file đồng bộ với phiên bản do công cụ ghi nhận; hai cột, bốn ràng buộc và quyền RPC đã đọc lại. Anon/authenticated không được gọi RPC giữ lịch; service_role được phép. Không có lịch cũ sai giá hoặc thời lượng sau cập nhật.
- Trang `/dat-lich-ho-tro` trả 200 cho khách chưa đăng nhập trên cả hai tên miền, hiển thị hai bảng giá và lựa chọn 60/90/120 phút cho khách. Bản HTML công khai có đủ giá 2M/2.7M/3.4M, thông tin học viên 1M/30 phút +500K/30 phút, và không có thông báo vận hành nội bộ.
- API lịch trả 200, minLeadDays=3, cửa sổ 08/09–05/10/2026; cả bốn Chủ nhật đóng, không có giờ trống. Yêu cầu khách chưa đăng nhập tự khai loại học viên và chọn30 phút bị từ chối400 do thời lượng, trước khi tạo dữ liệu. Trang thành công trả200 và dùng nội dung theo thời lượng đã chọn.
- Năm trang bán hàng đang chạy đều trả200; bốn trang HTML tĩnh có SHA-256 không đổi so với trước phát hành. Trang Agent Kit dựng động có HTML thay đổi, mã nguồn trang không có diff. Kiểm tra nhật ký lỗi bản chính thức trong15 phút sau phát hành không có dòng lỗi.
- Bằng chứng trước phát hành:38/38 kiểm tra riêng,39/39 kiểm tra giao diện doanh thu bắt buộc, TypeScript và bản dựng104/104 trang đạt; bốn lỗi bộ kiểm tra toàn dự án vẫn là lỗi cũ ở Facebook Ads. Không kiểm tra giao dịch thanh toán thật, email, Telegram hoặc đăng nhập học viên trên trình duyệt; giá học viên và QR được kiểm tra trong bộ test với mã nguồn đã phát hành.
- Công việc hoàn tất. Điểm quay lại ứng dụng trước phát hành: `dpl_Ato9Hd5NcF5t5cAcARznvezmri5S`; giữ migration cộng thêm nếu cần quay lại. Chi tiết: `docs/SUPPORT_BOOKING_PUBLIC_DURATION_20260905.md`.


## 2026-09-05 - Public support booking with selectable duration (LOCAL VERIFIED)

- Feature branch `feat/support-booking-public-duration-20260905`, root `support-booking-public-duration-20260905`, based on canonical e3b0b2b. Production still runs the prior three-day/Sunday release. This section supersedes the fixed-duration/auth-only descriptions below for the candidate only.
- Student: 30/60/90/120 minutes = 1M/1.5M/2M/2.5M. Public consultation: 60/90/120 minutes = 2M/2.7M/3.4M. Student tier requires authenticated paid-course eligibility; guest contact fields are public. Missing student phone can be supplied without losing eligibility.
- Shared duration pricing drives order/item/QR; interval occupancy and private RPC v2 prevent overlaps. Existing support slug, historic amounts, SePay/fulfillment and separate 500K consultation contract remain. No internal notices on public pages; calendar day+3..+30 and Sundays closed remain.
- Focused support 38/38 including local PostgreSQL migration; required prebuild 39/39; TypeScript/Webpack build 104/104; targeted lint 0 errors, one existing CRM warning. Full suite runtime 648/652 with four unchanged Facebook Ads baseline failures; one later public-page test also passes.
- Migration `20260905055235_support_booking_public_duration.sql` NOT APPLIED; production NOT DEPLOYED; no real transaction or outbound notification. Full source map, test limits, migration sequence and rollback: `docs/SUPPORT_BOOKING_PUBLIC_DURATION_20260905.md`. Owner production approval is the next action.


## 2026-09-05 - Support booking: three-day notice, Sundays closed, customer copy

- Status: LIVE / READY on 2026-09-05. Owner-approved release and production readback completed.
- Owner approved production release with “ok”. Runtime commit `168abe2a9f8bc1078e2f4abb8f6839860d1a0aff` was pushed to the registered canonical branch; remote preflight passed. Git preview `dpl_8UQzcoXzmLoa9PEJ7NNN7S6Sz56u` built successfully and was promoted through Vercel's production rebuild as `dpl_Ato9Hd5NcF5t5cAcARznvezmri5S` (READY), with apex and `www` aliases verified. Rollback target: `dpl_3fFL3SV8nNYT87vVUkUxU4zeyHbm`.
- Live readback: `/api/support-bookings/availability` HTTP 200, `minLeadDays=3`, window 2026-09-08 through 2026-10-05, all four Sundays in that window marked busy with zero available slots. The success page returns HTTP 200 with customer preparation copy and no Telegram/internal processing text. The booking page preserves HTTP 307 to login with the correct next path.
- Landing regression readback: all five active landing routes return HTTP 200. Four static landing responses retain their exact pre-release SHA-256; the dynamic Agent Kit route has changing framework markup, while its active JS/CSS assets remain byte-identical to unchanged source. Source diff excludes every landing/payment/notification surface.
- Production runtime error scan: zero error rows for the new deployment in the 15-minute query window after smoke checks. No real booking/order/payment, email or database mutation was performed. Logged-in customer/owner browser DOM was not inspected; no-internal-notice parity is established by local rendering tests and exact deployed commit provenance.
- Preview limitation diagnosed: the previous and new preview both return HTTP 503 / permission denied for `support_busy_dates`. The Vercel environment listing shows the service-role credential is Production-only; current production readback succeeded before and after release. No credential, grant or deployment-protection changes were made.

- Scope: main-site `/dat-lich-ho-tro`, its success page and the existing CRM support calendar. The shared minimum is 3 Vietnam calendar days; maximum remains 30 days. Every Sunday is unavailable in the customer/admin calendars and in server availability, booking validation and admin reopening validation.
- Customer copy: removed all owner-preview notices and Telegram/internal processing text; customer and owner render the same form. Calendar labels distinguish days not yet open, Sundays and unavailable dates.
- Preserved: verified owner eligibility, existing paid-student eligibility, price/duration, reservation conflict protection, live holds, payment/SePay, notifications, tracking and existing confirmed bookings. No migration is required: production RPC catalog confirms only service_role can reserve; anon/authenticated cannot call it directly.
- Source: `lib/support-booking/constants.ts`, `lib/support-booking/domain.ts`, `services/supportBookingService.ts`, both support calendar components and `app/dat-lich-ho-tro/thanh-cong/page.tsx`; existing support tests updated plus `tests/support-booking-schedule.test.mjs`.
- Verification: focused support/guide 26/26; customer and owner static renders match and hide internal notices; Sunday/lead-time requests fail before DB access; confirmed/live-hold/expired-hold/busy-date handling is covered. TypeScript passes; targeted ESLint has 0 errors and 1 unchanged CRM warning. Required revenue-critical prebuild passes 39/39. Final Webpack production build passed (104/104 routes); git diff --check passed.
- Baseline limits: full Node suite 633/637 with 4 failures in unchanged Facebook Ads event/legacy hero/sticky tests. Failing test files and all relevant landing inputs were byte-compared to unchanged HEAD `a5f7265`. Full ESLint still reports 103 existing errors / 7275 warnings, mainly bundled public JS and an unrelated preorder test. No unrelated landing or lint cleanup was made.


## Public Meta Ads audit workbook

Route: `/tai-lieu`; file: `/tai-lieu/checklist-audit-tai-khoan-quang-cao-meta.xlsx`.

Source: `public/tai-lieu/checklist-audit-tai-khoan-quang-cao-meta.xlsx`, `data/resources.ts`, `services/resourceService.ts`, `app/tai-lieu/page.tsx`.

Behavior: the approved workbook is available as a direct download from the existing `Checklist audit tài khoản quảng cáo` card. If the Supabase row has no `file_url`, only the exact slug `checklist-audit-tai-khoan-quang-cao` receives the bundled file path; an explicit database URL still wins.

Live proof: production deployment `dpl_BqNGMkHfSKHzppx63CnFpdscveWn` from commit `0a30e87`; page/file HTTP 200 and live SHA-256 `95fc443894030c8fd57034c9f949fbb88676545475ced7e94e2df4fe41d9465f` equals the approved workbook.

Guard: do not create a duplicate resource row, upload customer data, or move the file into the student-resource app. Payment, Auth, LMS, Pixel/CAPI and active landing pages are outside this feature.

## Paid student support booking - 1.000.000đ

Product: server-known `support-session-30m`, fixed at 1.000.000đ for every new order and 30-minute booking.

Routes: `/dat-lich-ho-tro`, `/thanh-toan/[code]`, `/admin/crm-v2/support-bookings`, `POST /api/support-bookings`, existing SePay paid-confirmation flow.

Files: `lib/support-booking/constants.ts`, `components/support-booking/support-booking-form.tsx`, `services/supportBookingService.ts`, `services/orderService.ts`, support checkout/admin pages and `tests/support-booking-*.test.mjs`.

Database: `public.support_bookings.amount` defaults to 1.000.000đ. Constraint accepts 500.000đ or 1.000.000đ only so historical 500.000đ rows remain intact; application code creates new rows/orders at 1.000.000đ.

Guard: do not apply this price to the separate Marketing & AI consultation product, which remains fixed at 500.000đ. Admin history must render each booking's stored amount rather than relabeling old rows.

## Accounting paid-order notification

Description: Sends one internal accounting email for every first transition to `paid`, including courses, Ebook products, consultations, support bookings and manual confirmations. Requested invoice details are included when present.

Routes: `POST /api/sepay/webhook`, `POST /api/payment/confirm`.

Files: `lib/notifications/accounting-payment-email.ts`, `services/accountingNotificationService.ts`, `services/orderService.ts`, `app/api/payment/accounting-retry/route.ts`, `scripts/backfill-accounting-payment-emails.ts`, `tests/accounting-payment-email.test.mjs`.

Database: `public.orders.accounting_email_sent_at`, `public.orders.accounting_email_last_error`.

Environment: `ACCOUNTING_NOTIFICATION_EMAIL`, existing `RESEND_API_KEY`, existing paid-email sender variables.

Guard: accounting failure must not alter payment/customer fulfillment; never send when the dedicated sent marker exists; backfill defaults to dry-run and must match the configured receiving account or use an explicitly reviewed ambiguous-order allowlist.

Operations: `POST /api/payment/accounting-retry` accepts at most 50 validated order codes, requires the existing SePay API-key authentication, returns aggregate results only and executes with production-only provider credentials.

## Public storefront production release - 2026-08-02

- Canonical production deployment: `dpl_3v4vAeJQFShnQkghuWYoxVfpMCbc`, release commit `8edca42`, status `READY`.
- Active landing mappings are Facebook Ads, Ebook Facebook Ads, AI Master X10 and Bộ Agent Kit. The other six catalog products remain visible and non-clickable as `Sắp ra mắt`.
- Price contract: AI Master and Agent Kit `990.000đ`; Facebook Ads `799.000đ`; Ebook `399.000đ`; all other catalog cards `990.000đ`.
- Protected LMS contract is unchanged: no migration, enrollment, lesson, access or progress mutation belongs to this release.

## Course-cover visual system v2 (local only, 2026-08-02)

Assets: `public/course-thumbnails/*-v2.webp` (10 catalog covers).

Generator: `scripts/generate-course-cover-v2.mjs` composites exact Vietnamese rounded typography over text-free AI-edited 3D backgrounds. Final colors are course-specific cobalt, cyan, violet, magenta, orange and gold; cover text avoids black/gray.

Consumer: `data/courses.ts` points every public course fallback thumbnail at its v2 cover; `components/content/course-card.tsx` renders the media in a square frame.

Guard: original covers and Ebook page images remain unchanged. This affects presentation only; course identity, pricing, cart, landing links, access, payment and email flows are unchanged.

## Noti-style public foundation (local only, 2026-08-02)

Routes: `/`, `/khoa-hoc`.

Files: `app/page.tsx`, `app/khoa-hoc/page.tsx`, `app/globals.css`, `components/marketing/*`, `components/site/header.tsx`, `components/site/mobile-menu.tsx`, `components/site/footer.tsx`, `components/content/course-card.tsx`, `data/home.ts`, `data/courses.ts`.

Data: homepage reads `getCourses()` and `getTestimonials()`; catalog reads `getCourses()` and derives categories/counts from returned course data. No hard-coded product count.

Interaction: mobile menu, accessible FAQ accordion, keyword search, category filter, hover-lift/media zoom and reduced-motion fallback.

Guard: presentation-only. Preserve order, SePay, email, Auth, entitlement, progress, admin CRM and course service contracts. Homepage alone passes `showOfferPopup={false}` so the approved hero remains unobstructed; selling pages keep the existing offer component.

Release state: local review only; no Vercel preview/production deployment until owner approval and source-of-truth commit gap is resolved.

## Paid support booking

Routes: `/huong-dan`, `/dat-lich-ho-tro`, `/dat-lich-ho-tro/thanh-cong`, `/admin/crm-v2/support-bookings`.

Database: local migration `20260725021737_support_booking.sql`; not applied to production.

Guard: fixed 500.000đ/30 minutes, first seven days unavailable, authenticated paid-course student only, identity sourced from the paid order, paid-only admin/Telegram confirmation, no student-account provisioning for support orders.

## Captured customer guide

Route: `/huong-dan`.

Assets: `public/huong-dan/01-thanh-toan.webp` through `05-ebook.webp`.

Capture source: local-only checkout/email/login/Dashboard journey; the payment QR is visibly marked demo and the email preview uses the production email builder. No production account, order, payment or email is created.

## Facebook Ads 799K + Ebook 299K checkout add-on

The Facebook Ads registration form defaults to `zoom-kit` at 799,000 VND and exposes one optional `ebookAddon` checkbox. When selected, the browser submits only the recognized plan ID `zoom-kit-ebook-299`; `services/orderService.ts` remains the price authority and emits two order items: `facebook-ads-2026` at 799,000 VND and `ebook-facebook-ads-2026` at 299,000 VND.

The 799K pricing card intentionally has no internal `Chọn gói 799K` button; the adjacent form submit and sticky CTA remain visible, while clicking the selected card still preserves the existing mobile jump behavior.

The combined 1,098,000 VND order uses one SePay QR/order, renders the combined checkout offer, redirects paid customers through the Facebook Ads course thank-you route, grants both products, and sends combined pending/success emails with Ebook reader/PDF links. Exact item lookup also supports fallback rows whose `course_slug` contains comma-separated slugs. Standalone Ebook price and flows remain unchanged. No database migration. Live in production deployment `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55`.

Pending-payment subject normalization: a 799,000 VND Facebook Ads order is buyer-facing as `Gói AI Agent 799K - Tặng AI Agent lên kế hoạch quảng cáo`; the retired Zoom wording must not reappear. Bundle orders keep the combined Facebook Ads + Ebook title.

Files: `public/ladipage/facebook-ads-2026.html`, `public/academy/facebook-ads-master-2026.html`, `services/orderService.ts`, `app/thanh-toan/[code]/page.tsx`, `components/payment/payment-status-poller.tsx`, `app/api/sepay/webhook/route.ts`, `lib/notifications/payment-success-email.ts`, `lib/notifications/pending-payment-email.ts`.

## Facebook Ads Master 2026 public offer

Description: `/academy/facebook-ads-master-2026` sells the ability to build and operate a Facebook Ads system with Data & AI, not a curriculum. The canonical order is `dau-trang`, `van-de`, `tich-luy`, `ket-qua`, `agent-tu-dong-len-quang-cao`, `feedback`, `giang-vien`, `bo-cong-cu`, `gia-tri`, `hoc-phi`, `faq`, `bat-dau`.

Content contract: no visible/hidden lesson list, `Bài 1/Bài 2`, `21 bài`, six-module accordion or `#lo-trinh`. `#ket-qua` contains exactly 12 buyer outcomes. `#tich-luy` states that advertising is a compounding asset immediately after the pain section. `#feedback` keeps exactly five content-rich proof images and excludes the call-duration-only gallery.

Agent/support contract: AI Agent is core, not a bonus. It researches/plans and directly creates Campaign – Ad Set – Ads in `PAUSED` for review. The 799K offer includes the video course, AI Agent and implementation tools. Zoom 1:1 is a separate service and is not included in 799K.

Value/CTA contract: the value stack immediately precedes checkout and uses `Giá trị`: 2.999.000đ + 1.999.000đ + 999.000đ = 5.997.000đ, revealed at 799.000đ. Primary CTA is `Nhận toàn bộ hệ thống Facebook Ads – 799.000đ`.

Routes: `/academy/facebook-ads-master-2026`, static compatibility route `/academy/facebook-ads-master-2026.html`, order API `/api/orders`, checkout `/thanh-toan/[code]`.

Main files: `public/ladipage/facebook-ads-2026.html`, `public/academy/facebook-ads-master-2026.html`, `public/landing-assets/facebook-ads-event-contract.js`, `public/ladipage/assets/facebook-ads-agent-demo.gif`, `public/ladipage/assets/facebook-ads-agent-demo-poster.webp`, `public/ladipage/assets/zalo-support/*.webp`, `tests/facebook-ads-landing.test.mjs`, `tests/facebook-ads-event-contract.test.mjs`.

Meta event contract: `EngagedView` fires once after 30 visible seconds; `ScrollDepth` fires once per threshold at 50/75/90; `CTAClick` binds only the six annotated primary CTAs and sends `cta_id`, `cta_text`, and absolute `destination_url`. All three use `fbq('trackCustom', ...)`. `VideoProgress` is intentionally inactive/`NOT_APPLICABLE` until a real `<video data-meta-video-id>` exists; the current looping proof is a GIF, not a video.

Standard-event preservation: keep `PageView`/`ViewContent`; send browser `Lead` only after `/api/orders` accepts the request and returns an order code, reusing the existing `leadId` for browser/server dedup. Do not fire `InitiateCheckout` before the order/checkout context. Purchase remains server-authoritative with stable order-code `event_id`, value, VND currency, content IDs and the durable dedup/outbox flow.

Guard: keep source and published HTML byte-identical; preserve `paymentPlan=zoom-kit`, optional `zoom-kit-ebook-299`, shared invoice fields, `/api/orders`, Pixel/CAPI attribution, `ViewContent=799000`, title/meta/canonical, historical order compatibility and the separate Ebook landing. Do not restore the 399K card, curriculum, call-duration proof gallery or Zoom-included wording without owner approval. Keep the Agent GIF below 12 MB with its reduced-motion poster.

Release state: LIVE from runtime commit `17bdabb`, Vercel `dpl_9deCAWFg8Uuwixw9WGqtMdsqgpmL` (`READY`) on `www.theanhmarketing.com`. Exact live HTML/JS hashes match the release artifact; rollback target is `dpl_CpvZrvvxbQQauZkbAUi8dmTRoWvG`.

Search: `data-outcome-card`, `proof-case-card`, `data-plan-card="zoom-kit"`, `paymentPlan`, `799000`, `Facebook Ads P0 rewrite`.

## Facebook Ads lesson reference downloads

Description: The `facebook-ads-2026` learning room shows seven customer-safe resources immediately below the lesson video and above the lesson title/progress actions: six independent Master Prompt TXT downloads and one external Google Sheet advertising-script demo.

Routes: `/learn/facebook-ads-2026/[lesson]` through the existing dynamic `/learn/[course]/[lesson]` route. Other courses receive an empty pack list and keep their current layout.

Main files: `data/course-reference-packs.ts`, `components/course/course-reference-library.tsx`, `components/course/learning-room.tsx`, `app/learn/[course]/[lesson]/page.tsx`, `public/course-resources/facebook-ads-2026/master-prompts/*.txt`.

Guard: resource cards are download/open actions only; do not restore inline previews unless the owner asks. TXT files must match the approved source artifacts byte-for-byte. External Sheet links open in a new tab and must not use the HTML `download` attribute. Do not add real Ads reports, customer/CRM data, account screenshots, secrets, duplicated assets or unlabelled performance claims. Preserve lesson-specific `currentLesson.resources`, auth, enrollment, progress, video, previous/next navigation, payment, email and tracking flows.

Search: `getCourseReferencePacks`, `CourseReferenceLibrary`, `referencePacks`.

## Canonical Admin Executive Operating System

Description: Single owner-facing admin shell for paid revenue, orders, customers, students, courses, email, automation, reports and operational actions. CRM v2 is canonical; the previous Solo Command Center remains legacy source, not a separate owner destination.

Routes: `/admin` and `/admin/dashboard` redirect to `/admin/crm-v2`; legacy `/admin/leads`, `/admin/don-hang`, `/admin/hoc-vien`, `/admin/khoa-hoc`, `/admin/bao-cao` redirect owners to matching CRM v2 destinations. `/admin/viec-can-xu-ly` remains until queue parity.

Main files: `app/admin/crm-v2/page.tsx`, `components/crm-v2/crm-components.tsx`, `lib/crm-v2/data.ts`, `lib/crm-v2/query.ts`. Legacy Solo Command Center files are retained for rollback/reference only.

Chart groups: conversion funnel, paid revenue by day, lead source, email performance and paid course performance. KPI and task panels use production data; RPC failure falls back to direct production queries.

Data: `public.orders`, `public.leads`, official course catalog, `crm_v2.enrollments`, bounded `public.activity_logs`.

Migration/RPC: `supabase/migrations/20260711100000_command_center_reporting.sql` provides the bounded service-role `crm_v2_command_center_enrollments_page` reader. It must be compiled, verified and applied before this command-center build can use LMS reporting in preview/production.

Search: `getCrmV2Dashboard`, `CrmShell`, `primaryNavItems`, `CrmRouteFeedback`, `CourseLmsManager`.

Guard: never infer revenue from free/trial access; never synthesize leads; preserve Vietnam calendar boundaries; fail each source independently; never put contact PII in task text or URLs; do not replace bounded reads with workspace-wide or unpaginated scans.

## Lazy student activity timeline

Route: `POST /api/admin/students/activity` with one student email in a bounded JSON body.

Main files: `components/admin/student-activity-timeline.tsx`, `services/activityLogService.ts`, `app/api/admin/students/activity/route.ts`.

Guard: initial student-list render must not issue per-row activity requests. Timeline opens on demand, selects only allowlisted fields, returns at most 20 records and aborts stale/cross-student responses.

## Admin student provisioning orchestration

Description: Safely coordinate paid, free, or trial account creation, access grants, email dispatch, and replay recovery through one durable operation journal.

Routes: `/admin/hoc-vien?add_student=1`, `POST /api/admin/students/grant`, `GET /api/admin/students/provisioning-status`, `POST /api/admin/students/provisioning-review`.

Main files: `components/admin/student-provisioning-wizard.tsx`, `lib/admin/student-provisioning-request.ts`, `services/studentProvisioningService.ts`, `services/studentProvisioningOperationService.ts`, `services/studentProvisioningControlService.ts`, `services/studentAccountService.ts`, `services/lmsService.ts`.

Database: `public.admin_student_provisioning_operations`, `public.orders`, `public.leads`, `public.activity_logs`, `crm_v2.enrollments`.

Migration: after the reporting migration, apply `supabase/migrations/20260711110000_admin_student_provisioning_operations.sql`, then `supabase/migrations/20260711120000_student_provisioning_idempotency.sql`.

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

## Student access and LMS Course Hub

Routes: `/dashboard`, `/learn/[course]/[lesson]`, `/admin/crm-v2/students`, `/admin/crm-v2/courses`, `/admin/course-studio/[courseSlug]?step=<step-id>`, legacy redirect `/admin/crm-v2/courses/[courseSlug]`, `/api/admin/crm-v2/lms`, `/api/student/progress`.

Files: `services/lmsService.ts`, `services/studentAccessService.ts`, `services/studentAccountService.ts`, `components/crm-v2/course-hub.tsx`, `components/crm-v2/lms-management-client.tsx`, `components/admin/student-create-dialog.tsx`, `lib/student-dashboard-courses.ts`.

Student learning-room display: `components/course/learning-room.tsx` receives the already module-sorted flat lesson array from `/learn/[course]/[lesson]` and renders `Danh sách bài học` as one continuous `1..N` sequence without module-group headings. Module metadata remains available for the active lesson; lesson order, access and progress behavior are unchanged. Guard: `tests/learning-room-youtube-layout.test.mjs`.

Database: `public.courses`, `public.course_modules`, `public.lessons`, `public.lesson_resources`, `crm_v2.enrollments`, `crm_v2.course_progress`.

Feature map: Course Hub lists/searches/creates/reorders courses. Selecting a course opens the owner-only Course Studio in a new tab: Overview → Sales Content → Curriculum → Media & Resources → Students & Access → Analytics → Review & Publish. Only the active section renders; lesson work opens in a modal. Student creation belongs to `/students` and uses the provisioning wizard, never raw enrollment.

Search: `CourseLmsManager`, `courseSteps`, `CurriculumWorkspace`, `CourseAnalytics`, `PublishReview`, `lmsService`, `enrollments`, `course_progress`, `publishedLessonsOnly`.

Guard: private/draft lessons must not leak before authentication/entitlement checks.

## Solo executive dashboard and Meta Ads reporting

Routes: `/admin/crm-v2?range=today|7d|30d|90d`, `/admin/crm-v2/reports`.

Files: `app/admin/crm-v2/page.tsx`, `components/crm-v2/dashboard-charts.tsx`, `lib/crm-v2/revenue-series.ts`, `lib/crm-v2/order-summary.ts`, `lib/crm-v2/data.ts`, `lib/meta-ads/timezone.ts`, `services/metaAdsReportService.ts`.

Data: paid `public.orders`, CRM lead/source/event rows and Meta Marketing API Insights. Today uses 24 Vietnam-time hourly buckets; 7/30 days use daily buckets; 90 days use weekly buckets. Meta hourly rows are first interpreted in the ad account's IANA timezone, including DST, and then grouped by Vietnam calendar day/hour.

Environment names: `META_ADS_ACCESS_TOKEN`, `META_ADS_AD_ACCOUNT_ID`, optional `META_API_VERSION`.

Search: `DashboardCharts`, `buildAdaptiveRevenueSeries`, `getMetaAdsReport`, `hourly_stats_aggregated_by_advertiser_time_zone`, `revenueResolution`.

Guard: never synthesize Ads or revenue. If Supabase or Meta is unavailable, show an explicit unavailable/empty state and do not calculate profit from zeros.

## CRM V2

Routes: `/admin/crm-v2`, `/admin/crm-v2/leads`, customer profile `/admin/crm-v2/leads/[id]`, `/admin/crm-v2/reports` and matching `/api/admin/crm-v2/*` routes. Legacy `/admin/crm-v2/orders` and `/admin/don-hang` redirect to Customers; order history is visible only in each customer profile.

Files: `lib/crm-v2/data.ts`, `lib/crm-v2/query.ts`, `lib/crm-v2/types.ts`, `components/crm-v2/leads-page-client.tsx`, `components/crm-v2/orders-page-client.tsx`.

Database: `public.leads`, `public.orders`, CRM V2 schema/RPCs in `supabase/migrations`.

Guard: protected routes must redirect/return 403 when unauthenticated, never become 404 after deploy.

Stable course entry: `/learn/[course]` resolves the current first published, student-ready lesson from the shared LMS source and redirects to `/learn/[course]/[lessonId]`. Both routes use `lib/course-learning.ts` for identical module/lesson ordering, so Course Studio reordering changes the destination without a hard-coded lesson ID. Missing, unpublished, or empty courses remain `404`; the existing lesson route continues to own authentication and entitlement checks. Live since production `dpl_2fUT489jFwfozhPerCC9NRsHSJCe` from commit `9264957` on 2026-07-22.

Course identity guard: keep `course`, `courseShort` and `courseSlug` atomic. Priority is paid public order, paid CRM order, other order, explicit mapped lead, inferred lead, unknown. Derive the short label from both title and slug: `ebook-facebook-ads-2026` must display `Ebook` even when its customer-facing title only says `Thư viện kiến thức Facebook Ads 2026`; `facebook-ads-2026` remains `FB Ads`. Match Ebook as a standalone word, never match the `ebook` substring inside `Facebook`, and preserve the title-only three-word fallback for non-target products.

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

Durable Purchase delivery: `lib/meta/purchase-outbox.ts` claims eligible paid orders through service-role RPCs defined by `supabase/migrations/20260727150000_meta_purchase_outbox.sql`. SePay, protected manual confirmation and manual paid provisioning dispatch immediately; `/api/meta/purchase-retry` plus the Vercel cron recovers eligible failures. The outbox accepts only real paid timestamps within seven days and keeps `event_id=order_code` stable for Meta deduplication.

Production state (2026-08-03): deployment `dpl_FxVx4S3tVtuiVzvtTfLLtVvkobNB` is live. The cron secret was rotated and authenticated recovery sent the only due seven-day event; database readback is 0 unsent/0 due and the successful row has a Meta trace ID.

Guard: keep one production Pixel; checkout must continue even when browser tracking is skipped.

## Google Sheets order backup

Routes: `/api/orders/sync-google-sheet`, `/api/admin/leads/resync-google-sheet`.

Files: `services/orderSheetSyncService.ts`, `lib/notifications/google-sheets-order-sync.ts`, `scripts/backfill-google-sheets-orders.mjs`.

Environment: `GOOGLE_SHEETS_WEBHOOK_URL`, `CRON_SECRET`.

Guard: order payload and lead payload are different contracts; preserve text formatting for phone numbers.

## 2026-08-02 - Course pricing display and legacy offer cleanup

| Tính năng | Trạng thái | App/route | Flow giữ nguyên | Ghi chú |
|---|---|---|---|---|
| Giá khóa học thống nhất | LOCAL READY | `main-site` `/`, `/khoa-hoc`, `/khoa-hoc/[slug]` | Slug, cart, order parsing, đăng ký và thanh toán | 8 khóa giá `990.000đ`; Facebook Ads `799.000đ`; Ebook `399.000đ`; không dùng hậu tố `K` trong course catalog data |
| Gỡ popup ưu đãi cũ | LOCAL READY | Public `PageShell` và course sales page | Admin CMS offer settings còn nguyên; cart/order/payment/email/access không đổi | Xóa public popup component và CSS mobile cũ; không còn trigger/popup trên public pages |

## 2026-08-02 - Simplified public services and student self-service

| Tính năng | Trạng thái | App/route | Flow giữ nguyên | Ghi chú |
|---|---|---|---|---|
| Public IA tối giản | LOCAL READY | `/`, `/dich-vu`, `/khoa-hoc`, `/tai-lieu`, `/workshop` | Homepage sections and visual foundation | Legacy public routes removed and excluded from sitemap; header/footer contain only approved destinations |
| Course availability gate | LOCAL READY | `/khoa-hoc` and homepage cards | Exact four existing academy landing pages | 10 products total; 4 live and 6 non-clickable `Sắp ra mắt` |
| Paid consultation intake | LOCAL READY | `/dang-ky-tu-van`, `/api/consultations`, `/thanh-toan/[code]` | Existing order and SePay confirmation pipeline | Fixed server-side 500.000đ; consultation-specific paid email; no student account/course access provisioning |
| Student account self-service | LOCAL READY | `/dashboard`, `/tai-khoan` | Existing orders, LMS enrollment and access overrides | Authenticated header switches to My Courses/Account; name, phone, verified email and password updates preserve ownership/history |

## 2026-08-02 - AI landing and catalog completion

| Tính năng | Trạng thái | App/route | Flow giữ nguyên | Ghi chú |
|---|---|---|---|---|
| Logo owns home navigation | LOCAL READY | Shared public header | Existing `/` homepage | No standalone `Trang chủ`; brand/logo remains linked to `/` |
| AI Master landing restored | LOCAL READY | `/academy/ai-master-x10-hieu-suat` | Existing published landing source, order API and checkout | Clean route rewrites to synchronized HTML; 990.000đ UI/tracking/order value |
| Agent Kit 990K alignment | LOCAL READY | `/academy/bo-kit-agent-doanh-nghiep` | Existing form, order API and payment route | Client/server/demo checkout all use `agent-kit-standard-990` and 990.000đ |
| AI product covers v3 | LOCAL READY | `/khoa-hoc`, shared `CourseCard` | Exact 10-course catalog and 4-live/6-coming gate | Only Agent Kit and AI Master use the new generated square covers |
## 2026-08-02 - Owner full access and account UX clarity

| Tính năng | Trạng thái | App/route | Flow giữ nguyên | Ghi chú |
|---|---|---|---|---|
| Owner full catalog access | PRODUCTION DATA DONE | Supabase Auth, `public.leads`, `crm_v2.enrollments` | Existing Auth identity and entitlement resolver | Exact confirmed owner user has 10 idempotent grants and 10 active enrollments; no password/order/payment/email mutation |
| Clear account self-service | ACTIVE | `/tai-khoan` | Existing Supabase Auth update calls and owned-course snapshot | Profile stays visible; email/password live in one closed-by-default change card; password verifies the current credential before update; `/doi-mat-khau` recovery remains intact |
| Owner booking preview | ACTIVE | `/dat-lich-ho-tro`, `/api/support-bookings` | Normal customers still require a paid non-support order | Server-verified owner can preview with existing identity; final submission still creates a real pending 500.000đ order |

## 2026-08-03 - Zalo ZBS pending-course-payment reminder

| Tính năng | Trạng thái | App/route | Flow giữ nguyên | Ghi chú |
|---|---|---|---|---|
| Nhắc thanh toán ZBS sau 5 phút | LOCAL READY / DISABLED | `main-site` `/api/zalo/pending-payment/send-due` | Existing order status, SePay confirmation, email and access provisioning | Exact Facebook Ads course/Ebook scope; reread pending before send; lease, retry and permanent sent marker prevent duplicates |
| Mở app ngân hàng an toàn | LOCAL READY | `/thanh-toan/[code]?openBank=1` | Existing QR, copy details, polling and SePay | Official VietQR app directory; customer gesture required; QR/copy stays as fallback |
| Zalo OAuth rotation | LOCAL READY / NOT SEEDED | Private schema + service-role RPCs | Existing Supabase service role boundary | Atomic rotating refresh token; no credential in committed artifacts |
| ZBS production rollout | BLOCKED BY EXTERNAL GATES | Zalo ZBS + Supabase Cron | Fail-closed feature flag | Requires approved template, applied migration, controlled test and owner-approved daily cap before enablement |

## 2026-08-21 - Premium Ebook conversion landing

| Feature | Status | Code | Flow giữ nguyên | Ghi chú |
|---|---|---|---|---|
| Landing thư viện tra cứu 471 trang | LIVE | Premium Ebook source/published HTML pair | 399K, bundle 1.098M, invoice, order, SePay, email, access | Commit `a4db95a`; production `dpl_Ak1fTmaTMb2NnKvrTtW4CtnjqpTh`; P0/P1 theo workbook |
| Honest-price/trust guard | LOCAL CONTRACT LOCKED | Landing + `tests/ebook-facebook-ads-landing.test.mjs` | Server-known plans và giá khóa add-on giữ nguyên | Không dùng Ebook old-price 799K; không bịa testimonial, lifetime, update hoặc refund |
| Mobile 320px containment | LOCAL READY | Scoped `<=339px` offer/form CSS | Form fields, invoice helper và checkout JS không đổi | Browser readback `scrollWidth=clientWidth`; 390/1440 cũng không overflow |
| Header-free visual hero | LIVE | Premium Ebook hero HTML/CSS + regression test | CTA, form, order API, SEO và Pixel/CAPI không đổi | Book + 2 page previews + 471/10/2026 facts; production Browser 1440/390/320 đạt |
| Compact hero facts and buttons | LIVE | Premium Ebook hero/button CSS + regression test | Commerce/tracking/SEO unchanged | Bỏ 3 caption; nút 14px, page arrow 12px; live hash khớp local |

## 2026-09-04 - Checkout and Facebook Ads rendering stability

| Feature | Status | Code | Flow giữ nguyên | Ghi chú |
|---|---|---|---|---|
| Checkout compositor stabilization | PRODUCTION | `/thanh-toan/[code]`, payment countdown, Zalo proof gallery | QR/SePay, polling, invoice, pricing, email/access and tracking unchanged | Runtime `7846ba4`, production `dpl_3fFL3SV8nNYT87vVUkUxU4zeyHbm`; removes full-screen blur and perpetual transform animation; all 12 Zalo proofs remain in a manual snap scroller |
| Facebook Ads landing compositor stabilization | PRODUCTION LIVE VERIFIED | Synchronized Facebook Ads source/published HTML + regression tests | Offer, form, order API, Pixel/CAPI, CTA and SEO unchanged | Live/source SHA-256 matches; zero running animation/backdrop blur/broken image/overflow/browser error; finite interactions remain |
