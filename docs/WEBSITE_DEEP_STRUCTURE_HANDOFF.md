# The Anh Marketing Website - Deep Structure Handoff

Muc tieu cua file nay: giup cac phien Codex/Claude/agent khac vao repo la hieu duoc he thong website, khong phai lan vet tung file. File nay uu tien kien truc, luong du lieu, noi can sua, noi khong nen dung cham, va checklist verify.

Repo chinh: `E:\TheAnh-Business-Workspace\02_Website\landing-page`

Remote GitHub: `https://github.com/nguyentheanh-ai/theanhmarketing.git`

Production: `https://theanhmarketing.com`

Stack: Next.js App Router, TypeScript, Tailwind CSS v4, Supabase, Recharts, Framer Motion, Resend/email helpers, Meta Pixel/CAPI, SePay webhook.

## 1. Doc Can Doc Truoc

Neu chi co 5 phut, doc theo thu tu nay:

1. `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md` - file nay.
2. `docs/DESIGN_RULES.md` - quy tac UI/branding.
3. `docs/DATABASE_ARCHITECTURE.md` - bang Supabase va quan he du lieu.
4. `docs/SECURITY_HARDENING.md` - auth, RLS, CSP, env, hardening.
5. `docs/SEPAY_SETUP.md` - payment/webhook/doi soat.

Doc theo task:

- Sua admin/CRM: `components/admin/*`, `components/app/admin-shell.tsx`, `lib/admin/*`, `services/*`.
- Sua landing/trang public: `app/page.tsx`, `components/site/*`, `components/course/*`, `app/globals.css`.
- Sua khoa hoc/hoc vien: `services/courseService.ts`, `services/studentAccessService.ts`, `components/course/*`, `components/app/student-dashboard.tsx`.
- Sua payment/email: `app/api/orders/*`, `app/api/sepay/webhook/route.ts`, `lib/notifications/*`, `services/orderService.ts`.
- Sua tracking Meta Pixel/CAPI: `lib/meta/conversions-api.ts`, `lib/tracking/events.ts`, `components/site/marketing-scripts.tsx`, `components/site/tracking-page-view.tsx`.
- Sua Admin Lead CRM: `components/admin/lead-manager.tsx`, `services/leadService.ts`, `services/leadEmailService.ts`, `app/api/leads/route.ts`, `app/api/admin/leads/*`.
- Sua form dang ky/public checkout: `app/api/leads/route.ts`, `app/api/orders/route.ts`, `app/api/orders/from-session/route.ts`, `app/api/notifications/registration/route.ts`, React forms va static HTML landing pages.

## 2. Thu Muc Tong Quan

```text
app/                 Next.js App Router: routes, API routes, layouts, globals.css
components/          UI components theo domain: site, course, admin, app, auth, cart
data/                Fallback/static content: courses, blog, resources, site config
services/            Data access layer: Supabase + fallback normalization
lib/                 Helpers: auth, Supabase clients, payment, email, tracking, security
docs/                Handoff, architecture, setup, security, audit, plans
scripts/             Verify scripts and admin utility scripts
tests/               Node test suite, source/behavior guardrails
```

Quy tac quan trong: khong load full data mot lan neu co the query theo module/page. Data public thuong di qua service layer de uu tien Supabase, fallback sang `data/*` khi can.

## 3. Route Map

### Public Site

| Route | File | Vai tro |
| --- | --- | --- |
| `/` | `app/page.tsx` | Homepage AI Growth OS. Dang co hero, Content OS mockup, course modules, Agent Kit workflow, CTA cuoi trang. |
| `/khoa-hoc` | `app/khoa-hoc/page.tsx` | Danh sach khoa hoc public. |
| `/khoa-hoc/[slug]` | `app/khoa-hoc/[slug]/page.tsx` | Trang sales/detail tung khoa hoc. |
| `/khoa-hoc/bo-kit-agent-doanh-nghiep` | `app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx` | Landing private/noindex cho ads ban Bo Agent Kit X10, checkout truc tiep qua `/api/orders`. |
| `/dang-ky` | `app/dang-ky/page.tsx` | Form dang ky/lead/order entry. |
| `/gio-hang` | `app/gio-hang/page.tsx` | Cart page client. |
| `/thanh-toan/[code]` | `app/thanh-toan/[code]/page.tsx` | Huong dan thanh toan va polling trang thai; co layout checkout sang cho AI Agent Business/Agent Kit va Facebook Ads 2026, demo local `AGENTKITDEMO`, van dung `SEPAY_*`, QR SePay, `TransferDetails`, `PaymentStatusPoller`. Facebook Ads 2026 phai nhan dien bang slug, khong dua vao title co chu `Agent kit`: 799K hien `2.590.000d -> 799.000d`, 399K hien `2.290.000d -> 399.000d`. |
| `/blog`, `/blog/[slug]` | `app/blog/*` | Blog/content hub. |
| `/tai-lieu` | `app/tai-lieu/page.tsx` | Resource/document hub. |
| `/workshop`, `/gioi-thieu`, `/doi-tac`, `/lien-he`, `/he-sinh-thai`, `/ky-nang` | `app/*/page.tsx` | Static/public marketing pages. |

### Student/LMS

| Route | File | Vai tro |
| --- | --- | --- |
| `/dang-nhap` | `app/dang-nhap/page.tsx` | Student login. |
| `/dashboard` | `app/dashboard/page.tsx` | Student dashboard/course access. |
| `/doi-mat-khau` | `app/doi-mat-khau/page.tsx` | First-login/change password flow. `mode=reset` cho phep Supabase recovery link render form khi server chua co cookie session. |
| `/api/auth/recovery/confirm` | `app/api/auth/recovery/confirm/route.ts` | Internal reset-password callback. Email reset links should point here with `token_hash`, not directly to Supabase `action_link`; route verifies `type=recovery`, sets Supabase session cookie, then redirects to `/doi-mat-khau?next=%2Fdashboard&mode=reset`. |
| `/learn/[course]/[lesson]` | `app/learn/[course]/[lesson]/page.tsx` | Learning room/video lesson. |

