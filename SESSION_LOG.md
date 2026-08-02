# Session Log

## 2026-08-02 - Rebuilt all course covers with colorful rounded typography

Scope: local public catalog/homepage course-card visuals only.

Changes: inspected the nine original course thumbnails plus the Ebook page cover; generated ten clean, text-free 3D backgrounds using built-in image editing; composited exact Vietnamese titles, The Anh Marketing badge and practice label using rounded typography; saved non-destructive v2 WebP assets; switched course data to v2; made the card media square to prevent crop.

Verification: focused 13/13; full Node 463/463; TypeScript pass; ESLint 0 errors/1 existing warning; Next.js 110-page build pass. Desktop/mobile browser QA confirmed 10/10 v2 assets, no broken images, no horizontal overflow and clean console. No database or deployment mutation.

## 2026-08-02 - Built Phase 1 Noti-style local foundation

Scope: main-site public homepage and course catalog only, implemented in isolated worktree `feat/noti-visual-redesign-local`.

Changes: introduced the scoped light design foundation; rebuilt homepage story and catalog; added shared marketing components, responsive header/menu/footer, searchable filters, FAQ interactions and real service-driven product/proof rendering. Disabled the legacy offer popup only on homepage after mobile/desktop QA showed it obscured the approved hero. Synchronized Agent Kit price/copy from the recovered backup.

Safety: no database, payment, order, email, Auth, student access, progress, admin or production deployment mutation.

Verification: focused tests 12/12; full Node tests 462/462; `tsc --noEmit` exit 0; ESLint 0 errors/1 pre-existing warning; Next.js 16.2.6 build generated 110/110 pages. Browser QA at 1440x900 and 390x844 found no horizontal overflow, broken images, warnings or errors; catalog search/filter, mobile menu and FAQ passed.

## 2026-07-25 - Built public guide and paid support booking demo

- Added public guide, slot selection, checkout, paid confirmation, CRM list/busy-date controls and student Dashboard CTA.
- Captured local no-PII QA screenshots under `docs/qa-screenshots`.
- Restricted booking to authenticated paid-course students and removed editable identity fields; API derives identity from the paid course order.
- Passed 443/443 Node tests, TypeScript and Next.js production build.
- No deployment and no production migration were performed.
- Replaced guide mockups with five Playwright-captured local screens using a clearly marked demo QR and the real payment-success email HTML. No account or transaction was created.
- Full Node suite now passes 446/446; TypeScript and production build pass.
- Removed the 500.000đ price from the student Dashboard CTA and public guide CTA; retained full price disclosure inside `/dat-lich-ho-tro`.

## 2026-07-22 - Correct stale 799K pending-email title found in live QA

- The first production test email without Ebook arrived in Inbox but exposed the retired `Zoom lên ads + Agent kit` title.
- Updated only the 799K pending-payment product-title override to the current AI Agent offer; Ebook bundle title remains unchanged.
- Added RED/GREEN coverage that forbids Zoom in the 799K pending email. Focused landing/email tests pass `18/18`.
- Deployed runtime commit `3a4f52d` as production `dpl_H1cBGPGCGyWbvkeXSPfs79Wh5f55` (Ready). Final orders `TAMMRVYILFFF4QHD` and `TAMMRVYIOZCPIUT0` both reached the approved Gmail Inbox; the no-Ebook subject contains `Gói AI Agent 799K` and no Zoom wording, while the bundle subject identifies Facebook Ads + Ebook.

## 2026-07-22 - Remove redundant 799K pricing-card button

- Removed only the annotated `Chọn gói 799K` button from both synchronized Facebook Ads landing HTML files.
- Preserved the selected/clickable pricing card, registration submit, sticky CTA, 799K default plan, optional 299K Ebook add-on, payment and tracking behavior.
- Added a regression assertion; focused test passed `11/11`. Production DOM QA confirms the removed button count is zero while the Ebook add-on and payment submit remain present.
- Final gate passed `420/420`, TypeScript, ESLint, diff check and local/Vercel 105-page builds; route smoke and Vercel error scan passed.

