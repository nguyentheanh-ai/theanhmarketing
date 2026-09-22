# Landing Ebook — audit và thiết kế lại 23/09/2026

Trạng thái: LOCAL_REVIEW, chưa phát hành. Project theanh-main, base af2c4ae; worktree `/Users/theanh/CodexProjects/Kinh doanh/worktrees/ebook-ui-20260923`.

Preview: http://127.0.0.1:4332/academy/ebook-facebook-ads-2026-premium

## Kết quả audit và chỉnh sửa

| Phần | Vấn đề / hướng sửa |
|---|---|
| Hero | Tên sản phẩm nằm dưới tiêu đề chung; danh sách dài, ảnh trang mẫu chồng bìa. Đưa tên Ebook vào H1, rút gọn ba ý, bìa giữ tỷ lệ thật, hai CTA bằng nhau. |
| Preview | Giữ sáu bìa/trang, nền sáng, bố cục 3 cột desktop/2 cột mobile; bấm mở ảnh lớn. |
| Tình huống | Thống nhất ba khối, đọc theo số thứ tự; nút ở cuối khối, đường dẫn về phần liên quan giữ nguyên. |
| Đọc thử | Hai chương được trình bày riêng; 20 trang Pixel/CAPI giữ slider, thêm phóng lớn, nút điều khiển đủ vùng bấm. |
| Khối giải thích | Bỏ gradient/nền tối, giữ nội dung trong hai cột có chiều rộng đọc hợp lý. |
| Nhóm nội dung | Bốn nhóm dùng đường phân cách thay khung nặng; xếp 2 cột hoặc 1 cột ở màn hình hẹp. |
| Kết quả sử dụng | Giữ 12 nội dung, desktop 3 cột; điện thoại dùng danh sách đường phân cách để giảm khối hộp lặp. |
| Đối tượng | Ba nhóm, phân biệt rõ giới hạn phù hợp. |
| Mục lục | 10 phần thành hai cột desktop/một cột mobile; số phần, mô tả, số trang tách rõ. |
| Tác giả | Hai cột nội dung, bỏ nền tối/khung lồng. |
| Quyền lợi | Năm quyền lợi trình bày thống nhất; xuống dòng thích ứng, không bỏ điều khoản PDF. |
| Giá và form | Nền xanh nhạt/khung trắng, chữ đậm rõ, ô nhập 16px; giữ 399K, mua kèm không chọn sẵn, tổng 1.098M. |
| Giải thích giá | Giữ giới hạn không cam kết ra đơn, tăng khoảng cách và chiều rộng đọc. |
| FAQ và CTA cuối | FAQ dạng đường phân cách, dấu mở/đóng rõ; CTA cuối tương phản cao. |
| Điều hướng | Menu dưới giữ các điểm đến; CTA ẩn khi hero/form trong viewport, menu ẩn khi form trong viewport để không che ô nhập. Điều hướng anchor tức thì. |

CSS cũ nhiều lớp ghi đè được thay bằng một hệ CSS duy nhất: khoảng 57,5KB xuống 18,6KB trước nén. Mọi ảnh raster được bổ sung kích thước gốc. Nội dung không bị ẩn chờ hiệu ứng JS. Không thêm thư viện giao diện.

## Giữ nguyên hợp đồng

Hai file `public/ladipage/ebook-facebook-ads-2026-premium.html` và `public/academy/ebook-facebook-ads-2026-premium.html` giống hệt nhau. Form và toàn bộ script gốc so sánh nguyên văn không đổi; thêm một script UI riêng cho dialog ảnh/ẩn thanh dưới. Không sửa checkout-invoice.js, API, giá, mã gói, Pixel, CAPI, quyền học hoặc email. Không tạo đơn/gửi email thử.

## Kiểm tra

- Doctor đúng project và Git remote PASS; lần đầu lỗi DNS sandbox, chạy có quyền mạng đã PASS.
- 36/36 tests Ebook, đọc thử và payment-page-reference-ui PASS. Bỏ các assertion ép hình thức cũ (ảnh chồng, radius, tọa độ CSS, nội dung ẩn) vì không còn đúng brief; giữ kiểm tra offer, delivery, navigation, tracking và checkout.
- PostCSS parse, syntax các script inline, ESLint file test và git diff --check PASS.
- Codex IAB: desktop 1440, mobile 390 và 320. Không tràn ngang; nút hero bằng nhau; 14 section và ảnh đã tải không lỗi.
- Đã trực tiếp xem hero, preview, slider, mục lục, form, FAQ trên browser; kiểm tra menu đến đúng anchor, dialog mở/đóng, slider 01→02, mua kèm 399K→1.098M→399K, hóa đơn hiện trường, thanh dưới ẩn khi form hiển thị.
- Đường dẫn Next.js local không đuôi .html hoạt động; link đọc thử mở trang Hiểu về Facebook Ads, trang 1/471, HTTP 200.
- Console error lần kiểm tra cuối rỗng. Next dev có CSP report chặn yêu cầu bên thứ ba của Meta; chưa xác minh nhận event ở Meta, không sửa CSP trong nhiệm vụ UI.

## Giới hạn và tiếp tục

Chưa full production build/deploy, chưa thử thanh toán hoặc thiết bị vật lý. Preview đang chạy Next dev port4332; static fallback port4331. Khi được yêu cầu phát hành, tích hợp đúng cặp file + test vào canonical, chạy cổng kiểm tra phát hành/preflight theo registry rồi xác minh live.

Context đã đọc: registry/rules/policy/ACTIVE_TASKS; AI_CONTEXT_INDEX, SESSION_STATE, FEATURE_REGISTRY, ROLE_AND_SESSION_PROTOCOL, SESSION_START_CHECKLIST; AGENTS, CURRENT_STATE, FEATURE_MAP, WEBSITE_DEEP_STRUCTURE_HANDOFF, DESIGN_RULES; source Ebook và tests hiện tại. Các tài liệu SOURCE_OF_TRUTH chỉ có đường dẫn Windows trong index, không tìm thấy bản tương ứng dưới CodexProjects: dùng registry macOS, source/offer hiện tại và DESIGN_RULES; không suy đoán nội dung tài liệu thiếu.


## 23/09/2026 — Anh duyệt phát hành Ebook

Anh yêu cầu “deloy đi em” sau khi xem bản local. Đã tích hợp đúng hai HTML + test và tài liệu liên quan vào canonical;64/64 Ebook/reader/Facebook/payment tests PASS, scoped ESLint/diff PASS, Next production build --webpack và TypeScript PASS. Rollback hiện tại dpl_GQkUtpXmxaQscBJhq4nBZXyZb72F (30ac018), www/apex đã xác minh. Bản trước của các landing đã lưu trong reports/ebook-ui-20260923/live-before.json ở feature. Chưa tuyên bố LIVE ở mốc này; tiếp tục commit/preflight/push, đợi preview và promote.
