# Facebook Ads Reference Downloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three real, customer-safe reference download packs immediately below the lesson video for the `facebook-ads-2026` learning room.

**Architecture:** Static ZIPs and preview images live under the canonical website `public` directory. A typed course configuration selects packs by course slug, a focused presentation component renders the cards, and the existing lesson route passes those packs into `LearningRoom`; no database, entitlement, progress, payment, email, or tracking flow changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Node test runner, PowerShell `Compress-Archive`.

---

### Task 1: Package the audited customer-safe files

**Files:**
- Create: `public/course-resources/facebook-ads-2026/bo-nghien-cuu-doi-thu-facebook-ads.zip`
- Create: `public/course-resources/facebook-ads-2026/bo-ke-hoach-chien-dich-facebook-ads.zip`
- Create: `public/course-resources/facebook-ads-2026/bo-hinh-anh-ai-tham-khao.zip`
- Create: `public/course-resources/facebook-ads-2026/nghien-cuu-doi-thu-facebook-ads.png`
- Create: `public/course-resources/facebook-ads-2026/ke-hoach-chien-dich-facebook-ads.png`
- Create: `public/course-resources/facebook-ads-2026/hinh-anh-ai-tham-khao.png`

- [ ] **Step 1: Create isolated staging folders on E:**

Run:

```powershell
$stage = 'E:\Temp\UserTemp\facebook-ads-reference-packs-20260722'
New-Item -ItemType Directory -Force -Path "$stage\research", "$stage\planning", "$stage\visual" | Out-Null
```

Expected: three empty staging folders exist outside the repository.

- [ ] **Step 2: Add the exact README text to each staging pack**

Create `README.md` in each folder with the following pack-specific content:

```markdown
# Tai lieu mau tham khao

Day la case mau de tham khao cach nghien cuu, khong phai ket qua hay cam ket hieu qua.
Du lieu Meta Ad Library co the thay doi theo thoi diem. Khong sao chep creative cua doi thu.
```

```markdown
# Tai lieu mau tham khao

Day la case mau de tham khao cach lap ke hoach. Ngan sach, KPI va gia dinh chi de minh hoa, khong phai cam ket hieu qua.
```

```markdown
# Hinh anh AI tham khao

Day la hinh minh hoa tao bang AI. File khong dai dien cho nguoi that va khong phai bang chung ve hieu suat quang cao.
```

- [ ] **Step 3: Copy only the audited source files**

Run exact `Copy-Item -LiteralPath` commands for:

```text
Research:
E:\Hệ thống quảng cáo\outputs\competitor-facebook-research-20260721\nghien-cuu-doi-thu-facebook-ads.xlsx
E:\Hệ thống quảng cáo\12_Bieu_mau_va_Template\MAU_PHAN_TICH_DOI_THU_AD_LIBRARY.md

Planning:
E:\Hệ thống quảng cáo\05_Ke_hoach_Marketing\boards\PLAN_BOARD_EBOOK_FACEBOOK_ADS_2026_18_PHAN_2026-07-06.html
E:\Hệ thống quảng cáo\05_Ke_hoach_Marketing\chi_tiet\CONTENT_PLAN_EBOOK_FACEBOOK_ADS_2026_2026-07-06.csv
E:\Hệ thống quảng cáo\05_Ke_hoach_Marketing\chi_tiet\ADS_PLAN_EBOOK_FACEBOOK_ADS_2026_2026-07-06.md
E:\Hệ thống quảng cáo\05_Ke_hoach_Marketing\chi_tiet\DESIGN_MEDIA_BRIEF_EBOOK_FACEBOOK_ADS_2026_2026-07-06.md

Visual:
E:\Hệ thống quảng cáo\05_Ke_hoach_Marketing\landing-pages\assets\marketing-kit-agent-flow-v2.png
E:\Hệ thống quảng cáo\05_Ke_hoach_Marketing\landing-pages\rendered-marketing-kit-1299k\dist\assets\marketing-system-proof-visual.png
```

Expected: no report, CRM, PII screenshot, Agent source, scratch file, duplicated asset, or black poster is present.

- [ ] **Step 4: Build the three ZIPs and copy the three approved previews**

Run:

```powershell
$public = 'public\course-resources\facebook-ads-2026'
New-Item -ItemType Directory -Force -Path $public | Out-Null
Compress-Archive -Path "$stage\research\*" -DestinationPath "$public\bo-nghien-cuu-doi-thu-facebook-ads.zip" -Force
Compress-Archive -Path "$stage\planning\*" -DestinationPath "$public\bo-ke-hoach-chien-dich-facebook-ads.zip" -Force
Compress-Archive -Path "$stage\visual\*" -DestinationPath "$public\bo-hinh-anh-ai-tham-khao.zip" -Force
Copy-Item -LiteralPath 'E:\Temp\UserTemp\codex-ads-demo-audit-20260722\previews\nghien-cuu-doi-thu-facebook-ads\Tong-quan.png' -Destination "$public\nghien-cuu-doi-thu-facebook-ads.png" -Force
Copy-Item -LiteralPath 'E:\Temp\UserTemp\codex-ads-demo-audit-20260722\html-previews\plan18.png' -Destination "$public\ke-hoach-chien-dich-facebook-ads.png" -Force
Copy-Item -LiteralPath 'E:\Hệ thống quảng cáo\05_Ke_hoach_Marketing\landing-pages\assets\marketing-kit-agent-flow-v2.png' -Destination "$public\hinh-anh-ai-tham-khao.png" -Force
```

