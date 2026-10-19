# CRM Sales — trạng thái chăm sóc và ghi chú (19/10/2026)

Trạng thái hiện hành: ĐÃ PHÁT HÀNH lên website thật, 19/10/2026 10:32 giờ Việt Nam. Phần QA local bên dưới là bằng chứng trước phát hành; xem mục cập nhật cuối để phân biệt giới hạn hosted.
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


## 19/10/2026 10:32 VN — CRM Sales care đã phát hành

Anh đã duyệt bằng “ok”. Feature `0db34eb` được tích hợp thành source `55a0e1f` tại root phát hành Workers. Đã push GitHub; preflight Cloudflare kiểm nguồn sạch, remote SHA, đúng account và Worker đạt. Build với `CF_ATTACH_PRODUCTION_DOMAINS=1`, verifier kiểm 9 cổng native tắt, dry-run và 59 kiểm thử CRM liên quan đều đạt. API xác nhận Worker `theanh-main-cf-production`, version `116d595e-cc53-483c-9d8a-3a35c46e41da` đang nhận 100% lưu lượng.

Đọc lại cho thấy bindings, 38 tên secret, observability, workers.dev/preview tắt và cron `*/5 * * * *` giữ nguyên. Hai route theo hostname giữ nguyên; không đổi DNS, quy tắc redirect, secret, schema hoặc nguồn ghi. 24 kiểm tra HTTP trước/sau đều khớp: 8 trang landing HTTP 200 có hash như cũ, 16 redirect giữ status/location. Sales chuyển khách chưa đăng nhập về trang đăng nhập; API care GET/POST từ chối guest bằng 403 và no-store. Client JavaScript mới HTTP 200, hash khớp artifact; trang chủ HTTP 200.

Chưa có phiên admin trong lượt xác minh, không ghi note khách thật hoặc tuyên bố đã kiểm lưu note bằng trình duyệt đăng nhập. Cách dùng: tải lại `/admin/crm-v2/sales`, bấm ô Chăm sóc hoặc Thêm ghi chú, chọn trạng thái, nhập note rồi bấm Lưu chăm sóc. Bảng hiện người và thời gian cập nhật; cửa sổ giữ 30 lần cập nhật gần nhất.

16 tài liệu/báo cáo đang dở đã được xem là docs-only và lưu tạm theo danh sách chính xác, có bản sao/mã băm và Git stash. Sau phát hành, đã khôi phục đầy đủ byte gốc; handoff giữ nội dung cũ cùng phần bổ sung của tính năng. Giữ bản sao và stash để phục hồi, không clean/reset/commit hộ nội dung cũ. Việc lưu tạm có kiểm tra được thực hiện sau duyệt phát hành; thay trạng thái trước duyệt chưa stash/deploy. Root lại có tài liệu dirty như trước; một lần phát hành mới vẫn phải vượt preflight. Bản runtime quay lui: `10ce659a-1858-40f5-b03e-31aefbeed1a4`; không reset/xóa dữ liệu activity đã phát sinh.

Bằng chứng: `reports/crm-sales-care-20261019/production-release.json`, `reports/crm-sales-care-20261019/landing-hash-readback.json` và `docs/CRM_SALES_CARE_20261019.md`.


## 19/10/2026 — Sửa thao tác chăm sóc ngay khi mở

Theo phản hồi của anh, chọn trạng thái/nhập note/lưu phải dùng được ngay, không chờ lịch sử. Form nhận `initialEntry` từ summary của hàng đang mở; lịch sử tải riêng và không ghi đè draft. Lỗi đọc lịch sử chỉ báo ở phần lịch sử. Khi bắt đầu lưu, hủy lượt đọc lịch sử đang treo để phản hồi cũ không xóa trạng thái vừa lưu. Vẫn chặn gửi lại mù nếu chính lần ghi không được xác nhận; tải lại lịch sử thành công mới mở lại lần lưu đó. Không đổi API/schema/quyền hoặc thanh toán.

Hai ca kiểm thử mới tái hiện khóa form trước sửa; sau sửa và hồi quy đạt 61/61, TypeScript và scoped ESLint đạt. Đây là kiểm thử React renderer/fetch giả lập, chưa là bằng chứng browser. Bản sửa đang chuẩn bị phát hành tiếp trong phạm vi tính năng đã được anh duyệt.


## 19/10/2026 10:43 VN — CRM: sửa trạng thái ngay, không đợi lịch sử (LIVE)

Phản hồi của anh: bấm vào phải đổi trạng thái được ngay. Đã bỏ điều kiện chờ lịch sử khỏi select, note và nút Lưu; form lấy giá trị hiện có từ hàng đang mở. Lịch sử tải riêng, lỗi đọc không khóa form và phản hồi muộn không ghi đè draft/lần lưu mới. Giữ kiểm đối soát nếu chính lần ghi chưa rõ kết quả.

Source `32e30ae`, version Workers `75188bac-8352-4f53-85aa-4c297ddbc92e`, đọc lại 100%. 61 kiểm thử, lint, TS, build và preflight đạt; 24 kiểm tra landing trước/sau khớp. Bundle mới `sales-dashboard-0mJ17e5x.js` HTTP 200/hash khớp artifact; API guest vẫn 403/no-store. Bindings, 38 secret, cron, domain và observability giữ nguyên. 16 tệp cũ được lưu tạm có hash và khôi phục đầy đủ; không ghi khách thật hoặc đổi API/schema/quyền/thanh toán.

Tương tác mạng chậm được kiểm bằng React renderer/fetch điều khiển; chưa dùng phiên admin/browser thật trong lượt này. Bản quay lui: `116d595e-cc53-483c-9d8a-3a35c46e41da`. Bằng chứng: `reports/crm-sales-care-20261019/immediate-edit-release.json`. Mục chuẩn bị phát hành ngay trước đã được thay bằng kết quả LIVE này.
