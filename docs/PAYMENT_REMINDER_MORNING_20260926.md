# Lịch nhắc thanh toán buổi sáng


## 26/09/2026 — Email chưa thanh toán: 08:30 sáng gần nhất

- Owner yêu cầu bỏ email lúc nửa đêm và xác nhận 08:30 sáng gần nhất, giờ Asia/Ho_Chi_Minh. Trước sửa: expiry cron 17:00 UTC = 00:00 Việt Nam; reminder 1 sau 10 phút không có time gate; GET lookup cũng gửi expiry email trực tiếp.
- Candidate giữ vòng đời hết hạn nhưng bỏ gửi email trực tiếp ở cron expiry và lookup. Queue hai lần hiện có sở hữu email tự động; pending/expired chưa trả tiền đủ điều kiện, paid/failed hoặc payment_status=paid bị hủy. Không đổi email xác nhận đăng ký ban đầu, thanh toán thành công, SePay, access, giá, landing hoặc nội dung template.
- Migration `20260925173835_payment_reminders_nearest_morning.sql`: lần 1 là 08:30 kế tiếp sau created_at; lần 2/retry là 08:30 kế tiếp sau lần gửi/thử. Time gate SQL và worker 08:30 <= giờ Việt Nam < 09:00; cron bắt đầu 08:30, chạy mỗi 5 phút đến 08:55 để thoát backlog/lỗi worker. Không gửi lại rows sent/cancelled. Không phục hồi backlog cũ.
- Giữ lease/idempotency; worker kiểm tra lại cả status và payment_status ngay trước gửi, xử lý nhiều lô nhỏ trong thời lượng route. Expiry cron đổi 01:30 UTC và chỉ đổi trạng thái.
- Local: 22 kiểm tra PostgreSQL cô lập đạt (giờ đêm, 08:29/08:30, qua ngày/năm, expired, paid, lease/dedupe, retry, backfill có giới hạn, service-only grants); tests phạm vi email/payment/landing đạt; TypeScript, scoped ESLint, Webpack build108 đạt. Full suite829/858 đạt,27 lỗi giống baseline và2 skipped; không có lỗi mới. Không gửi email thật để QA.
- Trạng thái: source/local verified, chưa áp dụng migration hoặc deploy tại thời điểm ghi mục này. Live status được cập nhật sau khi phát hành.

Nguồn lịch UTC: https://vercel.com/docs/cron-jobs . Bằng chứng local: reports/payment-reminder-morning-20260926/.

## Áp dụng database

Migration đã áp dụng production lúc17:38UTC, version20260925173835. Đọc lại helper:00:14VN→08:30cùng ngày,08:31→08:30ngày sau;00:00/09:00blocked,08:30allowed;anon không được gọi claim,service_roleđược. Đợt phát hành học viên2a3eb94 đã READY trênwww/apex; rollback ứng dụng trước email: dpl_E1ucTHFtVLdaR1T3VKF2bmSaNLDE. Chưa phát hành ứng dụng email tại mục này.
