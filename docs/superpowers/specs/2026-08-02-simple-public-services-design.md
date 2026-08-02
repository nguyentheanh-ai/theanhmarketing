# Thiết kế website public tối giản và dịch vụ Marketing & AI

Ngày: 2026-08-02  
App: `main-site` (`theanhmarketing.com`)  
Trạng thái: Đã được owner duyệt hướng thiết kế

## Mục tiêu

Giữ nguyên trang chủ local hiện tại đã được duyệt. Tinh gọn các bề mặt public còn lại để khách hiểu ngay The Anh Marketing cung cấp khóa học, tài liệu, workshop và ba dịch vụ đào tạo Marketing & AI. Loại bỏ ngôn ngữ và trang giới thiệu “Growth System/Hệ thống” không cần thiết khỏi hành trình public.

Không thay đổi Supabase schema, Auth, LMS, quyền học, tiến độ, admin CRM, email hay cơ chế SePay hiện hữu.

## Điều hướng public

Header public gồm:

1. Trang chủ — `/`
2. Dịch vụ — `/dich-vu`
3. Khóa học — `/khoa-hoc`
4. Tài liệu — `/tai-lieu`
5. Workshop — `/workshop`
6. Đăng ký — `/dang-ky`
7. Đăng nhập — `/dang-nhap`

Footer chỉ nhắc lại các đích public trên và thông tin thương hiệu/liên hệ cần thiết. Không còn link tới Hệ thống, Blog, Đối tác, Giới thiệu, Liên hệ hoặc Học viên public cũ.

Các trang public cũ `/he-sinh-thai`, `/gioi-thieu`, `/doi-tac`, `/lien-he`, `/blog`, `/blog/[slug]`, `/hoc-vien` và `/ky-nang` bị xóa khỏi App Router và trả về 404 khi truy cập trực tiếp. Các route kỹ thuật phục vụ thanh toán, email bridge, LMS, dashboard học viên và admin vẫn giữ nguyên nhưng không xuất hiện trong navigation public.

## Trạng thái navigation khi đã đăng nhập

Header phải phản ánh session hiện tại:

- Khách chưa đăng nhập thấy `Đăng ký` và `Đăng nhập`.
- Khách đã đăng nhập thấy `Khóa học của tôi` dẫn tới `/dashboard` và `Tài khoản` dẫn tới `/tai-khoan`.
- Mobile menu dùng cùng trạng thái và cùng hai đích; không hiển thị CTA guest sau khi session đã xác nhận.
- Đăng xuất nằm trong trang Tài khoản để header không bị quá nhiều nút.

Trang `/tai-khoan` là route được bảo vệ, gồm:

- Họ tên hiện tại.
- Email tài khoản hiện tại và trạng thái chờ xác minh nếu khách yêu cầu đổi email.
- Số điện thoại hiện tại.
- Danh sách khóa học đã đăng ký, dùng cùng nguồn quyền học thật với `/dashboard`.
- Form cập nhật họ tên và số điện thoại.
- Form yêu cầu đổi email qua Supabase Auth; email mới chỉ trở thành email đăng nhập sau bước xác minh của nhà cung cấp, không được tự ý sửa order lịch sử.
- CTA đổi mật khẩu dùng lại flow Supabase Auth hiện hữu và quay về `/tai-khoan` sau khi hoàn tất.
- Nút đăng xuất.

Mọi cập nhật profile phải yêu cầu session hợp lệ, chuẩn hóa dữ liệu, ghi activity an toàn và không làm mất `user_id`, quyền khóa học hoặc lịch sử đơn hàng. Không đưa email/số điện thoại vào query string.

## Trang Dịch vụ

Trang `/dich-vu` dùng visual sáng/xanh, font tròn, card và motion đã được owner duyệt. Nội dung chỉ tập trung vào ba dịch vụ, tất cả đều về Marketing và AI:

1. Học Offline 1 kèm 1 tại TP.HCM.
2. Training doanh nghiệp Online/Offline.
3. Khóa học chuyên sâu 1 kèm 1.

Mỗi card có mô tả ngắn theo nhu cầu khách, hình thức triển khai và một CTA `Đăng ký tư vấn`. Không dùng sơ đồ hệ thống, dashboard mockup, engine map hoặc thuật ngữ nội bộ.

CTA mang lựa chọn dịch vụ sang form public `/dang-ky-tu-van?service=<service-id>`.

## Luồng đăng ký tư vấn và phí 500.000đ

Khách không chọn ngày hoặc giờ. Form thu thập tối thiểu:

- Dịch vụ đã chọn.
- Họ tên.
- Số điện thoại.
- Email.
- Nhu cầu/vấn đề cần tư vấn.

Trước khi gửi, giao diện hiển thị rõ chính sách:

> 500.000đ là phí giữ yêu cầu tư vấn. Nếu khách đăng ký dịch vụ sau tư vấn, khoản này được trừ vào học phí/phí training. Nếu khách không đăng ký tiếp, phí tư vấn không hoàn lại.

