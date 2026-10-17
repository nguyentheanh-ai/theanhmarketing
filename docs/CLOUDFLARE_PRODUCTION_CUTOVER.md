# Chuyển website A (theanhmarketing.com) từ Vercel sang Cloudflare Workers

Trạng thái 15/10/2026 (cập nhật sau khi anh duyệt mục 1–5): **cấu hình production đã áp dụng và build đạt; chưa deploy** vì cần (a) phiên Vercel hợp lệ để chép biến môi trường và (b) quyền tạo Secret trên Worker production (chế độ an toàn chặn). Chưa có gì chạy trên production Cloudflare; Vercel + Supabase vẫn phục vụ website thật.

## Phạm vi giai đoạn 1 (bỏ Vercel, giữ Supabase)

- Cùng mã nhánh `codex/cloudflare-staging-main-20261013` chạy trên Worker `theanh-main-cf-production`, dữ liệu vẫn đọc/ghi **Supabase** (gói miễn phí) như hôm nay. Mọi cổng native D1 TẮT.
- Lý do: trang quản trị/CRM gọi Supabase ở 78 file / 74 bảng-hàm; viết lại sang D1 là việc nhiều tuần. Giai đoạn 1 loại bỏ phụ thuộc Vercel mà không đổi luồng dữ liệu nào.
- Giai đoạn 2 (sau): bật dần native D1 (đăng nhập, học, thanh toán, đăng ký/quên mật khẩu đã có sẵn sau cổng), chuyển admin/CRM, rồi mới bỏ Supabase.

## Đã làm (không cần duyệt)

| Hạng mục | Vị trí | Kiểm chứng |
|---|---|---|
| Cron Vercel → Worker: 1 trigger `*/5 * * * *`, tự khớp 8 lịch trong `vercel.json` (UTC), gọi route bằng `Bearer CRON_SECRET`, cổng `CF_CRON_MODE` (staging = disabled) | `lib/cloudflare/worker-cron.ts`, handler `scheduled` trong `cloudflare-worker.ts` | `tests/cloudflare-worker-cron.test.mjs` 7/7 (đúng giờ từng route, cả ngày chỉ 13 lần gọi, lỗi một route không chặn route khác, lịch luôn khớp danh sách `vercel.json`) |
| So mã production | `43cee59` (bản đang chạy) nằm trong nhánh này | File landing tải từ website thật trùng hash bản commit |
| Bản sao dữ liệu + bảng runtime D1 | `theanh-supabase-copy`, `theanh-app-db-copy` | xem `CURRENT_STATE.md` |

**Lưu ý không được làm mất:** thư mục phát hành `TheAnh-Web/worktrees/theanhmarketing-email-account-hotfix` còn 11 file sửa CHƯA commit (6/10: email thanh toán, trang thanh toán, `orderService`, 2 landing Facebook Ads). Kiểm website thật: các thay đổi này **chưa lên production**. Chúng không có trong nhánh Cloudflare. Nếu muốn phát hành, phải commit/merge riêng trước khi chuyển.

## Thay đổi cấu hình production (đã soạn, chưa áp dụng — cần duyệt)

Chế độ an toàn chặn sửa `cloudflare.config.ts` cho bản production. Nội dung đề xuất (staging giữ nguyên khi không đặt biến):

```ts
const production = process.env.CF_DEPLOY_TARGET === "production";
const attachDomains = production && process.env.CF_ATTACH_PRODUCTION_DOMAINS === "1";
// defineWorker({
//   name: production ? "theanh-main-cf-production" : "theanh-main-cf-staging",
//   ...(production ? { triggers: [triggers.scheduled({ schedule: "*/5 * * * *" })] } : {}),
//   ...(attachDomains ? { domains: ["theanhmarketing.com", "www.theanhmarketing.com"] } : {}),
//   CF_R2_STAGE_PRIVATE_DELIVERY: production ? "false" : "true",   // prod giữ Storage Supabase
//   CF_CRON_MODE: production ? "enabled" : "disabled",
//   CF_CRON_ORIGIN: production ? "https://www.theanhmarketing.com" : <staging origin>,
//   NATIVE_AUTH_DB: production ? D1 theanh-supabase-copy : D1 staging,  // không dùng khi cổng tắt
// })
```

