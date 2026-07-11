# Session Log

## 2026-07-11 - Hợp nhất Admin/CRM và hiện đại hóa LMS

Phạm vi: đưa CRM v2 thành admin owner duy nhất, sửa dashboard dữ liệu thật và nâng cấp trình quản lý khóa học theo Course Hub có hướng dẫn tự do.
Các file đã thay đổi: route admin tương thích, CRM shell/dashboard/data fallback, LMS manager/student metrics, contract tests và tài liệu nguồn sự thật.
Kết quả: 9 khu vực vận hành chính; dashboard bỏ insight không có đích; LMS có 7 bước, curriculum hai cột, save state, analytics thật; editor không bị mở quyền CRM ngoài ý muốn.
Kiểm tra đã chạy: TDD contract CRM/LMS 28/28, TypeScript và ESLint; full test/build/preflight/deploy đang thực hiện ở cuối phiên.
Việc còn lại: hoàn thành full gate, production deploy qua central guard, browser QA và log scan.
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
