# Current State - theanh-main

## 09/09 — Pixel Codex cho landing Bộ Kit đã LIVE

Runtimebf7ad8a / production dpl_5Rb61wiJraXsjNj7fre9E9jKFkWt READY. Kit www/apex200 và chunk đúng Pixel/hai route; bundle Kit và4landing tĩnh khác giữ hash, guards405, runtime logs không error.78tests/TS/lint/build PASS. Chưa Meta browser receipt; không test đơn thật. Xem docs/CODEX_PIXEL_20260908.md.

Owner yêu cầu dùng Pixel1369910554822777 cho `/academy/bo-kit-agent-doanh-nghiep` bên cạnh Codex. Chỉ mở rộng exact-path allowlist dùng chung browser/CAPI/checkout, không đổi bundle/form/giá/payment/secrets.59Meta/revenue và19AgentKit tests PASS; ba test mới đã fail trước sửa. Browser receipt trước đó bị AdBlock chặn vẫn chưa được xác nhận; không tự tắt AdBlock.

## 08/09 — Pixel Codex live, còn browser verification

Runtime6fd734e/production dpl_2VV2wyTkHnEw6GRoCWSTbFxNAPbr READY, www/apex200 và chunk Pixel mới đã xác minh;59Meta/revenue tests đạt. Khóa Codex Production/Secret; Meta xử lý3 CAPI Test Events. Browser fbevents.js bị ERR_BLOCKED_BY_CLIENT, AdBlock đang bật; chờ xác nhận tạm dừng riêng miền để test rồi bật lại. Chưa gọi ready-to-ad, không tạo đơn thật. Handoff `docs/CODEX_PIXEL_20260908.md`.

## 08/09/2026 — Landing Codex đã phát hành

Route `/academy/codex-x10-hieu-suat` đã LIVE: runtime1f54159, production `dpl_5pNYu49hDr8WdGznt5EVKvsoUccG` READY, www/apex đã xác nhận. 15 section, 8 quyền lợi/minh họa, 7 video và CTA ghim; cùng Agent Kit/checkout/quyền học. Build108, 71 kiểm tra liên quan, browser local/live 4 viewport, tài nguyên/liên kết và chuyển động đạt; không lỗi runtime sau phát hành. Sửa hai lỗi tracking tùy chọn gây kẹt/mất form. Full suite còn 19 lỗi trùng baseline canonical, không có hồi quy mới quan sát được. Không giao dịch/email thật hoặc đổi dữ liệu học viên. Chi tiết/rollback/giới hạn: `docs/CODEX_LANDING_20260908.md`.

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


## 2026-08-31 - Meta Ads audit workbook download (live verified)

- `/tai-lieu` now serves the approved 22 KB Excel workbook `checklist-audit-tai-khoan-quang-cao-meta.xlsx` with 50 audit criteria, dropdown statuses, formula summaries and a seven-day action plan.
- The existing production database row `Checklist audit tài khoản quảng cáo` keeps its identity. When `file_url` is blank, `resourceService` maps only that exact slug to the bundled public file; the fallback catalog carries the same file URL.
- The resource card renders `Tải file Excel →` and uses the native download attribute for `.xlsx`, `.docx`, `.pdf` and `.zip` files. External/non-file resources keep `Mở tài liệu →`.
- TDD observed the missing file/fallback failures before implementation. Focused public-service tests pass `6/6`; TypeScript, targeted ESLint, mandatory revenue-critical UI `37/37` and the 104-route Webpack build pass. Commit `0a30e87` is live as production deployment `dpl_BqNGMkHfSKHzppx63CnFpdscveWn`; `/tai-lieu` and the workbook return HTTP 200, the live workbook checksum matches the approved source, and no `/tai-lieu` runtime errors were found in the 30-minute release window.

## 2026-08-21 - Facebook Ads mobile readability and Zalo proof fix (production)

- Owner-approved option 1 is live from commit `3fef504` as Vercel production deployment `dpl_5kEZoPX1YAtoGdXHBgpJrzqixeNA` (`READY`) on apex and `www`; rollback target is `dpl_FFoE7Ny1bG2bFaFGai7Q4n1Hxhqj`.
- The cream `#bo-cong-cu` section now uses dark brown headings/card titles, medium-brown supporting copy, orange kicker/icons and translucent warm-white cards. The five Zalo proof images now preserve their natural aspect ratio instead of being center-cropped; mobile cards use one readable 84vw/320px snap column.
- Source/published HTML are byte-identical and live matches both at SHA-256 `f5f8a4d45a64fb6fdaaa9e75e4639d7144c58010828839892d921794e7cd67ff`; event JS is unchanged at `e6d272f21c2458bfb78e0a5e35d40724254e67ec29a0026024cb27c5bb721a19`.
- TDD observed the new readability regression fail before implementation. Full Node `592/592`, TypeScript, tracking verification, diff check and 96-page Webpack build pass; ESLint has 0 errors and 1 unchanged unrelated warning.
- Production in-app Browser QA at 390/320/1440 confirms readable contrast, natural Zalo image ratios, no horizontal overflow, no broken image and no mojibake. Route/guards are 200/307/405/405 and the deployment runtime error scan is empty.
- Exactly one production QA order was created after live verification: `TAMMT24TKS5A3FIN`, 799.000 VND, `pending`. Checkout QR loaded 360x360; pending-payment email and order-created Telegram markers succeeded with null errors. `paid_at`, payment-success email, Purchase/CAPI, provisioning and Auth account remain absent.

## 2026-08-21 - Facebook Ads value stack grouped into two panels (production)

- Owner follow-up is live from commit `dceb20b` as Vercel production deployment `dpl_FFoE7Ny1bG2bFaFGai7Q4n1Hxhqj` (`READY`) on apex and `www`; rollback target is `dpl_EFWWGpZnaBbwuCjJp6d3DhTLBVXz`.
- The three numbered value cards now form one continuous panel with internal dividers. The crossed-out total and today's 799K ownership price form a second continuous panel with an internal divider. Copy, values and section order are unchanged.
- Source/published HTML are byte-identical and live matches both at SHA-256 `f500d2d9be40633d843b8cb0808f0fecebe0e32402d0982fa197ca2856ac26f7`; the custom event JS remains unchanged at `e6d272f21c2458bfb78e0a5e35d40724254e67ec29a0026024cb27c5bb721a19`.
- TDD failed on the missing two-cluster contract before implementation, then focused landing/event tests passed `27/27`. Full Node `591/591`, TypeScript, tracking verification, diff check, 96-page Webpack build and ESLint 0 errors/1 unchanged warning pass.
- Production in-app Browser QA at 390/320/1440 confirms exactly two clusters, three cards, two price rows, correct responsive dividers, zero out-of-bounds groups and zero horizontal overflow. Form/checkout/SEO/Pixel/CAPI are untouched; no order was submitted. Live route is 200, guards remain 307/405/405 and the post-release runtime error scan is empty.

