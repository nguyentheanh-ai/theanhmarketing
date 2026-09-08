# Pixel Codex — đã phát hành, còn kiểm tra trình duyệt bị chặn

## Trạng thái live mới nhất

- Runtime `6fd734e255eb4c79b5c2ef756dcbb36287a1652b`, preview `dpl_AnDvgYLjhPG5t8rFau6vmsam3s6R` READY/HTTP200; promote dựng production `dpl_2VV2wyTkHnEw6GRoCWSTbFxNAPbr` READY đúng SHA. Cả www/apex200 và HTML tham chiếu đúng deployment. Rollback ứng dụng: `dpl_5pNYu49hDr8WdGznt5EVKvsoUccG`.
- Live chunk `0dyau30mrihwn.js` chứa Pixel Codex/trackSingle; không có token. Chrome hiển thị đúng999K/799K/cọc399K/nút đăng ký hoạt động sau hydration. Không submit form/đơn thật.
- Bốn landing tĩnh Facebook Ads/Ebook/Ebook Premium/AI Master giữ nguyên SHA-256 trước/sau; Agent Kit200, source không đổi. GET orders/SePay/Resend/student-progress405. Runtime error/fatal query sau phát hành không có dòng lỗi.59 kiểm tra Meta/revenue PASS trên canonical; TS/lint/build candidate đã đạt.
- CAPI Test Events: Lead/InitiateCheckout/Purchase đã xử lý, value399000/currencyVND/content_ids đúng sản phẩm. Production chỉ có token, không có test_event_code. Không thử giao dịch thanh toán thật hoặc replay Purchase đơn thật.
- **Chưa xác nhận browser receipt:** Chrome đang báo `ERR_BLOCKED_BY_CLIENT` với fbevents.js; AdBlock bật trên miền, là nguyên nhân ứng viên chưa A/B. Đã gửi yêu cầu owner cho tạm dừng riêng miền rồi bật lại. Chưa bấm Pause. Meta WEB_ONLY stats chưa có dữ liệu; không gọi ready-to-ad trước khi xác nhận PageView/ViewContent. Computer Use exception giữ mở cho bước này, phải khôi phục khi hoàn tất/hủy.

Các mục chưa phát hành/chờ cấp khóa dưới đây là lịch sử đã được thay thế.

## 08/09 — Đã cấp khóa và Meta đã nhận sự kiện thử

Owner đã ủy quyền tiếp tục tạo/lưu khóa và triển khai toàn bộ. `META_CODEX_CAPI_ACCESS_TOKEN` đã lưu Vercel đúng project prj_vjOKusW9puv9LqALfEHl9ROjyf8y, Production/Secret; đọc lại tên/kiểu, không tải giá trị. Không có biến test_event_code trong production.

Fixture dùng đúng ba builder hiện tại, chỉ POST Codex với TEST92204 (không gọi sender fanout, không gửi primary, không tạo DB orders). API HTTP200, events_received3, event_id CODEX-TEST-1788866622957. Events Manager xác nhận Lead/InitiateCheckout/Purchase đều Đã xử lý, nguồn Máy chủ, đúng ID lúc18:23:42. Đây là bằng chứng CAPI test, chưa phải giao dịch thật hay runtime live. Phần chờ cấp khóa bên dưới là lịch sử đã được thay thế.

Pixel1369910554822777 (The Anh Marketing | Codex X10), business3501401880118221/account1255736315302940 đã đọc lại UI/MCP. Không tạo lại.

## Mã cục bộ

- lib/meta/codex-pixel.ts: kiểm tra đúng pathname và host, không chọn theo shared course slug.
- lib/tracking/events.ts: primary dùng trackSingle; Codex init một lần, autoConfig=false, chỉ nhận sự kiện trên landing hoặc checkout có landing_page Codex. Không broadcast sau SPA navigation.
- payment-status-poller: gửi attribution của order vào tracking checkout, không đổi polling/payment.
- conversions-api: giữ primary và gửi thêm Codex bằng META_CODEX_CAPI_ACCESS_TOKEN. Cùng event_id, paid time/amount; Purchase outbox chỉ hoàn thành nếu cả hai đích thành công. Retry giữ ID, không thêm browser Purchase.
- Không đổi schema, SePay, email, access hoặc đơn thật. .env.example chỉ có tên biến rỗng.

## Kiểm chứng

Hai test thiếu browser/server fail trước sửa; sau sửa20/20 focused Meta/Codex/outbox PASS. TypeScript, targeted ESLint,39/39 prebuild và108-route Webpack build PASS. Full invocation688pass/23fail/2skip;19 lỗi môi trường/baseline cũ và4 browser harness không chạy trong sandbox. Không coi là full-suite PASS, không chạy lại browser bằng đường không được phép.

Vercel env run production báo35 sensitive values không cho tải; local false không chứng minh primary production thiếu khóa. Không có khóa Codex khả dụng cho tiến trình hiện tại. UI đã chọn không dùng Dataset Quality API để tránh mở rộng token cũ. Chờ owner xác nhận tại nút Tạo mã truy cập để tạo khóa riêng/lưu sensitive trên Vercel. Chưa tạo khóa, chưa Test Events, chưa commit/push/deploy.

## Tiếp tục

Khóa CAPI → test fixture chỉ vào Codex Test Events (không gửi primary, không tạo DB orders) → Meta readback → kiểm tra browser/checkout attribution → canonical guarded release → live PageView/ViewContent/Meta verification → khôi phục ngoại lệ Computer Use. Không gọi ready-to-ad trước khi xong. Không đặt test code trong production.
