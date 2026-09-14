# Hỗ trợ học viên: 1.000.000đ/buổi


## 14/09/2026 — Phí hỗ trợ học viên hiển thị theo buổi (bản cục bộ)
Anh xác nhận chỉ áp dụng hỗ trợ học viên trong ảnh. Form học viên/admin được xác minh hiện 1.000.000đ/buổi, bỏ lựa chọn thời lượng, phụ thu và số phút tại bước chọn lịch/xác nhận. Vẫn chọn ngày, giờ. Khách ngoài giữ lựa chọn và giá hiện có. Giữ khoảng chiếm lịch 30 phút và payload/API/DB/payment lịch sử; không thay đổi checkout hoặc thông báo.
Nguồn: components/support-booking/support-booking-form.tsx; kiểm tra: tests/support-booking-wizard.test.mjs. 36 support tests PASS, 1 SQL integration SKIP (không đổi SQL); 39 prebuild PASS; TypeScript và ESLint file sửa PASS. Bản dựng xem docs/SUPPORT_STUDENT_FLAT_FEE_20260914.md. Chưa phát hành, chưa giao dịch thật hoặc browser E2E.

Worktree: support-student-flat-fee-20260914; base 0f080d7. Thay đổi chỉ form và regression; không migration. Bản dựng Next.js Webpack PASS (108 routes). Cần chủ dự án xác nhận phát hành theo quy tắc workspace.


## 14/09/2026 — Hỗ trợ học viên 1 triệu/buổi ĐÃ PHÁT HÀNH
Anh duyệt “làm luôn đi em”. Runtime bb644657ad3b931aca86363fcda86b35028c9a28; production dpl_87mb1PmLv9upzrHUY7pjB48yAdFx READY, www/apex trỏ đúng. Form học viên hiện 1.000.000đ/buổi, bỏ lựa chọn thời lượng/phụ thu và số phút ở bước xác nhận. Khách ngoài, khoảng giữ chỗ 30 phút, API/DB/checkout không đổi.
36 support tests PASS (1 SQL integration SKIP, không sửa SQL), 39 prebuild PASS, TypeScript/lint và local build108 PASS; preview/production builds PASS. Live www/apex HTTP200 và bundle có nội dung mới, login/success/availability200; 3 ngày báo trước và 4 Chủ nhật đóng. 7 landing HTTP200, 5 static hashes giữ nguyên; hai trang động có hash HTML khác theo bản dựng, source không đổi. Runtime error/fatal scan bản mới không có kết quả lúc04:37UTC. Không browser đăng nhập E2E, đơn thử, thanh toán hoặc gửi email thật.
Rollback ứng dụng: dpl_EY8qiZ7XfUC8bDpFYXebztUJWGFf. Bằng chứng workspace: reports/support-student-flat-fee-20260914/. Trạng thái DONE, thay thế các ghi chú chờ phát hành phía trên.
