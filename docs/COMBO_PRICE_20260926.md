# Ưu đãi combo khóa học + Ebook


## 26/09/2026 — Combo khóa học + Ebook 1.098.000đ (LOCAL VERIFIED)

Anh duyệt cả hai landing: giá gốc hiển thị 1.400.000đ, giá combo 1.098.000đ, thông điệp giảm 20% làm tròn theo chỉ định (không phải công thức tính tiền). Worktree `worktrees/combo-price-20260926`, branch `fix/combo-price-20260926`, base954e7a4. Hai cặp HTML ladipage/academy Facebook Ads Master và Ebook Premium đã đồng bộ. Trang khóa học chuyển lựa chọn combo từ zoom-kit-ebook-20 sang gói có sẵn zoom-kit-ebook-299 (1.098.000đ); Ebook giữ full-access-399-course-699. Không đổi backend, giá mua lẻ, dữ liệu/đơn cũ, email, quyền học hay tracking.

64/64 tests landing/combo/payment đạt; ESLint3file test, diff check, cú pháp inline JS và equality hai cặp đạt. VM kiểm tra checkbox khóa799K↔1.098M, Ebook399K↔1.098M; server package khóa xác nhận tổng và đủ2sản phẩm. Không tạo đơn/email/thanh toán thật. Chưa full build, browser visual QA hoặc deploy. Bước tiếp: phát hành qua canonical guard khi anh yêu cầu.

Context: registry/control/policy/ACTIVE_TASKS; AI_CONTEXT_INDEX/SESSION_STATE/FEATURE_REGISTRY/ROLE_AND_SESSION_PROTOCOL/SESSION_START_CHECKLIST/PAYMENT-FLOW; repo AGENTS/CURRENT_STATE/FEATURE_MAP/WEBSITE_DEEP_STRUCTURE_HANDOFF/DESIGN_RULES/SEPAY_SETUP; service và tests hiện tại. Chi tiết `worktrees/combo-price-20260926/docs/COMBO_PRICE_20260926.md`.

Kiểm tra: node --test tests/facebook-ads-combo-evergreen.test.mjs tests/facebook-ads-landing.test.mjs tests/ebook-facebook-ads-landing.test.mjs tests/payment-page-reference-ui.test.mjs. Dùng Node bundled của Codex vì node không có trong PATH. Doctor remote đã PASS sau khi cấp quyền mạng; không đổi guard.
