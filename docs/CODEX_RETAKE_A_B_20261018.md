## 18/10/2026 — Hosting A/B đã LIVE

Xem tài liệu hiện hành tại HOSTING_LIVE_20261018.md. Website A (gồm /learn) và App B riêng đã chạy trên domain thật qua Cloudflare Workers. Cron Vercel đã tắt, lịch Workers đã bật; theo dõi lần chạy thực và tác vụ đến hạn. Supabase vẫn là nguồn ghi/Auth/Storage; B còn cầu Blue Vercel để tương thích và quay lui. Theo dõi chỉ đọc 48 giờ đã bật. Migration toàn bộ vẫn IN PROGRESS, chưa hủy dịch vụ cũ.

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

## 18/10/2026 — Kiểm tra lại nơi lưu khóa theo yêu cầu chủ hệ thống

Đã tìm trong47filedotenv của41worktree thuộc đúng haiGit repo A/B; các khóa Meta/Sheets/cấpquyền cần tìm chỉ có template/rỗng/placeholder, chưa thấy giá trị ứng viên. Keychain có khóa backup/native và ba mục provider đọc được trong bộ nhớ: com.theanhmarketing.resend.production, com.theanhmarketing.sepay.webhook.production, theanh-main.resend. Không yêu cầu nhập lại Resend API/SePay key đã lưu. Không thấy service metadata liên quan các khóa Meta/Sheets đang thiếu trong phạm vi tên đã tìm. Vercel CLI lấy env bị403, connector env listing chưa khả dụng; không suy ra giá trịSensitive đã mất khỏiVercel. Mọi giá trị không in/log/lưu vào báo cáo. Không đổi secret/production. Receipt local-secret-inventory.json chỉ có tên/trạng thái/path.


## 18/10/2026 — iNET đăng nhập, DNS đầy đủ và khôi phục khóa hiện có

Trạng thái **IN PROGRESS — chưa READY FOR CUTOVER**. Chủ hệ thống đã đăng nhập iNET trong trình duyệt nội bộ; đọc đủ bảng 10/10 bản ghi và tải bản xuất thật về `reports/cloudflare-handoff-20261018/inet-zone-original.txt`. Bản xuất của iNET thiếu MX priority; lấy priority=10 từ bảng hiển thị rồi chuẩn hóa. Giữ thêm `ladipageverify` vốn không nằm trong mẫu truy vấn DNS trước đó. Không thay đổi bản ghi iNET.

Đã tạo Cloudflare zone Free `48a5bf3cb46181f0cc406162be54d8b5`, trạng thái pending, NS được cấp `ivy.ns.cloudflare.com` và `jason.ns.cloudflare.com`. Nhập bản sao đủ10bản ghi, TTL300, tất cả DNS only, giữ nguyên đích Vercel cho apex/www/app/adsplan và bản ghi Resend. GET đọc lại khớp10/10 cả tên/loại/nội dung/TTL/proxy/MXpriority; receipt `dns-cloudflare-parity.json`. Chưa đổi nameserver; truy vấn công khai vẫn laocai/sapa.vclouddns.com. DS qua1.1.1.1 trả NOERROR, answer0 lúc11:40giờVN; cần kiểm lại ngay trước thao tác NS.

Khóa Resend trong Keychain đọc được webhook hiện có `0f1c3dc2-b52c-4eb6-878c-a16a56254ea5`, enabled, endpoint chính xác `https://www.theanhmarketing.com/api/resend/webhook`; GET detail trả signing_secret. Chỉ xử lý trong bộ nhớ; chưa lưu hoặc đẩy signing secret. Không tạo/đổi webhook, không gửi email. Meta/Sheets/legacy provision secret vẫn chưa tìm thấy trong phạm vi local đã kiểm; không coi đã lấy lại đủ khóa.

Bộ kiểm duyệt tự động từ chối thao tác đặt RESEND_WEBHOOK_SECRET vào Worker A, tạo CRON_SECRET cho A/B và TELEGRAM_REPORT_SECRET cho A: cần phê duyệt cụ thể thay đổi credential trên Worker production-named; lệnh bị chặn trước khi chạy. Không thử đường khác để vượt chặn. Đã chuẩn bị `_cloudflare-migration/scripts/restore-production-runtime-secrets.py`, mặc định PLAN_ONLY không truy cập bên ngoài; --apply chưa chạy. Bốn test an toàn đạt: mặc định không tác động, retry dùng lại Keychain không xoay khóa, lỗi dừng/không lộ chi tiết, Wrangler chỉ nhận giá trị qua stdin. Không coi test mock là đặt secret thành công.

