# Google Sheets order sync runbook

Cap nhat: 2026-07-03

## Owner

- App: `main-site` / `theanhmarketing.com`
- Code: `lib/notifications/google-sheets.ts`, `lib/notifications/google-sheets-order-sync.ts`, va `services/orderSheetSyncService.ts`
- Env production: `GOOGLE_SHEETS_WEBHOOK_URL`, `CRON_SECRET`
- Database observability: `activity_logs` event `sheet_sync_success` va `sheet_sync_failed`

## Flow hien tai

1. `/api/orders` tao don pending, tao/cap nhat lead, roi sau response moi day order sang Google Sheet bang payload order compact.
2. `/api/orders/from-session` tao don tu hoc vien dang nhap, roi sau response moi day order sang Google Sheet.
3. `/api/sepay/webhook` khi don chuyen sang paid se day lai order sang Google Sheet voi source `SePay paid webhook`.
4. `/api/payment/confirm` khi xac nhan thu cong se day order sang Google Sheet voi source `Manual payment confirm`.
5. `/api/orders/sync-google-sheet` quet `public.orders` va retry cac don chua co `activity_logs.sheet_sync_success`.
6. `/api/admin/leads/resync-google-sheet` bo qua cac lead tam `order:*`; lead/prospect chi nen backfill sau khi Apps Script v2 da deploy tach tab `Leads`.

### Fix schema Orders 2026-07-03

- `Orders` tren Google Sheet da duoc reset ve 16 cot co dinh va fill lai 246 don hang production.
- Row 127 da sach: thong tin don khong con bi don vao mot o dai.
- Website production da deploy fix de don moi chi gui 16 field: `entityType`, `dedupeKey`, `date`, `orderCode`, `name`, `email`, `phone`, `courseSlug`, `courseTitle`, `amount`, `status`, `paymentMethod`, `paymentUrl`, `paidAt`, `expiresAt`, `sepayReferenceCode`.
- Khong gui generated checkout note, UTM blob, referrer blob, order items, activity note, hay lead fallback vao tab `Orders` nua.
- Apps Script live hien tai van dung header canonical noi bo. Neu can che do chia sheet theo thang, replace Apps Script bang `docs/GOOGLE_SHEETS_APPS_SCRIPT_MONTHLY.gs` roi deploy Web App version moi.

### Sync lại toàn bộ sau khi xóa dữ liệu trong sheet

- Nếu anh đã dọn sạch bảng, dùng query force để đẩy lại toàn bộ:
  - Đơn hàng: `GET /api/orders/sync-google-sheet?force=1`
  - Lead/prospect: chi chay `POST /api/admin/leads/resync-google-sheet?force=1` sau khi Apps Script v2 da deploy, vi Apps Script cu co the day lead vao sai tab/cot.
