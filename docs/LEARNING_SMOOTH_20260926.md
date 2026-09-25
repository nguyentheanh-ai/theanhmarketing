# Khu vực học viên — PC chuyển bài và danh sách trên điện thoại

Trạng thái hiện tại: LIVE_PARTIAL_AUDIT, production READY commit2a3eb94. Các mục local bên dưới là lịch sử trước phát hành; xem cập nhật cuối và LEARNING_JOURNEY_AUDIT_20260926.md. App `theanh-main`, base `e3fe718`, nhánh `fix/learning-smooth-20260926`.

## Yêu cầu đã xác nhận

PC lag khi chuyển bài; điện thoại không hiển thị/tìm thấy danh sách bài học. Không phải yêu cầu sửa ứng dụng tài nguyên ở app.theanhmarketing.com.

## Bằng chứng và thay đổi

- LessonPage trước đây tải mọi đơn hàng, getLeads (còn tải đơn/email log), kiểm quyền tuần tự rồi đợi ghi activity. Nay dùng service có sẵn lọc email literal, paid orders và grant/revoke; Auth/course chạy song song, LMS/records chạy song song, activity chuyển sang `after`.
- Course lookup trước đây tải toàn bộ catalog và lesson resources. Nay lọc slug ở query trước khi tải bài và chỉ lấy tài nguyên thuộc các bài của khóa đó. Catalog list giữ nguyên.
- Guest không có identity và admin không tải enrollment/progress không cần thiết. RPC enrollment global của học viên vẫn còn; không đổi schema hoặc thêm cache quyền liên phiên.
- PC: pending trên link được bấm, animation 180ms ở nội dung, danh sách cột phải có cuộn và đưa bài hiện tại vào vùng nhìn thấy. Không animation transform trên khung chứa fixed controls.
- Mobile dưới 1024px: thứ tự video, lối tắt, danh sách, nội dung, tài liệu. Danh sách có vùng cuộn 42dvh; thanh dưới có Bài học/Bài trước/Bài tiếp, safe-area. Header giới hạn tiêu đề hai dòng; sidebar ẩn có inert.
- Thư viện tài liệu chỉ mount khi mở; thumbnails lazy; iframe 16:9 và playsinline. `onLoad` chỉ là iframe đã tải, không phải bằng chứng video phát thành công.
- Key course/lesson reset completion/saving/video state khi đổi bài, tránh kết quả lưu của bài cũ làm sai trạng thái bài mới.
- Error boundary có nút thử lại. Không thêm loading boundary ngoài Auth để bảo toàn redirect guest.

## Kiểm chứng

- Doctor remote PASS, canonical sạch ở thời điểm bắt đầu; feature worktree riêng.
- 43 tests backend/access/course/lesson và 41 render/landing/payment PASS = 84.
- Scoped ESLint, TypeScript và diff check PASS. Build cuối ghi tại mục kết quả bên dưới.
- Test render React có 80 bài, link mobile, bài đang học, lazy images, iframe và sidebar; đây không phải visual QA viewport hay playback trên thiết bị thật.
- Không dùng phiên khách hàng, không tạo đơn/email/quyền học, không sửa DB/Ads/landing. Supabase chỉ đọc danh sách chữ ký RPC để xác minh chưa có RPC quyền học theo identity.
- Không thực hiện Browser Agent/CUA vì workspace policy hiện chỉ có ngoại lệ cho task Pixel. Không sửa/bypass policy. Cần kiểm tra authenticated PC và mobile trên bản review/live trước khi kết luận hết lag.

## Kiểm tra tiếp khi được phát hành

Đo chuyển bài PC (lần đầu/lặp lại và bấm nhanh), xác minh hoàn thành đúng bài, mở danh sách ở 320/390/768px và playback trên điện thoại. Giữ phân biệt source/build, deployment READY và hoạt động thật. Phát hành chỉ qua canonical preflight và phạm vi được chủ dự án duyệt.

## Kết quả bản cuối

Next.js production build `next build --webpack` PASS; TypeScript PASS; 108/108 trang sinh thành công. Mã cuối không có route loading boundary mới. 84/84 tests và scoped ESLint/diff PASS. Log nằm `reports/learning-smooth-20260926/`. Chưa deploy hay xác minh phiên học viên thật.

HTTP smoke local: `/learn/facebook-ads-2026/lesson-1` trả 307 tới login với next đúng. Không env/tài khoản production trong local, kiểm tra này chỉ xác minh guest guard. Máy chủ local 127.0.0.1:4336; không phải bản có thể học bằng tài khoản thật.

## Cập nhật production 26/09

Đã phát hành2a3eb94, production dpl_E1ucTHFtVLdaR1T3VKF2bmSaNLDE READY. Anh đã cho phép ngoại lệ Browser cho audit này; không sửa policy. Đã tạo tài khoản test miễn phí theo phê duyệt và xác minh Resend delivered. PC3 mẫu trung vị2474→2202ms; mobile320/390/768 có danh sách, không tràn ngang; phát video390px được. Chưa xong E2E tài khoản thường: chờ handoff bước mật khẩu. Chi tiết và giới hạn tại LEARNING_JOURNEY_AUDIT_20260926.md.


### Cập nhật cùng ngày — đã tự kiểm thử API, không còn chờ handoff

Theo yêu cầu anh tự làm toàn bộ test:15/16checks PASS,1FAIL xác nhận live đường bài premium bỏ qua must_change_password (dashboard guard đúng). Mật khẩu tạm login→Auth API đổi→logout→mật khẩu mới login PASS, không in/lưu credentials. Test có1khóa, bài premium200, admin307, lưu bài2 hoàn thành200 và4%, reload nhận Đã hoàn thành. HTTP đầy đủ3bài học viên thường4.646/4.784/6.019giây, lưu4.324giây: còn chậm; không so trực tiếp phép đo click-to-heading admin. Đã hoàn tất audit API, chưa UI form-password/inbox thật. Lỗi guard và tối ưu query/LMS progress còn mở, chưa deploy sửa audit findings. Báo cáo/evidence tại worktrees/learning-smooth-20260926/docs/LEARNING_JOURNEY_AUDIT_20260926.md và reports/learning-smooth-20260926/test-journey-result.json.
