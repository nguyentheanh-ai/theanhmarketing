# Tiếp nhận A/B ngày 18/10/2026

Trạng thái: **IN PROGRESS — chưa READY FOR CUTOVER**. Phạm vi hiện tại là chuyển hosting sang Workers, giữ Supabase A/B làm nguồn dữ liệu. App B là AdsMind/resource app riêng; LMS `/learn/*` thuộc A. Không dùng bằng chứng local/D1 cũ để kết luận đã bỏ Supabase.

## Đã đọc và đối chiếu

Đã đọc HANDOFF_TO_CODEX_20261018.md, CUTOVER_DAY_A_B.md, CLOUDFLARE_PRODUCTION_CUTOVER.md và tài liệu cutover B. Git status/log/remote ngày 18/10 xác nhận:

| Root | Branch | HEAD | Worktree khi tiếp nhận |
|---|---|---|---|
| `_cloudflare-migration/main` | `codex/cloudflare-staging-main-20261013` | `1734c82` | sạch |
| `TheAnh-Web/worktrees/b-cf-production-20261017` | `codex/b-cf-production-20261017` | `0dd71b4` | sạch |
| `TheAnh-Web/worktrees/b-dual-provision-secret-20261016` | `fix/b-dual-provision-secret-20261016` | `4cd331e` | sạch |
| `TheAnh-Web/worktrees/student-app-production` | `main` | `e379a08` | sạch; GitHub main cùng SHA |
| `TheAnh-Web/worktrees/theanhmarketing-email-account-hotfix` | `codex/production-canonical-20260826` | `43cee59` | 11 file tracked đã sửa; không đụng tới |

Vercel API theo domain: A production `dpl_9CRgmS18JCQzhQ6LzsKiE6vVx8QA` READY; metadata không có commit nên không chứng nhận SHA live A từ API. B production `dpl_BQHSDjLaXTFAGy5ZV8mKmrpzPaRb` READY với SHA `9fcf0d2d1764537af87533054ff778b440b18925`; deployment B mới nhất `dpl_D1iGLcbuxWsys1GMVW8QsoaFRKep` BLOCKED. Không suy ra nguyên nhân BLOCKED khi chưa có bằng chứng.

Cloudflare API: A version `5b8d0010-143a-4c8d-ab3e-89fad5c9c264` 100%; B version `7cad84f3-5650-4399-b0a6-1b9eebee4eff` 100%. Không custom domain, không scheduled triggers ở cả hai Worker. A native gates disabled, B off, cohort rỗng; A Service Binding STUDENT_APP trỏ đúng B production Worker. Đây là Worker thử có tên production, chưa phục vụ domain thật.

## Sai lệch cần sửa trong runbook

1. Bàn giao ghi artifact A production cuối đã build; thực tế lúc tiếp nhận `dist/server/wrangler.json` có name **theanh-main-cf-staging**, thiếu Service Binding. Đã build lại bằng đúng `scripts/build-cloudflare-production.sh`, CF_ATTACH_PRODUCTION_DOMAINS=0. Build đạt; artifact nay là `theanh-main-cf-production`, STUDENT_APP đúng B, không domains/cron, private delivery false, native gates tắt. Chưa deploy. Không tái dùng artifact mà không kiểm tra ngay trước deploy.
2. Danh sách khóa của runbook cũ thừa SEPAY_WEBHOOK_SECRET/CHECKOUT_ABUSE_HMAC_KEY (không có consumer ngoài script nhập). Không coi tên secret tồn tại trên Worker là bằng chứng giá trị đúng; handoff đã ghi một số còn placeholder.
3. **RESEND_WEBHOOK_SECRET cần xác minh thêm.** Worker A chưa có tên này. Code có thể đọc signing secret qua Resend API khi không cấu hình, nhưng quyền của API key thực tế chưa được kiểm chứng. Email gửi thành công không chứng minh webhook đo lường nhận được. Cần key ký hiện tại, hoặc bằng chứng GET webhook bằng key hiện dùng; không tự tạo/đổi webhook.
4. **Chuyển B trước A cần tương thích secret cũ.** Worker B hiện chỉ có provision secret mới, không NEXT. A Vercel vẫn dùng secret cũ. Khi app domain sang B mới nhưng A chưa sang Workers, đăng nhập/cấp quyền từ A cũ có thể 401. Cần B chấp nhận cả cũ/mới trước khi chuyển; để giữ cookie cũ, cấu hình B PROVISION_SECRET=cũ, NEXT=mới dùng chung A Worker, SESSION_SECRET=khóa ký Worker hiện tại. Giá trị cũ cần lấy qua kênh file được duyệt; không đọc file môi trường khác theo suy đoán. Nếu không có khóa cũ, dừng kế hoạch liên tục này và trình phương án có tác động đăng nhập rõ ràng, không hứa không gián đoạn.
5. **Rollback A/B phải phối hợp.** Ghi lại A/B Vercel deployment READY, DNS đầy đủ, trạng thái cron và cặp secret trước thao tác. B cookie ký bằng session secret mới có thể không được Vercel B cũ chấp nhận sau rollback; kiểm thử và báo rõ yêu cầu đăng nhập lại, không reset tài khoản. Gỡ riêng B trong khi A Worker còn dùng secret mới có thể hỏng A→B.
6. Registry hiện chỉ cho production ở release roots Vercel cũ, chưa đăng ký hai root Workers. Doctor A báo 11 file dirty; doctor B trong sandbox lỗi DNS GitHub, sau đó git ls-remote với mạng được phép xác nhận main e379a08. Chưa production preflight; không bỏ guard hoặc đổi permission để lách lỗi. Quyết định release roots Workers phải nằm trong lần duyệt cutover.
7. Chưa chứng minh cơ chế tắt/bật cron Vercel bằng API/UI và đọc lại. Không coi ghi bước 'tắt cron' là đã hoàn thành. Chỉ bật cron Cloudflare sau khi xác minh cron Vercel đã ngừng; rollback kiểm thứ tự ngược lại.
8. A observability trong config tắt; cần cách theo dõi lỗi/cron/webhook đã kiểm chứng trước khi chuyển. Không ghi payload, cookie, token hoặc query nhạy cảm vào logs.