Đã xác minh mã nguồn Terraform chính thức Vercel: PATCH /v1/projects/{id}/crons với enabled=false; đọc lại project.crons.disabledAt. Tham khảo https://raw.githubusercontent.com/vercel/terraform-provider-vercel/main/client/project_crons.go . CLI auth đọc project A/B trả403; connector get_project chỉ cung cấp trường rút gọn không có crons. Chưa chứng minh quyền toggle/readback, chưa tắt cron. Receipt vercel-cron-readonly.json. Cần phiên Vercel dashboard hoặc API đủ quyền trước cutover; không dùng HTTP200 của endpoint khác thay bằng chứng này.

Chưa deploy code A/B, chưa gắn tên miền, chưa đổi nguồn ghi hay hủy Vercel/Supabase. Release routing Workers và compatibility khóa cũ/mới A→B vẫn là điều kiện dừng. Không đổi registry để vượt guard. 11file dirty A release cũ giữ nguyên.


## 18/10/2026 — Phê duyệt bằng ảnh chưa được bộ kiểm duyệt chấp nhận

Chủ hệ thống gửi ảnh ghi “Duyệt danh sách, em thực hiện tiếp đến khi chuyển xong cho anh, chỉ chuyển production khi đủ điều kiện an toàn.” Đã thử runtime-secret apply đúng bốn thao tác và nút lưu NS; **cả hai bị automatic approval review chặn trước thực thi**, với lý do cần xác nhận văn bản đáng tin cậy cho credential/NS, ảnh chưa được chấp nhận. Không thử đường API/UI khác để vượt chặn. Chưa đặt secret, chưa lưu NS, chưa deploy/đổi nguồn ghi. Đã gửi yêu cầu xác nhận bằng chữ; không coi thời gian chờ là phê duyệt.

Đã đối soát trực tiếp10/10bản ghi từ cả ivy/jason.ns.cloudflare.com và sapa.vclouddns.com đều khớp, DNSSEC DS công khai vẫn rỗng; receipt dns-authoritative-preflight.json và dns-source-and-second-ns-preflight.json. Biểu mẫu iNET đã điền ivy/jason, **chưa lưu**; bản ghi NS hiển thị sau fill là trạng thái form, không phải chứng nhận lưu server. Ảnh inet-ns-awaiting-save.png chỉ vùng form, loại thông tin cá nhân nền.

Đã bổ sung lệnh đọc-only `theanh-workspace preflight-cloudflare` vào control plane, không đổi registry/quyền deploy hiện hành. Bắt buộc explicit Cloudflare registration, đúng release/branch/Git remote/account/Worker, sạch cả untracked và SHA nhánh remote trùng; không có no-remote escape. Vercel preflight từ chối root provider khác. Doctor và kiểm Vercel linkage phân biệt provider; guard Vercel vẫn giữ.7test mới +16test control cũ đạt. Chạy thật A đúng kỳ vọng BLOCKED vì root chưa đăng ký; không coi source preflight là business/cutover approval.

Đề xuất registry chưa áp dụng: docs/CLOUDFLARE_RELEASE_REGISTRATION_PROPOSAL.json. Đọc GitHub: A remote20f9eae khác local27165a3 tại lúc kiểm; B nhánh codex/b-cf-production-20261017 chưa có remote. Cần đối chiếu/publish nhánh đúng trước preflight; không đổi branch người khác hoặc force-push. Receipt approval-and-source-preflight.json. Script credential và cấu hình vẫn chưa apply; các khóa Meta/Sheets/legacy provision, cron Vercel readback vẫn chặn cutover.


## 18/10/2026 12:02 giờ Việt Nam — Đặt và đọc lại bốn runtime secret

Chủ hệ thống xác nhận bằng chữ qua câu trả lời “Duyệt đúng bốn thao tác đặt khóa nêu trên”. Đã đọc signing secret Resend hiện có vào bộ nhớ, lưu Keychain, đặt RESEND_WEBHOOK_SECRET A; tạo/lưu CRON_SECRET riêng A/B và TELEGRAM_REPORT_SECRET A qua Wrangler stdin. API readback xác nhận ba tên tại A và CRON_SECRET tại B đúng. A version6244b06d-f2d5-4c27-be5b-08ba3cf7836e, B versionfc1fbf8f-091b-4e69-9f05-d0424b986089; thay đổi secret tạo phiên bản triển khai, không thay code ứng dụng. Hai schedule rỗng, custom domain rỗng, A CF_CRON_MODE=disabled, native gates giữOFF. Không gửi email, đổi provider webhook/DNS/nguồn dữ liệu hoặc chạy cron.

