# The Anh Marketing Website - Deep Structure Handoff

Muc tieu cua file nay: giup cac phien Codex/Claude/agent khac vao repo la hieu duoc he thong website, khong phai lan vet tung file. File nay uu tien kien truc, luong du lieu, noi can sua, noi khong nen dung cham, va checklist verify.

Repo chinh: `E:\TheAnh-Business-Workspace\02_Website\landing-page`

Remote GitHub: `https://github.com/nguyentheanh-ai/theanhmarketing.git`

Production: `https://www.theanhmarketing.com`

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
- Sua bao cao Meta Ads/CRM: `app/admin/facebook-ads/page.tsx`, `components/admin/product-ads-report-client.tsx`, `lib/admin/product-ads-report.ts`, `lib/meta/ads-api.ts`, `app/api/admin/meta/*`.

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
| `/thanh-toan/[code]` | `app/thanh-toan/[code]/page.tsx` | Huong dan thanh toan va polling trang thai; co layout checkout sang cho AI Agent Business/Agent Kit, demo local `AGENTKITDEMO`, van dung `SEPAY_*`, QR SePay, `TransferDetails`, `PaymentStatusPoller`. |
| `/blog`, `/blog/[slug]` | `app/blog/*` | Blog/content hub. |
| `/tai-lieu` | `app/tai-lieu/page.tsx` | Resource/document hub. |
| `/workshop`, `/gioi-thieu`, `/doi-tac`, `/lien-he`, `/he-sinh-thai`, `/ky-nang` | `app/*/page.tsx` | Static/public marketing pages. |

### Student/LMS

| Route | File | Vai tro |
| --- | --- | --- |
| `/dang-nhap` | `app/dang-nhap/page.tsx` | Student login. |
| `/dashboard` | `app/dashboard/page.tsx` | Student dashboard/course access. |
| `/doi-mat-khau` | `app/doi-mat-khau/page.tsx` | First-login/change password flow; `?mode=recovery` is used after Supabase password recovery. |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase auth code exchange callback, then redirects to a safe local `next` path. |
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
| `/admin` | `app/admin/page.tsx` | owner/editor redirect | Owner vao Lead, editor vao Khoa hoc. |
| `/admin/login` | `app/admin/login/page.tsx` | public login | Admin login. |
| `/admin/hoc-vien` | `app/admin/hoc-vien/page.tsx` | owner | Quan ly hoc vien/grant access. |
| `/admin/leads` | `app/admin/leads/page.tsx` | owner | Quan ly lead CRM. |
| `/admin/facebook-ads` | `app/admin/facebook-ads/page.tsx` | owner | Legacy/direct-only bao cao Ads theo san pham; khong nam trong nav chinh. |
| `/admin/khoa-hoc` | `app/admin/khoa-hoc/page.tsx` | owner/editor | Quan ly khoa hoc, modules, lessons, videos/resources. |
| `/admin/thanh-vien-admin` | `app/admin/thanh-vien-admin/page.tsx` | owner | Quan ly thanh vien admin va role owner/editor. |
| `/admin/email-remarketing` | `app/admin/email-remarketing/page.tsx` | owner | Tao campaign email remarketing, chon audience, gui test, len lich, xem recipient report. |
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
- `components/admin/lead-manager.tsx`: Lead CRM table/actions; payment badge uses StudentAccess/paid order context first and displays compact `Paid`/`Pending`.
- `components/admin/product-ads-report-client.tsx`: dense table bao cao Ads theo san pham cho `/admin/facebook-ads`.
- `components/admin/admin-members-client.tsx`: quan ly owner/editor cho `/admin/thanh-vien-admin`.
- `components/email/*`: Email Remarketing UI cho `/admin/email-remarketing`; tach `CampaignList`, `CampaignEditor`, `AudienceSelector`, `EmailPreview`, `ScheduleModal`, `CampaignReport`.
- `components/admin/course-editor.tsx`: add/edit course, modules, lessons, videos/resources.
- `components/admin/student-intake-form.tsx`: create student/grant course access.
- `components/admin/student-access-actions.tsx`: per-student preview modal, grant/revoke access, and safe delete marker for `/admin/hoc-vien`.
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
- `services/leadService.ts`: leads.
- `services/studentAccessService.ts`: student course access, admin delete markers, registration time, and current learning-progress placeholder.
- `services/studentAccountService.ts`: auto-create student account.
- `services/marketingSettingsService.ts`: marketing pixel/settings.
- `services/brandService.ts`, `services/offerService.ts`: site branding/offer popup.

Email Remarketing:

