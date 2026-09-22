# Feature Map - theanh-main

- 09/09 LIVE: Pixel1369910554822777 dùng cho cả Codex và Bộ Kit, runtimebf7ad8a/prod dpl_5Rb61wiJraXsjNj7fre9E9jKFkWt. Mã live/tests đã kiểm tra; browser receipt vẫn chưa xác minh do giới hạn kiểm tra trước đó.

- 09/09: Pixel Codex mở rộng cho exact route `/academy/bo-kit-agent-doanh-nghiep` và checkout có attribution từ route này; giữ primary và Codex landing. Dùng cùng CAPI token, event_id và outbox; không chọn theo course slug cho các landing ngoài phạm vi.

- Pixel Codex1369910554822777: runtime6fd734e LIVE, routing trong lib/meta/codex-pixel.ts, lib/tracking/events.ts, lib/meta/conversions-api.ts và payment poller. Khóa Production/Secret đã lưu; Meta nhận3 CAPI test events. Browser receipt chưa xác nhận vì ERR_BLOCKED_BY_CLIENT; handoff docs/CODEX_PIXEL_20260908.md.

## 08/09/2026 — Landing Codex cho hiệu suất cá nhân

LIVE: runtime1f54159 / production `dpl_5pNYu49hDr8WdGznt5EVKvsoUccG` READY; kiểm tra lại trên www/apex, browser 4 viewport và nhật ký lỗi đạt. Không thay backend/giá/quyền học.

`app/academy/codex-x10-hieu-suat/`: landing riêng, cùng Agent Kit. 15 section; marketer/freelancer/văn phòng; 8 kết quả và SVG/CSS chuyển động; 7 video thực tế; form dùng server plan/phase hiện hữu, giá chính thức/ưu đãi/cọc rõ ràng; sticky ẩn khi nhập; lỗi tracking không chặn mua. Bốn browser harness trong `tests/codex-*-browser.mjs`, không gửi đơn thật. Backend/shared assets/schema không thay. Xem `docs/CODEX_LANDING_20260908.md` để biết trạng thái phát hành và giới hạn kiểm chứng.

## 06/09/2026 — Màu sắc và hiệu năng admin

Đã sửa xung đột CSS cũ gây chữ tối trên nút tối; UI mới dùng palette riêng, cửa sổ tạo học viên dùng modal chung và giữ bản nháp khi đổi chế độ. Form gửi thanh toán thoát trạng thái chờ khi lỗi mạng, khóa gửi lặp. Trang hồ sơ chỉ đọc tóm tắt khóa học, lập chỉ mục quyền theo email và tìm kiếm; Auth chỉ được tra khi mở tab tài khoản. Không thay API ghi, schema, payment hay app học viên. Chi tiết: `docs/ADMIN_UI_POLISH_20260906.md`. Trạng thái: đã phát hành; bằng chứng source/test/build/live được giữ trong workspace riêng.


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


## 2026-09-06 — Wizard đặt lịch hỗ trợ (LOCAL VERIFIED / WAITING OWNER)

- Yêu cầu: đổi `/dat-lich-ho-tro` thành từng bước: câu hỏi học viên chỉ khi chưa login → 4 chủ đề + note tùy chọn → liên hệ chỉ khách → thời lượng/lịch tháng/giờ → kiểm tra và checkout hiện có. Học viên thiếu điện thoại bổ sung tại bước chọn lịch; signed-in nonbuyer vẫn dùng mức phí khách.
- Source: page/form, support constants/domain, migration optional note và support tests. Giữ giá, server eligibility, Auth, order/SePay/email/tracking, lịch +3..+30, Chủ nhật và chống chồng lịch.
- Bằng chứng: 44/44 support gồm SQL và React interactions, 39/39 prebuild, TypeScript, lint thay đổi, Webpack build 104/104, diff check; full 655/659 với 4 lỗi Facebook Ads tái hiện trên canonical, không có diff các file đó. HTTP local 200. Chưa QA trực quan do managed browser policy; không có transaction/send thật.
- Root feature `support-booking-public-duration-20260905`, base canonical `fd847c9`; đã dùng lại root sạch. Chưa apply migration `20260906101941_support_booking_optional_note.sql`, chưa deploy. Handoff đầy đủ: `docs/SUPPORT_BOOKING_WIZARD_20260906.md`. Bản xem trước http://127.0.0.1:3106/dat-lich-ho-tro.

- Full ESLint: 103 errors/7275 warnings, output matches canonical exactly after normalizing root path. Primarily prebuilt public JS and existing test lint; zero changes to those files. Targeted changed-file lint passes. No lint config/baseline fixes included in this UI task.

## 2026-09-06 — Phát hành đã được anh duyệt, migration đã áp dụng

Anh xác nhận “ổn, deloy đi em”. Migration optional note đã áp dụng vào main-site Supabase, phiên bản thực tế20260906101941; tên file đã đồng bộ sổ migration. Readback: note CHECK0..2000, NOT NULL giữ nguyên, RLS bật, anon/authenticated vẫn không được gọi reserve v2. Không ghi/sửa lịch hay tạo đơn thử. Đang tích hợp và phát hành UI qua canonical guard; chưa xác nhận UI live ở thời điểm ghi mục này. Các mục chờ duyệt/migration chưa áp dụng phía trên là lịch sử và được thay thế bởi mục này.

## 2026-09-06 — Wizard đặt lịch ĐÃ PHÁT HÀNH

- Anh xác nhận “ổn, deloy đi em”. Source runtime967af13 (giao diện39d5bf7) đã tích hợp vào canonical sạch, push và qua remote preflight. Preview dpl_261kG3VGbk8UcjrXhmPsxEeQSEmo READY; promote dựng lại bằng cấu hình production thành dpl_EQurKJAEdPwpgqrvZriVj5xq6eDE, READY, domain www và apex đều trỏ đúng bản mới.
- Migration20260906101941_support_booking_optional_note.sql đã áp dụng và đọc lại: CHECK note0..2000, NOT NULL và RLS giữ nguyên, anon/authenticated không có EXECUTE reserve v2; service_role có quyền. Không có note nằm ngoài constraint. Không sửa dữ liệu lịch cũ.
- Live HTTP200 trên cả hai host: chỉ câu hỏi học viên ở màn hình đầu; chưa mount trường chủ đề/liên hệ/lịch. Link login có next đúng; /dang-nhap HTTP200. Client chunks tải200 và chứa đủ bốn chủ đề, mô tả tùy chọn, lịch/thời lượng và checkout CTA.
- Availability200, ngày09/09–06/10/2026; cả4 Chủ nhật đóng. Request kiểm tra dùng ngày quá khứ bất khả thi bị từ chối400 trước reservation, sau khi vượt qua kiểm tra chủ đề AI Agent + note trống; không tạo đơn/lịch hay gửi thông báo. Trang thành công200.
- Năm trang bán hàng200, bốn trang tĩnh giữ SHA-256 hoàn toàn như trước phát hành; source Agent Kit động không đổi. Không có diff ở Auth/API booking/service/order/SePay/notification/payment/landing quảng cáo. Runtime log query15 phút, scoped bản production mới, không có error/fatal.
- Validation44/44 support (SQL + React, không skip) sau đồng bộ tên migration; prebuild39/39, TypeScript/local Webpack104/104 đã đạt ở bản giao diện không đổi; remote preview/production builds đạt. Full test655/659 và full lint103 errors/7275 warnings đều lỗi baseline đã đối chiếu canonical, lint file thay đổi đạt.
- Không kiểm tra browser visual viewport hoặc đăng nhập học viên thật vì managed policy; React interactions và source/build/live readback không phải chứng minh giao dịch thật. Không có thanh toán/email/Telegram thật. Rollback ứng dụng: dpl_DagSJSL4JnARvKKZD5GLBokCMbQD; giữ migration note mở rộng nếu rollback.
- Các mục WAITING_OWNER/chưa áp dụng/chưa deploy ở phần lịch sử đã được thay thế. Task hoàn tất, không còn bước phát hành chờ xử lý. Chi tiết: docs/SUPPORT_BOOKING_WIZARD_20260906.md.

## 2026-09-06 — Bỏ hẳn bước liên hệ khỏi tiến trình học viên

- Theo chỉnh sửa tiếp của anh cho wizard đã duyệt/phát hành: học viên chỉ thấy Nhu cầu → Chọn lịch → Thanh toán, đánh số1..3; không còn mục liên hệ được đánh dấu bỏ qua. Khách ngoài vẫn có bước liên hệ. Signed-in nonbuyer vẫn là khách theo eligibility server; không thay quyền/giá.
- Chỉ sửa `components/support-booking/support-booking-form.tsx` và bổ sung kiểm tra trong wizard test. Regression trước sửa tái hiện5 mục thay vì3; sau sửa44/44 support,39/39 prebuild, TypeScript và targeted ESLint đạt. Không sửa DB/API/Auth/payment/landing. Tiếp tục guarded release trong phạm vi đã được anh duyệt.

### 06/09 — Tiến trình riêng cho học viên đã live

