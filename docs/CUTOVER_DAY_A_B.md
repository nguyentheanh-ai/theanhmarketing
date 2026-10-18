## 18/10/2026 — Hosting A/B đã LIVE

Xem tài liệu hiện hành tại HOSTING_LIVE_20261018.md. Website A (gồm /learn) và App B riêng đã chạy trên domain thật qua Cloudflare Workers. Cron Vercel đã tắt, lịch Workers đã bật; theo dõi lần chạy thực và tác vụ đến hạn. Supabase vẫn là nguồn ghi/Auth/Storage; B còn cầu Blue Vercel để tương thích và quay lui. Theo dõi chỉ đọc 48 giờ đã bật. Migration toàn bộ vẫn IN PROGRESS, chưa hủy dịch vụ cũ.

> **18/10 cập nhật Auth/cầu tạm:** B742a15d đã deploy preview, Meta được hoãn. Domain chính/cron chưa chuyển; QA B đang inactive sau thu hồi phiên, không bật trước14:38:11VN. Xem mục cuối CODEX_RETAKE_A_B_20261018.md trước mọi lệnh lịch sử.

> **18/10 13:10:** Index SePay concurrent đã áp dụng/valid; Workers A monitoring và tải TXT browser đã kiểm chứng. Hosting chưa chuyển; Meta và legacy Auth/session còn gate. Xem CODEX_RETAKE_A_B_20261018.md.

> **18/10 12:40:** Đã deploy lại Workers preview A/B và khôi phục Sheets. Chưa GO; còn Meta, legacy Auth/session compatibility, monitoring và QA. Xem CODEX_RETAKE_A_B_20261018.md trước phần lịch sử bên dưới.

> **Cập nhật 18/10/2026:** Chưa đủ điều kiện chuyển. Xem [đối chiếu tiếp nhận](CODEX_RETAKE_A_B_20261018.md) trước mọi bước bên dưới: artifact A lúc nhận là staging (đã rebuild đúng), cần compatibility secret cũ/mới khi B chuyển trước A, xác minh Resend webhook, DNS đầy đủ, cron Vercel và release roots. Các kết quả lịch sử/khóa trong phần cũ không tự chứng minh trạng thái hiện tại.

# Ngày chuyển website A + App B từ Vercel sang Cloudflare Workers

Trạng thái 17/10/2026: **chuẩn bị xong, chờ duyệt**. Dữ liệu vẫn ở Supabase A/B (không đổi). Vercel vẫn phục vụ cả hai tên miền.

## Hiện trạng đã kiểm chứng

| | App A (website) | App B (app học viên) |
|---|---|---|
| Worker | `theanh-main-cf-production` | `theanh-student-cf-production` |
| Mã | nhánh `codex/cloudflare-staging-main-20261013` @ `33656ef` | nhánh `codex/b-cf-production-20261017` @ `466000c` |
| Bản cuối đã build (chưa deploy) | `scripts/build-cloudflare-production.sh` → APP=`https://app.theanhmarketing.com`, SITE=`https://www.theanhmarketing.com`, có binding `STUDENT_APP` | OpenNext `.open-next` trong worktree B, APP/WEBSITE = tên miền thật |
| Đã thử trên URL thử | trang công khai/landing khớp từng byte, đăng nhập, dashboard, `/learn`, CRM, tạo đơn + QR + email chờ thanh toán | `/login`, chuyển hướng, route cấp quyền 401, đăng nhập từ A vào `/app/overview` |
| Secret | đủ cho thanh toán/email/Telegram/QR; còn thiếu Sheets, `SEPAY_WEBHOOK_SECRET`, `CRON_SECRET`, `CHECKOUT_ABUSE_HMAC_KEY`, `TELEGRAM_REPORT_SECRET`, `META_ADS_*`, `META_APP_*` | Supabase B, secret cấp quyền mới (chung với A), secret phiên; còn thiếu `ADS_META_*` (đặc biệt `ADS_META_TOKEN_KEY` phải là giá trị cũ), `CRON_SECRET` |

Worker thử hiện vẫn chạy bản trỏ vào nhau (A `bf1a82ea`→B, B `7cad84f3`→A) để thử; sẽ được thay bằng bản cuối lúc chuyển.

## Điều kiện bắt buộc: DNS phải sang Cloudflare

Nameserver hiện tại: `sapa.vclouddns.com`, `laocai.vclouddns.com`. Worker Custom Domain chỉ gắn được khi zone `theanhmarketing.com` nằm trên Cloudflare (cùng tài khoản `12c1thdtheanh@gmail.com`).

Bản ghi công khai đã thấy (phải chép đủ sang Cloudflare, xuất danh sách đầy đủ từ vclouddns để không sót):

