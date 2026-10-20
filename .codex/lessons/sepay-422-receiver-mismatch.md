# SePay 422: kiểm tra tài khoản nhận tiền

Phạm vi: webhook production của main-site khi có HTTP 422 sau thay đổi runtime.

VERIFIED: nhật ký `sepay_webhook_rejected` có thể ghi rõ `Webhook Sepay không khớp tài khoản nhận tiền.`. Nhánh `confirmOrderFromSepay` kiểm tài khoản trước khi tìm đơn và trước khi cập nhật paid; vì vậy lỗi này chặn ghi nhận thanh toán cho request tương ứng.

Cách kiểm: đọc nhật ký đúng Worker, phiên bản và thời điểm; đối chiếu `isSepayAccountMatched` và `getSepayConfig`; đọc trạng thái đơn từ database đang được binding production sử dụng. Không suy số giao dịch từ số lần retry; không coi mọi đơn pending là đã chuyển tiền.

CANDIDATE: có thể cấu hình runtime lệch hoặc dữ liệu tài khoản SePay gửi khác. Chưa có payload của request thất bại thì chưa kết luận bên nào sai. QR lịch sử hoặc secret tồn tại không chứng minh giá trị secret runtime hiện tại đúng.

Kiểm chứng và giới hạn: đã đối chiếu lỗi production với nhánh code trước settlement. Chưa sửa cấu hình, chưa replay, chưa xác nhận tiền hoặc gửi email. Chỉ sửa sau đối chiếu đúng giao dịch/tài khoản; không bỏ kiểm tra tài khoản để vượt lỗi.

Quan sát công cụ: OAuth CLI đọc được D1/settings nhưng API telemetry trả 403. Connector Cloudflare hiện có đọc được telemetry; không thay quyền để vượt lỗi.

## Bổ sung sau đối chiếu giao diện SePay

VERIFIED: webhook cấu hình nhận tất cả tài khoản có thể gửi cả tiền vào tài khoản cá nhân, trong khi checkout chỉ chấp nhận một tài khoản doanh nghiệp. Khi payload thuộc tài khoản khác, HTTP 422 không chứng minh mất thanh toán website; phải đối chiếu từng giao dịch, tài khoản nhận, mã đơn, thời gian và lịch sử tiền vào đúng tài khoản checkout. Lỗi xảy ra trước cutover không thể quy cho cutover chỉ vì sau đó không có đơn paid.

Hiệu chỉnh kết luận: chỉ nói request tương ứng bị chặn. Không nói lỗi này là nguyên nhân doanh thu bằng không nếu chưa có giao dịch khớp đơn và tài khoản. Trạng thái gói đang hoạt động/hóa đơn đã thanh toán tại thời điểm kiểm tra không chứng minh dịch vụ không từng bị ngưng trước đó.

Giới hạn: giao diện checkout tải được và QR đúng không chứng minh luồng nhận tiền, settlement, cấp quyền và email sau cutover. Cần giao dịch thật hợp lệ để kiểm chứng toàn luồng; không tự replay tiền cá nhân hoặc giả lập giao dịch thật.

## Phân biệt lỗi thiếu mã với lỗi Telegram

VERIFIED: `confirmOrderFromSepay` ném `Webhook Sepay thiếu mã đơn.` trước paid commit; nhánh Telegram chỉ chạy sau xác nhận. Khi đơn vẫn pending, paid_at và transaction ID đều rỗng, không có log Telegram failure thì chưa có cơ sở kết luận bot hỏng. Log cùng thời điểm nhưng không có transaction/order identifier chỉ là tương quan, cần payload SePay chính xác để nối giao dịch với đơn. Không tự gửi thông báo PAID hoặc đổi trạng thái chỉ để che lỗi nhận diện.