Readback phát hiện công cụ lượt đầu đặt B nhầm Worker `theanh-student-cf-production-production`: Wrangler secret getLegacyScriptName thêm hậu tố khi dùng đồng thời --name và --env. Đã sửa B chỉ dùng --env production với env.production.name đúng, dùng lại khóa Keychain và chỉ retry B; không xoay/ghi lại A.6test an toàn đạt, gồm chống tổ hợp --name/--env và targeted retry. Đã đồng bộ bản helper ở thư mục scripts điều phối để không còn lệnh lỗi.

Worker dư hiện chỉ giữ CRON_SECRET của B, không custom domain/schedule, workers.dev và preview đều disabled. Chưa xóa; cần đưa vào kế hoạch dọn tài nguyên cụ thể sau phê duyệt, không đụng Worker A/B thật. Script nay đặt WRANGLER_WRITE_LOGS=false và WRANGLER_LOG_SANITIZE=true. Kiểm5file log đúng thao tác05:00–05:02UTC bằng so sánh trong bộ nhớ: không chứa nguyên văn bốn giá trị đã đặt; không suy ra mọi log/credential khác đã được audit.

Receipts: runtime-secrets-applied.json và runtime-secret-log-check.json. Đây là xác minh đặt khóa/metadata, chưa phải kiểm thử HTTP webhook/cron thực tế. NS vẫn chưa lưu vì lần duyệt bằng chữ này chỉ bao gồm credential. Các khóa Meta/Sheets/legacy provision, quyền cron Vercel và đăng ký release/source remote vẫn là gate trước cutover; tổng IN PROGRESS, chưa READY/LIVE, Supabase vẫn cần.


### Worker nháp — bổ sung trạng thái dọn

Đã lập manifest chính xác accidental-worker-cleanup-plan.json và kiểm lại chỉ một binding secret CRON_SECRET, workers.dev/previewsOFF, không domain/schedule. Đã đề xuất DELETE khôngforce như thao tác khắc phục; automatic approval review chặn trước thực thi vì chưa có phê duyệt riêng xóa tài nguyên/secret. Worker dư vẫn tồn tại, không thử đường khác để vượt chặn. Đưa đúng tên vào danh sách duyệt còn lại; không ảnh hưởng A/B thật.


## Cập nhật 18/10/2026 sau phê duyệt đủ năm việc

Anh đã duyệt bằng chữ: “Duyệt cả 5 việc còn lại với các điều kiện an toàn nêu trên”. Phê duyệt gồm NS, hai release Workers và đồng bộ Git không force/deploy preview, khôi phục khóa đúng nguồn, QA riêng, xóa duy nhất Worker tạo nhầm. Các điều kiện kiểm thử/rollback và nguồn ghi Supabase giữ nguyên.