| Tên | Loại | Giá trị hiện tại | Sau khi chuyển |
|---|---|---|---|
| `@` | A | 216.198.79.1 (Vercel) | Worker A (Custom Domain tự tạo) |
| `www` | CNAME | `…vercel-dns-017.com` | Worker A (Custom Domain) |
| `app` | CNAME | `cname.vercel-dns.com` | Worker B (Custom Domain) |
| `adsplan` | CNAME | `cname.vercel-dns.com` | **giữ nguyên** (Adplan vẫn ở Vercel), proxy tắt (DNS only) |
| `mail` | CNAME | `mail.resend-dns.com` | giữ nguyên, DNS only |
| `send` | MX 10 / TXT SPF | `feedback-smtp.ap-northeast-1.amazonses.com` / `v=spf1 include:amazonses.com ~all` | giữ nguyên |
| `resend._domainkey` | TXT | khóa DKIM Resend | giữ nguyên |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | giữ nguyên |

## Trình tự (mỗi bước có điểm dừng kiểm tra)

1. **Thêm zone vào Cloudflare** (chưa đổi nameserver): Cloudflare quét bản ghi; đối chiếu với bảng trên + danh sách xuất từ vclouddns; đặt `adsplan`, `mail`, các bản ghi email là DNS only.
2. **Đổi nameserver** tại nhà đăng ký tên miền sang 2 nameserver Cloudflare cấp. Trong lúc lan truyền, bản ghi vẫn trỏ Vercel → không gián đoạn.
3. Khi zone `Active`: **đóng băng phát hành Vercel** và **tắt cron Vercel** của A (tránh chạy 2 lần).
4. **Deploy B**: `wrangler deploy --env production --domain app.theanhmarketing.com` (bản `.open-next` đã build).
5. **Deploy A**: build lại với `CF_ATTACH_PRODUCTION_DOMAINS=1` (bật cron + gắn `theanhmarketing.com`, `www.theanhmarketing.com`) rồi `wrangler deploy --config dist/server/wrangler.json`. Worker A tự chuyển `theanhmarketing.com` → `www` (307) như Vercel.
6. **Kiểm tra ngay**: trang chủ, 5 landing `/academy/*`, `/khoa-hoc`, đăng nhập, `/learn`, CRM, tạo 1 đơn thử, QR, email chờ thanh toán, mở App B từ A, `app.theanhmarketing.com/login`. Webhook SePay/Resend không cần đổi URL (cùng tên miền) — theo dõi đơn thật đầu tiên chuyển sang `paid`, email, Telegram.
7. **Theo dõi 24–48 giờ**: log Worker, đơn mới, cron 01:30/02:00/10:05/16:45/17:10/17:30/18:20 UTC.
8. Dọn: gỡ mục thử `https://theanh-student-cf-production…workers.dev/**` khỏi Supabase B Auth nếu không cần.

Học viên App B sẽ phải đăng nhập lại App B một lần (cookie mới ký bằng secret phiên mới). Học viên website A giữ phiên (Supabase A không đổi).

## Quay lui

- Trong vài phút: gỡ Custom Domain khỏi 2 Worker và tạo lại bản ghi `@`/`www`/`app` trỏ Vercel như bảng trên (Vercel vẫn còn bản production `9fcf0d2` cho B và bản hiện tại cho A); bật lại cron Vercel.
- Nếu cần: đổi nameserver về vclouddns (lan truyền chậm hơn).
- Dữ liệu không cần khôi phục (vẫn ở Supabase).

## Danh sách cần anh duyệt / làm (gom một lần)

1. Xuất toàn bộ bản ghi DNS từ trang quản lý vclouddns (anh làm, hoặc cho em đọc bằng trình duyệt).
2. Thêm zone `theanhmarketing.com` vào Cloudflare và đối chiếu bản ghi.
3. Đổi nameserver tại nhà đăng ký sang Cloudflare (anh làm — cần đăng nhập nhà đăng ký).
4. Bổ sung Secret còn thiếu: A (`GOOGLE_SHEETS_WEBHOOK_URL`, `SEPAY_WEBHOOK_SECRET`, `CRON_SECRET` mới…), B (`ADS_META_*`, `ADS_META_TOKEN_KEY` cũ).
5. Chọn giờ chuyển (đề xuất 22:00–23:00 giờ Việt Nam, ít đơn), đóng băng Vercel + tắt cron Vercel.
6. Deploy B rồi A gắn tên miền, kiểm tra theo bước 6.
7. Quyết định 11 file chưa commit trong thư mục phát hành cũ của A.
8. (Sau) Xóa các file khóa `~/Documents/key.rtf`, `~/Documents/Không có tiêu đề.rtf`, iCloud `Khóa SEpay Bot.rtf`.