## 2026-07-22 - Add optional Ebook to Facebook Ads checkout

- Added the optional `Mua kèm Ebook Facebook Ads` checkbox after the phone field on both synchronized Facebook Ads landing HTML files.
- Kept the default package at 799,000 VND. Checked state submits server-known plan `zoom-kit-ebook-299` for one 1,098,000 VND order containing `facebook-ads-2026` (799,000 VND) and `ebook-facebook-ads-2026` (299,000 VND).
- Extended checkout pricing, paid redirect, entitlement identities, pending email, success email and SePay Ebook-account gating for the two-product order, including fallback comma-separated `course_slug` rows.
- TDD evidence: focused RED was 5 failures; final focused suite passed `49/49`. Repository verification passed `420/420`, TypeScript and ESLint.
- No database schema, standalone Ebook price, production data or deployment change. Candidate remains local.

## 2026-07-22 - Facebook Ads Agent demo and 12 Zalo proofs

Scope: public static landing `/academy/facebook-ads-master-2026`; no database, API, checkout, payment, email, student access or tracking change.
Change: added `#agent-tu-dong-len-quang-cao` between outcomes and curriculum, with a looping 960x490 GIF titled “Agent tự động lên toàn bộ quảng cáo”, a reduced-motion WebP poster, three execution proofs, and a continuous 12-card Zalo support carousel. Seven approved call screenshots keep their highlighted 21–55 minute durations and privacy masks; five additional feedback/support screenshots complete the set. The weakest operational screenshot ending `a1814dc3cf3103050c99a5f65d909d65.jpg` was intentionally omitted.
Assets: GIF is 4,124,531 bytes; all 12 Zalo assets are 640px-wide WebPs. The supplied MP4 and source Zalo files were not overwritten.
Fit refinement: all Zalo cards now share a `15:32` frame at `300px` desktop and `244px` mobile, with a `12px` gap and centered cover crop of about 1.5%. A temporary 12-image contact sheet confirmed every highlighted 21-55 minute support-call duration remains visible.
Verification: focused `10/10`; source/published HTML are byte-identical; full Node `415/415` with serial test concurrency; TypeScript, ESLint, `git diff --check`, 105-page Next build, desktop and 390px browser QA pass. No horizontal overflow or page-origin error.
Deploy: not deployed. The shared production worktree remains intact with the complete local Agent/Zalo candidate, tests, plans and documentation; no merge, push or cleanup was attempted.

## 2026-07-22 - Remove the 399K option from Facebook Ads Master landing

Scope: `theanh-main` public route `/academy/facebook-ads-master-2026` only.
Change: removed the 399K basic card, all visible 399K references and the landing `video` plan; the only displayed/default/submitted offer is the 799K AI Agent package through `paymentPlan=zoom-kit`. Updated browser `ViewContent` value to `799000` and changed the plan grid to one column beside the existing registration form.
Safety: historical 399K order, checkout and email logic remains available; course catalog data and separate Facebook Ads Ebook 399K landing pages are unchanged.
Verification: TDD RED `7/9` then focused GREEN `9/9`; full Node `414/414`; TypeScript, ESLint, 105-page Next build, candidate preflight, source/published hash equality, zero stale 399 markers, and local Chromium desktop/mobile rendering pass. Intercepted form QA submitted `courseSlug=facebook-ads-2026`, `paymentPlan=zoom-kit` and redirected to the expected checkout path without creating a real order.

## 2026-07-22 - Facebook Ads lesson reference downloads