Source7fd20e9, preview dpl_925Zm83HzVnhSC8xaLg68PUY9wZw và production dpl_4LWiJGVLXbCsTsnsgj2RBiMbsE15 đều READY; đã guarded promote trên canonical đúng SHA. Học viên có3 bước Nhu cầu/Chọn lịch/Thanh toán, không có mục liên hệ trên thanh tiến trình; khách ngoài vẫn có. Local React regression44/44 support,39/39 prebuild, TypeScript/lint thay đổi đạt; remote builds đạt. Live www/apex200, bundle không còn nhãn bước bỏ qua và dùng số thứ tự theo luồng; login/availability/success/5 landing đạt,4 static hashes không đổi, runtime error/fatal query rỗng. Không sửa DB/giá/Auth/payment; không có đơn/giao dịch/send thật. Vai trò học viên kiểm tra qua React props và provenance bản deploy; chưa đăng nhập học viên thật bằng trình duyệt. Rollback ứng dụng nếu cần: dpl_EQurKJAEdPwpgqrvZriVj5xq6eDE. Chỉnh sửa đã hoàn tất.

## 06/09 — Sửa nhận diện admin trong wizard

- Ảnh anh gửi chứng minh admin đang ở contact với4 bước. Nguyên nhân: page/API chỉ tra paid course, bỏ qua isAdmin từ getCurrentAuth; sửa thanh tiến trình trước đó chỉ xử lý customer đã có paid order. Regression page→service→form tái hiện4!=3.
- Page và POST đặt lịch nay truyền allowAdminBooking từ isAdmin đã được máy chủ xác minh. Service trả đúng danh tính cùng email admin kể cả không có order; không mượn khách khác, không tạo purchase/entitlement giả. Admin dùng luồng3 bước và bảng giá học viên đã có, đồng nhất page/API. Người dùng thường vẫn phải có paid course; metadata/body tự khai admin không có hiệu lực. Hồ sơ thiếu phone vẫn bổ sung tại lịch như trước.
- Test sau sửa45/45 support (SQL/React/route integration),39/39 prebuild, TypeScript và lint file thay đổi đạt. Kịch bản kiểm tra admin không paid order, nonadmin, giả admin trong body/metadata, đúng danh tính/giá và thiếu hồ sơ. Chỉ sửa page/API/service cùng regression và tài liệu; không đổi DB, global Auth roles, thanh toán/SePay hay quảng cáo. Đang guarded release theo yêu cầu sửa tiếp của anh.

### 06/09 — Admin booking identity fix: ĐÃ PHÁT HÀNH

Runtime fb6ac5b, preview dpl_FTjzRTqwY4xnQXtQ1AzGMuD7Hiz9, production dpl_A9Ekxy7FHuaZiLdoCoNjLbX3cLhb READY. Exact domain readback matches runtime SHA; www/apex booking, login, availability and success return200. Năm landing200 và bốn static hashes không đổi; nhật ký bản mới15 phút không có error/fatal. Live request không đăng nhập tự khai isAdmin/allowAdminBooking cùng30 phút bị từ chối400 trước reservation. Admin/ordinary-user branch and identity/price correctness verified by integrated page/service/form/API tests45/45;39/39 protected prebuild, TypeScript/targeted lint, remote builds pass. Không kiểm tra trực tiếp phiên Chrome của anh do managed policy; ảnh anh gửi là bằng chứng lỗi ban đầu, không coi kiểm tra giả lập là phiên đăng nhập thật. Không tạo đơn/lịch/giao dịch hoặc gửi thông báo. Không có DB/migration/global Auth change. Rollback ứng dụng về dpl_4LWiJGVLXbCsTsnsgj2RBiMbsE15 nếu cần. Task hoàn tất.

Quy tắc hiện tại: học viên có paid course hoặc admin được getCurrentAuth xác minh đi luồng3 bước; khách ngoài vẫn có contact. Chỉ admin có ngoại lệ không cần paid order; không nâng quyền từ request/user_metadata. Bản sửa thanh tiến trình trước đó chưa xử lý admin, nay đã sửa tại nguồn page/API/service.


## 2026-09-06 — Admin hợp nhất: LOCAL_VERIFIED, chưa production

Đã thực hiện yêu cầu sửa end-to-end trong worktree feature, nhánh fix/admin-consolidation-20260906. Một shell/menu, route cũ chuyển hướng, UUID/roles/LMS/khóa slug, quyền học nguyên tử và bảo toàn Auth, báo cáo cùng nguồn/khung thời gian, trạng thái lỗi thật, phục hồi URL qua đăng nhập. Build104/104, prebuild39/39, hành vi14/14, toàn dự án666/670 với4 lỗi baseline Facebook Ads,0skip; PostgreSQL rollback/bảo toàn dữ liệu đạt. Lint file đổi0error/0warning. Không gửi hay ghi dữ liệu khách để QA.

Migration thêm3 RPC chưa áp dụng; chưa deploy. Gỡ file nguồn cũ bị cleanup-policy chặn, các UI đó đã ngừng mount trong ứng viên. Không chỉnh policy. Chi tiết docs/ADMIN_CONSOLIDATION_20260906.md; manifest docs/ADMIN_RETIRED_SOURCE_MANIFEST_20260906.json. Phải kiểm tra release/DB/live riêng, không coi test là chứng minh đăng nhập học viên hay email delivered.


## Phát hành đã được duyệt và DB đã cập nhật

Anh xác nhận “Triển khai bản đã kiểm thử”. Migration thực tế20260906130340_admin_lms_atomic_operations đã áp dụng: đúng3RPC, SECURITY INVOKER, anon/authenticated EXECUTE=false, service_role=true. Các tổng cấu trúc khóa học, enrollment, tiến độ và đơn hàng trước/sau giữ nguyên. Không gọi RPC có ghi dữ liệu khách để QA. Đang tích hợp nguồn ứng viên cdb3b46 vào canonical và triển khai qua guard. Các trạng thái chờ xác nhận/chưa migration ở phía trên là lịch sử.


## Cập nhật hoàn tất

Bản sửa admin đã được phát hành sau xác nhận của chủ dự án. Kiểm tra sau phát hành đạt. Các trạng thái chờ phát hành trong lịch sử phía trên đã được thay thế. Giới hạn xóa vật lý mã cũ và nghiệm thu trực quan vẫn được giữ như bản bàn giao đã duyệt. Bằng chứng vận hành chi tiết được giữ trong workspace và bảng theo dõi riêng của chủ dự án.


## 06/09/2026 — Không gian quản trị theo cửa sổ

Đã làm lại tổng quan/báo cáo với bộ lọc ngày–sản phẩm và các cửa sổ đối chiếu; gộp khách hàng/học viên vào `/admin/crm-v2/customers`; thay trình sửa khóa học bằng cây chương–bài và4tab; lịch hỗ trợ có tháng/tuần/ngày; Cài đặt chia nhóm công cụ. Editor giữ phạm vi học viên, owner quản lý prospects/tài khoản. Các API hiện có tiếp tục phục vụ thao tác; kiểm tra danh tính, parent/nguồn tài liệu và phản hồi lỗi được bổ sung. Không migration hoặc sửa dữ liệu khách để QA, không thay landing/payment/student app riêng. Chi tiết và kiểm thử: `docs/ADMIN_WORKSPACE_20260906.md`. Trạng thái bản sửa này: đã phát hành. Source/test/build đã kiểm chứng; giới hạn nghiệm thu trực quan có đăng nhập và xóa vật lý mã cũ được ghi trong tài liệu bàn giao.

09/09: Codex hero preorder đã live (c5e6ceb, production dpl_3EN2iCuqXyBCGBD34n3DjJFdY12o READY). Live content/CSS,55tests/build và bảo vệ landing đạt; chưa browser visual. Xem docs/CODEX_LANDING_20260908.md.


## 11/09/2026 — Kiểm tra quyền thư viện Agent

Khóa chính xác: **Đội ngũ nhân sự AI**, slug `bo-agent-kit-x10-hieu-suat-cong-viec`. Không thay bằng `ai-agent-master-2026` hoặc `tao-ai-agent-ca-nhan-x10-hieu-suat`. Mỗi khóa là một quyền riêng.

Đã tái hiện nhánh legacy cấp quyền từ đơn paid cọc preorder: API download trả 200 thay vì 403. `getCourseAccessSlugs` nay dùng bộ nhận diện cọc sẵn có, loại riêng Agent Kit khỏi quyền phát sinh từ đơn cọc; giữ các khóa khác trong đơn ghép, đơn đủ tiền/phần còn lại và quyền admin cấp rõ ràng. Không sửa đơn/SePay/giá/email hay enrollment thật.

Kiểm tra cục bộ: 177/177 gồm 24 tình huống x 10 download routes sử dụng mã access, LMS, course-access và signer thật với biên Auth/DB giả lập; 1 ca mixed order; 39 revenue-critical. TypeScript và lint file thay đổi đạt. Bản cũ fail 3 ca cọc; bản sửa pass. Không gọi đây là đăng nhập production hoặc bấm nút thật. File thật đã được tải lại và đối chiếu 10/10 ở receipt bàn giao trước đó.

