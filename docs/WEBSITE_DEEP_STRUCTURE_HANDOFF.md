# The Anh Marketing Website - Deep Structure Handoff

## 2026-08-21 - Facebook Ads mobile readability and Zalo proof fix (production)

| Hạng mục | Chi tiết |
|---|---|
| Scope | Presentation-only follow-up for `main-site` route `/academy/facebook-ads-master-2026`; source/published HTML, landing regression, release/readback and one owner-requested pending QA order. |
| Root cause | Cream tools section inherited light text from the dark hybrid theme. Zalo proof CSS forced `aspect-ratio: 15/32` plus `object-fit: cover`, while the mobile grid minimum kept two narrow 220px cards visible. |
| UI | Option 1: dark-brown heading/card titles, medium-brown copy, orange kicker/icons and warm translucent-white cards. Proof images use natural height with `contain`; mobile uses one readable `min(84vw, 320px)` snap card. |
| Preserved | Copy/offer, form/invoice, `/api/orders`, 799K/Ebook plans, SEO/canonical, Pixel, engagement event script, SePay and server Purchase/CAPI are unchanged. |
| Verification | TDD RED then GREEN; full Node `592/592`; TypeScript, tracking, diff check and 96-page Webpack build pass; ESLint 0 errors/1 unchanged warning. Production Browser 390/320/1440 has no overflow, broken image or mojibake. |
| Production | Commit `3fef504`; Git preview `dpl_HxgCVALaiDseameKhtmeVyiwvzXy` validated, then exact promotion `dpl_5kEZoPX1YAtoGdXHBgpJrzqixeNA` (`READY`). Rollback `dpl_FFoE7Ny1bG2bFaFGai7Q4n1Hxhqj`. Live/local HTML hash `f5f8a4d45a64fb6fdaaa9e75e4639d7144c58010828839892d921794e7cd67ff`; event JS unchanged; guards and runtime scan clean. |
| QA order | `TAMMT24TKS5A3FIN`, 799.000 VND, `pending`; QR 360x360; pending email and Telegram markers sent with null errors. No payment, success email, Purchase, provisioning or Auth user. |

## 2026-08-21 - Facebook Ads value stack two-panel grouping (production)

| Hạng mục | Chi tiết |
|---|---|
| Scope | Presentation-only follow-up for `main-site` route `/academy/facebook-ads-master-2026`; source/published HTML and landing regression only. |
| UI | Cards 01-03 are one continuous panel with internal responsive dividers. Crossed-out total and today's 799K price are a second continuous panel with one internal divider. Copy and values are unchanged. |
| Preserved | Form, invoice, `/api/orders`, 799K/Ebook plans, SEO/canonical, Pixel, custom event script and server Purchase/CAPI are unchanged. No order was submitted. |
| Verification | TDD RED then focused GREEN `27/27`; full Node `591/591`; TypeScript, tracking, diff check and 96-page Webpack build pass; ESLint 0 errors/1 unchanged warning. Production Browser 390/320/1440 confirms two clusters and zero overflow. |
| Production | Commit `dceb20b`; Git preview `dpl_89EoChcRay5GQVX7Q9YumNUh89rt` validated, then exact promotion `dpl_FFoE7Ny1bG2bFaFGai7Q4n1Hxhqj` (`READY`) on apex/`www`. Rollback `dpl_EFWWGpZnaBbwuCjJp6d3DhTLBVXz`. Live/local HTML SHA-256 `f500d2d9be40633d843b8cb0808f0fecebe0e32402d0982fa197ca2856ac26f7`; event JS unchanged; guards 307/405/405 and runtime-error scan clean. |

## 2026-08-21 - Facebook Ads pricing header simplification (production)

| Hạng mục | Chi tiết |
|---|---|
| Scope | Presentation-only follow-up for `main-site` route `/academy/facebook-ads-master-2026`; source/published HTML and one landing regression test. |
| UI | `Tổng giá trị: 5.997.000đ` is wrapped in a visible 2px line-through. Pricing no longer repeats `Học phí & đăng ký` or the `Hôm nay bạn sở hữu toàn bộ với 799.000đ` heading; the ownership line above checkout stays. |
| Preserved | Payment form, invoice, `/api/orders`, 799K/Ebook plans, SEO/canonical, Pixel, custom event script and server Purchase/CAPI are unchanged. No order was submitted. |
| Verification | TDD RED then focused GREEN `27/27`; full Node `591/591`; TypeScript, tracking, diff check and 96-page Webpack build pass; ESLint 0 errors/1 unchanged warning. Browser QA 1440/390/320 has no overflow or console warnings/errors. |
| Production | Commit `dac8111`; Git preview `dpl_FDF9LMRTeZfNCeBdTHWoxaJERLeV` validated, then promoted as production `dpl_EFWWGpZnaBbwuCjJp6d3DhTLBVXz` (`READY`). Rollback target `dpl_9deCAWFg8Uuwixw9WGqtMdsqgpmL`. Live/local HTML SHA-256 `916c9b223ac2d98902a08bfe3dab56ecf78ef828fb60a538e0c97638d2575a45`; event JS hash unchanged. |

## 2026-08-21 - Facebook Ads Master Data & AI conversion rewrite + Meta event contract (production)

| Hạng mục | Chi tiết |
|---|---|
| App/route | `main-site`, `/academy/facebook-ads-master-2026`; canonical static source `public/ladipage/facebook-ads-2026.html`, published mirror `public/academy/facebook-ads-master-2026.html`. |
| Source state | Runtime commit `17bdabb` from existing worktree `/Users/theanh/CodexProjects/TheAnh-Web/worktrees/facebook-ads-master-rewrite-20260821`, branch `feat/facebook-ads-master-rewrite-20260821`, base `ce4b0eb`. No order, payment, email or customer-data mutation was used for QA. |
| P0 | New Data & AI hero; three pains; early Big Idea; 12 outcome cards; AI Agent as core with `PAUSED`; explicit support boundary; value stack 5.997.000đ revealed at 799.000đ; no curriculum/module/lesson list. |
| P1 | Exact 12-section order; five content-rich proofs; instructor/tools sections; seven valid sticky-nav anchors; nine updated FAQs; one consistent primary CTA. |
| Commerce guard | Preserve `zoom-kit` 799K, optional `zoom-kit-ebook-299` 1.098M, shared invoice fields, `/api/orders`, payment redirect, server price authority, SePay/email/access downstream handling. Zoom 1:1 is separate and excluded from 799K. |
| Tracking/SEO guard | Pixel `1315653423712065`, `PageView`, `ViewContent` with `facebook-ads-2026`/799000, attribution payload, title, meta description and canonical remain unchanged. Source/published pair is byte-identical. |
| Event contract | Browser-only `trackCustom`: one-shot `EngagedView` at 30 visible seconds; one-shot `ScrollDepth` at 50/75/90; `CTAClick` only for six annotated primary CTAs with `cta_id`, `cta_text`, `destination_url`. `VideoProgress` is `NOT_APPLICABLE`: this page has a GIF proof but no HTML video. |
| Standard preservation | `PageView`/`ViewContent` remain unchanged. Browser `Lead` fires only after `/api/orders` returns a valid order code and retains `event_id=leadId` for server/browser dedup. No early `InitiateCheckout`, browser `Purchase`, fake `LandingPageView`, `Contact` or `FindLocation`; durable server Purchase/CAPI remains unchanged. |
| QA | Focused Facebook Ads/Meta/invoice `59/59`; full Node `591/591`; TypeScript pass; ESLint 0 errors/1 unchanged unrelated warning; tracking verification and diff check pass. In-app Browser 1440/390/320 has 0 overflow, broken images, mojibake or console errors; exact six CTA annotations and event runtime readiness verified without submitting a real order. |
| Build note | Next 16 Webpack production build passes and generates 96 pages. Two base-commit type blockers were fixed without behavior changes: `MAX_REQUEST_BYTES` is module-local rather than an invalid route export, and `/go` uses Promise-only `searchParams`. |
| Production | Vercel `dpl_9deCAWFg8Uuwixw9WGqtMdsqgpmL`, `READY`, promoted to `www.theanhmarketing.com`; rollback target `dpl_CpvZrvvxbQQauZkbAUi8dmTRoWvG`. Clean route/event script are 200 and exact live HTML/JS hashes match local. Guards: `/admin` 307, `GET /api/orders` 405, `GET /api/student/progress` 405. Runtime error/warning/fatal scans are empty. |
| Meta readback | Aggregate Web counts in the post-release one-hour window: `EngagedView=3`, `ScrollDepth=4`, `CTAClick=1`. This is dataset-stat readback, not Events Manager Test Events. Test Events is unavailable in the current authenticated tool channel; no token/test code was entered. |
| Remaining external handoff | GitHub push is `RESOLVED`. The owner-approved device flow authenticated Terminal Git as `nguyentheanh-ai`; the full branch `feat/facebook-ads-master-rewrite-20260821` now tracks origin, and remote readback matched runtime `17bdabb0691593c8778686241791eef9e548a2f6` plus docs `36c26e8b8205b8154b96c6e6251825e88356f831`. Events Manager Test Events remains the only unavailable external channel. |

## 2026-08-13 - Facebook Ads typography and mobile refinement

| Item | State |
|---|---|
| App/route | `main-site`, `/academy/facebook-ads-master-2026`; canonical source `public/ladipage/facebook-ads-2026.html`, published mirror `public/academy/facebook-ads-master-2026.html`. |
| Typography | Keeps the existing `Be Vietnam Pro` family and adopts a calmer reference-style type scale: display `800`, section headings `700/800`, restrained tracking and body line-height `1.6`. |
| Mobile | At `<=680px`, content uses 32px total gutters, 56px section rhythm, fluid 30–34px hero type, fluid 26–30px section headings, 16px body copy and safe-area-aware sticky actions. At `<=360px`, gutters and titles tighten further without horizontal overflow. |
| Interaction fix | Decorative curriculum portrait/orbit layers ignore pointer events so accordion rows remain tappable on narrow screens. |
| Review correction | The typography branch originally started from an older landing snapshot and briefly restored three retired illustrations. The page now pins the approved owner images in the standard landing asset folder: `hero-operator.webp` for `#van-de`, `fragmented-handoffs.webp` for `#ket-qua`, and `role-marketing.webp` for `#phuong-phap`. The curriculum profile divider was removed so it no longer crosses the instructor's neck on mobile. |
| Preserved contract | Copy, 799K offer, Ebook add-on, CTA/form, Pixel/CAPI and order/payment/email/access flows are unchanged. Source and published HTML remain byte-identical. |
| Verification | Focused landing regressions `25/25`, TypeScript and production build (96 routes) pass. ESLint has zero errors/one unchanged warning. Full Node is `571/572`; the only failure is the pre-existing Telegram cron expectation for an intentionally disabled cron, so production integration remains pending. Direct `file://` browser reload is blocked by browser policy; owner can reload the already-open preview tab for visual confirmation. |

## 2026-08-03 - Durable Meta Purchase outbox restored to deploy branch

| Item | State |
|---|---|
| Incident | The active deploy branch had regressed to direct, one-shot CAPI calls. The database still had outbox columns/RPCs, but production code had no dispatcher, protected retry route or cron. This produced paid orders with `meta_purchase_state=null` and zero attempts. |
| Fix | Added a shared service-role dispatcher with lease fencing and bounded backoff. SePay replay, manual confirmation replay and manual paid provisioning all hand an unmarked paid order to the same dispatcher without changing payment success. |
| Meta contract | `Purchase` keeps the real `paid_at`, stable `event_id=order_code`, Website action source, order value/currency/items and stored attribution. Successful finalization records the Meta trace; failed or skipped requests remain retryable. |
| Retry contract | Only paid, unmarked orders whose real `paid_at` is within seven days are claimable. `/api/meta/purchase-retry` requires `CRON_SECRET`, processes at most ten per run and exposes no customer payload; Vercel schedules the fallback daily. |
| Database | Production already contains `claim_meta_purchase_orders` and `finish_meta_purchase_order` as security-definer RPCs restricted to `service_role`. The source migration is now tracked in this branch so future releases cannot silently omit the architecture. |
| Verification | RED reproduced all five missing contracts. GREEN passes 17/17 focused tests, 517/517 full Node tests, TypeScript, ESLint with zero errors/one unchanged warning, and the 93-page Next.js production build. |
| Production | Release commit `9bff9e2`; deployment `dpl_FxVx4S3tVtuiVzvtTfLLtVvkobNB`; Ready and promoted to `www.theanhmarketing.com`. Rotated the stale `CRON_SECRET`, preserved unauthenticated 401, and verified authenticated 200. Initial recovery claimed 1/sent 1 with a stored Meta trace; readback is 32 paid orders in seven days, 0 unsent and 0 due. No runtime errors were reported. |

## 2026-08-03 - Accounting email for every paid order

- `lib/notifications/accounting-payment-email.ts` renders one internal HTML/text email with customer name, phone, email, product/service, paid amount, order code, Vietnam paid time and payment method. Requested invoices also include tax code, company, address and invoice delivery email.
- `services/accountingNotificationService.ts` owns accounting eligibility and delivery markers. Both `POST /api/sepay/webhook` and `POST /api/payment/confirm` call it for every valid confirmation, while the sent marker safely skips duplicates and allows failed sends to retry; course, Ebook, consultation and support-booking branches are all covered.
- `public.orders.accounting_email_sent_at` prevents intentional duplicates and `accounting_email_last_error` preserves a bounded retry reason. Accounting failure never reverts payment, blocks customer email/account access or changes Meta, Telegram and Google Sheets side effects.
- Production recipient is server-only `ACCOUNTING_NOTIFICATION_EMAIL`. The approved value is managed in Vercel and must not be hard-coded into client code.
- `scripts/backfill-accounting-payment-emails.ts` defaults to dry-run for paid orders since `2026-08-02 00:00 +07:00`, matches stored receiving-account evidence to the configured Greezhub account, skips sent rows and requires explicit review of ambiguous order codes before `--send`.
- Local gate: accounting regression `8/8`, full Node `511/511`, TypeScript, build 91 pages and diff check pass. ESLint has zero errors and the unchanged existing warning in `components/crm-v2/support-bookings-client.tsx`.
- Production retry endpoint `POST /api/payment/accounting-retry` is SePay-key protected, bounded to 50 validated order codes and returns aggregates only. Deployment `dpl_C35A8fXAyguEq8cGsaJLkiqiAFp5` is live; 6 approved emails totaling 4.592.000đ were sent, with 6 markers and 0 remaining errors. Retry regression is `9/9`; Vercel build is 92 pages.

## 2026-07-22 - Facebook Ads 799K pending-email title

- `lib/notifications/pending-payment-email.ts` normalizes 799,000 VND Facebook Ads pending orders to the current buyer-facing AI Agent package title.
- Do not restore the retired `Zoom lên ads + Agent kit` wording for `zoom-kit`; the optional Ebook bundle keeps its combined title and 1,098,000 VND total.
- Live since production `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55` from runtime commit `3a4f52d`; final no-Ebook and bundle test emails were confirmed in the approved Gmail Inbox.

## 2026-07-22 - Facebook Ads Ebook checkout add-on

- Landing option: `ebookAddon`, positioned after phone and before submit.
- Default plan: `zoom-kit`, 799,000 VND. Bundle plan: `zoom-kit-ebook-299`, 1,098,000 VND.
- Server order items: `facebook-ads-2026` at 799,000 VND and `ebook-facebook-ads-2026` at 299,000 VND. Browser-provided amounts are not trusted.
- One SePay order/QR grants both entitlements. The paid route prioritizes the primary Facebook Ads thank-you page, while the combined success email also provides Ebook online/PDF access.
- Exact-slug helpers support both `order_items` and legacy/fallback comma-separated `course_slug` rows.
- Standalone Ebook checkout remains unchanged. No schema change. Live in production `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55`.

Muc tieu cua file nay: giup cac phien Codex/Claude/agent khac vao repo la hieu duoc he thong website, khong phai lan vet tung file. File nay uu tien kien truc, luong du lieu, noi can sua, noi khong nen dung cham, va checklist verify.

Repo chinh: `E:\TheAnh-Business-Workspace\02_Website\landing-page`