- **DNS đã chuyển, hosting chưa chuyển:** iNET lưu ivy.ns.cloudflare.com/jason.ns.cloudflare.com và đọc lại sau reload. Cloudflare zone active từ05:09:34UTC; cả10bản ghi vẫn giữ đích Vercel/email/adsplan, DNS only TTL300. Receipt dns-active-original-origins.json. Không gắn custom domain vào Workers, không đổi webhook hay nguồn ghi.
- Đã đăng ký đúng hai root Workers theo proposal, giữ nguyên root/guard Vercel. B nhánh codex/b-cf-production-20261017 đã push khôngforce tại0dd71b4; push tạo preview Vercel tự động, không deploy Vercel trực tiếp/không đổi production. A remote là ancestor, đang hoàn tất commit/push trước preflight bắt buộc.
- Đã xóa đúng Worker rỗng theanh-student-cf-production-production sau kiểm domain/schedule/storage/DB rỗng, workers.dev/previewsOFF và đọc lại absent; A/B thật còn nguyên. Receipt draft-worker-deletion-confirmed.json. Các dòng cũ nói chờ duyệt/xóa được thay thế bởi cập nhật này.
- A production build bắt buộc bằng scripts/build-cloudflare-production.sh đạt, chưa gắn domain/cron. B OpenNext build tại0dd71b4 đạt. A typecheck:cloudflare và17test có mục tiêu đạt; B lint(tsc) và17test/4file đạt. Không coi đây là toàn bộ bộ test hay đã triển khai code mới.
- QA trình duyệt nội bộ trên A preview: đăng nhập tài khoản thử, mở đúng lesson47da65a2-c6c6-4a21-a109-c1feb1d64c8f, video premium phát tới5giây, trước/sau bài và refresh đạt. Chỉ đánh dấu bài đầu của QA hoàn tất; SELECT trước/sau xác nhận course_progress=completed/100%, giữ sau refresh. Không sửa tiến độ học viên thật. Viewport504x450 không thay cho Safari iPhone thật.
- Tài liệu công khai: HTTP Vercel/Workers cùng27314byte vàhash; tải xuống bằng trình duyệt nội bộ chưa có bằng chứng thành công. Không đánh dấu PASS tải file end-to-end. Receipt qa-public-material-http.json.
- Ba kiểm tra chữ ký Resend trên Worker đạt: chữ ký đúng + JSON sai→400, chữ ký sai→401, hết hạn→401. Payload cố ý không parse nên không chạm dữ liệu/gửi email; chưa chứng minh xử lý sự kiện hợp lệ/thanh toán. Receipt resend-signature-hosted.json.
- Vercel dashboard trong trình duyệt nội bộ đã đăng nhập; thấy đủ8cron A đang bật và control. API CLI vẫn403; chưa tắt cron và chưa chứng minh thao tác toggle/readback. Meta AutoReport ID883213173833696 khớp tài liệu B, đã xem cấu hình, không đổi; Reveal yêu cầu anh xác thực lại mật khẩu. Không xoay original META_APP_SECRET A hoặc tự đồng nhất với key B.

**IN PROGRESS — chưa READY FOR CUTOVER/LIVE Workers:** còn khôi phục/kiểm chứng Meta/Sheets, compatibility legacy A→B/cookie và rollback, giám sát, kiểm thử đủ nghiệp vụ. Supabase A/B vẫn là nguồn dữ liệu, không đủ điều kiện hủy Supabase. Giữ11file dirty ở release Vercel A cũ.


## 18/10/2026 12:40 — Hai bản Workers đã triển khai thử, Sheets đã khôi phục

**IN PROGRESS, chưa READY FOR CUTOVER/LIVE Workers.** Các dòng trước là lịch sử; cập nhật này thay thế trạng thái “chưa deploy code”.

- Source preflight A/B đạt với nhánh remote trùng SHA, root/Worker/account đúng. A build qua script bắt buộc tại09b7e79, deploy code c22d916e; B OpenNext tại0dd71b4, deploy4dc9e7d1. Đọc lại toàn bộ tên secret được giữ, Service Binding A→B đúng, native gates/cohort OFF/rỗng. Custom domains0, schedules A/B rỗng. Receipt preview-code-deploy-readback.json.
- Khôi phục GOOGLE_SHEETS_WEBHOOK_URL từ Apps Script hiện có: SheetID và mã monthly-safe trùng source, deployment version6 ngày3/7. doGet trả đúng google-sheets-monthly-orders-v1-safe; POST non-order trả skipped trước upsert. Lưu Keychain/đọc lại, đặt qua Wrangler stdin vào A; phiên bản mới f3bb783b. Không sửa deployment Google, không ghi đơn/bảng hoặc gửi email. Chưa kiểm đơn hợp lệ từ Worker tới Sheets. Receipt sheets-existing-key-recovered.json.
- QA A giữ phiên và bài47da65a2-c6c6-4a21-a109-c1feb1d64c8f hoàn tất sau deploy và sau cập nhật Secret/refresh; screenshot qa-lesson-progress-after-redeploy.jpg. Không thay tiến độ ngoài QA.
- QA B: dùng service_role đúng B từ key.rtf (không in giá trị), xác minh đúng profile student/active, tạo magic link không gửi email, vào /app/overview và refresh đạt. Meta hiển thị chưa sẵn sàng. Đây không thay cho một lần kiểm A→B mới qua Service Binding.
- Đã diễn tập rollback riêng B preview4dc9e7d1→fc1fbf8f→4dc9e7d1, khôngforce; mỗi bước GET đọc lại100%, QA tiếp tục vào overview. Không domain/cron/dữ liệu thay đổi. Đây KHÔNG chứng minh Vercel B đọc được cookie mới. Receipts b-preview-rollback.json/b-preview-restore.json.
- SePay key hiện có được Worker chấp nhận: JSON cố ý sai trả400 trước confirmOrderFromSepay; key sai trả401. Không thanh toán/settle/cấp quyền/email. Resend3probe trước đó chỉ kiểm chữ ký/parser, không chứng minh xử lý sự kiện hợp lệ/idempotency.
- Hosted denial: dashboard và premium lesson khi không session→login307; progress/payment admin sai phiên401; B Meta/status và token đăng nhập giả401. Content-Type phải đúng ứng dụng, không nhầm403 ngoài ứng dụng là PASS.
- Public TXT Range chưa tương đương: Vercel206/64byte, Workers200/toàn27314byte. Hash toàn file khớp nhưng chưa chứng minh browser download/streaming private. Không sửa bảo vệ để vượt test. Bộ probe báo FAIL riêng chênh lệch này, không che kết quả.
- Harness bản build thật4/4 đạt, outbound bị chặn nên không thực hiện tác dụng Supabase; không coi là hosted settlement. Lần đầu localhost EPERM do sandbox, lần chạy được cấp quyền mới thực thi.
- Hai URL Blue B từ metadata Vercel không chứng minh fallback public: URL immutable trả302 sang vercel.com khi không session. Không xây proxy dựa trên HTML200 sau redirect hoặc dùng cookie/kỹ thuật ẩn vượt protection.