### Cấp quyền các lần sau
1. Xác minh email/tài khoản và khóa đã mua hoặc được owner chỉ định; không chọn khóa chỉ vì tên có chữ Agent.
2. Khách chỉ đặt cọc: không cấp full access tự động. Đơn phần còn lại/đơn đủ tiền đã paid dùng flow payment hiện có; không replay webhook để thử.
3. Cấp ngoài đơn theo xác nhận owner: dùng thao tác cấp quyền học viên hiện có (`/api/admin/students/access`), chọn đúng slug trên. Flow này có gửi email: chỉ thực hiện khi yêu cầu bao gồm gửi thông báo hoặc đã được cho phép; không dùng gọi API làm dry-run. Không tạo paid order giả.
4. Khách mới dùng luồng tạo tài khoản/cấp quyền chuẩn; quyền trial còn hạn cũng cho tải ZIP nên chỉ cấp trial khi đúng chủ đích. Giữ quyền khóa khác, không đặt lại mật khẩu tài khoản đang dùng nếu không có yêu cầu recovery.
5. Đọc lại quyền đúng email/user, trạng thái active/completed và hạn dùng; kiểm tra tải ở phiên khách nếu có phiên được phép. Thu hồi qua thao tác quản trị đồng bộ LMS + legacy; không chỉ sửa một bảng. Signed URL đã cấp có thể dùng tối đa 120 giây và file đã tải không thu hồi được.

Production RPC `admin_lms_set_student_access` chỉ service_role có EXECUTE; anon/authenticated không có. Audit chỉ đọc, không thay quyền khách. Bản sửa đang chờ phát hành; xem cập nhật bên dưới.


### Đã phát hành bản sửa quyền — 11/09/2026
Source `db9eaa738d3fb5bafa51e459ab712b572fdad8e6`, production `dpl_6JLuE3zZALzRD4eeEQJ82GgBX1e7` READY, Vercel production target khớp. 177/177 tests, TypeScript và targeted lint đạt; 32 live HTTP checks trên apex/www gồm 20 download401 và 12 landing200, ba HTML tĩnh mỗi host giữ hash. 10 ZIP CRC pass; 10 public object URL bị từ chối400; admin grant/access không đăng nhập403. Lỗi cọc đã sửa tại shared course-access; không sửa thông tin hay quyền khách thật. Giới hạn giữ nguyên: kiểm tra quyền tích hợp dùng fixture ở biên Auth/DB; chưa có authenticated browser E2E. Receipt trong bộ kit đã cập nhật.

## 12/09/2026 — Supabase health repair
Database hardening đã áp dụng và đọc lại; Auth refresh/timeout/Ebook evidence scope đã kiểm thử và build, chờ phát hành source. Chi tiết: docs/SUPABASE_HEALTH_20260912.md. Giữ commerce, entitlement và tracking.


## 14/09/2026 — Phí hỗ trợ học viên hiển thị theo buổi (bản cục bộ)
Anh xác nhận chỉ áp dụng hỗ trợ học viên trong ảnh. Form học viên/admin được xác minh hiện 1.000.000đ/buổi, bỏ lựa chọn thời lượng, phụ thu và số phút tại bước chọn lịch/xác nhận. Vẫn chọn ngày, giờ. Khách ngoài giữ lựa chọn và giá hiện có. Giữ khoảng chiếm lịch 30 phút và payload/API/DB/payment lịch sử; không thay đổi checkout hoặc thông báo.
Nguồn: components/support-booking/support-booking-form.tsx; kiểm tra: tests/support-booking-wizard.test.mjs. 36 support tests PASS, 1 SQL integration SKIP (không đổi SQL); 39 prebuild PASS; TypeScript và ESLint file sửa PASS. Bản dựng xem docs/SUPPORT_STUDENT_FLAT_FEE_20260914.md. Chưa phát hành, chưa giao dịch thật hoặc browser E2E.


## 14/09/2026 — Hỗ trợ học viên 1 triệu/buổi ĐÃ PHÁT HÀNH
Anh duyệt “làm luôn đi em”. Runtime bb644657ad3b931aca86363fcda86b35028c9a28; production dpl_87mb1PmLv9upzrHUY7pjB48yAdFx READY, www/apex trỏ đúng. Form học viên hiện 1.000.000đ/buổi, bỏ lựa chọn thời lượng/phụ thu và số phút ở bước xác nhận. Khách ngoài, khoảng giữ chỗ 30 phút, API/DB/checkout không đổi.
36 support tests PASS (1 SQL integration SKIP, không sửa SQL), 39 prebuild PASS, TypeScript/lint và local build108 PASS; preview/production builds PASS. Live www/apex HTTP200 và bundle có nội dung mới, login/success/availability200; 3 ngày báo trước và 4 Chủ nhật đóng. 7 landing HTTP200, 5 static hashes giữ nguyên; hai trang động có hash HTML khác theo bản dựng, source không đổi. Runtime error/fatal scan bản mới không có kết quả lúc04:37UTC. Không browser đăng nhập E2E, đơn thử, thanh toán hoặc gửi email thật.
Rollback ứng dụng: dpl_EY8qiZ7XfUC8bDpFYXebztUJWGFf. Bằng chứng workspace: reports/support-student-flat-fee-20260914/. Trạng thái DONE, thay thế các ghi chú chờ phát hành phía trên.


## 14/09/2026 — Thay bộ Agent Kit 2.2.1

Owner yêu cầu thay bộ kit trên website. Catalog chuyển đủ 10 Agent sang 2.2.1, gồm 35 skill; ZIP đã nạp vào agent-library-private/2.2.1 và tải lại qua signed URL: HTTP 200, kích thước/SHA-256 đúng cả 10. Bộ mới có installer tạo native skill discovery, hai skill landing portable và prompt thiết lập 1.2 cho khách không chuyên. Giữ nguyên route/quyền khóa chính xác, signed URL 120 giây, payment và tracking. Gói cũ giữ để rollback. Hàm nạp tạm agent-library-delivery-20260914 đã thay bằng HTTP 410 sau kiểm tra, verify_jwt=true.

Catalog là thay đổi runtime duy nhất; ZIP trả phí không vào GitHub. Build/release live được ghi tiếp sau xác minh. Chưa kiểm tra đăng nhập học viên thật hoặc cài trên máy khách mới. Chứng cứ: coordinator reports/agent-customer-fix-20260914/private-upload-receipts.json.


## 14/09/2026 — Agent Kit 2.2.1 đã LIVE, prompt ban đầu đã cập nhật

Đã thay 10 gói trên website theo yêu cầu owner, 35 skill. Runtime afd06a7; production dpl_AZsyeGXRF3vbqKgzqxbrbpxCojjm READY đúng SHA và www/apex. 10 ZIP private được tải lại đúng size/SHA trước chuyển catalog; hàm nạp tạm đã vô hiệu hóa version2, verify_jwt=true. 84 tests, TypeScript, local/remote build đạt; 7 landing200, bốn academy tĩnh giữ hash, guest download401, library redirect login, unknown404, error/fatal query rỗng. Prompt Downloads/Prompt-thiet-lap-Codex-cho-nguoi-moi.txt bản1.2 giống file trong ZIP2.2.1, có backup bản cũ. Không sửa quyền khách/payment/tracking. Chưa authenticated student browser hoặc fresh customer runtime E2E. Trạng thái chờ backend của lượt trước đã được thay thế. Evidence: reports/agent-customer-fix-20260914/delivery-state.json trong workspace điều phối. Rollback Vercel: dpl_87mb1PmLv9upzrHUY7pjB48yAdFx.


## 15/09/2026 — Tải toàn bộ và prompt trong thư viện Agent

Owner yêu cầu thêm nút tải toàn bộ và prompt như một thẻ tài liệu trong thư viện. Giữ 10 thẻ Agent; thêm nút Tải toàn bộ bộ kit ở header và thẻ Prompt thiết lập Codex tải TXT. Hai slug full-kit/setup-prompt dùng API download cũ, chung requireAgentLibraryAccess, private signed URL 120 giây, no-store. Metadata hai tài liệu ở data/agent-library-resources.json; phải cập nhật cùng phiên bản catalog Agent (test kiểm full SHA trùng source_release_sha256). Không đưa ZIP/TXT nội dung trả phí vào Git public.

Gói full ZIP2.2.1 và prompt1.2 đã nạp vào agent-library-private/2.2.1; signed download HTTP200 và size/SHA-256 khớp 2/2. Bucket giữ private và giới hạn50MiB, thêm MIME text/plain để nhận prompt. Admin upload/verify hiện có nhận cả12 mục; không overwrite. Hàm nạp tạm agent-library-resources-20260915 đã vô hiệu hóa bằng version2 chỉ410, verify_jwt=true, source readback xác nhận.

Kiểm tra trước phát hành: 45 test access gồm24 kịch bản x12 download,16 kiểm tài liệu/nút bấm/hash-version đồng bộ và39 revenue-critical; TypeScript/lint đạt. Build/live theo biên bản phát hành. Không thay quyền học viên, checkout, payment, email, tracking hoặc landing Ads. Chưa authenticated browser E2E/visual QA; kiểm UI qua cây React và hành vi handler. Evidence tại coordinator reports/agent-library-downloads-20260915/.


## 15/09/2026 — Hai nút tải toàn bộ và prompt ĐÃ LIVE

Đã thêm Tải toàn bộ bộ kit ở header và thẻ Prompt thiết lập Codex tải TXT trong thư viện; giữ10Agent. Runtime36ff445; preview dpl_4tg3tcZHkzPCVsvbsrZ11ZHXeocS và production dpl_EYm7VZmkvrMDrCkGYqNPw5pJZMYx READY, www/apex đúng bản mới. 100 kiểm thử liên quan, TypeScript, lint, local/remote build đạt. Hai file signed Storage HTTP200 đúng size/SHA trước phát hành; bucket private, giữ50MiB và thêm MIMEtext/plain. Nạp tạm đã vô hiệu hóa bằng source410/version2, verify_jwt=true. Hai API mới chuyển404→401 với guest, thư viện redirectlogin;7landing200,5static hash giữ nguyên. Quyền khóa/payment/email/tracking không đổi.

