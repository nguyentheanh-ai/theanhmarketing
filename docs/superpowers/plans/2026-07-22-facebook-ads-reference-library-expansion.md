# Facebook Ads Reference Library Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the approved Facebook Ads plan, research, visual, and Google Sheet samples without removing the existing prompt downloads.

**Architecture:** `data/course-reference-packs.ts` remains the sole resource catalog. The student lesson page continues passing the course-specific catalog into `CourseReferenceLibrary`; that component groups catalog entries into the existing prompt cards and two download tables. Local artifacts live under `public/course-resources`, while Google Sheets remain external URLs.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Node test runner, Vercel.

---

### Task 1: Extend the resource-library contract

**Files:**
- Modify: `tests/course-reference-library.test.mjs`

- [ ] **Step 1: Write the failing test**

Add assertions that the configuration includes the owner-provided Sheet IDs `1fqHbVsKF8cCZvTFB4L_lK12xe04hWeZwcrsLfNzOqR8` and `1mgLNECv-6c5r1gMZCivh7t7HqrfLVECJNe8YFo6H49A`, renders the headings `Google Sheet & bảng kế hoạch mẫu` and `Nghiên cứu & visual mẫu`, and declares all approved sample files below `public/course-resources/facebook-ads-2026/approved-samples/`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/course-reference-library.test.mjs`

Expected: FAIL because the two Sheet IDs, table headings, and approved sample paths do not exist yet.

- [ ] **Step 3: Commit after the catalog and UI are green**

Run: `git add tests/course-reference-library.test.mjs data/course-reference-packs.ts components/course/course-reference-library.tsx public/course-resources/facebook-ads-2026/approved-samples`

Run: `git commit -m "feat(lms): add Facebook Ads sample plan library"`

### Task 2: Publish unchanged approved source artifacts

**Files:**
- Create: `public/course-resources/facebook-ads-2026/approved-samples/*`

- [ ] **Step 1: Copy only the approved Facebook Ads artifacts**

Copy the two Facebook Ads plan boards, IMC plan, content plan, ads plan, measurement plan, evidence log, assumption/test plan, design-media brief, three research workbooks, latest re-scan, applied Ad Library analysis, and five visual PNG exports. Preserve source bytes and use stable ASCII download filenames.

- [ ] **Step 2: Verify public copies are non-empty**

Run: `Get-ChildItem public/course-resources/facebook-ads-2026/approved-samples -File -Recurse | Where-Object Length -eq 0`

Expected: no output.

### Task 3: Implement grouped download UI

**Files:**
- Modify: `data/course-reference-packs.ts`
- Modify: `components/course/course-reference-library.tsx`

- [ ] **Step 1: Add a resource section field**

Extend `CourseReferencePack` with a section value of `prompt`, `plan`, or `research`. Keep the current six prompt entries and video-script Sheet in `prompt`; assign planning and Sheet entries to `plan`; assign workbooks, analysis documents, and visual PNG exports to `research`.

- [ ] **Step 2: Render the two compact tables**

Group catalog entries by section. Keep prompt cards unchanged. For `plan` and `research`, render a semantic table with `Tài liệu`, `Dùng để làm gì`, `Định dạng`, and one action link. Use `download={!pack.external}` for local files and `target="_blank" rel="noreferrer"` for Sheets.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `node --test tests/course-reference-library.test.mjs`

Expected: all focused tests pass.

### Task 4: Verify and deploy only the LMS resource commit

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`

- [ ] **Step 1: Run the full local gate**

Run: `node --test tests/*.mjs; npx.cmd tsc --noEmit --pretty false; npm.cmd run lint; git diff --check; npm.cmd run build`

Expected: all commands exit 0.

- [ ] **Step 2: Commit deploy status documentation**

Record the exact resource scope, source exclusions, test results, commit, and deployment ID without staging concurrent landing-page work.

- [ ] **Step 3: Stash unrelated landing changes, deploy, and restore them**

Run the workspace candidate preflight and `workspace.mjs deploy theanh-main production --confirm "DEPLOY theanh-main TO PRODUCTION"` from the protected worktree only after the index contains only the LMS resource commit. Restore all unrelated landing changes immediately after the deployment command completes.

- [ ] **Step 4: Smoke test live assets and authenticated lesson UI**

Verify Vercel reports `Ready`, all local public artifacts return 200, each Google Sheet opens, and a logged-in Facebook Ads lesson shows all three resource groups under the video.