Learning UI chinh: `components/course/learning-room.tsx`.

Hien trang learning room:

- Sidebar course menu mac dinh an, nut 3 gach mo menu.
- Main video rong theo kieu YouTube.
- Danh sach bai hoc o cot phai, khong hien "Video bai hoc".
- Support box da duoc bo khoi learning room.

### Admin

| Route | File | Role | Vai tro |
| --- | --- | --- | --- |
| `/admin` | `app/admin/page.tsx` | owner/editor redirect | Owner vao Lead CRM, editor vao Khoa hoc. |
| `/admin/login` | `app/admin/login/page.tsx` | public login | Admin login. |
| `/admin/hoc-vien` | `app/admin/hoc-vien/page.tsx` | owner/editor | Quan ly hoc vien/grant access, cap lai mat khau va gui form thanh toan cho khach. |
| `/admin/leads` | `app/admin/leads/page.tsx` | owner | Quan ly lead CRM: payment status tu orders, sale status, resend email, Google Sheet resync. |
| `/admin/khoa-hoc` | `app/admin/khoa-hoc/page.tsx` | owner/editor | Quan ly khoa hoc, modules, lessons, videos/resources. |
| `/admin/thanh-vien-admin` | `app/admin/thanh-vien-admin/page.tsx` | owner | Quan ly thanh vien admin va role owner/editor. |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | owner | Legacy Growth OS/Admin CRM route, khong nam trong nav chinh. |
| `/admin/don-hang` | `app/admin/don-hang/page.tsx` | owner | Legacy orders/payment follow-up route, khong nam trong nav chinh. |
| `/admin/remarketing` | `app/admin/remarketing/page.tsx` | owner | Legacy remarketing/tracking route, khong nam trong nav chinh. |
| `/admin/seo` | `app/admin/seo/page.tsx` | owner | Legacy SEO/tracking/settings route, khong nam trong nav chinh. |
| `/admin/database` | `app/admin/database/page.tsx` | owner | Legacy database health/tools route, khong nam trong nav chinh. |
| `/admin/cms`, `/admin/bai-viet`, `/admin/tai-lieu`, `/admin/feedback` | `app/admin/*` | owner/editor | Legacy CMS routes, khong nam trong nav chinh. |

Admin shell: `components/app/admin-shell.tsx`.

Admin auth wrapper: `components/app/protected-admin-shell.tsx`.

Admin auth logic: `lib/auth/session.ts`.

Editor role duoc doc tu `user.app_metadata.admin_role = "editor"`. Owner fallback den `ADMIN_EMAILS`/`ADMIN_LOGIN_EMAIL`. Dung `app_metadata`, khong dung `user_metadata` cho phan quyen.

Admin nav chinh chi gom 4 module tap trung:

1. Hoc vien.
2. Lead.
3. Khoa hoc.
4. Thanh vien admin.

Khong them lai nhieu card/dashboard lon vao nav chinh neu chua co yeu cau ro; cac route cu van giu de khong mat chuc nang cu.

## 4. UI Component Map

### Global Layout/Public Shell

- `app/layout.tsx`: root layout, font, metadata, CSP/nonce context.
- `components/site/page-shell.tsx`: wrapper public page, gom `SiteHeader`, footer, cart toast, offer popup.
- `components/site/header.tsx`: main header/navigation.
- `components/site/header-auth-actions.tsx`: CTA theo auth state:
  - logged in: `Khóa học của tôi` -> `/dashboard`
  - guest: `Học thử ngay` -> `/dang-ky`
- `components/site/footer.tsx`: footer.
- `components/site/marketing-scripts.tsx`: scripts tracking/marketing.
- `components/site/tracking-page-view.tsx`: client page view tracking.

### Homepage

File: `app/page.tsx`

Sections hien tai:

1. Hero: copy "SME không thiếu tool..." + `HeroDashboardMockup`.
2. Content OS dashboard mockup: `ContentOsDashboardMockup`.
3. Product modules: `ModuleCatalogGrid`.
4. Agent Kit workflow: `components/site/agent-kit-workflow.tsx`.
5. Bottom CTA: "Bắt đầu bằng chẩn đoán".

Agent Kit workflow:

- Component: `components/site/agent-kit-workflow.tsx`.
- Styles: `app/globals.css`, prefix `.agent-kit-*`.
- Test guard: `tests/agent-kit-workflow.test.mjs`.
- Co line ket noi va animation `@keyframes agent-kit-flow` chay vao core.

### Course UI

- `components/course/ai-marketing-sales-page.tsx`: sales page premium cho khoa hoc, co preview/video/free lesson sections.
- `components/course/course-detail.tsx`: course detail generic.
- `components/course/course-price-card.tsx`: price/CTA card.
- `components/course/curriculum.tsx`: curriculum accordion.
- `components/course/learning-room.tsx`: LMS learning room/video player.
- `components/course/lesson-comment-box.tsx`: comments/questions per lesson.
- `components/site/course-catalog-grid.tsx`, `components/content/course-card.tsx`: course listing/cards.

### Admin UI

