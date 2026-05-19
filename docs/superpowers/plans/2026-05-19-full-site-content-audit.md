# Full Site Content Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix toàn bộ nội dung website The Anh Marketing để content đúng ngữ cảnh từng trang, không lỗi chữ, CTA rõ đường đi, và vẫn giữ nguyên logic khóa học, học viên, admin, giỏ hàng, thanh toán.

**Architecture:** Content được chuẩn hóa theo từng route public trước, sau đó đồng bộ vào data/service/component đang render thật. Không đổi schema Supabase, không xóa logic auth/order/course access, không thay luồng học viên cũ. Mỗi nhóm trang được kiểm tra bằng route verification và kiểm tra HTML để bắt lỗi chữ mojibake.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Supabase services, existing route verification script.

---

## Scope Guard

Không thay đổi trong phiên content audit:
- Không đổi bảng database, RLS, Supabase schema hoặc migration.
- Không đổi logic đăng nhập, quyền học, đơn hàng, thanh toán, webhook SePay.
- Không đổi slug khóa học hiện có, đặc biệt `facebook-ads-2026`.
- Không dùng ảnh screenshot làm UI thay cho component thật.
- Không viết content marketing chung chung không khớp từng page.

Definition of done:
- Mỗi trang public có headline, mô tả, CTA, section title, card title và empty-state đúng mục đích trang.
- Không còn chuỗi lỗi kiểu `KhÃ`, `Há»`, `Ä`, `áº`, `á»`, `Â©`, `â†` trong HTML render public.
- CTA chính của guest vẫn đi về `/dang-ky`; CTA khóa học đi về course detail hoặc checkout/cart đúng logic hiện tại.
- Build, lint, typecheck và verify routes đều pass.

---

## File Map

### Content Source And Navigation
- Modify: `data/site.ts` - nav label, FAQ, platform stats, site metadata fallback.
- Modify: `data/home.ts` - fallback content cũ nếu còn được import ở trang nào.
- Modify: `data/pages.ts` - page copy shared cho public routes.
- Modify: `data/marketing-courses.ts` - fallback course copy khi Supabase thiếu dữ liệu.
- Modify: `services/brandService.ts` - CTA fallback, brand tagline fallback.
- Modify: `services/courseService.ts` - normalization guard cho course data bị mã hóa sai hoặc thiếu trường.

### Public Pages
- Modify: `app/page.tsx` - homepage hero, ecosystem, modules, proof hub, final CTA.
- Modify: `app/he-sinh-thai/page.tsx` - ecosystem positioning and logic explanation.
- Modify: `app/khoa-hoc/page.tsx` - catalog intro and module copy.
- Modify: `app/khoa-hoc/[slug]/page.tsx` - course detail headings, fallback descriptions, CTA wording.
- Modify: `app/blog/page.tsx` - blog plus tài liệu merged page content.
- Modify: `app/blog/[slug]/page.tsx` - article template labels and CTA block.
- Modify: `app/hoc-vien/page.tsx` - student-facing landing content.
- Modify: `app/gioi-thieu/page.tsx` - about page narrative.
- Modify: `app/lien-he/page.tsx` - contact page microcopy and form labels.
- Modify: `app/doi-tac/page.tsx` - partner page content.
- Modify: `app/workshop/page.tsx` - workshop page content.
- Modify: `app/tai-lieu/page.tsx` - keep redirect to `/blog#tai-lieu`, only verify copy not needed.

### Shared Components
- Modify: `components/site/header.tsx` - guest CTA label/href and logged-in label.
- Modify: `components/site/footer.tsx` - footer links, newsletter copy, policy labels.
- Modify: `components/site/ai-os-visuals.tsx` - card titles, badges, mocked dashboard labels.
- Modify: `components/site/offer-popup.tsx` - discount popup tone, contrast, CTA labels.
- Modify: `components/app/student-dashboard.tsx` - student dashboard labels and empty states.

### Admin And Verification
- Modify: `app/admin/dashboard/page.tsx` - admin dashboard content labels only.
- Modify: `scripts/verify-routes.mjs` - keep all important routes covered.
- Create: `docs/content-audit-2026-05-19.md` - audit record with route-by-route findings and decisions.

---

## Content Voice Rules