- Admin UI: `/admin/email-remarketing`.
- API: `/api/email/contacts`, `/api/email/contacts/import`, `/api/email/campaigns`, `/api/email/campaigns/[id]/*`, `/api/email/worker/send-due`, `/api/email/track/open`, `/api/email/track/click`, `/api/email/unsubscribe`.
- Logic: `lib/email/audience.ts`, `lib/email/campaigns.ts`, `lib/email/render.ts`, `lib/email/provider.ts`, `lib/email/worker.ts`.
- Quick-update runbook for gift/bonus links in payment emails: `docs/EMAIL_GIFT_UPDATE_RUNBOOK.md`.
- Facebook Ads 799K support email: `lib/notifications/pending-payment-email.ts` and `lib/notifications/payment-success-email.ts` render `Agent Hỗ Trợ Quảng Cáo` with GPT link `https://chatgpt.com/g/g-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner` only for `facebook-ads-2026` support/799K orders. The email title is normalized from `courseSlug`/amount so paid/pending emails do not inherit mojibake or question-mark product titles from old test data.
- Payment remarketing sequence: `lib/notifications/payment-remarketing-email.ts` + `services/paymentRemarketingService.ts`; `/api/email/worker/send-due` also sends the approved `Quang cao Facebook Master 2026` unpaid sequence at 5h/1d/3d from `orders.created_at` for non-`paid` orders. CTA amount/plan is derived from each order so 399.000d and 799.000d plans do not share a hard-coded CTA.
- Telegram order alerts: `lib/notifications/telegram.ts` sends owner alerts for `order_created` from `app/api/orders/route.ts` and `app/api/orders/from-session/route.ts`, plus `payment_paid` from `app/api/sepay/webhook/route.ts`. Telegram failures are logged but must not block checkout, email, payment confirmation, or SePay webhook success. Production needs `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- Google Sheets order sync: `lib/notifications/google-sheets.ts` posts new order payloads from `app/api/orders/route.ts` and `app/api/orders/from-session/route.ts` to `GOOGLE_SHEETS_WEBHOOK_URL`. Sheets failures are logged but must not block checkout. Production code deployed in hotfix `dpl_CoRRS7n2nWUGdB6G59PS7gQh5eac`; end-to-end verification still needs a real/new order or approved test order.
- Supabase tables: `email_contacts`, `email_campaigns`, `email_campaign_recipients`, `email_events`; migration SQL is `docs/SUPABASE_EMAIL_REMARKETING.sql`.
- Cron: `vercel.json` calls `/api/email/worker/send-due` daily because the current Vercel Hobby plan blocks sub-daily cron. The route itself can be called every 5 minutes by Vercel Pro or an external cron with `Authorization: Bearer CRON_SECRET`; worker sends at most 50 recipients per run.
- Safety rules: no campaign is sent until admin schedules/confirms permission; worker skips unsubscribed/inactive/invalid emails; marketing HTML must contain `{{unsubscribe_url}}` or an unsubscribe route; provider keys stay server-side only.

Admin performance read-model:

- `services/adminDataCache.ts` keeps a short-lived in-process cache for admin module reads.
- `services/adminDataService.ts` exposes cached getters for leads, orders, students, and courses.
- Admin routes `/admin/dashboard`, `/admin/leads`, `/admin/don-hang`, and `/admin/hoc-vien` should prefer these cached getters.
- Admin mutations that change leads/orders/student access should call `invalidateAdminModules(...)` before returning success.
- `/api/admin/leads` is the admin-safe lead creation endpoint used by `components/admin/lead-manager.tsx`; it invalidates lead/student admin caches after insert.
- `/api/admin/students/delete` creates an `admin-student-delete` lead marker and invalidates lead/student caches; it hides the student from admin management without deleting paid order history.

Product Ads report read-model:

- UI: `/admin/facebook-ads` -> `components/admin/product-ads-report-client.tsx`.
- `components/admin/product-ads-report-client.tsx` also renders the Recharts-based ads/revenue visual layer above the dense table: revenue vs ad spend, spend mix, lead/click trend, and CPL/ME-RE review. Keep this chart layer light and driven by the same filtered product rows; do not add CDN Chart.js scripts.
- API: `GET /api/admin/meta/product-report?ad_account_id&start_date&end_date`.
- KPI API: `PATCH /api/admin/meta/product-kpis`.
- Facebook OAuth connect for owner Ads report: `/api/admin/meta/connect/start` -> `/api/admin/meta/connect/callback`; stores the connected token in an httpOnly cookie and product report reads that token before env fallback.
- Core formulas and mapping logic: `lib/admin/product-ads-report.ts`.
- Meta Graph helper: `lib/meta/ads-api.ts`, server-only, uses env token only.
- Supabase config tables: `product_ads_mappings` and `product_ads_kpis`; setup SQL is `docs/SUPABASE_PRODUCT_ADS_REPORT.sql`.
- Report combines Meta spend/click/leads with CRM paid orders/leads. `DT pheu` counts paid orders only. Unmapped campaigns/adsets/leads fall into `Chua phan loai`.
- Table columns are fixed in this order: `#`, `San pham`, `Chi phi QC`, `DT pheu`, `ME/RE`, `Leads`, `Lead TB/ngay`, `KPI Lead/ngay`, `Gia Lead (KH)`, `Chi phi/Lead TT`, `Click`, `CVR LP`.
- If Meta Ads env or Supabase config tables are missing, UI must degrade cleanly and show CRM/fallback data instead of breaking.