Scope: `theanh-main` learning room only. Added three customer-safe reference ZIPs and previews below the video for `facebook-ads-2026`; no other course receives the section.
Implementation: typed course config, focused reference-library component, server-route lookup and one insertion point before the existing lesson title/progress/navigation card. Existing lesson-specific resources remain unchanged.
Safety: packages contain only audited research, planning and generic AI visual samples. Real Ads reports, customer/CRM data, account screenshots, internal Agent source, duplicate assets and the broken black poster were excluded.
Verification: ZIP entry counts `3/5/3`; TDD RED then focused GREEN `8/8`; full Node `414/414`; TypeScript, ESLint, diff check, local/Vercel Next builds 105 pages, canonical session guard and protected-surface preflight pass. Production deployment `dpl_5cZkzRkTyFfNSiZBEYPhacheKHHg` is Ready and aliased to `https://www.theanhmarketing.com`. Authenticated Chrome QA confirmed the visible three-card region directly below the video, all previews loaded, all six public assets return `200`, protected route smoke passes and the Vercel error scan is empty.

## 2026-07-14 - Customer paid-order product correction

Scope: operational correction for one paid order; no application code or deploy change.
Result: the paid 399,000 VND order was corrected from the basic Facebook Ads course to Ebook Facebook Ads 2026. The account credential hash was verified, the correct UTF-8 Ebook payment-success email was delivered through Resend API, and production email/activity logs were updated.
Safety: this log contains no customer PII, passwords, tokens, or secret values.

## 2026-07-12 - Course Studio, BI correctness and protected landing release

Phạm vi: tách Course Studio khỏi CRM shell, sửa số lead/đơn theo kỳ, tăng biểu đồ BI, sửa chồng nhãn khóa học và chuẩn hóa Meta Ads theo ngày kinh doanh Việt Nam.
Các file đã thay đổi: route Course Studio/redirect, Course Hub/LMS service/API, CRM dashboard/data/order summary/charts, Meta timezone/report adapter, tests, AGENTS và tài liệu audit/trạng thái.
Kết quả: Course Studio mở ở tab riêng; khóa học sắp xếp được; biểu đồ khóa học dùng nhãn hai dòng/chiều cao động; KPI đơn hàng không phụ thuộc phân trang; Meta Ads có trạng thái partial/final và không bịa số.
Kiểm tra đã chạy: Node 403/403, TS unit 19/19, TypeScript, ESLint, Next production build, protected-route preflight và Chromium CRM 33/33.
Việc còn lại: theo dõi chất lượng `partial/final`; xoay sang system-user token dài hạn trước khi mã từ Marketing API Tools hết hạn.
Cảnh báo: không sửa cổng học viên trong release này; các link tải placeholder ở app học viên chỉ được ghi nhận cho maintenance riêng. Token Meta chỉ nằm trong Vercel sensitive env, không nằm trong code, log hoặc tài liệu.

Deploy: `dpl_2bzgufu6yvAMNdsfRAHcKL4EirV7` Ready và aliased tới `https://www.theanhmarketing.com`. Owner smoke xác nhận donut trạng thái đơn không còn rỗng, course labels không chồng, Course Studio độc lập tải 3 module/23 bài/98 học viên. Meta Ads Greezhub 01 live: hôm qua final 2,5 triệu/ROAS 0,80x; hôm nay hourly partial 392,6 nghìn; 30 ngày gồm hôm nay partial 30,8 triệu/ROAS 2,04x. Landing Ads chính khớp baseline title/H1/nội dung/CTA và 0 ảnh lỗi; sáu landing/bridge URL trả 200; Vercel error scan 10 phút không có log.

## 2026-07-11 - Lean Solo Admin v3

Phạm vi: thu gọn admin một người vận hành, tách LMS progressive disclosure, thay dashboard bằng biểu đồ thích ứng và kết nối Meta Ads thật.
Các file đã thay đổi: CRM shell/settings/dashboard/data/types, Course Hub/Workspace/student provisioning entry, Meta Ads adapter, revenue series, tests, specs và tài liệu dự án.
Kết quả: navigation còn 7 module chính; LMS dùng Hub → Workspace; enrollment thô bị xóa; Ebook map đúng; dashboard có area/horizontal bar/donut/course ranking/Ads-revenue và không dùng số demo.
Kiểm tra đã chạy: full Node 402/402, CRM Chromium 33/33, TypeScript, focused ESLint, Next.js production build và ảnh QA local không PII.
Việc còn lại: thay `META_ADS_ACCESS_TOKEN` production vì Meta trả OAuth code 190; mọi phần website còn lại đã deploy và smoke xong.
Cảnh báo: transactional email trong provisioning được giữ vì là luồng cấp tài khoản thật; module marketing email/automation chỉ bị loại khỏi operator navigation, backend không bị xóa phá vỡ. Ads hiện fail-closed, không hiện số 0 giả.