Use this voice consistently:
- Vietnamese primary copy.
- Clear, practical, CRM/SaaS-like wording.
- The Anh Marketing is a practical Marketing & AI learning ecosystem, not a generic agency landing page.
- Use “học viên”, “khóa học”, “workflow”, “tài liệu”, “dashboard”, “admin/CRM” consistently.
- Avoid vague phrases: “tối ưu đột phá”, “nâng tầm toàn diện”, “giải pháp hàng đầu”.
- Use action-focused CTA:
  - Header guest CTA: “Khám phá hệ sinh thái” -> `/dang-ky`
  - Course catalog CTA: “Xem khóa học”
  - Course detail purchase CTA: keep existing add-to-cart/checkout logic labels.
  - Blog/resource CTA: “Xem tài liệu” or “Đọc bài viết”
  - Student CTA: “Vào học”, “Xem khóa”, “Nâng cấp”

---

### Task 1: Route Content Inventory

**Files:**
- Create: `docs/content-audit-2026-05-19.md`
- Read: `app/page.tsx`
- Read: `app/he-sinh-thai/page.tsx`
- Read: `app/khoa-hoc/page.tsx`
- Read: `app/khoa-hoc/[slug]/page.tsx`
- Read: `app/blog/page.tsx`
- Read: `app/blog/[slug]/page.tsx`
- Read: `app/hoc-vien/page.tsx`
- Read: `app/gioi-thieu/page.tsx`
- Read: `app/lien-he/page.tsx`
- Read: `app/doi-tac/page.tsx`
- Read: `app/workshop/page.tsx`
- Read: `components/site/ai-os-visuals.tsx`
- Read: `components/app/student-dashboard.tsx`

- [ ] **Step 1: Create an audit table**

Create `docs/content-audit-2026-05-19.md` with this structure:

```markdown
# Content Audit - 2026-05-19

## Route Checklist

| Route | Primary Job | Content Issues Found | Fix Decision |
| --- | --- | --- | --- |
| `/` | Introduce The Anh Marketing as a Marketing & AI learning ecosystem |  |  |
| `/he-sinh-thai` | Explain how courses, resources, student dashboard and admin CRM connect |  |  |
| `/khoa-hoc` | Sell and organize the course catalog |  |  |
| `/khoa-hoc/facebook-ads-2026` | Present the Facebook Ads 2026 course accurately |  |  |
| `/blog` | Combine articles and resources/document library |  |  |
| `/blog/[slug]` | Render readable article detail pages |  |  |
| `/hoc-vien` | Explain student experience and dashboard value |  |  |
| `/gioi-thieu` | Explain The Anh Marketing positioning |  |  |
| `/lien-he` | Help users contact/register without confusion |  |  |
| `/doi-tac` | Explain partner/cooperation offer |  |  |
| `/workshop` | Explain live workshop schedule and replay library |  |  |
| `/dashboard` | Student dashboard labels, empty states and course access copy |  |  |
| `/admin/dashboard` | Admin CRM labels and operational content |  |  |

## Global Decisions

- Guest primary CTA: “Khám phá hệ sinh thái” -> `/dang-ky`.
- Resource route: `/tai-lieu` redirects to `/blog#tai-lieu`.
- Course slugs and course ownership logic remain unchanged.
```

- [ ] **Step 2: Fill the audit from actual rendered pages**

Run:

```powershell
npm.cmd run verify:routes
```

Expected: every listed route returns `OK 200`.

Open or fetch each route and fill the table with concrete issues. Use this command to inspect rendered HTML for visible copy:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/ | Select-Object -ExpandProperty Content
```

- [ ] **Step 3: Commit the audit record**

Run:

```powershell
git add docs/content-audit-2026-05-19.md
git commit -m "docs: add full site content audit"
```

Expected: commit succeeds with only the audit document.

---

### Task 2: Fix Global Navigation, Footer And Brand Content

**Files:**
- Modify: `data/site.ts`
- Modify: `services/brandService.ts`
- Modify: `components/site/header.tsx`
- Modify: `components/site/footer.tsx`

- [ ] **Step 1: Verify current CTA contract**

Check `components/site/header.tsx` has:

```ts
const primaryHref = isLoggedIn ? "/dashboard" : "/dang-ky";
const primaryLabel = isLoggedIn ? "Khóa học của tôi" : "Khám phá hệ sinh thái";
```

- [ ] **Step 2: Normalize nav labels**

Set `mainNav` in `data/site.ts` to:

```ts
export const mainNav = [
  { label: "Hệ sinh thái", href: "/he-sinh-thai" },
  { label: "Khóa học", href: "/khoa-hoc" },
  { label: "Học viên", href: "/hoc-vien" },
  { label: "Workshop", href: "/workshop" },
  { label: "Blog", href: "/blog" },
  { label: "Về The Anh", href: "/gioi-thieu" },
];
```

- [ ] **Step 3: Normalize footer columns**

Use this footer link model in `components/site/footer.tsx`:

```ts
const featuredLinks = [
  { label: "The Anh OS", href: "/he-sinh-thai" },
  { label: "Khóa học", href: "/khoa-hoc" },
  { label: "AI Workflow", href: "/blog#tai-lieu" },
  { label: "Workshop live", href: "/workshop" },
];

const usefulLinks = [
  { label: "Blog", href: "/blog" },
  { label: "Hệ sinh thái", href: "/he-sinh-thai" },
  { label: "Học viên", href: "/hoc-vien" },
  { label: "Đối tác", href: "/doi-tac" },
  { label: "Đăng ký", href: "/dang-ky" },
];

const helpLinks = [
  { label: "Liên hệ", href: "/lien-he" },
  { label: "Về The Anh", href: "/gioi-thieu" },
  { label: "Đăng nhập học viên", href: "/dang-nhap" },
  { label: "Dashboard học viên", href: "/dashboard" },
  { label: "Admin CRM", href: "/admin/dashboard" },
];
```

- [ ] **Step 4: Verify no mojibake in global files**

Run:

```powershell
node -e "const fs=require('fs'); for (const f of ['data/site.ts','services/brandService.ts','components/site/header.tsx','components/site/footer.tsx']) { const s=fs.readFileSync(f,'utf8'); if(/KhÃ|Há»|Ä|áº|á»|Â©|â†/.test(s)) { console.error('bad '+f); process.exitCode=1; } }"
```

Expected: no output and exit code `0`.

- [ ] **Step 5: Commit global content fix**

Run:

```powershell
git add data/site.ts services/brandService.ts components/site/header.tsx components/site/footer.tsx
git commit -m "fix: normalize global site content"
```

---

### Task 3: Rewrite Homepage Content To Match The Design

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/site/ai-os-visuals.tsx`

- [ ] **Step 1: Rewrite homepage hero content**

Use this content intent:
- Eyebrow: “THE ANH MARKETING OS”
- H1: “Học Marketing & AI như một hệ điều hành vận hành thật.”
- Description: “Một hệ sinh thái gồm khóa học, tài liệu, workflow, dashboard học viên và admin CRM để bạn học, triển khai, đo lường và cập nhật lâu dài.”
- Primary CTA: “Khám phá hệ sinh thái” -> `/dang-ky`
- Secondary CTA: “Xem tài liệu” -> `/blog#tai-lieu`

- [ ] **Step 2: Rewrite homepage module section**

Use these labels:
- Eyebrow: “Product modules”
- Title: “Các module học và workflow đang mở”
- Description: “Khóa học, tài liệu và dashboard được kết nối để người học không chỉ xem video mà còn có checklist, workflow và lộ trình áp dụng.”
- Button: “Xem tất cả khóa học” -> `/khoa-hoc`

- [ ] **Step 3: Rewrite proof hub section**

Use these labels:
- Eyebrow: “Proof content hub”
- Title: “Nội dung, case study và tài nguyên học tập”
- Description: “Blog và tài liệu được gom lại thành một thư viện để học viên tra cứu nhanh khi triển khai.”
- Media panel title: “Workflow đang dùng trong thực tế”

- [ ] **Step 4: Rewrite final CTA**

Use:
- Eyebrow: “Bắt đầu”
- Title: “Tạo tài khoản và chọn lộ trình phù hợp.”
- Description: “Bắt đầu bằng khóa học, tài liệu hoặc dashboard học viên hiện có. Logic tài khoản và quyền học vẫn được giữ nguyên.”
- CTA: “Đăng ký học” -> `/dang-ky`