Giới hạn: kiểm nút tải qua hành vi React/API và file thật trong Storage; chưa authenticated browser E2E hoặc visual browser QA. Evidence: coordinator reports/agent-library-downloads-20260915/delivery-state.json. Rollback production: dpl_AZsyeGXRF3vbqKgzqxbrbpxCojjm; file trước giữ nguyên.


## 15/09/2026 — Video Agent với cảnh báo thay bộ thương hiệu

Cập nhật catalog và toàn bộ file tải sang kit 2.2.2, Video Studio 1.1.1. Theo yêu cầu chủ dự án, app dùng nhận diện mẫu The Anh Marketing; mỗi lần mở có cảnh báo và nút Thay bộ thương hiệu. Agent và SOP nhắc thay thương hiệu trước khi xuất, giữ .data/dự án cũ khi nâng cấp. Chỉ metadata và hướng dẫn Video trên website thay đổi; không đổi API, quyền học viên, checkout, email, tracking hoặc landing. 12 file private đã signed-download HTTP 200 và khớp size/SHA. Hàm nạp agent-video-update-20260915 đã đóng bằng version 2 HTTP 410, verify_jwt=true và source readback đạt. 100 kiểm thử website, TypeScript, lint, local build 108 routes đạt; app có 36 test và build đạt. Nghiệm thu cài mới/nâng cấp 10 Agent, 35 skill đạt. Chưa authenticated browser E2E hoặc thử render trên máy khách. Bằng chứng điều phối: reports/video-agent-update-20260915/. Trạng thái: chuẩn bị phát hành.


## Video Agent 1.1.1 / kit 2.2.2 — đã phát hành

Thư viện đã cập nhật gói Video và toàn bộ bộ kit. Bản mẫu giữ nhận diện The Anh Marketing, kèm cảnh báo thay bộ thương hiệu khi khởi động và nút mở phần Bộ nhận diện. Đã kiểm tra cài mới, nâng cấp giữ dữ liệu, các file tải và website. Chưa kiểm trên máy khách mới. Trạng thái đã phát hành thay thế ghi chú chuẩn bị phát hành ở trên.


## 15/09/2026 — Video hướng dẫn Agent Kit

Thư viện Agent bổ sung 11 video hướng dẫn theo thứ tự bài1–10 và bài5.1. Danh sách dọc cạnh player, cùng một khu vực; màn hình hẹp xếp dưới player. Có Bài trước/Bài tiếp theo và mục tài liệu theo bài ở phía dưới. Tài liệu hiện chưa được cung cấp. YouTube iframe chỉ tải sau thao tác, không có liên kết mở YouTube riêng. Giữ access guard, download và tất cả10Agent hiện hành.

Nguồn: components/agent-library/video-tutorials.tsx và tutorial-videos.ts; tích hợp trong agent-library.tsx và CSS cùng thư mục. Kiểm thử điều hướng/giới hạn đầu cuối, chọn đúng video và tài liệu được bổ sung. Chủ dự án đã duyệt bố cục và phát hành; đang hoàn tất release. Chưa xác minh phát video trong phiên học viên thật.


### Video hướng dẫn đã phát hành — 15/09/2026
Runtime0e0c465 đã phát hành production READY;103kiểm thử, TypeScript/lint/build và HTTP kiểm tra sau phát hành đạt. Quyền thư viện và tải xuống giữ nguyên;5landing tĩnh giữ hash. Chưa kiểm tra phát video bằng phiên học viên thật. Tài liệu từng bài đang trống theo xác nhận chủ dự án.


## 15/09/2026 — Tách Video và Agent bằng hai thẻ chọn
Theo ảnh/góp ý mới, đầu trang có hai thẻ Video hướng dẫn và Thư viện Agent. Mỗi lần chỉ hiện một khu vực; prompt/tải toàn bộ/tìm kiếm thuộc Agent; rời Video gỡ player để dừng phát. Mặc định mở Agent; danh mục bên trái mở đúng Agent khi đang xem Video. Giữ video/tài liệu và API/quyền cũ. Test chuyển thẻ/dừng mount video và17resource tests PASS, TypeScript/lint PASS; preview điều phối đã cập nhật. Đang chuẩn bị phát hành bản sửa tiếp theo phạm vi đã duyệt.


### Hai thẻ đã phát hành — 15/09/2026
Runtime0f45b7d production READY.104tests/TypeScript/lint/build PASS;13HTTP giữ trạng thái và5landing tĩnh giữ hash. Hai khu vực chỉ hiện một nội dung mỗi lần; chuyển về Agent dừng video. Quyền tải giữ nguyên. Chưa authenticated browser playback QA.


## 15/09/2026 — Giao diện vũ trụ AI có ảnh bìa
Anh yêu cầu nâng cấp hình ảnh và giải thích Astra là phong cách vũ trụ AI. Tạo hai ảnh original bằng imagegen: hành tinh/quỹ đạo và khối AI kết nối; tối ưu JPEG1280px tổng444KB tại public/agent-library-art. Thẻ chọn dùng ảnh bìa, sidebar ink navy, nội dung nền sáng, thẻ Agent có artwork/icon và bài học có thumbnail YouTube đúng ID. Giữ hai khu vực tách biệt, video/navigation/materials/download/access. Không dùng logo/ảnh thương hiệu chưa xác minh. Premium.css chỉ scoped thư viện; không landing/commerce/Auth change.65library tests, TypeScript/lint PASS; đang dựng/phát hành. Preview điều phối cập nhật, chưa browser screenshot QA do policy.


### Giao diện ảnh bìa đã phát hành — 15/09/2026
Runtimef804cd5 production READY.104tests/TypeScript/lint/build PASS,13HTTP giữ trạng thái và5static landing giữ hash. Hai ảnh vũ trụ original live đúng checksum;11thumbnail hợp lệ. Premium.css chỉ áp dụng thư viện, quyền học viên/download giữ nguyên. Chưa visual browser và phát video trong phiên học viên thật.


## 16/09/2026 — Bài 11–14 và tài liệu bài 14
Thêm 4 video theo catalog, tổng 15 video kể cả bài 5.1; số video trên card tự cập nhật. Bài 14 có tài liệu Markdown qua API download kiểm tra quyền hiện có, lưu trong kho riêng; không đưa nội dung tài liệu vào Git/public. File lưu trữ đã đọc lại và khớp 9.375 bytes cùng SHA-256 catalog. Hàm nạp tạm đã khóa sau khi kiểm tra.
110 tests, TypeScript, lint và build 108 routes PASS. Chưa kiểm tra phát video hay tải file trong phiên học viên thật. Production release/readback được ghi riêng sau phát hành.

### Xác nhận phát hành
Runtime e6ae27d production READY, www/apex đúng bản mới. 13 HTTP smoke giữ trạng thái; 5 static landing giữ checksum. Guest tải tài liệu bài 14 trả401. Không thấy error/fatal ở lần truy vấn sau phát hành. Chưa kiểm tra phiên học viên thật.


## 16/09/2026 — Combo Facebook Ads + Ebook giảm 20% không thời hạn

Theo ảnh và yêu cầu của anh: thêm thông điệp giảm 20% vào đầu landing Facebook Ads Master 2026 và mục chọn combo; giá 878.400đ từ 1.098.000đ. Không sử dụng dòng “Ưu đãi có hạn” trong ảnh. Hai HTML source/published được đồng bộ. Gói mới `zoom-kit-ebook-20` không có điều kiện ngày, phân bổ 639.200đ khóa học +239.200đ Ebook; gói sự kiện cũ giữ điều kiện hết hạn. Giá khóa học riêng 799.000đ, luồng SePay/email/quyền học/tracking giữ nguyên.

Đã kiểm tra: doctor/remote đạt, 39 kiểm tra landing/payment +3 kiểm tra hành vi combo đạt; TypeScript/lint đạt, Next Webpack build đạt. Không tạo đơn/gửi email thật; chưa kiểm tra trình duyệt và chưa phát hành production. Anh đã xác nhận “làm đi”; bản nguồn được duyệt phát hành. Đang chuẩn bị commit/push và preflight, chưa xác nhận live.


## 16/09/2026 — Đã phát hành combo giảm 20% không thời hạn

Anh xác nhận “làm đi”. Runtime `3e1bfc5243c116f90f64b46c769edb49e6623b42` đã push canonical, preflight đúng root/remote đạt; preview `dpl_AaBQ8SGr4m5M5hbRzXHaRLXpxR5b` READY, production `dpl_8Shd2rMCgijqmUDN2tvRBHVA7Bh5` READY. API xác nhận www/apex trỏ đúng commit. Landing `/academy/facebook-ads-master-2026` trên www/apex và bản `/ladipage/facebook-ads-2026.html` trả 200, byte-identical với source; có thông điệp giảm 20%, combo 878.400đ từ 1.098.000đ, mã `zoom-kit-ebook-20`, không có hạn ưu đãi cũ.