Build production: `vite build --mode cfproduction` với file `.env.cfproduction` (ngoài Git) chứa giá trị công khai: `NEXT_PUBLIC_SITE_URL=https://www.theanhmarketing.com`, `NEXT_PUBLIC_APP_URL=<URL app B production>`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_META_PIXEL_ID` (các biến `NEXT_PUBLIC_*` được nhúng lúc build; dùng mode riêng để không ảnh hưởng build staging đang đọc `.env.local`).

## Biến môi trường production cần chép từ Vercel sang Secret của Worker

Code dùng 64 biến. Chép nguyên giá trị đang chạy trên Vercel (không đổi): `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, `RESEND_WEBHOOK_URL`, `CRON_SECRET`, `SEPAY_WEBHOOK_API_KEY`, `SEPAY_BANK_ACCOUNT_NAME`, `SEPAY_BANK_ACCOUNT_NUMBER`, `SEPAY_BANK_CODE`, `META_CAPI_ACCESS_TOKEN`, `META_CAPI_DATASET_ID`, `META_CAPI_API_VERSION`, `META_CAPI_TEST_EVENT_CODE`, `META_CODEX_CAPI_ACCESS_TOKEN`, `META_CODEX_CAPI_TEST_EVENT_CODE`, `META_ADS_ACCESS_TOKEN`, `META_ADS_AD_ACCOUNT_ID`, `META_API_VERSION`, `META_APP_SECRET`, `META_PIXEL_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_REPORT_SECRET`, `GOOGLE_SHEETS_WEBHOOK_URL`, `GOOGLE_ENHANCED_CONVERSIONS_ID`, `TIKTOK_EVENTS_API_TOKEN`, `EMAIL_DEFAULT_FROM`, `EMAIL_UNSUBSCRIBE_SECRET`, `PAYMENT_SUCCESS_EMAIL_FROM`, `PENDING_PAYMENT_EMAIL_FROM`, `PASSWORD_RESET_EMAIL_FROM`, `PASSWORD_RESET_SITE_URL`, `REGISTRATION_NOTIFICATION_EMAIL`, `REGISTRATION_NOTIFICATION_FROM`, `REGISTRATION_NOTIFICATION_TO`, `NEW_LEAD_NOTIFICATION_TO`, `ACCOUNTING_NOTIFICATION_EMAIL`, `ADMIN_LOGIN_EMAIL`, `CRM_V2_ENABLED`, `CRM_V2_USE_DEMO_DATA`, `STUDENT_PORTAL_PROVISION_SECRET`, `STUDENT_PORTAL_PROVISION_URL`, `PUBLIC_APP_URL`, `SITE_URL`, `FACEBOOK_EBOOK_*`, `SUPPORT_BOOKING_DEMO`, `ENABLE_WWW_TO_APEX_REDIRECT`. Biến chỉ có trên Vercel (`VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`) đã có biến thay thế (`AUTH_GUARD_ENABLED=true`, `PASSWORD_RESET_SITE_URL`). Secret native bắt buộc theo cấu hình (`NATIVE_AUTH_*`, `R2_PRIVATE_URL_SECRET`) tạo giá trị ngẫu nhiên mới cho production (không dùng lại của staging).

Cách chép an toàn đề xuất: chủ dự án chạy `vercel env pull` vào file tạm ngoài Git, lọc đúng danh sách trên, `wrangler secret bulk` cho `theanh-main-cf-production`, xóa file tạm; không in giá trị.

## Trình tự chuyển (mỗi bước có điểm dừng kiểm tra)