- [ ] **Step 5: Verify homepage HTML**

Run:

```powershell
$html = (Invoke-WebRequest -UseBasicParsing http://localhost:3000/).Content
if ($html -match 'KhÃ|Há»|Ä|áº|á»|Â©|â†') { throw 'Homepage contains mojibake' }
if (-not $html.Contains('href="/dang-ky"')) { throw 'Homepage missing registration CTA' }
```

Expected: no thrown error.

- [ ] **Step 6: Commit homepage content**

Run:

```powershell
git add app/page.tsx components/site/ai-os-visuals.tsx
git commit -m "fix: rewrite homepage content"
```

---

### Task 4: Fix Course Catalog And Course Detail Content

**Files:**
- Modify: `app/khoa-hoc/page.tsx`
- Modify: `app/khoa-hoc/[slug]/page.tsx`
- Modify: `components/site/ai-os-visuals.tsx`
- Modify: `data/marketing-courses.ts`
- Modify: `services/courseService.ts`

- [ ] **Step 1: Verify Facebook Ads 2026 course data source**

Run:

```powershell
node -e "const { marketingCourses } = require('./data/marketing-courses.ts'); console.log(marketingCourses.find(c => c.slug === 'facebook-ads-2026'))"
```

If direct require fails because TypeScript is not transpiled in Node, inspect the file manually. Confirm `facebook-ads-2026` has:
- Correct title with “Facebook Ads 2026”.
- Correct thumbnail/banner fallback.
- Correct short description about Facebook Ads, not generic AI module copy.

- [ ] **Step 2: Rewrite catalog intro**

Use:
- H1: “Khóa học Marketing & AI thực chiến”
- Description: “Chọn khóa học theo nhu cầu triển khai: Facebook Ads, content, AI workflow, data và hệ thống marketing cho cá nhân hoặc team nhỏ.”

- [ ] **Step 3: Ensure cards render real course values**

In `components/site/ai-os-visuals.tsx`, `ModuleCatalogGrid` must use:
- `course.title`
- `course.shortDescription || course.description`
- `course.thumbnailImageUrl || course.bannerImageUrl || toYouTubeThumbnailUrl(course.videoPreviewUrl)`
- `course.price`
- `course.originalPrice`
- `getCourseLessonCount(course)`
- `getCourseModuleCount(course)`

- [ ] **Step 4: Fix fallback course microcopy**

In `data/marketing-courses.ts`, use consistent wording:
- Status label: “Đang mở đăng ký”
- CTA text: “Xem khóa học”
- Level: “Cơ bản đến thực chiến”
- Format: “Video bài học + tài liệu + workflow + cộng đồng hỏi đáp”

- [ ] **Step 5: Verify course routes**

Run:

```powershell
npm.cmd run verify:routes
```

Expected includes:
- `OK   200 /khoa-hoc`
- `OK   200 /khoa-hoc/facebook-ads-2026`
- `OK   200 /khoa-hoc/marketing-online-nen-tang`

- [ ] **Step 6: Commit course content**

Run:

```powershell
git add app/khoa-hoc/page.tsx app/khoa-hoc/[slug]/page.tsx components/site/ai-os-visuals.tsx data/marketing-courses.ts services/courseService.ts
git commit -m "fix: normalize course catalog content"
```

---

### Task 5: Fix Blog And Resource Library Content

**Files:**
- Modify: `app/blog/page.tsx`
- Modify: `app/blog/[slug]/page.tsx`
- Modify: `app/tai-lieu/page.tsx`

- [ ] **Step 1: Keep tài liệu redirect**

Confirm `app/tai-lieu/page.tsx` remains:

```ts
import { redirect } from "next/navigation";

export default function ResourcesRedirectPage() {
  redirect("/blog#tai-lieu");
}
```

- [ ] **Step 2: Rewrite blog page framing**

Use:
- Blog H1: “Blog & Tài liệu Marketing thực chiến”
- Description: “Đọc bài viết, tải tài liệu và lưu workflow để áp dụng vào khóa học hoặc công việc đang triển khai.”
- Resource section title: “Tài liệu & Workflow”
- Resource card CTA: “Xem tài liệu”
- Blog card CTA: “Đọc bài viết”

