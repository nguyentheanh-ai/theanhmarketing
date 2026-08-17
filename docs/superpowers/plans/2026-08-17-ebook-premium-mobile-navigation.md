# Ebook Premium Mobile And Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Premium Ebook landing balanced and mobile-first, show the Ebook before copy on mobile, use the real logo, add course-style section navigation/progress, keep the header inside section 1, and standardize preview CTAs as `Đọc thử Ebook`.

**Architecture:** Extend the existing static HTML with scoped CSS, accessible static navigation markup and one small observer/controller inside its current script. Keep the canonical `public/ladipage` source and byte-identical `public/academy` published copy synchronized; do not touch commerce or tracking logic.

**Tech Stack:** Static HTML/CSS/JavaScript, Node test runner, Next.js static public assets.

---

### Task 1: Add regression guards

**Files:**
- Modify: `tests/ebook-facebook-ads-landing.test.mjs`

- [ ] Add assertions for `/brand/ta-logo.svg`, `position: relative` nav, header nesting in hero, mobile `order` values, seven menu links, seven progress dots, observer/controller state and exact `Đọc thử Ebook` labels.
- [ ] Run `/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/ebook-facebook-ads-landing.test.mjs` and confirm the new test fails because the requested markup is absent.

### Task 2: Implement scoped visual and navigation changes

**Files:**
- Modify: `public/ladipage/ebook-facebook-ads-2026-premium.html`
- Modify: `public/academy/ebook-facebook-ads-2026-premium.html`

- [ ] Move the existing nav inside the hero, replace the text mark with the real logo and make the nav non-sticky.
- [ ] Add equal mobile gutters and image-first ordering without changing desktop order.
- [ ] Add the seven-anchor section menu, progress rail and accessible controller.
- [ ] Replace the three preview action labels with `Đọc thử Ebook` while preserving destinations and data events.
- [ ] Copy the completed canonical source file to the published route.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Verify and document

**Files:**
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`

- [ ] Run focused/full relevant tests, typecheck, lint, build, `git diff --check`, source/published byte comparison and mojibake scan.
- [ ] Browser-test desktop and 390px mobile: image precedes text on mobile, header scrolls with section 1, menu/dots navigate, reader CTA opens the existing route, no horizontal overflow and no console errors.
- [ ] Update the website handoff and mandatory workspace ledgers with exact files, commands and production status.