1. Áp dụng thay đổi cấu hình production, build `cfproduction`, deploy Worker production **không gắn tên miền** (chỉ URL `workers.dev`, đặt sau Cloudflare Access chỉ chủ dự án).
2. Chép Secret. Kiểm tra trên URL thử: trang chủ, `/khoa-hoc`, landing Facebook Ads (so HTML với website thật), đăng nhập học viên, `/learn`, admin, CRM, tạo đơn thử 2.000đ, webhook SePay thử (giữ webhook thật trỏ Vercel), email Resend, Telegram, Sheets.
3. Tạm dừng cron trên Vercel (tránh chạy 2 lần) ngay trước bước 4.
4. Gắn tên miền (`CF_ATTACH_PRODUCTION_DOMAINS=1`): Cloudflare chuyển `theanhmarketing.com`/`www` sang Worker. URL webhook SePay/Resend không đổi vì cùng tên miền.
5. Theo dõi 24–48 giờ: đơn mới, webhook, cron, email, lỗi Worker.

## Quay lui

- Gỡ custom domain khỏi Worker và trỏ DNS lại Vercel (dự án Vercel giữ nguyên, không xóa); bật lại cron Vercel. Dữ liệu không cần khôi phục vì vẫn ở Supabase.

## Tiến độ mục 1–5 (anh đã duyệt)

| Mục | Kết quả |
|---|---|
| 1. Cấu hình production | XONG — `cloudflare.config.ts`: `CF_DEPLOY_TARGET=production` → Worker `theanh-main-cf-production`, D1 `theanh-supabase-copy`, R2 private delivery tắt. Cron VÀ tên miền chỉ bật cùng lúc khi `CF_ATTACH_PRODUCTION_DOMAINS=1` (bước chuyển), để bản thử không chạy cron trùng với Vercel. Staging build ra cấu hình như cũ (thêm `CF_CRON_ORIGIN`, cron vẫn tắt). |
| 2. Build | XONG — `.env.cfproduction` (ngoài Git, 0600) gồm 5 biến công khai: Supabase URL/anon key (cùng dự án A), `NEXT_PUBLIC_SITE_URL=https://www.theanhmarketing.com`, `NEXT_PUBLIC_APP_URL=https://app.theanhmarketing.com`, Pixel `1315653423712065` (lấy từ HTML website thật). `CF_DEPLOY_TARGET=production vite build --mode cfproduction` + prune đạt; bản dựng lưu tạm ở `/private/tmp/claude-501/dist-production`, thư mục `dist` đã trả về bản staging. Đường dẫn `*.workers.dev` nay trả `X-Robots-Tag: noindex, nofollow`. |
| 3. Chép Secret | CHƯA ĐẠT — ĐÍNH CHÍNH: file `.vercel/.env.production.local` (13/8) chứa cùng một giá trị giữ chỗ 11 ký tự cho 35 biến Sensitive; đã lỡ đẩy chúng lên Worker thử (xóa bị chế độ an toàn chặn; vô hại vì mọi khóa nhà cung cấp đều là giữ chỗ nên thao tác đặc quyền thất bại). Giá trị thật hiện có: `STUDENT_PORTAL_PROVISION_URL` + 4 khóa native mới. Cần chủ dự án nhập bằng `scripts/set-production-secrets.sh` (ghi đè giữ chỗ). Công cụ `push-env-file-to-worker.py` nay từ chối file có giá trị lặp. Trước đó: CHẶN — phiên Vercel CLI trên máy hết hạn (`invalidToken`); công cụ `scripts/sync-vercel-env-to-worker.py plan|public|secrets` đã viết (không in giá trị). Tạo Secret native mới bị chế độ an toàn chặn. |
| 4. Deploy không tên miền | XONG — `caa135c9` tại `https://theanh-main-cf-production.12c1thdtheanh.workers.dev` (cron tắt, noindex). |
| 5. Thử trên URL thử | MỘT PHẦN — trang công khai/landing khớp website thật; anh đăng nhập được; sau khi có khóa service_role thật, `/dashboard`, `/learn` (video + 23 bài) và `/admin/crm-v2` (doanh thu/đơn thật) chạy đúng. Đơn thử `TAMMV9QYDD1VKEJU` (399.000đ, chưa thanh toán) tạo thành công qua Worker, email chờ thanh toán đã tới hộp thư chủ dự án (Resend OK); QR sai vì `SEPAY_BANK_*` còn giữ chỗ (cần đặt VPB / 2070519999 / GREEZHUB CO LTD). Telegram/Sheets chờ khóa. |