Deploy: `dpl_BNiPohPsAVLdvBJtVzZV7GMe5n3z` Ready và aliased tới `https://www.theanhmarketing.com`. Owner smoke xác nhận 235 lead, 105 MQL, 95 đơn paid, 67 triệu doanh thu trong 30 ngày; Today có biểu đồ theo giờ; Course Hub có 10 khóa thật; Vercel không có error-level log mới.

## 2026-07-11 - Hợp nhất Admin/CRM và hiện đại hóa LMS

Phạm vi: đưa CRM v2 thành admin owner duy nhất, sửa dashboard dữ liệu thật và nâng cấp trình quản lý khóa học theo Course Hub có hướng dẫn tự do.
Các file đã thay đổi: route admin tương thích, CRM shell/dashboard/data fallback, LMS manager/student metrics, contract tests và tài liệu nguồn sự thật.
Kết quả: 9 khu vực vận hành chính; dashboard bỏ insight không có đích; LMS có 7 bước, curriculum hai cột, save state, analytics thật; editor không bị mở quyền CRM ngoài ý muốn.
Kiểm tra đã chạy: TDD focused 47/47, full Node 399/399, TypeScript, ESLint, diff check, local/Vercel build, protected preflight, Chromium CRM 33/33, live smoke và Vercel error-log scan.
Việc còn lại: anh kiểm tra trực quan lần cuối bằng owner session với dữ liệu production; không cần migration hay thao tác dữ liệu cho release này.
Cảnh báo: không thay schema, course content, enrollment hay tài khoản học viên trong thay đổi giao diện này.

## 2026-07-11 - Deploy Solo Admin Command Center

Phạm vi: áp migration production theo guarded rollout, đóng gói release candidate và deploy website chính.
Các file đã thay đổi: migration provisioning được tách theo boundary; test discovery migration được chuẩn hóa; CURRENT_STATE.md, handoff và registry được cập nhật.
Kết quả: production deployment dpl_9BxXpsmV25dXmHzAYoyzjddfJDdJ Ready trên Vercel Project theanhmarketing; không tạo tài khoản, đơn hàng, quyền học hoặc email khách hàng trong rollout.
Kiểm tra đã chạy: focused 52/52, full Node 394/394, TypeScript, ESLint, local/Vercel build, central verify, protected preflight, live route smoke và error-log check.
Việc còn lại: owner smoke bằng tài khoản test không phải khách hàng trước lần provision học viên thật đầu tiên.
Cảnh báo: preview bị Vercel SSO nên không dùng public preview request để kết luận app route; production live smoke đã pass.

## 2026-07-11 - Solo Admin Command Center

Phạm vi: làm lại admin thành command center trực quan; thêm báo cáo/queue, activity lazy và wizard paid/free/trial có chống tạo/gửi trùng.
Các file đã thay đổi: admin routes/components/model/services, provisioning journal/orchestrator/migrations, protected APIs, tests và tài liệu handoff.
Kết quả: 6 nhóm biểu đồ thật; queue recovery theo operation ID; tạo học viên không qua code; email mơ hồ bắt buộc owner xác nhận; không hiển thị mật khẩu hoặc PII trong journal/URL.
Kiểm tra đã chạy: focused provisioning 73/73; full Node 394/394; TypeScript, lint, Next build, diff check; local no-PII visual desktop/mobile/wizard; unauth redirect và POST 403.
Việc còn lại: compile/test/apply 3 migration theo thứ tự reporting → journal → idempotency trên staging/disposable DB; owner smoke bằng tài khoản test; deploy preview qua guard.
Cảnh báo: production chưa đổi và chưa an toàn để deploy cho tới khi hoàn tất các bước database/authenticated smoke trên.