## 2026-08-21 - Facebook Ads pricing header simplification (production)

- Owner follow-up is live from runtime commit `dac8111` as Vercel production deployment `dpl_EFWWGpZnaBbwuCjJp6d3DhTLBVXz` (`READY`) on `www.theanhmarketing.com`; rollback target is prior event-contract production `dpl_9deCAWFg8Uuwixw9WGqtMdsqgpmL`.
- The value-stack total `5.997.000đ` now has a visible 2px line-through. The pricing section no longer renders the redundant `Học phí & đăng ký` kicker or `Hôm nay bạn sở hữu toàn bộ với 799.000đ` heading; the separate ownership/value line above checkout remains.
- Scope is presentation-only. Source/published HTML remain byte-identical, SHA-256 `916c9b223ac2d98902a08bfe3dab56ecf78ef828fb60a538e0c97638d2575a45`; form, invoice module, `/api/orders`, 799K/Ebook plans, SEO/canonical, Pixel and event JS are unchanged. Live event JS still matches local SHA-256 `e6d272f21c2458bfb78e0a5e35d40724254e67ec29a0026024cb27c5bb721a19`.
- TDD observed the new UI regression fail before implementation, then focused landing/event tests passed `27/27`. Full Node is `591/591`; TypeScript, tracking verification, diff check and 96-page Webpack production build pass. ESLint has 0 errors and 1 unchanged unrelated warning.
- Production Browser QA at 1440/390/320 confirmed the line-through, removed headings, intact form/submit button, zero horizontal overflow and no console warnings/errors. Live route is 200; guards remain `/admin` 307, `GET /api/orders` 405 and `GET /api/student/progress` 405. Runtime error scan is empty and no real order was submitted.

## 2026-08-21 - Facebook Ads Master Data & AI conversion rewrite + event contract (production)

- Runtime commit `17bdabb` from existing worktree `/Users/theanh/CodexProjects/TheAnh-Web/worktrees/facebook-ads-master-rewrite-20260821`, branch `feat/facebook-ads-master-rewrite-20260821`, is live as Vercel production deployment `dpl_9deCAWFg8Uuwixw9WGqtMdsqgpmL` (`READY`) on `www.theanhmarketing.com`. Rollback target is prior production `dpl_CpvZrvvxbQQauZkbAUi8dmTRoWvG`.
- `/academy/facebook-ads-master-2026` now follows the approved 12-section conversion order: Hero, three pains, Big Idea, 12 buyer outcomes, AI Agent, five content-rich proofs, instructor, tools, value stack, pricing/checkout, FAQ and final CTA. The visible 21-lesson/six-module curriculum is removed.
- The 799K contract is explicit: video course + AI Agent + tools; the Agent creates Campaign – Ad Set – Ads in `PAUSED`; Zoom 1:1 is a separate service and is not included.
- Source and published HTML are byte-identical. The existing `zoom-kit`, optional `zoom-kit-ebook-299`, invoice module, `/api/orders`, Pixel ID/value, SEO title/meta/canonical and responsive sticky CTA remain intact.
- The approved browser-only Meta contract is implemented through `trackCustom`: `EngagedView` after 30 visible seconds, one-shot `ScrollDepth` at 50/75/90, and `CTAClick` only on six explicit primary CTAs with `cta_id`, `cta_text` and absolute `destination_url`. `VideoProgress` is `NOT_APPLICABLE` because the page contains no HTML video element.
- Standard semantics remain guarded: `PageView` and `ViewContent` are unchanged; browser `Lead` now fires only after `/api/orders` returns a valid order code with the existing `leadId` dedup ID; no early `InitiateCheckout`, browser `Purchase`, fake `LandingPageView`, `Contact` or `FindLocation` was added. Server-authoritative Purchase/CAPI code is unchanged.
- Verification: focused Facebook Ads/Meta/invoice `59/59`, full Node `591/591`, TypeScript, ESLint `0` errors/`1` unchanged unrelated warning, tracking verification, `git diff --check`, and in-app Browser QA at 1440/390/320 with zero overflow, broken images, mojibake, console errors or real order submission. Source/published SHA-256 is `247f45406d36c00bcdac74848db7836e4f5e86af2737dde8d7dc279fd5593358`.
- Next 16 production build now passes with Webpack and generates 96 pages. Two base-commit type blockers were corrected without runtime behavior changes: the admin route request limit remains module-local instead of being an invalid route export, and `/go` uses the required Promise-only `searchParams` contract.
- Live readback: clean route and event script return 200; live HTML SHA-256 exactly matches local/source at `247f45406d36c00bcdac74848db7836e4f5e86af2737dde8d7dc279fd5593358`, and live JS matches `e6d272f21c2458bfb78e0a5e35d40724254e67ec29a0026024cb27c5bb721a19`. Exact six CTA IDs, Pixel/ViewContent, form route, canonical and zero early checkout/browser Purchase/video/mojibake were confirmed. Dataset aggregate readback over the post-release one-hour window returned `EngagedView=3`, `ScrollDepth=4`, `CTAClick=1` from Web; Vercel runtime error/warning/fatal scans are empty. No real order was created.
- Events Manager Test Events UI is `BLOCKED/NOT_AVAILABLE` in the current authenticated channels: the Facebook connector exposes aggregate dataset stats but no Test Events stream, and no test code/token was entered. GitHub provenance is now `RESOLVED`: Terminal Git was authenticated through the owner-approved GitHub device flow, the full branch was pushed with upstream tracking, and remote readback matched runtime commit `17bdabb0691593c8778686241791eef9e548a2f6` plus docs commit `36c26e8b8205b8154b96c6e6251825e88356f831`. This authentication-only follow-up did not change the live Vercel artifact.
## 2026-08-18 - Support booking 1.000.000đ regression fix candidate

- Root cause: the verified 1.000.000đ support-price commit lived only on the prior release branch; later production releases from the canonical branch still carried `SUPPORT_PRICE_VND = 500_000` and regressed form, checkout and CRM copy.
- Candidate restores the server-known `support-session-30m` amount and shared label to 1.000.000đ across booking UI, checkout, order creation and admin CRM. The separate Marketing & AI consultation remains 500.000đ.
- Historical support rows retain their stored amount. The already-applied production schema default remains 1.000.000đ and accepts 500.000đ only for historical compatibility; the migration is restored to source control.
- TDD RED reproduced five price-contract failures; GREEN is 16/16. Full Node is 577/577, TypeScript and 96-route production build pass; targeted ESLint has zero errors and one unchanged warning in the support-bookings client.
- No real order, payment, email or database mutation was used for QA. Release commit `68c0ca0` is live as production deployment `dpl_2LHJxZTEF9U2SUhgmyDARetBP89c` (`READY`) on `www` and apex; owner-session browser readback shows 1.000.000đ across the live booking page and CRM, and the post-release runtime error scan is empty.