Current deploy source after 2026-06-11 incident: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`

## 2026-07-22 - Facebook Ads landing Agent proof section

| Hạng mục | Chi tiết |
|---|---|
| App/route | `main-site`, `/academy/facebook-ads-master-2026`; canonical static source `public/ladipage/facebook-ads-2026.html`, published copy `public/academy/facebook-ads-master-2026.html`. |
| Placement | `#agent-tu-dong-len-quang-cao` is after `#san-pham-thuc-te` and before `#lo-trinh`. |
| Demo | `/ladipage/assets/facebook-ads-agent-demo.gif` is a 960x490, 4,124,531-byte infinite-loop GIF. The `<picture>` serves `/ladipage/assets/facebook-ads-agent-demo-poster.webp` under reduced motion. |
| Proof | Three result cards explain six campaigns, safe PAUSED state and returned IDs. The Zalo marquee contains one accessible 12-card sequence plus one `aria-hidden` visual duplicate; each WebP is 640px wide. Cards use `15:32`, `300px` desktop, `244px` mobile, a `12px` gap and centered cover crop of about 1.5%. |
| Privacy | Seven designed support-call screenshots keep the existing privacy masks. The original screenshot ending `a1814dc3cf3103050c99a5f65d909d65.jpg` is excluded. |
| Guard | `tests/facebook-ads-landing.test.mjs` enforces placement, copy, GIF/poster paths, asset existence/size, exactly 12 accessible proofs, source/published equality and continued absence of the 399K offer. |
| Verification | Focused `10/10`, full Node `415/415` serial, TypeScript, ESLint, diff check, 105-page build, desktop/390px browser QA and a 12-image fitted-crop contact sheet pass; all seven call-duration highlights remain visible. |
| Deploy | Live in production deployment `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55`, Ready and aliased to `https://www.theanhmarketing.com`. |

## 2026-07-22 - Facebook Ads learning-room reference library

- `data/course-reference-packs.ts` is the only course-to-download configuration. It returns seven resources only for `facebook-ads-2026`: six Master Prompt TXT files and one Google Sheet demo; every other course gets an empty array.
- `app/learn/[course]/[lesson]/page.tsx` resolves packs after reading the published course and passes them to `LearningRoom`. This does not change auth, entitlement, progress or activity logging.
- `components/course/course-reference-library.tsx` renders text-only responsive cards immediately after the video. Six local actions use `download`; the Google Sheet action opens in a new tab. The existing lesson title, completion, previous/next controls, content and lesson-specific resources remain below and unchanged.
- Public prompt files live at `public/course-resources/facebook-ads-2026/master-prompts/` and must remain byte-identical to the approved customer-kit source files.
- Never add real Ads reports, Ads account IDs, customer/CRM data, account screenshots, Voice DNA, Agent/skill source, scratch/build files, duplicate images or performance claims to these downloads.
- Current local verification: copied-file SHA-256 comparison passes; focused `3/3`, full Node `415/415`, TypeScript, ESLint, diff check, protected-surface preflight and local Next build of 105 pages pass. Production deployment and authenticated live QA remain pending for this seven-resource revision.

## 2026-07-12 - Focused Course Studio, customer-owned orders and Ads BI

- Course Studio step changes build URLs from `studioMode`, so `/admin/course-studio/[courseSlug]` never bounces through the legacy CRM course route. Curriculum uses a compact module outline and reveals lessons for one selected module; module management is collapsed until requested.
- Unified customer course identity is merged atomically. Paid public orders outrank CRM orders, explicit lead mapping and inferred landing/UTM values. Ebook detection uses word boundaries because the old `/ebook/` matcher incorrectly matched the substring inside `Facebook`.
- The standalone Orders navigation/table is retired. `/admin/crm-v2/orders` and `/admin/don-hang` redirect to Customers; the existing customer 360 profile remains the only order-history UI. Order services and APIs are preserved.
- `/admin/crm-v2/reports` now combines the canonical paid-order report with Meta Ads. Today is labeled hourly in Vietnam time; source/course/funnel/unit-cost comparisons use horizontal bars. Undefined denominators render `Chưa đủ dữ liệu`; `Doanh thu sau Ads` is explicitly not accounting profit.
- Protected scope remains unchanged: no landing, checkout/payment, email, student learning/access/progress, enrollment or course-content mutation belongs to this release.

## 2026-07-11 - Solo Admin Command Center release candidate

- Branch/commits: `feat/solo-command-center-20260710`, Tasks 1-8 end at `c42f3c6`; production was not deployed or changed.
- Admin entry: owner `/admin` and `/admin/dashboard` redirect to the canonical CRM v2 Executive Operating System at `/admin/crm-v2`; editor remains on the role-safe legacy course editor until CRM v2 has an editor-only layout boundary.
- Visuals: six real-data chart groups cover paid revenue trend, order status, paid course revenue, funnel, paid/free/trial growth and access health. No ad-profit/demo metric is mixed into the production model.
- Student operations: list activity is lazy; one wizard handles paid/free/trial; partial/failed operations enter the queue by safe operation ID; owner email review is explicit and race-fenced.
- Local gates: full Node 394/394, focused provisioning 73/73, TypeScript, ESLint, Next production build and diff check passed. Spec and quality reviews approved.
- Browser smoke: unauthenticated `/admin` redirected to `/admin/login?next=%2Fadmin%2Fdashboard`; unauthenticated grant/review POST returned 403; no error overlay. Synthetic/no-PII visual captures are in `E:\TheAnh-Business-Workspace\02_Website\artifacts\solo-command-center-20260711\`.
- Captures: `dashboard-desktop.png`, `dashboard-mobile.png`, `wizard-paid-confirmation.png`, `wizard-trial-mode.png`, `wizard-partial-email-review.png`.
- Release blockers: three migrations are unapplied and were only statically reviewed because local PostgreSQL, Docker and Supabase CLI are unavailable. Verify/apply in order: `20260711100000_command_center_reporting.sql` (bounded LMS reporting RPC), `20260711110000_admin_student_provisioning_operations.sql` (journal/lease RPCs), then `20260711120000_student_provisioning_idempotency.sql` (idempotency, enrollment, email review and safe status RPCs). Compile and concurrency-test on disposable/staging PostgreSQL, apply with review, run owner smoke using a designated test account, then deploy preview via the protected project guard.

## 2026-07-11 - Canonical Admin foundation and guided Course Workspace

- CRM v2 is the single owner-facing admin foundation. Compatibility routes redirect after auth: `/admin/dashboard` → `/admin/crm-v2`, `/admin/leads` → `/admin/crm-v2/leads`, `/admin/don-hang` → `/admin/crm-v2/orders`, `/admin/bao-cao` → `/admin/crm-v2/reports`; owner student/course routes redirect to CRM v2 while editor access remains on the legacy role-safe pages.
- `components/crm-v2/crm-components.tsx` owns the shared Executive Operating System shell. Primary navigation is Overview, Customers, Orders, Students, Courses, Email, Automation, Reports and Settings; Activity, Segments, Team and Integrations are secondary advanced tools.
- `/admin/crm-v2` uses `getCrmV2Dashboard(query)` and production data only. RPC failure falls back to direct production queries instead of demo or empty synthetic metrics. Dashboard cards link only to verified destinations and no longer render disconnected campaign/workflow insight rows.
- The canonical course manager remains `components/crm-v2/lms-management-client.tsx`; no third LMS was introduced. Its URL-backed `step` workflow has seven freely navigable steps: Overview, Sales Content, Curriculum, Media & Resources, Students & Access, Analytics, and Review & Publish.
- Curriculum reuses the existing module/lesson mutations in a two-column workspace. Analytics is calculated from real enrollments/progress. The publish review is advisory and never blocks free navigation. Save state is explicitly visible as ready/saving/saved/error.
- Legacy page source is retained for compatibility and editor safety; no database schema, production course content, enrollment or student account is changed by this UI release.
- Production release: `dpl_HSVVTGv7VPeRPbpGcX8dZawWAZQc`, project `theanhmarketing`, target production, Ready and aliased to `https://www.theanhmarketing.com`. Verification passed full Node `399/399`, Chromium CRM `33/33`, TypeScript, ESLint, local/Vercel build, protected preflight, live route smoke and post-release error-log scan.
- Production status: fail-closed; do not enable or call provisioning APIs in production before the database and authenticated smoke gates pass.

## 2026-07-11 - Solo Admin Command Center production release

- Production deployment: dpl_9BxXpsmV25dXmHzAYoyzjddfJDdJ, Ready on Vercel Project theanhmarketing; aliases include https://www.theanhmarketing.com and https://theanhmarketing.com.
- Database: reporting, provisioning journal/lease, durable idempotency, enrollment, email dispatch/review, finalization and safe recovery RPCs are applied and metadata-verified. No customer record or outbound email was created by rollout verification.
- Migration packaging: the provider migration transport truncated large PL/pgSQL payloads, so the original two large provisioning migration files are now short schema migrations plus ordered function migrations. Tests aggregate the ordered migration set, preserving source-level regression coverage.
- Live smoke: /admin routes redirect as expected without a session; CRM V2 API returns 403; /go, /vao-khoa-hoc, /academy/facebook-ads-master-2026 return 200; protected library redirects to login; obsolete /admin/facebook-ads is 404. Vercel error logs after smoke are empty.
- Remaining manual gate: authenticate a designated non-customer owner test account, open /admin, and create/recover only a clearly marked test student before operational use. Do not test against a real customer.

## 2026-07-11 - Idempotent student provisioning orchestration

- Core flow: `services/studentProvisioningService.ts` orchestrates paid, free, and trial student provisioning. It validates the real course catalog before claiming one durable operation, preserves account state, uses paid-order entitlement for paid access, and uses the lease-fenced LMS RPC for free/trial access.
- Journal: `services/studentProvisioningOperationService.ts` owns request fingerprints, claims, lease renewals, safe-result allowlisting, and terminal finalization against `public.admin_student_provisioning_operations`. Fingerprints include the canonicalized student name, so a reused operation ID cannot silently provision a different person.
- Email safety: the journal stores one numbered dispatch attempt and idempotency key. Only a definitive local pre-provider skip is retryable. Any attempted provider HTTP/network failure or uncertain replay becomes `manual_review`; an owner must explicitly confirm delivery or non-delivery before another attempt.
- Owner boundary: `resolveProvisioningEmailReview()` derives the current owner through `getCurrentAuth()` and `canAccessAdminRole()`. Callers cannot supply an arbitrary owner ID, and the service-role-only SQL RPC does not authorize from user-editable auth metadata.
- Atomic terminal truth: `finalize_admin_student_provisioning_operation()` locks the journal row, checks the current lease with database time, inserts/deduplicates the no-PII `activity_logs` audit, and updates the terminal journal state in one transaction. A lost lease writes neither record.
- Migration: `supabase/migrations/20260711120000_student_provisioning_idempotency.sql`. It remains unapplied in this branch; do not use the orchestration in production until migration rollout and authenticated owner smoke are explicitly approved.
- Guard: `tests/admin-student-provisioning.test.mjs` covers canonical replay identity, paid provenance, owner auth, numbered email dispatch, provider failure review, lease loss, and atomic terminal audit+journal behavior.
- Admin UI: `/admin/hoc-vien?add_student=1` opens the single three-step paid/free/trial wizard in `components/admin/student-provisioning-wizard.tsx`; the dashboard links to this entry. `StudentCreateDialog` keeps the separate payment-link form as a secondary tab, while the legacy intake component delegates to the same wizard.
- API boundary: `POST /api/admin/students/grant` authenticates owner/editor, bounds and strictly parses JSON through `lib/admin/student-provisioning-request.ts`, passes the canonical actor ID to `provisionStudent()`, strips any one-time credential, and returns structured account/order/access/email outcomes. It never accepts a caller-selected password.
- Recovery: partial/failed provisioning audit events enter the command-center queue by safe operation ID. The recovery link reloads the allowlisted journal result through `GET /api/admin/students/provisioning-status` without PII, then reopens the wizard with that same operation ID; matching data resumes, while a changed fingerprint fails closed. Ambiguous email uses owner-only `POST /api/admin/students/provisioning-review` with exactly `confirm_delivered` or `confirm_not_delivered`; only the latter can authorize one numbered attempt.
- UI guard: result cards never display generated passwords. Narrow retry buttons appear only from `nextActions`; ambiguous provider state has no generic retry.

## 2026-07-10 - Facebook Ads post-payment access guide

- Page: `app/cam-on-thanh-toan/facebook-ads-2026/page.tsx` remains the public/noindex thank-you route for paid `facebook-ads-2026` orders.
- Flow: `components/payment/payment-status-poller.tsx` still redirects paid Facebook Ads course orders to `/cam-on-thanh-toan/facebook-ads-2026`; payment behavior was not changed.
- UI requirement: the page now explains the full customer-visible access journey in five steps: payment success, check mail, open the payment confirmation email, retrieve the temporary password, log in and enter the student dashboard.
- Safety: the guide shows only masked placeholder credential copy (`Email đã mua khóa`, `Mật khẩu tạm`) and reminds customers not to create a new account before checking the payment-success email. It does not expose passwords or protected course content.
- Guard: `tests/facebook-ads-thank-you-guide.test.mjs` locks the email-password-login copy and verifies the paid redirect remains pointed at the dedicated guide.

## 2026-07-08 - CRM v2 Leads customer-detail student access actions

- Request: owner wants `/admin/crm-v2/leads` to let him grant course access and resend/set student passwords, with every task visible only after clicking a customer name.
- UI: `app/admin/crm-v2/leads/page.tsx` now loads real course options through `getCourses()` and passes them to `components/crm-v2/leads-page-client.tsx`. The expanded customer row renders a `Quyen hoc vien` panel with course checkboxes, `Cap quyen`, `Thu quyen`, and `Gui lai mat khau`.
- Flow preserved: the CRM Leads screen does not own a new access/email flow. It reuses `POST /api/admin/students/access` and `POST /api/admin/students/password-reset`; those routes remain owner/editor guarded and continue through `ensureStudentAccountForAccessGrant`, LMS enrollment sync, `sendStudentAccessEmail`, activity logs, and the existing password-login verification boundary.
- Guard: `tests/crm-v2-contract.test.mjs` requires course loading from the leads page, placement inside expanded detail, and both real API endpoints.
- Verification: RED contract test failed before implementation; then `node --test tests\crm-v2-contract.test.mjs` 21/21, `node --test tests\student-access-admin-controls.test.mjs tests\student-account.test.mjs` 19/19, TypeScript, lint, production build, and diff-check passed locally.
- Deploy: production `dpl_6juduNdvjcjQx4NzvefLGS4ewrsx`, alias `https://www.theanhmarketing.com`, Ready. Live unauth smoke: `/admin/crm-v2/leads` redirects to login, both admin student POST APIs return 403 unauth, `/vao-khoa-hoc` returns 200.
- Remaining: authenticated owner-session visual/click smoke is still needed because Codex could not see the logged-in CRM table after deploy.

## 2026-07-06 - Public Facebook Ads ebook trial reader

- Official trial link: `https://www.theanhmarketing.com/doc-thu/ebook-facebook-ads-2026`. This route is public/noindex and belongs to the main `theanhmarketing.com` deployment, not a standalone Vercel project.
- Premium landing entrypoint: `https://www.theanhmarketing.com/academy/ebook-facebook-ads-2026-premium#sample` has a `Mo ban doc thu online` CTA under the sample-section intro. It links to `/doc-thu/ebook-facebook-ads-2026` in a new tab and carries `data-event="sample_trial_reader_click"`.
- Component/page: `app/doc-thu/ebook-facebook-ads-2026/page.tsx` renders `components/ebook/facebook-ebook-preview-reader.tsx`.
- Access shape: only chapters 1 and 5 are readable from public images under `/ebook-facebook-ads-2026/phan-1` and `/ebook-facebook-ads-2026/phan-5`. Locked chapters remain listed but open a purchase modal to `/academy/ebook-facebook-ads-2026-premium#price`.
- Important separation: paid reader `/thu-vien/facebook-ads` and protected image API `/api/ebook/facebook-ads/page` still require login/access and should not be used for the trial route.
- Owner UI requirement: the trial sidebar hides `Phan n`, ordinal badges, and page counts; only chapter titles show, with readable/open chapters bright and locked chapters greyed. The sidebar has a full-width `Mua Ebook` CTA at the end of the left column.
- Guard: `tests/facebook-ebook-preview-reader.test.mjs` checks only parts 1 and 5 are unlocked, public assets do not include part 2, the preview does not import paid access checks, and the image key changes with `imageSrc`.
- Verification: targeted ebook tests `18/18`, TypeScript, lint, diff-check, production build, live route 200, paid reader unauth redirect, public part 2 image 404, public part 5 image 200, and live Playwright smoke passed. Production deploy `dpl_F8ZspEpZ3YjRuBWMvAchtaiCUTwH`, alias `https://www.theanhmarketing.com`, Ready. Wrong standalone Vercel project `ebook-main-locked` was removed. CTA follow-up deploy `dpl_441iB1zPaSTafe8epW2LfVyodgkc` verified live HTML contains `Mua Ebook` and the buy href. Landing-sample CTA deploy `dpl_5QpPWhERFvWJnLyNE5b8VkEvGJ2w` verified live HTML contains the reader CTA and Playwright sees it visible at `#sample`. Cleanup deploy `dpl_EHEp5vpkzGatfjBci5xGF2vXbfz8` removed internal-facing sample copy/cards from `#sample` while keeping the reader CTA visible.