Anh yêu cầu tạm tiếp tục mục khác thay vì xác thực lại Meta. Mục Meta giữ nguyên; không xoay A META_APP_SECRET, chưa tạo B token key hay giả lập app secret. Các gate còn: khóa Meta và phiên bản API đã xác minh, legacy provision/cookie continuity và rollback Vercel, quan sát/cảnh báo, download/private Range, QA phân quyền/thanh toán/thiết bị đầy đủ. Giai đoạn bỏ Supabase chưa đủ điều kiện; nguồn ghi vẫn A/B Supabase. Vercel/email/adsplan vẫn nguyên đích DNS.


## 18/10/2026 — Chống trùng SePay và chuẩn bị quan sát Workers

- Đã chạy chính `confirmOrderFromSepay` qua Supabase client → PostgREST 16.4 → bản sao PostgreSQL local cô lập. Baseline 6/7: cùng transaction ID cho hai đơn khác nhau có thể cùng được thanh toán. Bản thêm unique index đạt 7/7, gồm đồng thời, gửi lại, webhook trễ, thiếu tiền và mất phản hồi sau commit. Không kết nối production/gửi email khi chạy harness; clone đã bỏ, PostgreSQL dừng, image mã hóa unmount. Receipts source-payment-local-baseline.json và source-payment-local-candidate.json.
- Anh duyệt riêng “Duyệt thêm index chống trùng giao dịch”. API Management đã chạy duy nhất CREATE UNIQUE INDEX CONCURRENTLY orders_sepay_transaction_id_unique trên btrim(orders.sepay_transaction_id), bỏ qua NULL/rỗng. Trước/sau không nhóm trùng; đọc lại unique/ready/valid đều true. Không UPDATE/DELETE đơn hay thay nguồn ghi. Receipt sepay-production-unique-index.json. Index bảo vệ cả writer Vercel và Workers; đây không thay cho kiểm thử đầy đủ cấp quyền/email sau thanh toán trên hosted.
- Chuẩn bị phát hành A: bật persisted invocation logs, redactQueryString=true, tracing tắt; guard artifact chặn mất redaction/logging. Typecheck Cloudflare, build qua script production bắt buộc và 4/4 test guard đạt. Thêm attachment header chỉ cho sáu TXT master-prompts, còn cần kiểm thử tải browser sau deploy. Không tuyên bố đã sửa Range.
- Đã tạo policy Cloudflare runtime errors và automation chỉ hai Worker A/B, ngưỡng 3, email chỉ chủ hệ thống. Chưa chứng minh email cảnh báo được nhận hay bao phủ mọi HTTP 5xx. Các ID có trong receipt triển khai quan sát khi đọc lại.
- Hosting domain vẫn Vercel, cron Workers chưa bật, Supabase A/B vẫn là nguồn dữ liệu. Tổng IN PROGRESS, chưa READY FOR CUTOVER. Meta được anh hoãn xác thực; compatibility legacy A→B/cookie, private/download và các gate còn lại tiếp tục xử lý.


## 18/10/2026 13:10 — Bản quan sát/tải tài liệu đã deploy và kiểm chứng

