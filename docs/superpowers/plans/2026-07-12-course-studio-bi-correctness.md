# Course Studio and BI Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách Course Studio khỏi CRM shell, sửa đúng dữ liệu lead/đơn hàng, nâng cấp BI bằng dữ liệu thật và giữ nguyên mọi luồng học viên/landing page đang vận hành.

**Architecture:** Course Hub ở CRM shell mở một owner-only App Router route độc lập; LMS mutations tiếp tục đi qua API/service hiện có. Dashboard/Orders dùng aggregate server-side cùng date-range contract, còn chart chỉ render series thật. Meta Ads được ghép theo giờ Việt Nam và fail-closed khi coverage chưa đủ.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Recharts 3, Node test runner, Playwright.

---

## Guardrails

- Không sửa `app/learn`, `app/dashboard`, student progress, enrollment, Auth, payment hoặc nội dung bài học.
- Không sửa landing page, `public/ladipage`, academy offer, `/go`, `/vao-khoa-hoc`, checkout, tracking hoặc public assets.
- Mọi behavior change đi theo RED → GREEN → REFACTOR.
- Không deploy nếu protected-route preflight, build hoặc authenticated admin smoke chưa đạt.

### Task 1: Course Studio route độc lập

**Files:**
- Create: `app/admin/course-studio/[courseSlug]/page.tsx`
- Modify: `app/admin/crm-v2/courses/[courseSlug]/page.tsx`
- Modify: `components/crm-v2/course-hub.tsx`
- Modify: `components/crm-v2/lms-management-client.tsx`
- Test: `tests/lms-management-contract.test.mjs`

- [ ] **Step 1: Viết failing contract test**

Thêm assertions:

```js
assert.ok(exists("app/admin/course-studio/[courseSlug]/page.tsx"));
assert.match(hub, /target="_blank"/);
assert.match(hub, /\/admin\/course-studio\/\$\{/);
assert.match(legacyWorkspace, /redirect\(/);
assert.match(studioPage, /requireAdminAuth/);
assert.doesNotMatch(studioPage, /CrmShell/);
```

- [ ] **Step 2: Chạy test và xác nhận RED**

Run: `node --test tests/lms-management-contract.test.mjs`  
Expected: FAIL vì route Studio chưa tồn tại và Hub vẫn dùng route CRM.

- [ ] **Step 3: Tạo owner-only Studio page**

```tsx
await requireAdminAuth(`/admin/course-studio/${courseSlug}`, ["owner"]);
const snapshot = await getAdminLmsSnapshot({ selectedCourseSlug: courseSlug });
if (!snapshot.courses.some((course) => course.slug === courseSlug)) notFound();
return <CourseLmsManager lmsSnapshot={snapshot} studioMode />;
```

- [ ] **Step 4: Redirect route cũ và mở tab mới từ Hub**

Route cũ bảo toàn query `step`; Hub dùng:

```tsx
<Link href={`/admin/course-studio/${course.slug}`} target="_blank" rel="noopener noreferrer">
```

Sau create course dùng `window.open(url, "_blank", "noopener,noreferrer")` và refresh Hub.

- [ ] **Step 5: Thu gọn Studio shell**

`studioMode` chỉ thêm header `Về Course Hub`, tên khóa, save state và preview; không tạo state LMS thứ hai và không render CRM navigation.

- [ ] **Step 6: Chạy test GREEN và commit**

Run: `node --test tests/lms-management-contract.test.mjs`  
Expected: PASS.  
Commit: `feat: open course studio in a focused admin route`

### Task 2: Sắp xếp thứ tự khóa học

**Files:**
- Modify: `lib/lms/types.ts`
- Modify: `services/lmsService.ts`
- Modify: `app/api/admin/crm-v2/lms/actions/route.ts`
- Modify: `components/crm-v2/course-hub.tsx`
- Test: `tests/lms-management-contract.test.mjs`

- [ ] **Step 1: Viết failing tests cho contract reorder**

```js
assert.match(service, /export\s+async\s+function\s+reorderLmsCourses\b/);
assert.match(actions, /body\.action === "reorder_courses"/);
assert.match(hub, /reorder_courses/);
assert.match(hub, /Lên|Xuống/);
```

