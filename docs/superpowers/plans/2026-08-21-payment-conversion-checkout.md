# Payment Conversion Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rút gọn checkout Facebook Ads/Ebook để QR và thông tin copy xuất hiện trước, thêm social proof Zalo thật và CTA hỗ trợ, đồng thời release chỉnh CTA/Mục lục landing Ebook.

**Architecture:** Giữ nguyên route server `/thanh-toan/[code]`, order/SePay/poller. Tách carousel Zalo thành component trình bày độc lập; route chọn copy theo exact course slugs và chỉ ẩn các block cũ cho Ebook/Facebook Ads.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Node test runner, Vercel.

---

### Task 1: Checkout regression contract

**Files:**
- Modify: `tests/payment-page-reference-ui.test.mjs`

- [ ] Thêm assertion cho copy Ebook/khóa học/bundle, notice ghim, thứ tự QR/copy, removal countdown/steps/status, 12 ảnh Zalo, reduced-motion và CTA `https://zalo.me/0367928921`.
- [ ] Chạy `node --test tests/payment-page-reference-ui.test.mjs` và xác nhận RED vì component/copy chưa tồn tại.

### Task 2: Implement focused checkout

**Files:**
- Create: `components/payment/zalo-support-proof.tsx`
- Modify: `app/thanh-toan/[code]/page.tsx`

- [ ] Tạo carousel từ đúng 12 asset `/ladipage/assets/zalo-support/zalo-proof-*.webp`, duplicate sequence cho loop liên tục, hover/focus pause và reduced-motion.
- [ ] Thêm content mapping: Ebook `400+`, course `1.000+`, bundle nhận cả Ebook và tài khoản.
- [ ] Ghim notice owner, đưa QR/TransferDetails lên ngay sau headline, thêm nút Zalo.
- [ ] Chỉ với Facebook Ads/Ebook: bỏ render `PaymentOfferCountdown`, ba bước, status block và after-payment cards; giữ poller hoạt động để paid redirect không đổi.
- [ ] Chạy focused test và xác nhận GREEN.

### Task 3: Verify and release scoped surfaces

**Files:**
- Modify: `CURRENT_STATE.md`, `FEATURE_MAP.md`, `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Include existing scoped edits: Premium Ebook source/published HTML and `tests/ebook-facebook-ads-landing.test.mjs`.

- [ ] Chạy focused tests, full Node tests, typecheck/lint/build theo khả năng repo và `git diff --check`.
- [ ] Browser QA 390px/1440px cho Ebook checkout và Facebook Ads checkout; không submit order.
- [ ] Tạo clean release chỉ gồm checkout + Premium Ebook CTA/Mục lục; không gồm Auth/remarketing/Agent Kit dirty work.
- [ ] Deploy Vercel production, read back live routes/assets/layout và kiểm tra runtime errors.
- [ ] Cập nhật workspace `SESSION_STATE`, `FEATURE_REGISTRY`, `TASK_LOG`, `CHANGELOG` với deployment evidence.