- Mặc định không dùng `force` thì route vẫn chỉ retry các bản ghi chưa có cờ sync (vì vậy không backfill lại toàn bộ.
- Khi cần đẩy 1 lần hết danh sách, có thể truyền `limit=` (ví dụ `limit=2000`), route sẽ tôn trọng `force=1` + `limit`.

### Monthly sheet mode 2026-07-03

- Owner request: chia don hang theo tung thang, tab name dang `MM-yyyy`, vi du `07-2026`.
- Apps Script source: `docs/GOOGLE_SHEETS_APPS_SCRIPT_MONTHLY_SAFE.gs`.
- Header hien thi tieng Viet de doc nhanh: `Ma don`, `Ngay tao`, `Khach hang`, `Email`, `SDT`, `Khoa/Goi`, `So tien`, `Trang thai`, `Phuong thuc`, `Ngay thanh toan`, `Han thanh toan`, `Ma GD SePay`, `Course slug`, `Link thanh toan`.
- Don moi phai nam o dong 2 ngay duoi header. Script dung `insertRowBefore(2)` cho order moi; order trung ma se update dung dong cu.
- Website/backfill gui `phone` duoi dang Sheet text formula de Google Sheet giu so 0 dau, vi du `0900000001` khong bi thanh `900000001`.
- Historical reset/backfill dung `scripts/backfill-google-sheets-orders.mjs --reset-monthly` sau khi Apps Script monthly da deploy.
- 2026-07-03 completed: live `doGet` returned `google-sheets-monthly-orders-v1-safe`, production env was updated, and monthly reset wrote `248` orders across `05-2026`, `06-2026`, and `07-2026`.

### Sync lai toan bo theo thang sau khi xoa sheet

- Sau khi Apps Script monthly da deploy, chay:
  - `node scripts\backfill-google-sheets-orders.mjs --dotenv-file E:\TheAnh-Business-Workspace\02_Website\landing-page\.env.production.local --reset-monthly`
- Lenh tren doc toan bo `public.orders`, gui `action: "reset"`, group theo thang, tao/cap nhat cac tab `MM-yyyy`, va sap xep don moi nhat len tren.
- Khong chay `--reset-monthly` vao Apps Script cu. Script cu co the ghi vao sai tab/cot va lam lap lai loi don thong tin vao mot o.
- Neu local env file chua cap nhat Apps Script URL moi, set `GOOGLE_SHEETS_WEBHOOK_URL` trong shell truoc khi chay script de khong lay nham webhook cu.

Order sync khong chan checkout. Neu Google Sheet loi, khach van thay trang thanh toan, nhung he thong ghi `sheet_sync_failed` trong `activity_logs` de admin audit.
Vercel Cron goi route retry moi ngay luc `45 16 * * *` UTC, tuc khoang 23:45 gio Viet Nam. Tai khoan Vercel Hobby khong cho cron chay nhieu lan moi ngay; neu nang cap Pro co the doi sang tan suat ngan hon.

## Anh can cap quyen/cau hinh gi

Anh can co mot Google Apps Script Web App gan voi file Google Sheet dich.

Trong Apps Script:

1. File script phai co function `doPost(e)`.
2. `doPost(e)` phai parse JSON tu `e.postData.contents`.
3. Script phai upsert theo `entityType + dedupeKey` de khong tao trung don.
4. Script phai tra JSON, vi du `{ "ok": true }` hoac `{ "success": true }`.

Khi deploy Apps Script:

1. Bam `Deploy` -> `Manage deployments`.
2. Tao deployment kieu `Web app`.
3. `Execute as`: chon `Me`.
4. `Who has access`: chon `Anyone`.
5. Copy URL ket thuc bang `/exec`, co dang `https://script.google.com/macros/s/.../exec`.
6. Dua URL `/exec` do vao Vercel Production env `GOOGLE_SHEETS_WEBHOOK_URL`.
7. Redeploy production website sau khi doi env.

Khong dung Google Sheet edit URL dang `https://docs.google.com/spreadsheets/d/.../edit`. Code se tu choi URL nay.

## Loi thuong gap

- HTTP 403: Apps Script Web App chua de `Who has access: Anyone`, hoac deployment cu khong con quyen.
- HTML error page / `doPost`: script thieu function `doPost(e)` hoac deploy nham version.
- Missing env: Vercel production thieu `GOOGLE_SHEETS_WEBHOOK_URL` hoac chua redeploy sau khi them env.
- Trung dong: Apps Script append moi moi lan, khong upsert theo `entityType + dedupeKey`.

## Verify nhanh

```powershell
npx.cmd vercel env ls production
node --test tests\google-sheets-sync.test.mjs
```

Sau khi co don that, vao admin activity hoac DB `activity_logs` loc `event_type in ('sheet_sync_success','sheet_sync_failed')` va `metadata.orderCode = '<ma_don>'`.
De verify tong the don da vao Sheet theo audit log:

```sql
with success as (
  select distinct upper(metadata->>'orderCode') as order_code
  from public.activity_logs
  where event_type='sheet_sync_success' and metadata ? 'orderCode'
)
select count(*) filter (where success.order_code is null) as orders_missing_sheet_success
from public.orders
left join success on upper(public.orders.order_code)=success.order_code;
```

De verify lead/prospect:

```sql
select count(*) filter (
  where deleted_at is null and (google_sheet_synced_at is null or google_sheet_sync_error is not null)
) as leads_not_marked_synced
from public.leads;
```

## Bao mat

- Khong in Apps Script URL production, token, API key, service-role key vao chat/docs/log.
- Chi ghi hostname (`script.google.com`) va trang thai loi trong activity metadata.
