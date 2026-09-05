# Đặt lịch hỗ trợ: giá theo đối tượng và thời lượng

Trạng thái ngày 05/09/2026: **đã hoàn tất mã nguồn và kiểm tra local; chưa cập nhật production**.

## Mức giá đã xác nhận

| Thời lượng | Học viên đã mua khóa học | Người chưa mua khóa học |
|---|---:|---:|
| 30 phút | 1.000.000đ | Không áp dụng |
| 60 phút | 1.500.000đ | 2.000.000đ |
| 90 phút | 2.000.000đ | 2.700.000đ |
| 120 phút | 2.500.000đ | 3.400.000đ |

Giới hạn lựa chọn 120 phút là giả định đã thông báo trong task, chưa có xác nhận riêng từ anh. Học viên đăng nhập bằng email đã có đơn khóa học thanh toán để nhận giá học viên. Khách chưa mua điền họ tên, email, điện thoại và đặt trực tiếp. Học viên thiếu điện thoại được bổ sung mà vẫn giữ giá học viên.

Lịch mở từ ngày thứ 3 đến ngày thứ 30, theo giờ Việt Nam; Chủ nhật nghỉ. Thời lượng phải nằm trọn trong 09:00–12:00 hoặc 13:30–20:30. Đổi thời lượng sẽ xóa ngày/giờ đã chọn để chọn lại giờ đủ dài. Thông báo vận hành nội bộ không xuất hiện trên trang khách hàng.

## Luồng và thay đổi

- Page/API đặt lịch dùng Auth tùy chọn; server xác minh đơn khóa học đã thanh toán. Giá học viên không lấy từ email nhập tay, metadata tự khai, trường bookingType/amount trong request hay quyền xem thử của admin.
- Giữ slug `support-session-30m` để tái sử dụng checkout, SePay và xử lý hỗ trợ hiện có. Duration/type được truyền từ server sang order; tổng tiền, item, tiêu đề và QR đồng nhất.
- `reserve_support_booking_v2` tính giá trong database, giữ đủ khoảng thời gian; exclusion constraint chặn cả insert chồng lịch ngoài RPC. Khóa theo ngày được lấy trước khóa dòng ở cả reserve/confirm.
- CRM hiển thị loại lịch/thời lượng; thông báo Telegram nhận thời lượng. Không phát sinh email cấp khóa học cho sản phẩm hỗ trợ. Không thay đổi sản phẩm Marketing & AI consultation 500K riêng biệt.
- Source: `app/dat-lich-ho-tro/**`, `app/api/support-bookings/route.ts`, `components/support-booking/support-booking-form.tsx`, `components/crm-v2/support-bookings-client.tsx`, `components/payment/payment-status-poller.tsx`, `lib/support-booking/**`, `services/supportBookingService.ts`, `services/orderService.ts`, `lib/notifications/telegram.ts`, migration và `tests/support-booking*.test.mjs`.

## Bằng chứng kiểm tra

- Focused support: **38/38** với SQL harness được bật, gồm render trang public/học viên, API chống tự chọn giá, học viên thiếu điện thoại, bảy mức giá order/item/QR, giữ lịch dài, đóng Chủ nhật, giờ nghỉ, hết hold và xác nhận thanh toán idempotent.
- SQL chạy trong PGlite PostgreSQL local, áp dụng migration gốc + migration giá cũ + migration mới. Lịch lịch sử 500K còn nguyên; RPC anon/authenticated không có EXECUTE; constraint trực tiếp chặn overlap; old RPC còn đặt 30 phút/1M. Các request gửi cùng lúc chỉ một thành công trong local engine; chưa phải chứng minh race đa kết nối production.
- Full suite ở bản runtime cuối: **648/652**, bốn lỗi baseline trong hai test Facebook Ads event/legacy hero/sticky. Sau đó thêm một test page public đạt trong focused suite; runtime không đổi. Các test lỗi và landing files không có diff so với base e3b0b2b.
- Required revenue-critical prebuild: **39/39**. Targeted ESLint: **0 lỗi**, một cảnh báo CRM cũ. Next Webpack production build và TypeScript: **đạt, 104/104 trang**. `git diff --check` đạt.
- Không dùng browser automation do policy workspace; kiểm tra UI bằng React server render. Không tạo đơn, giao dịch, gửi email/Telegram hoặc thay đổi database thật.

Lệnh tái kiểm tra SQL: đặt `SUPPORT_SQL_TEST_MODULE` trỏ tới PGlite đã cài riêng tại `/Users/theanh/CodexProjects/Kinh doanh/.codex-local/support-booking-sql-20260905/node_modules/@electric-sql/pglite/dist/index.js`, rồi chạy `node --test tests/support-booking*.test.mjs`. Nếu thiếu biến, test SQL chủ động skip; không được báo SQL đã chạy từ một lần test bị skip.

## Triển khai sau xác nhận

1. Có xác nhận production cho lần mở rộng này; xác nhận trước chỉ áp dụng bản lịch 3 ngày/Chủ nhật đã live.
2. Kiểm lại production không có held/confirmed overlap, rồi apply `supabase/migrations/20260905053406_support_booking_public_duration.sql` vào đúng project `vsxxgdzwtscuxcmjfckt`; đọc lại schema/grants. Không xóa hoặc đổi giá lịch cũ. Migration đã local verified, chưa apply production.
3. Tích hợp commit feature vào canonical sạch `/Users/theanh/CodexProjects/TheAnh-Web/worktrees/theanhmarketing-email-account-hotfix`, doctor/check remote, push và preflight exact root theo registry. Feature root không có quyền deploy.
4. Git-integrated build/promote production bằng guard. Không dùng `vercel --prod` trực tiếp. Preview thiếu service-role credential là giới hạn đã biết; không sao chép credential hoặc mở RLS.
5. Xác minh READY, domain, page public 200, giá, availability, Sundays, protected landing checks và runtime errors. Chỉ tạo giao dịch kiểm thử thật nếu anh yêu cầu.

Rollback: quay về runtime trước e3b0b2b/168abe2 bằng release guard; giữ migration cộng thêm. Old RPC wrapper hỗ trợ 30 phút/1M và exclusion constraint vẫn bảo vệ các booking dài đã tạo. Giao diện cũ chỉ đánh dấu giờ bắt đầu, nên nếu đã phát sinh booking dài, rollback cần readback cẩn thận và khôi phục bản mới sớm; RPC vẫn từ chối overlap. Không drop cột hay xóa lịch mới để rollback.
