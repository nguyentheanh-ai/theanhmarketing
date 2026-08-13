# Thiết kế typography và mobile cho Facebook Ads Master 2026

Ngày: 2026-08-13

App: `main-site`

Project ID: `theanh-main`

Route: `/academy/facebook-ads-master-2026`

## Mục tiêu

Điều chỉnh hệ chữ và trải nghiệm mobile của landing page Facebook Ads Master 2026 theo cảm giác đọc của trang tham chiếu `https://wesuccess.vn/sp/ai-agent-business-2`, nhưng giữ nguyên nhận diện, nội dung và luồng chuyển đổi hiện có.

Hai trang đều dùng `Be Vietnam Pro`. Khác biệt cần xử lý nằm ở cỡ chữ, độ đậm, line-height, letter-spacing, khoảng cách và cách các khối co giãn trên màn hình nhỏ.

## Phạm vi đã duyệt

- Giữ `Be Vietnam Pro` làm font chính.
- Giảm việc dùng `font-weight: 900`; heading chính dùng khoảng 700–800 tùy cấp.
- Bỏ letter-spacing âm quá mạnh ở headline và tăng line-height để tiếng Việt dễ đọc.
- Thu nhỏ heading trên mobile, đặc biệt tại 320px và 390px.
- Chuẩn hóa khoảng cách section, card, CTA và form cho mobile.
- Chuyển các grid cần thiết về một cột, giữ card và media nằm trong viewport.
- Chỉ duy trì một lớp CTA cố định trên mobile; tôn trọng safe-area và không che nội dung cuối trang.
- Giữ cặp source/published HTML byte-identical sau thay đổi.

## Hệ typography mục tiêu

### Desktop

- H1: tối đa khoảng 56–60px, weight 800, line-height 1.1–1.2, letter-spacing nhẹ hoặc bình thường.
- H2: khoảng 38–46px tùy section, weight 700–800, line-height 1.15–1.25.
- H3/card title: khoảng 20–26px, weight 700–800.
- Body: 16–18px, line-height khoảng 1.6.
- Eyebrow/label: giữ nhỏ gọn nhưng không dùng weight 900 đại trà.

### Mobile 390px

- H1: khoảng 30–34px, weight 800, line-height khoảng 1.2.
- H2: khoảng 26–30px, weight 700–800, line-height khoảng 1.25.
- H3/card title: khoảng 19–23px.
- Body: 16px, line-height khoảng 1.6.
- CTA: 15–16px, đủ vùng chạm tối thiểu 44px.

### Mobile 320px

- Dùng `clamp()` hoặc breakpoint hẹp để headline không thành khối chữ quá nặng.
- Không để text, badge, giá, nút, form hoặc media gây tràn ngang.
- Khoảng đệm ngang tối thiểu đủ để nội dung không sát mép nhưng không làm cột đọc quá hẹp.

## Responsive và tương tác

- Hero, pricing, media/copy và card grid co về một cột ở breakpoint hiện có phù hợp.
- Section padding mobile giảm có kiểm soát; không nén toàn trang thành các khối sát nhau.
- Form input, checkbox mua kèm Ebook và submit CTA giữ đủ chiều rộng, khoảng cách và vùng chạm.
- Sticky purchase bar nằm dưới cùng, dùng `env(safe-area-inset-bottom)` và không tạo lớp sticky thứ hai.
- Accordion, menu section, carousel Zalo, ảnh/GIF và các CTA hiện có tiếp tục hoạt động.
- Tôn trọng `prefers-reduced-motion` và không đưa nội dung quan trọng trở lại trạng thái phụ thuộc animation.

## Giới hạn an toàn

Không thay đổi:

- Copy, thứ tự section và tài sản hình ảnh.
- Giá 799.000đ, Ebook mua kèm 299.000đ và tổng bundle 1.098.000đ.
- `paymentPlan`, payload `/api/orders`, redirect checkout hoặc SePay.
- Pixel/CAPI, event name, event ID, UTM, `_fbp`, `_fbc` hoặc tracking khác.
- Quyền học, email, database, API và cấu hình deploy.

## File dự kiến thay đổi

- `public/ladipage/facebook-ads-2026.html`: source chính.
- `public/academy/facebook-ads-master-2026.html`: bản published đồng bộ.
- `tests/facebook-ads-landing.test.mjs`: thêm regression guard cho typography/mobile nếu cần.

Không cần sửa component React, API, database hoặc payment service.

## Kiểm thử chấp nhận

- Source và published HTML bằng nhau.
- Focused landing tests đạt.
- `git diff --check` đạt.
- Typecheck, lint và production build đạt theo quy định repo.
- Visual QA tại 320px, 390px, tablet và desktop.
- `document.documentElement.scrollWidth <= clientWidth` ở mọi viewport kiểm tra.
- Headline dễ đọc, không bị cắt; card, ảnh, form và sticky CTA không che hoặc tràn nội dung.
- CTA, form, Ebook checkbox, accordion, carousel và menu section hoạt động.
- Landing vẫn chứa đúng Pixel/tracking và không phát `InitiateCheckout` sớm.

## Phương án được chọn

Phương án 2: đồng bộ hệ typography theo WeSuccess và tối ưu responsive có mục tiêu. Không chỉ đổi tên font vì hai trang vốn đã cùng dùng `Be Vietnam Pro`; cũng không clone toàn bộ layout của trang tham chiếu.
