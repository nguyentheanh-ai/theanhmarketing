# Đặt lịch hỗ trợ theo từng bước — 06/09/2026

Trạng thái: **đã phát hành và kiểm tra tên miền thật**. Bản chính thức: https://www.theanhmarketing.com/dat-lich-ho-tro. Các phần mô tả trạng thái cục bộ bên dưới là lịch sử; xem xác nhận phát hành cuối tài liệu.

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
- Migration CLI-generated `supabase/migrations/20260906101941_support_booking_optional_note.sql`: chỉ thay CHECK độ dài note từ 10..2000 thành 0..2000. Giữ NOT NULL, dữ liệu cũ, quyền truy cập, RPC, giá và chống trùng lịch. **Chưa áp dụng production.**
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

## 2026-09-06 — Phát hành đã được anh duyệt, migration đã áp dụng

Anh xác nhận “ổn, deloy đi em”. Migration optional note đã áp dụng vào main-site Supabase, phiên bản thực tế20260906101941; tên file đã đồng bộ sổ migration. Readback: note CHECK0..2000, NOT NULL giữ nguyên, RLS bật, anon/authenticated vẫn không được gọi reserve v2. Không ghi/sửa lịch hay tạo đơn thử. Đang tích hợp và phát hành UI qua canonical guard; chưa xác nhận UI live ở thời điểm ghi mục này. Các mục chờ duyệt/migration chưa áp dụng phía trên là lịch sử và được thay thế bởi mục này.

## 2026-09-06 — Wizard đặt lịch ĐÃ PHÁT HÀNH

- Anh xác nhận “ổn, deloy đi em”. Source runtime967af13 (giao diện39d5bf7) đã tích hợp vào canonical sạch, push và qua remote preflight. Preview dpl_261kG3VGbk8UcjrXhmPsxEeQSEmo READY; promote dựng lại bằng cấu hình production thành dpl_EQurKJAEdPwpgqrvZriVj5xq6eDE, READY, domain www và apex đều trỏ đúng bản mới.
- Migration20260906101941_support_booking_optional_note.sql đã áp dụng và đọc lại: CHECK note0..2000, NOT NULL và RLS giữ nguyên, anon/authenticated không có EXECUTE reserve v2; service_role có quyền. Không có note nằm ngoài constraint. Không sửa dữ liệu lịch cũ.
- Live HTTP200 trên cả hai host: chỉ câu hỏi học viên ở màn hình đầu; chưa mount trường chủ đề/liên hệ/lịch. Link login có next đúng; /dang-nhap HTTP200. Client chunks tải200 và chứa đủ bốn chủ đề, mô tả tùy chọn, lịch/thời lượng và checkout CTA.
- Availability200, ngày09/09–06/10/2026; cả4 Chủ nhật đóng. Request kiểm tra dùng ngày quá khứ bất khả thi bị từ chối400 trước reservation, sau khi vượt qua kiểm tra chủ đề AI Agent + note trống; không tạo đơn/lịch hay gửi thông báo. Trang thành công200.
- Năm trang bán hàng200, bốn trang tĩnh giữ SHA-256 hoàn toàn như trước phát hành; source Agent Kit động không đổi. Không có diff ở Auth/API booking/service/order/SePay/notification/payment/landing quảng cáo. Runtime log query15 phút, scoped bản production mới, không có error/fatal.
- Validation44/44 support (SQL + React, không skip) sau đồng bộ tên migration; prebuild39/39, TypeScript/local Webpack104/104 đã đạt ở bản giao diện không đổi; remote preview/production builds đạt. Full test655/659 và full lint103 errors/7275 warnings đều lỗi baseline đã đối chiếu canonical, lint file thay đổi đạt.
- Không kiểm tra browser visual viewport hoặc đăng nhập học viên thật vì managed policy; React interactions và source/build/live readback không phải chứng minh giao dịch thật. Không có thanh toán/email/Telegram thật. Rollback ứng dụng: dpl_DagSJSL4JnARvKKZD5GLBokCMbQD; giữ migration note mở rộng nếu rollback.
- Các mục WAITING_OWNER/chưa áp dụng/chưa deploy ở phần lịch sử đã được thay thế. Task hoàn tất, không còn bước phát hành chờ xử lý. Chi tiết: docs/SUPPORT_BOOKING_WIZARD_20260906.md.