Kiểm chứng sau thay đổi: 1.287 test — 33 lỗi đều có sẵn, 0 lỗi mới; harness full-worker 6, payment 7, email-auth 7 PASS; typecheck, lint PASS.

Chuyển hướng `theanhmarketing.com` → `www` (307, giữ path/query) đã có trong Worker (16/10). Harness `scripts/test-worker-cron-workers.mjs` trên bản build thật: apex→www, route cron từ chối bearer sai không chạm Supabase, `scheduled` 01:30 UTC chạy orders/expire + email worker qua route thật, giờ yên tĩnh không gọi gì — 4/4 PASS. Worker thử hiện tại `e775f4ab`.

## Kết quả chép Secret từ Vercel (15/10 tối)

Phiên Vercel mới hợp lệ, nhưng dự án `theanhmarketing` chỉ có 3 biến thường đọc được (`NEXT_PUBLIC_SUPABASE_URL`, `STUDENT_PORTAL_PROVISION_URL`, `ADS_OS_STAGED_ORIGIN`); **36 biến kiểu Sensitive — Vercel không bao giờ trả lại giá trị** (cả CLI lẫn API). Vì vậy không thể "chép" từ Vercel. Đọc file `.env` trên máy để tìm giá trị cũ bị chế độ an toàn chặn.

Cách làm: chủ dự án tự nhập bằng `scripts/set-production-secrets.sh` (gõ ẩn, em không thấy giá trị; Enter để bỏ qua; cuối cùng tự tạo 4 khóa native ngẫu nhiên). Nơi lấy giá trị:

| Nhóm | Biến | Lấy ở đâu |
|---|---|---|
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → project theanhmarketing → Project Settings → API Keys → service_role (Reveal) |
| Email | `RESEND_API_KEY` | Resend → API Keys (tạo key mới, quyền Sending, domain theanhmarketing.com) |
| SePay | `SEPAY_WEBHOOK_API_KEY`, `SEPAY_WEBHOOK_SECRET`, `SEPAY_BANK_*` | my.sepay.vn → Webhooks (API key đang cấu hình) / thông tin tài khoản nhận tiền |
| Meta | `META_CAPI_ACCESS_TOKEN`, `META_CAPI_DATASET_ID`, `META_CODEX_CAPI_ACCESS_TOKEN`, `META_ADS_*`, `META_APP_ID/SECRET` | Events Manager → Dataset → Settings → Conversions API token; Business/Ads Manager; developers.facebook.com → App |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | @BotFather (token bot hiện có) / chat ID nhóm báo cáo |
| Google Sheets | `GOOGLE_SHEETS_WEBHOOK_URL` | Apps Script → Deploy → Web app URL |
| Tự đặt mới được | `CRON_SECRET`, `CHECKOUT_ABUSE_HMAC_KEY`, `TELEGRAM_REPORT_SECRET` | chuỗi ngẫu nhiên mới (chỉ dùng nội bộ Worker) |
| App B | `STUDENT_PORTAL_PROVISION_SECRET` | phải TRÙNG giá trị app B production đang dùng |
| Cấu hình thường | email người nhận/người gửi, `ADMIN_*`, `CRM_V2_*` | giá trị anh đang dùng (không bí mật) |

