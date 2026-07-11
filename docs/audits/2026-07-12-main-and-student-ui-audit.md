# Main Website and Student Portal UI Audit

Date: 2026-07-12

Scope: read-only audit of `www.theanhmarketing.com`, the owner CRM/admin candidate and `app.theanhmarketing.com`. Active Ads landing pages, checkout, tracking, student access, learning progress, course content and provisioning are explicitly excluded from edits.

## Evidence

- Production owner dashboard currently reproduces the reported course-chart overlap: long course names collapse into the left axis and become unreadable.
- Candidate CRM Playwright suite passes 33/33 in Chromium, including route render and horizontal-overflow checks.
- Candidate dashboard uses a custom two-line course label, a horizontal ranking chart and height derived from the number of courses.
- Production student dashboard renders without a Next.js error overlay. Its browser console has no application error; the observed Sentry message belongs to the Codex browser extension.
- Production main homepage renders without a Next.js error overlay. Thumbnail URLs sampled directly return HTTP 200.

## Findings and priorities

### P0 - Release safety

- Keep active Ads landing pages immutable during this admin release.
- Keep `/learn`, `/dashboard`, Auth, enrollment, progress, payment, email bridge and checkout outside the candidate diff.
- Production deploy must remain fail-closed until source identity, branch, clean tree, build, Vercel link and protected-route preflight all match.

### P1 - Owner admin

- Deploy the candidate fix for the overlapping course-effectiveness chart after final gates pass.
- Use the dedicated `/admin/course-studio/[courseSlug]` route for focused editing; legacy course-workspace URLs should only redirect and preserve the selected step.
- Keep lead/order KPIs tied to the selected date range and independent of table pagination.
- Meta Ads must show unavailable/partial status rather than invented zeroes. Daily grouping is Vietnam business time after conversion from the ad account timezone.

### P2 - Student portal, next maintenance window

- Recommended first fix: replace the visible `Tải về` links whose live DOM currently has `href="#"` with a disabled state or a real authorized download URL. This was not changed in this release.
- Reduce the dashboard's long first screen by collapsing the onboarding guide after first use and prioritizing Continue/Recent/Favorites above explanatory content.
- Increase the desktop content width and type size slightly; the current dark visual system is coherent but dense at a full-screen 1440p view.
- Preserve the portal's current product model: it is a resource hub, not a second LMS.

### P3 - Less-code architecture

- Main website: split `lib/crm-v2/data.ts` (about 179 KB) by read model (`dashboard`, `orders`, `leads`, `courses`, `activity`) behind the same exported facade. Do not combine this refactor with a production feature release.
- Main website: split `components/crm-v2/lms-management-client.tsx` (about 62 KB) by Studio step while preserving one shared mutation boundary and cache invalidation policy.
- Student portal: move the large static prompt/demo catalogs out of `master-prompts.ts` and `demo-data.ts` into validated content modules or generated JSON imported server-side; keep client bundles free of unused catalog data.
- Prefer Server Components for read-only pages; keep only search, favorites, copy/download controls and interactive editors as client islands.

## Proposed sequence

1. Release the isolated admin correctness candidate after all deploy gates and protected landing smoke checks pass.
2. Observe owner dashboard and Course Studio with production data; rollback if chart readability, date filters or course ordering regress.
3. Open a separate student-portal maintenance task for the broken download affordances and dashboard information hierarchy. Do not bundle it into the main-site release.
4. Schedule the data/LMS file split as a behavior-preserving refactor with characterization tests, not as a visual redesign.
