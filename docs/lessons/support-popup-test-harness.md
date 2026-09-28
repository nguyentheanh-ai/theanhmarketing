# Kiểm thử popup trong LearningRoom — VERIFIED cục bộ

Áp dụng: repo này, tests/learning-room-render.test.mjs dùng transpileModule + custom require.
Quan sát: thêm import ./support-booking-prompt làm hai test render báo Cannot find module, trong khi TypeScript và build resolve đúng.
Nguyên nhân đã xác minh: harness chỉ transpile file cha, không tự nạp TSX con/CSS module.
Sửa: nạp component con thật bằng helper read, cung cấp CSS/constants/Link rồi truyền vào alias của cha. Kiểm thử timer/dismiss trong file hành vi riêng dùng isolated React test renderer.
Xác minh:34learning/calendar/performance và50support tests đạt, không skip. SUPPORT_UI_TEST_MODULE phải trỏ package.json của runtime React19.2.4 tách biệt; SUPPORT_SQL_TEST_MODULE trỏ PGlite.
Giới hạn: không dùng mock null để tuyên bố popup đã được kiểm; test renderer không phải visual QA. CLI migration tạo metadata ngoài workspace có thể cần sandbox escalation; lỗi Google Fonts ENOTFOUND trong sandbox chỉ xác nhận build thiếu mạng, build ngoài sandbox đạt mới đủ kết luận.


Bổ sung28/09 — VERIFIED cho lần phát hành này: RPC giá mới dùngv3, giữv2 cho app cũ tránh khoảng lệch giá trong rollout. Grantsv3 chỉservice_role; local SQL và production transaction rollback đều kiểm7lựa chọn. Bundle local build webpack có tên khác remote build, fetch URL local trên production404 không phải lỗi runtime; chỉ xác nhận popup theo tests+deployment commit khi chưa có phiên học đăng nhập. Vercel files API cũng404 ở deployment này; không suy rộng mọi phiên.