## 2026-08-03 - Durable Meta Purchase CAPI recovery live

- Root cause confirmed: the active production branch still called Meta directly inside payment requests, while the previously verified durable outbox code was never committed into this deploy branch. Paid orders could therefore remain `purchase_event_sent=false` with `meta_purchase_state=null` and zero attempts after a missed or failed first call.
- Production now runs the service-role-only, lease-fenced seven-day outbox, immediate dispatch for SePay/manual confirmation/manual paid provisioning, stable `event_id=order_code`, original `paid_at` event time, bounded retry endpoint and daily Vercel retry cron.
- Production schema already contained both outbox RPCs. The protected dispatcher claimed and sent the one due paid order in the valid seven-day window; Meta returned a trace ID. Post-run audit shows 32 paid orders in seven days, zero unsent and zero due. No historical event outside seven days was sent.
- Release commit `9bff9e2` and deployment `dpl_FxVx4S3tVtuiVzvtTfLLtVvkobNB` are `READY` and promoted to `www.theanhmarketing.com`. `CRON_SECRET` was rotated because the former production value did not authenticate any cron route; authenticated retry is now 200, unauthenticated retry remains 401, and the post-release runtime error scan is empty.
- Verification: focused Meta tests 17/17, full Node 517/517, TypeScript, ESLint (0 errors/1 unchanged warning) and 93-page Next.js production build pass.

## 2026-08-03 - Accounting payment email live

- One shared internal email covers every newly paid course, Ebook, consultation, support booking and manual confirmation.
- Recipient is server-only `ACCOUNTING_NOTIFICATION_EMAIL`; invoice-requested orders include all stored invoice fields.
- Production deployment `dpl_C35A8fXAyguEq8cGsaJLkiqiAFp5` is `READY` and promoted to `www.theanhmarketing.com`. The protected retry route sent all 6 approved Greezhub/manual-confirmation orders since 2026-08-02 (4.592.000đ); database verification shows 6 sent markers and 0 remaining errors.
- Additive order markers and a safe Greezhub dry-run/backfill script are implemented.
- Local verification: 511/511 Node tests, TypeScript, build and diff check pass; ESLint has zero errors and one unchanged warning.

## 2026-08-02 - Owner course access and clearer account self-service (production)

- Production account `theanhnguyen.marketing@gmail.com` now has active access to all 10 canonical catalog courses through idempotent access grants plus active CRM enrollments tied to the exact confirmed Auth user. No password, order, payment or email was changed.
- Local `/tai-khoan` keeps profile editing visible but collapses email/password changes into one `Đổi thông tin tài khoản` card. Students choose one action before its form appears; password changes require the current password, new password and confirmation. The forced recovery route `/doi-mat-khau` remains unchanged.
- A server-verified owner may preview `/dat-lich-ho-tro` using the latest existing non-support order identity when no paid course order exists. Normal customers remain paid-order-only; a final owner submission would still create a real pending 500.000đ support order, and no submission was made during QA.
- Release merged the newer live login/SePay hotfix before deployment, then passed 485/485 Node tests, TypeScript, tracking verification, ESLint 0 errors/1 pre-existing unrelated warning, `git diff --check`, 91-page Next.js build and desktop/mobile disclosure QA. Production deployment `dpl_n95J4taySyW4p87gGGTMxsbnBxg8` from runtime commit `1600ff1` was built without domain assignment, smoke-tested, then promoted atomically to `www.theanhmarketing.com`. Live core routes and four active landings return 200; account auth guard, learning redirect, progress API and SePay webhook remain protected; Vercel error/fatal scan is clean. No account form was submitted.

## 2026-08-02 - Simplified storefront production release

- Production deployment `dpl_3v4vAeJQFShnQkghuWYoxVfpMCbc` is `READY` and aliased atomically to `https://www.theanhmarketing.com` from release commit `8edca42` (content commit `500d741`).
- The release includes the approved simplified public navigation, four active course landing pages, six coming-soon catalog cards, full-price formatting, three consultation services, authenticated My Courses/Account navigation, and the approved AI Master/Agent Kit v3 covers.
- No Supabase migration was applied. Student course content, entitlement, learning-room and progress code have no diff from the protected production base.
- Production smoke passed 17/17. Vercel reported no runtime errors or error/fatal logs after release.

## 2026-08-02 - Colorful course-cover system v2 (local review)

- Replaced all 10 public catalog covers with non-destructive `-v2.webp` assets generated from the existing subject/composition, then overlaid exact Vietnamese typography locally.
- Cover typography now uses a rounded system face with cobalt/cyan/violet/orange text; no black or gray cover copy. Course cards use a square media frame so the full cover remains visible.
- Source assets remain untouched. Reproducible overlay configuration and final prompts are recorded in `scripts/generate-course-cover-v2.mjs`.
- Local browser QA: 10/10 v2 covers, zero broken images, no horizontal overflow at 1440x900 and 390x844, zero browser warnings/errors.
- Verification: 463/463 Node tests, TypeScript, ESLint 0 errors/1 existing warning, Next.js build 110/110 pages. No production deploy.

## 2026-08-02 - Noti-style public foundation (local review)

- Branch cô lập `feat/noti-visual-redesign-local` đang phục vụ local tại `http://localhost:57128`; chưa deploy Vercel và chưa thay đổi production.
- Homepage và `/khoa-hoc` dùng visual A nền sáng, accent xanh The Anh, grid nền, pill CTA, card/shadow/hover/reveal và responsive mobile; header/footer/course card dùng chung foundation.
- Homepage giữ dữ liệu thật từ services, giữ section Agent Kit hiện hữu và FAQ accessible. Popup ưu đãi giao diện cũ đã được gỡ khỏi toàn bộ public shell và trang bán khóa học; cart/order/payment/registration vẫn giữ nguyên.
- Catalog lấy toàn bộ course thật, tự sinh danh mục, tìm kiếm tiếng Việt và lọc client-side. Tám khóa ngoài Ebook/Facebook Ads hiển thị `990.000đ`; Facebook Ads giữ `799.000đ`, Ebook giữ `399.000đ`; toàn bộ giá catalog dùng dạng đầy đủ thay cho hậu tố `K`.
- Không đổi Supabase schema, Auth, order, SePay, email, entitlement, progress hoặc admin CRM.
- Verification hiện tại: `463/463` Node tests, TypeScript, Next.js build 110 routes, desktop/mobile browser QA và runtime console đều đạt. ESLint có 0 error và 1 warning cũ ngoài phạm vi.

