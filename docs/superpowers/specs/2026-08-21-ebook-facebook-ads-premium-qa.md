# Premium Ebook Facebook Ads 2026 — QA checklist readback

Date: 2026-08-21  
Route: `/academy/ebook-facebook-ads-2026-premium`  
Scope: local release candidate; no production deploy or real order submission.

| # | Workbook checklist | Result | Evidence |
|---:|---|---|---|
| 1 | Hero mới bán kết quả | PASS | Result-first H1, subheadline, purchase CTA and two-chapter trial CTA render at 390/320. |
| 2 | CTA mua nổi bật hơn CTA đọc thử | PASS | Gold purchase CTA precedes the ghost trial CTA; fixed purchase CTA remains visible. |
| 3 | “Không cần đọc hết 471 trang” xuất hiện sớm | PASS | The exact reassurance appears in the hero. |
| 4 | Preview sản phẩm thật ở trên fold kế tiếp | PASS | Real optimized Ebook page images and readable captions are in `#preview`. |
| 5 | Không còn câu ghi chú nội bộ | PASS | Regression rejects manifest/current-process/systematization phrases. |
| 6 | Chương 10 đã đổi tên | PASS | `Chính sách Meta, xử lý lỗi và công cụ hỗ trợ`; no “hướng dẫn rời rạc”. |
| 7 | Đọc thử được đồng bộ | PASS | Landing and public trial both state/expose Parts 1 and 5. |
| 8 | Outcome đứng trước mục lục | PASS | `#outcomes` precedes `#content`. |
| 9 | Mục lục được rút gọn | PASS | Ten short cards use two-line description clamping on desktop/mobile. |
| 10 | Authority có proof | BLOCKED | No owner-approved proof asset or auditable Ebook-author metric was found; no unsupported numbers were added. |
| 11 | Giá 799K → 399K có lý do thật | PASS_BY_REMOVAL | The unverified Ebook strike price/deadline was removed. The separate course add-on retains its server-known 799K price. |
| 12 | Cách nhận Ebook rõ | PASS | Online reader + PDF, account and email delivery after payment confirmation are stated. |
| 13 | Quyền truy cập rõ | BLOCKED_PARTIAL | Devices, update boundary and license are stated; explicit access duration has no approved source, so no lifetime claim was added. |
| 14 | Upsell không cản checkout | PASS | Optional course checkbox is unchecked by default and switches only after user action. |
| 15 | Form và thanh toán không hỏng | PASS_LOCAL_CONTRACT | Existing plans, invoice helper, `/api/orders`, countdown and redirect are regression-covered; no real order was submitted. |
| 16 | Tracking không hỏng | PASS_LOCAL_CONTRACT | PageView/ViewContent/Lead and server checkout/Purchase contracts pass; no early browser InitiateCheckout/Purchase. |
| 17 | SEO không hỏng | PASS | Existing title, description, canonical, OG URL and H1 hierarchy remain present. |
| 18 | Mobile không overflow | PASS | Browser 1440/390/320; 320 form overflow was reproduced, fixed and regression-locked. |
| 19 | Hiệu năng ổn | PASS | Hero asset stays eager; below-fold images remain lazy-loaded and use existing optimized assets. |
| 20 | Không overpromise | PASS | No revenue guarantee, fake value stack, fake countdown or unsupported policy. |

Summary: 18 PASS/PASS_BY_REMOVAL/PASS_LOCAL_CONTRACT; 2 BLOCKED/PARTIAL pending real business evidence.
