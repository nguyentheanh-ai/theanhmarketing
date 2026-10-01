# Dashboard Sale — 01/10/2026

Trạng thái hiện tại: LIVE, mặc định Hôm nay. Project `theanh-main`. Xem bằng chứng phát hành ở cuối tài liệu; các mục trước đó là lịch sử triển khai.
Nguồn: `worktrees/sales-dashboard-20261001`, nhánh `feat/sales-dashboard-20261001`, base canonical `c40ecc10793880f3f37c73cbb14afe22c420bc26`.

## Bản sửa 2 theo phản hồi của anh — thay thế bố cục và trạng thái bản đầu

- Một bảng chính; bỏ header quảng bá và các thẻ KPI lớn. Thanh tìm kiếm/lọc nằm ngay trong đầu danh sách. Bộ lọc chính: tìm liên hệ, khoảng ngày, từ–đến, tình trạng, sản phẩm; nguồn/liên hệ/sắp xếp/ngày theo nằm ở Lọc thêm cùng thanh.
- Đúng 6 cột: **Ngày – Tên – SĐT – Tình trạng – Sản phẩm – Email**. Checkbox nằm chung cột Ngày. Điện thoại cuộn ngang bảng để giữ nguyên thứ tự cột.
- Mỗi khách chỉ có **Paid xanh** hoặc **Unpaid đỏ**. Paid nếu có ít nhất một đơn đã thanh toán, kể cả còn đơn khác chưa trả. Unpaid gồm mọi khách chưa có đơn paid, kể cả chưa đặt đơn. Bộ lọc và CSV dùng cùng quy tắc, không còn nhóm no-order hoặc hai trạng thái cùng lúc.
- Tên ngắn sản phẩm theo slug hiện có: FB Ads, Ebook FB, Agent Kit, AI Master X10…; tên đầy đủ ở tooltip/chi tiết. CSV cùng đúng 6 cột và ngày theo lựa chọn hiện tại.
- Copy, chọn hàng loạt, phân trang, quyền owner/editor và dữ liệu gốc giữ nguyên. Không triển khai production theo phản hồi “Không” của anh.
- Kiểm tra bản sửa: 34/34 tests sale/CRM/role/UI đạt, scoped ESLint/diff đạt; TypeScript + webpack build108 đạt. Evidence revision2-tests.log, revision2-lint.log, revision2-build.log. Chưa authenticated visual QA. Preview.html đã dựng lại từ bản sửa2, dữ liệu minh họa.

## Bản đầu — lịch sử, đã bị thay thế về bố cục/trạng thái/cột

Thêm mục Dashboard Sale trong menu desktop/mobile, route `/admin/crm-v2/sales`. Trang riêng tập trung tìm/lấy liên hệ; khu Khách hàng & học viên vẫn quản lý tài khoản/quyền học như cũ.

- Tìm tên có/không dấu, email, điện thoại 0/+84, mã đơn.
- Hôm nay, hôm qua, 7/30 ngày, toàn bộ hoặc từ–đến ngày; múi giờ Việt Nam. Chọn ngày ghi nhận đầu tiên hoặc cập nhật hồ sơ. Ngày thiếu bị loại khi có giới hạn ngày; khoảng ngày ngược có thông báo.
- Bộ lọc đơn đã trả/chưa trả/chưa có đơn, sản phẩm từ danh mục thật, nguồn, liên hệ thiếu/có email/có điện thoại.
- Thẻ tổng hợp tính theo toàn bộ kết quả lọc, không chỉ trang đang xem. Trạng thái đơn là lịch sử toàn bộ khách, không phải doanh số theo ngày. Có thể cùng lúc có đơn đã trả và chưa trả. Nhóm chưa trả kế thừa các đơn không paid của service, không được diễn giải là chỉ pending chưa hết hạn.
- Email/điện thoại hiển thị trực tiếp và sao chép từng dòng; chọn khách qua nhiều trang, lấy email/SĐT không trùng. Khi chưa chọn thì lấy tất cả kết quả lọc; đổi bộ lọc xóa lựa chọn để tránh lấy nhầm.
- CSV UTF-8 BOM, trích dẫn dấu phẩy/xuống dòng, chặn công thức bảng tính, giữ số 0 đầu điện thoại bằng dấu nháy đơn. Xuất đúng tập đang chọn hoặc toàn bộ kết quả lọc.
- Sắp xếp mới/cũ/tên, 25/50/100 mỗi trang; bảng desktop và thẻ mobile; chi tiết liên hệ, mã đơn, ghi chú, đường dẫn hồ sơ hiện có, nút gọi điện.
- Nút Làm mới, phản hồi clipboard lỗi, trạng thái rỗng và khung lỗi tải dữ liệu kế thừa CRM.

