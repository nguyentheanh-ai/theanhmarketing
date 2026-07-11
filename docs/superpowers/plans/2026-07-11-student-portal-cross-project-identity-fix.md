# Student Portal Cross-Project Identity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the main website from sending a website-auth user ID to the separate student-portal Supabase project, then safely replay the failed portal provisioning after deployment.

**Architecture:** The main website remains the payment and account source, while the student portal owns its own Auth user and profile identity. The existing portal endpoint already accepts an omitted `userId` and resolves its user by email; the website must therefore omit that field for cross-project provisioning requests.

**Tech Stack:** Next.js, TypeScript, Node test runner, Vercel, two isolated Supabase projects.

---

### Task 1: Lock the cross-project payload contract

**Files:**

- Modify: `services/studentPortalProvisioningService.ts`
- Test: `tests/student-portal-provisioning.test.mjs`

- [ ] **Step 1: Write the failing test**

Add a test that gives `buildStudentPortalProvisioningPayload` a valid website `userId` and asserts that the generated portal payload has no `userId` property while preserving normalized email, access key, order code and source.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/student-portal-provisioning.test.mjs`

Expected: the new assertion fails because the current payload contains the website user ID.

- [ ] **Step 3: Implement the minimal boundary fix**

Remove the optional `userId` field from `StudentPortalProvisioningPayload` and stop adding it in `buildStudentPortalProvisioningPayload`. Keep the function input unchanged so the payment flow caller does not need a behavioral rewrite.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/student-portal-provisioning.test.mjs`

Expected: PASS, including existing payload normalization coverage.

- [ ] **Step 5: Commit**

Run:

```powershell
git add services/studentPortalProvisioningService.ts tests/student-portal-provisioning.test.mjs
git commit -m "fix: omit website user id from portal provisioning"
```

### Task 2: Release and recover the failed portal request

**Files:**

- Modify: `CURRENT_STATE.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`

- [ ] **Step 1: Run production gates**

Run:

```powershell
node --test tests/*.test.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
git diff --check
npm.cmd run build
```

Expected: all commands exit 0.

- [ ] **Step 2: Deploy only through the central guard**

Run:

```powershell
node E:\_workspace-control\scripts\workspace.mjs deploy theanh-main production --confirm "DEPLOY theanh-main TO PRODUCTION"
```

Expected: Vercel reports a Ready production deployment for project `theanhmarketing`.

- [ ] **Step 3: Verify the deployment and replay only the failed portal provisioning**

Inspect the Ready deployment, verify public route smoke, then resend the portal provisioning only for the recorded failed paid order through the existing authenticated/idempotent application flow. Do not create a new order, reset a password, or send a duplicate payment-success email.

- [ ] **Step 4: Record the outcome**

Update the three handoff/state files with the deployment ID, successful portal recovery result, verification commands and any remaining manual owner smoke.

- [ ] **Step 5: Commit release documentation**

Run:

```powershell
git add CURRENT_STATE.md SESSION_LOG.md docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md
git commit -m "docs: record portal provisioning recovery"
```