Kiểm chứng: 39 kiểm tra landing/payment +3 hành vi combo, TypeScript, lint, Next Webpack build 108 routes đã đạt trước phát hành; remote production build READY. Không có dòng lỗi/fatal trong truy vấn 15 phút của đúng deployment ngay sau kiểm tra live. Bốn landing còn lại đều HTTP 200; HTML tĩnh Ebook/AI giữ SHA-256. HTML route Agent Kit/Codex có hash khác giữa bản dựng; source route/bundle không thay đổi trong diff so với production trước. Không tuyên bố hash HTML động giữ nguyên.

Không tạo đơn, thanh toán, gửi email hoặc thử đăng nhập thật; chưa có kiểm tra giao diện qua trình duyệt. Giá/quyền combo được kiểm tra bằng hành vi mã nguồn và provenance bản production, không phải bằng giao dịch thật. Rollback trước phát hành: `dpl_J6qPmAKrAjxSRbkXXjxr2Bwox7Dm`. Trạng thái DONE; các dòng WAITING_OWNER/đang phát hành phía trước đã được thay thế.


## 16/09/2026 — Landing Agent Kit: form gọn, ưu đãi và Video Studio

WAITING_OWNER (duyệt phát hành): nguồn và bundle đã sửa cho `/academy/bo-kit-agent-doanh-nghiep`; giá gốc 2.599.000đ, ưu đãi 990.000đ chỉ xuất hiện một cụm trong offer. Form nhỏ gọn nằm cột phải offer, mobile xếp dọc; nền xanh đậm/chữ sáng, rút nội dung, bỏ preorder khỏi bundle/FAQ/SEO. Thêm đúng 5 video từ catalog Studio, tổng 7; giữ poster và không tự phát. Nút mục lục ẩn khi form vào viewport để không che nội dung.

Gói mới `agent-kit-offer-990` trong orderService tính 990000 cho đúng Agent Kit slug. Không sửa standard-999, lịch sử preorder, worker cọc/phần còn lại, checkout/SePay/email/quyền/tracking hay các landing khác. Metadata/catalog chung và các trang pháp lý lịch sử chưa thay đổi vì nằm ngoài landing; component checkout cũ không mount vẫn giữ nguyên. Không tạo đơn thật, không gửi email, không mutation DB.

Kiểm tra: doctor remote PASS (HEAD ban đầu e81f3de); 85 tests PASS; TypeScript PASS; ESLint các file sửa PASS; Vite PASS; Next webpack build108 PASS. Chrome headless localhost1440/390/320: không overflow, đúng1form trong offer, mỗi giá xuất hiện1lần, không preorder/999.000; invoice + lỗi API giả lập phục hồi nút submit PASS.7video đã phát (duration/currentTime/videoWidth kiểm tra). Full eslint không đạt:103errors/7999warnings gồm public JS compiled và test lifecycle cũ; không coi scoped lint là full lint PASS.

Chưa push/deploy/preflight production. Handoff `docs/AGENT_KIT_OFFER_20260916.md`; evidence `/Users/theanh/CodexProjects/Kinh doanh/.codex-local/agent-kit-offer-20260916`. Phải xin xác nhận phát hành theo workspace policy; khi được duyệt chạy exact-root preflight và verify live. Source gốc đã đồng bộ10file, bản trước lưu source-before. Không stage bundle trung gian `index-DRg0gN6G.js` (untracked); bundle cuối `index-CAc6PztN.js`, CSS `index-BthB_yEr.css`.


## Phê duyệt phát hành

Anh đã xác nhận “duyệt” trong task này. Chuẩn bị phát hành bản đã kiểm tra trên canonical HEAD kế thừa6f13878 (sửa căn chỉnh combo đã được task riêng hoàn tất, chờ root hết dirty). Không sửa thêm trang combo. Giữ bundle trung gian index-DRg0gN6G.js như tài nguyên không được tham chiếu: cleanup policy không cho xóa public; không nới policy. Bundle runtime vẫn là index-CAc6PztN.js.


## 16/09/2026 — Thanh ghim Facebook Ads theo mẫu

Anh yêu cầu thanh ghim dạng nền tối, thông tin khóa học/giá bên trái và CTA vàng bên phải; giá gốc do anh cung cấp 2.590.000đ. Đã hiển thị giá khóa học hiện tại 799.000đ, nhãn giảm làm tròn 69%, nút Đăng ký ngay; mobile tách thông tin và CTA thành hai hàng gọn. Giữ mục lục, ẩn thanh khi form xuất hiện, giá combo 878.400đ và luồng checkout/tracking. Cùng bản căn chỉnh 6f13878 trước đó.

Anh đã yêu cầu xong thì đưa lên website, không hỏi lại. Đã xem screenshot thanh ghim 1440/390/320 và đo 4 viewport 1440/820/390/320 không tràn ngang; 42 kiểm tra liên quan đạt. Đang chuẩn bị phát hành, chưa xác nhận live.


## 16/09/2026 — Agent Kit ưu đãi 990.000đ ĐÃ LIVE

DONE. Thay thế các trạng thái WAITING_OWNER/auto-review-blocked ở trên. Promote bản chung được auto-review chấp nhận trong task Facebook Ads có xác nhận trực tiếp của anh cho cả hai phần. Production `dpl_6eVQv8woSw3tcJowaHApxFCJsMcw` READY, runtime HEAD `b919fc4bfa07d3bdd47627159a05c7ad2b2507b7` gồm Agent Kit `d9432e6`; www/apex đã nhận bản mới. Không có lượt promote song song.

Live Agent Kit: route200 cả www/apex, loader Next chunk trỏ bundle `index-CAc6PztN.js`, CSS `index-BthB_yEr.css`; bundle/CSS byte-match source; 5MP4 và5poster Studio đều200/SHA-256 khớp. Chrome production1440/390/320 không overflow, đúng1form trong offer,2.599.000đ và990.000đ mỗi mức1lần,không preorder/999.000; mục lục ẩn khi form hiện. Cả7video đã phát và currentTime tăng. Đã xem ảnh mobile production. Gói `agent-kit-offer-990` tính990000 đã kiểm source hành vi và provenance production, không tạo giao dịch thật.

85tests trước phát hành và48tests trên HEAD chung đạt; TypeScript/build108/scoped ESLint đạt. Full lint vẫn có lỗi đã ghi ở phần trước, không tuyên bố full lint PASS. Log query đúng production15phút không trả error/fatal.4landing khác đều200; Ebook/AI giữ checksum; Facebook Ads khớp source bản chung đã duyệt; HTML động Codex khác hash theo bản dựng, source Codex không đổi. Không mutation dữ liệu khách, thanh toán, email hoặc Purchase tracking để QA.

Evidence: `/Users/theanh/CodexProjects/Kinh doanh/.codex-local/agent-kit-offer-20260916/live-after.json`, `live-browser.json`, `live-video-playback.json`, `live-offer-1440.png`, `live-offer-390.png`, `live-offer-320.png`. Rollback trước bản chung: `dpl_8Shd2rMCgijqmUDN2tvRBHVA7Bh5`. Không còn chờ duyệt hay bước phát hành cho thay đổi này.


## 16/09/2026 — Vào trực tiếp các khóa học đã mở quyền

READY_FOR_OWNER_RELEASE_APPROVAL. Project `theanh-main`; worktree `worktrees/student-course-entry-20260916`, branch `fix/student-course-entry-20260916`, base canonical `73e32283d4f8e8f059a8593fe627d55bae30647b`. Chưa tích hợp canonical/push/deploy.

Khu vực `/dashboard` có danh sách chọn nhanh toàn bộ khóa đã mở quyền ở đầu trang. Ảnh, tên và nút Vào học của khóa sở hữu dùng cùng đường dẫn; danh sách khóa tại `/tai-khoan` cũng vào thẳng từng khóa. FBA dùng `/learn/facebook-ads-2026`, route hiện có chọn bài published theo thứ tự chương/bài; Agent Kit dùng `/learn/bo-agent-kit-x10-hieu-suat-cong-viec/agents`; Ebook giữ reader/PDF. Không lấy khóa chưa sở hữu làm khóa đang học. Giữ cách gộp quyền paid-order/LMS, các kiểm quyền ở trang đích, tiến độ, Auth, payment/email/tracking và landing. Không mutation DB, đơn, quyền khách, tài khoản hay gửi thông báo để QA.

Nguồn sửa: `components/app/student-dashboard.tsx`, `app/tai-khoan/page.tsx`, `lib/student-dashboard-courses.ts`, `lib/student-course-navigation.ts`; test mới `tests/student-course-entry.test.mjs`. 4 lỗi hành vi đã tái hiện trước sửa, 7 kiểm tra hành vi mới đạt sau sửa; tổng 90 kiểm tra liên quan đạt. TypeScript, ESLint cả 5 file thay đổi, diff check và Next Webpack build108/108 đạt. Full lint 119 errors/8724 warnings: toàn bộ errors nằm trong 7 public JS bundles và test lifecycle không thay đổi so với HEAD; không tuyên bố full lint đạt. Chưa browser visual/authenticated customer E2E hay live của bản sửa này.

Đã đọc registry/rules/policy/active tasks, context index/session state/feature registry/role/checklist; child AGENTS/CURRENT_STATE/FEATURE_MAP, handoff, DESIGN_RULES/SECURITY_HARDENING, student/database contracts và tài liệu Next use-client/Link. Bước sau: anh duyệt production; kiểm lại canonical/concurrent changes, tích hợp exact diff, preflight đúng release root, build/phát hành rồi kiểm protected routes và các landing đang chạy. Handoff: `docs/STUDENT_COURSE_ENTRY_20260916.md` trong worktree.