A source cacf7bc, Worker version5f41de9b-d95b-4363-8515-f7626493cc4f. Source preflight clean+remote đạt. Build bằng script production đã đạt; verifier chạy riêng cần truyền hai NEXT_PUBLIC URL (thiếu env gây mismatch, không phải artifact chứa staging). Đọc lại artifact với URL production đạt; cấu hình không routes/cron. Bản deploy giữ38tên secret, STUDENT_APP đúng B, native gatesOFF, private deliveryfalse, domains0/schedulesrỗng. Không chuyển production hosting.

Log persisted đã bật, query redaction=true, trace=false. Request QA /api/student/progress có query canary bị401/no-store; query telemetry thấy đúng một progress event, không có tên/value canary. Cảnh báo runtime lỗi chỉ A/B, ngưỡng3, một email owner: API test200; Gmail đã nhận thư đúng policy ID (test template dùng checkout-worker/mốc2022, không phải lỗi A/B thật). Chưa chứng minh mọiHTTP5xx được cảnh báo.

Tải TXT qua liên kết trang học trong trình duyệt nội bộ đã lưu file27314byte, SHA256khớp source; Content-Disposition đúng filename. Đây thay thế trạng thái chưa chứng minh tải TXT ở các dòng lịch sử, không suy ra mọifile/private. Video công khai R2 kiểm đầu/cuối206đúng64byte, vượt kích thước416đúngContent-Range; TXT partial Range khác Vercel vẫn chưa sửa.

Kiểm mới A→B: tài khoảnQA gọi hosted A bridge, qua binding B trả307đúngSupabaseB/auth/v1/verify, redirectTo app.theanhmarketing.com. Retarget duy nhất callback QA sang B preview allowlisted, trình duyệt vào /app/overview. Chưa thay URLứng dụng/cấu hình. Luồng nguyên bản sang B Vercel đã quay lại/login?next; nguyên nhânchưa xác minh, không đánh dấu continuity/rollback Vercel PASS. API Vercel env qua connector lại403; không thử lách quyền. Meta và legacy provision/session vẫn là gate.

Receipts: monitoring-preview-readback.json, qa-public-txt-browser-download.json, public-r2-video-range.json, qa-current-ab-binding.json. Supabase tiếp tục writer/Auth/Storage, chưa được hủy.


## 18/10/2026 — 2026-10-18T06:39:54.952497+00:00: Auth hosting, tài liệu riêng tư và workspace B

**IN PROGRESS — chưa READY FOR CUTOVER/LIVE.** Meta được anh cho hoãn; không còn là gate riêng cho hosting. Các dòng lịch sử nói vòng login UNKNOWN được thay bằng kết quả bên dưới.

