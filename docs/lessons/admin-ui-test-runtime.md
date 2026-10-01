# Runtime kiểm thử admin UI — VERIFIED cục bộ

Áp dụng: tests admin-customer-workspace/admin-ui-polish dùng SUPPORT_UI_TEST_MODULE với createRequire.
Quan sát: harness thiếu biến báo isolated React runtime required; runtime chỉ có React/renderer chạy được tương tác nhưng CSS tests báo thiếu htmlparser2/postcss.
Nguyên nhân đã xác minh: dependency của test harness, không phải regression component. Shell phiên này cũng không có node trên PATH.
Sửa: dùng Node bundled runtime; runtime tạm riêng có React19.2.4, react-test-renderer19.2.4, postcss8.5.26, htmlparser2 10.1.0, css-select6; trỏ SUPPORT_UI_TEST_MODULE tới package.json của nó. Không thêm dependency website hoặc sửa assertions.
Xác minh:72/72tests liên quan dashboard, CRM, quyền và landing đạt 01/10/2026.
Giới hạn: không thay thế browser/authenticated QA; thư mục tmp có thể mất, kiểm tra dependency trước khi tái dùng. Build font thất bại ENOTFOUND trong sandbox được xác minh bằng build có mạng thành công, không quy thành lỗi mã nguồn.


01/10 — HTTP release check: assertion bắt mọi apex landing là200 đã sai; snapshot trước/sau đều307 cùng Location sang www. Đã sửa kiểm chứng: so riêng status/location của redirect, chỉ so hash nội dung cho7HTML www200. VERIFIED cho release này; không coi hash body307 là hash landing, không kết luận host redirect là regression nếu baseline giống.