## 2026-07-06 - Facebook Ads course paid checkout thank-you page

- Correction: `facebook-ads-2026` is the video/course product, while `ebook-facebook-ads-2026` is the gated ebook product. Do not reuse the ebook thank-you page/copy for course buyers.
- Page: `app/cam-on-thanh-toan/facebook-ads-2026/page.tsx` is public/noindex and explains the course buyer flow: `Check mail`, `Đăng nhập`, `Vào khóa học online`. Its CTA goes to `/dang-nhap?next=%2Fdashboard`, not the protected ebook reader/PDF routes.
- Redirect: `components/payment/payment-status-poller.tsx` now checks exact slugs. Paid `facebook-ads-2026` orders go to `/cam-on-thanh-toan/facebook-ads-2026`; paid `ebook-facebook-ads-2026` orders still go to `/cam-on-thanh-toan/ebook-facebook-ads-2026`; other products fall back to `/dashboard`.
- Guard: `tests/payment-page-reference-ui.test.mjs` requires the course route and forbids ebook copy/reader routes in the course thank-you page.
- Verification: RED/GREEN payment-page guard `7/7`, TypeScript, lint, production build, and targeted diff check passed. Production deploy `dpl_GNHDqZzGjjfLcyd4Vz5sFxuMsEWD`, alias `https://www.theanhmarketing.com`, Ready. Live smoke confirmed the course thank-you page has Facebook Ads Master 2026 copy, dashboard login next, and no ebook copy; ebook thank-you page still has ebook copy.

## 2026-07-06 - Premium ebook landing performance fix

- Issue: owner reported the premium Ebook Facebook Ads landing felt slow/laggy.
- Root cause: the page itself is small, but it referenced 29 PNG preview/mockup images totaling about `45.7MB`, including many 1920x1080 ebook page screenshots. Google Fonts was also loaded as a render-blocking stylesheet.
- Fix: created optimized JPEG assets under `public/ebook-facebook-ads-2026-premium/optimized` and updated both `public/ladipage/ebook-facebook-ads-2026-premium.html` and `public/academy/ebook-facebook-ads-2026-premium.html`. Only the hero image is `fetchpriority="high"`; the other 28 images use `loading="lazy" decoding="async"`. Google Fonts now loads via non-blocking preload with a noscript fallback.
- Verification: source/published landing tests passed, typecheck passed, diff-check passed, build passed. Live Playwright smoke on `https://www.theanhmarketing.com/academy/ebook-facebook-ads-2026-premium` saw 29 optimized images, 28 lazy images, 1 high-priority image, 7 image resources loaded initially, about `0.69MB` initial image transfer, and no failed requests.
- Production deployed: `dpl_7duU7Ah7i4BbZs6z3ZYW3NWg1Pp4`, alias `https://www.theanhmarketing.com`, status Ready.

## 2026-07-06 - Ebook paid checkout thank-you handoff

- Request: after a customer scans the QR and SePay marks the ebook order paid, do not send them straight to `/dashboard`. Show a thank-you page that explains how to get the ebook: `Check mail`, `Đăng nhập`, then `Tải Ebook hoặc học Online`.
- Fix: `components/payment/payment-status-poller.tsx` now routes paid `ebook-facebook-ads-2026` orders to `/cam-on-thanh-toan/ebook-facebook-ads-2026` after the existing 4.5s success delay. Other products keep the old `/dashboard` fallback.
- Page: `app/cam-on-thanh-toan/ebook-facebook-ads-2026/page.tsx` is public/noindex and links to `/dang-nhap?next=%2Fthu-vien%2Ffacebook-ads` for online reading and `/dang-nhap?next=%2Fthu-vien%2Ffacebook-ads%2Fpdf` for PDF download. It does not make protected ebook/PDF content public.
- Guard: `tests/payment-page-reference-ui.test.mjs` requires the ebook paid redirect to use the thank-you route and not `router.push("/dashboard")`.
- Verification: RED/GREEN payment-page test, targeted payment/ebook/email/account suite `50/50`, full Node suite `239/239`, TypeScript, lint, and production build passed locally.
- Production deployed: `dpl_7sKw4uTkJwMgQ2kDMZzMvT7oHF97`, URL `https://theanhmarketing-q15i4k7tt-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke: thank-you route 200 with the 3-step guide, login reader/PDF links 200, and unauth reader/PDF still redirect to login with the correct `next` path.

## 2026-07-06 - Meta CAPI Lead dedup for sales landing pages

- Request: owner asked to set up CAPI for the website and landing pages following Meta guidance: server route, hashed customer data, direct Graph API delivery, and shared `event_id` for deduplication.
- Existing shape preserved: this repo already sends server-side `Lead` from `/api/orders` and `Purchase` from `/api/sepay/webhook` plus `/api/payment/confirm` through `lib/meta/conversions-api.ts`. Because website orders/payments already land in Vercel routes, we did not add a separate Supabase webhook or duplicate CAPI route.
- Fix: `MetaLeadEventInput` now has explicit `eventId`, so CAPI `event_id` can stay equal to the browser Pixel event ID while `leadId` can still be used for Meta numeric `user_data.lead_id` when available. `/api/orders` passes the incoming landing-page `leadId` as `eventId`.
- Landing pages: Facebook Ads static source/published pages now send Pixel `Lead` with `{ eventID: leadId }` on real form submit and send the same `leadId` to `/api/orders`. Premium ebook static source/published pages now generate a client `leadId`, pass it to `/api/orders`, and use that same ID for Pixel `Lead`.
- Env: production Vercel has encrypted `META_CAPI_ACCESS_TOKEN`, `META_CAPI_DATASET_ID`, `META_CAPI_API_VERSION`, and `NEXT_PUBLIC_META_PIXEL_ID`. The helper now reads `META_CAPI_DATASET_ID` and falls back to the primary Pixel ID if env is absent.
- Verification: RED/GREEN `tests/meta-conversions-api.test.mjs`, updated ebook landing guard, full `node --test tests\*.mjs` 237/237, `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run lint`, touched-file `git diff --check` with LF/CRLF warnings only, and `npm.cmd run build` passed. Live Events Manager test/dedup still needs a temporary `META_CAPI_TEST_EVENT_CODE` or approved live order after deploy.
- Production deployed: `dpl_2EzaAHyN4ed8SET7j1u666mQewy3`, URL `https://theanhmarketing-myurgxj96-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke: `/academy/facebook-ads-master-2026` 200 and contains primary Pixel plus `eventID`/`event_id: leadId`, `/academy/ebook-facebook-ads-2026-premium` 200 and contains client `leadId`, `/vao-khoa-hoc` 200, `/go?.../vao-khoa-hoc` 200, `/api/orders` 405, and Vercel logs after smoke showed only info 200 entries.

## 2026-07-06 - Ebook paid email requires verified account

- Issue: owner noted that paid ebook customers click "read online" or "download PDF" after payment, but those routes require login. If the email does not include a usable account/password, the customer is stuck at `/dang-nhap`.
- Access shape: ebook reader/PDF access is intentionally protected by auth plus the `ebook-facebook-ads-2026` access slug. Do not make the PDF public to solve this; the paid email must only go out when login credentials are ready.
- Fix: `app/api/sepay/webhook/route.ts` now detects `ebook-facebook-ads-2026` paid orders and requires `ensureStudentAccountForPaidOrder()` to return a verified `temporaryPassword` before calling `sendPaymentSuccessEmail()`. If provisioning fails or returns no password, it records `payment_email_last_error` and activity `payment_success_email_failed` instead of sending protected links.
- Guard: `tests/student-account.test.mjs` includes a source-level regression test that requires the SePay ebook success email to be blocked until a verified login account is available.
- Verification: targeted account/payment/ebook tests `56/56`, full Node tests `237/237`, TypeScript, lint, and production build passed locally.
- Production deployed: `dpl_4VFsyQV6CejyjJgg659wne4Ryczv`, URL `https://theanhmarketing-5xkx2cixr-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke: `/thu-vien/facebook-ads` unauth redirects to login, `/thu-vien/facebook-ads/pdf` unauth redirects to login, `/vao-khoa-hoc` returns 200, and the premium academy route works without `.html`.

## 2026-07-06 - Student dashboard course selection fix

- Issue: owner screenshot showed `/dashboard` opening/highlighting the wrong course. The dashboard was selecting `activeCourse = ownedCourses[0]`, and `ownedCourses` inherited the raw `courses` order from DB/static data. For admin or multi-access accounts, this could put `marketing-gioi-phai-kiem-duoc-tien` in the hero even when the expected course was `facebook-ads-2026`.
- Fix: added `lib/student-dashboard-courses.ts` as the shared ordering helper. Dashboard course order now follows the canonical product sequence, and owned courses preserve the access/order-paid slug order. `app/dashboard/page.tsx` passes `allCourseSlugs` from that helper and merges `paidSlugs` before LMS backfill slugs, so explicit paid access drives the main course selection.
- UI: `components/app/student-dashboard.tsx` now derives `ownedCourses`, `suggestedCourses`, and `activeCourse` through the helper. The hero, `Hoc tiep`, owned course tiles, suggested course tiles, and ebook reader/PDF behavior stay consistent.
- Guard: `tests/student-dashboard-course-selection.test.mjs` reproduces the bug where raw courses start with the flagship course but owned access starts with `facebook-ads-2026`.
- Verification: RED/GREEN dashboard selection test, targeted LMS/dashboard tests `31/31`, full Node suite `236/236`, TypeScript, lint, `git diff --check` on touched files with LF/CRLF warnings only, and `npm run build`.
- Production deployed: `dpl_B836efZdg94xfCq9YaDYFFx5iJXV`, URL `https://theanhmarketing-elx5w59zq-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live unauth smoke: `/dashboard` redirects to login, `/learn/facebook-ads-2026/11187acd-83da-4e75-87dc-c2de058deddd` redirects to login without leaking lesson/YouTube content, and `/vao-khoa-hoc` returns 200.

## 2026-07-06 - Login persistence and forgot-password audit

- Request: add a remember-login feature and verify whether forgot-password gives customers a real password reset path.
- Login fix: `lib/supabase/client.ts` now supports `persistence: "remember" | "session"`. Remember mode uses browser `localStorage` plus a 30-day Supabase auth cookie; session mode uses `sessionStorage` plus a browser-session cookie. Student `/dang-nhap` and admin `/admin/login` both expose `Luu dang nhap tren thiet bi nay`, default checked to preserve previous login behavior.
- Forgot-password audit: `/api/auth/forgot-password` already creates a real Supabase `recovery` link with Admin `generateLink`, converts the `hashed_token` into the internal `/api/auth/recovery/confirm` URL, sends it through Resend, then `verifyOtp` sets the recovery session before `/doi-mat-khau`. The customer sets the new password via `supabase.auth.updateUser({ password })`; no plaintext password is emailed.
- Scope: no schema/database changes, no customer account reset, no live reset email sent in this pass.
- Guard: `tests/admin-operational-lead-email-flow.test.mjs` covers the recovery-link path, password update path, and remember/session login persistence controls.
- Verification: targeted test passed 5/5, related auth/email tests passed 26/26, full Node suite passed 234/234, TypeScript passed, lint passed, and production build passed.
- Production deployed: `dpl_5NxHaYHhJHADrmjxTTa1vTBQh2zR`, URL `https://theanhmarketing-dk083gui9-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke: `/dang-nhap` and `/admin/login` return 200 and contain the remember-login checkbox, `/quen-mat-khau` 200, `/vao-khoa-hoc` 200, unauth `/api/admin/crm-v2/reports?range=30d` 403, `GET /api/auth/forgot-password` 405, and Vercel logs showed only expected info entries.

## 2026-07-05 - CRM v2 reports daily revenue newest-first fix

- Issue: owner screenshot showed `/admin/crm-v2/reports` daily revenue still listing oldest dates first, so today/newest day was pushed down.
- Fix: `getCrmV2ReportSnapshot()` now reverses the report daily revenue series after selecting the direct attribution daily revenue fallback, so the Reports `Doanh thu theo ngay` card renders newest/today first.
- Scope: display ordering only. No schema, API, payment/order/email write flow, or attribution calculation change.
- Guard: `tests/crm-v2-contract.test.mjs` requires Reports daily revenue to call `.reverse()` for newest-first rendering.
- Verification: CRM contract 21/21, TypeScript, lint, `git diff --check` for touched files, and production build passed.
- Production deployed: latest `dpl_2Z49sZ4aVUBqyoUCob94S9sXekLQ`, URL `https://theanhmarketing-n164m0df2-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke: `/admin/crm-v2/reports?range=30d` unauth redirects to login, `/api/admin/crm-v2/reports?range=30d` returns 403 unauth, `/vao-khoa-hoc` returns 200, and Vercel logs showed no errors.

## 2026-07-05 - CRM v2 activity feed from Resend, orders, and learning logs

- Issue: owner wanted `/admin/crm-v2` "Hoat dong gan day" to show real customer activity: Resend/email delivery for payment/registration checks, order registration/payment events, and learning-area events when a customer enters the course area. The list must be newest-first and have a full history view.
- Fix: `listCrmV2ActivityHistory()` now merges `public.email_logs` (Resend-backed `resend_email_id` and status timestamps), `public.activity_logs` (student/login/learning/payment/account events), `public.lead_activities`, CRM v2 events, CRM v2 email events, and live `public.orders`. Events carry `occurredAtIso` for real newest-first sorting instead of sorting formatted Vietnamese date strings.
- UI: Overview still shows a short "Hoat dong gan day" feed, now with a button to `/admin/crm-v2/activity`. The new `/admin/crm-v2/activity` route shows up to 100 events for the selected CRM date range and is also in the CRM sidebar as `Hoat dong CRM`.
- Learning source: real lesson pages already write `student_entered_learning` through `logStudentActivity()`, so the feed can show customers entering the learning area only after the actual learning route succeeds.
- Scope: read/display only. No schema migration, no Resend API token use, no email sending change, no order/payment write flow change.
- Guard: `tests/crm-v2-contract.test.mjs` requires the direct `email_logs` read, `resend_email_id`, `student_email`, `student_entered_learning`, `occurredAtIso`, and the full activity route.
- Verification: targeted CRM contract passed 21/21, full Node tests passed 229/229, student/payment email targeted tests passed 21/21, TypeScript passed, lint passed, `git diff --check` had LF/CRLF warnings only, and `npm run build` passed.
- Production deployed: latest `dpl_997EJK13xdz47Pxgot1ibU7yJUtc`, URL `https://theanhmarketing-pid0mjgj3-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke: `/admin/crm-v2/activity?range=30d` and `/admin/crm-v2?range=30d` unauth redirect to login, `/api/admin/crm-v2/reports?range=30d` returns 403 unauth, `/vao-khoa-hoc` returns 200, and Vercel logs showed only info smoke entries/no errors.

## 2026-07-05 - CRM v2 overview daily revenue chart live-order fix

- Issue: owner screenshot showed `/admin/crm-v2` overview "Doanh thu theo ngay" stuck on old dates such as `06-10`..`06-16`, and bar values were displayed as unclear raw numbers (`0`, `2`, `3`).
- Root cause: `getCrmV2Dashboard()` already used live `public.orders` for the KPI total, but the overview daily revenue chart still rendered `dailyRows` from the CRM daily read model. If the read model lagged, the overview chart lagged even while real orders existed.
- Fix: overview daily revenue now builds a date series from paid `public.orders` for the selected CRM range, maps timestamps with `Asia/Ho_Chi_Minh` day keys, keeps only the latest 7 days for the overview card, and sends `displayValue` labels like `0d`, `799k`, or `1tr` into `SimpleBars`.
- Follow-up same day: owner clarified the chart must put today's date at the top and must not round money. `buildDashboardDailyRevenueSeries(...).slice(-7).reverse()` now renders the latest day first, `value` stays the exact VND amount, and `displayValue` uses exact VND formatting such as `2.399.000đ` instead of compact rounded labels.
- Scope: UI/data read formatting only. No schema, migration, auth, payment/order write flow, email, Google Sheet, or CRM action API change.
- Guard: `tests/crm-v2-contract.test.mjs` now requires overview daily revenue to use `buildDashboardDailyRevenueSeries()` from live orders and requires `SimpleBars` to support `displayValue`.
- Verification: targeted CRM v2 contract passed 21/21, full Node tests passed 229/229, TypeScript passed, lint passed, `git diff --check` had LF/CRLF warnings only, and `npm run build` passed.
- Production deployed: latest `dpl_Ft6qnmURme2Xgozo4kXZabW8AcSS`, URL `https://theanhmarketing-nwsx77i5u-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke: `/admin/crm-v2?range=30d` unauth redirects to login, `/api/admin/crm-v2/reports?range=30d` returns 403 unauth, `/vao-khoa-hoc` and `/go?.../vao-khoa-hoc` return 200, and Vercel logs showed only info smoke entries/no errors.