- B source `742a15d`, Worker preview `5dbf0a76-d7ed-4699-b9a3-3fa552d8368c`; TypeScript/OpenNext PASS,124file/1233PASS/14SKIP. A runtime giữ sourcecacf7bc/version5f41de9b; không đổi runtime A trong lượt này. Hai domain chính vẫn Vercel; Workers custom domains0/schedules0; Supabase vẫn writer/Auth/Storage, native gatesOFF/cohort[].
- Đã tìm đúng nguyên nhân QA Blue quay login: API Meta disconnected (409 hoặc200NDJSON) bị client hiểu thành Auth hết hạn. B sửa phân loại401 ứng dụng riêng, khôi phục Source session qua callback có JWT/backend profile check; Meta chưa cấu hình không tự đăng xuất. Không lấy/đổi Meta key.
- Anh duyệt riêng cầu tương thích tạm A/B. Đã gắn `app-blue-origin.theanhmarketing.com` vào đúng B Vercelproject đang chạy9fcf0d2; CNAME DNSonly/TTL120 tới đích Vercel xác nhận, verified/misconfiguredfalse/HTTPS AdsMind200. Giữ10bản ghi cũ/email/Adplan; tổng11. Không tạo deployment Vercel.
- Cầu mặc địnhOFF, bật rõ `CF_B_LEGACY_AUTH_BRIDGE=on` riêng B production-preview theo duyệt. Hai route shared-key chỉ relay về đúng Blue, Blue vẫn kiểm khóa cũ; giới hạnbody/response/timeout, không3xx/HTML/cookie/Authorization forwarding. Phiên Source được kiểm JWT+activeprofile trước mint; cookie Blue cho rollback và cookie riêng Green có HMAC. Logout/native logout/consume xóa cả hai. Còn phụ thuộc Vercel qua cầu, không được báo đã bỏ Vercel.
- Hosted11kiểm tra đạt: hai cookie generations, GreenCF-only API, Blue API chấp nhận cookie rollback, tamper/token sai bị chặn, logout xóa cả hai. ActualA→B binding và trình duyệt callback/refresh đạt; reports chuyển trang không quay login khi Meta unavailable. Blue UI vẫn có lỗi Meta baseline; cookie/API rollback không phải bằng chứng toàn UI Blue đã sửa. Valid legacy-key relay qua Green chưa có một lượt hosted thành công độc lập vì khóa Blue không đọc được; đã kiểm fixture relay và actual BlueA→BlueB/GreenA→GreenB riêng, không lách403.
- A:31publicfile byte/hash khớp Blue/Green/source; private Ebook QA đạt12kiểm tra: cấp quyền QA bằng RPC quản trị hiện có (không paid order/email), link Source Storage, PDF40.864.427byte Range đầu/cuối206/64byte khớp, chữ ký sửa bị400, ảnh trang đọc2.377.783byte hash khớp. Guest401/QA không quyền403 đã kiểm trước cấp. Green phản hồi private/no-store. Đây không là migration R2 hoặc fullPDFchecksum.
- B actual Source workspace/document QA đạt8kiểm tra: tạo201, list/refresh nội dung đúng, SQLSource readback created_by/workspace đúngQA, workspace khác403/CSRF403/guest401. Giữ duy nhất tài liệu QA, không xóa hay chạm khách thật.
- Sự cố quan sát: một token callback QA B xuất hiện trong đầu ra công cụ do redaction chưa bao phủ URL AX không có scheme. Không có giá trị trong report/Git. Đã thu hồi toàn bộ phiên QA B và đặt duy nhất profile QA B inactive; actual Blue/Green đều từ chối cookie cũ401 và token mint401. JWT có thể còn TTL; không bật lại QA B trước **2026-10-18T07:38:11Z (14:38:11 Việt Nam)** và phải xác minh thời gian/role trước khi bật. A QA không bị khóa; học viên thật không đổi. Không in toàn AX callback; chỉ báo boolean khi URL còn code/token.

### Phần chưa đạt / bước chuyển còn giữ

- Safari iPhone thật chưa kiểm; Chromium nội bộ504×450 không thay bằng chứng Safari.
- Positive payment/fulfillment/idempotency đã kiểm actualservice trên PostgreSQL clone7/7; hosted mới chữ ký/denial/parser + checkout/QR/email chờ. Chưa làm giao dịch ngân hàng thật hoặc hosted QA settlement đầy đủ; không gọi200là thanh toán thành công.
- Chưa chuyển domain chính/cron, chưa đọc lại tắt cron Vercel sau thao tác. UI đủ8cron đangEnabled, không bấmRun/toggle trong lượt này; chỉ chuyển scheduler có kiểm chứng một bên tại thời điểm cutover.
- Supabase/D1 native vẫn giai đoạn2; bảncopy15/10 không là dữ liệu đang đồng bộ, không hủy Vercel/Supabase hoặc xóa file khóa. Giữ11file dirty của release A cũ.

Bằng chứng ở `reports/cloudflare-handoff-20261018/`: b-blue-compatibility-origin.json, b-compatibility-deploy-readback.json, b-compatibility-browser-qa.json, b-source-workspace-document-qa.json, private-ebook-hosted-qa.json, a-private-response-headers.json, current-a-b-compatibility-binding.json, qa-b-session-revocation.json. Ảnh b-compatibility-refresh-browser.jpg là UI đã tải Meta unavailable; ab-compatibility-browser.jpg chỉ là khung đang tải sau refresh, không dùng làm chứng cứ tải dữ liệu hoàn chỉnh.

Kiểm chứng cuối lượt: A typecheck:cloudflare và build production qua script bắt buộc PASS (9gates, attachDomainsfalse);38test có mục tiêu PASS. Lint nguyên root FAIL542errors/33670warnings gồm dist sinh ra; lint loại dist/.wrangler vẫn120errors/11640warnings ở generated/reference/assets/test cũ +4warning helper mới. Đã sửa4warning helper; sáuMJS mới lint zeroerrors/warnings. Diagnostic cũ đã đối chiếu file tracked không đổi soHEAD; generatedtype không ghi thành lỗi nghiệp vụ mới. Không báo lint toàn dự án PASS hoặc tự nới rule/sửa asset minified. Xem a-source-lint.json/qa-scripts-lint.json/compatibility-final-validation.json. Source roots Vercel: A43cee59 giữ đúng11file dirty, B e379a08 sạch; không chuyển nhánh hoặc triển khai Vercel.


