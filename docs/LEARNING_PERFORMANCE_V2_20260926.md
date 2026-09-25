# Khu học viên — kết quả tối ưu và audit 26/09/2026

Đã LIVE trên https://www.theanhmarketing.com . Runtime9167035ec3db52f9e6b34b180e6283ae840a15c2; productiondpl_4DWcFdmr5t4pUf4carLoku6pwHjs READY, www/apex cùng bản. Exact-root/remote preflight đạt. Migration20260925180425 đã áp dụng.

## Nguyên nhân và xử lý

- Truy vấn enrollment/progress quá rộng, lưu tiến độ tải toàn bộ LMS. Đã lọc đúng Auth identity/khóa; chỉ lấy dữ liệu cần thiết, ghi nhật ký sau response. RPC SECURITY INVOKER chỉ service_role gọi, giữ kiểm tra quyền/hạn học.
- Node functions ở Mỹ, database ở Sydney. preferredRegion trong source bị builder Node bỏ qua. Dùng functions.regions riêng khu học viên trong vercel.json; header live xác nhận syd1, admin vẫn iad1,8cron nguyên. [Tài liệu Vercel](https://vercel.com/docs/functions/configuring-functions/region#per-function-configuration).
- Bỏ props course/lesson trùng: HTML bài khoảng105KB xuống82KB, không gồm video YouTube.
- Tải trước bài liền kề/khi trỏ chuột; pending/spinner, phản hồi nhấn140ms, xuất hiện nội dung180ms, thành công220ms, reduced-motion. Sau lưu làm mới cache để không hiện tiến độ cũ.
- Mobile hiện23bài dưới video, thanh Bài học/Bài trước/Bài tiếp; tài liệu mount khi mở.

## Số đo production

Cùng tài khoản thử, cùng3bài,2lượt mỗi bài. HTTP là toàn bộ response, chưa gồm YouTube tải video. Mẫu nhỏ cùng phiên, không phải cam kết cho mọi mạng.

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Trung vị tải bài,6mẫu |2435,5ms|778ms, giảm68,1%|
| Khoảng thời gian6mẫu |1704–6118ms|690–1055ms|
| Lưu tiến độ,1mẫu |4576ms|1057ms|
| Dashboard,1mẫu |7574ms|627ms|

PC1440x900: click→heading92/1008/63/128ms, gồm bài đã tải trước/cache và lượt cần dữ liệu. Không so trực tiếp với HTTP hoặc phép đo admin v1. Trình phát bài4 hiển thị đúng, console không error trong kiểm tra.

## Audit hành trình học

- Email cấp quyền được provider báo delivered; chưa xác minh inbox/mở thư.
- Mật khẩu tạm→Auth API đổi mật khẩu→đăng nhập lại đạt. Không lưu/in credentials.18/18checks trên453061a đạt, first-password lesson307 và progress403 đúng.
- Browser recovery confirm mở đúng trang Đặt lại mật khẩu và phiên test; không nhập/gửi mật khẩu mới bằng browser.
- Dashboard đúng1khóa/23bài; premium vào được, admin từ chối.
- Browser lưu bài3, tiến độ9%; chuyển bài trước/quay lại vẫn Đã hoàn thành. Reload/API giữ đúng.
- Mobile giả lập320/390/768 đủ23bài, không tràn ngang, chọn bài được; video390px phát với phụ đề tiến triển. Chưa điện thoại vật lý.

## Xác minh

209tests phạm vi,TS,scoped ESLint,local build108routes,SQL isolation/expiry/legacy/grants đạt. Cấu hình cuối4patterns match/8cron unchanged; preview/production builds READY.13/13post-region livechecks đạt, count23 đúng, headersyd1. Không error/fatal trong cửa sổ18:13–18:23UTC. Ba landingSHA nguyên;9routes smoke đúng. Giữ checkout/giá/quyền khách thật/email nhắc08:30.

Evidence: reports/learning-smooth-20260926/{student-before-v2,student-after-code-v2,student-after-region-v2,final-v2,browser-v2,live-before-v2,live-after-region}.json.
Báo cáo này thay thế trạng thái chờ audit/chưa deploy trước đó.
Rollback trước toàn bộv2:dpl_6tW11JwXvH7u5pcqdji7Gn5eGcuX; không tự rollback migration.