- [ ] **Step 2: Chạy RED**

Run: `node --test tests/lms-management-contract.test.mjs`  
Expected: FAIL vì chưa có course reorder.

- [ ] **Step 3: Thêm position vào `LmsCourse` và sort khi đọc**

```ts
position: numberValue(row.sort_order ?? row.position, 1)
```

`fetchCourseRows` order theo `sort_order ASC`, sau đó `created_at DESC` làm tie-breaker.

- [ ] **Step 4: Thêm service reorder tối thiểu**

```ts
export async function reorderLmsCourses({ courseIds }: { courseIds: string[] }) {
  // validate all ids belong to courses, then update only changed sort_order rows
}
```

Không sửa slug, status, enrollment hoặc lesson.

- [ ] **Step 5: Thêm API action và UI reorder mode**

API validate UUID list. Hub có nút `Sắp xếp`, các nút keyboard-accessible `Lên`/`Xuống`, optimistic snapshot và rollback khi request lỗi.

- [ ] **Step 6: Chạy GREEN và commit**

Run: `node --test tests/lms-management-contract.test.mjs`  
Expected: PASS.  
Commit: `feat: reorder courses without touching learning access`

### Task 3: Sửa Lead mới và bộ lọc/KPI đơn hàng

**Files:**
- Modify: `lib/crm-v2/types.ts`
- Modify: `lib/crm-v2/data.ts`
- Modify: `app/admin/crm-v2/orders/page.tsx`
- Modify: `components/crm-v2/orders-page-client.tsx`
- Test: `tests/crm-v2-contract.test.mjs`
- Test: `tests/crm-v2-core.unit.ts`

- [ ] **Step 1: Viết failing tests**

Contract yêu cầu:

```js
assert.doesNotMatch(dataLayer, /const newLeadsToday = publicLeadCount/);
assert.match(dataLayer, /getCrmV2OrderSummary/);
assert.match(dataLayer, /dateLowerBound\(dateRange\.from\)/);
assert.doesNotMatch(ordersClient, /series:\s*\[8,\s*12,\s*20/);
```

Unit test range parity cho `today`, `7d`, custom và page-size independence.

- [ ] **Step 2: Chạy RED**

Run: `node --test tests/crm-v2-contract.test.mjs`  
Expected: FAIL tại lead semantics, order summary và hard-coded series.

- [ ] **Step 3: Sửa Direct Data API range**

Áp dụng:

```ts
const lowerBound = dateLowerBound(dateRange.from);
const upperBound = dateUpperBoundExclusive(dateRange.to);
builder = builder.gte("created_at", lowerBound).lt("created_at", upperBound);
```

- [ ] **Step 4: Tạo aggregate server-side độc lập pagination**

```ts
export type CrmOrderSummary = {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  refunded: number;
  revenue: number;
  successRate: number;
  series: Array<{ label: string; orders: number; revenue: number }>;
};
```

`getCrmV2OrderSummary(query)` áp dụng cùng date/status/source/owner/course filters, không dùng `ordersResult.rows` làm KPI.

- [ ] **Step 5: Sửa semantic Lead**

KPI range dùng `Lead mới trong kỳ`; chỉ khi `query.range === "today"` mới dùng `Lead mới hôm nay`. Không gán count range vào biến today.

- [ ] **Step 6: Xóa series giả khỏi Orders UI**

Metric cards đọc summary thật; nếu chưa có series thì không render sparkline.

- [ ] **Step 7: Chạy GREEN và commit**

Run: `node --test tests/crm-v2-contract.test.mjs`  
Expected: PASS.  
Commit: `fix: align CRM lead and order metrics with selected range`

### Task 4: BI chart và lỗi chồng text

**Files:**
- Modify: `lib/crm-v2/types.ts`
- Modify: `lib/crm-v2/data.ts`
- Modify: `components/crm-v2/dashboard-charts.tsx`
- Modify: `app/admin/crm-v2/reports/page.tsx`
- Test: `tests/crm-v2-contract.test.mjs`
- Test: `tests/playwright/crm-v2.spec.ts`

- [ ] **Step 1: Viết failing chart contract và browser assertions**

