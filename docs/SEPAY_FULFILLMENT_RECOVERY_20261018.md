# Phục hồi cấp quyền sau thanh toán SePay — 18/10/2026

Trạng thái: TESTED preview; bản bổ sung 3aefbb4 đã phát hành Worker c1d1dd8e. Chưa đủ bằng chứng iPhone Safari để READY FOR CUTOVER. Chưa chuyển domain/cron, không đổi nguồn dữ liệu.

## Lỗi đã tái hiện và sửa

Route cũ bỏ qua cấp tài khoản/email nếu đơn đã `paid`, kể cả khi tiến trình trước chết sau commit. Ban đầu 2/3 kiểm thử actual-route thất bại. Route mới lưu receipt `sepay-fulfillment-v1` cùng transaction cập nhật paid trong trường riêng hiện có `orders.payment_email_last_error`; không thêm bảng/quyền/schema. Receipt chỉ chứa token tranh quyền, thời hạn, SHA256 payload email, trạng thái/ID provider; không lưu password, key hoặc nội dung email.

`sourcePaidFulfillmentService.ts` dùng compare-and-swap trên giá trị receipt cũ, trạng thái paid và giá trị chính xác của payment_email_sent_at (kể cả null). Tiến trình khác trả503; retry tiếp tục việc thiếu. Cấp tài khoản giữ mật khẩu cũ; resume tài khoản vừa tạo không sửa Auth hay xóa token recovery/email-change. Nếu học viên đã đổi mật khẩu, thư dùng hướng dẫn đăng nhập hiện tại. Tài khoản/quyền học và email A hoàn tất trước bước App B. Nếu B lỗi, email A vẫn được lưu marker; receipt accepted giữ lại để retry riêng B, không gửi lại email hoặc sửa Auth. Phản hồi B phải là JSON giới hạn 16KiB, ok=true, mode=write, đúng email và UUID; HTTP200 hoặc dry-run không đủ. Consultation/deposit dùng đúng template cũ và không tạo tài khoản khóa học. Support booking gọi lại RPC xác nhận idempotent khi retry.

Email có khóa provider ổn định theo đơn và hash payload; chỉ hoàn tất khi provider trả ID hợp lệ. Mất phản hồi sau acceptance retry cùng payload/key. Sau23giờ hoặc payload đổi, dừng để đối soát; không tạo key mới/gửi mù sau TTL24giờ Resend. Kiểm lại thời gian ngay trước send; request portal/email có timeout10s và không theo redirect. Lỗi sau xác nhận paid trả503 để SePay retry, không trả200 giả thành công. Điều này cần cấu hình SePay bật retry; đã xác minh và bật theo phê duyệt riêng của anh trên dashboard SePay; mở lại biểu mẫu thấy retry=1, URL nhận và trạng thái kích hoạt giữ nguyên. Không gửi thử giao dịch thật.

## Tương thích Blue và quay lui

Đơn paid đã có payment_email_sent_at và không còn receipt accepted được bỏ qua; receipt accepted còn pending phải tiếp tục B rồi mới xóa receipt. Đơn paid cũ không receipt và chưa có sent marker cần đối soát trước gửi; không thể suy ra email chưa gửi từ marker trống. Không adopt receipt legacy trong lúc Blue có thể đang gửi. Trước cutover đọc lại số đơn thiếu marker và chờ request Blue đang chạy kết thúc; mọi admin gửi lại email phải tạm tránh cùng đơn trong cửa sổ chuyển.

Giữ Worker Green preview chạy nếu quay domain về Blue: Blue cũ không biết hoàn thành receipt Green còn pending. Liệt kê/đối soát pending riêng; tiếp tục bằng Green với payload ngân hàng đã lưu chỉ sau kiểm quyền/đúng đơn; không xóa receipt hoặc reset paid. Quay mã nguồn một mình không giải quyết pending fulfillment. Không rollback/xóa unique index giao dịch đã duyệt.

