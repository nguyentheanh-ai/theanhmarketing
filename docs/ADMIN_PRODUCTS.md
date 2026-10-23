# Quản trị sản phẩm phần mềm trong /admin (23/10/2026)

Menu admin chia nhóm theo sản phẩm: **Chung** (Tổng quan, Khách hàng & học viên, Báo cáo) · **Khóa học** (Dashboard Sale, Khóa học, Lịch hỗ trợ) · **AdsMind** · **Bot 24/7** · **Hệ thống** (Cài đặt). Nhóm định nghĩa ở `navGroups` trong `components/crm-v2/crm-components.tsx`; trang mới chưa xếp nhóm tự rơi vào "Hệ thống".

## AdsMind — `/admin/crm-v2/adsmind` (chỉ chủ hệ thống)
- Đọc trực tiếp từ AdsMind (dữ liệu nằm ở D1 của AdsMind, website không lưu): doanh thu tháng, gói đang hoạt động, tài khoản, số người đã đồng ý điều khoản, khách đang có gói, đơn hàng.
- Mở/gia hạn gói bằng tay theo email (ghi `granted_by = theanhmarketing:<email admin>`).
- Gọi `ADSMIND_ADMIN_API_URL` (mặc định `https://adsmind.vn/api/billing/internal`) với `Authorization: Bearer ADSMIND_ADMIN_API_TOKEN`. Cùng một khóa đặt ở Vercel (theanh-main) và Cloudflare secret `ADSMIND_ADMIN_API_TOKEN` của worker `theanh-student-cf-production`.

## Bot 24/7 — `/admin/crm-v2/bot247` (chỉ chủ hệ thống)
- Danh sách mã kích hoạt (khách, mã máy, đã dùng/tối đa, trạng thái), cấp mã mới (kèm lời nhắn gửi khách), thu hồi/khôi phục máy.
- Gọi cổng `bot247-connect` (connect.theanhmarketing.com) `BOT247_ADMIN_URL` (mặc định `/v1/admin/licenses`) với `Authorization: Bearer BOT247_ADMIN_TOKEN` = Cloudflare secret `ADMIN_TOKEN` của cổng. Thay cho lệnh `node connect-gateway/issue-license.mjs` (lệnh cũ vẫn dùng được).
- Bảng giá gói Bot 24/7: chưa có, chờ chốt giá.

## Tổng quan
`components/crm-v2/product-pulse.tsx` hiện 2 thẻ AdsMind/Bot 24/7 trên `/admin/crm-v2`, tải trong `Suspense` nên không chặn báo cáo chính.

## API nội bộ của website
`POST /api/admin/crm-v2/products/adsmind` {email, plan} · `POST /api/admin/crm-v2/products/bot247` {action:new|revoke|restore, instance, name?, max?} — đều qua `requireCrmV2OwnerRequest`.