- `components/admin/admin-growth-os-dashboard.tsx`: dashboard CRM + LMS + automation tabs.
- `components/admin/lead-manager.tsx`: Lead CRM table/actions; includes payment badge from real orders, sale status select, refresh data, Google Sheet resync, resend email count/actions. Current UI rule: filters live beside table column headers (`Thoi gian`, `Khoa hoc`, `Bank`, `Sale`, `Mail`), not in a global toolbar popover; toolbar has only one refresh icon and a separate text `Sheet` button for Google Sheet resync.
- `components/admin/admin-members-client.tsx`: quan ly owner/editor cho `/admin/thanh-vien-admin`.
- `components/admin/course-editor.tsx`: add/edit course, modules, lessons, videos/resources.
- `components/admin/student-intake-form.tsx`: create student/grant course access.
- `components/admin/payment-link-form.tsx`: owner/editor form trong `/admin/hoc-vien` de tao pending order va gui email/form thanh toan cho khach bang route admin.
- `components/admin/student-access-actions.tsx`: per-student preview modal, grant/revoke access, cap lai mat khau truc tiep co verify login, and owner-only safe delete marker for `/admin/hoc-vien`.
- `components/admin/blog-post-manager.tsx`: blog CMS.
- `components/admin/resource-manager.tsx`: resources/docs.
- `components/admin/marketing-settings-manager.tsx`: pixel/tracking/marketing settings.
- `components/admin/offer-settings-manager.tsx`: popup/offer settings.
- `components/admin/brand-settings-manager.tsx`: branding.

## 5. Data Flow

### Service Layer Pattern

Public/admin pages should call service functions where available instead of importing Supabase directly.

Core services:

- `services/courseService.ts`: load courses, modules, lessons, normalize Supabase + fallback data.
- `services/blogService.ts`: blog posts.
- `services/resourceService.ts`: resources/docs.
- `services/testimonialService.ts`: testimonials.
- `services/orderService.ts`: order/payment data.
- `services/leadService.ts`: leads; Admin Lead read-model maps payment from `orders`, sale status from `leads.sale_status`, sheet metadata from `leads.google_sheet_*`, and resend count from `lead_email_logs`.
- `services/studentAccessService.ts`: student course access, admin delete markers, registration time, and current learning-progress placeholder.
- `services/studentAccountService.ts`: auto-create student account.
- `services/activityLogService.ts`: central timeline log for real student/customer/admin operations in `public.activity_logs`.
- `services/marketingSettingsService.ts`: marketing pixel/settings.
- `services/brandService.ts`, `services/offerService.ts`: site branding/offer popup.

Admin performance read-model:

- `services/adminDataCache.ts` keeps a short-lived in-process cache for admin module reads.
- `services/adminDataService.ts` exposes cached getters for leads, orders, students, and courses.
- `services/adminDataService.ts` also exposes `getAdminLeadActivities()` with cache key `admin:activities` and 15s TTL; dashboard refresh calls `/api/admin/activities/recent?refresh=1`.
- Admin routes `/admin/dashboard`, `/admin/leads`, `/admin/don-hang`, and `/admin/hoc-vien` should prefer these cached getters.
- Admin mutations that change leads/orders/student access should call `invalidateAdminModules(...)` before returning success; lead/note/email mutations should include `activities` when they write `lead_activities` or `activity_logs`.
- Public lead capture should go through `POST /api/leads`, not browser-side Supabase inserts. This keeps admin service normalization, Google Sheet sync, and admin cache invalidation in one place.
- Public form anti-spam guard was removed on 2026-06-06 per owner request after the landing form regression. Do not require hidden `company` or `formStartedAt` fields unless a new design is explicitly approved and tested on mobile landing pages.
- Admin operations tables/services added 2026-06-08: `services/leadActivityService.ts` (`public.lead_activities`), `services/leadNoteService.ts` (`public.lead_notes`), and `services/emailLogService.ts` (`public.email_logs`). Production migration `docs/SUPABASE_ADMIN_OPERATIONS.sql` was applied on 2026-06-08.
- Student activity timeline added 2026-06-08: `services/activityLogService.ts`, `public.activity_logs`, `GET /api/admin/activity-logs`, and `POST /api/student/activity`. Production migration `student_activity_logs_reconcile_20260608` was applied on 2026-06-08; the SQL file keeps the legacy `activity_logs` columns compatible while adding the new student timeline schema.
- `/api/admin/leads` is owner-only for listing/creating leads from admin. `GET /api/admin/leads?force_refresh=1` refreshes latest DB data without a full page reload.
- Admin Lead mutations: `PATCH /api/admin/leads/[id]/sale-status`, `POST /api/admin/leads/[id]/resend-email`, `GET /api/admin/leads/[id]/email-logs`, `POST /api/admin/leads/resync-google-sheet`. All are owner-only and must invalidate lead/student admin caches after writes.
- `/api/admin/payment-links` is owner/editor; it creates a pending SePay order via `createPaymentOrder`, sends the existing pending-payment email, writes a lead marker `admin-payment-link`, and invalidates orders/leads/students.
- `/api/admin/students/grant`, `/api/admin/students/access`, and `/api/admin/students/password-reset` are owner/editor operational routes. They may create/update student Auth accounts and send Resend emails, but must verify the student password flow before emailing when issuing a fresh password.
- `/api/admin/students/delete` stays owner-only. It creates an `admin-student-delete` lead marker and invalidates lead/student caches; it hides the student from admin management without deleting paid order history.

Removed Admin Ads reporting:

- 2026-06-06: Admin Ads/Meta reporting was removed from the code path per owner request. Deleted `/admin/facebook-ads`, `/api/admin/meta/*`, product ads report components/helpers, and ad-cost admin UI/API.
- Do not restore Ads/ad-cost reporting into Admin shell, dashboard, or APIs unless owner explicitly asks for that feature again.
- Facebook Ads 2026 course/payment/email logic remains a sellable product flow and is not part of the removed Admin reporting surface.

Admin members read-model:

