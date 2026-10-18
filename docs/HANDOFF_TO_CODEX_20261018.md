# Bàn giao Claude Code → Codex (18/10/2026)

Anh (chủ dự án) không viết code; trả lời bằng tiếng Việt, xưng em/anh, ít hỏi lại, gom mọi việc cần duyệt (deploy production, đổi DNS/webhook, ghi dữ liệu thật, gửi thật, tạo/đổi secret) thành MỘT danh sách cuối. Không in/ghi giá trị secret vào chat, log, docs, commit.

## Mục tiêu

Chuyển website A (`www.theanhmarketing.com`) và App B học viên (`app.theanhmarketing.com`, AdsMind) từ Vercel sang Cloudflare Workers. Giai đoạn 1 (đang làm): chạy trên Workers, dữ liệu VẪN ở Supabase A (`vsxxgdzwtscuxcmjfckt`) và Supabase B (`pppiqhkectojxbmhqcnx`). Giai đoạn 2 (sau): bật dần native D1, chuyển admin/CRM (78 file/74 bảng-hàm gọi Supabase), rồi mới bỏ Supabase. Vercel/Supabase hiện ở gói miễn phí; Vercel đang `BLOCKED` mọi deployment mới của App B (lý do chưa xác nhận).

## Repo, nhánh, worktree

| | Đường dẫn | Nhánh | Commit cuối |
|---|---|---|---|
| A Cloudflare | `Kinh doanh/_cloudflare-migration/main` | `codex/cloudflare-staging-main-20261013` | xem `git log` (≥ `f960025`) |
| B production Workers | `TheAnh-Web/worktrees/b-cf-production-20261017` | `codex/b-cf-production-20261017` | `0dd71b4` |
| B nhánh xoay secret | `TheAnh-Web/worktrees/b-dual-provision-secret-20261016` | `fix/b-dual-provision-secret-20261016` | `4cd331e` (đã vào `main`) |
| B release root | `TheAnh-Web/worktrees/student-app-production` | `main` | `e379a08` (đã đẩy GitHub; production Vercel vẫn `9fcf0d2`) |
| A release root Vercel | `TheAnh-Web/worktrees/theanhmarketing-email-account-hotfix` | `codex/production-canonical-20260826` @ `43cee59` | còn 11 file CHƯA commit (6/10), chưa lên production, chưa có trong nhánh Cloudflare — chờ anh quyết |

Node: máy không có `node` trong PATH cho sandbox; dùng `/usr/local/bin` (anh đã cài Node) hoặc `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`.

## Đã xong (đã kiểm chứng)

**App A (Cloudflare branch):**
- Thanh toán native (cổng `CF_NATIVE_QA_PAYMENT_MODE`, TẮT): settle SePay → cấp quyền → tạo tài khoản → email bàn giao 1 lần/đơn → kế toán/Meta/Telegram/Sheets (ledger D1 từng bước). Đăng ký/xác nhận email/quên–đặt lại mật khẩu native (cổng `CF_NATIVE_QA_EMAIL_AUTH_MODE`, TẮT) + UI `/dang-ky`, `/quen-mat-khau`, `/doi-mat-khau?mode=reset`.
- Cron Vercel → Worker: `lib/cloudflare/worker-cron.ts`, 1 trigger `*/5`, khớp 8 lịch `vercel.json`; chỉ bật cùng lúc gắn tên miền (`CF_ATTACH_PRODUCTION_DOMAINS=1`).
- Worker production `theanh-main-cf-production` (`cloudflare.config.ts` với `CF_DEPLOY_TARGET=production`): `htmlHandling: "drop-trailing-slash"` + `STATIC_ASSET_ALIASES` (landing `/academy/quang-cao-chuyen-gia`), apex→www 307, `X-Robots-Tag: noindex` trên `*.workers.dev`, Service Binding `STUDENT_APP` → Worker B (`lib/cloudflare/student-app-fetch.ts`, dùng ở `app/app-login-bridge/page.tsx` và `services/studentPortalProvisioningService.ts`; Cloudflare chặn Worker gọi Worker qua workers.dev, lỗi 1042).
- **Build production BẮT BUỘC dùng `scripts/build-cloudflare-production.sh`** (export `.env.cfproduction` vào tiến trình; trước đây vinext nhúng nhầm URL staging từ `.env.local` vào server). Bản cuối (APP/SITE = tên miền thật) đã build, chưa deploy.
- Thử trên URL thử: landing `/academy/*` giống từng byte; `/`, `/khoa-hoc`, `/tai-lieu` giống chữ; đăng nhập, dashboard, `/learn`, CRM dữ liệu thật; đơn thử `TAMMV9QYDD1VKEJU` (399.000đ, KHÔNG thanh toán, tự hết hạn) + QR VPB đúng + email chờ thanh toán đã tới.
- Dữ liệu: D1 riêng `theanh-supabase-copy` (139 bảng, 39.471 hàng + tài khoản A 442/B 271, mật khẩu niêm phong; projection `d1_*` runtime, đối chiếu quyền 439 học viên 0 thiếu) và `theanh-app-db-copy` (projection B). Là bản chụp 15/10, KHÔNG đồng bộ.
- Test: `node --test tests/*.mjs` = 1.294, 34 lỗi đều có sẵn từ trước (so baseline), 0 lỗi mới. Harness: `scripts/test-native-*-workers.mjs`, `scripts/test-worker-cron-workers.mjs`.