## Cập nhật 18/10 — 17:24 VN: bản phục hồi thanh toán đã lên preview

**IN PROGRESS — chưa chuyển domain/cron, chưa LIVE hosting Cloudflare.** A source `3aefbb4`, Worker version `c1d1dd8e-c31e-40df-8153-1d4d6fb9b454`; giữ assets cũ 86400 giây, 38 secret và binding B. B source/runtime không đổi. Domain Workers chính0, lịch Workers rỗng, Vercel cron vẫn Enabled; Supabase vẫn writer/Auth/Storage và B còn cầu Blue tạm.

81 test liên quan,13 realPGclone,8 actual Workers HTTP+PGclone (Auth/B/Resend fixtures),4 cron artifact đạt. Sau deploy:11 kiểm hosted auth/parser/cron-denial và12 private Ebook/Range/hash đạt; refresh đúng URL bài học giữ trạng thái QA hoàn thành. B lỗi không chặn email/quyền học A, retry tiếp tục B riêng; B phải xác nhận JSON write đúng identity. Chưa có thanh toán ngân hàng thật trong kiểm thử.

Anh đã duyệt riêng bật retry SePay; mở lại webhook active thấy checkbox1, URL `https://www.theanhmarketing.com/api/sepay/webhook` giữ nguyên, không gửi thử giao dịch thật. Read-only gần17:24VN: paid thiếu email24h0, receiptGreen pending0, checkout gần2h0. Đây là snapshot, phải đọc lại trước cutover.

Email hướng dẫn Safari đã được máy chủ nhận thư chấp nhận (delivered); **chưa có kết quả iPhone thật**. Không dùng Chromium thay Safari. Đang chờ kết quả thiết bị trước khi đánh dấu READY và thực hiện gói chuyển domain/cron đã duyệt. Meta được hoãn; báo cáo Ads baseline không đủ snapshot vẫn phải báo lỗi, không giả dữ liệu.

Rollback: không tắt/xóa Green khi receipt pending; Blue không hiểu receiptGreen. Giữ Source writer và endpointGreen để đối soát/tiếp tục từng đơn; không reset paid/receipt hoặc gỡ unique index. B profile write không chứng minh mọi nhóm truy cập B: hiện slug khóa A và access-group B khác nhau; giữ hợp đồng baseline, không tự cấp quyền sản phẩm khác.

Chi tiết: `main/docs/SEPAY_FULFILLMENT_RECOVERY_20261018.md`, receipts `main/reports/cloudflare-handoff-20261018/{payment-preview-readback,payment-recovery-validation,sepay-retry-readback}.json`.


### GO hosting 18/10 sau xác nhận Safari của chủ hệ thống
Anh trả lời trực tiếp: “Đã thử, cả bốn mục đều đạt” cho video, chuyển bài/refresh, Ebook và đăng nhập App B trên Safari iPhone. Đây là owner-reported device evidence. SePay retry đã bật/đọc lại; A source3aefbb4 đã preview c1d1dd8e, 81test và kiểm tra sau phát hành đạt. Áp dụng gói chuyển đã duyệt: backup DNS11records, build A bằng script bắt buộc với attach1, source preflight cả hai; tắt/đọc lại Vercel cron trước Workers trigger, chuyển B rồi A. Kiểm production sau từng domain; lỗi critical phải quay lui theo bản ghi cũ. Không chuyển writer/Auth/Storage hoặc ngừng Bluebridge/Supabase.


### Điều chỉnh cơ chế DNS sau lỗi100117 (18/10)
Custom Domains từ publicAPI, Wrangler và legacy domains/records đều từ chối CNAME đang tồn tại. Không lặp lại hoặc xóa bản ghi tạo khoảng NXDOMAIN. Dùng exact-host Worker Routes theo tài liệu https://developers.cloudflare.com/workers/configuration/routing/routes/: B app.theanhmarketing.com/*, A apex/* và www/*, đúng zone theanhmarketing.com. Giữ bản ghi DNS cũ, deploy route trước khi bật proxied=true; do record vẫn DNS-only nên route chưa nhận lưu lượng trong lúc chuẩn bị. Artifact guard đổi từ exact custom-domain sang exact host+zone route, thêm kiểm phủ định wildcardhostname/Adplan/zonekhác; không nới native/Storage/secret/monitoring gates. Rollback về DNS-only trên đúng record đã snapshot và gỡ route; giữ Green nếu receiptpending và giải quyết từng đơn. Vercel cron chỉ bật lại sau khi xác nhận Workers schedulesOFF.