- [ ] **Step 5: Inspect ZIP entries and file hashes**

Run PowerShell with `System.IO.Compression.ZipFile::OpenRead()` and print entry names only. Expected counts: research `3`, planning `5`, visual `3`; no unsafe paths or unexpected files.

- [ ] **Step 6: Commit the package assets**

```powershell
git add -- public/course-resources/facebook-ads-2026
git commit -m "feat: add Facebook Ads reference download packs"
```

### Task 2: Define the course reference-pack contract with a failing test

**Files:**
- Create: `data/course-reference-packs.ts`
- Create: `tests/course-reference-library.test.mjs`

- [ ] **Step 1: Write the failing contract test**

The test must:

```js
const source = read("data/course-reference-packs.ts");
assert.match(source, /facebook-ads-2026/);
assert.equal((source.match(/downloadUrl:/g) ?? []).length, 3);
assert.doesNotMatch(source, /99_Tam|04_Bao_cao_quang_cao|CRM|VOICE_DNA|scratch/i);
for (const file of expectedPublicFiles) assert.ok(exists(file));
```

It must also assert that the lesson page calls `getCourseReferencePacks(course.slug)` and passes `referencePacks` to `LearningRoom`, and that the library component contains the three approved titles plus the disclaimer.

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
node --test tests/course-reference-library.test.mjs
```

Expected: FAIL because `data/course-reference-packs.ts` and the component do not exist.

- [ ] **Step 3: Create the typed course configuration**

Implement:

```ts
export type CourseReferencePack = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  previewUrl: string;
  previewAlt: string;
  downloadUrl: string;
  formats: string[];
};

const packsByCourseSlug: Record<string, CourseReferencePack[]> = {
  "facebook-ads-2026": [
    {
      id: "research",
      eyebrow: "01 · Nghiên cứu",
      title: "Bộ nghiên cứu đối thủ Facebook Ads",
      description: "Bản nghiên cứu 5 sheet đã kiểm tra hiển thị, kèm mẫu trắng để tự phân tích từ Meta Ad Library.",
      previewUrl: "/course-resources/facebook-ads-2026/nghien-cuu-doi-thu-facebook-ads.png",
      previewAlt: "Mẫu nghiên cứu đối thủ Facebook Ads",
      downloadUrl: "/course-resources/facebook-ads-2026/bo-nghien-cuu-doi-thu-facebook-ads.zip",
      formats: ["Excel 5 sheet", "Template MD", "Nguồn công khai"],
    },
    {
      id: "planning",
      eyebrow: "02 · Kế hoạch",
      title: "Bộ kế hoạch chiến dịch mẫu",
      description: "Plan board 18 phần, content plan, ads plan và design brief để chuyển nghiên cứu thành việc triển khai.",
      previewUrl: "/course-resources/facebook-ads-2026/ke-hoach-chien-dich-facebook-ads.png",
      previewAlt: "Mẫu kế hoạch chiến dịch Facebook Ads",
      downloadUrl: "/course-resources/facebook-ads-2026/bo-ke-hoach-chien-dich-facebook-ads.zip",
      formats: ["Plan HTML", "Content CSV", "Ads + Design brief"],
    },
    {
      id: "visual",
      eyebrow: "03 · Hình ảnh AI",
      title: "Bộ hình ảnh AI tham khảo",
      description: "Hình minh họa hệ thống marketing đã lọc bản trùng và không chứa dữ liệu khách hàng thật.",
      previewUrl: "/course-resources/facebook-ads-2026/hinh-anh-ai-tham-khao.png",
      previewAlt: "Hình minh họa hệ thống marketing tạo bằng AI",
      downloadUrl: "/course-resources/facebook-ads-2026/bo-hinh-anh-ai-tham-khao.zip",
      formats: ["PNG chất lượng cao", "Không PII", "AI minh họa"],
    },
  ],
};

