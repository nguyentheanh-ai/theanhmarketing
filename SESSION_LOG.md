# Session Log

## 2026-07-11 - Unified student provisioning wizard

Phạm vi: thay form tạo học viên cũ bằng wizard paid/free/trial và kết nối khôi phục an toàn theo operation ID.
Các file đã thay đổi: admin student dialog/wizard, grant/review APIs, strict request parser, command-center queue adapter/model, tests and required handoff docs.
Kết quả: một luồng tạo học viên có chống gửi trùng, kết quả tách tài khoản/đơn/quyền/email, retry hẹp và owner review cho email không rõ trạng thái; không hiển thị mật khẩu.
Kiểm tra đã chạy: focused 73/73; full Node 394/394; TypeScript, lint, Next production build và diff check đều pass.
Việc còn lại: apply hai migration pending và chạy authenticated owner preview smoke trong Task 9 trước khi bật luồng trên production.
Cảnh báo: không deploy hoặc dùng API provisioning trên production khi migrations chưa được apply và xác minh.

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