## 2026-07-25 - Public guide and paid support booking (local demo)

- Public routes: `/huong-dan`, `/dat-lich-ho-tro`, `/dat-lich-ho-tro/thanh-cong`.
- 500.000đ/30 minutes; today through day +6 is busy; booking horizon ends at day +30.
- Admin/Telegram records are created only after SePay confirmation; owner manages busy dates at `/admin/crm-v2/support-bookings`.
- Student Dashboard support now links to booking. Migration is local only; no deployment was made.
- Booking requires an authenticated student with at least one paid non-support course order. Name, email and phone are loaded server-side from the paid order and cannot be overridden by the browser.
- Public `/huong-dan` now uses five captured local journey screenshots: demo checkout, the real payment-success email template with demo credentials, filled login, student Dashboard and the owned Ebook card. The email preview route returns not-found in production.
- External support CTAs show only `Đặt lịch hỗ trợ`; the 500.000đ price is disclosed only inside the authenticated booking page and admin/payment flow.
- Verification: 446/446 Node tests, TypeScript and Next.js production build pass.

Updated: 2026-07-22

- Production email QA exposed stale 799K pending-email copy that still mentioned Zoom. The fix is live in deployment `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55` from runtime commit `3a4f52d`: the package is now labeled `Gói AI Agent 799K - Tặng AI Agent lên kế hoạch quảng cáo`, matching the landing and server order plan. Final post-deploy orders `TAMMRVYILFFF4QHD` (799,000 VND) and `TAMMRVYIOZCPIUT0` (1,098,000 VND with Ebook) both reached the approved Gmail Inbox with the correct subjects.

- Facebook Ads Master 2026 pricing card no longer renders the redundant `Chọn gói 799K` button. The card remains selected/clickable, and the registration form plus sticky CTA remain the purchase actions. Source/published HTML are synchronized; checkout, Ebook add-on and tracking are unchanged. Live DOM verification after deployment `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55` found zero removed buttons, one Ebook add-on, one payment submit and no horizontal overflow.

- Facebook Ads Master 2026 now has a live optional Ebook checkbox directly below the phone field. The default order remains the 799,000 VND `zoom-kit`; checking the add-on selects server-known plan `zoom-kit-ebook-299`, creates one 1,098,000 VND SePay order with exact 799,000 + 299,000 VND line items, and grants both `facebook-ads-2026` and `ebook-facebook-ads-2026`. Checkout, paid redirect, pending/success email and fallback comma-slug handling preserve both products. Full Node `420/420`, TypeScript, ESLint, local/Vercel 105-page builds and final live email QA pass; no database schema or standalone Ebook price changed.

- Facebook Ads Master 2026 landing has a live Agent proof section between outcomes and curriculum. It embeds a 960x490, 4,124,531-byte looping GIF from the supplied screen recording, a reduced-motion WebP poster, three concrete execution proofs, and a continuous carousel containing exactly 12 optimized Zalo proof images. Seven call screenshots retain the approved orange/yellow time highlights and privacy masks; five additional support/feedback screenshots complete the set. The Zalo cards use a uniform `15:32` portrait frame (`300px` desktop, `244px` mobile) with a `12px` gap and a centered cover crop of about 1.5%. Source and published HTML remain byte-identical, the page still offers only the 799K AI Agent package, and checkout/tracking behavior is unchanged. Production deployment `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55` is Ready.

- Facebook Ads Master 2026 public landing release candidate now offers only the 799K AI Agent package. The 399K card, CTA/copy, landing plan definition and 399K `ViewContent` value are removed; the page defaults and submits `paymentPlan=zoom-kit`, and its source/published HTML remain identical. Historical 399K order, checkout and email handling stays intact, and the separate 399K Ebook landings are unchanged. Focused regression is `9/9`; full Node is `414/414`; TypeScript, ESLint, 105-page build, protected-surface preflight and local desktop/mobile Chromium QA pass with one plan, no horizontal overflow and no page errors.

- Facebook Ads lesson resources have a local release candidate that replaces the three preview/ZIP cards with six approved Master Prompt TXT downloads and one external Google Sheet demo. The section remains directly below the video and contains buttons only: six downloads plus one new-tab Sheet action. Source-to-public SHA-256 comparison, focused `3/3`, full Node `415/415`, TypeScript, ESLint and the 105-page local build pass. Production still serves the previous three-pack version until this candidate is committed and deployed. No database, entitlement, progress, lesson order, payment, email or tracking change.

- Stable LMS course entry is live in production deployment `dpl_2fUT489jFwfozhPerCC9NRsHSJCe` from commit `9264957`. `/learn/facebook-ads-2026/` now normalizes to the clean course URL and dynamically redirects to the current first published student-ready lesson instead of returning `404`. The course-root and lesson routes share one ordering helper, so Course Studio reordering changes the destination without a hard-coded lesson ID. Authenticated browser QA opened lesson 1 and confirmed all 23 lessons, including Dataset lessons at 19–22 and the exclusion lesson last at 23. Full Node `410/410`, TypeScript, ESLint, candidate preflight, central production verify, local/Vercel builds, protected-route smoke and runtime error scan pass.

- Production customer operation: order `TAMMRVFSQ6NNSCFT` was owner-confirmed paid at 799,000 VND, the matching `facebook-ads-2026` Auth account was created/confirmed, password login verification passed, and the existing reset/access email reached Resend status `delivered`. No code/schema/deploy change and no fake SePay reference.
- Follow-through is complete: production activity recorded student login, successful password change and entry into a `facebook-ads-2026` lesson; `must_change_password` is now false.

- LMS learning-room update is live in production deployment `dpl_6WdszCydXnT7LkMKjrY3nTqXtmE2` from runtime commit `464cd25`. The right-hand `Danh sách bài học` now renders one flat lesson sequence with continuous numbering across module boundaries instead of restarting at `1` inside each module group. Authenticated Chrome QA confirmed all 20 currently published lessons appear once with badges exactly `1..20` and no module headings. Course content, lesson ordering, access labels, progress, payment, email and tracking flows are unchanged. Focused regression is 4/4; full Node is 409/409; TypeScript, ESLint, diff check, local build and Vercel build pass.