## Dữ liệu và phạm vi

Dùng `listAdminCustomerProfiles` hiện có với đọc strict, gộp identity và tombstone hiện tại; không thêm bảng/RPC/API ghi. Catalog lấy `getCourseSummariesStrict`, không suy diễn cặp slug/title từ hai mảng gộp khác nhau.
Auth chạy trước truy vấn. Owner thấy prospects; editor giữ nguyên phạm vi học viên. Hệ thống chưa có role sale riêng; không cấp tài khoản hay mở rộng quyền trong nhiệm vụ này. DTO chỉ truyền trường phục vụ sale.
Không thay landing, checkout, giá, thanh toán, email, Auth, quyền học, schema/RLS hoặc dữ liệu khách. Chưa có kiểm chứng dữ liệu live trong phiên; runtime nối vào nguồn service thật, không có dữ liệu minh họa trong route sản phẩm.

## File nguồn thay đổi

- `app/admin/crm-v2/sales/page.tsx`: server route, auth và DTO.
- `components/admin/sales-dashboard.tsx`: dashboard, lọc, bảng/thẻ, lựa chọn, copy/export, chi tiết.
- `lib/admin/sales-dashboard.ts`: ngày Việt Nam, tìm kiếm/lọc/sắp xếp, dedupe, CSV.
- `components/crm-v2/crm-components.tsx`: menu và quyền hiển thị editor.
- `tests/sales-dashboard.test.mjs`: hành vi, render, tương tác, auth và projection.

## Kiểm chứng

Doctor canonical/remote PASS. Lượt đầu sandbox không phân giải github.com; chạy xác minh có mạng đạt, nguồn canonical sạch/đúng nhánh.
72/72 tests đạt: sales-dashboard, admin-customer-workspace, admin-editor-role, admin-ui-polish, facebook-ads-landing, payment-page-reference-ui. Trong đó có 13 kiểm tra mới cho sale.
TypeScript và Next webpack production build 108 trang đạt, có route sale dynamic. ESLint toàn bộ file nguồn thay đổi và preview script đạt; git diff --check đạt.
Full lint vẫn có 119 lỗi trong 7 JS bundle public và test agent-kit-preorder-lifecycle không thay đổi so với base; không tuyên bố toàn repo lint sạch.
HTTP local có bật AUTH_GUARD_ENABLED: route sale trả 307 tới `/admin/login?next=%2Fadmin%2Fcrm-v2%2Fsales`, cache private/no-store. Không truy vấn hay sửa dữ liệu khách thật để test.

Evidence: `reports/sales-dashboard-20261001/{tests-final.log,build-final.log,lint.log,full-lint-final.log,guest-http.json,preview.html}`. `preview.html` là bản bố cục tĩnh từ component thật với liên hệ example.invalid minh họa; không dùng nó làm bằng chứng thao tác browser/live. Mở file trong Codex đã trả queued, chưa xác nhận người dùng đã thấy.

Giới hạn: chưa authenticated visual QA desktop/mobile do policy Computer Use của workspace; chưa production deploy, chưa role sale hoặc tài khoản nhân viên riêng. React renderer kiểm tra tương tác không thay thế kiểm tra trình duyệt. Bộ lọc đang giữ trong phiên trang; không lưu lựa chọn khi rời trang.

## Context và bàn giao

Đã đọc registry, WORKSPACE_RULES, PROJECT_REGISTRY, computer-use-policy, ACTIVE_TASKS; tra phần liên quan AI_CONTEXT_INDEX, SESSION_STATE, FEATURE_REGISTRY, ROLE_AND_SESSION_PROTOCOL, SESSION_START_CHECKLIST, PAYMENT-FLOW, EMAIL-FLOW, DATABASE-CONTRACT. Đã đọc repo AGENTS, CURRENT_STATE/FEATURE_MAP phần liên quan, WEBSITE_DEEP_STRUCTURE_HANDOFF phần CRM, DESIGN_RULES, SECURITY_HARDENING, DATABASE_ARCHITECTURE và source/tests tương ứng. Hướng dẫn Next use-client lấy từ bản cài tại repo. Serena không có callable tool trong phiên, dùng đọc mã có mục tiêu.

