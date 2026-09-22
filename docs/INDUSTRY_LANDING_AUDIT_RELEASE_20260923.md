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
Đã phát hành live tại https://theanhmarketing.com/academy/quang-cao-chuyen-gia . Điểm rollback trước phát hành: `dpl_8zbiLuu34gAmHL5EvoEjStm8FHa2`.

- Runtime commit: `30ac01852d897dc4ba5ba319b14a579a350753e3`.
- Preview `dpl_GKxxTPJoMUryGHLwQqbgNMm2ksNR`: Ready; log xác nhận commit30ac018, 39 prebuild tests pass, compilation/build pass.
- Preview HTTP yêu cầu đăng nhập. Auto-review từ chối `vercel curl` tự động vượt bảo vệ; không chạy lại hoặc thay cấu hình bảo vệ. Xác minh commit/log build, local IAB và live công khai thay thế; không tuyên bố preview visual pass.
- Canonical preflight ready=true sau khi push đồng bộ SHA; production promotion được user ủy quyền.
- Production `dpl_GQkUtpXmxaQscBJhq4nBZXyZb72F`, URL deployment `theanhmarketing-cucreoeha-theanhs-projects-509d0c97.vercel.app`, Ready; alias apex và www đều trỏ bản mới.
- Live route HTTP200; SHA256 HTML `7cdd82fa9e24493617ce0fc77b2150bec0628d9116fe7ac546cabe85bde7e597` khớp source. 27/27 tài nguyên industry-ads HTTP200 và byte-identical.
- Live IAB: ảnh tải đủ, không tràn ngang, logo đúng, mục lục chuyển đến báo cáo/form, bộ lọc quảng cáo07 hiện71/54.194/57.003đ, giá1.290.000đ, invoice mounted; form trống bị chặn không tạo đơn. Console không có error trong kiểm tra. Desktop1440, mobile390/320 được kiểm tra local production build; không phải thiết bị vật lý.
- Không thực hiện giao dịch, gửi email hoặc tạo quyền học viên thật trong audit.
