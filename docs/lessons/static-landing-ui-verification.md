# Kiểm tra giao diện landing tĩnh sau thiết kế lại

Áp dụng: landing HTML/CSS có CTA cố định, form dài và bộ test dựa trên chuỗi CSS.

Quan sát VERIFIED: ở viewport 320/390, CTA cố định che trường form. Test cũ vẫn ép radius/tọa độ/nội dung ẩn của thiết kế trước, mặc dù yêu cầu mới là thiết kế lại toàn bộ.

Sửa: quan sát giao nhau của hero/form để ẩn CTA; ẩn menu khi form xuất hiện. Giữ kiểm tra hợp đồng nghiệp vụ; thay kiểm tra cấu trúc lỗi thời bằng xác minh điều hướng và browser. Khai báo kích thước ảnh gốc, tránh layout phụ thuộc lúc ảnh lazy load.

Xác minh: Codex IAB desktop1440/mobile320,390; form/checkbox hóa đơn, giá mua kèm, điều hướng, ảnh lớn hoạt động; kiểm tra hợp đồng đạt. Giới hạn: không chứng minh checkout thật hoặc event đã nhận ở nền tảng quảng cáo.

Quan sát CANDIDATE: scroll smooth trong IAB chưa ổn định ở thời điểm đọc vị trí; dùng anchor tức thì, đọc lại target top≈28px. Chưa quy nguyên nhân cho browser hay CSS nói chung; không áp dụng thành quy tắc cấm smooth toàn hệ thống.