Telegram/Sheets giữ thông báo lần đầu hoặc lần fulfillment vừa hoàn thành khi retry; chưa có outbox mới cho từng thông báo. Sheets có lịch catch-up hiện có. Không tuyên bố exactly-once mọi side effect hoặc bảo đảm gửi thông báo khi tiến trình chết sau email marker. Accounting hiện đã có provider idempotency key trong code cũ (không phải thiếu key); không đổi recipient. Tài liệu này thay nhận định nhầm accounting thiếu key nếu gặp trong ghi chú nháp.

## Bằng chứng

- 81 test liên quan đạt; có20 tình huống actual-route recovery, mật khẩu/consultation/deposit/support/cron/template.
-13 kiểm tra actual service + PostgREST16.4 + PostgreSQL17 phục hồi đạt; dữ liệu QA chỉ trong clone, mạng PG outbound bị chặn.
-8 kiểm tra HTTP qua đúng artifact cfproduction Workers + actual Source SDK + PostgreSQL clone đạt: xác thực, settle/fulfillment, retry paid, Auth lỗi, App B lỗi, provider acceptance mất phản hồi, concurrency, underpayment. Auth/App B/Resend trong lượt này là transport fixtures, không phải dịch vụ thật.0 outbound ngoài allowlist;5 simulated deliveries/6 provider requests.
-4 kiểm tra cron trên artifact thực trong Miniflare đạt: auth, dispatch01:30UTC, quiet minute, apex redirect. Outbound bị chặn; chưa chứng minh tác vụ hosted có side effect.
- typecheck và lint file runtime sửa đạt; build production bắt buộc đạt9gate, domain/cronOFF.
- Mọi clone đã drop, local PG đã stop, volume mã hóa đã unmount. Restore gốc không đổi.
- Read-only production lúc10:02UTC:0đơn paid thiếu email trong24h/2h,0checkout đang mở. Đây là snapshot, phải đọc lại trước chuyển.
- Lịch Vercel17:05VN thực sự kích hoạt lúc10:05:38UTC,1run failed vì snapshot Meta thiếu; không gửi báo cáo Ads sai. Meta được chủ hệ thống cho hoãn, không sửa contract dữ liệu báo cáo để ép PASS.

Receipts: reports/cloudflare-handoff-20261018/{payment-recovery-validation,source-payment-local-candidate,source-webhook-workers,cron-cutover-precheck,qa-b-reactivation}.json và reports/cloudflare-d1/worker-cron-workers.json.

Chạy lại (mặc định PLAN_ONLY, chỉ --run tạo clone kiểm thử):

```sh
python3 scripts/test-source-payment-local.py --run --candidate-index
python3 scripts/test-source-payment-local.py --run --candidate-index --worker-webhook
node --test tests/sepay-webhook-recovery.test.mjs tests/student-account.test.mjs
CF_ATTACH_PRODUCTION_DOMAINS=0 scripts/build-cloudflare-production.sh
```

Các dependency restore mã hóa cục bộ dùng thư mục điều phối `_cloudflare-migration/scripts` và `.tools` hiện có, không tự cài/khôi phục vào production.

Nguồn hợp đồng provider: https://resend.com/changelog/idempotency-keys (TTL24h, cùng payload/key), https://developer.sepay.vn/vi/sepay-webhooks/xu-ly-loi (retry khi ngoài2xx và tùy chọn retry được bật;8lần trong33phút). Chưa kiểm Safari iPhone thật; chưa READY FOR CUTOVER/LIVE.

## Giới hạn đã xác minh bổ sung

B là App riêng, không phải LMS A. Source B hiện có nhóm facebook-ads nhưng payload A đang dùng slug khóa như facebook-ads-2026; hành vi baseline có thể trả missing-access-group dù profile đã ghi. Bản sửa giữ hợp đồng hiện có, không tự ánh xạ sản phẩm sang quyền B khi chưa có bằng chứng nghiệp vụ. Không dùng việc profile write để tuyên bố mọi nhóm B đã cấp.

Đã gửi email hướng dẫn Safari đến alias QA của chủ hệ thống; Resend ghi delivered, chưa có kết quả trên iPhone thật. Chromium đã phát video, chuyển bài, refresh giữ hoàn thành sau deploy; không gọi đó là Safari.
