## 11/09/2026 — Kiểm tra quyền thư viện Agent

Khóa chính xác: **Đội ngũ nhân sự AI**, slug `bo-agent-kit-x10-hieu-suat-cong-viec`. Không thay bằng `ai-agent-master-2026` hoặc `tao-ai-agent-ca-nhan-x10-hieu-suat`. Mỗi khóa là một quyền riêng.

Đã tái hiện nhánh legacy cấp quyền từ đơn paid cọc preorder: API download trả 200 thay vì 403. `getCourseAccessSlugs` nay dùng bộ nhận diện cọc sẵn có, loại riêng Agent Kit khỏi quyền phát sinh từ đơn cọc; giữ các khóa khác trong đơn ghép, đơn đủ tiền/phần còn lại và quyền admin cấp rõ ràng. Không sửa đơn/SePay/giá/email hay enrollment thật.

Kiểm tra cục bộ: 177/177 gồm 24 tình huống x 10 download routes sử dụng mã access, LMS, course-access và signer thật với biên Auth/DB giả lập; 1 ca mixed order; 39 revenue-critical. TypeScript và lint file thay đổi đạt. Bản cũ fail 3 ca cọc; bản sửa pass. Không gọi đây là đăng nhập production hoặc bấm nút thật. File thật đã được tải lại và đối chiếu 10/10 ở receipt bàn giao trước đó.

### Cấp quyền các lần sau
1. Xác minh email/tài khoản và khóa đã mua hoặc được owner chỉ định; không chọn khóa chỉ vì tên có chữ Agent.
2. Khách chỉ đặt cọc: không cấp full access tự động. Đơn phần còn lại/đơn đủ tiền đã paid dùng flow payment hiện có; không replay webhook để thử.
3. Cấp ngoài đơn theo xác nhận owner: dùng thao tác cấp quyền học viên hiện có (`/api/admin/students/access`), chọn đúng slug trên. Flow này có gửi email: chỉ thực hiện khi yêu cầu bao gồm gửi thông báo hoặc đã được cho phép; không dùng gọi API làm dry-run. Không tạo paid order giả.
4. Khách mới dùng luồng tạo tài khoản/cấp quyền chuẩn; quyền trial còn hạn cũng cho tải ZIP nên chỉ cấp trial khi đúng chủ đích. Giữ quyền khóa khác, không đặt lại mật khẩu tài khoản đang dùng nếu không có yêu cầu recovery.
5. Đọc lại quyền đúng email/user, trạng thái active/completed và hạn dùng; kiểm tra tải ở phiên khách nếu có phiên được phép. Thu hồi qua thao tác quản trị đồng bộ LMS + legacy; không chỉ sửa một bảng. Signed URL đã cấp có thể dùng tối đa 120 giây và file đã tải không thu hồi được.

Production RPC `admin_lms_set_student_access` chỉ service_role có EXECUTE; anon/authenticated không có. Audit chỉ đọc, không thay quyền khách. Bản sửa đang chờ phát hành; xem cập nhật bên dưới.


### Đã phát hành bản sửa quyền — 11/09/2026
Source `db9eaa738d3fb5bafa51e459ab712b572fdad8e6`, production `dpl_6JLuE3zZALzRD4eeEQJ82GgBX1e7` READY, Vercel production target khớp. 177/177 tests, TypeScript và targeted lint đạt; 32 live HTTP checks trên apex/www gồm 20 download401 và 12 landing200, ba HTML tĩnh mỗi host giữ hash. 10 ZIP CRC pass; 10 public object URL bị từ chối400; admin grant/access không đăng nhập403. Lỗi cọc đã sửa tại shared course-access; không sửa thông tin hay quyền khách thật. Giới hạn giữ nguyên: kiểm tra quyền tích hợp dùng fixture ở biên Auth/DB; chưa có authenticated browser E2E. Receipt trong bộ kit đã cập nhật.


### Nhận diện khách mua qua trang Codex
- Trang bán: https://www.theanhmarketing.com/academy/codex-x10-hieu-suat
- Tên khách có thể gọi: “Học Codex”, “Codex X10 hiệu suất”, “Làm chủ Codex”.
- Cùng sản phẩm **Đội ngũ nhân sự AI**, mã khóa **`bo-agent-kit-x10-hieu-suat-cong-viec`**. Form Codex dùng `courseSlug: AGENT_KIT_SLUG`; `landingPage: academy/codex-x10-hieu-suat` chỉ ghi nguồn đăng ký, không phải một khóa riêng.
- Cấp đúng khóa trên sẽ dùng chung thư viện 10 Agent. Không yêu cầu khách mua lại và không tạo enrollment với slug `codex-x10-hieu-suat`.
- Vẫn xác minh đúng tài khoản và căn cứ cấp quyền: đơn đủ tiền/phần còn lại đã paid hoặc owner cấp thủ công; riêng đơn cọc không tự mở full access.
- Nguồn kiểm tra: `app/academy/codex-x10-hieu-suat/sections.tsx`, `lib/agent-kit-preorder.ts`; mapping đã có trong code, bổ sung này không đổi runtime.