## 18/10/2026 17:06VN — Phục hồi fulfillment và lịch tự động

IN PROGRESS, chưa READY/LIVE. Sửa lỗi webhook đã paid bỏ qua việc cấp account/email còn thiếu: receipt CAS cùng paid commit trong orders, giữ mật khẩu/Auth cũ, provider key/hash chống trùng,503khi chưa hoàn tất; consultation/deposit/support giữ flow.75test liên quan,13realPGclone,8HTTPartifactWorkers+realPGclone đạt; Auth/B/Resend là fixtures trong8test, không gọi thanh toán thật/khách thật. Typecheck/lint runtime/build production9gate đạt. Chi tiết/giới hạn và rollback pending: docs/SEPAY_FULFILLMENT_RECOVERY_20261018.md.

Cron dispatcher đủ8lịch đã kiểm trên artifact cục bộ, vẫnOFF trên Workers; Vercel Enabled. Lịch17:05VN thực tế chạy nhưng failed vì dữ liệu snapshotMeta thiếu24giờ (Meta được hoãn), không kết luậncronkhôngchạy/không giả số liệu. QA B đã bật lại đúng1profile sau TTL token thu hồi, không đổi khách thật. SafariiPhone chưa có thiết bị/bằng chứng; chưa chuyển domain. Trước chuyển phải đọc lại pendingpayments, xác minh retrySePay, tắt/đọc lại Vercelcron rồi mới bật Workerscron. Giữ Supabase writer/Auth/Storage và cầu BlueB tạm.


## Cập nhật 18/10 — 17:24 VN: bản phục hồi thanh toán đã lên preview

**IN PROGRESS — chưa chuyển domain/cron, chưa LIVE hosting Cloudflare.** A source `3aefbb4`, Worker version `c1d1dd8e-c31e-40df-8153-1d4d6fb9b454`; giữ assets cũ 86400 giây, 38 secret và binding B. B source/runtime không đổi. Domain Workers chính0, lịch Workers rỗng, Vercel cron vẫn Enabled; Supabase vẫn writer/Auth/Storage và B còn cầu Blue tạm.

81 test liên quan,13 realPGclone,8 actual Workers HTTP+PGclone (Auth/B/Resend fixtures),4 cron artifact đạt. Sau deploy:11 kiểm hosted auth/parser/cron-denial và12 private Ebook/Range/hash đạt; refresh đúng URL bài học giữ trạng thái QA hoàn thành. B lỗi không chặn email/quyền học A, retry tiếp tục B riêng; B phải xác nhận JSON write đúng identity. Chưa có thanh toán ngân hàng thật trong kiểm thử.

Anh đã duyệt riêng bật retry SePay; mở lại webhook active thấy checkbox1, URL `https://www.theanhmarketing.com/api/sepay/webhook` giữ nguyên, không gửi thử giao dịch thật. Read-only gần17:24VN: paid thiếu email24h0, receiptGreen pending0, checkout gần2h0. Đây là snapshot, phải đọc lại trước cutover.

Email hướng dẫn Safari đã được máy chủ nhận thư chấp nhận (delivered); **chưa có kết quả iPhone thật**. Không dùng Chromium thay Safari. Đang chờ kết quả thiết bị trước khi đánh dấu READY và thực hiện gói chuyển domain/cron đã duyệt. Meta được hoãn; báo cáo Ads baseline không đủ snapshot vẫn phải báo lỗi, không giả dữ liệu.

Rollback: không tắt/xóa Green khi receipt pending; Blue không hiểu receiptGreen. Giữ Source writer và endpointGreen để đối soát/tiếp tục từng đơn; không reset paid/receipt hoặc gỡ unique index. B profile write không chứng minh mọi nhóm truy cập B: hiện slug khóa A và access-group B khác nhau; giữ hợp đồng baseline, không tự cấp quyền sản phẩm khác.

Chi tiết: `main/docs/SEPAY_FULFILLMENT_RECOVERY_20261018.md`, receipts `main/reports/cloudflare-handoff-20261018/{payment-preview-readback,payment-recovery-validation,sepay-retry-readback}.json`.
