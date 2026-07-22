# Facebook Ads Ebook Add-on Design

**Date:** 2026-07-22  
**Status:** Approved direction, awaiting written-spec review  
**Scope:** Facebook Ads Master 2026 landing, order creation, checkout presentation, paid redirect, entitlement and payment emails.

## Goal

Add one optional Ebook upsell to the existing 799,000 VND Facebook Ads AI Agent registration form. The default purchase remains 799,000 VND. When selected, the customer pays 1,098,000 VND in one order and receives both `facebook-ads-2026` and `ebook-facebook-ads-2026` access.

## Customer Experience

- Place one checkbox directly after the phone/Zalo field and before the submit button.
- Default state is unchecked.
- Customer-facing copy:
  - `Mua kèm Ebook Facebook Ads: 299.000đ`
  - original price displayed as `799.000đ` with a strike-through.
- Unchecked state keeps the existing 799,000 VND summary and submit button.
- Checked state updates the summary, selected-plan note, toast and submit button to the combined total `1.098.000đ` immediately.
- The option remains readable and tappable on mobile without introducing another pricing card.

## Authoritative Pricing And Order Model

The browser never sends an arbitrary amount. It selects one of two server-recognized plan IDs:

- `zoom-kit`: 799,000 VND, one `facebook-ads-2026` order item.
- `zoom-kit-ebook-299`: 1,098,000 VND, two order items:
  - `facebook-ads-2026`: 799,000 VND.
  - `ebook-facebook-ads-2026`: 299,000 VND.

`services/orderService.ts` remains the pricing authority. The bundle plan must emit both slugs in `order_items` and in the order course identity so the existing access layer grants both products after payment.

## Checkout And Paid Flow

- Checkout detects the two-item bundle before the standalone Ebook branch.
- The checkout item list shows both the Facebook Ads course and Ebook.
- The combined offer displays current total `1.098.000đ`; its summed reference value is `3.389.000đ` (`2.590.000đ` course reference plus `799.000đ` Ebook reference).
- After payment, a bundle redirects to the Facebook Ads course thank-you page because the course is the primary purchase. Standalone Ebook orders continue redirecting to the Ebook thank-you page.
- Existing SePay QR creation, amount matching, polling and Purchase deduplication remain unchanged.

## Access And Email

- `order_items` is the source for granting both course slugs.
- The paid-success email identifies the bundle instead of collapsing it into an Ebook-only email.
- The combined email includes the existing Facebook Ads AI Agent benefits plus Ebook online-reader/PDF access links.
- The pending-payment email identifies both products and the 1,098,000 VND total.
- Because the bundle contains the protected Ebook, the existing webhook rule still requires a verified login account before the success email is sent.

## Tracking And Cart

- Landing Lead tracking uses 799,000 VND when unchecked and 1,098,000 VND when checked.
- The local cart mirrors the selected state: course-only or course plus Ebook.
- Purchase tracking receives both item slugs through the saved order items.
- Page-level ViewContent remains the existing 799,000 VND primary-course view because the add-on has not been selected at page load.

## Error Handling

- Unknown plan IDs continue failing closed in `orderService`.
- A crafted browser request cannot choose a price or gain the Ebook at a lower amount.
- If account provisioning for the protected Ebook fails, the existing webhook blocks the success email and records the error for manual recovery.
- Unchecking the option restores the original 799,000 VND plan before submission.

## Verification

- TDD regression for default-off state, add-on copy, plan switching, 1,098,000 VND total and two-item server bundle.
- Regression for source/published landing equality and continued absence of the removed 399K landing offer.
- Order/access checks confirm both slugs are present only in the bundle.
- Checkout tests distinguish standalone Ebook, Facebook Ads only and the combined bundle.
- Email tests confirm combined benefits and links without breaking standalone product templates.
- Focused tests, full Node suite, TypeScript, ESLint, `git diff --check` and Next production build.
- Local desktop/mobile rendered verification of the form and total-price state before any production deployment.

## Non-goals

- No separate order for the Ebook.
- No second pricing card.
- No change to the standalone Ebook selling price or landing page.
- No database schema change.
- No production deploy without an explicit owner request.
