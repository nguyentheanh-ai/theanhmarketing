# Quy trình chuyển chính thức A + B sang Cloudflare D1 (19/10/2026)

Mục tiêu: website A (www.theanhmarketing.com) và App B (app.theanhmarketing.com) **đọc/ghi hoàn toàn trên Cloudflare D1 + R2**, không còn gọi Supabase. Hosting đã ở Cloudflare từ trước; bước này chỉ chuyển **nguồn dữ liệu (writer)**.

## Những gì đã chứng minh trên bản thử (không đụng production)

| Hạng mục | Bằng chứng |
|---|---|
| Lớp tương thích Supabase trên D1 | `lib/cloudflare/d1-postgrest.ts` + kiểm thử; code service thật chạy nguyên trạng |
| Cấu trúc + ràng buộc + trigger | DDL sinh từ schema thật; 8 CHECK không dịch được ghi ở `reports/cloudflare-d1/d1-native-ddl-gaps-*.json` |
| RLS | 95 + 66 policy dịch sang SQLite, 0 bị bỏ (không dịch được ⇒ chặn) |
| RPC | A 30/30, B 10/10 hàm app gọi; 5 hàm Zalo vốn không tồn tại trên Supabase |
| Dữ liệu | A: 85 bảng / 33.991 dòng / 449 tài khoản; B: 62 bảng / 8.439 dòng / 277 tài khoản; PASS từng bảng (`native-load-{a,b}.json`) |
| A thử `theanh-main-cf-native` | Đăng nhập, admin/CRM/LMS đọc dữ liệu thật; đặt đơn (QR, nhắc thanh toán), đổi trạng thái lead, cấp quyền học viên |
| B thử `theanh-student-cf-native` | Đăng nhập A→B native toàn luồng, Ads OS workspace, lịch sử chỉnh sửa khóa học, tải ảnh lên R2 + link ký |
| pg_cron duy nhất của A | chuyển sang cron Worker (`runNativeMaintenanceCron`) |
| Quay lui dữ liệu | `scripts/native-reverse-sync.py` + `native-reverse-sync-auth.mjs` (dry-run đã chạy) |

## Điều kiện trước ngày chuyển

1. Anh nghiệm thu trên điện thoại/máy tính bằng tài khoản thật **trên bản thử** (A: https://theanh-main-cf-native.12c1thdtheanh.workers.dev, B qua nút vào App).
2. Chọn khung giờ ít khách (gợi ý 23:00–23:30 giờ VN), báo trước nếu cần.
3. Gói Cloudflare Workers Paid đang bật (đã có).

## Các bước ngày chuyển (cần anh duyệt một lần)

1. **Đóng băng ghi Supabase** ~15 phút: bật trang bảo trì cho form đặt đơn/đăng ký (hoặc chấp nhận các thao tác trong khung giờ đó sẽ được chép lại bằng delta).
2. Tạo DB production: `wrangler d1 create theanh-native-a`, `theanh-native-b`; R2 `theanh-student-assets`.
3. Nạp dữ liệu mới nhất:
   `python3 scripts/load-native-d1.py fetch|upload|verify --project a --database theanh-native-a` (tương tự b). Yêu cầu PASS.
4. Ghi bản ghi quyền ghi (`d1_data_authority`, phase native) vào 2 DB production.
5. Build + deploy production native:
   - A: `CF_DEPLOY_TARGET=production CF_ATTACH_PRODUCTION_DOMAINS=1 CF_PRODUCTION_NATIVE=1 CF_NATIVE_PROD_DB_ID=<id>` rồi `theanh-workspace preflight-deploy` + deploy theo quy trình hiện hành; secret thêm: `NATIVE_DATA_AUTHORITY`, `NATIVE_RESEND_API_KEY` (= RESEND_API_KEY hiện tại).
   - B: điền `database_id` vào env `production-native`, `wrangler deploy --env production-native`; secret `B_STORAGE_URL_SECRET`.
   - `STUDENT_PORTAL_PROVISION_SECRET` giữ nguyên giá trị hiện tại ở cả A và B.
6. Kiểm tra sau chuyển (10 phút): đăng nhập A, vào App B, đặt 1 đơn thử không chuyển khoản, admin CRM, webhook SePay (đơn test), email chờ thanh toán.
7. Theo dõi 24–72 giờ, giữ Supabase/Vercel **chỉ đọc**, chưa hủy.

## Quay lui (nếu có sự cố trong 72 giờ)

1. Deploy lại phiên bản Worker trước đó (chế độ Supabase) — `wrangler rollback`.
2. Chép ngược dữ liệu phát sinh trên D1 về Supabase:
   `python3 scripts/native-reverse-sync.py --project a --database theanh-native-a --since <giờ chuyển> --apply`
   `node scripts/native-reverse-sync-auth.mjs --project a --database theanh-native-a --since <giờ chuyển> --apply` (tương tự b).
   Lưu ý: thao tác xóa trên D1 sau giờ chuyển không được chép ngược (được liệt kê để xử lý tay).

## Sau khi ổn định (duyệt riêng)

- Hủy dự án Vercel A/B, tạm dừng rồi hủy Supabase A/B (sau khi tải bản sao lưu cuối).
- Gỡ các nhánh QA cũ (Blue bridge, cohort QA).

## Giới hạn còn lại (trung thực)

- 8 CHECK constraint (khoảng thời gian/regex phức tạp) không có trong D1; app vẫn kiểm tra phía code.
- Tìm kiếm không dấu ↔ có dấu giữ như Postgres (lower có dấu); không có full-text search.
- Chưa đo tải thật; D1 phù hợp quy mô hiện tại (~34k dòng A, ~8k dòng B).
- Ảnh/tài liệu A: 508 file đã có trên R2; file tải lên sau ngày chép cần chép bù (`scripts/mirror` của Codex) trong bước 3.

## Nhật ký chuyển thật — 19/10/2026 (anh duyệt chuyển ngay, thay 23:00)

- T0 (bắt đầu chép): 2026-10-19T05:38:36Z (12:38 giờ VN).
- D1 production: theanh-native-a (fabea0e7-…) 85 bảng/34.012 dòng PASS; theanh-native-b (89db1f4c-…) 62 bảng/8.439 dòng PASS; file A 508/508 trên R2.
- Quyền ghi native A kích hoạt 05:49:26Z.
- Deploy: B production-native (app.theanhmarketing.com), A production native (theanhmarketing.com, www).
- Chép bù từ T0: A 10 dòng, B 0; không có tài khoản mới.
- Kiểm tra: trang chủ, landing, đăng nhập, /rest/v1, /auth/v1, App B; nhật ký production không lỗi.
- Phiên bản trước để quay lui: theanh-main-cf-production ['75188bac-8352-4f53-85aa-4c297ddbc92e'] 2026-10-19T03:42:56.535893Z;theanh-student-cf-production ['94854193-2688-4ef4-8a43-fd5adff74e78'] 2026-10-18T10:33:42.541077Z;
- Supabase/Vercel giữ nguyên (chưa hủy). Supabase không còn được website ghi vào.