## 2026-07-10 - Verify recovery release candidate

Phạm vi: integrate the preserved recovery checkpoint into the canonical production branch.
Các file đã thay đổi: existing recovery checkpoint plus `CURRENT_STATE.md` and `SESSION_LOG.md`.
Kết quả: fast-forward integration completed; remote backup branch exists; preview `dpl_FFnYLkGmZsPn5Aay2MzpYkXCphKD` is Ready.
Kiểm tra đã chạy: session guard, protected-route preflight, 247/247 tests, typecheck, lint, local build, Vercel build and preview smoke.
Việc còn lại: normal post-release monitoring; no blocker remains.
Cảnh báo: landing-page and temporary roots remain forbidden deploy sources.

## 2026-07-10 - Workspace governance

Phạm vi: project identity, feature map and deploy guard documentation.

Các file đã thay đổi: `AGENTS.md`, `PROJECT_CONTEXT.md`, `FEATURE_MAP.md`, `DEPLOYMENT.md`, `CURRENT_STATE.md`, `SESSION_LOG.md`.

Kết quả: source production được định danh bằng Project ID `theanh-main`; không sửa application code.

Kiểm tra đã chạy: central registry validation and workspace guard tests.

Việc còn lại: classify dirty worktree and pass full website gate before any deploy.

Cảnh báo: không deploy từ `landing-page` hoặc temp candidates.

## 2026-07-10 - Preserve verified workspace recovery state

Phạm vi: classify and preserve the existing mixed working tree without changing production.
Các file đã thay đổi: existing website, checkout/email, LMS/ebook, CRM V2, landing assets, tests, docs and `.env.example` contract.
Kết quả: local branch `chore/workspace-recovery-20260710`; `.env.example` contains names only; production branch and Vercel remain unchanged.
Kiểm tra đã chạy: 247/247 tests, typecheck, lint, build, staged secret scan and `git diff --cached --check`.
Việc còn lại: review/split by feature before any merge; no push performed.
Cảnh báo: production deploy is intentionally blocked by branch mismatch while customers are active.
## 2026-07-12 - Course Studio focus, customer-owned orders and Ads BI

Phạm vi: sửa route Course Studio, progressive curriculum, nhận diện khóa học, hợp nhất đơn vào hồ sơ khách hàng và xây lại báo cáo doanh thu/Ads.
Các file đã thay đổi: CRM shell/routes/data, Course Studio manager, report BI charts/page, solo command links, tests và tài liệu trạng thái.
Kết quả: Course Studio không quay về route cũ; mỗi lần chỉ thao tác một module; `Facebook` không còn bị regex nhận nhầm thành `Ebook`; menu/bảng đơn tổng được bỏ; lịch sử đơn vẫn nằm trong hồ sơ 360; báo cáo có Ads, ROAS, CR, CPL, cost/paid order, cost/distinct paid customer và biểu đồ ngang.
Kiểm tra đã chạy: focused regression, TypeScript, ESLint, 407 Node tests, Next production build và Chromium visual flow; ảnh local không chứa PII thật.
Việc còn lại: anh kiểm tra trực quan bằng owner session; không còn blocker kỹ thuật đã biết trong phạm vi release.
Cảnh báo: không thay đổi landing page quảng cáo, checkout/payment, email, student access/progress hoặc course content.

Deploy: runtime commit `9cb1e82`, deployment `dpl_3ektSz6SHJWYKmG1sNrZfS2AEhyH`, trạng thái Ready và alias `https://www.theanhmarketing.com`. Post-deploy smoke: public/landing/bridge 200; admin protected redirect login; CRM API 403; protected library redirect login; error log 15 phút không có bản ghi.
## 2026-07-12 - Course Studio step interaction hotfix

