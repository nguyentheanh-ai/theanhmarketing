# Admin CRM Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing admin area into a denser CRM-style workspace for leads, orders, students, and content operations.

**Architecture:** Keep Supabase/service data flow intact and add a pure admin dashboard view-model layer for derived metrics, statuses, and task lists. Reuse the existing App Router pages and Tailwind styling, adding small shared admin UI primitives instead of introducing a new UI library.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Tailwind CSS, Node test runner for pure helper coverage.

---

### Task 1: Dashboard Data Model

**Files:**
- Create: `lib/admin/crm-dashboard.ts`
- Create: `tests/admin-crm-dashboard.test.mjs`

- [x] Write a failing test for KPI, task, status, and date formatting behavior.
- [x] Implement a small pure helper module that builds the admin dashboard model from orders, leads, and student access records.
- [x] Run the test and keep it passing before touching page JSX.

### Task 2: CRM Admin Shell

**Files:**
- Modify: `components/app/admin-shell.tsx`

- [ ] Group navigation into CRM-like sections.
- [ ] Add a desktop topbar with search affordance, time range label, and quick actions.
- [ ] Tighten surfaces, spacing, active states, and mobile navigation without changing auth behavior.

### Task 3: Dashboard Command Center

**Files:**
- Modify: `app/admin/dashboard/page.tsx`

- [ ] Replace the landing-style overview with KPI cards, priority tasks, pipeline summary, recent orders, hot leads, and student access table.
- [ ] Add useful empty states for real Supabase data gaps.
- [ ] Keep all data reads server-side and parallel.

### Task 4: CRM Pages

**Files:**
- Modify: `components/admin/lead-manager.tsx`
- Modify: `app/admin/leads/page.tsx`
- Modify: `app/admin/don-hang/page.tsx`
- Modify: `app/admin/hoc-vien/page.tsx`

- [ ] Add CRM headers, filters, status chips, and compact tables for Leads, Orders, and Students.
- [ ] Preserve existing create lead and student intake behavior.
- [ ] Keep schema assumptions conservative: derive CRM status from available fields only.

### Task 5: Hydration Warning

**Files:**
- Modify: `components/seo/json-ld.tsx`

- [ ] Add hydration suppression to nonce-bearing JSON-LD scripts so development console is cleaner.

### Task 6: Verification

**Commands:**
- `node tests/admin-crm-dashboard.test.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- Browser check `http://127.0.0.1:3000/admin/dashboard`