Khi form hợp lệ, server tạo một đơn 500.000đ bằng order/SePay contract hiện hữu với một product identity riêng cho `marketing-ai-consultation`. Không tạo lịch hẹn và không dùng bảng/flow support booking dành cho học viên trả phí.

Khách được chuyển tới `/thanh-toan/[code]`. Chỉ sau khi SePay xác nhận thanh toán thành công, hệ thống mới đánh dấu yêu cầu đủ điều kiện để The Anh liên hệ. Thông báo owner và email xác nhận khách phải nói rõ The Anh sẽ chủ động liên hệ sắp lịch; không tự hứa ngày/giờ.

Không tạo tài khoản học viên hoặc cấp course entitlement cho sản phẩm tư vấn này.

## Danh mục khóa học và landing page

Trang `/khoa-hoc` tiếp tục hiển thị đủ 10 card nhưng chỉ bốn sản phẩm được mở bán:

| Sản phẩm | Landing page |
|---|---|
| Quảng cáo Facebook Master 2026 | `/academy/facebook-ads-master-2026` |
| Thư viện kiến thức Facebook Ads 2026 | `/academy/ebook-facebook-ads-2026-premium` |
| AI Master X10 hiệu suất | `/academy/ai-master-x10-hieu-suat` |
| Bộ Agent Kit X10 hiệu suất công việc | `/academy/bo-kit-agent-doanh-nghiep` |

Sáu khóa còn lại giữ card và giá đã duyệt nhưng có trạng thái `Sắp ra mắt`. Card không điều hướng tới trang bán hàng chung, không có Add to Cart và không thể tạo đơn.

Mọi entry point dùng chung course data (homepage card nếu xuất hiện, catalog, related course card) phải tôn trọng cùng `landingPageUrl/status` để không có đường vòng mở generic course sales page.

## Trang chủ, Tài liệu và Workshop

- Trang chủ giữ nguyên cấu trúc, visual và hiệu ứng hiện tại theo chỉ đạo mới nhất của owner. Chỉ cập nhật link/navigation bắt buộc để không trỏ vào route bị xóa và để course card tôn trọng trạng thái mới.
- `/tai-lieu` và `/workshop` giữ nội dung thật hiện có; chỉ tinh gọn link/footer nếu còn trỏ tới các route bị xóa.
- Không đổi offer, tracking hoặc payment logic riêng của các landing page khóa học đang hoạt động.

## Trạng thái lỗi và an toàn

- Dịch vụ không hợp lệ trong query/form bị từ chối trước khi tạo đơn.
- Form thiếu hoặc sai dữ liệu trả lỗi rõ ràng, không tạo lead/order một phần.
- Thanh toán chưa thành công không gửi tín hiệu “đã đặt tư vấn” cho owner.
- Payment webhook lặp lại phải idempotent, không gửi thông báo/email trùng.
- Sáu khóa sắp ra mắt phải bất hoạt cả link, nút và đường tạo đơn từ catalog.
- Route public bị xóa trả 404; không redirect âm thầm.

## Kiểm thử chấp nhận

1. Header/footer desktop và mobile chỉ còn các mục public đã duyệt.
2. `/dich-vu` hiển thị đúng ba dịch vụ và không có ngôn ngữ Growth System cũ.
3. Form tư vấn không có bộ chọn lịch; policy 500.000đ hiển thị trước CTA.
4. Đơn tư vấn tạo đúng 500.000đ, đi tới checkout thật và không cấp quyền học.
5. Bốn khóa mở đúng bốn landing page trong bảng; sáu khóa hiện `Sắp ra mắt` và không click/checkout được.
6. Các route public cũ trả 404.
7. Guest header hiện Đăng ký/Đăng nhập; authenticated header hiện Khóa học của tôi/Tài khoản trên desktop và mobile.
8. `/tai-khoan` chặn guest, hiển thị đúng profile và khóa đã đăng ký; đổi tên/SĐT, yêu cầu đổi email và đổi mật khẩu không làm mất quyền học.
9. Trang chủ giữ nguyên visual/section hiện tại ngoài link bắt buộc.
10. Desktop/mobile không tràn ngang, không lỗi ảnh hoặc console.
11. Focused tests, full Node tests, TypeScript, ESLint, production build và `git diff --check` đạt.
12. Chỉ chạy local; không deploy Vercel hoặc sửa Supabase production trước khi owner duyệt bản local.

## Ngoài phạm vi

- Không dựng landing page riêng cho sáu khóa sắp ra mắt.
- Không cho khách tự chọn lịch.
- Không thay đổi giá bốn sản phẩm đang mở.
- Không xóa route backend, admin, LMS, checkout, email bridge hoặc dashboard cần cho vận hành.
- Không deploy trong giai đoạn này.