## 2026-07-03 - Google Sheet order sync activity logging

- Issue: owner reported orders were not appearing in Google Sheet and needed a clear note on required Google permissions.
- Existing shape preserved: `lib/notifications/google-sheets.ts` still owns payload building, Apps Script URL validation, and webhook POST. No schema, payment, checkout, SePay, or Apps Script payload contract changed.
- Fix: added `lib/notifications/google-sheets-order-sync.ts` as the required boundary for order sync. It calls `syncOrderToGoogleSheet()`, writes `activity_logs` event `sheet_sync_success` or `sheet_sync_failed`, and records safe metadata only (`orderCode`, source, status, skipped, webhookHost).
- Wired routes: `/api/orders`, `/api/orders/from-session`, `/api/sepay/webhook`, and `/api/payment/confirm` now use `syncOrderToGoogleSheetWithActivity()` instead of calling the low-level webhook helper directly.
- Runbook: `docs/GOOGLE_SHEETS_ORDER_SYNC_RUNBOOK.md` explains that `GOOGLE_SHEETS_WEBHOOK_URL` must be an Apps Script Web App `/exec` URL, deployed with `Execute as: Me` and `Who has access: Anyone`, with a `doPost(e)` handler returning JSON.
- Guard: `tests/google-sheets-sync.test.mjs` now requires route wiring through the activity helper and checks success/failure activity log coverage.
- Verification: targeted Google Sheet test was run RED then GREEN; targeted order/payment suite, full Node 220/220, typecheck, lint, diff-check, and build passed. Deployed production `dpl_GaiPNW2SVszTUoJW9UhS8Q4RJV62`, alias `https://www.theanhmarketing.com`, Ready. Smoke confirmed `/api/orders` HEAD 405, admin orders login redirect, `/vao-khoa-hoc` 200, `/go` 200, and clean 10m logs. Live Apps Script response still needs an approved real/test order after deploy; if activity shows HTTP 403, redeploy Apps Script with public web-app access and update Vercel env.

## 2026-06-29 - CRM v2 Leads time column local fix

- Request: add hour/minute display on `https://www.theanhmarketing.com/admin/crm-v2/leads`.
- Scope: UI/data formatting only. No schema, API, auth, Zalo action, payment/order/email flow, or production data mutation changed.
- Fix: `lib/crm-v2/data.ts` adds `formatCrmLeadDateTime()` and uses it for unified Leads rows from CRM v2 rows, `public.leads`, and `public.orders`; `components/crm-v2/leads-page-client.tsx` labels the first table column `Thời gian` and gives it room for `dd/mm hh:mm`.
- Guard: `tests/crm-v2-contract.test.mjs` now requires the `Thời gian` column, the shared formatter, and prevents mapper regressions to `slice(0, 10)` date-only labels.
- Verification: targeted CRM v2 contract failed before the fix and passed 20/20 after the fix; full Node 203/203, TypeScript, lint, diff-check, and build passed.
- Production deployed: `dpl_FmLscGrfkMG8CoyS3VydPLRK1xeJ`, URL `https://theanhmarketing-j9qj3t4ln-theanhs-projects-509d0c97.vercel.app`, aliases `https://www.theanhmarketing.com` and apex, status Ready.
- Live smoke: `/admin/crm-v2/leads?range=30d` unauth redirects to login, `/api/admin/crm-v2/leads?range=30d` unauth returns 403, `/vao-khoa-hoc` and `/go?.../vao-khoa-hoc` return 200, and Vercel logs for 10m showed only info smoke entries/no 5xx.

## 2026-06-28 - Admin CRM v2 frame-block header fix deployed

- Issue: Chrome showed `ERR_BLOCKED_BY_RESPONSE` when opening `https://theanhmarketing.com/admin/crm-v2`.
- Root cause verified from live headers: the route redirects apex -> `www` -> `/admin/login`, but admin responses still emitted `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'`, which can block Chrome/webview/shell flows that treat apex and `www` as different ancestors.
- Fix: `proxy.ts` adds `isAdminRoute()` for `/admin` and `/admin/*`; those routes no longer set `X-Frame-Options` and instead use CSP `frame-ancestors 'self' https://theanhmarketing.com https://www.theanhmarketing.com`.
- Scope: `/api/admin/*` and other non-admin routes still keep `X-Frame-Options: SAMEORIGIN`; `/go` and `/vao-khoa-hoc` keep their older bridge behavior with no `frame-ancestors`.
- Guard: `tests/student-email-access-flow.test.mjs` checks the admin canonical frame-ancestor allowlist and prevents reintroducing admin `X-Frame-Options`.
- Verification: full Node tests 203/203, TypeScript, lint, diff-check, build, local header smoke, Vercel inspect, live header smoke, and 10m log scan all passed.
- Production deployed: `dpl_2z2ZdkbMUFWe8hWdBEjixuFZb4jD`, URL `https://theanhmarketing-57xgfpozo-theanhs-projects-509d0c97.vercel.app`, aliases `https://www.theanhmarketing.com` and `https://theanhmarketing.com`, status Ready.

## 2026-06-26 - CRM v2 Leads Zalo row action deployed

- `/admin/crm-v2/leads` now has a compact row action button that displays only `Z`.
- Follow-up hotfix: the Zalo column now sits next to `SDT` instead of at the far-right edge, so it is not clipped; expanded quick detail shows `Zalo: Da nhan Zalo` or `Chua nhan Zalo`.
- Follow-up persist fix: the click handler now posts `mark_zalo_messaged` and updates local detail state before opening Zalo PC/web fallback, so every successful click records the lead as Zalo-messaged first.
- Follow-up bridge-row fix: the click payload includes phone/email/orderCode, and the backend resolves `public-order:*` rows back to CRM/public leads before updating to avoid `Marked 0 lead rows as Zalo messaged`.
- Follow-up fallback-anchor fix: if no existing lead/contact can be resolved but the row has phone/email/orderCode, the action creates a small `public.leads` anchor with `sale_status=Da nhan Zalo` so the update succeeds and the UI can open Zalo.
- Follow-up operation-order fix: the UI now opens Zalo first, then runs the CRM update in the background with `fetch(..., keepalive: true)`; CRM update errors no longer block opening Zalo.
- The button normalizes the row phone number, tries to open Zalo PC with `zalo://conversation?phone=<phone>`, and falls back to `https://zalo.me/<phone>` if the browser stays on the page.
- The same click posts `mark_zalo_messaged` to `/api/admin/crm-v2/leads/actions`.
- The action is owner-gated like other CRM v2 lead actions. It updates `crm_v2.leads` with `last_touch_at`, `next_action`, and metadata `last_zalo_messaged_at`, writes `crm_v2.crm_events`, and applies tag `da-nhan-zalo`.
- For fresh bridge rows with ids like `public-lead:<uuid>`, the fallback update is `public.leads.sale_status=Da nhan Zalo`; no migration was added.
- Guard: `tests/crm-v2-contract.test.mjs` checks the UI link behavior, API action, metadata/event/tag persistence, bridge-row identifiers/resolution, fallback anchor creation, open-before-update click order, keepalive, Zalo column placement next to phone, and expanded-detail Zalo status.
- Verification: RED contract test failed before implementation and again for the follow-up layout guard; after fixes, CRM contract 20/20, full Node 202/202, TypeScript, lint, build, and diff-check passed locally.
- Production deployed: `dpl_32qDyRtSW37kF5tCH1QPjigNeU47`, URL `https://theanhmarketing-hwcy5jqbd-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready.
- Live unauth smoke: `/admin` and `/admin/crm-v2/leads?range=30d` redirect to login next, unauth `POST /api/admin/crm-v2/leads/actions` returns 403, `/vao-khoa-hoc` and `/go?.../vao-khoa-hoc` return 200, and Vercel logs for 10m showed only smoke requests/no 5xx.
- Owner-session click verify is still needed because Codex has no admin cookie.

## 2026-06-24 - Facebook domain verification deployed

- The site now renders Facebook domain verification for `theanhmarketing.com` via `FACEBOOK_DOMAIN_VERIFICATION` in `lib/marketing-settings.ts`.
- `app/layout.tsx` sets root metadata `facebook-domain-verification` directly from that constant so app routes do not depend on a mutable DB setting for domain verification.
- Static HTML landing pages under `public/ladipage` and `public/academy` also include the tag, including Facebook Ads 2026, ebook Facebook Ads 2026, and AI Agent pages.
- Guard: `tests/meta-conversions-api.test.mjs` checks the constant, layout metadata, and representative static HTML output.
- Verification pass: full Node tests 202/202, TypeScript, lint, diff-check, and production build.
- Production deployed: `dpl_EiE4xd5corSrCg44JgHxPdRQZuPs`, alias `https://www.theanhmarketing.com`, status Ready. Live smoke confirmed the meta tag on homepage and `/academy/facebook-ads-master-2026`; apex redirects to `www` and final 200; `/vao-khoa-hoc` and `/go?.../vao-khoa-hoc` return 200.

## 2026-06-17 - Student account password delivery guard local-ready

- `services/studentAccountService.ts` is now the required boundary for any flow that issues a temporary student password.
- After Supabase Admin `createUser`/`updateUserById`, the service attempts to normalize Auth password-login fields on `auth.users`: `aud/role=authenticated` and token/change string fields (`confirmation_token`, `recovery_token`, `email_change_token_current`, `email_change_token_new`, `email_change`, `phone_change`, `phone_change_token`, `reauthentication_token`) to empty strings.
- The same service then verifies the issued password with Supabase anon `signInWithPassword`. If verification fails, it returns `ok=false`, does not return the temporary password, and callers must not send account/password email.
- `/api/admin/students/password-reset` no longer owns a separate sign-in verification helper; paid-order provisioning, admin grant, and password reset share the service-level guard.
- Regression guards: `tests/student-account.test.mjs` and `tests/student-access-admin-controls.test.mjs`.
- Local gate pass: full Node tests 202/202, TypeScript, lint, diff-check, and production build.
- Deployed production after owner approval: `dpl_BF5vXQ5QT1KiTvgyw9SP2SjLYdGE`, URL `https://theanhmarketing-mveii7n6j-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready.
- Live smoke after deploy: `/admin` and `/admin/dashboard` redirect to `/admin/crm-v2`; `/admin/hoc-vien` redirects to login unauthenticated; unauthenticated `POST /api/admin/students/password-reset` returns 403; `/vao-khoa-hoc`, `/go`, and `/dang-nhap` return 200; Vercel logs after smoke show no error/fatal entries.
- E2E reset/password email was not run in this pass because it would reset a real/test account and send a real email. Use an approved test account/email before running that live path.

## 2026-06-16 - CRM v2 perceived lag feedback deployed

- CRM v2 now has shell-level route feedback in `components/crm-v2/crm-components.tsx` via `CrmRouteFeedback`.
- CRM v2 links, range controls, search submit, filter controls, and refresh emit immediate pending feedback before server navigation finishes.
- `app/admin/crm-v2/loading.tsx` provides a route segment skeleton for KPI/table/right-panel surfaces.
- This pass does not change CRM v2 data ownership, migrations, backfill, email behavior, or legacy admin routes.
- Local verify: Node tests 198/198, typecheck, lint, diff-check, build, Playwright CRM v2 32/32.
- Warm local TTFB measured: overview 0.160s, reports today 0.139s, orders 0.152s, leads 0.153s, students 0.187s.
- Production deployed from this worktree as `dpl_GAcZpGLMhL1nHMBaCwhoqX1zjyyv`, URL `https://theanhmarketing-dj4cokqw2-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready.
- Post-deploy smoke: `/admin` and `/admin/dashboard` redirect to `/admin/crm-v2`; unauth CRM v2 redirects to login; unauth CRM API returns 403; `/go` and `/vao-khoa-hoc` return 200; Vercel error logs 15m clean.

Do not deploy from `E:\TheAnh-Business-Workspace\02_Website\landing-page` until it is synced and passes the full gate. Read `E:\TheAnh-Business-Workspace\02_Website\DEPLOY_SOURCE_OF_TRUTH.md` first.

Remote GitHub: `https://github.com/nguyentheanh-ai/theanhmarketing.git`

Production: `https://theanhmarketing.com`

Stack: Next.js App Router, TypeScript, Tailwind CSS v4, Supabase, Recharts, Framer Motion, Resend/email helpers, Meta Pixel/CAPI, SePay webhook.

## 2026-06-22 - CRM v2 Reports revenue chart + visual funnel fix

- App/domain: `main-site` / `theanhmarketing.com`.
- Source/deploy root: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`.
- Issue: `/admin/crm-v2/reports?range=yesterday` showed total revenue from direct `public.orders` attribution, but the "Doanh thu theo ngay" chart could stay blank/stale because it rendered `dashboard.revenue` from CRM daily metrics/read model.
- Fix: `getCrmV2ReportSnapshot()` now returns `reportSummary.dailyRevenue` and overrides report `dashboard.revenue` with daily revenue built from paid `public.orders` for the selected CRM date range. It uses Vietnam-day bounds via `dateLowerBound()` / `dateUpperBoundExclusive()` and maps `paid_at`/`created_at` to `Asia/Ho_Chi_Minh` date keys.
- UI: Reports now renders daily/period revenue through `ReportValueBars`, with compact VND labels and a clear empty state instead of an empty white card.
- UI: "Pheu dang ky -> vao hoc" now renders a clipped triangle/trapezoid funnel with the five business stages: Khach dang ky, MQL, Cho thanh toan, Da thanh toan, Vao hoc.
- Guard: `tests/crm-v2-contract.test.mjs` now checks direct daily revenue source, Vietnam-day report bounds, report-specific chart renderer, empty-state copy, and visual funnel clipping.
- Verification: `node --test tests\crm-v2-contract.test.mjs`, full `node --test tests\*.mjs` 202/202, `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run lint`, `git diff --check` (LF/CRLF warnings only), `npm.cmd run build`.
- Local visual smoke: `http://127.0.0.1:3020/admin/crm-v2/reports?range=yesterday` screenshot saved at `E:\Temp\UserTemp\crm-v2-reports-funnel-fix.png`; body horizontal overflow was 0.
- Deploy: production `dpl_izTDqCN9tS3vDYGDZEhPB9q2gz2f`, alias `https://www.theanhmarketing.com`, status Ready. Live unauth smoke: `/admin` 307 to `/admin/crm-v2`, `/admin/crm-v2/reports?range=yesterday` 307 to login, `/api/admin/crm-v2/reports?range=yesterday` 403, `/vao-khoa-hoc` 200, `/go?.../vao-khoa-hoc` 200. Vercel logs after smoke showed only info 200/307/403.
- Limitation: authenticated owner-session visual confirmation on live production still needs anh refresh browser session because Codex HTTP smoke has no owner cookie.

## 1. Doc Can Doc Truoc

Neu chi co 5 phut, doc theo thu tu nay:

1. `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md` - file nay.
2. `E:\TheAnh-Business-Workspace\02_Website\DEPLOY_SOURCE_OF_TRUTH.md` - deploy root va predeploy gate.
3. `E:\Kinh doanh\docs\SESSION_START_CHECKLIST.md` - protocol dau phien.
4. `docs/DESIGN_RULES.md` - quy tac UI/branding.
5. `docs/DATABASE_ARCHITECTURE.md` - bang Supabase va quan he du lieu.
6. `docs/SECURITY_HARDENING.md` - auth, RLS, CSP, env, hardening.
7. `docs/SEPAY_SETUP.md` - payment/webhook/doi soat.

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
| `/thanh-toan/[code]` | `app/thanh-toan/[code]/page.tsx` | Huong dan thanh toan va polling trang thai; co layout checkout sang cho AI Agent Business/Agent Kit va Facebook Ads 2026, demo local `AGENTKITDEMO`, van dung `SEPAY_*`, QR SePay, `TransferDetails`, `PaymentStatusPoller`. Facebook Ads 2026 phai nhan dien bang slug, khong dua vao title co chu `Agent kit`: 799K hien `2.590.000d -> 799.000d`, 399K hien `2.290.000d -> 399.000d`. Since 2026-06-10 this page schedules customer pending-payment email and Telegram `order_created` after the page response through `services/checkoutNotificationService.ts`. |
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