- CRM Ebook short-label hotfix is live in production deployment `dpl_D2VAgV44iP4nLaAdRexUSbWtwzt1` from runtime commit `d076218`. The unified Leads & Pipeline classifier now reads both the product title and authoritative `course_slug`: `ebook-facebook-ads-2026` displays `Ebook`, genuine `facebook-ads-2026` remains `FB Ads`, and non-target products keep the existing title-based fallback. A read-only 30-day production audit covered 228 orders, 237 leads and 191 unique contact keys; 26 Ebook orders belonging to 24 unique customers were affected by the old title-only rule. Authenticated owner QA then checked all 205 visible CRM rows across five 30-day pages (`23 Ebook`, `181 FB Ads`, `1 AI Growth`) and confirmed the original eight 12/07 rows now split exactly `4 Ebook / 4 FB Ads`. No database row or API shape changed.

- Production admin consolidation release `dpl_3ektSz6SHJWYKmG1sNrZfS2AEhyH` is Ready and aliased to `https://www.theanhmarketing.com`; runtime code commit is `9cb1e82`.
- Course Studio interaction hotfix is live in production deployment `dpl_EiqfEfmJBJkQDZeEBKp6P7SAkVqU` from runtime commit `60be5c0`: the seven step buttons update local UI state immediately and only synchronize browser history in the background; lesson slugs/internal URLs are no longer rendered under lesson titles. Deployment is Ready, aliased to `https://www.theanhmarketing.com`, protected route smoke passed and the post-release error scan was empty.
- Production admin/Meta reporting release runs from runtime commit `2561a4a` as Vercel deployment `dpl_2bzgufu6yvAMNdsfRAHcKL4EirV7`; status is Ready and aliased to `https://www.theanhmarketing.com`.
- Implemented locally: owner `/admin` defaults to the canonical CRM v2 Executive Operating System; legacy owner module routes redirect to their CRM destinations; editor course access stays role-safe. The dashboard shows production KPIs/charts with direct-query fallback and verified actions only.
- LMS: `/admin/crm-v2/courses` is a compact Course Hub; each course opens `/admin/crm-v2/courses/[courseSlug]` as a dedicated Course Workspace. Seven URL-backed sections remain freely navigable, lesson editing stays modal, and raw enrollment forms were removed in favor of the safe student provisioning wizard.
- Dashboard: revenue is hourly for Today, daily for 7/30 days and weekly for 90 days. Recharts renders revenue area, horizontal funnel, source donut, course ranking and Meta Ads versus revenue. Meta data is read from the Graph API and fails closed without demo numbers; Ads KPIs include spend, ROAS, CAC, CPC and CTR.
- Operator scope: the primary shell contains Overview, Customers, Students, Courses, Reports and CRM-owned Settings. The standalone Orders table is retired; each customer's 360 profile owns its order/payment history, while order APIs remain intact for backend operations.
- Released: Course Studio step navigation remains entirely under `/admin/course-studio/[courseSlug]`; Curriculum reveals one selected module at a time and lesson editing stays focused. Customer course identity is atomic and prioritizes paid orders; Ebook matching uses a word boundary so `Facebook` can never be mistaken for `Ebook`. Reports combine paid revenue and live Meta Ads with hourly Today view, horizontal source/course/funnel charts, ROAS, lead-to-paid conversion, CPL, cost per paid order, cost per distinct paid customer and revenue after Ads; undefined ratios show `Chưa đủ dữ liệu`.
- Safety state: paid revenue excludes free/trial; admin reads are bounded; public results contain no credentials or contact PII. The workspace deploy guard fail-closes on source path/package, Git remote/branch/dirty tree, build and Vercel identity. Separately, command-center/provisioning runtime fails closed on missing RPC/schema, mismatched fingerprint or invalid/lost operation lease.
- Verification for Lean Solo Admin v3: full Node 402/402, CRM Chromium 33/33, TypeScript, focused ESLint and Next.js production build pass. Local no-PII screenshots confirm readable contrast and progressive Course Hub layout.
- Live owner smoke: 30-day dashboard loaded real KPI, revenue/source/course/activity data; Today rendered `Doanh thu theo giờ`; Course Hub loaded 10 real courses; `facebook-ads-2026` Workspace loaded 3 modules, 23 lessons and no raw add-student form. Unauthenticated routes/API/customer routes passed protected smoke and post-release error logs were clean.
- Meta Ads production is linked to active account `1255736315302940` (`Greezhub 01`, VND, `America/Los_Angeles`). The adapter requests advertiser-hour rows with `time_increment=1`, follows pagination, applies DST and then groups into Vietnam business days/hours; the token remains a Vercel sensitive variable and is never stored in source or docs.
- Release candidate after the live visual review: Course Studio is isolated at `/admin/course-studio/[courseSlug]`; course order is editable without changing enrollment/access; order and lead summaries follow the selected range; BI adds cumulative revenue and order status; course ranking labels no longer overlap; Meta hourly data converts the ad-account timezone to Vietnam business days before aggregation.
- Post-deploy owner QA found CRM v2 order rows can be unsynchronized while canonical `public.orders` already powers paid KPIs. The order-status BI summary now prefers bounded canonical public orders when no table-specific filters are active, preventing an empty chart beside a nonzero paid KPI.
- Protected release scope: no student learning/access/progress, checkout/payment, email bridge, tracking, public asset or active Ads landing-page code is included. Any protected landing diff or smoke mismatch blocks production.
- Read-only audit: `docs/audits/2026-07-12-main-and-student-ui-audit.md`. The student portal remains unchanged; its visible placeholder download links are deferred to a separate maintenance window.
- Visual verification: synthetic/no-PII desktop 1440px, mobile 390px, paid confirmation, trial mode and partial email-review states rendered without browser error overlay or console errors. Unauthenticated `/admin` redirected to `/admin/login`; grant and review POST routes returned 403.
- Database rollout: reporting, journal/lease, idempotency/enrollment/email-review RPCs were applied to the production project in guarded order and verified by metadata plus a no-op missing-operation read. Long SQL functions were split into versioned source migrations because the migration transport truncated function payloads; each function was executed intact, then its migration record was written. No customer account, order, enrollment or email was created during rollout.
- Release verification: central guard, protected-route preflight, focused provisioning 52/52, full Node 394/394, TypeScript, ESLint and local/Vercel production build pass. Preview dpl_Fj37G3NFo3vKQtbUm7jM6oXQiwpa is Ready but Vercel SSO blocks public preview smoke. Live smoke passed: /admin redirects to dashboard; protected admin pages redirect to login; CRM API is 403; /go, /vao-khoa-hoc, and the academy route are 200; protected library redirects to login; retired /admin/facebook-ads is 404. Vercel error logs contained no post-release runtime errors.
- Release verification: focused 47/47, full Node 399/399, TypeScript, ESLint, diff check, local/Vercel production build, protected preflight, Chromium CRM 33/33, live redirect/API/customer-route smoke and 15-minute Vercel error scan passed. Local screenshots were captured without production PII. Authenticated production owner data should receive the final human visual check; no customer account was used for provisioning smoke.

