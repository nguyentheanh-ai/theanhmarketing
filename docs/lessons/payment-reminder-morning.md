# Email nhắc thanh toán buổi sáng — VERIFIED LIVE, 26/09/2026

Áp dụng: theanh-main, queue hai lần được bật 28/08/2026; email chưa thanh toán/hết hạn gửi ban đêm.
Bằng chứng: expiry cron 0 17 UTC, reminder1 created_at+10m không time gate; GET lookup gọi sendPaymentFailedEmail.
Nguyên nhân: ba điểm gửi độc lập, không phải chỉ lỗi chuyển múi giờ.
Sửa: queue hiện hữu là đường gửi tự động duy nhất; 08:30 sáng Việt Nam gần nhất, worker/SQL đều gate, expired unpaid vẫn đủ điều kiện và paid/failed bị hủy; giữ email xác nhận ban đầu/thành công.
Xác minh:89 tests phạm vi,22 assertions SQL cô lập,TypeScript/lint/build đạt; full27 lỗi trùng baseline. Chưa dùng local evidence để khẳng định live.
Giới hạn: không phục hồi rows đã cancelled/sent; không gửi giao dịch/email thật để QA. Morning drain08:30–08:55, đóng09:00 để chống gửi đêm.

Production đã xác minh ngày 26/09: migration20260925173835, cron đọc lại đúng08:30, claim ban đêm rỗng, bản ứng dụng READY. Chưa quan sát lượt gửi tự nhiên buổi sáng.