- UI: `/admin/thanh-vien-admin` -> `components/admin/admin-members-client.tsx`.
- API: `GET/PATCH /api/admin/members`.
- Server helper: `lib/admin/admin-members.ts`.
- Uses Supabase Auth admin API when `SUPABASE_SERVICE_ROLE_KEY` exists. Fallback reads owner emails from `ADMIN_EMAILS` / `ADMIN_LOGIN_EMAIL` plus default owner helper `lib/admin/admin-emails.ts`.
- Role is stored in `user.app_metadata.admin_role`. Env owner accounts cannot be demoted/removed from the UI.

Fallback/static data:

- `data/courses.ts`: official/fallback courses.
- `data/blog.ts`: fallback blog content.
- `data/resources.ts`: fallback resources.
- `data/site.ts`: brand/site constants.

Rule: neu Supabase co data that thi service doc Supabase. Neu thieu/bang chua san sang thi fallback de website khong blank.

### Supabase Clients

- Browser client: `lib/supabase/client.ts`.
- Server client with cookies: `lib/supabase/server.ts`.
- Service-role/admin client: `lib/supabase/admin.ts`.
- Media upload helper: `lib/supabase/media-upload.ts`.

Khong expose service role key ra client. API route/server-only moi dung service role.

## 6. Auth & Permission

### Student

- Login form: `components/auth/login-form.tsx`.
- Register/lead form: `components/auth/register-form.tsx`.
- Password change: `components/auth/change-password-form.tsx`.
- Forgot password: `/quen-mat-khau`, `components/auth/forgot-password-form.tsx`, `POST /api/auth/forgot-password`.
- Student auth helper: `lib/auth/session.ts`, `requireStudentAuth`.
- First-login password logic: `lib/auth/student-account.ts`.

Forgot password uses Supabase Admin `generateLink`, sends the reset email through Resend, and routes recovery through `/api/auth/recovery/confirm` before `/doi-mat-khau?next=%2Fdashboard&mode=reset`. It logs `password_reset_requested` in `activity_logs` only after a real send success/failure.

Payment success/paid order co the auto-create student account:

- `services/studentAccountService.ts`
- `lib/notifications/payment-success-email.ts`
- `app/api/sepay/webhook/route.ts`

### Admin

- Admin login UI: `components/auth/admin-login-form.tsx`.
- Admin shell: `components/app/admin-shell.tsx`.
- Guard wrapper: `components/app/protected-admin-shell.tsx`.
- Role/auth: `lib/auth/session.ts`.

Roles:

- `owner`: full admin.
- `editor`: CMS/content course/blog/resources/feedback plus student operations in `/admin/hoc-vien` (create/grant/revoke access, send payment links, cap lai mat khau). Delete student, admin members, lead CRM and marketing settings remain owner-only.

When adding new admin route:

1. Wrap with `<ProtectedAdminShell nextPath="/admin/..." allowedRoles={...}>`.
2. Only add nav item in `components/app/admin-shell.tsx` if it belongs to the current visible admin modules.
3. Add/adjust test in `tests/admin-editor-role.test.mjs` and `tests/admin-central-modules.test.mjs`.

## 7. Payment, Orders, Email

Order APIs:

- `app/api/orders/route.ts`: create order; if a `leadId` is supplied, update the existing lead instead of creating a duplicate lead row, then sync that lead to Google Sheet.
- `app/api/orders/[code]/route.ts`: lookup/update order by code.
- `app/api/orders/from-session/route.ts`: order from session/cart.
- `app/api/orders/expire/route.ts`: expire stale pending orders.
- `app/api/admin/payment-links/route.ts`: owner/editor admin order/payment form sender; reuse existing order service and pending-payment email instead of manual scripts.
- `app/api/sepay/webhook/route.ts`: SePay payment webhook; on newly paid order it syncs paid order status to Google Sheet and keeps payment/account/email flow intact.
- `app/api/leads/route.ts`: public lead capture endpoint used by registration/contact lead forms before order creation.
- Production note 2026-06-06: public anti-spam guard was removed after the Facebook Ads mobile checkout regression. Do not re-add hidden `company`/`formStartedAt` or `enforceSpamProtection()` unless a new mobile/static HTML test plan is approved.

Payment UI:

- `app/thanh-toan/[code]/page.tsx`
- `components/payment/transfer-details.tsx`
- `components/payment/payment-status-poller.tsx`

Email helpers:

- `lib/notifications/registration-email.ts`: admin new lead + registration/pending flow.
- `lib/notifications/pending-payment-email.ts`: pending payment/customer payment form email; Resend request must use `Content-Type: application/json; charset=utf-8` and `Buffer.from(JSON.stringify(payload), "utf8")`.
- `lib/notifications/payment-success-email.ts`
- `lib/notifications/student-access-email.ts`: admin grant/revoke access/account notification.
- `services/emailLogService.ts`: lifecycle logging in `email_logs`; `/api/resend/webhook` updates delivered/bounced/complained/opened/clicked by `resend_email_id`.

Compatibility note: Admin Lead resend still writes legacy `lead_email_logs` for existing resend count/history and also writes `email_logs` for lifecycle tracking after `SUPABASE_ADMIN_OPERATIONS.sql` is applied.
- `lib/notifications/telegram.ts`: Telegram order notifications. `app/api/orders/route.ts` and `app/api/orders/from-session/route.ts` send `order_created`; `app/api/sepay/webhook/route.ts` sends `payment_paid` once for newly paid orders. Production `TELEGRAM_CHAT_ID` was set on 2026-06-08 to the `Greezhub x Report` group (`-5220455978`) and redeployed in `dpl_7fq1tDhaQYmoVwtwtmE5reknPbWn`. Do not print `TELEGRAM_BOT_TOKEN`; Vercel env pull may return empty values for encrypted/sensitive Telegram vars.
- `services/leadEmailService.ts`: chooses resend template by real matched order status (`payment_success`, `payment_failed`, `pending_payment`) and is called by owner-only Admin Lead resend API.
- Email font/style note 2026-06-07: notification emails should use CSS-safe inline font stack `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`; do not use bare `font-family:Arial...` or heavily letter-spaced uppercase H1 styles. Guard: `tests/notification-email-font.test.mjs`.

