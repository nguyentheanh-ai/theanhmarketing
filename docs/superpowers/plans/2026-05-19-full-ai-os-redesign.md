# Full AI OS Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the whole app layout with the provided dark AI Operating System visual language while preserving all existing business logic and account flows.

**Architecture:** Create reusable dark/glass visual primitives and update shell/card/page components to consume the existing service data unchanged. Keep server components and client components in their current ownership boundaries so auth, cart, checkout, learning access, and admin CRUD continue to use the existing implementation.

**Tech Stack:** Next.js App Router, React Server Components, Tailwind CSS, TypeScript, existing Supabase/Auth/SePay services.

---

### Task 1: Shared Visual Layer

- [ ] Update global CSS tokens and add AI OS utility classes.
- [ ] Update buttons, soft cards, public shell, header, and footer.
- [ ] Preserve all hrefs, form actions, auth checks, and popup/cart hooks.

### Task 2: Public Experience

- [ ] Redesign homepage using AI OS hero, ecosystem map, product modules, proof/content hub, resource cards, and CTA.
- [ ] Redesign course listing, resources, blog, students, about, contact, cart, payment, auth, and 404 using the shared dark system.
- [ ] Keep all page data from existing services and static data.

### Task 3: Course And Learning Experience

- [ ] Update course cards and course detail surfaces.
- [ ] Update student dashboard and learning room chrome.
- [ ] Keep add-to-cart, checkout, lesson access, resources, comments, and auth guards unchanged.

### Task 4: Admin Experience

- [ ] Convert admin CRM shell and CRM panels to AI OS dark style.
- [ ] Keep admin manager components and data mutations unchanged.

### Task 5: Verification

- [ ] Run lint, typecheck, build, route verification, and browser screenshots.
- [ ] Fix any regressions before commit/push.