Admin members read-model:

- UI: `/admin/thanh-vien-admin` -> `components/admin/admin-members-client.tsx`.
- API: `GET/PATCH /api/admin/members`.
- Server helper: `lib/admin/admin-members.ts`.
- Uses Supabase Auth admin API when `SUPABASE_SERVICE_ROLE_KEY` exists. Fallback reads owner emails from `ADMIN_EMAILS` / `ADMIN_LOGIN_EMAIL`.
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
- Admin-triggered recovery email: `POST /api/admin/students/password-reset`, exposed from `components/admin/student-access-actions.tsx`, owner-only, calls Supabase `resetPasswordForEmail` and redirects through `/auth/callback?next=/doi-mat-khau?mode=recovery`.
- Student auth helper: `lib/auth/session.ts`, `requireStudentAuth`.
- First-login password logic: `lib/auth/student-account.ts`.

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
- `editor`: CMS/content course/blog/resources/feedback only.

When adding new admin route:

1. Wrap with `<ProtectedAdminShell nextPath="/admin/..." allowedRoles={...}>`.
2. Only add nav item in `components/app/admin-shell.tsx` if it belongs to the 5 core CRM modules.
3. Add/adjust test in `tests/admin-editor-role.test.mjs` and `tests/admin-central-modules.test.mjs`.

## 7. Payment, Orders, Email

Order APIs:

- `app/api/orders/route.ts`: create order.
- `app/api/orders/[code]/route.ts`: lookup/update order by code.
- `app/api/orders/from-session/route.ts`: order from session/cart.
- `app/api/orders/expire/route.ts`: expire stale pending orders.
- `app/api/sepay/webhook/route.ts`: SePay payment webhook.

Payment UI:

- `app/thanh-toan/[code]/page.tsx`
- `components/payment/transfer-details.tsx`
- `components/payment/payment-status-poller.tsx`

Email helpers:

- `lib/notifications/registration-email.ts`: admin new lead + registration/pending flow.
- `lib/notifications/pending-payment-email.ts`
- `lib/notifications/payment-success-email.ts`
- `lib/notifications/telegram.ts`: owner Telegram alerts for new orders and paid orders.
- `lib/notifications/google-sheets.ts`: owner Google Sheets sync for new orders.

Important tests:

- `tests/order-created-email-flow.test.mjs`
- `tests/telegram-notifications.test.mjs`
- `tests/google-sheets-sync.test.mjs`
- `tests/pending-payment-email.test.mjs`
- `tests/payment-success-email.test.mjs`
- `tests/payment-expiry-flow.test.mjs`

## 8. Tracking, Meta Pixel, CAPI

Client/browser tracking:

- `components/site/marketing-scripts.tsx`
- `components/site/tracking-page-view.tsx`
- `lib/tracking/events.ts`

Server Meta CAPI:

- `lib/meta/conversions-api.ts`
- Integrated in order/payment APIs so core flow does not block if Meta fails.

Meta Ads reporting:

- `lib/meta/ads-api.ts` reads ad accounts and campaign insights from Graph API.
- `/api/admin/meta/product-report` returns product-level report rows and summary for `/admin/facebook-ads`.
- Lead action types included: `lead`, `onsite_conversion.lead_grouped`, `offsite_conversion.fb_pixel_lead`.
- Keep Ads access token server-only. Do not expose it to client components, docs, logs, screenshots, or final replies.

Current Pixel/CAPI knowledge:

- Pixel/dataset ID and test event code should be loaded from env or Meta Events Manager when testing.
- Do not hard-code access token, pixel token, or test event code in docs/code. Use env only.

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
$html = Invoke-WebRequest -Uri 'https://www.theanhmarketing.com/' -UseBasicParsing
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
- Meta:
  - Pixel/dataset/access-token variables, never hard-code token.
  - `META_ADS_ACCESS_TOKEN` for Ads reporting, server-only.
  - `META_ADS_AD_ACCOUNT_ID` optional default ad account for local/admin report.
  - `META_API_VERSION` optional Graph API version override.
- Cron:
  - `CRON_SECRET`

Local env files exist in repo but treat them as sensitive.

## 14. High-Risk Areas

Be careful when editing:

- `lib/auth/session.ts`: can lock admin/student out.
- `services/courseService.ts`: affects public course pages, LMS, admin course editor.
- `app/api/sepay/webhook/route.ts`: affects payment success, account creation, email, Meta purchase event.
- `app/api/orders/*`: affects lead/order creation and email/tracking.
- `app/api/admin/meta/*`: affects Ads/revenue reporting and KPI writes.
- `app/api/admin/members/*`: affects admin role management.
- `components/admin/course-editor.tsx`: writes modules/lessons/resources to Supabase.
- `components/app/admin-shell.tsx`: primary admin IA; keep 4 core CRM modules unless owner asks otherwise.
- `app/globals.css`: massive shared CSS, changes can affect many pages.

Before changing these, run targeted tests and full build.

## 15. Recent Important Decisions

- Admin CRM/LMS redesign is under same repo, not a separate admin template.
- Admin primary nav has been reduced to 4 focused modules: Hoc vien, Lead, Khoa hoc, Thanh vien admin.
- `/admin` now routes owner to `/admin/leads` and editor to `/admin/khoa-hoc`.
- `/admin/facebook-ads` remains an owner-only direct route for the product Ads report, but it is hidden from the primary admin nav.
- Product Ads report uses `product_ads_mappings` + `product_ads_kpis`; apply `docs/SUPABASE_PRODUCT_ADS_REPORT.sql` before expecting persistent KPI/mapping edits in production.
- Meta Ads API is ported server-side from Adplan-style Graph reads through `lib/meta/ads-api.ts`; never print or client-expose access tokens.
- `/admin/thanh-vien-admin` manages admin roles with `app_metadata.admin_role`; env owner remains protected.
- New admin role `editor` exists for content-only work.
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

## 16. Quick Task Recipes

### Sua homepage section

1. Edit `app/page.tsx`.
2. If new visual is complex, create component in `components/site/*`.
3. Put CSS in `app/globals.css` with unique prefix.
4. Add/update test in `tests/*.mjs`.

### Sua admin permission

1. Edit `lib/auth/session.ts` only if role model changes.
2. Edit `components/app/protected-admin-shell.tsx` or page `allowedRoles`.
3. Edit `components/app/admin-shell.tsx` nav visibility only if the route belongs to the 5 core CRM modules.
4. Update `tests/admin-editor-role.test.mjs` and `tests/admin-central-modules.test.mjs`.

### Sua Ads/CRM report

1. Formula/mapping changes go in `lib/admin/product-ads-report.ts`.
2. Meta Graph changes go in `lib/meta/ads-api.ts`; keep tokens server-only.
3. UI table changes go in `components/admin/product-ads-report-client.tsx`.
4. KPI persistence uses `app/api/admin/meta/product-kpis/route.ts` and Supabase table `product_ads_kpis`.
5. Run `tests/product-ads-report.test.mjs`, `tests/admin-central-modules.test.mjs`, `npm.cmd run verify:admin-quality`, `npm.cmd run verify:tracking`, and `npm.cmd run build`.

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
4. Auto-create account from SePay payment webhook must not depend on Supabase Auth `listUsers`; if that call fails after the order is marked `paid`, success email/account email can be skipped with `payment_email_sent_at` still null.
5. Run payment/email tests before build.

### Sua Meta Pixel/CAPI

1. Client page events: `components/site/tracking-page-view.tsx`, `lib/tracking/events.ts`.
2. Server CAPI: `lib/meta/conversions-api.ts`.
3. Never expose token.
4. Run `tests/meta-conversions-api.test.mjs`.

### Sua Meta Ads API

1. Server Ads reporting helper: `lib/meta/ads-api.ts`.
2. Product report API: `app/api/admin/meta/product-report/route.ts`.
3. KPI API: `app/api/admin/meta/product-kpis/route.ts`.
4. Never expose `META_ADS_ACCESS_TOKEN`.
5. Run `tests/product-ads-report.test.mjs` plus `npm.cmd run verify:tracking`.