## 2026-08-02 - Simplified public site, consultation checkout and student account (local)

- Public information architecture is now limited to Home, Services, Courses, Resources, Workshop and authentication. The old ecosystem/about/partners/contact/blog/student/skills public routes are physically removed and excluded from sitemap/Website JSON-LD.
- `/dich-vu` presents exactly three Marketing & AI services. `/dang-ky-tu-van` collects the selected need and creates a fixed 500.000đ consultation order; The Anh contacts the customer after payment. The fee is deducted if the customer later buys and is non-refundable if they only receive consultation.
- Catalog keeps 10 products: four approved landing pages are live and six coming-soon cards are non-clickable. Authenticated navigation exposes `/dashboard` and `/tai-khoan`; account management supports name/phone, verified email change and voluntary password change without altering order/access history.
- Consultation payment confirmation sends consultation-specific mail and skips student-course provisioning. Existing course checkout, order, SePay, email, entitlement, progress and admin CRM flows remain intact; no schema or production data change.
- Verification: 477/477 Node tests, TypeScript, Next.js 91-page production build, ESLint 0 errors/1 pre-existing warning, browser QA of retained/removed routes and exact 3/10/4/6 content counts. Local only; no deployment.

## 2026-08-02 - AI Master and Agent Kit landing completion (local)

- The standalone `Trang chủ` header item is removed; both desktop and mobile brand/logo links remain the home entry.
- `/academy/ai-master-x10-hieu-suat` is restored through the existing published landing HTML. AI Master and Agent Kit both show and submit the server-known price `990.000đ`; their checkout demo fixtures and Meta event values use `990000`.
- Only the AI Master and Agent Kit catalog covers moved to `v3`, using the approved luminous cobalt/cyan/violet landing-page direction. The other eight covers and the 4-live/6-coming availability gate are unchanged.
- Browser QA: both landings return 200, expose their form/CTA, show no legacy 1.299.000đ/359.000đ price, have no broken content image or horizontal overflow, and pass 390px mobile checks. No form was submitted.
- Verification: 478/478 Node tests, TypeScript, Next.js 91-page production build, ESLint 0 errors/1 pre-existing unrelated warning. Local only; no deployment, real order, email or database mutation.

## 2026-08-03 - Zalo ZBS pending-course-payment reminder (local, disabled)

- `main-site` now has a lease-fenced ZBS outbox and protected worker for exactly `facebook-ads-2026`, `ebook-facebook-ads-2026`, or their exact two-item bundle. A row is eligible only while still pending 5–24 minutes after registration; the worker rereads authoritative status immediately before sending and permanently fences successful sends.
- Zalo OAuth tokens stay in a service-role-only private credential store and rotate atomically. The server client follows the authenticated official Zalo ZBS contract; no token or app secret is in source, migration, docs, logs, or browser code.
- Customer CTA opens `/thanh-toan/<code>?openBank=1`. On mobile the server builds official VietQR app-specific links; the bank chooser requires a customer click and the existing QR/copy details remain visible as fallback.
- Production remains disabled. The ZBS template is not yet submitted/approved, the migration is not applied, Cron is not enabled, and no daily cap has been owner-approved. The rollout runbook requires these gates and blocks backfill with `ZALO_ZNS_ROLLOUT_AT`.
- Verification: focused Zalo/payment tests 25/25; full Node 542/542; TypeScript and 94-page Next production build pass. ESLint has 0 errors and 1 pre-existing unrelated warning in `components/crm-v2/support-bookings-client.tsx`.

## 2026-08-21 - Premium Ebook conversion rewrite theo workbook (production)

- App/domain: `main-site` / `/academy/ebook-facebook-ads-2026-premium`; triển khai trực tiếp từ toàn bộ workbook `ebook_facebook_ads_2026_landingpage_codex_plan.xlsx`, P0 trước P1.
- Định vị mới: thư viện tra cứu Facebook Ads 2026; hero result-first, 3 tình huống, 4 lớp Offer → Creative → Data → Vận hành, 12 outcome, 3 cách dùng, đọc thử thật Phần 1 + Phần 5, 10 phần, tác giả, value stack, checkout, FAQ và final CTA.
- Giữ nguyên 399.000đ, optional course bundle 1.098.000đ không chọn sẵn, invoice, `/api/orders`, payment redirect, Pixel `1315653423712065`, browser PageView/ViewContent và Lead sau khi tạo đơn. Không thêm browser InitiateCheckout/Purchase.
- Xóa giá gạch 799.000đ khỏi chính Ebook vì chưa có bằng chứng giá gốc; giá khóa riêng 799.000đ trong add-on vẫn là dữ kiện server-known. Không đưa cam kết ra đơn, lifetime access/update hoặc refund chưa được phê duyệt.
- Source/published HTML byte-identical. Browser QA local 1440/390/320: không tràn ngang, không ảnh lỗi, không console warning/error; add-on toggle đúng, không submit form và không tạo đơn.
- Verify: focused commerce/delivery/tracking 86/86; full Node 594/594; TypeScript; tracking; ESLint 0 lỗi/1 warning cũ ngoài phạm vi; Webpack build 96 trang. Exact Ebook/preview/protected reader/PDF routes trả 200 trên production build local. Repo-wide route verifier vẫn có 8 route legacy 404 ngoài phạm vi.
- Trạng thái: live từ runtime commit `a4db95a` qua preview `dpl_J1ME2GVxtcHAez9fQs8GvtgQ9gXk` và production `dpl_Ak1fTmaTMb2NnKvrTtW4CtnjqpTh` (`READY`); rollback là `dpl_5kEZoPX1YAtoGdXHBgpJrzqixeNA`. Feedback khách mua Ebook, thời hạn truy cập, chính sách cập nhật tương lai và chính sách hoàn tiền chưa có nguồn thật nên không được bịa trên landing.
- Hero refinement theo wireframe owner: bỏ header, bố cục copy trái / sách + 2 trang mẫu + 3 thông số phải, 3 lợi ích chạy ngang cuối hero. Browser 1440/390/320 đạt; source/published byte-identical; commerce và tracking giữ nguyên. Vẫn local only.
- Direct-file preview fix: toàn bộ bundled Ebook image và `checkout-invoice.js` dùng đường dẫn tương đối `../`, nên cùng HTML chạy được qua `file://`, `/ladipage/...` và `/academy/...`; regression xác minh từng asset tồn tại thật.
- Final owner UI pass live: hero fact row chỉ còn `471 trang`, `10 phần`, `2026 cập nhật`; CTA/menu/sticky controls dùng góc 14px và page arrows 12px thay cho pill radius. Source/published/live SHA-256 cùng là `f272b6fb4d8734b472ac22e17064d90b0d3fe81d1fc61b6a8a75689cee0f2248`; 29/29 URL ảnh trả 200, responsive 1440/390/320 không overflow, guards 307/405/405 và runtime error scan sạch. Không submit form hoặc tạo order.

