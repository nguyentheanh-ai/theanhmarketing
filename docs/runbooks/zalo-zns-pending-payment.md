# Runbook: Zalo ZBS nhắc thanh toán khóa học

## Phạm vi và trạng thái an toàn

Worker `POST /api/zalo/pending-payment/send-due` chỉ nhắc một lần cho đăng ký khóa học Facebook Ads, ebook Facebook Ads hoặc gói gồm đúng hai sản phẩm này khi vẫn `pending` sau ít nhất 5 phút. Hệ thống mặc định đóng: thiếu bất kỳ cấu hình bắt buộc nào thì không claim và không gửi.

Không bật production khi mẫu ZBS chưa được Zalo duyệt, chưa có test có kiểm soát đạt yêu cầu, hoặc anh chưa phê duyệt giới hạn tin/ngày. Không backfill đăng ký cũ: mốc rollout phải là thời điểm bản triển khai được bật.

Trạng thái hiện tại (2026-08-03): mẫu `617517` đã gửi duyệt lúc 19:56, loại yêu cầu chuyển khoản, đang duyệt; Zalo dự kiến 2-3 ngày làm việc. Số tin đã gửi là 0. Không đưa ID này vào biến môi trường cho đến khi trạng thái chuyển sang đã duyệt.

## Bí mật và quyền truy cập

- Giữ `ZALO_APP_SECRET`, token OA và `CRON_SECRET` ở kho bí mật phía server; không đưa vào mã nguồn, migration, ảnh chụp, shell history, log hay tài liệu đã commit.
- Token OA được nạp bằng RPC `replace_zalo_oauth_credentials` trong một phiên SQL riêng, có quyền `service_role`. Không gọi RPC này từ trình duyệt.
- URL worker và bearer secret của Cron được lưu trong **Supabase Vault**. Cron chỉ đọc secret tại thời điểm chạy.
- Route yêu cầu header `Authorization: Bearer <giá-trị-từ-Vault>` và chỉ trả số liệu tổng hợp; không trả số điện thoại, token hay nội dung provider.

## Thứ tự rollout bắt buộc

1. Triển khai code và migration với `ZALO_ZNS_ENABLED=false`.
2. Trong Supabase Dashboard, mở SQL Editor ở phiên riêng có quyền phù hợp; gọi RPC bị giới hạn `replace_zalo_oauth_credentials` để nạp access token hiện tại, refresh token hiện tại và thời điểm hết hạn. Xóa câu lệnh khỏi lịch sử làm việc cục bộ nếu quy trình nội bộ yêu cầu; không chụp màn hình giá trị.
3. Chỉ sau khi Zalo duyệt mẫu, đặt `ZALO_ZNS_PENDING_PAYMENT_TEMPLATE_ID` ở môi trường preview/staging trước.
4. Đặt `ZALO_ZNS_ROLLOUT_AT` bằng timestamp UTC của lần triển khai hiện tại. Claim RPC dùng mốc này để không backfill đăng ký cũ.
5. Đặt `ZALO_ZNS_DAILY_LIMIT` bằng giới hạn tin/ngày đã được anh phê duyệt. Không dùng số mặc định hoặc tự ước lượng ngân sách.
6. Chạy đúng một controlled test / test có kiểm soát với số điện thoại và đăng ký thử đã được anh duyệt. Xác minh nội dung, CTA, trang QR/app ngân hàng và marker `sent_at`.
7. Chỉ khi test đạt, đặt `ZALO_ZNS_ENABLED=true`.
8. Cuối cùng mới bật Cron một phút. Bật Cron trước bước 7 không làm phát sinh gửi vì worker vẫn fail-closed, nhưng không phải quy trình chuẩn.

## Tạo Cron trong Supabase Dashboard

1. Mở **Database → Extensions** và bật `pg_cron`, `pg_net` nếu dự án chưa có.
2. Mở **Vault** và tạo hai secret riêng:
   - URL tuyệt đối của worker production, kết thúc bằng `/api/zalo/pending-payment/send-due`;
   - bearer secret trùng với `CRON_SECRET` của server.
3. Mở **Integrations → Cron** (hoặc **Database → Cron Jobs**, tùy giao diện Dashboard).
4. Tạo job tên dễ nhận biết, ví dụ `zalo-pending-payment-send-due`.
5. Chọn lịch `*/1 * * * *` để chạy mỗi một phút.
6. Cấu hình tác vụ `pg_net` gửi `POST` tới URL lấy từ Vault, với header `Authorization: Bearer <secret-đọc-từ-Vault>` và `Content-Type: application/json`. Body có thể là JSON rỗng `{}`.
7. Lưu job ở trạng thái tắt, kiểm tra lại URL, method, header và lịch; chỉ bật sau khi hoàn tất thứ tự rollout ở trên.

Không commit câu SQL có bearer secret. Nếu Dashboard yêu cầu SQL để tạo job, tham chiếu secret bằng Vault trong chính phiên SQL bảo mật; không dán giá trị secret trực tiếp vào câu lệnh.

## Kiểm tra sau khi bật

- Xác nhận worker chạy mỗi phút và chỉ trả các bộ đếm tổng hợp `claimed`, `sent`, `retry`, `cancelled`, `dead`.
- Dùng một đăng ký pending mới trong phạm vi; trước phút thứ 5 không được gửi, sau phút thứ 5 chỉ gửi một lần nếu vẫn chưa thanh toán.
- Chuyển đăng ký sang paid trước lúc worker reread; phải được `cancelled`, không gọi Zalo.
- Chạy lại worker sau thành công; marker `sent_at` phải ngăn gửi trùng.
- Theo dõi số `sent` trong ngày không vượt `ZALO_ZNS_DAILY_LIMIT`.

## Rollback

1. Tắt hoặc xóa Cron trước để ngừng lượt gọi mới.
2. Đặt `ZALO_ZNS_ENABLED=false` trên server và triển khai lại cấu hình.
3. Giữ nguyên bằng chứng outbox, lỗi, attempt count và provider message ID để điều tra.
4. Tuyệt đối không xóa hoặc đặt lại `sent_at`; marker này là hàng rào chống gửi trùng.
5. Không xoá credential vội nếu cần đối soát; nếu buộc phải thu hồi, thực hiện theo quy trình bảo mật của Zalo và Supabase, không ghi token vào ticket hoặc chat.

Khi bật lại, dùng rollout timestamp mới, daily limit đã được phê duyệt lại và một controlled test mới. Không backfill các bản ghi trước mốc bật lại.