## DNS và khóa — chỉ kiểm tra

DNS công khai hiện NS sapa.vclouddns.com/laocai.vclouddns.com; apex A 216.198.79.1; www CNAME 02a6b1bed5462f9d.vercel-dns-017.com; app/adsplan CNAME cname.vercel-dns.com. Cloudflare account không có zone theanhmarketing.com. `reports/cloudflare-handoff-20261018/dns-observed.json` chỉ là mẫu DNS công khai, **không thay thế bản xuất zone đầy đủ** từ nhà quản lý. Chưa đổi nameserver/DNS. Giữ adsplan và mail/DKIM/SPF/DMARC, kiểm DNSSEC trước chuyển.

Đọc riêng ~/Documents/key.rtf bằng textutil vào bộ nhớ, không in giá trị: bảy khóa được yêu cầu trong handoff chưa có trong file. Các khóa bổ sung về compatibility/Resend cũng chưa có. Không tạo/đổi/xóa secret ở lượt tiếp nhận này.

## Kiểm chứng mới

- Build A bằng script production bắt buộc: PASS (chưa attach domains).
- 13 test A về Service Binding và cron parity: PASS.
- 12 test B về dual provision secret và cookie rotation: PASS; không suy ra đã cấu hình compatibility trên Worker từ test local.
- 3 test mới chặn nhầm artifact staging/URL/binding/gates/domain/cron: PASS. Build bắt buộc nay gọi verifier trước khi báo thành công; build local cả chế độ attach và không attach để kiểm schema thực. Trước bàn giao giữ artifact không attach, chưa deploy.
- Không tạo đơn mới, không gửi email, không đổi webhook, không ghi dữ liệu thật trong lượt này.

## Một lần duyệt để tiếp tục

Chủ hệ thống duyệt trọn gói theo các điều kiện dừng, không coi duyệt là bỏ qua test:

1. Nhận khóa còn thiếu qua key.rtf và đặt đúng Worker bằng Wrangler secret put qua stdin; tạo CRON_SECRET riêng A/B và TELEGRAM_REPORT_SECRET. Bật ADS_META_ENABLED với API version tương thích đã kiểm. Giữ nguyên giá trị META_APP_SECRET của A. Xác minh signing secret Resend. Chuẩn bị dual-secret A/B trước cutover.
2. Chấp nhận tạo ADS_META_TOKEN_KEY mới **chỉ khi không lấy được khóa cũ**, giữ dữ liệu token cũ và báo rõ các kết nối Meta cần kết nối lại; không tự xóa kết nối.
3. Đọc/xuất toàn bộ DNS từ vclouddns qua phiên đăng nhập của chủ hệ thống; thêm zone Cloudflare, đối soát và đổi nameserver khi đầy đủ. Giai đoạn này bản ghi website vẫn trỏ Vercel; adsplan/email giữ nguyên.
4. Cho phép phát hành đúng hai root Workers nêu trên bằng quy trình release được kiểm; deploy kiểm thử không domain trước, chỉ gắn domain khi toàn bộ điều kiện đạt. Tắt cron Vercel có đọc lại, bật cron Workers một lần. Webhook giữ URL hiện có; mọi chỉnh sửa provider nếu phát hiện cần thiết phải cụ thể, không tự xoay webhook/key.
5. Kiểm thử bằng tài khoản QA: đơn thử không thanh toán, email thật chỉ gửi đến chủ hệ thống/QA; kiểm đăng nhập A→B, lesson URL cũ, tiến độ QA, quyền, QR/ngân hàng, CRM và Meta. Không tạo giao dịch ngân hàng thật. Theo dõi 24–48h và rollback đồng bộ nếu lỗi cốt lõi.
6. Mốc đề xuất: 22:00–22:45 ngày 20/10/2026 giờ Việt Nam **chỉ khi** nameserver/zone đã ổn định và đủ điều kiện. Nếu trễ, chọn lại mốc, không tự chuyển gấp.

11 file cũ chưa commit và xóa file khóa xử lý riêng sau chuyển; chưa có quyết định gộp/xóa. Giai đoạn 2 vẫn cần đồng bộ D1 mới, Auth/RLS/admin/CRM/Storage và kiểm chứng bỏ Supabase đầy đủ.

Tham khảo hiện hành: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ và https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/ .
