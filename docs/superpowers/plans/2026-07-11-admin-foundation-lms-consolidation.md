# Admin Foundation and LMS Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CRM v2 the single modern admin foundation, replace the slow duplicate dashboard entry, route legacy admin modules to verified CRM destinations, and upgrade the existing CRM LMS into the approved guided Course Workspace.

**Architecture:** Keep CRM v2 services and APIs as the canonical backend. Consolidate through route redirects and a redesigned shared CRM shell without deleting legacy code. Reuse the existing focused LMS manager, adding a free-navigation step model and modern hierarchy rather than creating a third LMS implementation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase, Node test runner, Playwright, Vercel.

---

### Task 1: Canonical route contract

**Files:**
- Modify: `tests/crm-v2-contract.test.mjs`
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/dashboard/page.tsx`
- Modify: `app/admin/leads/page.tsx`
- Modify: `app/admin/don-hang/page.tsx`
- Modify: `app/admin/hoc-vien/page.tsx`
- Modify: `app/admin/khoa-hoc/page.tsx`
- Modify: `app/admin/bao-cao/page.tsx`

- [ ] **Step 1: Write failing redirect assertions**

Add source contract assertions that owner routes resolve to CRM v2 and editor resolves to the course view:

```js
assert.match(adminIndex, /redirect\("\/admin\/crm-v2"\)/);
assert.match(adminDashboard, /redirect\("\/admin\/crm-v2"\)/);
assert.match(legacyCourses, /redirect\("\/admin\/crm-v2\/students\?view=courses"\)/);
assert.match(legacyLeads, /redirect\("\/admin\/crm-v2\/leads"\)/);
assert.match(legacyOrders, /redirect\("\/admin\/crm-v2\/orders"\)/);
assert.match(legacyStudents, /redirect\("\/admin\/crm-v2\/students"\)/);
assert.match(legacyReports, /redirect\("\/admin\/crm-v2\/reports"\)/);
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `node --test tests/crm-v2-contract.test.mjs`  
Expected: FAIL on current legacy pages.

- [ ] **Step 3: Implement minimal server redirects**

Use `redirect()` after the existing auth/role check. Keep `/admin/viec-can-xu-ly` unchanged until queue parity exists.

- [ ] **Step 4: Run contract test and verify GREEN**

Run: `node --test tests/crm-v2-contract.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/admin tests/crm-v2-contract.test.mjs
git commit -m "feat: make CRM v2 canonical admin entry"
```

### Task 2: Executive Operating Shell

**Files:**
- Modify: `components/crm-v2/crm-components.tsx`
- Modify: `tests/crm-v2-contract.test.mjs`

- [ ] **Step 1: Write failing navigation and visual-contract tests**

Require one primary navigation with verified destinations and prevent the old dark/low-contrast shell patterns:

```js
for (const href of [
  "/admin/crm-v2",
  "/admin/crm-v2/leads",
  "/admin/crm-v2/orders",
  "/admin/crm-v2/students",
  "/admin/crm-v2/students?view=courses",
  "/admin/crm-v2/email",
  "/admin/crm-v2/automation",
  "/admin/crm-v2/reports",
  "/admin/cai-dat",
]) assert.match(components, new RegExp(href.replace(/[?]/g, "\\?")));
assert.match(components, /Executive Operating System/);
assert.match(components, /bg-\[#f4f6f9\]/);
assert.doesNotMatch(components, /text-slate-400[^\n]*bg-slate-50/);
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/crm-v2-contract.test.mjs`.

- [ ] **Step 3: Implement the shell**