### 16/09/2026 — Bổ sung yêu cầu: khóa đã mua đứng đầu, khóa khác màu xám

Thay thế cách hiển thị danh sách chọn nhanh của lượt trước: toàn bộ phần thẻ `Khóa học của tôi` chuyển lên ngay dưới lời chào, trước thẻ học tiếp/hỗ trợ. Nhóm Đã mở quyền hiển thị trước nhóm Khóa học khác. Thẻ chưa sở hữu hoặc status không phải open dùng grayscale + opacity75; nhãn Chưa mua/Chưa mở bán/Đã đóng đăng ký theo trạng thái. Giữ link học với quyền đã cấp, kể cả khóa đã đóng đăng ký; màu xám không thu hồi quyền. Giữ đủ FBA và Agentkit cùng danh sách, bấm vào đúng nơi học như bản trước.

15 kiểm tra dashboard/account/hành vi đạt, gồm thứ tự thực tế của cây giao diện và trạng thái màu xám; TypeScript/scoped lint/diff check và bản dựng Next Webpack108/108 đạt sau thay đổi. Các kiểm tra quyền/landing90tests ở lượt trước vẫn là bằng chứng cho phần mã không đổi; không gọi đó là90tests được chạy lại ở lượt này. Full lint119errors baseline theo biên bản trước. Chưa phát hành, chưa browser/phiên học viên thật; chờ xác nhận production đã hỏi trước đó. Build log: `.codex-local/student-course-entry-owned-first-build-20260916.log` tại workspace điều phối.


## 16/09/2026 — Dashboard khóa đã mua trước ĐÃ LIVE

DONE, thay thế các trạng thái chờ duyệt/chưa phát hành phía trên. Owner đã yêu cầu “đưa lên đi” trực tiếp trong task. Runtime `b48f6bf1564e8f561c4a5830351788328bf3a74c` đã fast-forward canonical/push; preflight exact-root/remote đạt. Preview `dpl_A3LZuQXJQgHUS29qu8xYtgUBmVBM` READY, promote qua CLI thành production `dpl_DRuXSPXoNKovEijL6EHNuD4tukWf` READY. API xác minh cả www/apex trỏ đúng SHA.

Dashboard đặt toàn bộ thẻ khóa đã mở quyền ở đầu, tiếp theo là Khóa học khác màu xám; khóa chưa mở bán cũng xám/có nhãn theo trạng thái. FBA/Agentkit xuất hiện cùng nhau nếu đều có quyền; ảnh/tên/nút và danh sách tài khoản vào trực tiếp đích học. Không thay quyền, DB, Auth, tiến độ, thanh toán, email, tracking hay landing.

91tests liên quan trên canonical đạt; TypeScript/scoped ESLint/local Webpack108 và remote preview/production build đạt. Full lint còn119errors trên file baseline không đổi như phần trên; không tuyên bố full lint đạt. 16HTTP readbacks giữ nguyên trạng thái/đích: dashboard/account/FBA/library về đăng nhập khi guest, download401/unknown404;7landing200,5static SHA-256 giữ nguyên. HTML động Agentkit/Codex thay đổi theo bản dựng, source các route không đổi. Runtime error/fatal query15phút đúng deployment tại06:34:34UTC không trả dòng lỗi. Chưa visual hoặc authenticated student browser E2E; không tạo khách/đơn/email thử.

Evidence: `/Users/theanh/CodexProjects/Kinh doanh/reports/student-course-entry-20260916/` gồm deployment.json, live-aliases.json, live-smoke-before/after.json, runtime-errors.json, release-tests.log. Rollback `dpl_6eVQv8woSw3tcJowaHApxFCJsMcw`. Không còn bước phát hành chờ xử lý; giới hạn QA đăng nhập thật được ghi rõ.


## 16/09/2026 — HOCVIEN20 (LOCAL_VERIFIED)

Hai form Codex/Bộ Kit thêm coupon20%; server gói990000 ->792000, item/QR đồng nhất.100focused tests,TypeScript,scoped lint,Vite/Next build đạt; full gates còn lỗi ghi trong `docs/HOCVIEN20_20260916.md`. Chưa phát hành/chưa giao dịch thật; cần duyệt production.


## 16/09/2026 — HOCVIEN20 và Mục lục Bộ Kit ĐÃ LIVE

DONE theo phê duyệt “làm đi” và yêu cầu đặt Mục lục cạnh Nhận bộ nhân viên AI rồi deploy. Runtime `f89ea5f7f95e5b7017ca974046259eb8d962ceae` gồm coupon305567e, merge/navigation65e6d04 và giữ navigationCodex1c725e6. Preview `dpl_HosxJ68d8nwzpiij9U1meFUBzqoy` READY; exact-root preflight/remote PASS; production `dpl_Fz8HSBU9NMsUN9XZvEufJAT645UL` READY trên www/apex. Rollback `dpl_EtRePg9QjuCz8UmKqUZEztpmyX4P`. Không còn chờ duyệt/deploy.

Hai form Codex/Bộ Kit có mã HOCVIEN20, giảm20% trên990.000đ còn792.000đ; server kiểm đúng product/gói, item/QR cùng giá. Mục lục Bộ Kit nằm cùng sticky-cta-actions bên trái CTA; bỏ vị trí nổi riêng; panel neo phía trên thanh. Bản nguồn Vite5file (RegistrationForm/App/StickyCta/FloatingToc/styles) đã đồng bộ sau baseline/hash check, có backup tại reports. Navigation Codex giữ bản mới, nhận giá sau giảm.

102focused tests,TypeScript,scoped lint,Vite và Next108/108 đạt. Live Codex có input couponCode; Kit loader và JS index-B6nOFIRm.js/CSS index-D92Fi75v.css byte-match source.16route giữ status/destination;4landing tĩnh ngoài scope giữSHA256. Query error/fatal đúng production15phút tại07:50:25UTC không có log. Không tạo đơn, thanh toán, gửi email hoặc replay Purchase thật. Chưa kiểm screenshot/browser của thay đổi mới; các kiểm tra hook/static không thay thế visual QA. Full suite/lint còn giới hạn đã ghi ở phần trước.

Trong khi tích hợp, tác vụ khác commit tài liệu f89ea5f trên HEAD65e6d04 và push cùng lúc; push của task này bị ref-lock race. Đã kiểm ancestry/remote/diff: chỉ2docs khác65e6d04, toàn bộ runtime đã ở remote; không force push hoặc bỏ guard. Canonical sạch trước promote.

Bằng chứng `reports/hocvien20-20260916/`: tests-final.log,build-final.log,vite-navigation-build.log,promote.log,deployment.json,live-verification.json,live-smoke-before/after.json. Handoff canonical `docs/HOCVIEN20_20260916.md`. Source/docs cập nhật đúng main-site; không đổi app học viên/Adplan hoặc dữ liệu khách.


## 16/09/2026 — Đếm ngược trước thanh toán (đang phát hành)

Anh yêu cầu kiểm tra và thêm đếm ngược cho hai landing hiện có. Trước sửa cả hai chuyển thẳng sau API. Sau sửa: overlay3→2→1, mỗi bước1giây, tạo đơn chạy song song. Redirect chỉ khi countdown hoàn tất và có orderCode hợp lệ. API chậm giữ màn chờ; lỗi hủy timer/ẩn overlay/mở khóa form; khóa ref chống gửi trùng; unmount hủy chuyển tiếp. Overlay portal vào body tránh ancestor transform và khôi phục overflow khi đóng. Giữ coupon/giá/attribution/invoice/QR/SePay/email/quyền, không đổi backend.

Source shared components/payment/checkout-countdown.js và checkout-transition.jsx; Vite có bản byte-identical để bundler độc lập. Codex sections và Kit RegistrationForm nối cùng logic. Kit bundle mới index-Oy35VaNk.js, CSS unchanged index-D92Fi75v.css.108focused tests đạt, gồm10form tests thực thi handler/timer giả lập kiểm fast/slow API, đúng3-2-1, chặn double-submit, lỗi+retry và coupon. Kiểm tra không tạo đơn thật, không email/Purchase replay. Chưa visual browser QA theo policy hiện hữu.


## 16/09/2026 — Đếm ngược hai landing ĐÃ LIVE

DONE theo yêu cầu bổ sung của anh. Runtime4c866d6, preview dpl_RxMmUAckkzdidmqnfecZyV1pQBsk và production dpl_G6ALtFK2i3SKenzCaUKHqV9pfmwv READY, www/apex xác minh đúng commit. Exact-root preflight/remote đạt; rollback dpl_Fz8HSBU9NMsUN9XZvEufJAT645UL. Không còn chờ duyệt/phát hành.

Hai form Codex/Bộ Kit:3→2→1 trong3giây, request tạo đơn chạy song song, chỉ redirect khi cả hai điều kiện hoàn tất. API lỗi hủy timer/khôi phục form; khóa ref chống trùng; unmount hủy chuyển tiếp; slow API giữ màn chờ. Overlay portal body, khôi phục scroll khi đóng. Không đổi backend/payment/QR/SePay/email/entitlement. HOCVIEN20 và vị trí Mục lục giữ nguyên.

