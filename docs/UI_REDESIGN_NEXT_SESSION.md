# UI Redesign Next Session Plan

Use this note when the next large visual redesign starts.

## Goal

Rework the public-facing interface from the provided design reference while keeping the current production flows stable:

- Home page
- Header and footer
- Course listing and course detail
- Blog listing and blog detail
- Cart, registration, payment, and student/admin entry points

## Guardrails

- Keep auth, cart, order creation, SePay, Supabase reads, and admin routes working.
- Preserve existing Vietnamese content unless the new design explicitly replaces it.
- Do not change database schema during the visual pass unless a UI requirement truly needs it.
- Keep `.env*` files out of git.
- Verify desktop and mobile. The current site has known mobile layout work, so mobile screenshots matter.

## Suggested Flow

1. Capture the reference design and list the target screens/components.
2. Map reference sections to current files:
   - `app/page.tsx`
   - `components/site/header.tsx`
   - `components/site/footer.tsx`
   - `components/site/socialtrack-chart-visuals.tsx`
   - `components/content/*`
   - `components/course/*`
   - `components/ui/*`
3. Build shared visual primitives first only if repeated at least twice.
4. Redesign page by page, checking responsive behavior after each major page.
5. Run:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build`
   - `npm run verify:routes`
6. Take final screenshots for mobile and desktop before pushing.

## Current Baseline To Preserve

- Security hardening is in place: CSP nonce, security headers, rate limits, sanitized blog HTML, SePay webhook checks.
- Production env verification passes when `.env.production` has real secrets.
- Production RLS SQL is staged in `docs/SUPABASE_PRODUCTION_RLS.sql`.