export function getCourseReferencePacks(courseSlug: string) {
  return packsByCourseSlug[courseSlug] ?? [];
}
```

Use the six stable `/course-resources/facebook-ads-2026/` preview and ZIP URLs shown in the configuration above.

- [ ] **Step 4: Commit the contract and RED test**

```powershell
git add -- data/course-reference-packs.ts tests/course-reference-library.test.mjs
git commit -m "test: define Facebook Ads reference pack contract"
```

### Task 3: Render the library directly below the video

**Files:**
- Create: `components/course/course-reference-library.tsx`
- Modify: `components/course/learning-room.tsx`
- Modify: `app/learn/[course]/[lesson]/page.tsx`
- Modify: `tests/learning-room-youtube-layout.test.mjs`

- [ ] **Step 1: Extend the layout test and verify RED**

Add assertions that `CourseReferenceLibrary` appears after the video container and before the `mt-4 grid gap-4` lesson-controls container. Run:

```powershell
node --test tests/learning-room-youtube-layout.test.mjs tests/course-reference-library.test.mjs
```

Expected: FAIL because the library is not integrated.

- [ ] **Step 2: Build the focused presentation component**

Create a component with this interface:

```tsx
type CourseReferenceLibraryProps = { packs: CourseReferencePack[] };
export function CourseReferenceLibrary({ packs }: CourseReferenceLibraryProps) {
  if (packs.length === 0) return null;
  return (
    <section aria-labelledby="course-reference-library-title" className="mt-4 rounded-2xl border border-[#77d7ff]/15 bg-white/6 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-white/62">Tài liệu mẫu tham khảo</p>
      <h2 id="course-reference-library-title" className="mt-2 text-xl font-semibold text-white">Tải về để xem và làm theo</h2>
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {packs.map((pack) => (
          <article className="overflow-hidden rounded-xl border border-white/10 bg-white/8" key={pack.id}>
            <div className="relative aspect-video overflow-hidden bg-black/30">
              <Image alt={pack.previewAlt} className="object-cover object-top" fill sizes="(min-width: 1280px) 28vw, 100vw" src={pack.previewUrl} />
            </div>
            <div className="p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#77d7ff]">{pack.eyebrow}</p>
              <h3 className="mt-2 text-base font-semibold text-white">{pack.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/68">{pack.description}</p>
              <a className="mt-4 block rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-black" download href={pack.downloadUrl}>Tải tài liệu</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

Use `next/image` with `fill`, an `aspect-video` wrapper, one-column mobile and three-column desktop grid, same-origin `<a download>` buttons, and the exact visible disclaimer from the design spec.

- [ ] **Step 3: Pass packs from the server route**

In the lesson page:

```tsx
const referencePacks = getCourseReferencePacks(course.slug);
return (
  <LearningRoom
    course={course}
    currentLesson={currentLesson}
    lessons={lessons}
    referencePacks={referencePacks}
  />
);
```

- [ ] **Step 4: Render immediately after the video**

Add `referencePacks?: CourseReferencePack[]` to `LearningRoomProps`, default it to `[]`, and render:

```tsx
<CourseReferenceLibrary packs={referencePacks} />
```

between the closing video wrapper and the existing lesson card container.

- [ ] **Step 5: Run focused tests to verify GREEN**

```powershell
node --test tests/learning-room-youtube-layout.test.mjs tests/course-reference-library.test.mjs
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit the UI integration**

```powershell
git add -- components/course/course-reference-library.tsx components/course/learning-room.tsx app/learn/[course]/[lesson]/page.tsx tests/learning-room-youtube-layout.test.mjs tests/course-reference-library.test.mjs
git commit -m "feat: show reference downloads below lesson video"
```

### Task 4: Verify the production candidate and update handoff docs

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
- Modify: `E:\Kinh doanh\docs\SESSION_STATE.md`
- Modify: `E:\Kinh doanh\docs\FEATURE_REGISTRY.md`
- Modify: `E:\Kinh doanh\docs\TASK_LOG.md`
- Modify: `E:\Kinh doanh\docs\CHANGELOG.md`

- [ ] **Step 1: Run the full local verification gate**

```powershell
node --test tests\*.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
git diff --check
npm.cmd run build
```

Expected: all tests, TypeScript, ESLint, diff check, and Next production build pass.

- [ ] **Step 2: Run project route guards**

```powershell
E:\TheAnh-Business-Workspace\02_Website\scripts\codex-session-guard.ps1 -Path .
E:\TheAnh-Business-Workspace\02_Website\scripts\codex-deploy-candidate-preflight.ps1 -Path .
node E:\_workspace-control\scripts\workspace.mjs verify theanh-main preview
```

Expected: canonical root, Git identity, protected surface, build, and preview verification pass.

- [ ] **Step 3: Browser QA locally**

Verify desktop and mobile for an authenticated Facebook Ads lesson: video still plays, three cards appear directly below it, every ZIP downloads, lesson title/progress/previous/next remain below the library, sidebar order is unchanged, and another course has no library.

- [ ] **Step 4: Update project and workspace docs without overwriting existing dirty changes**

Append only the new feature state and checks. Preserve the current uncommitted `CURRENT_STATE.md` and `SESSION_LOG.md` content already present before this task.

- [ ] **Step 5: Commit docs and report deploy readiness**

```powershell
git add -- CURRENT_STATE.md FEATURE_MAP.md SESSION_LOG.md docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md
git commit -m "docs: record Facebook Ads reference library"
```

Do not production-deploy unless the explicit production deploy gate is separately authorized and satisfied.