## 2026-09-05 - Checkout and Facebook Ads landing compositor stabilization (production)

- Video evidence showed the site foreground disappearing for roughly two 30 fps frames while browser chrome and the page background remained, consistent with a compositor-layer dropout rather than navigation or network reload.
- `/thanh-toan/[code]` no longer uses full-viewport `blur-3xl`, `backdrop-blur`, floating notice/Zalo animations, or a continuously translated duplicate Zalo marquee. The proof gallery remains complete as a manual horizontal snap scroller.
- `/academy/facebook-ads-master-2026` no longer runs idle infinite decoration animations or blurred backdrop surfaces. Finite interaction/reveal behavior and the checkout transition spinner remain intact.
- Offer, pricing, QR/SePay, polling, invoice, email/access, Pixel/CAPI and CTA contracts are unchanged. Source/published landing HTML remains byte-identical.
- Verification: focused regression `39/39`, targeted ESLint, `git diff --check`, Chrome local readback `200` for landing and demo checkout with zero running animations/backdrop blurs, and Webpack production build `104/104` routes. Runtime commit `7846ba4`; production `dpl_3fFL3SV8nNYT87vVUkUxU4zeyHbm` is Ready on `www` and apex. Live landing returns `200`, matches source SHA-256 `a787f17a2f3d647036491591d907afed7999c0686455ed458f1aaa47a75a5d52`, has zero running animations/backdrop blurs/broken images/overflow/browser errors, and post-release error logs are empty. No real order was created.


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


## 23/09/2026 — Ebook UI đã phát hành (LIVE)

Anh đã duyệt triển khai bằng yêu cầu “deloy đi em”. Runtime commit `2f0531822e055a08769bc63012c74986ba083258`; production `dpl_AtMykk6RPVFztnbgFAEfvV31Xm4B` READY, gắn cả www/apex. URL: https://www.theanhmarketing.com/academy/ebook-facebook-ads-2026-premium . Rollback: `dpl_GQkUtpXmxaQscBJhq4nBZXyZb72F`.

Doctor và preflight canonical PASS sau commit/push; 64/64 kiểm tra phạm vi PASS, ESLint/diff PASS, build webpack + TypeScript và 108/108 trang PASS. Vercel preview READY nhưng bị bảo vệ đăng nhập; không tính redirect đăng nhập là bằng chứng nội dung. Promote tạo một production build riêng, đã chờ READY.

Bốn URL Ebook (www/apex/academy.html/ladipage.html) HTTP200, byte-identical với source, SHA256 `a3918dba76640248fda8285969335a0cdd8aa7bf0f948255886b3e5141428ebe`. Mười route HTTP200 và destination giữ nguyên; bốn landing tĩnh ngoài phạm vi giữ nguyên hash. Codex IAB trên live: desktop1440 và mobile390 không tràn ngang; hero dễ đọc, CTA tới khu giá/form; mua kèm399K→1.098M→399K; menu/thanh dưới ẩn khi form hiển thị; dialog ảnh mở/đóng đúng. Đã để tab production cho anh xem. Runtime error/fatal của deployment trong cửa sổ kiểm tra không có bản ghi.

Không tạo đơn, thanh toán hay email thật; chưa kiểm tra thiết bị vật lý hoặc xác nhận event tại Meta. Nội dung/form/script nghiệp vụ gốc được giữ. Bằng chứng: feature `reports/ebook-ui-20260923/live-after.json`, `live-source-match.json`, `release.json`. Trạng thái LIVE này thay thế ghi chú LOCAL_REVIEW/chưa deploy ở trên; không còn chờ duyệt deploy.


## 26/09/2026 — PC chuyển bài chậm, mobile thiếu danh sách (LOCAL_REVIEW)

App theanh-main. Feature `worktrees/learning-smooth-20260926`, base e3fe718, branch fix/learning-smooth-20260926. Đã xác nhận với anh: PC lag khi chuyển bài, điện thoại không show danh sách. Thay global CRM ở lesson page bằng records theo email; lọc slug trước tải course/resources; chạy đọc độc lập song song; activity dùng after; guest/admin bỏ enrollment reads không cần thiết. PC có pending và animation ngắn/reduced-motion, thumbnails lazy, tài liệu mount khi mở. Mobile đưa danh sách ngay dưới video, nút Bài học cố định/safe-area. Key từng bài reset progress state; giữ auth guard và không thêm route loading boundary bên ngoài.

84 tests liên quan PASS, scoped lint/TypeScript/diff PASS; kết quả build cuối ở feature docs/LEARNING_SMOOTH_20260926.md. Chưa deploy, chưa authenticated browser PC/mobile hoặc đo timing/playback thật; workspace UI policy không được thay đổi. RPC enrollment global cho học viên vẫn còn, không schema/RLS/migration; không thay landing/checkout/email/quyền. Không gộp với student-resource-app. Bước tiếp: kiểm tra giao diện có đăng nhập và scoped guarded release khi được anh duyệt.

Context đã đọc: registry/control/policy, ACTIVE_TASKS, AI_CONTEXT_INDEX, SESSION_STATE, FEATURE_REGISTRY, ROLE_AND_SESSION_PROTOCOL, SESSION_START_CHECKLIST, DATABASE-CONTRACT; repo AGENTS, CURRENT_STATE, FEATURE_MAP, handoff, DESIGN_RULES, SECURITY_HARDENING, DATABASE_ARCHITECTURE, lesson note và source/tests liên quan.

## 26/09/2026 — Email chưa thanh toán: 08:30 sáng gần nhất