- `app/api/orders/route.ts`: create order; if a `leadId` is supplied, update the existing lead instead of creating a duplicate lead row. Since 2026-06-10 this route must not send admin email, customer pending-payment email, Telegram `order_created`, Meta Lead, or Google Sheet sync inside the response-critical request; heavy side effects run after-response. New leads created from this route pass `syncGoogleSheet: false` to `createLeadAdmin()` and are synced later via `syncLeadByIdToGoogleSheet()`.
- `app/api/orders/[code]/route.ts`: lookup/update order by code.
- `app/api/orders/from-session/route.ts`: order from session/cart; same after-response side-effect rule as public order creation.
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
- `services/checkoutNotificationService.ts`: checkout-entry notification coordinator. It sends customer pending-payment email and Telegram `order_created` only after `/thanh-toan/[code]` has rendered, and uses conditional DB claims on `pending_payment_email_sent_at` plus `order_created_telegram_sent_at` markers from `docs/SUPABASE_CHECKOUT_NOTIFICATION_MARKERS.sql` to avoid duplicates, including near-simultaneous payment page opens. It must not call admin email helpers and must not set `payment_email_sent_at`.
- `services/emailLogService.ts`: lifecycle logging in `email_logs`; `/api/resend/webhook` updates delivered/bounced/complained/opened/clicked by `resend_email_id`.

Compatibility note: Admin Lead resend still writes legacy `lead_email_logs` for existing resend count/history and also writes `email_logs` for lifecycle tracking after `SUPABASE_ADMIN_OPERATIONS.sql` is applied.
- `lib/notifications/telegram.ts`: Telegram order notifications. `order_created` is now sent by `services/checkoutNotificationService.ts` after the payment page response, not by order creation APIs. `app/api/sepay/webhook/route.ts` still sends `payment_paid` once for newly paid orders. Production `TELEGRAM_CHAT_ID` was set on 2026-06-08 to the `Greezhub x Report` group (`-5220455978`) and redeployed in `dpl_7fq1tDhaQYmoVwtwtmE5reknPbWn`. Do not print `TELEGRAM_BOT_TOKEN`; Vercel env pull may return empty values for encrypted/sensitive Telegram vars.
- `services/leadEmailService.ts`: chooses resend template by real matched order status (`payment_success`, `payment_failed`, `pending_payment`) and is called by owner-only Admin Lead resend API.
- Email font/style note 2026-06-07: notification emails should use CSS-safe inline font stack `'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif`; do not use bare `font-family:Arial...` or heavily letter-spaced uppercase H1 styles. Guard: `tests/notification-email-font.test.mjs`.

Google Sheet sync:

- `lib/notifications/google-sheets.ts` posts to `GOOGLE_SHEETS_WEBHOOK_URL`; it does not read service-account env directly.
- `GOOGLE_SHEETS_WEBHOOK_URL` must be an Apps Script Web App `/exec` URL such as `https://script.google.com/macros/s/.../exec`, not the Google Sheet edit URL. The Apps Script deployment must be a Web App with Execute as `Me` and Who has access `Anyone`.
- Payloads include `entityType` and `dedupeKey`. For lead entity, prefer stable `lead.id` so an initial lead sync and later order/status sync update the same row.
- Lead sync metadata lives in `leads.google_sheet_synced_at`, `leads.google_sheet_row_id`, `leads.google_sheet_sync_error`; apply `docs/SUPABASE_ADMIN_LEADS_FLOW.sql` before expecting this to persist in production.
- Apps Script/webhook must upsert by `entityType + dedupeKey` (or equivalent leadId/orderCode/email/phone priority) to avoid duplicate rows.
- Production note 2026-06-08: migration `admin_leads_crm_sheet_resend_20260605` is applied. Google Sheet webhook blocker is fixed after Vercel Production `GOOGLE_SHEETS_WEBHOOK_URL` was updated and redeployed in `dpl_4FBV2ojuaYWKBSFEAyQiJ3Bkh8mw`. Smoke lead `b12d1975-a15b-47bd-8ae6-15bc14101d88` returned `sheetSync.ok=true` and appeared in `Orders` row 7. Backfill cleared 81/81 pending/failed leads; remaining unsynced leads = 0. Supabase extension `http` was enabled via migration `enable_http_extension_for_google_sheet_backfill_20260608` only to run DB-side backfill.
- Production note 2026-06-14: checkout-created lead rows must not dump the generated remarketing/order tracking blob into the `note` column. `buildGoogleSheetLeadPayload()` suppresses generated checkout notes and sends `paymentPlan`, `referrer`, `ipAddress`, and `webLeadId` as separate payload fields; UTM/fbclid/fbc/fbp/landingPage already have separate columns. Live Sheet `Orders` now has BZ:CC for those four fields, and BY `note` is hidden to avoid confusing operators while preserving raw historical notes.

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
- Static sales landing HTML under `public/ladipage` and `public/academy` must keep the single browser Pixel, `Lead` after successful form/order save, `/api/orders`, `_fbp`/`_fbc`, `fbclid`, and UTM forwarding. Do not fire `InitiateCheckout` before a real checkout/order-code context; Facebook Ads landing specifically must not fire `InitiateCheckout` in the submit handler before redirecting to `/thanh-toan/<orderCode>`. Guard this with `tests/meta-conversions-api.test.mjs` and `tests/facebook-ads-landing.test.mjs`.
- Checkout page `/thanh-toan/[code]` fires browser `InitiateCheckout` once per order code using `event_id=order.orderCode` and sessionStorage dedupe. Keep checkout optimization tied to this order-code event, not CTA clicks or pre-order form submits.
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

Branch: `deploy/website-production-20260604` in the current production deploy worktree. The canonical root branch `main` must be synced before it is used for deploy again.

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

Before deploy, run the guard:

```powershell
E:\TheAnh-Business-Workspace\02_Website\scripts\codex-session-guard.ps1 -Path .
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
- Meta tracking update 2026-06-14: `components/auth/register-form.tsx` fires browser `CompleteRegistration` after `/api/orders` succeeds. Payload must include `event_id` and `order_id` from `orderData.order.orderCode`, `value` from `orderData.order.amount`, and `currency` fallback `"VND"` so Meta Events Manager does not flag missing currency/ROAS issues. Guard: `tests/meta-conversions-api.test.mjs`. Deployed production `dpl_EDEwYpeV5VPCkvxZnD5ZvN84uPkR`; live `/dang-ky` JS chunk confirmed the new payload.
- Private ads landing `app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx` uses source facts from `E:\TheAnh-Business-Workspace\05_AI_Growth_Kit_Product` and the route is `noindex`. The visible ads price is `359K` through payment plan `agent-kit-ads-359`; do not change the global course price `Bo Agent Kit X10` from `799K` unless the owner explicitly asks.
- Facebook Ads 2026 checkout must stay separate from Agent Kit private ads checkout. Do not classify an order as Agent Kit from product title text like `Agent kit`; use `courseSlug`/item slug. Verified live 2026-06-05: `TAMMPX99H22LJP8R` shows `2.590.000d -> 799.000d`, `TAMMPYBBP2110IHA` shows `2.290.000d -> 399.000d`, and neither shows `Giu gia 359K` or `AI Agent Business`.
- Deployed 2026-06-08 in `dpl_DSCncK46ydco5XjuDcvK4n4jMDoB`: Facebook Ads Master 2026 LadiPage originally showed 399K and featured 799K cards; 799K includes AI Agent planning ads. Updated 2026-07-22: the public landing now exposes only the 799K AI Agent package, defaults/submits `paymentPlan=zoom-kit`, and uses `799000` for `ViewContent`; the 399K card/copy/landing `video` plan and optional Zoom add-on are absent. Keep historical 399K/`video` and `advanced-zoom` backend compatibility unless owner asks otherwise. Card hover/click selects the remaining plan; mobile selection scrolls to the form; email placeholder is `email@gmail.com`. Payment success email CTA must point to `/vao-khoa-hoc`, not direct `/dang-nhap`. Pending-payment transfer amount is formatted with `amountLabel`.
- Course/LMS update 2026-06-13: Facebook Ads 2026 has lesson `Bài 17 - Hướng dẫn lên quảng cáo tin nhắn` in module `Triển khai, đo lường và tối ưu quảng cáo`, YouTube URL `https://www.youtube.com/watch?v=auPdBJGY_pQ`, embed `https://www.youtube.com/embed/auPdBJGY_pQ`. Production Supabase `vsxxgdzwtscuxcmjfckt` was updated directly; fallback `data/courses.ts` and SQL patch `docs/SUPABASE_ADD_FACEBOOK_ADS_MESSAGE_ADS_LESSON_20260613.sql` keep the lesson durable. Direct học viên URL is `/learn/facebook-ads-2026/8ab7e52a-f3d4-48d4-809d-fec6a5c13e92` and unauthenticated users correctly redirect to login with `next`.
- Ebook Facebook Ads 2026 landing/payment update 2026-06-14: deployed in `dpl_HAWwnQdi9oATzUwqmZprVdDAoWVt`; public URL is `/academy/ebook-facebook-ads-2026` served cleanly by rewrite with no `.html` in the browser URL, and `/academy/ebook-facebook-ads-2026.html` redirects back to the clean route. Source static HTML is `public/ladipage/ebook-facebook-ads-2026.html` and published HTML is `public/academy/ebook-facebook-ads-2026.html`. Header uses the real The Anh Marketing logo asset `/brand/ta-logo.svg`, not a text `TA` badge. Preview images are original PNG pages under `public/ebook-facebook-ads-2026/phan-1/1.png` through `29.png`. Payment uses separate product slug `ebook-facebook-ads-2026`, plan `full-access-299`, amount `299000`, so it does not grant/report as the `facebook-ads-2026` course. Visible CTA copy is preorder-oriented (`Dat truoc` / `Đặt trước`). Keep these routes in `isLadiPageRoute()` in `proxy.ts`; otherwise CSP blocks inline preview/search/order scripts. Guard test: `tests/ebook-facebook-ads-landing.test.mjs`. Production smoke orders `TAMMQCFIPDUIKJCU` and `TAMMQCG8B3GPD5CE` confirmed amount `299000` and checkout text/SePay render; they are test pending orders, not real payments.
- Deployed 2026-06-08 in `dpl_7bwk1CyGBFk2CutK7XNmCMfYpYEK`: Facebook Ads 2026 payment success emails for AI Agent plans (799K and 1.299K add-on Zoom) include the Google Doc `Huong dan su dung AI Agent`; 399K basic email must not include that guide link.
- Deployed 2026-06-15 in `dpl_2Xftec3FjMdtX8ecJ5DSQVZxQKFu`: Facebook Ads 2026 payment success emails for the 799K support package include the ChatGPT custom GPT `Agent Ho Tro Quang Cao` (`chatgpt.com/g/g-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner`). The condition is intentionally narrow: `facebook-ads-2026` plus amount/item price `799000`; 399K must not include this GPT link. HTML buttons must use `/go?to=...`, plain text keeps the raw ChatGPT URL. Guard: `tests/payment-success-email.test.mjs`.
- `/vao-khoa-hoc` is an email/browser bridge page. It intentionally does not set `X-Frame-Options` and strips CSP `frame-ancestors` to avoid Chrome/Gmail `ERR_BLOCKED_BY_RESPONSE`; keep frame blocking on other routes through `proxy.ts`.
- Incident/fix 2026-06-08: paid student accounts must not skip existing Supabase Auth users. Google OAuth users can exist without an email/password hash, so `services/studentAccountService.ts` must update existing users with a fresh password/metadata when paid access or admin force reset is requested. SePay payment-success email must include the account block whenever `studentAccount.temporaryPassword` exists, not only when `created=true`.
- Admin `/api/admin/students/password-reset` is now a direct account-password reset flow, not a recovery-link flow: owner/editor operational route, generate/update password, verify with Supabase anon `signInWithPassword`, then send `sendStudentAccessEmail` through Resend. If verification fails, do not email the customer.
- Production customer recovery 2026-06-08: `phamthanhtinh1995@gmail.com`, order `TAMMQ4VQNH9MOH4L`, Auth user reset, login verified, email account recovery sent, temporary internal route removed, clean deploy `dpl_EnV4sofurA4XB9QegvrutmttVGDQ`.
- Email link bridge 2026-06-08: customer-facing HTML email buttons should use `buildEmailLink()` and route through `/go?to=...`; `app/go/page.tsx` validates an allowlist, auto-opens with a client component, and shows a manual button/copy fallback. `proxy.ts` exempts `/go` from `X-Frame-Options` and strips `frame-ancestors` to avoid Gmail/Chrome mail-webview blocked responses. Plain-text email bodies should keep the raw destination URL for copy fallback.
- Codex skill added: `C:\Users\12c1t\.codex\skills\theanh-student-account-email-safety\SKILL.md`; use it for paid student account, password reset, Resend email, or email link blocked incidents.
- Incident 2026-06-11: production admin was briefly rolled back because Vercel was deployed from `E:\TheAnh-Business-Workspace\02_Website\landing-page` instead of this production worktree. Until the root is explicitly synced, deploy website production only from `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`; verify `/admin` redirects to `/admin/dashboard`, `/admin/facebook-ads` is 404, and `node --test tests\*.mjs` plus build pass before deploy.
- CRM v2 parallel build 2026-06-15 lives only in feature worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-crm-v2` on branch `feature/crm-v2-parallel-build`. Do not deploy or merge it into `theanhmarketing-email-account-hotfix` until the existing dirty login-bridge changes are resolved, the `crm_v2` migration is reviewed/applied, live audit/backfill/verify pass, and `CRM_V2_ENABLED` is intentionally enabled.
- CRM v2 completion update 2026-06-15: the feature worktree now has feature-flagged admin APIs for all CRM v2 modules, workflow action support for test/save draft/publish/version history, mojibake guards for CRM v2 source strings, and Playwright smoke coverage for 12 UI routes plus 10 API/action checks. This is still local-only; no production migration/backfill/deploy has been run.
- CRM v2 real-controls update 2026-06-15: topbar search is a GET form, refresh calls `router.refresh()`, header/right-panel shortcuts are real links or API-backed client actions, inactive filters are read-only chips, and Email/Automation action buttons POST to CRM v2 APIs. Local verification now covers 26 Playwright CRM v2 checks plus full node tests/build. Still local-only: no production migration/backfill/deploy/flag enablement.
- Workspace cleanup note 2026-06-11: do not run broad `git clean -fdx` in either website root. Dry-run includes real untracked source (`/go`, `/vao-khoa-hoc`, email bridge/student access helpers) alongside cache/log artifacts. Classify and sync source first, then clean only whitelisted build/test artifacts.

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
6. Public checkout order APIs must stay fast: no admin email, no customer pending-payment email, and no Telegram `order_created` inside `POST /api/orders` or `POST /api/orders/from-session`. Checkout-entry notifications live in `services/checkoutNotificationService.ts` and require the marker columns from `docs/SUPABASE_CHECKOUT_NOTIFICATION_MARKERS.sql`.
7. Run payment/email tests before build.

### Sua Meta Pixel/CAPI

1. Client page events: `components/site/tracking-page-view.tsx`, `lib/tracking/events.ts`.
2. Registration completion event: `components/auth/register-form.tsx`; keep `CompleteRegistration` currency/value/order fields.
3. Server CAPI: `lib/meta/conversions-api.ts`.
4. Never expose token.
5. Run `tests/meta-conversions-api.test.mjs`.
6. Test runbook: `docs/META_CAPI_TEST_RUNBOOK.md`. Future manual CAPI smoke uses Graph API Explorer `POST /v25.0/1315653423712065/events` with a temporary `test_event_code`. Full website-route smoke requires temporary Vercel env `META_CAPI_TEST_EVENT_CODE`, one approved test form submit, then removing the env and redeploying.

## 2026-06-15 - CRM v2 workflow builder/runner local completion

- Worktree: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-crm-v2`.
- CRM v2 Automation Workflow now has an editable React Flow builder, API-backed test/save/publish/history, normalized node/edge persistence, additive workflow hardening migration, and server-side idempotent step-run preparation wired into lead bulk `add_workflow`.
- Verified locally: CRM targeted 18/18, full Node tests 187/187, Playwright CRM v2 27/27, manual builder payload smoke, typecheck, lint, build.
- Not production-enabled: no live migration/backfill/strict verify/flag/deploy yet.