Phạm vi: sửa bảy nút chuyển bước không phản hồi ổn định và ẩn slug kỹ thuật dưới tiêu đề bài học.
Các file đã thay đổi: Course Studio manager, LMS/admin regression tests và tài liệu trạng thái.
Kết quả: chuyển bước cập nhật tức thời bằng local state, URL chỉ đồng bộ nền bằng History API; không còn hiển thị `lesson-1` hoặc slug dài trong danh sách bài.
Kiểm tra đã chạy: 10/10 focused tests, TypeScript, ESLint và production build 105 routes.
Việc còn lại: anh kiểm tra lại thao tác bằng owner session sau một lần hard refresh; không còn blocker kỹ thuật đã biết.
Cảnh báo: không thay đổi course content, quyền học, landing, checkout hoặc email.

Deploy: runtime commit `60be5c0`, deployment `dpl_EiqfEfmJBJkQDZeEBKp6P7SAkVqU`, Ready và aliased tới `https://www.theanhmarketing.com`. Protected route redirect login đúng và error scan sau release không có log.

## 2026-07-13 - CRM Ebook short-label production release

Phạm vi: sửa nhãn `Khóa học quan tâm` trên `/admin/crm-v2/leads` khi đơn Ebook có tiêu đề chứa `Facebook Ads` nhưng slug là `ebook-facebook-ads-2026`.
Căn nguyên: `courseShortName` chỉ đọc tiêu đề sản phẩm nên đơn `Thư viện kiến thức Facebook Ads 2026` bị rút gọn thành `FB Ads`; slug sản phẩm đã đúng nhưng bị bỏ qua.
Audit production chỉ đọc từ 14/06 đến 13/07: 228 đơn, 237 lead, 191 contact key duy nhất; 26 đơn Ebook của 24 khách duy nhất bị quy tắc cũ phân loại sai. Sáu đơn sản phẩm `Marketing giỏi phải kiếm được tiền` không thuộc Ebook/FB Ads và được khóa test để giữ fallback theo tiêu đề.
Thay đổi: `lib/crm-v2/data.ts` truyền `courseSlug` vào bộ rút gọn nhãn tại mọi mapper/merge point; `tests/admin-solo-ops-regression.test.mjs` thực thi trực tiếp helper cho Ebook, FB Ads và sản phẩm ngoài phạm vi.
Kiểm tra trước deploy: session guard, candidate preflight, full Node 408/408, TypeScript, ESLint, diff check, Next production build 105 pages và central production verify đều đạt.
Deploy: commit `d076218`, deployment `dpl_D2VAgV44iP4nLaAdRexUSbWtwzt1`, Ready và aliased tới `theanhmarketing.com`, `www.theanhmarketing.com` và Vercel production aliases.
Live QA: toàn bộ route/API/Ebook smoke đạt, error log trống. Phiên owner xác nhận 8 dòng 12/07 là `4 Ebook / 4 FB Ads`; quét đủ 205 dòng trên 5 trang bộ lọc 30 ngày cho kết quả `23 Ebook / 181 FB Ads / 1 AI Growth`, không có nhãn lạ hoặc slug bị lộ.
An toàn: không sửa database, API shape, checkout, payment, email, quyền học, landing hay tracking.

## 2026-07-22 - Flatten student lesson list numbering

Phạm vi: giao diện học viên tại `components/course/learning-room.tsx`; không đổi nội dung khóa học, thứ tự dữ liệu, quyền truy cập, tiến độ, payment, email hay tracking.
Thay đổi: bỏ nhóm module trong cột `Danh sách bài học`; render trực tiếp mảng bài học đã được sắp theo module/order để số thứ tự chạy liên tục từ `1` đến bài cuối.
Guard: bổ sung regression trong `tests/learning-room-youtube-layout.test.mjs`; test đã được xem fail trước khi sửa vì còn `getModuleGroups`, sau đó pass 4/4.
Kiểm tra: full Node 409/409, TypeScript, ESLint, `git diff --check` và Next production build 105 trang đều đạt.
Deploy: runtime commit `464cd25`, production `dpl_6WdszCydXnT7LkMKjrY3nTqXtmE2`, trạng thái Ready và alias `https://www.theanhmarketing.com`. Authenticated Chrome QA xác nhận 20 bài published hiển thị đúng một lần, badge liên tục `1..20`, không còn tiêu đề nhóm module. Route/API/landing bảo vệ đều smoke đúng; Pixel Ads chỉ còn `1315653423712065`. URL gốc `/learn/facebook-ads-2026/` vẫn chuẩn hóa slash rồi trả 404; learning room thật nằm ở `/learn/[course]/[lesson]`.
## 2026-07-22 - Move Facebook Ads exclusion lesson to the end

