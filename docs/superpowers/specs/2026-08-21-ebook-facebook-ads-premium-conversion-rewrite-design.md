# Ebook Facebook Ads 2026 Premium Conversion Rewrite Design

## Scope and source of truth

- Route: `/academy/ebook-facebook-ads-2026-premium`.
- Canonical source: `public/ladipage/ebook-facebook-ads-2026-premium.html`.
- Published mirror: `public/academy/ebook-facebook-ads-2026-premium.html`; both files remain byte-identical.
- Workbook input: `ebook_facebook_ads_2026_landingpage_codex_plan.xlsx`. Its section order, copy and QA rows are implementation requirements only where they do not conflict with verified repository contracts.
- Preserve the existing `full-access-399` standalone plan, optional unselected `full-access-399-course-699` bundle, `/api/orders`, invoice fields, payment redirect, Meta Pixel/CAPI attribution, SEO canonical and responsive navigation.

## Positioning and conversion path

The landing changes from selling page count to selling a repeatable lookup experience: when Facebook Ads has a problem, the buyer opens the relevant part, identifies the likely layer and knows the next action. `471 trang` and `10 phần` remain proof of depth, not the headline promise.

The hero uses the workbook's approved result-first copy, puts `Nhận Ebook Facebook Ads 2026 – 399.000đ` before the secondary `Đọc thử miễn phí 2 chương`, and states early that buyers do not need to read all 471 pages. The existing real Ebook mockup stays above the fold.

## Approved section order

1. Hero: result-first promise, primary purchase CTA, secondary two-chapter trial CTA and three short benefits.
2. Product preview: real mockup/pages immediately after hero.
3. Three situations: cannot identify the problem, waste time finding guidance, and have metrics without a decision.
4. Four-layer mechanism: Offer → Creative → Data → Vận hành.
5. Buyer outcomes: a compact grid based on verified Ebook contents.
6. Usage modes: beginner, active advertiser and owner/team lead, plus a short not-fit boundary.
7. Trial: synchronize with the real public reader that unlocks Parts 1 and 5; remove the contradictory Part 6-only message.
8. Ten-part contents: compact accordion/cards; rename Part 10 to `Chính sách Meta, xử lý lỗi và công cụ hỗ trợ`.
9. Author/proof: use only repository-supported claims—compiled by Nguyễn Thế Anh from practical implementation experience and public research; no invented campaign, spend or student counts.
10. Feedback: do not render until real Ebook-specific testimonials exist. Record this as `BLOCKED_NO_EBOOK_FEEDBACK_ASSETS` rather than repurposing course-support screenshots.
11. Benefit stack: show only real deliverables—471-page Ebook, private online reader, protected PDF download, two-chapter public trial and account-based access. Do not assign artificial bonus prices.
12. Pricing and checkout: 399,000 VND is the primary price. Remove the unverified 799,000 VND Ebook strike-through and fake discount framing. Keep the course bundle optional, visually secondary and unchecked.
13. FAQ: answer only verified delivery/access facts.
14. Final CTA: restate the lookup promise and 399,000 VND action.

## Verified delivery and policy copy

- Format: protected online reader plus full PDF download after agreeing to the policy.
- Delivery: after payment is confirmed, the system provisions/verifies an account, sends the payment-success email, and provides online/PDF links. Do not promise a fixed minute count.
- Access: account-gated online access and a downloadable PDF. Do not use `vĩnh viễn`, `trọn đời` or an expiration period because no explicit commercial duration policy exists.
- Devices: the browser reader works on phone, tablet and computer; the PDF requires a compatible PDF reader.
- Updates: the purchase is for the current Facebook Ads 2026 edition; future update inclusion is not promised unless separately announced.
- Support: technical support for payment, account and document access through the currently configured email and Hotline/Zalo. The Ebook does not include Facebook Ads consulting or 1:1 implementation.
- License: personal/internal business use only; no public sharing, resale or third-party training without written permission.
- Refund: omit a refund promise because the repository contains no approved digital-product refund contract.

## Visual and responsive behavior

Retain the current dark/light design language, real imagery, bottom purchase CTA, compact menu and progress rail. Reduce page length by merging duplicate solution/audience/value explanations, convert the ten-part list into compact disclosure cards and keep below-fold imagery lazy-loaded. At 1440, 390 and 320 pixels there must be no horizontal overflow, sticky controls must not obscure content, and the purchase CTA must remain stronger than the trial CTA.

## Tracking, SEO and commerce guards

- Keep Pixel ID `1315653423712065`, `PageView`, `ViewContent` with `ebook-facebook-ads-2026` and `399000`, `_fbp`, `_fbc`, `fbclid`, UTM forwarding and `Lead` only after `/api/orders` accepts the order using the existing `leadId` dedup value.
- Do not add early `InitiateCheckout` or browser `Purchase`; checkout and server-authoritative Purchase/CAPI remain unchanged.
- Keep title/meta/canonical/OG route valid and source/published HTML byte-identical.
- QA does not submit a real order unless the owner separately authorizes a production test order for this Ebook route.

## Owner-approved hero refinement

The owner supplied a wireframe and approved a header-free hero. The left column contains the compact result-first headline, three scan-friendly bullets and the existing two CTAs. The right column centers the real 3D book mockup above two real interior-page previews and three facts: 471 pages, 10 parts and the 2026 edition. A full-width proof row closes the hero with `Tra cứu theo vấn đề`, `Hình ảnh trực quan` and `Dùng lại lâu dài`. Mobile keeps the visual first, uses 34px/31px headline sizes at 390px/320px, and must preserve the fixed purchase/menu controls without horizontal overflow.
