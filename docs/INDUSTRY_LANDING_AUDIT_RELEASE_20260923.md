# Audit và phát hành landing chuyên gia — 23/09/2026

## Phạm vi
- Route `/academy/quang-cao-chuyen-gia`; giao diện đen, trắng, cam; báo cáo, kế hoạch, phản hồi, mục lục, thanh đăng ký và form.
- Gói `industry-expert-1290`, giá máy chủ 1.290.000đ, cấp quyền khóa Facebook Ads hiện có qua luồng order/payment/email hiện tại.
- Báo cáo tháng 9: 921 lượt mua, giá trị 735 triệu theo xác nhận của chủ dự án. Hai cột giá trị trong ảnh đã che. Tháng 8 là bộ dữ liệu riêng.

## Chỉnh trong audit
- Đối chiếu ảnh gốc: quảng cáo 07 có 54.194 lượt hiển thị; sửa giá trị nhập nhầm 54.494.
- Bỏ noindex của bản nháp, thêm canonical và Open Graph cho trang phát hành.

## Kiểm tra
- TypeScript không lỗi; ESLint các file runtime thay đổi và test landing không lỗi.
- 49/49 test release Facebook Ads, giao diện thanh toán và landing chuyên gia đạt.
- Build Next.js webpack production đạt.
- Full suite: feature 822 pass / 27 fail / 2 skip; canonical baseline 812 pass / 27 fail / 2 skip. Tập tên lỗi giống nhau; không có lỗi mới. Các lỗi cũ ở kiểm tra giao diện/admin/calendar/browser harness, ngoài phạm vi landing.
- ESLint toàn repo có lỗi cũ và mã vendor; dùng scoped lint cho diff. Không tuyên bố toàn repo sạch.
- Kiểm tra IAB máy tính/điện thoại: không tràn ngang, ảnh tải được, mục lục điều hướng, form bắt buộc và hóa đơn hoạt động. Không tạo đơn hoặc thanh toán thật trong audit.

## Phát hành
Đang chuẩn bị bản preview; chưa xác nhận live. Điểm rollback trước phát hành: `dpl_8zbiLuu34gAmHL5EvoEjStm8FHa2`.