## 2026-06-15 - CRM v2 remaining module action completion

- Worktree: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-crm-v2`.
- Added API-backed primary actions for Segments, Orders, Students, Team, and Integrations. These routes are owner-gated, rate-limited, feature-flagged, and write only to private `crm_v2` tables when Supabase admin env exists.
- New routes: `/api/admin/crm-v2/segments/actions`, `/orders/actions`, `/students/actions`, `/team/actions`, `/integrations/actions`.
- UI pages now render direct client action components for those modules, matching the no-fake-buttons rule used for Email/Automation.
- Verified locally: targeted contract 10/10, remaining-module Playwright 2/2, full Node tests 187/187, Playwright CRM v2 29/29, typecheck, lint, diff-check, build. Preview checked on `http://127.0.0.1:3020/admin/crm-v2/orders`.
- Still not production-enabled: no live migration/backfill/strict verify/flag/deploy has been run.

## 2026-06-16 - CRM v2 code deployed behind disabled production flag

- Deploy root: `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`.
- Deployment: `dpl_kyZw65t5eWJ3Dj5sxwTDbzf2ZCxR`, production URL `https://theanhmarketing-idotpi4gl-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Vercel status Ready.
- CRM v2 code/routes/API are now deployed to production, but Vercel Production env does not define `CRM_V2_ENABLED`; CRM v2 remains disabled until migration/backfill/strict verify are run and the flag is intentionally enabled.
- Predeploy gate from deploy worktree passed: `node --test tests\*.mjs` 190/190, `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run lint`, `git diff --check`, `npm.cmd run build`, and Playwright CRM v2 29/29.
- Live smoke after deploy: `/admin` redirects to `/admin/dashboard`; `/admin/dashboard`, `/admin/leads`, `/admin/hoc-vien` redirect to admin login; `/admin/facebook-ads` is 404; `/go?to=.../vao-khoa-hoc` is 200 without frame blocking; `/vao-khoa-hoc` is 200 without frame blocking; Facebook Ads landing has only Pixel `1315653423712065`, no extra pixels, no `zoomAddon`, and no early `InitiateCheckout`; `/app-login-bridge` unauth redirects to `/dang-nhap?next=%2Fapp-login-bridge`.
- Vercel log scan immediately after deploy returned no logs found.

## 2026-06-16 - CRM v2 Vietnamese copy hotfix deployed

- Fixed CRM v2 visible copy that still used no-diacritic Vietnamese, including sidebar/topbar/filter/pagination labels, Orders action `Gửi nhắc thanh toán`, module action buttons, lead profile labels, outline labels, data fallbacks, and API action status messages.
- Added regression guard in `tests\crm-v2-contract.test.mjs` so CRM v2 source/API/UI copy cannot regress to common no-diacritic phrases like `Gui nhac thanh toan`, `Tong quan CRM`, or `Tim ten`.
- Updated action APIs to honor `CRM_V2_USE_DEMO_DATA=true`, keeping local/demo preview mock-safe even when Supabase env exists but the private `crm_v2` schema has not been applied locally.
- Verification passed: CRM v2 contract 11/11, full Node tests 191/191, typecheck, lint, diff-check, production audit 0 vulnerabilities, build, and Playwright CRM v2 29/29.
- Production redeploy: `dpl_4Nu2ELMgXFc8mXfrVgEUJJcY6fmh`, production URL `https://theanhmarketing-mzuzds8xd-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Vercel status Ready. CRM v2 remains disabled on production because `CRM_V2_ENABLED` is still absent/off.
- Local preview is running at `http://127.0.0.1:3020/admin/crm-v2/orders`; browser DOM verified `Đơn hàng & Thanh toán`, `Gửi nhắc thanh toán`, `Tìm`, and `30 ngày`.

## 2026-06-16 - CRM v2 Outline operator-copy hotfix deployed

- User flagged `/admin/crm-v2/outline` for exposing internal implementation language (`BLUEPRINT`, `Data safe`, migration checklist, `crm_v2`, `legacy_id_map`, etc.).
- Fixed `/admin/crm-v2/outline` to be operator-facing: `Bản đồ vận hành`, practical module descriptions, `Ưu tiên vận hành`, and non-technical safety copy such as `CRM hiện tại: Giữ nguyên`, `Dữ liệu khách hàng: Không ghi đè`.
- Cleaned shared CRM shell labels: `Data safe mode` -> `Chế độ vận hành an toàn`, `Legacy CRM vẫn chạy song song` -> `CRM hiện tại vẫn giữ nguyên`, `CRM v2 on` -> `Bản CRM mới`.
- Added test guard so the Outline page cannot reintroduce implementation-only terms like `Blueprint`, `Data safe`, `Checklist migration`, `crm_v2`, `legacy_id_map`, `read-model`, `UI route ready`, `Safety guard`, `webhook`, `owner`, `stage`, `task`, or `ticket`.
- Verification passed: CRM v2 contract 12/12, typecheck, lint, build, diff-check with LF/CRLF warnings only, and local browser DOM check with `badFound=[]`.
- Production redeploy: `dpl_2Hk6kEEjSoRn7wjFoXg2SJvEpAAY`, production URL `https://theanhmarketing-n3bjlb4fu-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Vercel status Ready. CRM v2 remains disabled on production because `CRM_V2_ENABLED` is still absent/off.

## 2026-06-16 - CRM v2 live data enabled and `/admin` replaced

- Production Supabase project `vsxxgdzwtscuxcmjfckt`: applied additive private-schema CRM v2 migration to `crm_v2`; no destructive SQL against legacy `public.*` tables.
- Live backfill run `crm-v2-live-sql-backfill-20260616` is `success` with `drift_detected=false`.
- Latest production counts: source `public.leads=131`, `public.orders=138`, `public.activity_logs=536`, `public.lead_activities=19`, `public.email_logs=56`, `public.lead_email_logs=2`; CRM v2 `contacts=125`, `leads=264`, `orders=138`, `payments=138`, `enrollments=45`, `crm_events=882`, `email_sends=58`, `email_events=58`, `legacy_id_map=1583`.
- `/admin` now checks `CRM_V2_ENABLED`; with the production flag on it redirects to `/admin/crm-v2`. Direct legacy routes remain deployed for rollback, including `/admin/dashboard` and `/admin/leads`.
- Vercel production env was corrected after an initial blank-value add: `CRM_V2_ENABLED=true`, `CRM_V2_USE_DEMO_DATA=false`, `CRM_V2_ALLOW_DEMO_SEED=false`.
- Production deployment: `dpl_HriDnGzRaXTERRx2jWSL6oamyKJ4`, URL `https://theanhmarketing-mx5uxnxc5-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, status Ready.
- Smoke: `/admin` -> `/admin/crm-v2`; unauth `/admin/crm-v2` -> `/admin/login?next=%2Fadmin%2Fcrm-v2`; `/admin/dashboard` still resolves and redirects to its own login next path; `/vao-khoa-hoc` returns 200; Vercel error log scan found no errors.

## 2026-06-16 - CRM v2 live data alignment follow-up

- User reported CRM v2 numbers were misaligned from new leads through course management.
- Production root cause:
  - `crm_daily_metrics.new_leads` counted order-derived CRM opportunities in addition to true `public.leads`.
  - `/admin/crm-v2/leads` stage cards counted only current paginated rows.
  - CRM v2 `course_id` fields were null because production `public.courses` has only 1 row while real orders use multiple `course_slug` product values.
- Applied additive/idempotent SQL only in private `crm_v2`: refreshed daily metrics so `new_leads` excludes `metadata.source_table = public.orders`; legacy `public.*` tables were not modified.
- Updated code:
  - `lib/crm-v2/data.ts`: live dashboard direct rows, total stage summary, `course_slug` filters/search/display for leads/orders/students/contact profile, accented fallbacks.
  - `app/admin/crm-v2/leads/page.tsx`: stage summary query no longer derives from current page rows.
  - `components/crm-v2/crm-components.tsx`: added `/admin/khoa-hoc` link for the real course manager.
  - `tests/crm-v2-contract.test.mjs`: guards for true lead count, course_slug mapping, stage summary totals, course manager link, and copy accents.
  - `supabase/migrations/20260616123000_crm_v2_live_data_alignment.sql`: documents the corrected aggregate rule.
- Production verify after SQL: `public_leads_today=1`, `crm_real_leads_today=1`, `crm_order_opportunities_today=1`, `metric_new_leads_today=1`, `crm_orders=138`, `crm_enrollments=45`, `orders_with_course_slug=138`, `enrollments_with_course_slug=45`.
- Production deploy: `dpl_B5Lrn1XWG28By62DuWYHpnBRzr8H`, alias `https://www.theanhmarketing.com`, Ready.
- Gate passed: CRM v2 contract 14/14, full Node tests 194/194, typecheck, lint, build, diff-check, Vercel inspect Ready, no Vercel error logs in 15m.
- Browser is at `https://www.theanhmarketing.com/admin/login?next=%2Fadmin%2Fcrm-v2`; authenticated owner-session smoke remains needed to inspect rendered tables/actions.

## 2026-06-16 - CRM v2 live lead dedupe and table overflow fix

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Sua UI CRM v2 bi tran ngang tren Orders/Leads va Leads bi lap cung mot nguoi theo feedback anh chup man hinh. |
| Root cause | CRM v2 Leads dang hien mot row cho moi `crm_v2.leads` opportunity. Contact co ca lead-form row va order-derived row nen bi lap ten; stage hien raw code; Orders/Leads table bi long course/product text keo rong viewport. |
| Database | Applied additive migrations `crm_v2_dedupe_lead_rpc` va `crm_v2_dedupe_dashboard_rpc`; chi replace server-only read RPC, khong drop/truncate/delete/rename legacy tables. |
| Data verify | Production RPC: deduped lead total `125` thay vi raw duplicate total `258`; dashboard MQL `105`; stage counts `consulting=4`, `disqualified=17`, `not_contacted=3`, `paid=42`, `pending_payment=59`; sample Quang/Nguyen Hien/Le Son moi nguoi chi con 1 row, co phone, stage uu tien theo trang thai van hanh. |
| Code | `CrmDataTable` fixed layout/scroll/wrapping; Leads table them cot `SĐT`; stage/status badges hien label tieng Viet; Leads/Orders page grids dung `minmax(0,1fr)` de khong day tran viewport. |
| Deploy | Production deployment `dpl_4tbu2R5PkaRMvnQsbLLYjLc518iy`, URL `https://theanhmarketing-f9xzh9zl4-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Verify | CRM v2 contract 14/14, full Node tests 194/194, typecheck, lint, build, diff-check with LF/CRLF warnings only, Vercel inspect Ready, no Vercel errors in 15m, unauth live smoke for `/admin`, `/admin/crm-v2/leads`, and `/admin/crm-v2/orders`. |
| Con lai | Anh hard refresh owner browser session de nhin rendered UI da het tran va danh sach Leads da gop; Codex session nay khong expose browser-control tool de dung cookie login cua anh. |

## 2026-06-16 - CRM v2 Leads/Orders readability pass from mockups

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Sua giao dien CRM v2 theo mockup `E:\002\CRM 002`, uu tien de nhin/de truy van thay vi chi render du route. |
| Root cause | Leads table bi ep boi side panel va table fixed khong co width theo cot, lam course/customer text vo doc; stage cards khong nam mot hang nhu mockup. |
| Code | `CrmDataTable` co colgroup/explicit widths/clamp; Leads bo right insight panel, stage cards 7 cot desktop, contact block hien ten+email+SĐT; Orders insight panel chi nam canh table tren man rat rong. |
| Visual verify | Local Playwright 1620x900: `bodyOverflow=0`, seven stage cards same row, course cell reads normal, table scrolls internally. Screenshot: `E:\Temp\UserTemp\crm-v2-leads-ui-fix-1620-v3.png`. |
| Deploy | Production deployment `dpl_55W7jwfv4qYYuV4mBiY81MUhjrXT`, URL `https://theanhmarketing-qsejbu6pr-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Verify | CRM v2 contract 14/14, full Node tests 194/194, typecheck, lint, build, diff-check with LF/CRLF warnings only, Vercel inspect Ready, no Vercel errors in 15m, unauth live smoke `/admin/crm-v2/leads` and `/orders`. |

## 2026-06-16 - CRM v2 functional audit, date range RPC, and live-action hardening

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Bien CRM v2 tu khung UI thanh he van hanh that hon: audit tung route/nut/KPI, range dashboard that, email/payment reminder co provider/log, production khong mock ngam. |
| Docs | Added `docs\crm-v2\FUNCTIONAL_AUDIT.md`; rewrote `docs\crm-v2\VISUAL_SPEC.md` with readable Vietnamese and mockup rules. |
| Database | Applied additive Supabase migration `crm_v2_range_rpc` on project `vsxxgdzwtscuxcmjfckt`; adds date-aware server-only RPC overloads. No DROP/TRUNCATE/DELETE/rename legacy tables. |
| Data verify | Production RPC with date args returned `dashboard_new_leads_today=1`, `leads_total_30d=124`, `orders_total_30d=138`, `students_total_30d=45`. |
| Code | Range control now supports `7/30/90 ngày` through shared query contract; CRM v2 action APIs fail closed on production missing env; `send_test_email`, `send_campaign_now`, and `send_payment_reminder` use the EmailProvider boundary, suppression checks, idempotency keys, and CRM v2 event logs. |
| Safety | Real campaign send requires `GUI THAT` and a segment; it will not blast all contacts. Live reminder requires a valid CRM v2 order UUID. Demo mode is local/test only. |
| Deploy | Production deployment `dpl_GSRxiqKyxxLt3YBR4WqAGqSkfpG9`, URL `https://theanhmarketing-mchjmgep6-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Verify | Full Node tests 197/197, CRM unit/migration 12/12, typecheck, lint, build, diff-check with LF/CRLF warnings only, Playwright CRM v2 29/29, Vercel inspect Ready, live unauth smoke `/admin` -> `/admin/crm-v2`, CRM v2 pages -> login next, admin API -> 403, runtime logs 15m no errors. |

## 2026-06-16 - CRM v2 direct legacy dashboard redirect and side-panel overflow fix

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Xu ly feedback anh chup: `/admin/dashboard` van hien Admin Panel cu va nhieu CRM v2 dashboard bi cat right preview/insight panel. |
| Root cause | `/admin/dashboard` chua check `CRM_V2_ENABLED`; cac page CRM v2 dung grid `xl:grid-cols-[1fr_360px]`/`xl:grid-cols-[280px_1fr_340px]`, bi min-content cua table/day text keo panel ra ngoai viewport. |
| Code | `app/admin/dashboard/page.tsx` redirect sang `/admin/crm-v2` khi CRM v2 enabled; cac layout side-panel CRM v2 doi sang `minmax(0,1fr)`, `min-w-0`, va chi dat panel canh noi dung tren man rat rong. |
| Verify | CRM v2 contract 17/17, full Node tests 197/197, CRM unit/migration 12/12, typecheck, lint, build, diff-check, Playwright CRM v2 31/31. Playwright them guard no horizontal overflow tat ca CRM v2 route tai 1620x900 va guard `/admin/dashboard` redirect. |
| Deploy | Production deployment `dpl_CnHhSPVs1ALxEZurjTwohYa8Td1z`, URL `https://theanhmarketing-ey5rrt7tn-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Live smoke | `/admin/dashboard` -> `307 /admin/crm-v2`; unauth CRM v2 pages -> `/admin/login?next=%2Fadmin%2Fcrm-v2`; Vercel runtime logs 15m khong co error/fatal. |