108focused tests,TypeScript,scoped ESLint,diff check,Vite/Next108 đạt. Source Kit đã đồng bộ form+2helpers sau baseline guard, bản helper/overlay trùng byte Next. Live loader Kit trỏ index-Oy35VaNk.js/SHA256106750b8e856e6b074c3796134357897a81f6dca8cfb85612b18bb34fa85ee71; Codex chunk có countdown/overlay; overlay không xuất hiện trước submit.16route status/destination giữ nguyên;4landing tĩnh ngoài scope giữSHA256. Query error/fatal15phút đúng production tại08:02:03UTC không có log.

Không tạo giao dịch/email/Purchase thật; chưa visual browser QA của overlay theo policy hiện hữu. Kiểm countdown là handler/timer/React harness với API giả lập, live xác minh mã/asset và deployment; không coi đó là bằng chứng giao dịch thật. Không lặp full suite/lint ngoài scope đã biết lỗi từ task trước.

File code: app/academy/codex-x10-hieu-suat/sections.tsx; components/payment/checkout-countdown.js và checkout-transition.jsx; Kit RegistrationForm source,loader,static entry,bundle; tests/hocvien20-forms.test.mjs. Đã cập nhật canonical CURRENT_STATE/FEATURE_MAP/WEBSITE_DEEP_STRUCTURE_HANDOFF/HOCVIEN20 và workspace SESSION_STATE/FEATURE_REGISTRY/TASK_LOG/CHANGELOG/ACTIVE_TASKS/PAYMENT-FLOW. Context/contract dùng lại từ task coupon và đọc mẫu transition Facebook Ads hiện tại. Evidence reports/checkout-countdown-20260916 với tests.log,build.log,vite-build.log,promote.log,live-verification.json,deployment.json,live-smoke-before/after.json.


## 16/09/2026 — Sửa thông tin hóa đơn: đã kiểm tra, chuẩn bị deploy

Anh yêu cầu bỏ kiểm tra định dạng mã số thuế vì hộ kinh doanh/doanh nghiệp khác nhau và đã cho phép deploy. Shared `lib/orders/invoice.ts` bỏ regex 10 chữ số/chi nhánh; vẫn bắt buộc MST không rỗng sau làm sạch, giữ số 0 đầu và chuỗi văn bản (giới hạn kỹ thuật 200 ký tự). Tên/địa chỉ/email hóa đơn vẫn kiểm như cũ. Hai API dùng chung helper; không đổi DB/SePay/email/access/giá/coupon/tracking.

Form Bộ Kit đặt một nút thanh toán cuối form, sau hóa đơn và thông báo lỗi role=alert. Giữ countdown3-2-1, chống gửi trùng, HOCVIEN20=792.000đ. Vite bundle index-CmdFTkr4.js, CSS byte-identical. Candidate worktrees/invoice-checkout-20260916 từ canonical d6263ae; bản nguồn Vite được đối chiếu baseline trước đồng bộ.

100/100 kiểm tra liên quan đạt (66invoice/coupon/form/landing/payment +34payment/email); TypeScript, scoped ESLint(0lỗi/1cảnh báo img sẵn có), Vite build, Next Webpack108routes và diff check đạt. Không tạo đơn/email/giao dịch thật. Không chạy lại full-suite/full-lint ngoài phạm vi đã có lỗi được ghi trong HOCVIEN20; chưa browser visual QA/Safari vật lý. Chỉ báo live sau khi xác minh production READY và asset đúng. Rollback hiện tại dpl_G6ALtFK2i3SKenzCaUKHqV9pfmwv.


## 16/09/2026 — Sửa mã số thuế và nút thanh toán ĐÃ LIVE

DONE theo yêu cầu “phần này không check nữa” và “Deloy đi”. Runtime81459c590302a510d37de9e96fd14499f3c42bcb; preview dpl_9XKpdznKoaaU2od5isozFLVyfN23 READY; production dpl_Bnt7rGWoY4wQAxoBffiVD64nbSsp READY và gán www/apex. Exact release-root/remote preflight đạt. Rollback dpl_G6ALtFK2i3SKenzCaUKHqV9pfmwv. Không còn chờ duyệt hoặc deploy.

Bỏ regex định dạng MST ở shared invoice helper, vẫn bắt buộc MST không rỗng sau cleanText (giới hạn kỹ thuật200ký tự). Tên/địa chỉ/email giữ kiểm tra cũ. Nút thanh toán Bộ Kit ở cuối form sau hóa đơn; thông báo lỗi role=alert ngay trước nút. Giữ HOCVIEN20/792.000đ, countdown3-2-1 và mọi contract thanh toán/email/tracking/quyền. Form gốc Vite được đồng bộ sau baseline+backup.

100tests liên quan, TypeScript, scoped lint0errors/1existingimgwarning, Vite và Next108routes đạt. Live bundle index-CmdFTkr4.js byte-match SHA2561069e7e173ed072cb80a6b3df9c13dadda1786b7beb9921669489c5dee9cdb92. Ba POST kiểm validation cố ý không có courseSlug/courseSlugs: mã12chữ số và văn bản qua invoice rồi dừng400ở kiểm khóa học; MST trống trả400nhắc nhập. Đã kiểm thứ tự return trước createPaymentOrder; không tạo đơn, giao dịch, email hoặc marketing event thật. Không coi phép thử này là giao dịch trọn luồng.

16route status/destination giữ nguyên;4landing tĩnh ngoài scope giữSHA256;5source landing bảo vệ không đổi. Query error/fatal đúng production15phút đến08:41:19UTC không có kết quả. Chưa browser visual QA/Safari vật lý; thứ tựform được kiểm qua React harness, bundle live đúng; full-suite/full-lint ngoài scope không chạy lại các lỗi đã biết. Evidence reports/invoice-checkout-20260916 gồm tests/payment-regression/typecheck/lint/build,source-verification,live-verification,live-smoke-before/after,deployment,promote,production-ready. Context đã đọc: registry/rules/policy, ACTIVE_TASKS/protocol/context/state/features/payment/email, repoAGENTS/CURRENT_STATE/FEATURE_MAP/handoff/design/SePay; code đúng main-site. Các trạng thái chờ ở phía trên đã được thay thế.

Auto-review lần đầu từ chối lệnh gộp merge/push vì chưa chứng minh đích remote tin cậy. Sau readback origin=expected_remote registry, allowed branch/upstream và Vercel live sử dụng đúng repo, push đúng1commit đã được chấp thuận. Không bypass, không force push hoặc đổi đích.


## 16/09/2026 — Hai banner Video/Nhân viên AI ĐÃ LIVE

DONE theo xác nhận “ok” của anh. Runtime03d1c5c721c3f4523a48c617d899beef9ad79b95, preview dpl_2tRPzNSWamAQ6GbVVUFcsuBNzDzL và production dpl_HN34eo9A6ennvsuaqLwzgbYngS2J READY; www/apex gán đúng production. Preflight exact release-root và remote đạt. Rollback dpl_Bnt7rGWoY4wQAxoBffiVD64nbSsp.

Hai banner có CTA nền trắng “Xem video hướng dẫn” và “Mở bộ kit Agent”, hướng dẫn bấm, nhãn Đang xem; mobile xếp một cột. Giữ rename Nhân viên AI từ thay đổi đang dở. Chỉ2file runtime agent-library.tsx/premium.css; không sửa landing/payment/email/download/access/tracking. Canonical byte-identical candidate đã kiểm110tests, TypeScript, scoped ESLint, local108routes; remote preview/production build đạt.

16route giữ status và destination;4landing tĩnh ngoài scope giữSHA256. Log error/fatal đúng deployment15phút kết thúc09:37:55UTC không có kết quả. Chưa visual browser/authenticated student QA. Deployment đúngSHA đã xác minh; chưa xác minh riêng nội dung chunk JS/CSS qua public URL, không coi metadata là bằng chứng thao tác học viên.

Evidence reports/agent-banner-clarity-20260916/{deployment,alias-before,smoke-comparison,live-smoke-before,live-smoke-after}.json; build/tests.log. Không còn chờ duyệt/deploy. Đã cập nhật workspace SESSION_STATE/FEATURE_REGISTRY/TASK_LOG/CHANGELOG/ACTIVE_TASKS và repo handoff. Các dòng READY_FOR_REVIEW/chưa production phía trên là lịch sử, được mục này thay thế.


## 21/09/2026 — Anh duyệt deploy, kiểm tra trước phát hành PASS

Owner yêu cầu “Deloy luôn đi em”.39/39 tests, TypeScript, scoped ESLint test file, PostCSS parse, git diff --check và Next production build --webpack108/108 đạt. Build cần quyền mạng để tải Google Fonts; sandbox DNS fail đã được xử lý bằng quyền mạng được chấp thuận, không đổi code. Mọi phần ngoài style của HTML vẫn giống baseline6edb4dc; hai mirror byte-identical. Rollback production trước phát hành: dpl_8ffJ5HrJQsVcnEymv1K3n9BPB7Jp. Visual QA vẫn chưa thực hiện theo policy; anh đã duyệt bản xem thử và yêu cầu deploy. Evidence local reports/facebook-form-clean-20260921.


## 21/09/2026 — Facebook Ads: giao diện tối giản ĐÃ LIVE