Google Sheet sync:

- `lib/notifications/google-sheets.ts` posts to `GOOGLE_SHEETS_WEBHOOK_URL`; it does not read service-account env directly.
- `GOOGLE_SHEETS_WEBHOOK_URL` must be an Apps Script Web App `/exec` URL such as `https://script.google.com/macros/s/.../exec`, not the Google Sheet edit URL. The Apps Script deployment must be a Web App with Execute as `Me` and Who has access `Anyone`.
- Payloads include `entityType` and `dedupeKey`. For lead entity, prefer stable `lead.id` so an initial lead sync and later order/status sync update the same row.
- Lead sync metadata lives in `leads.google_sheet_synced_at`, `leads.google_sheet_row_id`, `leads.google_sheet_sync_error`; apply `docs/SUPABASE_ADMIN_LEADS_FLOW.sql` before expecting this to persist in production.
- Apps Script/webhook must upsert by `entityType + dedupeKey` (or equivalent leadId/orderCode/email/phone priority) to avoid duplicate rows.
- Production note 2026-06-08: migration `admin_leads_crm_sheet_resend_20260605` is applied. Google Sheet webhook blocker is fixed after Vercel Production `GOOGLE_SHEETS_WEBHOOK_URL` was updated and redeployed in `dpl_4FBV2ojuaYWKBSFEAyQiJ3Bkh8mw`. Smoke lead `b12d1975-a15b-47bd-8ae6-15bc14101d88` returned `sheetSync.ok=true` and appeared in `Orders` row 7. Backfill cleared 81/81 pending/failed leads; remaining unsynced leads = 0. Supabase extension `http` was enabled via migration `enable_http_extension_for_google_sheet_backfill_20260608` only to run DB-side backfill.

Resend logs:

- `lead_email_logs` stores Admin Lead resend history: lead id, order code, email, template, success/failed, error message, timestamp.
- Failed resend must be logged as `failed` and must not increment the success count displayed in Admin Lead.

Student activity timeline:

- `activity_logs` is the admin-facing source of truth for student/customer timeline events. Do not invent timeline rows from an email address, account existence, or course access alone.
- Central writer: `services/activityLogService.ts` (`logStudentActivity`). All event metadata must be sanitized; do not store passwords, reset tokens, session tokens, API keys, or raw Authorization headers.
- Admin reader: `GET /api/admin/activity-logs`, owner/editor only. Student/internal writer: `POST /api/student/activity`, server-side authenticated and limited to student auth events.
- `/admin/hoc-vien` replaces the old mail-history/progress placeholder with `Lich su hoat dong hoc vien`, rendered from real `activity_logs`. Empty state must be `Chua co hoat dong nao duoc ghi nhan`.
- Current wired event groups: mail/payment (`payment_email_*`, `payment_success_email_*`), account/access (`student_account_created`, `course_access_granted`, `course_access_revoked`), login/learning (`student_login_success`, `student_login_failed`, `student_entered_learning`), password (`password_changed`, `password_reset_requested`, `password_reset_completed`), admin updates (`sale_status_updated`, `payment_status_updated`, `profile_updated`), and Sheet sync (`sheet_sync_success`, `sheet_sync_failed`).
- `lead_email_logs` and `email_logs` remain technical/provider logs. Admin student detail should use `activity_logs` for readable history.

Important tests:

- `tests/order-created-email-flow.test.mjs`
- `tests/pending-payment-email.test.mjs`
- `tests/payment-success-email.test.mjs`
- `tests/payment-expiry-flow.test.mjs`
- `tests/admin-leads-end-to-end-flow.test.mjs`
- `tests/notification-email-font.test.mjs`

## 8. Tracking, Meta Pixel, CAPI

Client/browser tracking:

- `components/site/marketing-scripts.tsx`
- `components/site/tracking-page-view.tsx`
- `lib/tracking/events.ts`

Server Meta CAPI:

- `lib/meta/conversions-api.ts`
- Integrated in order/payment APIs so core flow does not block if Meta fails.

Meta Ads reporting:

- Removed from Admin code path on 2026-06-06. Do not re-add Meta Ads access tokens, OAuth routes, product reports, ad-cost inputs, or Ads charts without a new explicit owner request.

Current Pixel/CAPI knowledge:

- Pixel/dataset ID and test event code should be loaded from env or Meta Events Manager when testing.
- Do not hard-code access token, pixel token, or test event code in docs/code. Use env only.
- Layout/browser Pixel is standardized to the single primary Pixel `1315653423712065` (`Pixel 01 - Khoa hoc FB ADS 799.000d`). Do not re-enable `NEXT_PUBLIC_META_ADDITIONAL_PIXEL_IDS` or secondary Pixels `1966683547571929`, `1297209809285103`, `2364261364083192`.
- Static sales landing HTML under `public/ladipage` and `public/academy` must keep the single browser Pixel, `Lead` after successful form/order save, `InitiateCheckout` after real order code creation, `/api/orders`, `_fbp`/`_fbc`, `fbclid`, and UTM forwarding. Guard this with `tests/meta-conversions-api.test.mjs`.
- Meta CAPI Purchase is server-side only after paid confirmation from SePay or `POST /api/payment/confirm`; it uses `event_id=order_code` and marks `orders.purchase_event_sent=true` after a successful Meta request. Apply `docs/SUPABASE_TRACKING_ATTRIBUTION.sql` before expecting attribution and purchase-event flags to persist.
- If a Meta access token is pasted in chat/logs, rotate it after testing; never commit or document the token value.

