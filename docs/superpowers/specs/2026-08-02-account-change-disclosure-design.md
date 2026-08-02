# Thiết kế khối đổi thông tin tài khoản

## Mục tiêu

Trang `/tai-khoan` không hiển thị sẵn biểu mẫu đổi email và mật khẩu. Hai thao tác bảo mật được gom vào một khối duy nhất mang tên `Đổi thông tin tài khoản`, giúp học viên chỉ thấy biểu mẫu khi chủ động chọn thao tác.

## Giao diện đã duyệt

- Khối thông tin cá nhân vẫn hiển thị trực tiếp để sửa họ tên và số điện thoại.
- Bên dưới là một card `Đổi thông tin tài khoản` với hai lựa chọn: `Đổi email` và `Đổi mật khẩu`.
- Mặc định không có biểu mẫu bảo mật nào mở.
- Bấm một lựa chọn sẽ mở đúng biểu mẫu đó ngay trong card; mỗi thời điểm chỉ có một biểu mẫu mở.
- Có nút đóng/quay lại để trở về hai lựa chọn ban đầu.
- Đổi email hiển thị email hiện tại và trường email mới. Supabase vẫn gửi xác nhận tới email mới theo flow hiện có.
- Đổi mật khẩu hiển thị `Mật khẩu hiện tại`, `Mật khẩu mới` và `Nhập lại mật khẩu mới`.

## Luồng bảo mật

- Trước khi đổi mật khẩu, client gọi Supabase `signInWithPassword` bằng email của phiên hiện tại và mật khẩu hiện tại.
- Chỉ khi xác thực thành công mới gọi `updateUser` để đặt mật khẩu mới và cập nhật metadata đổi mật khẩu hiện có.
- Sai mật khẩu hiện tại trả thông báo tiếng Việt rõ ràng và không gọi cập nhật mật khẩu.
- Mật khẩu mới phải có ít nhất 8 ký tự, khớp xác nhận và khác mật khẩu hiện tại.
- Không ghi mật khẩu vào activity log, tài liệu, URL hoặc console.
- Route phục hồi bắt buộc `/doi-mat-khau` không thay đổi.

## Phạm vi và kiểm thử

- Chỉ sửa component tài khoản và regression test liên quan; không đổi schema, entitlement, order, payment, email template hoặc booking.
- Test khóa trạng thái mặc định đóng, hai nút lựa chọn, ba trường đổi mật khẩu, xác thực mật khẩu hiện tại trước `updateUser`, và thông báo lỗi an toàn.
- QA local trên desktop/mobile, không gửi biểu mẫu thật.
- Giữ local chờ chủ dự án duyệt trước khi deploy.
