# Hỗ trợ học viên: 1.000.000đ/buổi


## 14/09/2026 — Phí hỗ trợ học viên hiển thị theo buổi (bản cục bộ)
Anh xác nhận chỉ áp dụng hỗ trợ học viên trong ảnh. Form học viên/admin được xác minh hiện 1.000.000đ/buổi, bỏ lựa chọn thời lượng, phụ thu và số phút tại bước chọn lịch/xác nhận. Vẫn chọn ngày, giờ. Khách ngoài giữ lựa chọn và giá hiện có. Giữ khoảng chiếm lịch 30 phút và payload/API/DB/payment lịch sử; không thay đổi checkout hoặc thông báo.
Nguồn: components/support-booking/support-booking-form.tsx; kiểm tra: tests/support-booking-wizard.test.mjs. 36 support tests PASS, 1 SQL integration SKIP (không đổi SQL); 39 prebuild PASS; TypeScript và ESLint file sửa PASS. Bản dựng xem docs/SUPPORT_STUDENT_FLAT_FEE_20260914.md. Chưa phát hành, chưa giao dịch thật hoặc browser E2E.

Worktree: support-student-flat-fee-20260914; base 0f080d7. Thay đổi chỉ form và regression; không migration. Bản dựng Next.js Webpack PASS (108 routes). Cần chủ dự án xác nhận phát hành theo quy tắc workspace.