## 2026-06-16 - Meta CompleteRegistration ROAS guard local fix

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Xu ly canh bao Meta Events Manager cho `CompleteRegistration` thieu/khong hop le `value` va `currency`. |
| Code | `components/auth/register-form.tsx` parse `Number(orderData.order.amount)` va chi fire browser `CompleteRegistration` khi `value > 0`; khong con `value: orderData.order.amount ?? 0`; van dung `currency || "VND"` va van redirect checkout neu skip tracking. |
| Guard | `tests/meta-conversions-api.test.mjs` bat buoc co `completeRegistrationValue`, guard `> 0`, va cam fallback `value` ve `0`. |
| Verify | RED tracking test fail dung ly do truoc fix; sau fix `node --test tests\meta-conversions-api.test.mjs` pass 7/7, full `node --test tests\*.mjs` pass 198/198, typecheck, lint va build pass. |
| Deploy | Production deployment `dpl_FSTG8J5dejRsJkzatxBMA3f6NGuE`, URL `https://theanhmarketing-l5wehx7tn-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. Live smoke `/`, `/dang-ky`, `/admin/dashboard`, `/go?.../vao-khoa-hoc` pass; live bundle co warning guard moi va khong thay fallback `value ?? 0`. |

## 2026-06-17 - CRM v2 Email course scope và Reports public-orders attribution

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Sua Email MKT de gan dung khoa hoc/tep thanh toan truoc khi preview/gui; sua Reports vi doanh thu paid co the sai khi `crm_v2.orders` stale. |
| Production data check | Count-only Supabase check: `public.orders` ngay 2026-06-16 co 1 paid order doanh thu 799.000d, trong khi `crm_v2.orders` cung ngay co 0. Legacy `public.orders` tiep tuc la payment source of truth. |
| Email code | Composer co select `Khóa học khách đăng ký`; `save_draft`, `preview_audience`, `refresh_audience`, `send_test_email`, `send_campaign_now` truyen/luu course/payment scope; campaign metadata co `audience_scope`; audience loc bang segment + `crm_v2.orders` contact/course/payment status. |
| Reports code | `buildReportAttributionRows` doc `public.orders` voi `paid_at`, `utm_source`, `course_slug`, `product_name`; KPI Reports uu tien attribution totals tu source thanh toan that. |
| Verify | `node --test tests\*.mjs` 198/198, `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run lint`, `npm.cmd run build`, Playwright CRM v2 Chromium 32/32, `git diff --check` pass voi LF/CRLF warnings only. |
| Deploy | Production deployment `dpl_A7JEVMxuxQSkCEJBHZBtG4eNwwPt`, URL `https://theanhmarketing-hb1d3gz9o-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Smoke | `/admin/dashboard` 307 -> `/admin/crm-v2`; unauth `/admin/crm-v2/email` and `/admin/crm-v2/reports?range=today&view=period` 307 -> login; unauth Reports/Email APIs 403; Vercel logs 10m no errors. |

## 2026-06-22 - CRM v2 Leads live source bridge

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Sua `/admin/crm-v2/leads?range=30d` vi table moi nhat dung o 16/06 trong khi ngay hien tai la 22/06. |
| Root cause | Leads & Pipeline unified table chi hop nhat `crm_v2` read-model/RPC lead/order rows. Read model nay co the stale sau backfill, trong khi source that `public.leads` va `public.orders` co du lieu moi hon. |
| Code | `lib/crm-v2/data.ts` them `listPublicLeadRowsForRange`, public lead/order mappers, `listFreshUnifiedCustomerRows`, `filterUnifiedCustomerRows`; `listCrmV2UnifiedCustomers(query)` merge CRM v2 rows voi fresh public rows theo selected range roi moi filter/sort/paginate. |
| Guard | `tests/crm-v2-contract.test.mjs` bat buoc unified pipeline doc `public.leads` + `public.orders` va dung Vietnam-day bounds. |
| Verify | CRM v2 contract 20/20, full Node 202/202, typecheck, lint, build, diff-check with LF/CRLF warnings only. |
| Deploy | Production deployment `dpl_24SRq1VEGMqVm6zy8D7QYmbkaYGF`, URL `https://theanhmarketing-5fikhwm6t-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Smoke | `/admin/crm-v2/leads?range=30d` unauth -> login 200, `/api/admin/crm-v2/leads?range=30d` unauth 403, `/admin` -> login 200, `/vao-khoa-hoc` 200, Vercel logs after smoke only info 200/307/403. |
| Con lai | Need owner-session hard refresh de nhin table live hien rows sau 16/06; Codex khong co admin cookie trong phien nay. |

## 2026-06-30 - CRM v2 overview dashboard visual upgrade rolled back

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Yeu cau moi | Anh yeu cau xoa toan bo thay doi trong phien "Nang cap CRM v2 UI". |
| Rollback | `/admin/crm-v2` quay lai dashboard co ban dung truc tiep `getCrmV2Dashboard(query)` voi `MetricGrid`, `SimpleBars`, `Timeline`, `RightInsightPanel`; sidebar quay lai menu CRM v2 cu. |
| Da xoa | `components/crm-v2/overview-dashboard.tsx`, `lib/crm-v2/dashboardMetrics.ts`, contract test ep dashboard mockup, marker smoke-test moi tren row buttons. |
| Khong doi | Khong sua database/schema/API/auth/admin permission/production data. Cac route CRM v2 hien co van giu nguyen. |
| Verify | Can xem phan rollback session 2026-06-30 trong workspace docs de biet lenh kiem tra cuoi cung. |

## 2026-07-01 - Facebook Ads ebook gated reader local-ready

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Dua local PNG ebook reader len website nhung khong mo bang public link; chi account da mua `ebook-facebook-ads-2026` hoac admin moi doc duoc. |
| Routes | `/thu-vien/facebook-ads` renders the reader; `/api/ebook/facebook-ads/page?part=X&page=Y` streams one PNG page after entitlement check. |
| Access | `lib\ebook\facebook-ebook-access.ts` uses `getCurrentAuth`, admin role bypass, and `getCourseAccessSlugs` over paid/admin-granted `ebook-facebook-ads-2026`. |
| Assets | Full 471 pages are expected in private Supabase Storage bucket `facebook-ads-ebook-2026` at `pages/part-{part}/{page}.png`. The full ebook must not be copied into `public`. |
| Sync | Run `node scripts\sync-facebook-ebook-storage.mjs` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; local source defaults to `E:\Kinh doanh Ebook\ebook-data\manifest.json` and `E:\Kinh doanh Ebook`. |
| Dashboard | `components\app\student-dashboard.tsx` routes owned ebook card to `/thu-vien/facebook-ads` instead of `/learn/ebook-facebook-ads-2026/lesson-1`. |
| Verify | `node --test tests\facebook-ebook-reader-access.test.mjs`, full `node --test tests\*.mjs` 208/208, typecheck, lint, and build passed locally. |
| Deploy | Continued 2026-07-01: uploaded 471/471 pages to private bucket `facebook-ads-ebook-2026`; deployed production `dpl_3dgywqBZ6X2vfcX8xTvNXhDAUArp`, alias `https://www.theanhmarketing.com`, Ready. |
| Smoke | Unauth `/thu-vien/facebook-ads` 307 to login, unauth `/api/ebook/facebook-ads/page?part=1&page=1` 401 JSON, `/academy/ebook-facebook-ads-2026` and `/vao-khoa-hoc` 200, direct public Supabase object URL for page 1 returned 400, Vercel logs clean. Authenticated paid-customer visual smoke still requires a real session. |
| Follow-up 2026-07-01 | Fullscreen/performance hotfix deployed production `dpl_DBSrASpVFHJ3Qp5qRMoqF2DZciRa`: reader fullscreen removes the 1120px cap and uses `100vw/100vh object-contain`; previous/next pages preload via protected API; visible PNG has async/high-priority hints; API cache is private `max-age=3600, stale-while-revalidate=86400`. Targeted test 7/7, typecheck, lint, build, live unauth smoke/log scan passed. |
| Follow-up 2026-07-01 14:43 | Mouse/keyboard interaction hotfix deployed production `dpl_E63Abo6XTRazDLxSa3KVaxCm8RKj`: wheel over the reader area zooms between `50%` and `220%`, toolbar zoom buttons share the same clamp, and `ArrowLeft`/`ArrowRight` navigate pages except while focus is inside editable inputs. Targeted reader test 8/8, typecheck, lint, build, live unauth smoke/log scan passed. |
| Follow-up 2026-07-01 15:06 | Owner asked to remove wheel zoom and fix stutter/hidden-sidebar whitespace. Production `dpl_7qXNevcDRCfTvTjQfvSVNBNcSUAc`: wheel zoom removed; buffered preloader now keeps current page plus 4 pages before/after in `preloadedImagesRef` and calls `.decode()`; hidden-sidebar mode uses wide reading width with `Math.max(zoom, 100)%` and no 1120px cap. Targeted reader test 9/9, typecheck, lint, build, live unauth smoke/log scan passed. |
| Follow-up 2026-07-01 17:08 | Owner screenshot showed hidden-sidebar left blank rail plus over-large reader crop. Production `dpl_4grqxCuV1HPqSbgytgVtF5ki3C2r`: closed TOC now collapses to `lg:w-0`; zoom buttons clamp to `75%`-`130%`; wide reading mode uses `fit-content`, `max-width: 100%`, and `max-height: calc(100vh - 9rem)` so the PNG fits the available viewport. Targeted reader test 10/10, typecheck, lint, build, live unauth smoke/log scan passed. |
| Follow-up 2026-07-01 18:19 | Owner reported TOC jumps between parts feel delayed. Production `dpl_6ohEbzEFGP995NeqZwp2HXKWhSdG`: added lightweight TOC target prefetch with `requestIdleCallback`, shared `preloadImageSrc()`/`Image.decode()` cache, and hover/focus prefetch for part/search-result buttons while keeping the protected image API. Targeted reader test 11/11, typecheck, lint, build, live unauth smoke/log scan passed. |
| Follow-up 2026-07-01 18:27 | Owner screenshot showed Phần 5 selected/header while the old Phần 2 PNG remained visible. Production `dpl_HYVJshDhgW7HxArVHbkvz9kAy77B`: navigation now stores `pendingAbsolutePage`, awaits target PNG decode, ignores stale navigation requests, then commits part/page state and clears the loading pill. Targeted reader test 12/12, typecheck, lint, build, live unauth smoke/log scan passed. |

## 2026-07-08 - CRM v2 Leads student access actions and password reset hotfix

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| CRM Leads UI | `/admin/crm-v2/leads` expanded customer detail now contains `Quyen hoc vien` controls: course checkboxes, `Cap quyen`, `Thu quyen`, and `Gui lai mat khau`. |
| APIs | UI reuses existing `POST /api/admin/students/access` and `POST /api/admin/students/password-reset`; no new student-access database flow was added. |
| Hotfix | Owner reported `Cap quyen` and `Gui lai mat khau` both looked like the course grant email. Root cause: `app/api/admin/students/password-reset/route.ts` called `sendStudentAccessEmail` with `action: "grant"`. |
| Fix | Password reset route now uses `action: "password_reset"`. `lib/notifications/student-access-email.ts` renders a distinct email with `Cap lai mat khau`, `Mat khau moi`, login CTA, and old-password-replaced note. Grant emails remain course-access emails. |
| Guards | `tests/crm-v2-contract.test.mjs` guards expanded-detail placement and real course loading. `tests/student-access-admin-controls.test.mjs` guards the distinct password-reset email and route action. |
| Verify | `node --test tests\student-access-admin-controls.test.mjs tests\student-account.test.mjs tests\notification-email-font.test.mjs` 21/21, `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run lint`, `npm.cmd run build`. |
| Deploy | Latest production deployment `dpl_E99Ku6Yt5jnjGEEBuwVeerDg57sS`, alias `https://www.theanhmarketing.com`, Ready. Live unauth smoke: both student admin APIs return 403 and `/vao-khoa-hoc` returns 200. |
| Remaining | Owner-session UI click and approved mailbox smoke are still needed before using the reset button broadly on real customers. |

## 2026-07-05 - CRM v2 LMS real management local-ready

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Muc tieu | Bien CRM v2 `Hoc vien/LMS` va `Quan ly khoa hoc` thanh khu quan ly that: course/module/lesson/resource/enrollment/progress dung database, khong con tab chet cho chuc nang chinh. |
| Data source | Shared source: `public.courses`, `public.course_modules`, `public.lessons`, `public.lesson_resources`, new `public.course_resources`, `crm_v2.enrollments`, and `crm_v2.course_progress`. |
| Code | Added `services/lmsService.ts`, `lib/lms/types.ts`, `components/crm-v2/lms-management-client.tsx`, admin LMS APIs under `app/api/admin/crm-v2/lms`, student progress API, student dashboard/lesson-room integration, and legacy admin-student access sync to LMS enrollment. |
| Migration/backfill | Added additive migration `supabase/migrations/20260705120000_lms_management.sql`; added idempotent `scripts/lms/backfill-lms-from-static.ts` with dry-run default and `--apply` gate. |
| Safety | Owner guard on admin LMS routes; student route only shows published course/module/lesson content and requires admin, active/completed LMS enrollment, or legacy paid access during rollout. Legacy paid-order access remains merged until backfill is live. |
| Verify | Local contract/type/lint/full Node/build passed; offline backfill dry-run passed; live read-only backfill dry-run from canonical website env showed 10 seed courses plus 99 paid orders eligible for enrollment. Production migration, backfill apply, and owner/student authenticated smoke are still pending. |

## 2026-07-05 - CRM v2 LMS production rollout

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Database | Applied Supabase production migrations `lms_management`, `lms_private_rpc`, and `lms_rpc_preserve_enrollment_fields` to project `vsxxgdzwtscuxcmjfckt`. |
| Backfill | Seeded shared LMS catalog and access bridge idempotently: `10` courses, `23` modules, `56` lessons, `11` course resources, and `100/100` paid order-course pairs in `crm_v2.enrollments`. |
| RPC/privacy | Runtime LMS reads/writes use service-role-only public RPC wrappers for private `crm_v2` enrollments/progress instead of exposing the private schema through PostgREST. |
| Security hotfix | `/learn/[course]/[lesson]` now gates enrolled/private courses before rendering lesson content. Live smoke confirmed the checked Facebook Ads lesson redirects unauthenticated users to `/dang-nhap` and no longer includes title/video iframe in the response. |
| Deploy | Production deployment `dpl_B4HHLLEdHcVw124StqLtViRd5X4L`, URL `https://theanhmarketing-3u4tc6020-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Verify | `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run lint`, targeted CRM/LMS tests `40/40`, full Node tests `233/233`, `npm.cmd run build`, Vercel build/inspect Ready, live unauth smoke, and Vercel runtime error scan passed. Authenticated owner/student browser smoke still needs a real session. |

## 2026-07-05 - CRM v2 LMS blank lesson hotfix

| Hang muc | Chi tiet |
|---|---|
| Symptom | Owner screenshot showed `/learn/facebook-ads-2026/d1701af9-0e2b-41af-8e9d-1722b49e6dd1` rendering `Chua co video`. |
| Root cause | LMS backfill published static placeholder lessons that had no `youtube_url`, `embed_url`, or lesson content. |
| Data fix | Production empty published lessons were changed to `draft` without deleting rows. `facebook-ads-2026` now has `21` published lessons, all with video, and `0` empty published lessons. |
| Code fix | `services/courseService.ts` filters student-visible lessons through `isStudentReadyLesson`; `scripts/lms/backfill-lms-from-static.ts` keeps empty lessons as `draft`; stale/draft lesson links redirect to the first available published lesson instead of 404. |
| Deploy | Production deployment `dpl_F6MLk6UxPvjPLsu5U1sLkwaQnn86`, URL `https://theanhmarketing-6rezmv0ct-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Verify | Typecheck, lint, targeted LMS/course tests `16/16`, build, Vercel inspect Ready, live smoke for the broken URL redirecting to the first video lesson, and runtime error scan passed. |

## 2026-07-05 - CRM v2 LMS admin UI/UX refactor

| Hang muc | Chi tiet |
|---|---|
| App/domain | main-site / theanhmarketing.com; production deploy worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Scope | UI/UX refactor only for `/admin/crm-v2/students?view=courses`; no database/schema change and no mock/local-data fallback. |
| Code | `components/crm-v2/lms-management-client.tsx` now provides two-column course management, compact course list, selected-course header, real tabs, compact overview/module/lesson/student/resource/settings panels, modal editors, confirm deletes, loading/action messages, and up/down reorder controls. |
| Lessons | Lesson tab no longer renders every edit form open. It uses module/search/status filters plus compact rows; add/edit opens a focused modal with basic info, video/content fields, status, access level, and sticky-ish actions. |
| Slug | `services/lmsService.ts` normalizes `đ/Đ` to `d` before ASCII cleanup for future Vietnamese slugs; existing slugs were not rewritten. |
| Tests | Adjusted `tests/lms-management-contract.test.mjs` so real input placeholders are allowed while mock/demo LMS behavior is still rejected. |
| Deploy | Production deployment `dpl_BnRYUiinSWdsV5VkdzZuv5V7jHxs`, URL `https://theanhmarketing-gd5jh1nbm-theanhs-projects-509d0c97.vercel.app`, alias `https://www.theanhmarketing.com`, Ready. |
| Verify | `npx.cmd tsc --noEmit --pretty false`, `npm.cmd run lint`, LMS contract, CRM v2 contract, student access admin controls, student activity log flow, `npm.cmd run build`, Vercel production build, and live unauth route smoke passed. Authenticated owner visual smoke still needs a real browser session. |

