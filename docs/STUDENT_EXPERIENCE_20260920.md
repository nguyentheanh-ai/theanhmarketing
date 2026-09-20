# Trang chủ và dashboard học viên — 20/09/2026

Trạng thái: LIVE, anh đã duyệt phát hành bằng “Duyệt”. Rollback trước phát hành: dpl_HN34eo9A6ennvsuaqLwzgbYngS2J.

## Phạm vi và nguồn

Project `theanh-main`, canonical base `68cd7a2d69b213b824f87694c0db5c5947ef2b38`. Worktree riêng `feat/student-experience-20260920` tại `/Users/theanh/CodexProjects/Kinh doanh/worktrees/student-experience-20260920`. Doctor remote đạt sau khi chạy ngoài sandbox có quyền mạng. Canonical không bị sửa.

Đã đọc registry/rules/project registry/computer-use policy, ACTIVE_TASKS, AI_CONTEXT_INDEX, protocol/checklist, các mục học viên trong SESSION_STATE/FEATURE_REGISTRY; repo AGENTS, CURRENT_STATE/FEATURE_MAP, WEBSITE_DEEP_STRUCTURE_HANDOFF, DESIGN_RULES, DATABASE_ARCHITECTURE/SECURITY_HARDENING và source quyền học hiện hành. Các content/design source Windows trong hướng dẫn không có ánh xạ macOS xác minh được; nội dung bản sửa dựa trên catalog và tuyến đang tồn tại, không đặt thêm offer/giá/cam kết.

Anh yêu cầu dựng lại UI và sửa lag, đã cho phép kiểm tra giao diện bằng trình duyệt trong phiên này. Không đổi managed requirements. Không đổi landing Ads, checkout, giá, email, schema, khóa, Auth hay dữ liệu học viên. Giữ quyền order/LMS, override, hạn dùng và đường dẫn Ebook/Agent Kit. CSS mới được giới hạn bằng CSS Modules.

## Thay đổi

- `app/page.tsx`, `app/home.module.css`: trang chủ tập trung khóa học đang mở có landing hợp lệ, thư viện tài liệu, dashboard và hỗ trợ; bỏ bảng AI minh họa, workflow giả lập, thống kê minh họa và testimonial không cần cho luồng mới. Catalog/giá vẫn từ service hiện hành.
- `components/site/footer.tsx`: thay form mailto giả nhận toolkit bằng link thật tới thư viện.
- `components/app/student-dashboard.tsx` và CSS Module: nền sáng, sidebar xanh đậm, nút rõ ràng, học tiếp/khóa sở hữu trước, gợi ý mua thêm cuối; ảnh không crop; menu mobile; tài liệu miễn phí có file dùng link trực tiếp. Giữ nút học cho khóa đã cấp quyền, khóa chưa mở bán vẫn xám.
- Dashboard trở thành Server Component; chỉ giỏ hàng/đăng xuất là client islands. Không còn hydrate toàn bộ danh sách và theme toggle.
- `services/studentPortalAccessService.ts`: truy vấn nhỏ, phân trang theo đúng email, paid orders và access overrides đang hoạt động; không tải toàn bộ CRM, không tải email logs/đơn lần hai. Email ILIKE được escape wildcard. Lỗi đọc được báo ra thay vì giả quyền rỗng.
- `services/studentPortalService.ts`: auth, catalog, tài liệu và nhánh quyền chạy theo phụ thuộc thật; LMS không chờ các truy vấn CRM. Admin không cần đọc paid orders/overrides.
- `services/courseService.ts`: chế độ `summaryOnly` chỉ áp dụng ở homepage và portal, bỏ body/video/resource bài học và 2 truy vấn tài nguyên. Các caller khác giữ mặc định đầy đủ.
- `services/lmsService.ts`: quyền học chỉ đọc trạng thái xuất bản và cấu trúc đếm bài; giữ hàm map/enrollment/progress hiện hành. RPC enrollment cũ vẫn đọc toàn bộ tập enrollment, chưa thay schema/RPC trong task này.
- `app/dashboard/page.tsx`: activity log dùng Next `after`, không chặn phản hồi. Layout giữ nguyên kiểm Auth trước nội dung để bảo toàn redirect; loading/error có trạng thái rõ và nút thử lại.

