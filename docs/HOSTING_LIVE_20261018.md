# A/B đã chuyển hosting sang Cloudflare — 18/10/2026

**LIVE: Giai đoạn A (hosting). Migration toàn bộ: IN PROGRESS.**

## Trạng thái hiện hành

| Thành phần | Kết quả |
|---|---|
| Website A, gồm `/learn/*` | `www.theanhmarketing.com` và apex chạy Workers A |
| App B riêng | `app.theanhmarketing.com` chạy Workers B; không phải LMS A |
| A | Source `0f20ec3`, version `920ab23f-0a34-4e86-be3e-44fbd8af2dc4` |
| B | Source `354cb34`, version `94854193-2688-4ef4-8a43-fd5adff74e78` |
| DNS A chuyển | 17:38:58 giờ Việt Nam |
| Định tuyến | Đúng ba hostname, cùng zone; Worker Routes, fail-open=false |
| DNS khác | Email, Adplan, Blue origin và các bản ghi khác giữ nguyên |
| Dữ liệu và đăng nhập | Supabase A/B vẫn là nguồn ghi, Auth và Storage riêng tư |
| Phụ thuộc Vercel | Cầu xác thực Blue B và các bản cũ phục vụ quay lui còn giữ |

Custom Domain trả lỗi100117 vì bản ghi DNS hiện có. Không xóa CNAME đang phục vụ; dùng [Worker Routes chính thức](https://developers.cloudflare.com/workers/configuration/routing/routes/), deploy route trước rồi bật proxy. Guard giới hạn hostname và zone chính xác; kiểm phủ định wildcard hostname, Adplan và hai trường zone mâu thuẫn đều đạt. Không đổi native gates, quyền hoặc secret để vượt lỗi.

## Kiểm tra đã đạt

- 81 kiểm thử thanh toán liên quan;13 PostgreSQL clone;8 HTTP Workers + PostgreSQL clone;4 cron artifact. Auth/B/Resend trong clone là transport fixtures, không phải giao dịch ngân hàng thật.
- Build A qua script bắt buộc, đúng URL production và9gate; TypeScript đạt. B có124file/1233test đạt,14skip; OpenNext build đạt.
- Sau chuyển: A9kiểm tra hostname thật (bài học cũ, tiến độ QA, Ebook, cache riêng tư, guest denial, khóa webhook và apex); B4kiểm tra đăng nhập/API/SSR và cookie bị sửa bị chặn.
- Luồng A→B trên domain thật đạt; trình duyệt QA vào App B và refresh không về trang đăng nhập. Video trên bài học cũ ở website chính phát được; đã tạm dừng, không bấm hoàn thành hoặc sửa tiến độ.
- Anh xác nhận4mục Safari iPhone đạt trước chuyển. Đây là bằng chứng do chủ hệ thống kiểm trên thiết bị thật.
- SePay đã bật tự gửi lại sau lỗi máy chủ, mở lại biểu mẫu xác nhận. Không đổi URL, khóa hoặc bộ lọc; không gửi giao dịch thật.
- Đọc Source lúc17:45VN:0đơn paid thiếu email trong24giờ,0receipt Green còn treo. Đây là snapshot, không chứng minh giao dịch đầu tiên sau chuyển đã hoàn tất.

## Lịch và theo dõi

Vercel A đã tắt cron, tải lại trang xác nhận Disabled. Workers A bật trigger `*/5 * * * *`, dispatcher giữ8lịch UTC cũ; B không có cron. Tại thời điểm ghi chưa quan sát tick đầu tiên sau propagation, không gọi việc cấu hình thành công là mọi tác vụ nghiệp vụ đã chạy. Không bấm Run production để ép kết quả.

Telemetry17:38:58–17:41:00VN ghi25log events A và4B, không có event chứa metadata.error trong cửa sổ đó; không phải thống kê cả ngày hoặc số người dùng. Lịch theo dõi trong Codex chạy30phút/lần đến20/10 17:45VN, chỉ đọc và báo khi có thay đổi cần xử lý. ID `theo-d-i-cloudflare-a-b-sau-chuy-n-48-gi`. Chi phí tháng phải dựa usage đủ dài, không suy từ vài phút đầu.

Meta được anh cho hoãn; trạng thái chưa cấu hình và lỗi báo cáo thiếu snapshot baseline được giữ minh bạch, không giả số liệu.

## Quay lui hiện hành

Phần này thay hướng dẫn cũ yêu cầu gỡ domain/route ngay:

1. Tắt trigger Workers và đọc lại trước khi bật lại Vercel cron; không chạy hai scheduler.
2. Đưa đúng ba DNS record về proxied=false, TTL và content trong `dns-before-hosting-cutover.json`; giữ domain và bản Vercel.
3. Giữ Workers và các route trong thời gian DNS cache hoặc receipt còn pending. Không gỡ route A khi còn cần phục hồi Green.
4. A workers.dev hiện disabled; auto-review đã chặn mở lại endpoint này. Operator dùng hostname/SNI thật tới IP Cloudflare hiện hành, TLS chuẩn và xác thực bình thường để vào Green khi DNS đã về Blue. Probe `--probe-edge` đã kiểm đường này trước đổi DNS. Không tắt xác thực hay kiểm chứng thư.
5. Đối soát đúng receipt và giao dịch trước khi tiếp tục. Không reset paid, xóa receipt, gửi email mù hoặc khôi phục snapshot đè dữ liệu mới. Giữ unique index chống trùng.

Probe B lần đầu sai vì gửi cả cookie bị Max-Age=0 xóa; native auth từ chối đúng. Đã tạm trả DNS B về Blue, sửa jar giống trình duyệt, kiểm200mint/API/SSR và401tamper ở edge rồi mới bật lại. Không thay bảo mật production để làm test đạt.

## Giai đoạn 2 — chưa được chuyển nguồn ghi

1. Hoàn tất48giờ theo dõi: giao dịch/email/quyền học thật đầu tiên,8job đến hạn, lỗi và usage.
2. Kiểm tắt Blue bridge ở staging; phiên Source cũ tự khôi phục, cookie Green hợp lệ và không cấp quyền trùng. Chỉ bỏ bridge/origin sau gói duyệt riêng.
3. Audit lại từng Source, backup mã hóa và phục hồi thử; đối soát UUID/count/hash/FK. D1 copy15/10 không phải dữ liệu mới nhất; cần delta/catch-up với một nguồn ghi.
4. Hoàn thiện D1 backend cho admin/CRM/orders/LMS của A và workspace/roles/resources của B; kiểm transaction, JSON/time/index/performance và toàn bộ quyền tương đương RLS.
5. Auth rolling migration giữ UUID/hash/password và phiên; benchmark xác minh hash trên Workers, không reset hay bắt đăng ký lại hàng loạt.
6. R2 riêng tư cần checksum, ownership, URL cũ tương thích, signed URL, HTTP Range và cache riêng tư trước khi tắt Source Storage.
7. Cutover writer riêng từng database cần final delta và quay lui dữ liệu mới phát sinh. Xin duyệt riêng trước thay nguồn ghi.
8. Chỉ ngừng Supabase/Vercel khi kiểm chứng đầy đủ và có duyệt hủy riêng.

## Bản nháp và file khóa

11 file dirty trong worktree phát hành Vercel A cũ là thay đổi add-on Zoom chưa commit. Đọc origin Vercel qua IP cũ với TLS chuẩn vẫn200, có offer gốc và không có các mã gói mới. Quyết định: giữ nguyên bản nháp, không gộp hoặc commit thay chủ nhánh, không đưa thay đổi sản phẩm ngoài migration vào bản Cloudflare. Manifest ở `legacy-a-draft-decision.json`.

Các file khóa local không được commit. Sau khi xác minh bản lưu an toàn cần thiết cho giai đoạn2, lập manifest cleanup và nhắc anh xóa các bản RTF chứa khóa; chưa xóa tự ý trong phiên này.

## Bằng chứng

`reports/cloudflare-handoff-20261018/`: `hosting-live-summary.json`, `hosting-live-readback.json`, `hosting-live-metrics.json`, `a-live-domain-auth.json`, `b-live-domain-auth.json`, `a-b-live-bridge.json`, `safari-owner-acceptance.json`, `sepay-retry-readback.json`; ảnh `a-live-video-verified.jpg`, `b-live-browser.jpg`, `vercel-cron-disabled.jpg`.
