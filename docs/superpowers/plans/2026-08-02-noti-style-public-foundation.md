# Noti-style The Anh Marketing Public Foundation Implementation Plan

> **For Codex:** Execute this plan with the `executing-plans` and `test-driven-development` skills. Keep every change local in the isolated worktree. Do not create a Vercel deployment.

**Goal:** Build the approved light Noti-inspired visual foundation for The Anh Marketing, then apply it to the global public shell, homepage, and course catalog without changing product, order, payment, email, Auth, entitlement, tracking, or admin behavior.

**Architecture:** Keep the existing Next.js App Router and server-side services. Add a presentation-only component layer under `components/marketing/`, use `getCourses()` as the course source, and centralize the new visual language in scoped CSS tokens/classes. Existing business services remain the only owners of product and course data.

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript, Tailwind CSS 4, Framer Motion already installed, Node test runner, Playwright.

**Approved design:** `/Users/theanh/CodexProjects/Kinh doanh/docs/superpowers/specs/2026-08-02-noti-style-theanhmarketing-redesign-design.md`

**Local safety constraint:** The last Vercel production deployment identifies CLI-only commit `b8f87b9edb73ebfba92e205b7ae196caa72b7932`, which is not present in GitHub or the verified backup Git bundle. This phase changes presentation only. Production preview/deploy remains blocked until that backend revenue-evidence hotfix is recovered or reconstructed and regression-tested.

---

## Task 1: Lock the public visual contract with failing tests

**Files:**

- Create: `tests/noti-style-public-foundation.test.mjs`
- Read: `app/page.tsx`
- Read: `components/site/page-shell.tsx`
- Read: `components/site/header.tsx`
- Read: `components/site/footer.tsx`
- Read: `components/content/course-card.tsx`

**Step 1: Write the failing source contract test**

Add assertions that require:

- `PageShell` to use a light `tam-public-shell` surface instead of `ai-os-bg`.
- Header to expose a desktop navigation, a mobile menu trigger, cart, login, and the primary CTA.
- Homepage to render these ordered anchors: `growth-hero`, `growth-stats`, `growth-problems`, `growth-engines`, `growth-demo`, `growth-products`, `growth-proof`, `growth-faq`, and `growth-cta`.
- Homepage course cards to come from `getCourses()` and not from a hard-coded product count.
- FAQ to use an accessible disclosure component.
- CSS to include `prefers-reduced-motion`, light public tokens, reveal motion, hover lift, and static grid treatment.

**Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/noti-style-public-foundation.test.mjs
```

Expected: FAIL because the new component names, ordered anchors, and light public shell do not exist.

**Step 3: Commit the RED test**

```bash
git add tests/noti-style-public-foundation.test.mjs
git commit -m "test: define approved public visual foundation"
```

---

## Task 2: Add the light public design tokens and motion primitives

**Files:**

- Modify: `app/globals.css`
- Create: `components/marketing/reveal.tsx`
- Create: `components/marketing/public-section-heading.tsx`
- Modify: `components/ui/button.tsx`
- Test: `tests/noti-style-public-foundation.test.mjs`

**Step 1: Add scoped public tokens**

Add `.tam-public-shell` tokens for:

- cold off-white background;
- navy text and muted slate copy;
- The Anh cyan/blue accent;
- subtle red only for alert/sale semantics already present;
- card/control/hero radii;
- soft border and shadow values;
- 1152–1200px content width.

Do not globally recolor admin, protected learning, or static sales landing routes.

**Step 2: Add reveal and interaction primitives**

Implement:

- `.tam-reveal` opacity/translate reveal;
- `.tam-stagger` child delays;
- `.tam-lift` hover translate/shadow;
- `.tam-media-zoom` image scale;
- `.tam-grid-bg` static grid;
- button active scale 0.98;
- complete reduced-motion overrides.

`Reveal` must render content on the server and use IntersectionObserver only as progressive enhancement. Content must remain visible if JavaScript fails.

**Step 3: Run the focused test**

Run:

```bash
node --test tests/noti-style-public-foundation.test.mjs
```

Expected: still FAIL only on shell/page components not yet implemented.

**Step 4: Typecheck touched components**

Run:

```bash
npx tsc --noEmit --pretty false
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/globals.css components/marketing/reveal.tsx components/marketing/public-section-heading.tsx components/ui/button.tsx
git commit -m "feat: add light public design foundation"
```

---

## Task 3: Rebuild the public header and footer without changing auth/cart behavior

**Files:**

- Modify: `components/site/page-shell.tsx`
- Modify: `components/site/header.tsx`
- Modify: `components/site/header-auth-actions.tsx`
- Modify: `components/site/footer.tsx`
- Create: `components/site/mobile-menu.tsx`
- Modify: `data/site.ts`
- Test: `tests/noti-style-public-foundation.test.mjs`
- Test: `tests/header-auth-actions.test.mjs`
- Test: `tests/cart-toast-ui.test.mjs`

**Step 1: Preserve behavior contracts**

Keep:

- `HeaderAuthActions` auth-driven CTA behavior;
- cart link/count behavior;
- canonical nav route values;
- real brand settings from `getBrandSettings()`;
- `CartToast` and offer popup mounting;
- no direct Supabase call from the presentation components.

**Step 2: Implement the light header**

Create a 64–72px translucent light header with:

- brand left;
- compact desktop nav center;
- cart/login/primary CTA right;
- accessible mobile menu button and dialog/drawer;
- visible focus states;
- active/hover underline treatment;
- no horizontal-scroll duplicate navigation.

**Step 3: Implement the light footer**

Use a soft off-white footer with:

- brand and verified contact details;
- product/content/help columns using real route values;
- toolkit email action preserving the existing contact behavior;
- privacy/terms placeholders linking only to existing approved routes until dedicated policy routes are confirmed.

**Step 4: Run focused regression**

Run:

```bash
node --test tests/noti-style-public-foundation.test.mjs tests/header-auth-actions.test.mjs tests/cart-toast-ui.test.mjs
```

Expected: header/auth/cart tests PASS; visual foundation test fails only on homepage sections if they are not implemented yet.

**Step 5: Commit**

```bash
git add components/site/page-shell.tsx components/site/header.tsx components/site/header-auth-actions.tsx components/site/footer.tsx components/site/mobile-menu.tsx data/site.ts
git commit -m "feat: rebuild public navigation and footer"
```

---

## Task 4: Build the homepage hero, dashboard mock, and verified statistics strip

**Files:**

- Modify: `app/page.tsx`
- Create: `components/marketing/growth-dashboard-visual.tsx`
- Create: `components/marketing/verified-stat-strip.tsx`
- Modify: `data/home.ts`
- Modify: `data/site.ts`
- Test: `tests/noti-style-public-foundation.test.mjs`

**Step 1: Use only approved copy and verified labels**

Use the existing positioning:

- audience: SME and Solopreneur;
- mechanism: AI Marketing, Performance Ads, Funnel, Automation, CRM/Data;
- promise: build a repeatable Growth System;
- CTAs: course/system discovery and the existing toolkit/blog route.

Do not invent revenue, learner counts, success rates, guarantees, or Noti statistics.

**Step 2: Implement `growth-hero`**

Build:

- centered headline with selective blue accent;
- two pill CTAs;
- subtle grid and slow nonessential glow;
- responsive dashboard visual below the copy;
- small floating status chips using The Anh labels;
- no Noti wordmark, copy, red identity, screenshots, or product data.

**Step 3: Implement `growth-stats`**

Use only verified system descriptors from `platformStats` such as A.G.S, five connected engines, and the current platform year. Present them as system facts, not fabricated customer metrics.

**Step 4: Run test**

Run:

```bash
node --test tests/noti-style-public-foundation.test.mjs
```

Expected: FAIL only for remaining homepage anchors.

**Step 5: Commit**

```bash
git add app/page.tsx components/marketing/growth-dashboard-visual.tsx components/marketing/verified-stat-strip.tsx data/home.ts data/site.ts
git commit -m "feat: build the Growth System homepage hero"
```

---

## Task 5: Build problem, engine, demo, proof, FAQ, and final CTA sections

**Files:**

- Modify: `app/page.tsx`
- Create: `components/marketing/problem-selector.tsx`
- Create: `components/marketing/growth-engine-grid.tsx`
- Create: `components/marketing/home-demo-panel.tsx`
- Create: `components/marketing/proof-grid.tsx`
- Create: `components/marketing/faq-accordion.tsx`
- Create: `components/marketing/cta-panel.tsx`
- Modify: `data/home.ts`
- Modify: `data/site.ts`
- Test: `tests/noti-style-public-foundation.test.mjs`

**Step 1: Implement `growth-problems` and `growth-engines`**

Use existing product/system language to map buyer problems to Attract, Grow, Scale, and CRM/Data. Cards must work as ordinary links/content without JavaScript; client selection may enhance the presentation.

**Step 2: Implement `growth-demo`**

Use an existing owned video/media asset only if the source is verified. Otherwise render an honest product interface preview built from text/CSS and link to an existing product/system route. Do not use a blank fake video player.

**Step 3: Implement `growth-proof`**

Read proof/testimonials from the existing service or approved data source. If no verified records are available, render the approved workflow/output proof assets and avoid fabricated quotes or results.

**Step 4: Implement accessible FAQ and final CTA**

`FaqAccordion` must use buttons with `aria-expanded` and an associated panel id. `CtaPanel` reuses approved CTAs and no false scarcity.

**Step 5: Run test**

Run:

```bash
node --test tests/noti-style-public-foundation.test.mjs
```

Expected: FAIL only for the product section/catalog work.

**Step 6: Commit**

```bash
git add app/page.tsx components/marketing/problem-selector.tsx components/marketing/growth-engine-grid.tsx components/marketing/home-demo-panel.tsx components/marketing/proof-grid.tsx components/marketing/faq-accordion.tsx components/marketing/cta-panel.tsx data/home.ts data/site.ts
git commit -m "feat: complete homepage conversion sections"
```

---

## Task 6: Rebuild course cards and homepage product showcase from the real service

**Files:**

- Modify: `components/content/course-card.tsx`
- Modify: `components/content/course-list.tsx`
- Modify: `components/site/course-catalog-grid.tsx`
- Modify: `app/page.tsx`
- Test: `tests/noti-style-public-foundation.test.mjs`
- Test: `tests/course-service-live-data.test.mjs`
- Test: `tests/cart-toast-ui.test.mjs`

**Step 1: Create one reusable light course card**

Keep:

- real `Course` data;
- existing thumbnail fallback;
- `AddToCartButton` payload;
- price label from the service;
- lesson/module facts from existing helpers;
- route `/khoa-hoc/[slug]`.

Change only presentation: sale/status badges, image zoom, soft card, clear price hierarchy, detail CTA, keyboard focus, responsive height.

**Step 2: Implement `growth-products`**

Render the featured slice returned by `getCourses()`. Do not display or assert a fixed total product number.

**Step 3: Run focused tests**

Run:

```bash
node --test tests/noti-style-public-foundation.test.mjs tests/course-service-live-data.test.mjs tests/cart-toast-ui.test.mjs
```

Expected: PASS.

**Step 4: Commit**

```bash
git add app/page.tsx components/content/course-card.tsx components/content/course-list.tsx components/site/course-catalog-grid.tsx
git commit -m "feat: restyle course discovery with real product data"
```

---

## Task 7: Apply the foundation to `/khoa-hoc` with search and category filtering

**Files:**

- Modify: `app/khoa-hoc/page.tsx`
- Create: `components/marketing/course-catalog-browser.tsx`
- Modify: `components/site/course-catalog-grid.tsx`
- Read: `data/courses.ts`
- Read: `services/courseService.ts`
- Modify: `tests/noti-style-public-foundation.test.mjs`
- Create: `tests/noti-style-course-catalog.test.mjs`

**Step 1: Write the failing catalog behavior test**

Require:

- server page calls `getCourses()`;
- client browser receives courses as props;
- search matches normalized title/description/category text;
- category chips derive from existing course data or an explicit approved mapping;
- result count derives from the filtered array;
- empty state resets filters;
- no hard-coded total product count.

**Step 2: Run RED**

Run:

```bash
node --test tests/noti-style-course-catalog.test.mjs
```

Expected: FAIL.

**Step 3: Implement catalog browser**

Use a client component only for local search/filter state. Keep service fetching in the server page. The URL route, course cards, prices, cart actions, and course availability remain unchanged.

**Step 4: Run GREEN**

Run:

```bash
node --test tests/noti-style-course-catalog.test.mjs tests/noti-style-public-foundation.test.mjs tests/course-service-live-data.test.mjs tests/cart-toast-ui.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/khoa-hoc/page.tsx components/marketing/course-catalog-browser.tsx components/site/course-catalog-grid.tsx tests/noti-style-public-foundation.test.mjs tests/noti-style-course-catalog.test.mjs
git commit -m "feat: add light searchable course catalog"
```

---

## Task 8: Verify Phase 1 locally at production quality

**Files:**

- Modify if architecture changed: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Capture: `docs/qa-screenshots/noti-style-home-desktop-2026-08-02.png`
- Capture: `docs/qa-screenshots/noti-style-home-mobile-2026-08-02.png`
- Capture: `docs/qa-screenshots/noti-style-catalog-desktop-2026-08-02.png`
- Capture: `docs/qa-screenshots/noti-style-catalog-mobile-2026-08-02.png`

**Step 1: Run the focused suite**

```bash
node --test tests/noti-style-public-foundation.test.mjs tests/noti-style-course-catalog.test.mjs tests/header-auth-actions.test.mjs tests/cart-toast-ui.test.mjs tests/course-service-live-data.test.mjs
```

Expected: PASS.

**Step 2: Run the full contract suite**

```bash
node --test tests/*.mjs
```

Expected: all tests PASS.

**Step 3: Run typecheck, lint, and build**

```bash
npx tsc --noEmit --pretty false
npm run lint
npm run build
git diff --check
```

Expected: PASS with no new warnings or errors.

**Step 4: Run local browser QA**

Start:

```bash
npm run dev -- --hostname 127.0.0.1 --port 57128
```

Verify `/` and `/khoa-hoc` at 1440x900, 1024x768, and 390x844:

- section order and no hidden content;
- header/mobile menu/cart/auth CTA;
- hover/reveal/accordion/search/filter;
- no horizontal overflow;
- no console errors;
- no failed owned media requests;
- reduced-motion behavior;
- keyboard focus and menu/FAQ operation.

**Step 5: Update project handoff docs**

Record that Phase 1 is local-only, the exact routes/components changed, QA results, and the unresolved CLI-only production commit. Do not record secrets or customer data.

**Step 6: Stop at local approval gate**

Give anh the localhost URL and screenshot links. Do not invoke any Vercel deployment tool until explicit approval.

