# Bản sửa admin — 06/09/2026

Trạng thái: bản ứng viên đã hoàn thiện mã, build và kiểm thử cục bộ; chưa áp dụng migration, chưa triển khai production. Không sửa dữ liệu khách trong quá trình kiểm tra.

## Thay đổi

- Dùng một shell/menu cho admin, có đăng xuất, menu theo owner/editor, điều hướng trên điện thoại. Các trang dashboard, báo cáo, học viên, khóa học, leads, cài đặt và thành viên cũ chuyển về màn hiện hành. Trình sửa khóa học cũ có thao tác xóa/tạo lại module không còn được mount.
- Sửa UUID, guard quyền tại từng trang/API LMS, quản lý quyền owner/editor thật, mở Studio cùng tab, khóa slug đang sử dụng, bổ sung giá/thời lượng/cấp độ/ảnh khóa học. Xóa module chuyển thành lưu trữ để giữ bài, tài nguyên và tiến độ.
- Giữ mật khẩu tài khoản đã có khi cấp thêm khóa. Cấp/thu nhiều khóa dùng một giao dịch DB; thu enrollment đồng thời ghi override cho quyền từ đơn đã trả tiền. Giữ đơn, tiến độ, tài nguyên và các khóa khác. Thao tác báo rõ quyền đã cập nhật khi bước gửi email lỗi; giao diện phục hồi khi mất mạng.
- Giữ operation_id, tìm kiếm và URL quay lại qua đăng nhập hết hạn. Panel tài khoản và tiến độ riêng; danh sách có cả quyền free/trial, không ghi là đã thanh toán khi không có đơn. Không tự chọn học viên đầu tiên khi tạo ticket.
- Doanh thu dựa trên đơn public đã trả tiền và paid_at theo ngày Việt Nam; zero vẫn là zero. Loại đếm kép attribution, đồng bộ bucket doanh thu/Ads theo giờ/ngày/tuần, hỗ trợ qua năm. Kiểm tra phân trang/giới hạn/thay đổi tổng trong lúc đọc. Ads thiếu coverage ghi tạm tính. Sửa nghĩa mẫu số khách mua/CAC và phễu; lỗi nguồn không trả dữ liệu demo trên production ở các nhánh đã sửa.

## Kiểm chứng

- Build Next.js production Webpack đạt 104/104; TypeScript đạt.
- Prebuild thanh toán/landing bắt buộc: 39/39.
- Kiểm thử hành vi mới: 14/14, gồm mã service thật, React tương tác mất mạng/email lỗi, role guards trước đọc dữ liệu, phục hồi phiên, nguồn báo cáo lỗi, UUID/mật khẩu và bucket thời gian.
- Toàn dự án: 670 bài, 666 đạt, 4 lỗi baseline Facebook Ads có sẵn, 0 skip. Các lỗi baseline ở facebook-ads-event-contract và facebook-ads-kstudy-hybrid-rebuild, không đổi landing để sửa những assertion ngoài phạm vi admin.
- PostgreSQL/PGlite: rollback khi ghi giữa lô lỗi, kiểm tra đúng parent, reject danh sách trùng/thiếu/stale, revoke đồng nhất, bảo toàn đơn/tiến độ/tài nguyên, quyền EXECUTE riêng service_role. Script: scripts/verify-admin-atomic-db.mjs.
- Lint tất cả file đổi và lượt kiểm tra bổ sung Auth/proxy cuối: 0 lỗi, 0 cảnh báo. HTTP bản cuối giữ nguyên query/operation_id qua đăng nhập; khu học viên vẫn quay lại /dashboard.
- HTTP cục bộ: các trang chức năng admin yêu cầu đăng nhập khi bật cấu hình production; API LMS/members trả403 cho khách. /admin chuyển hai bước qua CRM. Login học viên và trang công khai được kiểm tra bằng HTTP, không phải chứng minh đăng nhập học viên thật.
- Không dùng browser/Computer Use do managed policy. Chưa nghiệm thu hình ảnh các viewport hoặc giao dịch thật trên tài khoản QA. Không gửi email/thanh toán/cấp-thu quyền thật để kiểm thử.

## Phát hành và quay lui

1. Review diff và manifest phạm vi; tích hợp commit ứng viên vào canonical sạch, đồng bộ remote, chạy doctor và preflight đúng release root.
2. Áp dụng duy nhất migration admin_lms_atomic_operations: thêm 3 RPC riêng admin; không backfill, không đổi bảng/RLS, không xóa hay sửa bản ghi khách. Kiểm tra readback chữ ký/quyền sau áp dụng. Không dùng execute_sql cho DDL.
3. Dựng preview, phát hành qua guard vào project theanh-main, kiểm tra domain/deployment/runtime commit, HTTP/asset/hash và runtime logs. Đối chiếu dữ liệu chỉ bằng tổng hợp không chứa danh tính khách.
4. Nếu có lỗi, rollback ứng dụng về dpl_A9Ekxy7FHuaZiLdoCoNjLbX3cLhb (runtime fb6ac5b). Ba RPC thêm mới có thể giữ vì bản cũ không gọi; không restore toàn DB đè các giao dịch/học tập mới.

Canonical: /Users/theanh/CodexProjects/TheAnh-Web/worktrees/theanhmarketing-email-account-hotfix. Feature: /Users/theanh/CodexProjects/TheAnh-Web/worktrees/support-booking-public-duration-20260905, nhánh fix/admin-consolidation-20260906, base 1ca5d9835e93ebe2b965f3164a5429bc50ef7216. App học viên riêng không thay đổi.

## Gỡ mã cũ

Các UI cũ đã ngừng được phục vụ qua route trong bản ứng viên. File nguồn chưa bị xóa vật lý: cleanup-plan chặn course-editor.tsx vì allowlist chỉ cho build/cache. Không đổi/bỏ guard. Manifest exact path/hash/commit phục hồi được lưu cùng báo cáo. Không xóa service dùng chung, API còn hoạt động, schema crm_v2, media, Auth, dữ liệu khách hoặc nguồn dirty của công việc khác.

## Lệnh kiểm chứng

Runtime Node/Python dùng runtime bundle của Codex. Fixture phụ thuộc đặt trong /private/tmp/theanh-admin-db-tests, không đổi dependencies website.

```sh
SUPPORT_UI_TEST_MODULE=/private/tmp/theanh-admin-db-tests/package.json SUPPORT_SQL_TEST_MODULE=/private/tmp/theanh-admin-db-tests/node_modules/@electric-sql/pglite/dist/index.js node --test tests/*.test.mjs
ADMIN_SQL_TEST_MODULE=/private/tmp/theanh-admin-db-tests/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-admin-atomic-db.mjs
node --test tests/facebook-ads-landing.test.mjs tests/payment-page-reference-ui.test.mjs
node node_modules/next/dist/bin/next build --webpack
```


## Phát hành đã được duyệt và DB đã cập nhật

Anh xác nhận “Triển khai bản đã kiểm thử”. Migration thực tế20260906130340_admin_lms_atomic_operations đã áp dụng: đúng3RPC, SECURITY INVOKER, anon/authenticated EXECUTE=false, service_role=true. Các tổng cấu trúc khóa học, enrollment, tiến độ và đơn hàng trước/sau giữ nguyên. Không gọi RPC có ghi dữ liệu khách để QA. Đang tích hợp nguồn ứng viên cdb3b46 vào canonical và triển khai qua guard. Các trạng thái chờ xác nhận/chưa migration ở phía trên là lịch sử.