## Bằng chứng

- 81/81 kiểm tra liên quan đạt: student access/course entry, LMS, dashboard/account, deposit, activity, và 39 kiểm tra landing/payment prebuild. Tests hiệu năng mới kiểm actual query builder (email literal, paging, error, thiếu identity), response không chờ log, LMS expiry/progress, catalog bỏ resource fetch. Không đo độ nhanh bằng test giả lập.
- TypeScript, scoped ESLint và Webpack build đạt; evidence `reports/student-experience-20260920`.
- SQL chỉ đọc trên đúng project: cột truy vấn có thật; không có email thừa khoảng trắng trong orders/access overrides cần đọc. Không cập nhật DB hay in bản ghi khách hàng.
- Đã xem homepage mới trong bản build localhost, dashboard trong bản render fixture riêng, desktop và 390/320px. Ở mobile không phát hiện overflow của heading/link; ảnh dashboard tải được. Đã sửa wrapping khối học tiếp từ kết quả screenshot. CTA trang chủ tới section chương trình đã bấm và xác nhận.
- HTTP localhost với `AUTH_GUARD_ENABLED=true`: `/dashboard` trả307 tới `/dang-nhap?next=%2Fdashboard`, đã đọc header. Trước khi bật guard local, cũng đã kiểm menu tài liệu trên dashboard chạy thật bằng fallback không có credentials.
- Preview dashboard là render component/CSS thực với dữ liệu kiểm thử, có nhãn phân biệt; nút giỏ/đăng xuất ở preview không thực hiện mutation. Không phải bằng chứng đăng nhập trọn luồng trên bản mới. Home local dùng catalog fallback vì không nạp production credentials.

## Giới hạn và bước phát hành

Chưa đo latency phiên học viên production trước/sau, chưa xác minh đăng nhập/quyền bằng phiên thật trên bản mới. Không tuyên bố hết mọi lag. Chrome local có CSP warnings từ extension/marketing; không đổi CSP để dẹp cảnh báo. Không chạy full-suite/full-lint ngoài scope đã có baseline failures. Cần anh duyệt bản giao diện và cho phép production tại thời điểm phát hành theo AGENTS.md; sau đó tích hợp đúng canonical, preflight, kiểm active landing routes/hashes, preview build và production readback. Không deploy trực tiếp từ worktree này.


## Kết quả production

Runtime `0fe0549537d368224fb1e32e7f89bb9bcaea8175`; preview `dpl_HSX9vc2AW1aNuXs2i2WcQjWCbvs7`; production `dpl_DevyBi2ruk67y8KcU3HHoKLxAHKE` READY, www/apex đã nhận bản mới. Doctor và preflight remote đạt.

Live homepage mới200; guest dashboard/tài khoản307 đúng, GET orders405. Sáu landing200 và bốn static HTML SHA-256 không đổi; hai landing động không so đồng nhất HTML vì build/chunk thay đổi. Dashboard phiên Admin hiện có hiển thị10 khóa; CTA mở bài học Facebook Ads thành công. Đã xem screenshot live mobile và desktop1440, trạng thái loading hoạt động. Không thao tác hoàn thành bài học, đơn hàng, email hoặc quyền. Runtime error/fatal query scoped deployment không thấy lỗi tại thời điểm kiểm tra.

Các trạng thái local/chờ duyệt phía trên là lịch sử và được thay thế bởi kết quả này. Giới hạn còn lại: chưa định lượng latency trước/sau, chưa E2E quyền tài khoản học viên thường (phiên live kiểm là Admin). Source và test đã kiểm logic học viên thường.