**App B:**
- `fix/b-dual-provision-secret`: nhận `STUDENT_PORTAL_PROVISION_SECRET` hoặc `_NEXT` (timing-safe), cookie ký bằng `STUDENT_PORTAL_SESSION_SECRET`, vẫn chấp nhận cookie cũ (30 ngày). Đã vào `main`, CHƯA lên Vercel (BLOCKED).
- Nhánh `codex/b-cf-production-20261017` = staging Cloudflare của Codex + main; `wrangler.jsonc` `env.production` (`theanh-student-cf-production`, D1 copy, cổng `off`). 121 file/1.217 test PASS. Build: `npm ci` thật (không symlink node_modules), `opennextjs-cloudflare build`, `wrangler deploy --env production`.
- Đã thử: Worker B thử `/login`, chuyển hướng, route cấp quyền 401 khớp app thật; **đăng nhập A thử → B thử `/app/overview` ĐẠT**.

**Supabase B Auth**: `uri_allow_list` có thêm `https://theanh-student-cf-production.12c1thdtheanh.workers.dev/**` (gỡ sau cutover nếu không cần).

## Secret (chỉ tên)

- Worker A thử có: Supabase service role, Resend, SePay API key + ngân hàng (VPB), Telegram bot/chat, Meta CAPI token/dataset (pixel), email người gửi/nhận, ADMIN_*, CRM_V2_* (true/false/false), `STUDENT_PORTAL_PROVISION_SECRET` (MỚI, chung với B), `STUDENT_PORTAL_PROVISION_URL` = `https://app.theanhmarketing.com/api/provisioning/student-access`, 4 khóa native.
- Worker A còn giữ chỗ/thiếu: `GOOGLE_SHEETS_WEBHOOK_URL`, `CRON_SECRET`, `TELEGRAM_REPORT_SECRET`, `META_APP_ID`, `META_APP_SECRET` (phải là giá trị hiện tại — dùng giải mã token Facebook đã lưu), `META_ADS_ACCESS_TOKEN`, `META_ADS_AD_ACCOUNT_ID`. Không cần: `SEPAY_WEBHOOK_SECRET`, `CHECKOUT_ABUSE_HMAC_KEY` (code không dùng), `META_CODEX_CAPI_ACCESS_TOKEN` (tùy chọn). Một số tên cũ trên Worker A vẫn là giá trị giữ chỗ 11 ký tự từ file Vercel pull — ghi đè khi có giá trị thật.
- Worker B có: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `STUDENT_PORTAL_PROVISION_SECRET` (mới, chung A), `STUDENT_PORTAL_SESSION_SECRET` (mới). Thiếu: `ADS_META_ENABLED` (=true), `ADS_META_APP_ID`, `ADS_META_APP_SECRET`, `ADS_META_API_VERSION`, `ADS_META_TOKEN_KEY` (không lấy lại được — đề xuất tạo mới, ~2 kết nối Meta phải kết nối lại; CHỜ anh đồng ý), `CRON_SECRET`.
- Anh đưa khóa qua file `~/Documents/key.rtf` (dòng `TÊN=giá trị`); đọc bằng `textutil -convert txt -stdout`, đẩy bằng `wrangler secret put` qua stdin, chỉ in tên. Công cụ gõ ẩn: `main/scripts/set-production-secrets.sh`, `b-cf-production-20261017/scripts/set-b-production-secrets.sh` (Worker phải tồn tại trước).

## Còn phải làm (theo thứ tự)

1. Nhận khóa còn thiếu từ anh (hướng dẫn đã gửi), đẩy lên Worker A/B; xin anh đồng ý tạo mới `ADS_META_TOKEN_KEY`; tự tạo `CRON_SECRET` (A và B), `TELEGRAM_REPORT_SECRET`, đặt `ADS_META_ENABLED=true`, phiên bản API Meta.
2. Anh chọn ngày giờ chuyển (đề xuất 22:00–22:45 giờ VN, tránh cron 23:45).
3. DNS: tên miền đang ở `vclouddns.com` (không phải Cloudflare). Xuất toàn bộ bản ghi từ vclouddns, thêm zone vào Cloudflare, đối chiếu (giữ `adsplan` Vercel, `mail`/`send`/`resend._domainkey`/`_dmarc` cho Resend), đổi nameserver trước 1–2 ngày.
4. Ngày chuyển theo `main/docs/CUTOVER_DAY_A_B.md`: tắt cron Vercel; deploy B `wrangler deploy --env production --domain app.theanhmarketing.com`; build A với `CF_ATTACH_PRODUCTION_DOMAINS=1` qua `build-cloudflare-production.sh` (bật cron + gắn `@`/`www`) rồi deploy; kiểm tra (landing, đăng nhập, `/learn`, CRM, đơn thử, QR, email, mở B từ A); theo dõi 24–48 giờ; học viên B đăng nhập lại 1 lần.
5. Quay lui: gỡ Custom Domain, trỏ lại Vercel (B `9fcf0d2` còn READY), bật cron Vercel.
6. Sau: quyết định 11 file chưa commit ở release root A; gỡ mục thử khỏi Supabase B; anh xóa các file khóa (`key.rtf`, `Không có tiêu đề.rtf`, iCloud `Khóa SEpay Bot.rtf`); giai đoạn 2 (native D1, admin/CRM, bỏ Supabase) + đồng bộ lại dữ liệu D1 copy.

## Tài liệu chính

`main/docs/CUTOVER_DAY_A_B.md`, `main/docs/CLOUDFLARE_PRODUCTION_CUTOVER.md`, `b-cf-production-20261017/docs/CLOUDFLARE_PRODUCTION_CUTOVER_B.md`, `main/CURRENT_STATE.md`, `_cloudflare-migration/CLOUDFLARE_MIGRATION_PLAN.md`, receipt `main/reports/cloudflare-d1/*.json`.