Important tests:

- `tests/meta-conversions-api.test.mjs`

## 9. SEO, CSP, Security

- Metadata/root: `app/layout.tsx`.
- Sitemap: `app/sitemap.ts`.
- Robots: `app/robots.ts`.
- OG image: `app/opengraph-image.tsx`.
- CSP nonce/security helpers:
  - `lib/security/nonce.ts`
  - `lib/security/html.ts`
  - `lib/security/validation.ts`
  - `lib/security/rate-limit.ts`
  - `lib/security/public-order.ts`
  - `app/api/security/csp-report/route.ts`
- Audit log helper: `lib/security/audit-log.ts`.
- `public.spam_logs` may exist in production from the reverted 2026-06-06 experiment, but no active website code writes to it now.

Security docs:

- `docs/SECURITY_HARDENING.md`
- `docs/SUPABASE_PRODUCTION_RLS.sql`

## 10. CSS & Design System

Main CSS: `app/globals.css`

Global classes:

- `.ai-os-bg`, `.ai-grid`: dark AI OS background and grid.
- `.ai-shell`: responsive max-width container.
- `.ai-panel`, `.ai-panel-strong`: glass/premium cards.
- `.ai-kicker`, `.ai-muted`, `.ai-glow-text`: typography system.
- `.agent-kit-*`: homepage Agent Kit workflow section.
- `.module-*`: course/module cards.
- `.learning-*`: LMS/mobile learning actions.

Design constraints:

- Premium SaaS dark UI, subtle borders, soft glow.
- Avoid old admin template look.
- Avoid huge decorative one-color palettes unless brand section needs it.
- Do not place cards inside cards unless it is a genuine nested tool.
- For visual sections, verify desktop and mobile.

## 11. Tests & Verification

Common commands:

```powershell
node --test tests\*.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
npm.cmd run build
```

Targeted verify scripts:

```powershell
npm.cmd run verify:security
npm.cmd run verify:security:production
npm.cmd run verify:routes
npm.cmd run verify:tracking
npm.cmd run verify:admin-quality
npm.cmd run verify:site-quality
npm.cmd run verify:courses
npm.cmd run verify:blog-assets
```

When changing UI:

1. Add or update a source/behavior test in `tests/*.mjs`.
2. Run targeted test.
3. Run full `node --test tests\*.mjs`.
4. Run TypeScript/lint/build.
5. If production-impacting, commit, push, deploy Vercel.

## 12. Deploy & Git

Branch: `main`

Remote:

```powershell
git remote -v
```

Push:

```powershell
git add <files>
git commit -m "<message>"
git push origin main
```

Deploy production:

```powershell
npx.cmd vercel --prod --force
```

After deploy, verify:

```powershell
$html = Invoke-WebRequest -Uri 'https://theanhmarketing.com/' -UseBasicParsing
$html.Content -match '<expected text>'
git status --short --branch
```

## 13. Env & Secrets

Do not print secrets in final answers or docs.

Expected env categories:

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Auth/admin:
  - `AUTH_GUARD_ENABLED`
  - `ADMIN_EMAILS`
  - `ADMIN_LOGIN_EMAIL`
- Email:
  - Resend/API key variables used by notification helpers.
- Payment:
  - SePay/webhook/bank variables documented in `docs/SEPAY_SETUP.md`.
  - `GOOGLE_SHEETS_WEBHOOK_URL` for order/lead Google Sheet sync webhook. Current code posts webhook JSON; service-account Sheet env is not used by the website app unless this architecture changes.
- Meta:
  - Pixel/dataset/access-token variables, never hard-code token.
  - `META_ADS_ACCESS_TOKEN` for Ads reporting, server-only.
  - `META_ADS_AD_ACCOUNT_ID` optional default ad account for local/admin report.
  - `META_API_VERSION` optional Graph API version override.
- Cron:
  - `CRON_SECRET`
- Admin operations:
  - `RESEND_WEBHOOK_SECRET` optional secret checked by `/api/resend/webhook`.

Local env files exist in repo but treat them as sensitive.

## 14. High-Risk Areas

Be careful when editing:

- `lib/auth/session.ts`: can lock admin/student out.
- `services/courseService.ts`: affects public course pages, LMS, admin course editor.
- `app/api/sepay/webhook/route.ts`: affects payment success, account creation, email, Meta purchase event.
- `app/api/orders/*`: affects lead/order creation and email/tracking.
- `app/api/admin/members/*`: affects admin role management.
- `components/admin/course-editor.tsx`: writes modules/lessons/resources to Supabase.
- `components/app/admin-shell.tsx`: primary admin IA; current visible modules are Tong quan, Quan ly Lead, Khoa hoc, Hoc vien, Thanh vien admin, Cai dat. Ads/doanh thu should stay removed unless owner asks to restore.
- `app/globals.css`: massive shared CSS, changes can affect many pages.

Before changing these, run targeted tests and full build.

## 15. Recent Important Decisions

