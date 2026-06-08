# Danh sách LadiPage / landing page đã tạo

Cập nhật: 2026-06-08

Repo source: `E:\TheAnh-Business-Workspace\02_Website\landing-page`

## Trang đang publish

| Landing page | URL xem | Source chính | File publish | Ghi chú |
|---|---|---|---|---|
| AI Master X10 hiệu suất | `https://theanhmarketing.com/academy/ai-master-x10-hieu-suat` | `public/ladipage/ai-master-x10-hieu-suat.html` | `public/academy/ai-master-x10-hieu-suat.html` | LadiPage HTML có assets riêng trong `public/academy/ai-master-x10-assets`. Route được rewrite trong `next.config.ts`. |
| Facebook Ads Master 2026 | `https://theanhmarketing.com/academy/facebook-ads-master-2026` | `public/ladipage/facebook-ads-2026.html` | `public/academy/facebook-ads-master-2026.html` | Deployed `dpl_DSCncK46ydco5XjuDcvK4n4jMDoB`. Public pricing chỉ show 399K và featured 799K; 799K tặng AI Agent lên kế hoạch quảng cáo; optional Zoom +500K nằm trong form và gửi `advanced-zoom` amount 1.299K. Card click chọn gói, mobile scroll đến form, email placeholder `email@gmail.com`. |
| AI Agent Business / Bộ Kit AI Agent cho chủ doanh nghiệp | `https://theanhmarketing.com/academy/bo-kit-agent-doanh-nghiep` | `app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx` | Route academy rewrite sang Next.js page | Landing private/noindex cho ads, không nối vào website chính. Checkout dùng `courseSlug=bo-agent-kit-x10-hieu-suat-cong-viec`, `paymentPlan=agent-kit-ads-359`, giá 359K. |

## Trang thanh toán liên quan

| Trang | URL local/demo | Source | Ghi chú |
|---|---|---|---|
| Checkout SePay theo mã đơn | `http://localhost:3000/thanh-toan/AGENTKITDEMO` | `app/thanh-toan/[code]/page.tsx` | Có demo local `AGENTKITDEMO`, QR SePay, thông tin STK, countdown ưu đãi, trạng thái đơn, sau-thanh-toán. Đơn thật dùng `/thanh-toan/<orderCode>`. Trang checkout có PageView, InitiateCheckout và Purchase browser Pixel; webhook SePay bắn Purchase qua CAPI. |
| Countdown/ưu đãi checkout | Dùng trong checkout | `components/payment/payment-offer-countdown.tsx` | Copy hiện tại dùng giá động từ order/checkout content. Facebook Ads 2026: 799K hiện `2.590.000đ -> 799.000đ`, 399K hiện `2.290.000đ -> 399.000đ`; Agent Kit private 359K là flow riêng. |
| Email access bridge | `https://www.theanhmarketing.com/vao-khoa-hoc` | `app/vao-khoa-hoc/page.tsx`, `proxy.ts` | Route trung gian cho email paid/student-access. Route này cố ý bỏ `X-Frame-Options` và CSP `frame-ancestors` để tránh `ERR_BLOCKED_BY_RESPONSE` trong browser/email webview. Các route khác vẫn giữ frame guard. |
| Chi tiết chuyển khoản | Dùng trong checkout | `components/payment/transfer-details.tsx` | QR/STK là trọng tâm, copy từng trường, không dùng copy tất cả ở layout prominent. |

## Quy ước cập nhật

- Sửa LadiPage HTML thì sửa ở `public/ladipage/*.html` trước, sau đó sync sang `public/academy/*.html`.
- Sửa landing Next.js thì sửa đúng route trong `app/khoa-hoc/...`.
- Nếu thay giá/form/payment plan, phải test đủ: landing form -> `/api/orders` -> `/thanh-toan/<orderCode>` -> webhook SePay -> email.
- Không đổi offer, giá, proof, guarantee hoặc xưng hô nếu chưa có yêu cầu rõ.
- Trước khi báo đã xong, chụp lại desktop và mobile, đặc biệt với checkout/QR/STK.
