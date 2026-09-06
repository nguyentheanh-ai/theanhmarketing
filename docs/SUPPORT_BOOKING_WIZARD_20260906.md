# Đặt lịch hỗ trợ theo từng bước — 06/09/2026

Trạng thái: **bản cục bộ đã kiểm tra, chờ duyệt phát hành**. Chưa thay website hay dữ liệu thật.

Bản xem trước trên máy: http://127.0.0.1:3106/dat-lich-ho-tro (Next dev, session 3120). Dữ liệu lịch/checkout trong môi trường development dùng chế độ demo vốn có; đây không phải bằng chứng lịch trống hoặc giao dịch thật.

## Giao diện và hành vi

1. Chưa đăng nhập: hỏi có phải học viên Thế Anh Marketing. Có → `/dang-nhap?next=%2Fdat-lich-ho-tro`; Không → chọn nhu cầu. Đã đăng nhập thì không hỏi lại.
2. Chọn một trong AI cho Marketing, Facebook Ads, Content/Media, AI Agent. Sau khi chọn mới hiện ô mô tả không bắt buộc (tối đa 2.000 ký tự).
3. Người chưa được xác minh là học viên điền email, điện thoại, họ tên. Học viên đã xác minh bỏ qua; tài khoản đã đăng nhập nhưng chưa có khóa học vẫn điền liên hệ theo mức phí khách.
4. Chọn thời lượng, ngày trên lịch tháng có chuyển tháng, rồi giờ bắt đầu đủ thời lượng. Học viên thiếu điện thoại bổ sung ngay tại đây, vẫn giữ giá học viên. Đổi thời lượng xóa giờ đã chọn; ngày hết khoảng trống yêu cầu chọn lại. Giữ cửa sổ +3 đến +30 ngày và đóng Chủ nhật.
5. Kiểm tra chủ đề, lịch, thông tin và tổng tiền; nút giữ lịch gọi API hiện có rồi chuyển đúng checkoutUrl tới QR/chuyển khoản. Chỉ bước này tạo yêu cầu giữ lịch. Lỗi 409 quay lại chọn giờ và làm mới availability, giữ lại nội dung/liên hệ.

Mỗi thời điểm chỉ render nội dung một bước. Quay lại giữ state; focus chuyển tới tiêu đề khi đổi bước; radio có trạng thái chọn, progress có aria-current, lỗi có role=alert. Không lưu PII vào localStorage/sessionStorage. Giá và quyền học viên vẫn do server xác minh, không lấy từ khai báo của khách.

## Phạm vi mã và dữ liệu

- `app/dat-lich-ho-tro/page.tsx`: header gọn, bỏ toàn bộ bảng giá/khối giới thiệu dài trước form, truyền trạng thái đăng nhập riêng với điều kiện học viên.
- `components/support-booking/support-booking-form.tsx`: wizard, lịch tháng, thông tin có điều kiện, review và tái sử dụng API/thanh toán.
- `lib/support-booking/constants.ts`: bốn chủ đề mới; giữ riêng các mã chủ đề cũ để tương thích trang đang mở/lịch cũ.
- `lib/support-booking/domain.ts`: cho phép mô tả trống/ngắn, tiếp tục kiểm tra chủ đề và các ràng buộc liên hệ/lịch/giá hiện có.
- Migration CLI-generated `supabase/migrations/20260906100812_support_booking_optional_note.sql`: chỉ thay CHECK độ dài note từ 10..2000 thành 0..2000. Giữ NOT NULL, dữ liệu cũ, quyền truy cập, RPC, giá và chống trùng lịch. **Chưa áp dụng production.**
- Không sửa Auth service, API đặt lịch, order/SePay, email, Pixel/CAPI, CRM, landing quảng cáo hoặc cấu hình deploy.

## Bằng chứng kiểm tra