Scope: production LMS data for `facebook-ads-2026`; no source-code, schema, migration, or deployment change.
Change: moved the unique published exclusion lesson from global position 1 into the final published module at local `sort_order=10`, making it global position 20.
Verification: production query returned exactly 20 published lessons with the target exactly once at position 20; non-order lesson fields were unchanged. Authenticated live Chrome QA confirmed the sidebar starts with `Nền tảng Facebook Ads 2026 và tư duy phễu` and ends with the exclusion lesson numbered `20`.
Safety: no content, video URL, access type, student entitlement, payment, email, or tracking change.

## 2026-07-22 - Replace Facebook Ads lesson samples with approved Master Prompts

Scope: `theanh-main` LMS presentation only. Replaced the three preview/ZIP cards below every `facebook-ads-2026` lesson video with six approved Master Prompt TXT download cards and one Google Sheet advertising-script demo action. Other courses still receive no course-level reference cards.

Files: `data/course-reference-packs.ts`, `components/course/course-reference-library.tsx`, `tests/course-reference-library.test.mjs`, and six byte-identical TXT files under `public/course-resources/facebook-ads-2026/master-prompts/`.

Verification before deployment: TDD RED confirmed the old three-pack implementation failed the new contract; GREEN focused test is `3/3`. Source/public SHA-256 hashes match; full Node is `415/415`; TypeScript, ESLint, diff check, protected-surface preflight and the 105-page local build pass. Production deploy and authenticated live UI/download smoke remain pending.

Safety: no database, course content, lesson order, authentication, entitlement, progress, payment, email, tracking or customer data change.

## 2026-07-22 - Restore stable Facebook Ads course entry URL

Scope: LMS routing only for `theanh-main`; no database, course content, entitlement, payment, email, landing or tracking change.
Root cause: direct lessons worked through `/learn/[course]/[lesson]`, but App Router had no `/learn/[course]` page, so the clean course URL returned `404` after trailing-slash normalization.
Fix: added `/learn/[course]`, which reads the current published student-visible course and redirects to its first ordered lesson ID. Both course-root and lesson routes now reuse `lib/course-learning.ts`, avoiding a hard-coded first lesson and keeping Course Studio reorder behavior consistent.
Test/gate: regression was observed RED before implementation; focused `21/21`, full Node `410/410`, TypeScript, ESLint, diff check, candidate preflight, central production verify and 105-page local/Vercel builds passed.
Deploy: commit `9264957`, production `dpl_2fUT489jFwfozhPerCC9NRsHSJCe`, Ready and aliased to `https://www.theanhmarketing.com`.
Live QA: `/learn/facebook-ads-2026/` now resolves through the clean root to lesson `47da65a2-c6c6-4a21-a109-c1feb1d64c8f`; authenticated browser QA showed the learning room and all 23 lessons, Dataset at 19–22, exclusion last at 23. Protected admin/Ebook/email-bridge/Ads routes passed smoke and Vercel returned no new error logs.

## 2026-07-22 - Paid student account operation TAMMRVFSQ6NNSCFT

