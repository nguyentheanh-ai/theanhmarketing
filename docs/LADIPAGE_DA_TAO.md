# Danh sách LadiPage / landing page đã tạo

Cập nhật: 2026-06-03

Repo source: `E:\TheAnh-Business-Workspace\02_Website\landing-page`

## Trang đang publish

| Landing page | URL xem | Source chính | File publish | Ghi chú |
|---|---|---|---|---|
| Facebook Ads Master 2026 | `https://www.theanhmarketing.com/academy/facebook-ads-master-2026` | `public/ladipage/facebook-ads-2026.html` | `public/academy/facebook-ads-master-2026.html` | LadiPage HTML có form tạo đơn `/api/orders`, gói video 399K và gói hỗ trợ 799K. Route được rewrite trong `next.config.ts`. |
| AI Agent Business / Bộ Kit AI Agent cho chủ doanh nghiệp | `https://www.theanhmarketing.com/academy/bo-kit-agent-doanh-nghiep` | `app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx` | Route academy rewrite sang Next.js page | Landing private/noindex cho ads, không nối vào website chính. Checkout dùng `courseSlug=bo-agent-kit-x10-hieu-suat-cong-viec`, `paymentPlan=agent-kit-ads-359`, giá 359K. |

## Trang đang tắt public route

| Landing page | URL đã tắt | Source giữ lại | File publish giữ lại | Ghi chú |
|---|---|---|---|---|
| AI Master X10 hiệu suất | `https://www.theanhmarketing.com/academy/ai-master-x10-hieu-suat` | `public/ladipage/ai-master-x10-hieu-suat.html` | `public/academy/ai-master-x10-hieu-suat.html` | Đã tháo rewrite trong `next.config.ts` và proxy trả 404/noindex cho cả route không đuôi lẫn `.html`. Không xóa source để có thể bật lại nhanh. |

## Trang thanh toán liên quan

| Trang | URL local/demo | Source | Ghi chú |
|---|---|---|---|
| Checkout SePay theo mã đơn | `http://localhost:3000/thanh-toan/AGENTKITDEMO` | `app/thanh-toan/[code]/page.tsx` | Có demo local `AGENTKITDEMO`, QR SePay, thông tin STK, countdown ưu đãi, trạng thái đơn, sau-thanh-toán. Đơn thật dùng `/thanh-toan/<orderCode>`. Trang checkout có PageView, InitiateCheckout và Purchase browser Pixel; webhook SePay bắn Purchase qua CAPI. |
| Countdown ưu đãi checkout | Dùng trong checkout | `components/payment/payment-offer-countdown.tsx` | Copy hiện tại đã rút gọn: `Chỉ còn hôm nay`, `Giữ giá 359K hôm nay`, `Tăng giá sau`. |
| Chi tiết chuyển khoản | Dùng trong checkout | `components/payment/transfer-details.tsx` | QR/STK là trọng tâm, copy từng trường, không dùng copy tất cả ở layout prominent. |

## Quy ước cập nhật

- Sửa LadiPage HTML thì sửa ở `public/ladipage/*.html` trước, sau đó sync sang `public/academy/*.html`.
- Sửa landing Next.js thì sửa đúng route trong `app/khoa-hoc/...`.
- Nếu thay giá/form/payment plan, phải test đủ: landing form -> `/api/orders` -> `/thanh-toan/<orderCode>` -> webhook SePay -> email.
- Không đổi offer, giá, proof, guarantee hoặc xưng hô nếu chưa có yêu cầu rõ.
- Trước khi báo đã xong, chụp lại desktop và mobile, đặc biệt với checkout/QR/STK.
