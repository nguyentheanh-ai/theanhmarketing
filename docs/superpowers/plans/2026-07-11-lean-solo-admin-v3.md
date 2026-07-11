# Lean Solo Admin v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broad all-in-one admin with a lean, route-focused LMS and truthful executive dashboard with live Meta Ads comparison.

**Architecture:** Use nested Next.js routes for Course Hub and Course Workspace, existing safe provisioning for student creation, URL-owned editor section state, and Recharts for responsive visualization. Hide unverified operator modules instead of deleting their data/API boundaries.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Recharts 3.8, Supabase, Meta Marketing API, Node test runner, Playwright.

---

### Task 1: Lean navigation, settings and taxonomy

**Files:**
- Modify: `components/crm-v2/crm-components.tsx`
- Create: `app/admin/crm-v2/settings/page.tsx`
- Modify: `lib/crm-v2/data.ts`
- Test: `tests/crm-v2-contract.test.mjs`

- [ ] Write assertions that primary nav has seven modules, settings stays under CRM, Email/Automation are absent, and Ebook wins before Facebook.
- [ ] Run the contract test and confirm RED.
- [ ] Implement the minimal nav/settings/mapper changes.
- [ ] Run the contract test and confirm GREEN.
- [ ] Commit `feat: simplify solo admin navigation`.

### Task 2: Route-based Course Hub and Workspace

**Files:**
- Create: `app/admin/crm-v2/courses/page.tsx`
- Create: `app/admin/crm-v2/courses/[courseSlug]/page.tsx`
- Create: `components/crm-v2/lms/course-hub.tsx`
- Modify: `components/crm-v2/lms-management-client.tsx`
- Modify: `components/crm-v2/students-page-client.tsx`
- Modify: `app/admin/crm-v2/students/page.tsx`
- Test: `tests/lms-management-contract.test.mjs`

- [ ] Write failing route/progressive-disclosure tests: separate URLs, Hub has no editor, Workspace has no course list, no global/raw enrollment form.
- [ ] Run LMS contracts and confirm RED.
- [ ] Build Course Hub with search/status/list and create drawer; route newly created slug into Workspace.
- [ ] Refactor `CourseLmsManager` into selected-course workspace with a compact vertical section rail and back link.
- [ ] Remove `CourseListPanel`, `LmsStudentsOverview`, `GlobalEnrollmentForm` and course-level add enrollment modal.
- [ ] Run LMS contracts and TypeScript; confirm GREEN.
- [ ] Commit `feat: split course hub from course workspace`.

### Task 3: Safe student provisioning in CRM

**Files:**
- Modify: `app/admin/crm-v2/students/page.tsx`
- Modify: `components/crm-v2/students-page-client.tsx`
- Test: `tests/lms-management-contract.test.mjs`

- [ ] Write a failing assertion that CRM students receives official courses and renders `StudentCreateDialog`, while no `add_enrollment` submit remains in student UI.
- [ ] Run and confirm RED.
- [ ] Load `getAdminCourses()` server-side and pass serializable official courses to the client.
- [ ] Render the existing provisioning drawer; do not implement another email flow.
- [ ] Run focused provisioning and LMS tests; confirm GREEN.
- [ ] Commit `feat: use safe provisioning for CRM students`.

### Task 4: Adaptive dashboard charts

**Files:**
- Create: `components/crm-v2/dashboard-charts.tsx`
- Modify: `app/admin/crm-v2/page.tsx`
- Modify: `lib/crm-v2/types.ts`
- Modify: `lib/crm-v2/data.ts`
- Test: `tests/crm-v2-core.unit.ts`
- Test: `tests/crm-v2-contract.test.mjs`

- [ ] Write failing tests for 24 hourly buckets on `today`, daily buckets on `7d/30d`, weekly resolution on `90d`, and Recharts component use.
- [ ] Run and confirm RED.
- [ ] Add one exported pure revenue-series builder and resolution metadata.
- [ ] Implement Area, donut and horizontal bar components using existing Recharts.
- [ ] Replace repeated `SimpleBars` on the canonical dashboard.
- [ ] Run focused tests and TypeScript; confirm GREEN.
- [ ] Commit `feat: add adaptive executive charts`.

### Task 5: Live Meta Ads comparison

**Files:**
- Create: `services/metaAdsReportService.ts`
- Modify: `app/admin/crm-v2/page.tsx`
- Modify: `components/crm-v2/dashboard-charts.tsx`
- Create: `tests/meta-ads-report-service.test.mjs`

- [ ] Write failing adapter tests for env absence, API failure, daily/hourly mapping and safe totals without exposing tokens.
- [ ] Run and confirm RED.
- [ ] Fetch Meta account Insights with an explicit time range; use hourly advertiser-time-zone breakdown for today and daily increment otherwise.
- [ ] Calculate spend, CTR, CPC, CPM, ROAS and CAC from Meta + paid website revenue; keep an explicit unavailable state.
- [ ] Render Ads vs Revenue chart and KPI block only from the adapter result.
- [ ] Run focused tests and confirm GREEN.
- [ ] Commit `feat: compare live ads spend with revenue`.

### Task 6: Verification and production release

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`

- [ ] Run focused CRM/LMS/Meta tests.
- [ ] Run `node --test tests\\*.mjs`, TypeScript, ESLint, diff check and production build.
- [ ] Run Chromium desktop/mobile checks and capture Dashboard/Course Hub/Workspace screenshots without PII.
- [ ] Run protected-route preflight and central project verify.
- [ ] Commit docs, deploy through `_workspace-control`, inspect Ready/aliases, smoke live routes and scan Vercel error logs.