Sau khi nhập xong: em deploy bản đã build (`/private/tmp/claude-501/dist-production`, hoặc build lại `CF_DEPLOY_TARGET=production vite build --mode cfproduction`) bằng `wrangler deploy --config dist/server/wrangler.json`, rồi thử như mục 5.

## Danh sách cần anh làm/duyệt (gom một lần)

1. ~~Đăng nhập lại Vercel~~ (xong, nhưng giá trị Sensitive không đọc được).
2. Anh chạy `scripts/set-production-secrets.sh` để nhập Secret (bảng nơi lấy ở trên), hoặc cho phép em đọc file `.env` cũ trên máy nếu anh còn lưu. Sau đó cho phép lên Worker `theanh-main-cf-production` khi Claude Code hỏi (hoặc thêm quy tắc cho phép trong cài đặt). Sau đó em chạy liền: `sync-vercel-env-to-worker.py plan` → `secrets` (kèm 4 Secret native ngẫu nhiên mới) → deploy bản đã build → thử trang chủ, `/khoa-hoc`, landing Facebook Ads (so HTML), đăng nhập, `/learn`, admin, CRM, đơn thử 2.000đ, email thật tới anh.
3. (Sau khi thử xong) Tắt cron Vercel, thêm chuyển hướng apex→www, gắn tên miền.
4. Quyết định 11 file chưa commit trong thư mục phát hành cũ.


## 17/10/2026 — Service Binding A→B và lỗi địa chỉ staging trong bản build production

- **Lỗi đã sửa:** các bản build production trước đây (`94f4ce53`…`e775f4ab`, `bf1a82ea`) nhúng `NEXT_PUBLIC_APP_URL`/`NEXT_PUBLIC_SITE_URL` của STAGING từ `.env.local` vào phần chạy máy chủ (vinext đọc `.env.local` cho server). Email gửi từ Worker thử (ví dụ email chờ thanh toán đơn `TAMMV9QYDD1VKEJU`) có thể chứa link staging. Nay build bằng `scripts/build-cloudflare-production.sh`: export biến từ `.env.cfproduction` vào tiến trình build (luôn thắng file `.env`) và dừng nếu bản build không chứa đúng APP/SITE URL production. Địa chỉ staging còn lại trong bản build chỉ là origin cố định của các cổng native (tắt).
- **Service Binding:** `lib/cloudflare/student-app-fetch.ts` `fetchStudentApp()` — trên Worker có binding `STUDENT_APP` và URL đúng origin app B thì gọi qua binding (Cloudflare chặn Worker gọi Worker qua `*.workers.dev`, lỗi 1042); còn lại (staging, Vercel) dùng `fetch` như cũ. Dùng ở `app/app-login-bridge/page.tsx` và `services/studentPortalProvisioningService.ts`. Binding chỉ khai báo cho bản production (`STUDENT_APP` → `theanh-student-cf-production`). Test `tests/cloudflare-student-app-fetch.test.mjs` 6/6; `tests/student-portal-provisioning.test.mjs` thêm stub import. Suite 1.294 test: 0 lỗi mới so với gốc.
- **Supabase B Auth:** `uri_allow_list` thêm `https://theanh-student-cf-production.12c1thdtheanh.workers.dev/**` (mẫu giống `https://app.theanhmarketing.com/**`; mục exact `/auth/callback` ban đầu không khớp vì có `?source=website`). 7 mục cũ giữ nguyên.
- **Kết quả:** chủ dự án đăng nhập A thử → `/app-login-bridge` → B thử `/app/overview` đúng tài khoản. Meta "chưa sẵn sàng" vì thiếu `ADS_META_*`.
- **Hoàn nguyên trước ngày chuyển:** `.env.cfproduction` `NEXT_PUBLIC_APP_URL` về `https://app.theanhmarketing.com`; Secret `STUDENT_PORTAL_PROVISION_URL` của A về `https://app.theanhmarketing.com/api/provisioning/student-access`; build lại B với APP/WEBSITE URL thật; có thể gỡ mục thử khỏi Supabase B.
