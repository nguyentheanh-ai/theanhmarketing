# Facebook Ads Mobile Readability Design

## Scope

Fix two owner-reported presentation defects on `/academy/facebook-ads-master-2026` without changing copy, offer, form, checkout, SEO or tracking:

1. The cream `#bo-cong-cu` section uses dark-theme heading and body colors, making its copy nearly invisible.
2. The five Zalo proof images retain their HTML pixel height inside narrow cards, so `object-fit: cover` exposes only a vertical slice. Mobile columns also remain at the 220px minimum instead of a near-full-card reading width.

## Approved visual direction

Keep the cream section. Use dark brown for the heading and card titles, medium brown for supporting copy, orange for the kicker/icons, and a warm translucent white card surface with a restrained border and shadow. Preserve the existing image, section structure and card copy.

Render every proof image at its natural portrait ratio with no horizontal crop. On mobile, show one near-full-width card with only a small preview of the next card and keep mandatory horizontal snap.

## Preservation contracts

- Keep `public/ladipage/facebook-ads-2026.html` and `public/academy/facebook-ads-master-2026.html` byte-identical.
- Keep `zoom-kit`, optional `zoom-kit-ebook-299`, invoice fields, `/api/orders`, payment redirect, SEO/canonical, Pixel ID/value and the custom Meta event script unchanged.
- Do not create a paid order. After production release, create exactly one controlled `facebook-ads-2026` / `zoom-kit` order and leave it `pending`.
- Verify the order code, 799,000 VND amount, checkout route, QR image and pending notification markers. Do not call a payment-confirmation or SePay webhook.

## Verification

- TDD regression for cream-section colors/card surface and proof-image sizing/mobile track width.
- Focused landing/event tests, full Node suite, TypeScript, ESLint, tracking verification, diff check and Webpack production build.
- Browser QA at 1440x900, 390x844 and 320x700 for contrast, complete proof images, snap layout, sticky CTA and horizontal overflow.
- Preview-to-production promotion, exact live HTML hash readback, protected-route smoke and runtime-error scan.

