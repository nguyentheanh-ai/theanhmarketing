# Supabase và website — 12/09/2026

Phạm vi được anh yêu cầu: sửa các lỗi đã xác minh trong đợt kiểm tra Supabase và website. Source b4d25e6, worktree feature supabase-health-20260912; không thay landing, giá, checkout, SePay hoặc tracking.

## Đã áp dụng database

- Migration main 20260912030800: bỏ policy demo đọc/ghi đơn hàng, ghi khóa/chương và quyền quản lý quá rộng của authenticated; các bảng quản trị phụ dùng helper admin thay cho true. Helper nhận app_metadata owner/editor đã cấp từ máy chủ và danh sách admin cũ. Không dùng user_metadata. Giữ public catalog, admin/editor và service-role checkout.
- Khóa search_path năm hàm main, thu hồi RPC execute công khai của ba trigger. Trigger vẫn chạy từ thao tác database.
- Kiểm tra PostgreSQL có rollback: anon/student không thấy orders; user_metadata giả role bị từ chối; owner/editor hợp lệ; không còn policy ghi true trên các bảng đã sửa. Fingerprint orders/courses/lessons trước và sau migration không đổi.
- App học viên: migration 20260912031023 đặt search_path rỗng cho set_updated_at. RPC chỉnh khóa học đã có guard nội bộ; phép thử student import/update bị từ chối, giữ quyền gọi của admin.

## Source ứng viên

- Auth server dùng React cache trong một render request; proxy refresh cookie trước khi render và trả cookie mới về trình duyệt. Bỏ prefetch các link bài học để tránh tạo nhiều lượt refresh ngầm. getUser và kiểm tra admin/entitlement giữ nguyên, không cache user xuyên request.
- Admin client thiếu service key trả null thay vì tự hạ xuống anon. Upstream Supabase được giới hạn 15 giây, worker 8 giây/request; gửi Resend 10 giây. Worker claim tối đa 3 thay vì 10, budget 180 giây, giữ lịch 5 phút và per-run idempotency. Log chỉ thêm mã lỗi đã lọc, không raw payload.
- Ebook dùng cùng resolver quyền học nhưng đọc evidence đúng email đã xác thực, giữ bundle, grant/revoke và quy tắc deposit. Không tải toàn bộ CRM/email log mỗi ảnh. Lỗi upstream trả 503, ảnh thực sự không tồn tại vẫn 404.

## Kiểm chứng ứng viên

- 68 kiểm tra liên quan ban đầu đạt; thêm test quyền Ebook dùng resolver thật đạt; 5 test hành vi mới đạt.
- TypeScript và Webpack production build 108/108 đạt. Lint file thay đổi đạt sau dọn warning test.
- So sánh suite *.test.mjs: baseline 736 pass/19 fail/2 skip, candidate lúc có 4 test mới 740 pass/19 fail/2 skip. Không có tên lỗi mới. Lỗi baseline gồm thiếu runtime test riêng và assertion giao diện cũ, không phải bằng chứng lỗi live. Test thứ năm mới đã chạy riêng và đạt.
- Chưa tạo đơn hoặc gửi email thử. Worker production cũ có lỗi gián đoạn; SQL RPC trong transaction rollback chạy được. Log 10:05/10:10 thành công sau lỗi 10:00 không chứng minh nguyên nhân đã hết. Cần kiểm tra cron trên bản mới sau phát hành.

## Giới hạn và cảnh báo giữ có chủ đích

- Supabase Free không hỗ trợ leaked password protection; tính năng cần Pro. Chưa đổi gói hoặc phát sinh phí.
- RLS enabled/no policy trên bảng chỉ dùng service-role là deny-by-default. Helper admin đọc boolean và RPC course editor đã xác thực quyền không phải lỗ hổng chỉ vì advisor báo SECURITY DEFINER. Không thu hồi máy móc gây hỏng chức năng.
- Các khuyến nghị chỉ mục/policy hiệu năng chưa phải lỗi vận hành đã tái hiện; không xóa index chưa dùng hoặc gộp policy khác chức năng chỉ để giảm số cảnh báo.
- Đọc HTTP/chunk không thay thế đăng nhập học viên, thao tác UI hoặc thanh toán/email thật.
