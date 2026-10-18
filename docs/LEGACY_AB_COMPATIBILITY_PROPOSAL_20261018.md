# Đề xuất cầu tương thích A/B trong lúc chuyển hosting

Trạng thái: TESTED trên workers.dev — anh đã duyệt cầu; domain phụ/DNS đã tạo đúng project, bridge B đã bật trên preview. Domain chính/cron chưa chuyển. Xem CODEX_RETAKE_A_B_20261018.md và receipt; không coi cookie/API rollback là toàn UI Blue đã sửa.

## Bằng chứng hiện tại

- Blue A→Blue B và Green A→Green B đã trả đúng liên kết Supabase B bằng tài khoản QA.
- Khóa shared secret Blue không đọc lại được qua Vercel (403); không có trong Vault hai project theo tên đã kiểm. Không bỏ kiểm shared secret để né lỗi.
- Cookie Blue/Green ký khác nhau; mỗi bên từ chối cookie bên kia. Workers B đã có callback khôi phục bằng Source JWT + kiểm profile ở backend.
- Vòng đăng nhập QA Blue là bug Meta disconnected bị hiểu nhầm Auth hết hạn. Bản sửa Workers b889e08 tách401 ứng dụng khỏi Meta409/NDJSON disconnected; không cần Meta key để sửa.

## Thao tác production bổ sung cần duyệt, ngoài năm mục trước

1. Thêm duy nhất domain phụ tạm `app-blue-origin.theanhmarketing.com` vào đúng project Vercel B `prj_JnAYX1BcLLcL7iASxA2FBLIP5vHp`, không tạo deployment hoặc đổi production deployment9fcf0d2.
2. Tạo đúng CNAME `app-blue-origin` trỏ đích do Vercel xác nhận (dự kiến cname.vercel-dns.com), DNS only/TTL120. Giữ nguyên mọi bản ghi khác, adsplan/email/DNSSEC. Đọc lại domain verified và HTTPS đúng B trước khi truyền credential QA; nếu bị protection thì dừng, không bypass.
3. Sau code/tests/QA: bật cầu tương thích B có cổng mặc địnhOFF. Chỉ chuyển đúng hai POST website-login/provisioning có secret cũ chưa khớp Green về endpoint tương ứng ở Blue qua HTTPS; Blue vẫn tự kiểm khóa cũ. Không nhận 3xx/HTML, không gửi dữ liệu tới host tùy ý. Source Supabase vẫn nguồn ghi duy nhất.
4. Giữ khả năng quay lui cookie: khi tạo phiên Source đã xác minh, lấy thêm cookie ký Blue qua endpoint session-cookie hiện có và lưu cookie riêng Green. Green xác minh chữ ký/role active như trước; Blue vẫn đọc cookie cũ khi rollback. Không đưa token/cookie vào query/log. Không bắt đổi mật khẩu/tạo lại tài khoản.

Không tự xóa origin hoặc dịch vụ cũ. Gỡ cầu/origin sau thời gian kiểm chứng và duyệt ngừng phụ thuộc Vercel riêng. Phải công bố rõ dependency Vercel tạm thời; không coi đã bỏ Vercel khi cầu còn bật.

## Điều kiện dừng và rollback

Domain không đúng B/không verified/HTTPS lỗi/Protection HTML → không bật cầu. Mọi401 từ Blue giữ401; timeout/5xx không coi thành xác thực thành công. Không fallback ghi sang database khác. QA chỉ tài khoản thử, không email/ngân hàng/học viên thật. Trước bật, phải thử hai key/cookie generations, guest/tamper/expired/revoked role, Source failure, callback và hồi quy API.

Đây chưa phải phê duyệt cutover: domain chính/cron vẫn đợi kiểm thử nghiệp vụ và rollback đạt theo phê duyệt trước. Meta được anh đồng ý hoãn, không là gate riêng cho hosting. Bản Blue có bug giao diện với Meta disconnected; không dùng HTTP200 hay cookie mint thành công để tuyên bố rollback UI đã đạt.
