# Agent Kit doanh nghiệp: preorder deposit

## Mục tiêu

- Đưa route `/academy/bo-kit-agent-doanh-nghiep` về landing “Đội ngũ nhân sự AI” đang có source thật.
- Hiển thị nhất quán: giá chính thức 999.000đ, preorder 799.000đ, cọc trước ngày mở bán 399.000đ, còn lại 400.000đ.
- Giữ nguyên attribution, `/api/orders`, redirect thanh toán và các asset/QA contract hiện có.
- Không cấp quyền bộ kit ngay khi đơn cọc 399.000đ được thanh toán.

## Phạm vi file

- Source landing: `src/content.js`, `src/App.jsx`, `src/components/Hero.jsx`, `src/components/RegistrationForm.jsx`, `src/checkout.js`, FAQ/CTA liên quan.
- Contract source: `tests/eight-agent-contract.test.mjs`, `tests/content-handoff-clean-url.test.mjs`, `tests/quality-contract.test.mjs`.
- Website canonical: `services/orderService.ts`, `app/thanh-toan/[code]/page.tsx`, payment-success notification, `data/courses.ts`, wrapper và bundle dưới `public/doi-ngu-nhan-su-ai/`.
- QA: source tests, build, website typecheck/lint/test nếu có, HTTP/readback route live sau deploy.

## Implementation order

1. Đổi test từ contract 990k sang contract 999k/799k/399k/400k và kiểm tra plan cọc.
2. Sửa copy landing, CTA, tracking value và payload payment plan.
3. Thêm payment plan cọc ở backend; hiển thị trang thanh toán là “giữ suất preorder”, không mở quyền bộ kit.
4. Build source landing và đồng bộ output sang canonical website.
5. Chạy test/build, kiểm tra exact route, asset, form và payment copy; chỉ deploy khi worktree/source đã rõ.
6. Cập nhật trạng thái, changelog và task log theo workspace protocol.

## Không làm

- Không thay đổi các plan Facebook Ads hoặc ebook 399k hiện có.
- Không tự thêm chính sách hoàn tiền/thời hạn nếu chưa có trong source of truth.
- Không tạo đơn thật, không gọi webhook thật, không upload secret.
