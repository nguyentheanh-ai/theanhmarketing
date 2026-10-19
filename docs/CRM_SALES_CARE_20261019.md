# CRM Sales — trạng thái chăm sóc và ghi chú (19/10/2026)

Trạng thái: mã nguồn và kiểm thử cục bộ; CHƯA phát hành lên website thật.
Project: `theanh-main`. Worktree `worktrees/crm-sales-care-20261019`, nhánh `feat/crm-sales-care-20261019`, base `538889f` từ nguồn Workers đang dùng. Website đã chuyển hosting sang Cloudflare; Supabase vẫn là nguồn dữ liệu/Auth. Không dùng root Vercel cũ để phát hành tính năng này.

## Cách sử dụng

Ở `/admin/crm-v2/sales`, bấm ô **Chăm sóc** hoặc **Thêm ghi chú** của khách. Chọn **Chưa liên hệ**, **Đã liên hệ qua Zalo**, **Đã gọi điện**, **Đã họp Zoom**; nhập ghi chú nhiều dòng (tối đa 1.000 ký tự), bấm **Lưu chăm sóc**. Bảng hiện trạng thái, ghi chú gần nhất, tên người cập nhật và giờ Việt Nam. Cửa sổ hiện 30 lần cập nhật gần nhất, gồm tên/email và thời gian từng lần. Ghi chú nguồn cũ vẫn hiện riêng ở phần thông tin khách.

## Dữ liệu và quyền

- Dùng bảng `public.activity_logs` đã kiểm schema trực tiếp trên project main-site: RLS bật; trường event/description/actor/metadata có thật; `sale_status_updated` là event type sẵn có. Không cần migration, không đổi grants/RLS hoặc nguồn ghi.
- Mỗi lần lưu là một INSERT chứa cả trạng thái, ghi chú và người thực hiện: `event_type=sale_status_updated`, `metadata.action=sales_care`, `customerKey` dùng `customerIdentity` hiện có, `careStatus` là enum riêng. Không sửa hồ sơ nguồn, đơn, thanh toán, quyền học hay Auth.
- Tên chỉ là nhãn hiển thị từ tài khoản đăng nhập; ID/email người thực hiện lấy từ phiên đã xác thực, bỏ qua actor gửi từ trình duyệt.
- API GET/POST `/api/admin/crm-v2/sales/care` yêu cầu owner/editor, CRM đang bật, kiểm khách lại bằng `listAdminCustomerProfiles` đúng role. Owner giữ prospects; editor giữ phạm vi học viên cũ. Không thêm vai trò sale hoặc mở rộng phạm vi xem.
- POST kiểm Origin cùng URL và JSON, rate limit 60/10 phút. Mọi response API no-store. Ghi chú được React escape khi hiển thị.
- Summary đọc theo nhóm 100 khóa khách được phép, phân trang có count; lỗi dữ liệu trả lỗi, không giả trạng thái rỗng. Lịch sử sắp created_at/id giảm dần; summary dùng cùng thứ tự. Ghi chú cũ được giữ trong các event trước, kể cả khi người dùng xóa nội dung ghi chú mới.
- Khi đang lưu, khóa đóng cửa sổ. Khi không xác nhận được kết quả ghi, chặn gửi lại tới khi bấm tải lịch sử. Không khẳng định exactly-once: nếu mất phản hồi sau commit, cần đọc lại; hai người cập nhật đồng thời vẫn giữ cả hai event, trạng thái hiển thị theo event mới nhất.
- CSV/liên hệ và bộ lọc thanh toán/ngày giữ hành vi cũ; CSV vẫn chỉ xuất 6 cột liên hệ cũ, không xuất ghi chú chăm sóc.

## Tệp chính

`app/admin/crm-v2/sales/page.tsx`, `components/admin/sales-dashboard.tsx`, `components/admin/sales-care-editor.tsx`, `lib/admin/sales-care.ts`, `services/salesCareService.ts`, `app/api/admin/crm-v2/sales/care/route.ts`, hai bộ test sales.

## Xác minh và giới hạn

59 kiểm thử model/API/service/UI/hồi quy khách hàng và activity đạt; Cloudflare TypeScript và ESLint các tệp đổi đạt. Kiểm tương tác có giả lập fetch/database, không phải browser/production roundtrip. Đã đọc schema và số event mới trên Supabase bằng SELECT, không ghi khách thật.

Build qua `scripts/build-cloudflare-production.sh`, verifier đúng Worker production, không attach domain, 9 native gate OFF. Chưa có hosted QA cho tính năng; chưa claim đã lưu note trên production. Không đổi landing/assets/payment/checkout/tracking, không deploy staging/production, không đổi secret/DNS/cron.

`theanh-workspace doctor --project theanh-main --check-remote` báo các root release có dirty/untracked (nguồn Workers hiện chủ yếu tài liệu/báo cáo công việc khác). Không reset/stash/commit hộ các thay đổi đó; tạo feature riêng. Trước phát hành cần duyệt production theo AGENTS, tích hợp đúng nguồn hiện hành và vượt preflight Cloudflare; doctor/preflight fail thì không deploy. Không lấy branch feature làm root deploy hoặc bỏ guard.

Đã đối chiếu registry/control-plane/ACTIVE_TASKS, context workspace, AGENTS/CURRENT_STATE/FEATURE_MAP và các phần kiến trúc/design/database/security/handoff liên quan. Tài liệu hosting live hiện hành ưu tiên hơn ghi nhớ release Vercel cũ.