Refactor `crmNavigation` into the nine primary modules. Put Activity, Segments, Team and Integrations in a compact `Nâng cao` group. Use neutral canvas, white sidebar, dark readable labels, cobalt active state, medium radius and compact spacing.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/crm-v2-contract.test.mjs`.

- [ ] **Step 5: Commit**

```powershell
git add components/crm-v2/crm-components.tsx tests/crm-v2-contract.test.mjs
git commit -m "feat: unify admin operating shell"
```

### Task 3: Real-data canonical dashboard

**Files:**
- Modify: `app/admin/crm-v2/page.tsx`
- Modify: `components/crm-v2/crm-components.tsx`
- Modify: `tests/crm-v2-contract.test.mjs`

- [ ] **Step 1: Write failing dashboard contract tests**

Require the canonical dashboard to use live CRM data, expose only verified destinations, and avoid synthetic workflow/campaign/course insight rows:

```js
assert.match(dashboardPage, /getCrmV2Dashboard\(query\)/);
assert.match(dashboardPage, /Doanh thu đã thanh toán/);
assert.match(dashboardPage, /Việc cần xử lý/);
assert.match(dashboardPage, /\/admin\/crm-v2\/students\?view=courses/);
assert.doesNotMatch(dashboardPage, /data\.campaigns\.map/);
assert.doesNotMatch(dashboardPage, /data\.workflows\.map/);
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests/crm-v2-contract.test.mjs`.

- [ ] **Step 3: Implement dashboard hierarchy**

Build header/actions, real KPI grid, revenue/funnel charts, task/activity panels and a verified course shortcut. Render each optional source independently. Preserve global date query.

- [ ] **Step 4: Run test and verify GREEN**

Run: `node --test tests/crm-v2-contract.test.mjs`.

- [ ] **Step 5: Commit**

```powershell
git add app/admin/crm-v2/page.tsx components/crm-v2/crm-components.tsx tests/crm-v2-contract.test.mjs
git commit -m "feat: rebuild canonical admin dashboard"
```

### Task 4: Guided CRM LMS Course Workspace

**Files:**
- Modify: `components/crm-v2/lms-management-client.tsx`
- Modify: `components/crm-v2/students-page-client.tsx`
- Modify: `tests/lms-management-contract.test.mjs`
- Modify: `tests/crm-v2-contract.test.mjs`

- [ ] **Step 1: Write failing step-navigation tests**

Require the approved free-navigation steps and remove old generic tab labels as the primary course workflow:

```js
for (const label of [
  "Tổng quan",
  "Nội dung bán hàng",
  "Curriculum",
  "Media & tài liệu",
  "Học viên & quyền học",
  "Analytics",
  "Kiểm tra & xuất bản",
]) assert.match(lmsClient, new RegExp(label));
assert.match(lmsClient, /Chuyển tự do giữa các bước/);
assert.match(lmsClient, /Đã lưu|Đang lưu|Lỗi lưu/);
assert.doesNotMatch(lmsClient, /localStorage/);
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/lms-management-contract.test.mjs tests/crm-v2-contract.test.mjs`.

- [ ] **Step 3: Implement Course Hub and guided workspace**

Reuse the existing course list, selected-course data and action APIs. Introduce a typed step array, URL-backed `step` query, free step navigation, clear save status, course health summary and publish review. Map existing Overview/Module/Lesson/Student/Resource/Settings panels into the seven approved steps without duplicating API calls.

- [ ] **Step 4: Improve curriculum hierarchy**

Use a two-column curriculum layout: module/lesson tree on the left, focused editor on the right. Keep current modal mutation boundaries where safer; do not reintroduce delete-all/reinsert behavior.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test tests/lms-management-contract.test.mjs tests/crm-v2-contract.test.mjs`.

- [ ] **Step 6: Commit**

```powershell
git add components/crm-v2 tests/lms-management-contract.test.mjs tests/crm-v2-contract.test.mjs
git commit -m "feat: modernize CRM LMS course workspace"
```

### Task 5: Documentation and regression verification

**Files:**
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`

- [ ] **Step 1: Update architecture handoff**

Record CRM v2 as canonical admin, compatibility redirects, the shared shell and the CRM LMS ownership boundary.

- [ ] **Step 2: Run focused tests**

```powershell
node --test tests/crm-v2-contract.test.mjs tests/lms-management-contract.test.mjs tests/admin-command-center-service.test.mjs
```

Expected: all pass.

- [ ] **Step 3: Run full gates**

```powershell
node --test tests/*.test.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
npm.cmd run build
git diff --check
```

- [ ] **Step 4: Run protected-route preflight**

```powershell
& 'E:\TheAnh-Business-Workspace\02_Website\scripts\codex-deploy-candidate-preflight.ps1' -CandidatePath 'E:\TheAnh-Business-Workspace\02_Website\worktrees\theanhmarketing-email-account-hotfix'
```

- [ ] **Step 5: Commit documentation**

```powershell
git add docs CURRENT_STATE.md FEATURE_MAP.md SESSION_LOG.md
git commit -m "docs: record unified admin foundation"
```

### Task 6: Production deploy and live verification

**Files:** none

- [ ] **Step 1: Deploy through central guard**

```powershell
node E:\_workspace-control\scripts\workspace.mjs deploy theanh-main production --confirm 'DEPLOY theanh-main TO PRODUCTION'
```

- [ ] **Step 2: Verify deployment and aliases**

Confirm Vercel status `READY`, target `production`, project `theanhmarketing`, and alias `https://www.theanhmarketing.com`.

- [ ] **Step 3: Run live smoke**

Verify canonical admin redirects, CRM API unauthenticated `403`, protected routes non-404, `/go`, `/vao-khoa-hoc`, academy routes and customer learning routes.

- [ ] **Step 4: Authenticated browser QA**

Verify Dashboard, Leads, Orders, Students and Course Workspace; record route timing, visible contrast, working navigation, no fake controls and no console/runtime errors.

- [ ] **Step 5: Review Vercel logs**

Run recent error/fatal log query and stop/rollback if a new production runtime error appears.