- Admin CRM/LMS redesign is under same repo, not a separate admin template.
- Admin primary nav currently has owner modules: Tong quan, Quan ly Lead, Khoa hoc, Hoc vien, Thanh vien admin, Cai dat. Ads/doanh thu module is removed from Admin.
- `/admin` now routes owner to `/admin/dashboard` and editor to `/admin/khoa-hoc`.
- Ads/doanh thu/ad-cost UI and APIs were removed from Admin on 2026-06-06. Do not restore `/admin/facebook-ads`, `/api/admin/meta/*`, or `/api/admin/ad-costs` unless owner explicitly asks.
- Admin Lead CRM is the current owner operating view. Payment badge comes from real `orders`, sale status persists in `leads.sale_status`, resend history persists in `lead_email_logs`, and Google Sheet metadata persists in `leads.google_sheet_*`.
- Admin Lead UI hotfix deployed 2026-06-06 in `dpl_EV7X7HzafD5WVXVCKbsY3JJwjNDg`: `Bank` replaces `Thanh toan` in the main table, paid/unpaid show as green/red Bank badges, `Sale` select is green for `Da lien he`, red for `K nhu cau`, and neutral for `Chua lien he`. Screenshot reference: `E:\Temp\UserTemp\admin-leads-column-filters-1700x950.png`.
- Admin Tong quan deployed 2026-06-06 then simplified per owner request: `/admin/dashboard` has recent lead activity, daily revenue with % comparison, paid order counts, lead counts, and best-selling course table. Ad-cost/P&L/Ads reporting UI/API were removed; existing production DB tables were not dropped.
- Admin soft-delete deployed 2026-06-06: lead delete sets `leads.deleted_at/delete_after/delete_reason`; student delete writes `public.admin_deleted_students`; purge cron `/api/admin/purge-deleted` is protected by `CRON_SECRET` and scheduled in `vercel.json`. UI hides rows immediately, purge runs after 30 days. Orders are not hard-deleted automatically.
- Public form anti-spam guard deployed and then removed on 2026-06-06 after a Facebook Ads landing regression. Current rule: keep public forms simple, post lead capture through `/api/leads`, and do not add hidden anti-spam fields without tested mobile checkout coverage.
- Apply `docs/SUPABASE_ADMIN_LEADS_FLOW.sql` before expecting Admin Lead sale status, resend logs, and Google Sheet sync metadata to persist in production.
- Production migration was applied on 2026-06-05. Current remaining blocker is Google Sheet webhook 403, not missing DB schema.
- Admin Lead order-only rows use synthetic id `order:<orderCode>` until a real `public.leads` row exists. First Sale status update on that row must create the real lead from the order and persist `leads.sale_status`; do not store Sale status on `orders`. Hotfix deployed 2026-06-08 in `dpl_9zoRcPU7zpS89r8AbYJBN3ZLQNDH`.
- Admin operations upgrade 2026-06-08 added public forgot-password, lead notes, `lead_activities`, `email_logs`, Resend webhook, and dashboard activity refresh. Production migration `docs/SUPABASE_ADMIN_OPERATIONS.sql` was applied, but Resend webhook still needs provider/dashboard configuration.
- Student activity timeline upgrade 2026-06-08 added `activity_logs`, `services/activityLogService.ts`, `GET /api/admin/activity-logs`, `POST /api/student/activity`, and replaced the `/admin/hoc-vien` mail-history/progress placeholder with real `Lich su hoat dong hoc vien`. Production migration `student_activity_logs_reconcile_20260608` is applied and deployment `dpl_DpXu9azftiN1sh56DHoMUJ2P2LgL` is live.
- `/admin/thanh-vien-admin` manages admin roles with `app_metadata.admin_role`; env owner remains protected.
- `/admin/hoc-vien` has `PaymentLinkForm` for sending payment forms to customers; the API is `/api/admin/payment-links` and should keep using `createPaymentOrder` + `sendPendingPaymentEmail`.
- Admin role `editor` is now also the student-operations role for `/admin/hoc-vien`: create student, grant/revoke access, send payment link, and cap lai mat khau. It must not get student delete or admin member management unless owner explicitly approves.
- Header CTA:
  - logged in: `Khóa học của tôi`
  - guest: `Học thử ngay`
- Learning room:
  - sidebar hidden by default, YouTube-style menu button.
  - support block removed.
  - lesson title compact, metadata badges removed.
- Homepage:
  - old A.G.S Framework section removed.
  - old Proof Content Hub/Content Pillar section replaced by animated Agent Kit workflow.
- Blog:
  - `/blog` now renders real posts from `getBlogPosts()` before the Agent Gallery.
  - AI Leaders Digest batch lives in static fallback `data/blog.ts` so posts exist even without Supabase.
  - `/blog/[slug]` has dynamic CTA mapping for the new AI Leaders Digest slugs.
  - Blog posts can use optional `thumbnail` and `publishedAt`; AI Leaders thumbnails are under `public/blog-thumbnails/ai-leaders`.
  - `/blog/[slug]` builds the table of contents from `h2`/`h3` content headings and renders a hero image when `thumbnail` exists.