Scope: production order/Auth/email operation only; no source, schema, migration or deploy change.
Result: exact 799,000 VND order changed to owner-confirmed `paid/manual-admin`; matching `facebook-ads-2026` Auth account created and confirmed; login verified; existing reset/access email delivered by Resend.
Safety: no fake SePay transaction/reference, password, secret or full customer contact stored in this log.
Verification: production SQL readback, CRM success message, `activity_logs`, Auth metadata and Resend `delivered` status.
Final customer evidence: student login succeeded, the temporary password was changed, and a `facebook-ads-2026` lesson was opened; `must_change_password=false`.
## 2026-07-22 - Delete duplicate Facebook Ads lesson 2

Scope: production LMS data for `facebook-ads-2026`; no source-code, schema, migration, or deployment change.
Change: permanently deleted the duplicate published lesson `HỌC CHẠY QUẢNG CÁO FACEBOOK - CẬP NHẬT MỚI NHẤT 2026` and kept `Nền tảng Facebook Ads 2026 và tư duy phễu` as lesson 1. The two records used the same YouTube video.
Safety: the deleted lesson had zero progress rows, comments, lesson resources, and course resources. No student entitlement, payment, email, or tracking data changed.
Verification: production has 19 published lessons, the deleted ID is absent, the kept lesson is present, and authenticated live QA shows positions 1 through 19 with no duplicate title.
## 2026-07-22 - Publish four Dataset lessons

Scope: production LMS data for `facebook-ads-2026`; no source-code, schema, migration, or deployment change.
Change: inserted four published `enrolled_only` video lessons for Dataset introduction, Business Suite, Pancake, and website/landing-page sales at local orders 10 through 13 in the final module. Shifted the exclusion lesson to local order 14 so it remains last.
Verification: production has 23 published lessons; the four Dataset lessons are global positions 19 through 22 and the exclusion lesson is position 23. Authenticated live Chrome QA confirmed the same titles, order, Premium labels, and no site runtime errors.
Safety: no existing lesson content/video/access was changed except the exclusion lesson order; no student progress, entitlement, payment, email, or tracking data changed.

## 2026-08-02 | main-site | Unified course prices and removed legacy offer UI | local ready

- Updated course catalog data so eight courses display `990.000đ`, while Facebook Ads remains `799.000đ` and Ebook remains `399.000đ`; original prices also use full VND formatting instead of `K`.
- Removed the legacy public offer popup from shared public shells and course sales pages, including its obsolete responsive CSS. Admin offer settings and all cart/order/payment/registration/email/access flows remain untouched.
- Browser QA on `/khoa-hoc`: 10 cards, exact 8/1/1 price split, zero popup elements, no broken images, no horizontal overflow at 1280px or 390px, and no console warning/error.
- Verification: focused 13/13, full Node 463/463, TypeScript pass, ESLint 0 errors/1 pre-existing unrelated warning, Next.js production build 110/110 routes. Local only; no Vercel or Supabase mutation.

## 2026-08-02 | main-site | Simplified public services, paid consultation and account management | local ready

- Kept the approved homepage presentation while simplifying public navigation and footer to Home, Services, Courses, Resources, Workshop and auth. Removed eight obsolete public route files and corrected retained links, sitemap and Website JSON-LD.
- Added three Marketing & AI service offers and a fixed 500.000đ consultation checkout. The owner follows up after payment; the fee is deducted from a later purchase and otherwise non-refundable. Paid consultation fulfillment uses a dedicated email and never creates course access/student credentials.
- Locked catalog availability to four exact academy landing pages; the other six cards visibly show `Sắp ra mắt` and expose no link/button. Added authenticated My Courses/Account navigation and safe profile/email/password management backed by the existing Auth identity and shared real ownership resolver.
- Browser QA verified the exact 3 service cards, 10 course cards, 4 live/6 coming split, zero clickable coming-soon cards, no horizontal overflow, retained routes loading and removed routes returning 404. No real form submission, production order, email or data mutation occurred.
- Verification: 477/477 Node tests, TypeScript, ESLint 0 errors/1 pre-existing unrelated warning, `git diff --check`, and Next.js production build with 91 generated pages/routes. No Vercel deploy or database migration.
