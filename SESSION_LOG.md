# Session Log

## 2026-07-22 - Facebook Ads lesson reference downloads

Scope: `theanh-main` learning room only. Added three customer-safe reference ZIPs and previews below the video for `facebook-ads-2026`; no other course receives the section.
Implementation: typed course config, focused reference-library component, server-route lookup and one insertion point before the existing lesson title/progress/navigation card. Existing lesson-specific resources remain unchanged.
Safety: packages contain only audited research, planning and generic AI visual samples. Real Ads reports, customer/CRM data, account screenshots, internal Agent source, duplicate assets and the broken black poster were excluded.
Verification: ZIP entry counts `3/5/3`; TDD RED then focused GREEN `8/8`; full Node `414/414`; TypeScript, ESLint, diff check, Next build 105 pages, canonical session guard and protected-surface preflight pass. Production deployment has not been executed.

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