- Owner yêu cầu bỏ email lúc nửa đêm và xác nhận 08:30 sáng gần nhất, giờ Asia/Ho_Chi_Minh. Trước sửa: expiry cron 17:00 UTC = 00:00 Việt Nam; reminder 1 sau 10 phút không có time gate; GET lookup cũng gửi expiry email trực tiếp.
- Candidate giữ vòng đời hết hạn nhưng bỏ gửi email trực tiếp ở cron expiry và lookup. Queue hai lần hiện có sở hữu email tự động; pending/expired chưa trả tiền đủ điều kiện, paid/failed hoặc payment_status=paid bị hủy. Không đổi email xác nhận đăng ký ban đầu, thanh toán thành công, SePay, access, giá, landing hoặc nội dung template.
- Migration `20260925173835_payment_reminders_nearest_morning.sql`: lần 1 là 08:30 kế tiếp sau created_at; lần 2/retry là 08:30 kế tiếp sau lần gửi/thử. Time gate SQL và worker 08:30 <= giờ Việt Nam < 09:00; cron bắt đầu 08:30, chạy mỗi 5 phút đến 08:55 để thoát backlog/lỗi worker. Không gửi lại rows sent/cancelled. Không phục hồi backlog cũ.
- Giữ lease/idempotency; worker kiểm tra lại cả status và payment_status ngay trước gửi, xử lý nhiều lô nhỏ trong thời lượng route. Expiry cron đổi 01:30 UTC và chỉ đổi trạng thái.
- Local: 22 kiểm tra PostgreSQL cô lập đạt (giờ đêm, 08:29/08:30, qua ngày/năm, expired, paid, lease/dedupe, retry, backfill có giới hạn, service-only grants); tests phạm vi email/payment/landing đạt; TypeScript, scoped ESLint, Webpack build108 đạt. Full suite829/858 đạt,27 lỗi giống baseline và2 skipped; không có lỗi mới. Không gửi email thật để QA.
- Trạng thái: source/local verified, chưa áp dụng migration hoặc deploy tại thời điểm ghi mục này. Live status được cập nhật sau khi phát hành.


## 26/09/2026 — Email nhắc thanh toán 08:30 đã LIVE

Theo xác nhận của anh, email nhắc gửi lúc 08:30 sáng gần nhất theo Asia/Ho_Chi_Minh: đơn tạo 00:14 → 08:30 cùng ngày; đơn tạo 08:31 → 08:30 ngày sau. Lần nhắc thứ hai và lần thử lại cũng vào buổi sáng kế tiếp. Worker bắt đầu 08:30, xử lý tiếp mỗi 5 phút đến 08:55; cả SQL và ứng dụng chặn ngoài 08:30–09:00.

Runtime `042e0ee153ecf56e0fc2ea4b288087d8b37f5de2`, preview `dpl_A8daD3CrwYDutBSkQpSoLRDQov8K` và production `dpl_6tW11JwXvH7u5pcqdji7Gn5eGcuX` đều READY. Đã đọc lại alias www/apex và preflight canonical/remote đạt. Giữ nguyên bản học viên `2a3eb94` đã phát hành trước đó. Migration `20260925173835` đã áp dụng; đọc lại lịch, khung giờ và quyền gọi hàm đúng; claim ban đêm trả về [].

Cron và trang tra cứu chỉ cập nhật trạng thái hết hạn, không gửi email trực tiếp. Queue hiện có sở hữu email tự động cho đơn pending/expired chưa trả tiền; paid/failed hoặc payment_status=paid bị hủy nhắc. Không khôi phục hàng đã sent/cancelled hay hàng đợi cũ. Email tạo đơn ban đầu và email thanh toán thành công vẫn gửi tức thời.

Kiểm tra: 89 tests phạm vi và 22 SQL assertions cô lập đạt; TypeScript, scoped ESLint, build 108 trang đạt. Sau khi tích hợp bản học viên, tests liên quan, TypeScript và build tiếp tục đạt. Bộ test đầy đủ có 27 lỗi trùng baseline, không có lỗi mới; cảnh báo security advisor không tăng. Không tạo đơn hoặc gửi email thật để QA.

Đọc lại Vercel production: worker `30-59/5 1 * * *`, expiry `30 1 * * *`; 6 cron khác giữ nguyên. Bảy landing trả HTTP 200, năm landing tĩnh giữ nguyên SHA; hai trang động có hash HTML theo build, mã nguồn landing không đổi. Hai cron route không xác thực trả 401. Không tìm thấy error/fatal trong cửa sổ 17:38:40–17:43:40 UTC.

Chưa quan sát lượt gửi tự nhiên lúc 08:30; cấu hình đúng chưa phải bằng chứng khách nhận thư. Không thay giá, SePay, Auth, quyền học, tracking hay landing. Bằng chứng: `worktrees/payment-reminder-morning-20260926/reports/payment-reminder-morning-20260926/`. Rollback ứng dụng: `dpl_E1ucTHFtVLdaR1T3VKF2bmSaNLDE`; rollback ứng dụng không tự rollback migration. Trạng thái LIVE này thay thế các mục chưa triển khai phía trên.


## 26/09/2026 — Learning performance v2 (READY, migration applied)

Base0efb3f0 retains live morning reminder release. Scope student portal only: new service-only SECURITY INVOKER student_lms_enrollments_scoped filters exact Auth identity, course, active/completed and expiry; returns only matching progress and playable lesson counts. Applied migration20260925180425; grants readback anon/authenticated false,service true. Local PostgreSQL isolation/expiry/legacy/grants PASS;209 scoped tests PASS; build108/108, TS and scoped lint PASS. Reviewer found stale prefetched progress; fixed router.refresh after success.

getStudentLmsAccess now scopes courses by slug on lesson request. markLessonCompleted reads only matching course/modules/lessons, defers activity via after. Client props remove duplicate full-course/all-lesson bodies. Adjacent full prefetch + hover/focus intent, pending spinner, press/success motion,reduced-motion; log prefetch skipped, actual onNavigate logs nonblocking. Password-first guard on direct lesson and progress403; reset preserves next/errors, change-password log nonblocking with retryable failure state; login distinguishes credentials/provider failure. Dashboard count uses23 playable lessons vs26 raw rows.

Live baseline confirms function iad1 (x-vercel-id) while Supabase ap-southeast-2 Sydney. Student routes choose preferredRegion syd1; confirm actual region after release. No global deployment/checkout/cron config changes. Baseline6 full-page authenticated lesson requests6118/3569/2125/2688/1704/2183ms;save4576ms. Same test account, metadata-only evidence; no secret stored. Runtime release pending, no completion claim until post-deploy checks.


### Điều chỉnh vùng xử lý sau đo production

453061a đã live và18/18checks Auth/học/lưu tiến độ đạt; lesson payload ~105KB→82KB, save4576→2880ms. Tuy nhiên x-vercel-id vẫn iad1: builder @vercel/next bỏ regions từ functions-config-manifest của Node routes. Vì vậy preferredRegion không phải bằng chứng đã chuyển vùng. Bổ sung functions.regions trong vercel.json cho đúng4 nhóm trang/API học viên;8cron và vùng mặc định không đổi. Schema chính thức hỗ trợ và4patterns khớp source; chờ deploy/đo live để xác nhận syd1. Nguồn: https://vercel.com/docs/functions/configuring-functions/region#per-function-configuration .