- Keep course/student/payment/pixel data logic stable when changing UI.
- Private ads landing `app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx` uses source facts from `E:\TheAnh-Business-Workspace\05_AI_Growth_Kit_Product` and the route is `noindex`. The visible ads price is `359K` through payment plan `agent-kit-ads-359`; do not change the global course price `Bo Agent Kit X10` from `799K` unless the owner explicitly asks.
- Facebook Ads 2026 checkout must stay separate from Agent Kit private ads checkout. Do not classify an order as Agent Kit from product title text like `Agent kit`; use `courseSlug`/item slug. Verified live 2026-06-05: `TAMMPX99H22LJP8R` shows `2.590.000d -> 799.000d`, `TAMMPYBBP2110IHA` shows `2.290.000d -> 399.000d`, and neither shows `Giu gia 359K` or `AI Agent Business`.
- Deployed 2026-06-08 in `dpl_DSCncK46ydco5XjuDcvK4n4jMDoB`: Facebook Ads Master 2026 LadiPage shows only 399K and featured 799K cards; 799K includes AI Agent planning ads; optional Zoom +500K is a form checkbox that submits internal `advanced-zoom` amount 1.299K. Card hover/click selects the plan; mobile selection scrolls to the form; email placeholder is `email@gmail.com`. Payment success email CTA must point to `/vao-khoa-hoc`, not direct `/dang-nhap`. Pending-payment transfer amount is formatted with `amountLabel`.
- Deployed 2026-06-08 in `dpl_7bwk1CyGBFk2CutK7XNmCMfYpYEK`: Facebook Ads 2026 payment success emails for AI Agent plans (799K and 1.299K add-on Zoom) include the Google Doc `Huong dan su dung AI Agent`; 399K basic email must not include that guide link.
- `/vao-khoa-hoc` is an email/browser bridge page. It intentionally does not set `X-Frame-Options` and strips CSP `frame-ancestors` to avoid Chrome/Gmail `ERR_BLOCKED_BY_RESPONSE`; keep frame blocking on other routes through `proxy.ts`.
- Incident/fix 2026-06-08: paid student accounts must not skip existing Supabase Auth users. Google OAuth users can exist without an email/password hash, so `services/studentAccountService.ts` must update existing users with a fresh password/metadata when paid access or admin force reset is requested. SePay payment-success email must include the account block whenever `studentAccount.temporaryPassword` exists, not only when `created=true`.
- Admin `/api/admin/students/password-reset` is now a direct account-password reset flow, not a recovery-link flow: owner/editor operational route, generate/update password, verify with Supabase anon `signInWithPassword`, then send `sendStudentAccessEmail` through Resend. If verification fails, do not email the customer.
- Production customer recovery 2026-06-08: `phamthanhtinh1995@gmail.com`, order `TAMMQ4VQNH9MOH4L`, Auth user reset, login verified, email account recovery sent, temporary internal route removed, clean deploy `dpl_EnV4sofurA4XB9QegvrutmttVGDQ`.
- Email link bridge 2026-06-08: customer-facing HTML email buttons should use `buildEmailLink()` and route through `/go?to=...`; `app/go/page.tsx` validates an allowlist, auto-opens with a client component, and shows a manual button/copy fallback. `proxy.ts` exempts `/go` from `X-Frame-Options` and strips `frame-ancestors` to avoid Gmail/Chrome mail-webview blocked responses. Plain-text email bodies should keep the raw destination URL for copy fallback.
- Codex skill added: `C:\Users\12c1t\.codex\skills\theanh-student-account-email-safety\SKILL.md`; use it for paid student account, password reset, Resend email, or email link blocked incidents.

## 16. Quick Task Recipes

### Sua homepage section

1. Edit `app/page.tsx`.
2. If new visual is complex, create component in `components/site/*`.
3. Put CSS in `app/globals.css` with unique prefix.
4. Add/update test in `tests/*.mjs`.

### Sua admin permission

1. Edit `lib/auth/session.ts` only if role model changes.
2. Edit `components/app/protected-admin-shell.tsx` or page `allowedRoles`.
3. Edit `components/app/admin-shell.tsx` nav visibility only if the route belongs to the current visible admin modules.
4. Update `tests/admin-editor-role.test.mjs` and `tests/admin-central-modules.test.mjs`.

### Sua checkout Facebook Ads 2026

1. Edit `app/thanh-toan/[code]/page.tsx` and keep order API, SePay QR, transfer content, polling, webhook and email flow unchanged unless the task explicitly asks.
2. Keep Facebook Ads recognition slug-based via `facebook-ads-2026`; do not use title keywords because support package titles can contain `Agent kit`.
3. Keep price display rules: amount `799000` => `2.590.000d -> 799.000d`; amount `399000` => `2.290.000d -> 399.000d`.
4. Update `tests/payment-page-reference-ui.test.mjs`, then verify mobile and desktop screenshots for no horizontal overflow.
5. Run `tests/payment-page-reference-ui.test.mjs`, payment/email tests, and `npm.cmd run build`.

### Sua course/LMS content

1. Prefer `services/courseService.ts` or admin course editor.
2. Fallback official content is in `data/courses.ts`.
3. Learning page UI is `components/course/learning-room.tsx`.
4. Run `tests/course-service-live-data.test.mjs` and `tests/learning-room-youtube-layout.test.mjs`.

### Sua blog/content hub

1. Prefer `/admin/bai-viet` when Supabase `blog_posts` is available.
2. Use `data/blog.ts` as the static fallback and source for evergreen AI Leaders Digest posts.
3. Public list rendering is `app/blog/page.tsx` -> `components/content/blog-list.tsx`.
4. Detail CTA mapping is in `app/blog/[slug]/page.tsx`.
5. Follow `docs/AI_LEADERS_DIGEST_PUBLISHING_CHECKLIST.md` for SkillsBridge-style article production.
6. Run `npm.cmd run lint`, `npm.cmd run build`, and smoke-test `/blog`, `/blog/<slug>`, `/sitemap.xml`.

### Sua payment/email

1. Trace from `app/api/orders/route.ts` or `app/api/sepay/webhook/route.ts`.
2. Email template/helper in `lib/notifications/*`.
3. Student account creation in `services/studentAccountService.ts`.
4. Admin student access email helper is `lib/notifications/student-access-email.ts`; do not send access/account emails from raw PowerShell Vietnamese strings. Render/check UTF-8 content before calling Resend.
5. Admin payment form sender is `components/admin/payment-link-form.tsx` + `app/api/admin/payment-links/route.ts`; it creates pending orders and sends the existing pending-payment email, not a separate template.
6. Run payment/email tests before build.

### Sua Meta Pixel/CAPI

1. Client page events: `components/site/tracking-page-view.tsx`, `lib/tracking/events.ts`.
2. Server CAPI: `lib/meta/conversions-api.ts`.
3. Never expose token.
4. Run `tests/meta-conversions-api.test.mjs`.