DONE theo yêu cầu “Deloy luôn đi em”. Runtime e2ac149e52ad010e7411cc7a5d9593a65c17cf2d; preview dpl_36Jgu6NSvVoytrBbazaHsmTKpvdb READY; preflight exact canonical root/remote PASS; production dpl_6C8V1PQk8FUANdDXUHLJJ8kMAntJ READY trên www/apex, API xác minh đúng commit. Rollback dpl_8ffJ5HrJQsVcnEymv1K3n9BPB7Jp. Không còn chờ duyệt/deploy.

Form nền tối/nút vàng, ảnh giảng viên từ hông trở lên, section navigation vàng, mobile đồng bộ/gọn và sửa selector ẩn12outcome. Thay đổi runtime chỉ CSS hai HTML mirror; toàn bộ HTML ngoài style, JS, nội dung, giá, assets nguồn, tracking và payment giữ nguyên so với6edb4dc. Source/test:39/39 tests, TypeScript, scoped ESLint, PostCSS parse, diff check; local Next build108/108 và preview/production Vercel build đạt.

Live: Facebook Ads www/apex, /ladipage/facebook-ads-2026.html và /academy/facebook-ads-master-2026.html HTTP200, byte-identical với source; SHA256 9739343cd020da264304662d32af8844fb903ba2d97a138b9b201d26710dfa9c.10route status/destination giữ nguyên,3landing tĩnh ngoài phạm vi giữhash. Logs error/fatal đúng deployment 07:31:38–07:36:38UTC không có kết quả.

Giới hạn: chưa browser visual QA/điện thoại thật hoặc giao dịch thật; không coi HTTP/hash là kiểm chứng hiển thị. Không đổi backend/data/email/access. Evidence: worktrees/facebook-form-clean-20260921/reports/facebook-form-clean-20260921 trong workspace Kinh doanh; handoff canonical docs/FACEBOOK_FORM_CLEAN_20260921.md. Bước tiếp theo chỉ khi có góp ý giao diện hoặc yêu cầu kiểm tra thiết bị.


## 21/09/2026 — Landing bán Thư viện kiến thức Facebook Ads (LOCAL_REVIEW)

Anh xác nhận “Landing bán thư viện”, tiếp tục hướng clean của Facebook Ads. App theanh-main; route /academy/ebook-facebook-ads-2026-premium xác minh qua data/courses.ts và next.config.ts. Worktree worktrees/ads-library-clean-20260921, nhánh codex/ads-library-clean-20260921, base2e04d9f. Doctor remote PASS.

Chỉ sửa CSS trong public/ladipage/ebook-facebook-ads-2026-premium.html và public/academy/ebook-facebook-ads-2026-premium.html, mirror byte-identical. Nền than/vàng/kem, bỏ grid/glow dày, thống nhất heading/card/button; section64desktop/40mobile; hero không ép100svh;6preview tile thành2cột mobile; nhóm cơ chế dạng icon+nội dung; mục lục10phần số nhỏ cùng hàng; quyền lợi dạng hàng; form dark/viền mảnh/CTA vàng; section rail capsule desktop rộng/vạch3px mobile; sticky/menu có safe-area. Không thêm ảnh tác giả vì bản này không có ảnh tương ứng.

Giữ mọi phần HTML ngoài style và tất cả script nguyên văn so với HEAD: giá399K, bundle1098K, nội dung, ảnh, trang đọc thử/slider, form/invoice, API order, countdown, Pixel/attribution và quyền đọc/PDF. Không sửa Ebook landing cũ hoặc thư viện đọc bên trong.64/64 ebook+Facebook+payment tests PASS, PostCSS parse PASS, diff check PASS; HTTP200 preview trùngsource. Evidence reports/ads-library-clean-20260921.

Preview http://127.0.0.1:4325/academy/ebook-facebook-ads-2026-premium.html . Chưa deploy, chưa build/TypeScript/full lint (CSS tĩnh), chưa browser visual QA theo managed-off policy. Không giao dịch thật. Context dùng lại registry/AGENTS/design/payment/email/handoff và skill landing-page-builder; đọc thêm catalog/routes/tests/source exact Ebook. Bước tiếp theo: anh xem bản thiết kế, duyệt phát hành; khi deploy chạy build + canonical preflight và live verification.


## 21/09/2026 — Duyệt phát hành và cân bằng nút đọc thử

Anh yêu cầu “deloy đi, nút đọc thử phải dài bằng nút đăng ký”. Hero dùng grid1cột/width100% và các nút full-width; cặp CTA trong phần đọc thử dùng2cột bằng nhau desktop/1cột mobile, hàng cùng chiều cao. Không đổi nhãn/link hoặc logic.64/64 tests, TypeScript, scoped ESLint, PostCSS parse, git diff --check và Next production build108/108 đạt. Mọi HTML ngoài style/JS giữ nguyên so với base2e04d9f; mirror byte-identical.

Rollback trước phát hành: dpl_6C8V1PQk8FUANdDXUHLJJ8kMAntJ (Facebook Ads redesign), phải giữ hash landing Facebook Ads sau deploy. Chưa visual QA do policy hiện hữu; anh đã duyệt bản và yêu cầu deploy. Evidence reports/ads-library-clean-20260921.


## 21/09/2026 — Landing thư viện đã phát hành (LIVE)

Hoàn tất yêu cầu “deloy đi, nút đọc thử phải dài bằng nút đăng ký”. Nút đọc thử và đăng ký cùng chiều rộng trong hero và phần đọc thử, có bố cục mobile. Runtime commit 8ec158e617127f029d7fbdc43e34b4b9a07db5c2; preview dpl_2PdzzrvTonjsiZUXUPuyVVRbFspA READY, byte-identical với nguồn; canonical preflight remote PASS; production dpl_8zbiLuu34gAmHL5EvoEjStm8FHa2 READY trên www/apex, API xác nhận đúng commit. Rollback dpl_6C8V1PQk8FUANdDXUHLJJ8kMAntJ. Trạng thái LIVE này thay thế LOCAL_REVIEW/chờ duyệt ở trên.

Source chỉ CSS hai file public/ladipage/ebook-facebook-ads-2026-premium.html và public/academy/ebook-facebook-ads-2026-premium.html. HTML ngoài style, JS, giá, order/payment/invoice, tracking và quyền truy cập giữ nguyên. 64/64 tests, TypeScript, scoped ESLint, PostCSS, diff check và Next production build đạt. Live bốn URL premium HTTP200 khớp nguồn SHA256 eaf5d5fd7b7c9e8e35770bfe89b8a396fbe1c6250265cf3fd91c4d09d3d7ce50; 10 route giữ status/destination; hash ba landing Facebook Ads, Ebook cũ, AI Master giữ nguyên. Không có log error/fatal khớp bộ lọc deployment trong 08:44:44–08:49:44 UTC.

Context: registry/control/AGENTS, catalog/routes, design/payment/email và handoff; skill landing-page-builder và deployment/verification. Evidence: worktrees/ads-library-clean-20260921/reports/ads-library-clean-20260921 tại workspace Kinh doanh. Giới hạn: chưa kiểm tra hiển thị trên trình duyệt/điện thoại do managed-off policy; không giao dịch thật. Không coi HTTP/hash là bằng chứng giao diện hay thanh toán thực tế. Không còn chờ deploy; bước tiếp theo chỉ khi có góp ý giao diện.


## 23/09/2026 — Ebook: thiết kế lại toàn bộ UI (LOCAL_REVIEW)

Source riêng: `/Users/theanh/CodexProjects/Kinh doanh/worktrees/ebook-ui-20260923`, base af2c4ae. Preview Next dev http://127.0.0.1:4332/academy/ebook-facebook-ads-2026-premium. Đã audit hero+14section; thay CSS nhiều lớp bằng nền sáng/xanh đậm, tên Ebook trong H1, ảnh đúng tỷ lệ, CTA bằng nhau, mục lục 2cột/1cột, form trắng và phóng28ảnh mẫu. Thanh dưới ẩn khi form xuất hiện; CTA cũng ẩn khi hero còn trong màn hình. Form/script nghiệp vụ gốc nguyên văn; giá399K và gói1.098M/Pixel/checkout/quyền học giữ nguyên. Hai HTML mirror giống nhau.

36tests Ebook/reader/payment PASS; CSS parse/inline JS syntax/scoped ESLint/diff PASS. Browser dùng Codex IAB theo correction của anh, desktop1440/mobile390,320 không tràn ngang; menu, ảnh lớn, slider, mua kèm, hóa đơn và FAQ đã thử; reader thật localHTTP200. Chưa production build/deploy/giao dịch thật/Meta receipt. Context/chi tiết/giới hạn trong feature `docs/EBOOK_UI_AUDIT_20260923.md`; source đổi2HTML và1test; docs/lesson đã cập nhật. Bước tiếp: anh xem preview, chỉ phát hành khi có yêu cầu và qua canonical preflight.


## 23/09/2026 — Anh duyệt phát hành Ebook

Anh yêu cầu “deloy đi em” sau khi xem bản local. Đã tích hợp đúng hai HTML + test và tài liệu liên quan vào canonical;64/64 Ebook/reader/Facebook/payment tests PASS, scoped ESLint/diff PASS, Next production build --webpack và TypeScript PASS. Rollback hiện tại dpl_GQkUtpXmxaQscBJhq4nBZXyZb72F (30ac018), www/apex đã xác minh. Bản trước của các landing đã lưu trong reports/ebook-ui-20260923/live-before.json ở feature. Chưa tuyên bố LIVE ở mốc này; tiếp tục commit/preflight/push, đợi preview và promote.