- 44/44 focused support tests, không skip: domain, public/student page render, API/price tampering, order/item/QR, SQL constraints/RPC và bốn kịch bản tương tác React.
- SQL local PGlite: áp dụng chuỗi migration rồi kiểm tra note rỗng, ngắn, 2000 ký tự được chấp nhận; 2001 ký tự và NULL bị chặn; ghi chú lịch sử giữ nguyên; các kiểm tra giá, lịch cũ, khoảng thời gian và quyền RPC tiếp tục đạt.
- Tương tác: đủ năm bước khách; trả về đúng link đăng nhập; note chỉ hiện sau chọn chủ đề; contact sai bị chặn; back giữ dữ liệu; học viên bỏ qua liên hệ; thiếu điện thoại bổ sung ở lịch; đổi thời lượng xóa giờ; chuyển tháng; đóng Chủ nhật; chỉ POST ở bước cuối; 409 làm mới lịch và giữ thông tin.
- TypeScript đạt. ESLint các file thay đổi đạt. Bản build Webpack thành công, 104/104 trang. Required prebuild 39/39. `git diff --check` đạt.
- Full suite 655/659: bốn lỗi Facebook Ads cũ. Chạy lại đúng hai test file trên canonical fd847c9 tái hiện cùng bốn lỗi; các source/test liên quan không có diff trong bản này.
- HTTP GET bản cục bộ `/dat-lich-ho-tro` trả 200, HTML đầu chỉ hiện câu hỏi học viên và link đăng nhập đúng next. Không dùng browser automation do managed policy; chưa kiểm tra trực quan viewport/đăng nhập thật. React interaction tests không chứng minh CSS bố cục trên thiết bị.
- Không tạo đơn/lịch, thanh toán, gửi email/Telegram hoặc sửa dữ liệu production trong lần này.

Lệnh chạy lại focused (runtime nằm ngoài repo, không thêm dependency vào sản phẩm):

```sh
export PATH=/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
export SUPPORT_SQL_TEST_MODULE='/Users/theanh/CodexProjects/Kinh doanh/.codex-local/support-booking-sql-20260905/node_modules/@electric-sql/pglite/dist/index.js'
export SUPPORT_UI_TEST_MODULE='/Users/theanh/CodexProjects/Kinh doanh/.codex-local/support-booking-ui-20260906/package.json'
node --test tests/support-booking*.test.mjs
```

React interaction harness dùng react-test-renderer 19.2.4 (có cảnh báo deprecated); không phải browser. Thiếu runtime env sẽ skip suite tương ứng, không được báo đã chạy.

## Phát hành sau khi anh duyệt

Feature root đang dùng lại: `/Users/theanh/CodexProjects/TheAnh-Web/worktrees/support-booking-public-duration-20260905`, đã fast-forward tới canonical fd847c9 trước sửa. Root này không được deploy.

1. Xác nhận hành động cập nhật production theo workspace AGENTS/control policy.
2. Áp dụng đúng migration note vào tenant main-site, đọc lại constraint và quyền, không sửa lịch đã có. Migration phải có trước runtime cho phép note trống.
3. Tích hợp scoped commit vào canonical sạch, chạy doctor remote và preflight-deploy đúng release root theo registry. Dựng/phát hành theo guard; không chạy trực tiếp `vercel --prod`.
4. Kiểm tra READY, route/asset thật, callback đăng nhập, API lịch, bảo vệ landing và runtime logs. Giao dịch thật chỉ khi có yêu cầu riêng.

Rollback ứng dụng về fd847c9 nếu cần; giữ constraint mới, không đặt lại tối thiểu 10 ký tự nếu đã có note trống/ngắn. Preview Vercel thiếu quyền availability là giới hạn môi trường đã biết, không mở quyền/sao chép secret để vượt lỗi.

Đã đọc: memory đúng support price; registry/WORKSPACE_RULES/PROJECT_REGISTRY/computer-use-policy; workspace ACTIVE_TASKS, AI_CONTEXT_INDEX, SESSION_STATE, FEATURE_REGISTRY, ROLE_AND_SESSION_PROTOCOL, SESSION_START_CHECKLIST, các mục support trong PAYMENT-FLOW/EMAIL-FLOW/DATABASE-CONTRACT; repo AGENTS, CURRENT_STATE, FEATURE_MAP, WEBSITE_DEEP_STRUCTURE_HANDOFF, DESIGN_RULES, phần liên quan kiến trúc dữ liệu/security, báo cáo support duration, lesson hiện có và tài liệu Next use-client. Memory giá tháng 8 chỉ dùng để nhận biết lịch sử; giá/thời lượng hiện tại lấy từ source và báo cáo release 05/09.

- Full ESLint: 103 errors/7275 warnings, output matches canonical exactly after normalizing root path. Primarily prebuilt public JS and existing test lint; zero changes to those files. Targeted changed-file lint passes. No lint config/baseline fixes included in this UI task.