## 2026-07-13 - CRM Ebook short-label production release

| Hạng mục | Chi tiết |
|---|---|
| App/domain | `main-site` / `theanhmarketing.com`; canonical worktree `E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix`. |
| Root cause | Ebook orders use `course_slug=ebook-facebook-ads-2026`, but their title is `Thư viện kiến thức Facebook Ads 2026`. The title-only `courseShortName` returned `FB Ads` and ignored the authoritative slug. |
| Audit | Read-only production window 14/06-13/07 covered 228 orders, 237 leads and 191 unique contact keys. The old rule affected 26 Ebook orders across 24 unique customers. The six non-target orders were all `marketing-gioi-phai-kiem-duoc-tien`. |
| Fix | Short labels use title plus slug for product detection, while non-target fallback still uses the title only. All public/CRM lead and order mappers plus atomic identity merge pass the slug. |
| Test/gate | RED reproduced the issue and the added non-target regression; full production-branch suite 408/408, TypeScript, ESLint, diff check, session guard, candidate preflight, 105-page Next build and central production verify passed. |
| Deploy | Runtime commit `d076218`; Vercel deployment `dpl_D2VAgV44iP4nLaAdRexUSbWtwzt1`; Ready and aliased to production domains. |
| Live QA | Unauthenticated protected routes redirected/returned `403`, `/admin/facebook-ads` remained `404`, Ebook/academy/assets returned `200`, library redirected to login, Vercel error scan was empty. Owner Chrome verified `4 Ebook / 4 FB Ads` for the original 12/07 screenshot and all 205 rows across five 30-day pages (`23 Ebook`, `181 FB Ads`, `1 AI Growth`). |
| Safety | No database row, schema, API contract, checkout, payment, email, student access, landing or tracking mutation. |

## 2026-07-22 - Stable LMS course-root entry route

| Hạng mục | Chi tiết |
|---|---|
| Symptom | `/learn/facebook-ads-2026/` normalized to `/learn/facebook-ads-2026` and then returned `404`, while direct lesson URLs worked. |
| Root cause | App Router had `app/learn/[course]/[lesson]/page.tsx` but no page at `app/learn/[course]/page.tsx`. |
| Fix | Added the course-root page, which reads the published student-visible course and redirects to its current first lesson ID. Extracted the existing module/lesson sort into `lib/course-learning.ts` so the root and lesson routes cannot disagree after Course Studio reordering. |
| Access guard | The root route does not render lesson content. Missing/unpublished/empty courses stay `404`; the destination lesson route keeps the existing auth, enrollment, legacy paid-order, progress, and activity behavior. |
| Regression | Added a contract guard for the root route, published-only lookup, dynamic first-lesson redirect, and shared ordering helper. RED reproduced the missing route; focused tests `21/21`, full Node `410/410`, TypeScript, ESLint, diff check, candidate preflight, central production verify and 105-page local/Vercel builds pass. |
| Deploy | Commit `9264957`; production deployment `dpl_2fUT489jFwfozhPerCC9NRsHSJCe`; Ready and aliased to `theanhmarketing.com` and `www.theanhmarketing.com`. |
| Live QA | Trailing-slash root returns `308` to the clean URL; the clean URL returns `307` to current lesson 1 (`47da65a2-c6c6-4a21-a109-c1feb1d64c8f`). Authenticated browser QA rendered lesson 1 and all 23 sidebar lessons with Dataset at 19–22 and exclusion last at 23. Protected route smoke passed; Vercel error scan was empty. |

## 2026-07-23 - SePay shorthand order-code fallback

| Hạng mục | Chi tiết |
|---|---|
| Incident | Giao dịch `69528778` gửi `code=DH707`, trong khi nội dung chuyển khoản chứa mã đầy đủ `TAMMRWSYDH707D7T`. Webhook tin `code` trước nên tra đơn `DH707`, trả `422` và dừng trước bước tạo tài khoản/gửi email. |
| Fix | `getSepayOrderCode` chỉ nhận `payload.code` khi đúng định dạng `TAM[A-Z0-9]+`; nếu là mã rút gọn của ngân hàng thì tìm mã `TAM...` trong content/transaction content/description. Kiểm tra tài khoản, số tiền và email idempotency không đổi. |
| Regression | `tests/sepay-order-code.test.mjs` khóa ba trường hợp: mã rút gọn + content đầy đủ, mã TAM trực tiếp, và mã rút gọn không có TAM. Full gate đạt `423/423`, TypeScript, ESLint và build 105 trang. |
| Deploy | Commit `0a05711`; production deployment `dpl_8trUtvw1cv2bwTzzEyQgfApVzyQf`; status `Ready`, alias `www.theanhmarketing.com`. |
| Customer recovery | Đơn gốc 799.000đ được xác nhận paid, tài khoản được kiểm tra đăng nhập và buộc đổi mật khẩu, email đúng đơn được Resend chấp nhận. Đơn 399.000đ phát sinh trong lúc phục hồi được đánh dấu `voided_duplicate`. |
## 2026-08-02 - Owner access and account-management UX candidate

| Hạng mục | Chi tiết |
|---|---|
| App/domain | `main-site` / `theanhmarketing.com`; canonical guarded worktree `theanhmarketing-email-account-hotfix`. |
| Production operation | Confirmed owner Auth identity received all 10 canonical catalog grants and active CRM enrollments. No password, email, order, payment or schema change. |
| Account UX | `/tai-khoan` keeps profile editing visible and places email/password changes in one closed-by-default card. Choosing password reveals current/new/confirmation fields; the current password is verified through the signed-in Supabase Auth identity before `updateUser`. Forced recovery remains on `/doi-mat-khau`. |
| Booking preview | Only the server-confirmed owner can fall back to the latest real non-support order identity for preview. Customers still require a paid course order; final submission retains the real 500.000đ pending-order flow. |
| Verification | 480/480 Node tests, TypeScript, ESLint 0 errors/1 existing unrelated warning, diff check, 91-page build and clean desktop/mobile disclosure QA. No form submission. |
| Release | Owner approved. Merged the newer production login/SePay hotfix first, producing runtime commit `1600ff1`. Deployment `dpl_n95J4taySyW4p87gGGTMxsbnBxg8` was built without domain assignment, smoke-tested, then promoted atomically to `www.theanhmarketing.com`; post-release error/fatal scan is clean. |

## 2026-08-02 - Paid student login recovery and `/dang-nhap` contrast

| Hạng mục | Chi tiết |
|---|---|
| Customer operation | Recovered the existing Supabase Auth account for the exact paid order `TAMMSBVQNXBYU2N7`; verified a real password sign-in and preserved `must_change_password=true`. |
| Email | Reused the exact existing `payment-success-email` course template without inventing content. The available Resend key was test-only, so the unchanged rendered message was sent through connected Gmail and recorded as sent; delivery/open is not confirmed. |
| UI | Added a scoped high-specificity login input override in `app/globals.css` and a dedicated class in `components/auth/login-form.tsx` so the white field, dark text, placeholder, border, and focus state remain readable despite `.ai-panel` declarations using `!important`. |
| SePay prevention | Kept full TAM order code as the primary match. Code-less callbacks may match only one pending/expired order using exact amount, normalized payer/student name, and a transaction window from 24 hours before to 5 minutes after order creation. Transaction id/reference retries remain idempotent and ambiguous cases fail closed. |
| Verification | Added login-contrast and SePay regression coverage. Focused suite passed 40/40; TypeScript, targeted ESLint, production build (91 routes), local browser computed-style checks, and live smoke checks passed. |
| Release | Runtime commit `6c74a97c7608565c2987dfda147cfede3cdc32bc`; production deployment `dpl_A7fY8d3Whn62dd8ma9317e8nNm8V` is Ready and aliased to `www.theanhmarketing.com`. Live `/dang-nhap` returned 200 with the new class/CSS, unauthenticated SePay webhook returned 401, and `app.theanhmarketing.com` was untouched. |

## 2026-08-02 - VPBank checkout and invoice request

| Hạng mục | Chi tiết |
|---|---|
| Scope | `main-site`: current React checkout forms plus AI Master, Facebook Ads, Ebook and Ebook premium static landings. |
| Invoice | Small centered opt-in below the primary CTA; expands tax code, company name, company address and invoice email. Validation/storage are server-side; public polling exposes only the request flag. |
| Product copy | Each landing owns its product USP and CTA. The shared invoice helper contains no product copy. Facebook Ads uses the approved 799.000đ course + AI Agent copy. |
| Payment copy | Customer pages/emails are provider-neutral while the existing internal webhook, QR helper and idempotent reconciliation flow remain unchanged. |
| Database | Additive migration `20260802161009_add_order_invoice_fields.sql` must precede the application rollout. |
| Release | Migration applied to Supabase project `theanhmarketing`; production bank environment updated; runtime commit `5689c1a`; Vercel deployment `dpl_2yCs8k8H9v4xQc348eQ5C5cAuPwp` promoted to `www.theanhmarketing.com`. Live landing markers and unauthenticated webhook `401` passed; post-release runtime error scan is empty. |

## 2026-08-03 - Preserve public-auth contrast across production releases

| Hạng mục | Chi tiết |
|---|---|
| Regression | The VPBank/invoice release was cut from the canonical production branch before the later complete public-auth contrast commits had been merged. It therefore replaced the earlier auth-only deployment and restored translucent white labels/supporting copy on white cards, most visibly on mobile. |
| Fix | Cherry-picked the exact existing auth fixes into `deploy/website-production-20260802`, preserving all invoice/order/payment changes. Login, remember-login, first password change, forgot password and registration now share the intended dark-on-light presentation; the login eye control remains accessible. |
| Prevention | Added `tests/mobile-public-auth-production-contract.test.mjs` to enforce the required classes and CSS on the canonical production line before future releases. |
| Verification | RED reproduced the missing remember-label contract. Final focused suite passed 10/10, TypeScript, targeted ESLint, diff check, 91-route local/Vercel builds and fresh live 390x844 computed-style QA across all four public auth routes passed. |
| Release | Runtime commit `738039c0db3b2c207a0e08835e11cf4340731e02`; production deployment `dpl_52siV27L871MbGtutSsG3BAEF443` is Ready and aliased to `www.theanhmarketing.com`. No Auth, order, payment, email, student-access or `app.theanhmarketing.com` mutation. |

## 2026-08-03 - Remove public cart chrome

| Hạng mục | Chi tiết |
|---|---|
| Owner request | Remove the visible `Giỏ hàng` control and the floating cart summary from the public website. |
| Scope | Removed `CartLink` from the desktop header, the `/gio-hang` entry from the mobile menu and `CartToast` from shared `PageShell`. Existing course/direct-checkout, invoice, order and payment code remains intact. |
| Regression | Updated `tests/noti-style-public-foundation.test.mjs` to reject cart UI imports, labels and links in the shared public chrome. |
| Verification | RED reproduced all three existing surfaces. Final 503/503 Node tests, TypeScript, targeted ESLint, diff check and 91-route production build passed. |
| Release | Runtime commit `9c6db8054780cf8e903cf9665e774048fce6ff1d`; deployment `dpl_G2JP4xg3KFJrHLR7ckB2b6Fga8AH` is Ready and aliased to both canonical domains. Fresh desktop and 390x844 live QA found zero cart links and zero floating panels; mobile navigation and auth contrast remain correct. |

## 2026-08-03 - Zalo ZBS nhắc thanh toán khóa học

| Hạng mục | Chi tiết |
|---|---|
| Scope | `main-site`; đúng `facebook-ads-2026`, `ebook-facebook-ads-2026`, hoặc bundle gồm đúng hai slug. Không áp dụng sản phẩm thứ ba. |
| Timing/status | Claim khi đăng ký vẫn `pending` sau tối thiểu 5 phút và không quá 24 giờ. Worker reread bản ghi authoritative trước provider call; paid/ineligible/invalid phone được cancel, không gửi. |
| Idempotency | Postgres outbox dùng lease 10 phút, `FOR UPDATE SKIP LOCKED`, attempt tối đa 3, retry 5/15 phút, lease-fenced finish và marker `sent_at` vĩnh viễn. Rollout timestamp chặn backfill; daily limit chặn vượt trần. |
| Zalo contract | `POST https://business.openapi.zalo.me/message/template`; access token header; exact template variables `customer_name`, `product_name`, `order_code`, `amount`, `transfer_content`, `status`; OAuth refresh token rotates atomically in private service-role-only storage. |
| Bank handoff | ZBS CTA trỏ tới `/thanh-toan/<order>?openBank=1`. Mobile page fetches official VietQR iOS/Android app directory server-side and emits app-specific `dl.vietqr.io` links only after customer click. Existing QR và copy controls remain fallback. |
| Operations | Protected GET/POST worker uses `CRON_SECRET`. Runbook requires Supabase Vault, `pg_cron`/`pg_net`, one-minute cadence, disabled-first rollout, controlled test, owner-approved daily limit and Cron-first rollback. |
| External state | Local only. ZBS template chưa submitted/approved because the authenticated Chrome window was in active owner use; migration, token seed, Cron, provider test and production flag are untouched. |
| Verification | Zalo/payment focused 25/25; full Node 542/542; TypeScript and Next.js 94-page production build pass. ESLint 0 errors/1 pre-existing unrelated warning. |

## 2026-08-21 - Premium Ebook workbook rewrite release candidate

| Hạng mục | Chi tiết |
|---|---|
| Scope | `main-site` `/academy/ebook-facebook-ads-2026-premium`; source and published static HTML pair only, plus regression/spec/plan docs. |
| P0/P1 | Result-first lookup-library hero; 3 situations; 4-layer diagnosis; 12 outcomes; 3 use modes; real preview Parts 1 and 5; compact 10-part content; author; five-item value stack; honest 399K pricing; expanded delivery/support/license FAQ; final CTA. |
| Commerce guard | Keeps `full-access-399` and optional unchecked `full-access-399-course-699`, invoice helper, `/api/orders`, checkout countdown and payment redirect. No real submission was made. |
| Tracking guard | Keeps Pixel `1315653423712065`, PageView and ViewContent 399K; Lead remains after successful order response with shared `leadId`. No browser InitiateCheckout or Purchase was introduced. |
| Verification | Focused 86/86; full Node 594/594; TypeScript, tracking, Webpack build 96 routes, ESLint 0 errors/1 existing warning. Browser 1440/390/320: no overflow, broken images or console errors; 320 form overflow found during QA was regression-locked and fixed. |
| Route gate | Production-build local smoke: Premium Ebook, public preview, protected reader and protected PDF routes all return 200. Repo-wide route script still lists eight removed legacy public routes and therefore exits nonzero outside this scope. |
| Release state | Local only; no commit, merge, deploy, live readback or order. Feedback testimonials and owner policies for access duration, future updates and refunds remain BLOCKED due missing approved evidence. |

## 2026-08-21 - Premium Ebook header-free hero refinement

| Hạng mục | Chi tiết |
|---|---|
| Owner brief | Remove the header; raise and center the book; compact the copy into bullets; follow the supplied two-column wireframe. |
| Visual result | Left: eyebrow, compact result headline, three bullets and unchanged CTAs. Right: centered real book mockup, two real interior pages and 471/10/2026 facts. Bottom: three proof points. |
| Guardrails | Source/published byte-identical. No change to order form, bundle toggle, invoice, `/api/orders`, payment redirect, SEO, Pixel/CAPI or commerce events. |
| Verification | Ebook 23/23, full Node 595/595, TypeScript, diff check, Webpack 96 routes, Browser 1440/390/320 with loaded images, no overflow and no console warnings/errors. No order submission. |
| Release state | Local only; no commit or deployment. |

## 2026-08-21 - Premium Ebook final hero controls release candidate

| Hạng mục | Chi tiết |
|---|---|
| Owner request | Remove `Quy mô`, `Nội dung`, `Phiên bản`; reduce excessive rounding across landing buttons; deploy. |
| UI result | Hero facts retain only `471 trang`, `10 phần`, `2026 cập nhật`. CTA, form submit, menu and sticky purchase controls use 14px corners; page arrows use 12px. Dots and non-button badges remain circular/pill where semantically appropriate. |
| Safety | Source/published mirror byte-identical; form, bundle, invoice, `/api/orders`, payment, SEO and Pixel/CAPI unchanged. |
| Local gate | TDD RED/GREEN; Ebook 25/25; full Node 597/597; TypeScript; tracking; ESLint 0 errors/1 unchanged warning; Webpack build 96 routes; Browser 1440/390 has no overflow or console warnings/errors. |
| Release state | Production deployment explicitly authorized by owner; deploy/readback pending. |