```js
assert.match(charts, /CourseRankingTick/);
assert.match(charts, /Math\.max\(/);
assert.match(charts, /Doanh thu lũy kế/);
assert.match(charts, /Trạng thái đơn hàng/);
```

Playwright xác nhận không có horizontal/vertical text overlap trong card `Hiệu quả khóa học` ở desktop và mobile.

- [ ] **Step 2: Chạy RED**

Run: `node --test tests/crm-v2-contract.test.mjs`  
Expected: FAIL vì chart chưa có tick renderer/dynamic height.

- [ ] **Step 3: Sửa Course ranking**

Chiều cao: `Math.max(288, data.courses.length * 56)`. Custom tick wrap tối đa hai dòng, tooltip giữ title đầy đủ; mobile dùng compact ranking list nếu width nhỏ.

- [ ] **Step 4: Thêm BI panels từ dữ liệu đã có**

Thêm cumulative revenue, order-status donut và KPI table. Không thêm dependency hoặc placeholder.

- [ ] **Step 5: Chạy GREEN và commit**

Run: `node --test tests/crm-v2-contract.test.mjs`  
Expected: PASS.  
Commit: `feat: add readable BI charts backed by live CRM data`

### Task 5: Meta Ads theo ngày Việt Nam

**Files:**
- Modify: `services/metaAdsReportService.ts`
- Modify: `components/crm-v2/dashboard-charts.tsx`
- Test: `tests/crm-v2-contract.test.mjs`
- Create: `tests/meta-ads-timezone.test.mjs`

- [ ] **Step 1: Viết pure-function tests trước**

Test account timezone có DST, Meta hour sang `Asia/Ho_Chi_Minh`, 24 bucket, incomplete coverage và rolling range.

- [ ] **Step 2: Chạy RED**

Run: `node --test tests/meta-ads-timezone.test.mjs`  
Expected: FAIL vì helper timezone/coverage chưa tồn tại.

- [ ] **Step 3: Tách pure timezone/coverage helpers**

Adapter đọc account `timezone_name`, mở rộng query date window, lấy hourly advertiser breakdown, convert từng timestamp sang Việt Nam và aggregate theo range.

- [ ] **Step 4: Fail closed theo coverage**

Completed day thiếu giờ mang `partial`; dashboard hiển thị số đã ghi nhận nhưng không kết luận ROAS/profit final.

- [ ] **Step 5: Chạy GREEN và commit**

Run: `node --test tests/meta-ads-timezone.test.mjs tests/crm-v2-contract.test.mjs`  
Expected: PASS.  
Commit: `fix: align Meta Ads spend to Vietnam business days`

### Task 6: Full verification và audit read-only

**Files:**
- Create: `docs/audits/2026-07-12-main-and-student-ui-audit.md`
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`

- [ ] **Step 1: Chạy full local gate**

Run Node suite, TypeScript, lint, production build và Chromium suite theo repo scripts/config.  
Expected: toàn bộ PASS.

- [ ] **Step 2: Chạy protected-route preflight**

Run `codex-session-guard.ps1` và `test-website-deploy-candidate.ps1` từ deploy source of truth.  
Expected: PASS; diff không chạm landing/student/payment protected paths.

- [ ] **Step 3: Browser smoke Admin**

Xác minh Course Hub → tab mới Studio, step deep-link, order filters, lead label, BI charts và no-overlap.

- [ ] **Step 4: Audit read-only website chính và khu học tập**

Đo route/render/network/bundle/client boundaries/accessibility cho trang chính và student UI. Không mutate data, không sửa learning access/content.

- [ ] **Step 5: Viết audit report**

Ghi bằng chứng, P0–P3, quick wins, đề xuất giảm code và mockup cần duyệt; landing page đang chạy Ads nằm ngoài scope thay đổi.

- [ ] **Step 6: Cập nhật project docs và commit**

Commit: `docs: hand off course studio BI release and UI audits`

- [ ] **Step 7: Chỉ deploy khi mọi gate pass**

Deploy đúng worktree bằng protected command, kiểm tra deployment Ready, live authenticated smoke và landing DOM/render smoke. Nếu bất kỳ protected route regress thì rollback ngay.
