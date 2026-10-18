# Danh sách duyệt tiếp theo — A/B Cloudflare

Trạng thái: **CHỜ DUYỆT**, chưa thực hiện các thao tác dưới đây. Bộ kiểm duyệt tự động chặn credential apply vì yêu cầu migration chung chưa được coi là duyệt cụ thể thay đổi secret production. Không đổi phương thức để vượt chặn.

1. **Credential:** đọc signing secret hiện có của đúng Resend webhook `https://www.theanhmarketing.com/api/resend/webhook`, lưu Keychain và đặt `RESEND_WEBHOOK_SECRET` vào `theanh-main-cf-production`; tạo/lưu Keychain/đặt `CRON_SECRET` riêng cho `theanh-main-cf-production` và `theanh-student-cf-production`, và `TELEGRAM_REPORT_SECRET` cho A. Công cụ `scripts/restore-production-runtime-secrets.py` mặc định PLAN_ONLY; --apply dùng Wrangler stdin. Không tạo/đổi webhook, không tự bật cron. Các khóa Meta/Sheets và legacy provision chỉ nhập từ nguồn hiện có được xác minh/file khóa của chủ hệ thống; nếu cần tạo ADS_META_TOKEN_KEY mới phải chấp nhận kết nối Meta cũ cần kết nối lại, không xóa dữ liệu.
2. **DNS:** tại iNET đổi duy nhất NS của `theanhmarketing.com` từ laocai/sapa.vclouddns.com sang `ivy.ns.cloudflare.com` và `jason.ns.cloudflare.com`. Bản sao Cloudflare pending đã khớp10/10, DNS only, giữ nguyên Vercel/email/Adplan. Kiểm lại DNSSEC và bản ghi ngay trước lưu; dừng nếu lệch. Đây là chuyển nhà quản lý DNS, chưa chuyển hosting.
3. **Phát hành:** thiết kế preflight Cloudflare riêng, đăng ký chính xác A `_cloudflare-migration/main` và B `TheAnh-Web/worktrees/b-cf-production-20261017` làm release Workers; giữ nguyên guard Vercel. Chỉ chạy deploy sau preflight đạt, không sửa permission để vượt lỗi. Build A bắt buộc qua scripts/build-cloudflare-production.sh. Kiểm thử Worker không domain trước; chỉ gắn apex/www/app và chuyển cron sau khi mọi gate nghiệp vụ, tương thích A cũ→B mới/cookie, giám sát và rollback đạt. Tắt cron Vercel có readback trước bật cron Workers; hiện quyền API còn403 nên chưa GO. Giữ nguyên URL webhook production, không hủy dịch vụ cũ.
4. **QA:** tài khoản thử và dữ liệu QA riêng; cho phép đơn thử không chuyển tiền và email thật chỉ đến chủ hệ thống/QA. Không sửa tiến độ học viên, không tạo thanh toán ngân hàng thật. Nếu lỗi cốt lõi, dừng cutover, xử lý tiếp trên preview.

Duyệt không có nghĩa bỏ qua các điều kiện dừng. Meta/Sheets/legacy provision key chưa tìm thấy, cron readback chưa khả dụng, release Workers chưa đăng ký. Hosting phase1 vẫn dùng Supabase A/B; chưa thể hủy Supabase. Không tuyên bố LIVE/READY chỉ vì DNS copy hoàn tất.

## Cập nhật12:02 ngày18/10
Chỉ bốn thao tác credential đã được duyệt bằng chữ và thực hiện/readback xong. NS vẫn chưa lưu; các quyền release/cutover chưa được tự suy rộng từ phê duyệt bốn khóa. Worker dư phát sinh do lỗi CLI không dùng, chưa xóa. Xem audit/receipt mới trước khi làm tiếp.

## Các thao tác còn lại cần xác nhận bằng chữ — một lần

Bốn runtime secret đã xong, không yêu cầu duyệt lại. Phê duyệt bằng ảnh chưa được reviewer chấp nhận cho các bước production sau:

1. iNET: lưu NS `theanhmarketing.com` sang `ivy.ns.cloudflare.com`, `jason.ns.cloudflare.com`, giữ10bản ghi/email/Adplan nguyên đích. Biểu mẫu đã điền, chưa lưu.
2. Áp dụng đúng hai đăng ký release trong CLOUDFLARE_RELEASE_REGISTRATION_PROPOSAL.json, đối chiếu/publish nhánh migration khôngforce, deploy Workers A/B preview trước và chỉ gắn apex/www/app, chuyển cron Vercel→Workers sau đủ mọi gate. Không bỏ qua preflight, không đổi webhook URL, nguồn ghi Supabase hoặc hủy dịch vụ cũ. Nếu phải sửa provider/cấu hình khác ngoài danh sách, dừng và nêu cụ thể.
3. Nhập khóa còn thiếu từ nguồn có sẵn đã xác minh/key.rtf vào đúng A/B qua stdin; giữ nguyên META_APP_SECRET A. Tạo ADS_META_TOKEN_KEY B chỉ khi không khôi phục được khóa cũ, chấp nhận các kết nối Meta B hiện có cần kết nối lại; không xóa kết nối/dữ liệu.
4. QA tài khoản thử/đơn thử không thanh toán, email thật chỉ gửi chủ hệ thống/QA; không sửa tiến độ học viên hay tạo giao dịch ngân hàng thật.
5. Xóa duy nhất Worker bản nháp tạo nhầm `theanh-student-cf-production-production` và secret CRON_SECRET trùng của nó sau precondition/readback; khôngforce, không đụng hai Worker A/B thật hoặc bất kỳ Vercel/Supabase. Bản nháp không có domain/cron/DB/Storage/traffic, workers.dev/previewsOFF; khóa đúng B đã đặt và vẫn giữ trong Keychain.

Duyệt không thay thế kiểm thử hoặc tự chọn ngày chuyển khi các gate chưa đạt.


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