- [ ] **Step 3: Rewrite blog detail template labels**

Use:
- Author label: “Tác giả”
- Table of contents label: “Mục lục”
- CTA title: “Muốn học có lộ trình hơn?”
- CTA description: “Xem khóa Facebook Ads 2026 hoặc mở thư viện tài liệu để bắt đầu từ nền tảng.”
- Related heading: “Bài viết liên quan”

- [ ] **Step 4: Verify blog and redirect routes**

Run:

```powershell
npm.cmd run verify:routes
```

Expected includes:
- `OK   200 /blog`
- `OK   200 /blog/cach-hoc-facebook-ads-cho-nguoi-moi`
- `OK   200 /tai-lieu`

- [ ] **Step 5: Commit blog/resource content**

Run:

```powershell
git add app/blog/page.tsx app/blog/[slug]/page.tsx app/tai-lieu/page.tsx
git commit -m "fix: unify blog and resource content"
```

---

### Task 6: Fix Student, About, Contact, Partner And Workshop Pages

**Files:**
- Modify: `app/hoc-vien/page.tsx`
- Modify: `app/gioi-thieu/page.tsx`
- Modify: `app/lien-he/page.tsx`
- Modify: `app/doi-tac/page.tsx`
- Modify: `app/workshop/page.tsx`
- Modify: `components/app/student-dashboard.tsx`

- [ ] **Step 1: Rewrite student page intent**

Use:
- H1: “Khu học viên để học, lưu tài liệu và theo dõi tiến độ”
- Description: “Sau khi đăng nhập, học viên xem khóa đã sở hữu, mở bài học, tải tài liệu và nhận hỗ trợ trong cùng một dashboard.”
- CTA: “Đăng nhập học viên” -> `/dang-nhap`
- Secondary CTA: “Xem khóa học” -> `/khoa-hoc`

- [ ] **Step 2: Rewrite student dashboard labels**

Use these exact labels where relevant:
- “Dashboard học viên”
- “Chào {studentName || "học viên"}”
- “Theo dõi khóa học, tài liệu và hỗ trợ tại đây.”
- “Khóa đang học”
- “Vào phòng học”
- “Cần hỗ trợ trong lúc học?”
- “Gửi email hỗ trợ”
- “Liên hệ Zalo”
- “Khóa đã sở hữu và khóa có thể nâng cấp”
- “Tài liệu học viên”
- “Thông tin học viên”

- [ ] **Step 3: Rewrite about page intent**

Use:
- H1: “The Anh Marketing xây hệ sinh thái học Marketing thực chiến”
- Description: “Trọng tâm là giúp người học hiểu hệ thống, triển khai được và dùng AI đúng chỗ trong công việc thật.”

- [ ] **Step 4: Rewrite contact page intent**

Use:
- H1: “Liên hệ để chọn lộ trình học phù hợp”
- Description: “Gửi thông tin hoặc nhắn Zalo để được tư vấn khóa học, tài liệu và cách bắt đầu theo tình huống hiện tại của bạn.”

- [ ] **Step 5: Rewrite partner page intent**

Use:
- H1: “Hợp tác đào tạo Marketing & AI cho team”
- Description: “Dành cho doanh nghiệp, cộng đồng hoặc đối tác muốn tổ chức workshop, khóa học hoặc workflow training theo nhu cầu thực tế.”

- [ ] **Step 6: Rewrite workshop page intent**

Use:
- H1: “Workshop live về Marketing, AI và workflow thực chiến”
- Description: “Các buổi live giúp bạn triển khai prompt, content engine, quảng cáo và automation theo tình huống thật.”
- CTA: “Giữ chỗ” -> `/dang-ky`

- [ ] **Step 7: Verify these routes**

Run:

```powershell
npm.cmd run verify:routes
```

Expected includes:
- `OK   200 /hoc-vien`
- `OK   200 /gioi-thieu`
- `OK   200 /lien-he`
- `OK   200 /doi-tac`
- `OK   200 /workshop`
- `OK   200 /dashboard`

- [ ] **Step 8: Commit student/support content**

Run:

```powershell
git add app/hoc-vien/page.tsx app/gioi-thieu/page.tsx app/lien-he/page.tsx app/doi-tac/page.tsx app/workshop/page.tsx components/app/student-dashboard.tsx
git commit -m "fix: rewrite student and support page content"
```

---

### Task 7: Admin CRM Content Pass

**Files:**
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1: Rewrite admin dashboard visible labels only**

Use CRM-like terminology:
- “Admin CRM”
- “Tổng quan vận hành”
- “Lead mới”
- “Đơn hàng”
- “Học viên”
- “Khóa học”
- “Nội dung”
- “Tài liệu”
- “Cần xử lý”

Do not change data fetching, tables, Supabase calls or admin auth.

- [ ] **Step 2: Verify admin route**

Run:

```powershell
npm.cmd run verify:routes
```

Expected includes:
- `OK   200 /admin/dashboard`
- `OK   200 /admin/khoa-hoc`
- `OK   200 /admin/hoc-vien`
- `OK   200 /admin/don-hang`

- [ ] **Step 3: Commit admin content**

Run:

```powershell
git add app/admin/dashboard/page.tsx
git commit -m "fix: polish admin crm content"
```

---

### Task 8: Full Mojibake, CTA And Content QA

**Files:**
- Modify: `scripts/verify-routes.mjs` if route coverage is missing.
- Read: all modified files.

- [ ] **Step 1: Run source text scan**

Run:

```powershell
node -e "const fs=require('fs'), path=require('path'); const roots=['app','components','data','services']; const exts=new Set(['.ts','.tsx']); const bad=/KhÃ|Há»|Ä|áº|á»|Â©|â†/; function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()) walk(p); else if(exts.has(path.extname(e.name))){const s=fs.readFileSync(p,'utf8'); if(bad.test(s)) { console.error('bad '+p); process.exitCode=1; }}}} roots.forEach(walk);"
```

Expected: no output and exit code `0`.

- [ ] **Step 2: Run rendered homepage scan**

Run:

```powershell
$html = (Invoke-WebRequest -UseBasicParsing http://localhost:3000/).Content
if ($html -match 'KhÃ|Há»|Ä|áº|á»|Â©|â†') { throw 'Homepage contains mojibake' }
if (-not $html.Contains('Khám phá hệ sinh thái')) { throw 'Missing main CTA label' }
if (-not $html.Contains('href="/dang-ky"')) { throw 'Missing registration CTA href' }
```

Expected: no thrown error.

- [ ] **Step 3: Run full verification**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd run verify:routes
```

Expected:
- TypeScript exits `0`.
- ESLint exits `0`.
- Next build exits `0`.
- Verify routes ends with `All routes passed.`

- [ ] **Step 4: Commit QA script or route coverage changes**

If `scripts/verify-routes.mjs` changed:

```powershell
git add scripts/verify-routes.mjs
git commit -m "test: expand route verification coverage"
```

If it did not change, skip this commit.

---

### Task 9: Final Review And Push

**Files:**
- Read: git diff and status only.

- [ ] **Step 1: Review commit history**

Run:

```powershell
git log --oneline -5
```

Expected: recent content commits are visible and ordered by task.

- [ ] **Step 2: Confirm clean worktree**

Run:

```powershell
git status --short
```

Expected: no output.

- [ ] **Step 3: Push**

Run:

```powershell
git push origin main
```

Expected: push succeeds to GitHub.

- [ ] **Step 4: Report concise summary**

Report:
- Routes/content groups fixed.
- Verification commands passed.
- Commit hashes pushed.
- Any content areas intentionally left for business approval.

---

## Self-Review

Spec coverage:
- Full public content audit is covered by Tasks 1-6.
- Admin CRM wording is covered by Task 7.
- CTA and `/dang-ky` link are covered by Tasks 2, 3 and 8.
- Course/Facebook Ads content is covered by Task 4.
- Blog/resource merge is covered by Task 5.
- Student dashboard content is covered by Task 6.
- Verification and push are covered by Tasks 8-9.

Placeholder scan:
- No `TBD`, `TODO`, or “fill later” instructions are used.
- Every route and file group has an exact action and verification command.

Type consistency:
- Route names match the current App Router structure.
- File paths match the current repository structure.
- Verification commands match the existing project scripts.
