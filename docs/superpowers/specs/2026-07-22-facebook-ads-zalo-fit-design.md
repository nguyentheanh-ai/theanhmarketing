# Facebook Ads Zalo Proof Fit Design

Date: 2026-07-22
Status: Approved by owner
Route: `/academy/facebook-ads-master-2026`

## Goal

Make the 12-image Zalo proof carousel read as one cohesive proof wall instead of a row of separate screenshots. Preserve the approved image selection, highlighted support-call durations, privacy masks, automatic movement and the existing Agent demo message.

## Approved visual direction

- Use one uniform portrait frame for every Zalo screenshot.
- Crop only about 1–3% so the frames align without noticeably removing chat content.
- Use a 12px gap between cards on desktop and mobile.
- Keep one consistent border radius and border treatment.
- Keep all card tops and bottoms aligned within each carousel sequence.
- Preserve the call-duration highlights and important chat copy; crop position may be adjusted per image only when the default centered crop hides evidence.
- Keep the carousel edge-to-edge and continuously moving.

## Responsive behavior

- Desktop card target: approximately 300px wide by 640px high.
- Mobile card target: approximately 244px wide by 520px high.
- Use `object-fit: cover` inside a fixed card aspect ratio close to the source screenshots, so cropping stays minimal.
- The page itself must not gain horizontal overflow; only the masked carousel track extends beyond the viewport.
- Reduced-motion behavior remains a manually scrollable horizontal row.

## Content and safety constraints

- Keep exactly 12 accessible Zalo proofs; the visual duplicate sequence remains `aria-hidden`.
- Do not add, remove or reorder proof screenshots.
- Do not expose masked credentials or replace approved privacy masks.
- Do not change the 799K-only offer, checkout, payment, email, tracking or order behavior.
- Keep `public/ladipage/facebook-ads-2026.html` and `public/academy/facebook-ads-master-2026.html` byte-identical.

## Verification

- Regression test confirms exactly 12 accessible proof cards and source/published equality.
- Automated geometry check confirms every rendered proof card has the same width and height.
- Desktop and 390px mobile visual QA confirm the crop is light, call durations remain visible, gaps are 12px and the page has no horizontal overflow.
- GIF and existing Agent proof content remain unchanged.
