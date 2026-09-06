# Admin consolidation — scoped verification

Áp dụng: main-site admin, Next16.2.6/Supabase, phiên06/09/2026.

VERIFIED: regex UUID cũ thiếu nhóm thứ tư khiến ID chuẩn bị xử lý như slug. Validator chung + test gọi service thật sửa được. Lỗi reorder DB trước đây bị bỏ qua; RPC transaction trả lỗi thật và rollback đã chạy trên PostgreSQL/PGlite.

VERIFIED: source tests giữ layout cũ có thể đạt dù hành vi sai; thay assertion UI lỗi thời sau khi đối chiếu route hiện hành, giữ payment/email/student contracts và thêm hành vi lỗi DB/mạng. Bốn lỗi Facebook Ads đã có trên baseline không phải lỗi admin.

VERIFIED: local next start thiếu AUTH_GUARD_ENABLED/VERCEL_ENV không mô phỏng production. Khi đặt đúng cờ, route chức năng yêu cầu login, /admin là redirect hai bước. Kiểm tra Location và next query; HTTP200 có thể chứa error boundary, không chứng minh đọc dữ liệu thành công.

Cleanup source: guard chỉ cho generated leaves, source deletion bị chặn. Không áp dụng workaround policy; route retirement và source deletion là hai trạng thái riêng. Chưa có production login/send proof; không suy rộng test cục bộ thành dữ liệu thật an toàn tuyệt đối.
