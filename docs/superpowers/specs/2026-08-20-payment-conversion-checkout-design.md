# Payment conversion checkout design

Date: 2026-08-20
App: `main-site`
Route: `/thanh-toan/[code]`

## Goal

Rút ngắn checkout để khách thấy QR và thông tin chuyển khoản ngay, đồng thời tăng độ tin cậy bằng phản hồi Zalo thật và đường hỗ trợ trực tiếp.

## Product-specific message

- Ebook Facebook Ads: `Thanh toán để đọc Ebook ngay`; `Hệ thống gửi Ebook tự động sau 5 giây thanh toán.`; `Hơn 400 Ebook đã bán trong tháng này.`
- Khóa Facebook Ads: `Thanh toán để vào khóa học ngay`; `Hệ thống gửi tài khoản học tập ngay sau 5 giây thanh toán.`; `Hơn 1.000 anh/chị học viên đang học.`
- Bundle Ebook + khóa học dùng thông điệp khóa học và nói rõ khách nhận cả tài khoản học tập lẫn Ebook.
- Các sản phẩm khác giữ thông điệp checkout hiện có, không nhận số liệu Ebook/khóa Facebook Ads.

## Layout

1. Ghim notice xanh trên cùng: `Lưu ý: Thế Anh không gọi điện cho bạn để thúc bạn thanh toán, mình chỉ nhắn tin để hỗ trợ học viên sau khi đăng ký học thành công. Nếu bạn cần học nghiêm túc - Hãy đăng ký luôn ở trang này.`
2. Hiển thị tiêu đề và social proof đúng sản phẩm.
3. Đưa QR lên ngay, kế bên/dưới là toàn bộ trường Copy: ngân hàng, số tài khoản, chủ tài khoản, số tiền và nội dung chuyển khoản.
4. Bỏ countdown giữ giá, ba bước chuyển khoản, trạng thái chờ và bốn bước sau thanh toán khỏi giao diện Facebook Ads/Ebook.
5. Thêm carousel dùng đúng 12 ảnh trong `public/ladipage/assets/zalo-support`, chạy liên tục như landing Facebook Ads, dừng khi hover/focus và tắt chuyển động khi người dùng chọn reduced motion.
6. Thêm CTA Zalo tới số `0367 928 921`; không thay đổi QR, order polling, SePay, email, account provisioning hoặc paid redirect.

## Safety and verification

- Giữ copy actions, QR và transfer values lấy từ order/server.
- Không tạo order, thanh toán, email hoặc entitlement trong QA.
- Regression bao phủ nội dung theo loại sản phẩm, thứ tự QR/copy, removal các block cũ, 12 asset Zalo, reduced motion và Zalo CTA.
- Browser QA ở 390px và desktop: không overflow, QR dễ thấy, copy rows đọc được, carousel không che CTA.