Đã cập nhật docs workspace SESSION_STATE, FEATURE_REGISTRY, TASK_LOG, CHANGELOG, ACTIVE_TASKS, NEED_VERIFY, DECISIONS; repo CURRENT_STATE, FEATURE_MAP, WEBSITE_DEEP_STRUCTURE_HANDOFF và lesson runtime.

Bước tiếp theo: anh duyệt bản đã làm rồi mới tích hợp/phát hành qua canonical doctor/preflight. Kiểm tra giao diện có đăng nhập và số liệu thật sau phát hành. Nếu cần tài khoản sale riêng, chốt danh sách tài khoản và phạm vi đọc trước khi thay quyền.


### Xác minh bản xem sau ảnh phản hồi
Ảnh anh gửi vẫn là bố cục bản đầu. Đã kiểm tra source và preview hiện tại: không còn card bộ lọc riêng, KPI hoặc khẩu hiệu cũ. Không thay đổi thêm logic. Tạo bản xem cùng nội dung tại `reports/sales-dashboard-20261001/sale-danh-sach-v2.html` để mở bằng đường dẫn mới. Nguyên nhân tab vẫn hiển thị bản cũ chưa xác minh; không kết luận lỗi cache. Chưa production.


### 01/10/2026 — Đã duyệt phát hành, mặc định Hôm nay
Anh xác nhận “bộ lọc mặc định là hôm nay, oke rồi đưa lên web đi”. Default from/to cùng ngày hiện tại Asia/Ho_Chi_Minh; vẫn giữ lựa chọn Toàn bộ/khoảng tùy chọn. Đang kiểm tra và tích hợp canonical; trạng thái chưa deploy bên trên là lịch sử trước yêu cầu này.


## 01/10/2026 — Dashboard Sale đã LIVE, mặc định Hôm nay

Anh đã duyệt đưa lên website. Runtime `fbd273fe958c5d09e7fa6389beadf67c8f005074`; preview `dpl_5s9d6bXJhmwoYsctbi2NK6R28wrz` READY; production `dpl_BXUTVvxDWgebP3NXj8VMRzVdALUj` READY, www/apex đúng alias. URL: https://www.theanhmarketing.com/admin/crm-v2/sales . Rollback: `dpl_5r8VWfyXCja2v7JHoP98oLvXMigG`.

Bộ lọc mặc định Hôm nay theo Asia/Ho_Chi_Minh; thanh lọc chung đầu bảng;6cột Ngày–Tên–SĐT–Tình trạng–Sản phẩm viết tắt–Email. Chỉ Paid xanh/Unpaid đỏ theo có/không có đơn đã trả. Giữ quyền owner/editor; không thêm role/tài khoản sale, không sửa dữ liệu khách/payment/email/access/landing/schema.

Canonical doctor/remote/preflight đạt;74tests, scoped lint, TypeScript và build108 đạt. Full lint119 lỗi cũ đã ghi ở local, không phải scoped lint.28URL kiểm tra sau phát hành:7HTML landing www giữ SHA;14apex redirect307 sang www giữ nguyên cả trước/sau; Sale www từ404 thành307 về admin login với next đúng. Đường quản lý khách/học viên giữ guard. Không có bản ghi error/fatal trong truy vấn deployment production10phút sau release. Đã xác minh commit production có default today; chưa authenticated visualQA/đối soát dữ liệu thật, không coi guest redirect là nghiệm thu UI. Không tạo đơn/email/giao dịch thật.

Evidence tại `worktrees/sales-dashboard-20261001/reports/sales-dashboard-20261001/`: release.json, release-tests.log, canonical-build.log, production-inspect.log, live-before.json, live-after.json, vercel-evidence.json. Trạng thái LIVE này thay thế các mục local/chưa deploy/chờ duyệt trước đó. Không còn bước triển khai chờ anh duyệt.
