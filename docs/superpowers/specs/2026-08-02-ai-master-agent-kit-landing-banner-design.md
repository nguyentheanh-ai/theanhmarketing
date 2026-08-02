# AI Master X10 and AI Agent Kit Landing/Banner Design

Date: 2026-08-02
App: `main-site` (`theanhmarketing.com`)
Release scope: local only; owner review before any deployment

## Objective

Complete the two currently sellable AI product journeys without changing the approved homepage or the six coming-soon products:

1. AI Master X10 hiệu suất - Biến tri thức thành tiền.
2. Bộ Agent Kit X10 hiệu suất công việc.

The public header will use the real The Anh logo as the home entry instead of a separate `Trang chủ` navigation item.

## Approved Public Navigation

- The logo/brand remains a link to `/` on desktop and mobile.
- Remove the standalone `Trang chủ` item from `mainNav`.
- Retain Dịch vụ, Khóa học, Tài liệu and Workshop.
- Keep guest and authenticated account actions unchanged.

## Landing Page Sources

### AI Master X10

- Canonical public URL: `/academy/ai-master-x10-hieu-suat`.
- Source of truth: `public/ladipage/ai-master-x10-hieu-suat.html`.
- Published static copy: `public/academy/ai-master-x10-hieu-suat.html`.
- Remove the proxy rule that deliberately returns `404` for this route.
- Add/retain the clean URL rewrite to the published HTML file.
- Preserve the existing buyer-facing structure, interaction, assets and order form.

### AI Agent Kit

- Canonical public URL: `/academy/bo-kit-agent-doanh-nghiep`.
- Keep the existing React landing page under `app/khoa-hoc/bo-kit-agent-doanh-nghiep` and its clean academy rewrite.
- Preserve the current content, calculator, interaction, checkout and order flow.
- This page is a full landing page, not a generic course detail page.

## Price and Tracking Contract

- Both products display and charge exactly `990.000đ`.
- AI Master X10 order amount and marketing event value: `990000` VND.
- Agent Kit server-known payment plan, visible price, Lead event and InitiateCheckout value: `990000` VND.
- Remove all visible/current-price references to AI Master `1.299.000đ` and Agent Kit `359K`.
- Existing old-price presentation may remain only if it is truthful and does not become the charged amount.
- Do not alter Facebook Ads, Ebook or consultation pricing.
- Do not submit a real order during local QA.

## Banner Direction

Create two new non-destructive square WebP course banners, derived from the real visual language of each landing page:

### AI Master X10 Banner

- Product idea: turn expertise into a sellable AI-powered knowledge business system.
- Visual cues: AI workspace, knowledge/product outputs, connected content/landing/CRM modules.
- Palette: bright cobalt, cyan and violet on a luminous light background.
- Exact title: `AI Master X10 hiệu suất`.
- Supporting line: `Biến tri thức thành tiền`.

### Agent Kit Banner

- Product idea: role-based AI agents, commands and repeatable business workflows.
- Visual cues: connected agent nodes, command/workflow cards, an organized operating hub.
- Palette: electric blue, cyan and purple on a luminous light background.
- Exact title: `Bộ Agent Kit X10 hiệu suất công việc`.
- Supporting line: `AI Agent cho Marketing và vận hành`.

Banner constraints:

- Use built-in image generation for the visual backgrounds.
- Apply exact Vietnamese title typography deterministically if generated lettering is inaccurate.
- Do not use black or gray headline copy.
- Do not generate or replace the real The Anh logo.
- No fake testimonials, revenue proof, badges, partner logos or guarantees.
- Save as new versioned project assets; do not overwrite the current v2 covers until the new files are validated.

## Data and Linking

- Only the two relevant `thumbnailImageUrl` values may change to the new banner filenames.
- Keep the four approved live landing-page URLs and status gating intact.
- Keep six coming-soon course cards visible and non-clickable.
- Course slugs, ownership, LMS access and order history remain unchanged.

## Verification

- Regression test: `Trang chủ` is absent from `mainNav`, while the brand link still targets `/`.
- Regression test: both clean academy URLs are configured and not disabled.
- Regression test: both price/tracking contracts use `990000`.
- Source/published AI Master HTML must remain synchronized after edits.
- Browser QA: both landing pages return 200, images load, CTA/form is visible, desktop has no horizontal overflow, and course cards link correctly.
- Inspect both banners in the catalog and confirm no broken image, cropped title or dark gray/black headline copy.
- Run full Node tests, TypeScript, ESLint, Next.js production build and `git diff --check`.

## Out of Scope

- No changes to the approved homepage sections.
- No landing pages for the six coming-soon products.
- No changes to Facebook Ads or Ebook landing pages.
- No production deploy, Supabase mutation, real order, real payment or real email.
