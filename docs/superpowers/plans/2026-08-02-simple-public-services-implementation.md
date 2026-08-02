# Simple Public Services and Student Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the public website around services/courses/resources/workshops, add a paid 500.000đ consultation-request flow, and provide authenticated students with course and account navigation plus safe profile management.

**Architecture:** Keep the approved homepage composition and change only links that would point to removed routes. Centralize public product state in `data/courses.ts`, consultation facts in `lib/consultation/constants.ts`, and authenticated owned-course resolution in a shared server service. Reuse the existing `orders`/SePay pipeline with a fixed server-known consultation package, while explicitly excluding that package from student provisioning.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/Postgres, SePay, Node test runner, ESLint.

---

## File structure

- `data/courses.ts`: authoritative four live landing URLs and six coming-soon statuses.
- `data/site.ts`: approved public navigation only.
- `data/services.ts`: the three buyer-facing Marketing & AI services.
- `lib/consultation/constants.ts`: fixed product identity, 500.000đ amount, service allowlist, policy text.
- `services/studentPortalService.ts`: one server-side owned-course/profile snapshot used by dashboard and account.
- `services/orderService.ts`: recognizes the fixed consultation package without adding it to the public course catalog.
- `app/api/consultations/route.ts`: validates a public consultation request, creates the lead and fixed-price order.
- `lib/notifications/consultation-payment-email.ts`: paid consultation confirmation without account credentials.
- `app/dich-vu/page.tsx`, `app/dang-ky-tu-van/page.tsx`, `app/tai-khoan/page.tsx`: new focused routes.
- `components/consultation/*`, `components/account/*`: isolated client forms.
- `tests/simple-public-services.test.mjs`, `tests/consultation-payment-flow.test.mjs`, `tests/student-account-portal.test.mjs`: regression contracts.

### Task 1: Lock course availability and landing-page routing

**Files:**
- Modify: `data/courses.ts`
- Modify: `components/content/course-card.tsx`
- Modify: `components/site/course-catalog-grid.tsx`
- Modify: `app/khoa-hoc/[slug]/page.tsx`
- Test: `tests/noti-style-course-catalog.test.mjs`

- [ ] **Step 1: Write the failing availability test**

Add assertions that the four live slugs map exactly to their landing URLs and that the remaining six are `coming-soon`:

```js
const liveLandingPages = [
  ["facebook-ads-2026", "/academy/facebook-ads-master-2026"],
  ["ebook-facebook-ads-2026", "/academy/ebook-facebook-ads-2026-premium"],
  ["ai-master-x10-hieu-suat", "/academy/ai-master-x10-hieu-suat"],
  ["bo-agent-kit-x10-hieu-suat-cong-viec", "/academy/bo-kit-agent-doanh-nghiep"],
];
assert.equal((courses.match(/status: "coming-soon"/g) ?? []).length, 6);
assert.doesNotMatch(courseCard, /AddToCartButton/);
assert.match(courseCard, /course\.status === "coming-soon"/);
assert.match(courseCard, /Sắp ra mắt/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/noti-style-course-catalog.test.mjs
```

Expected: FAIL because only Facebook Ads has a dedicated `landingPageUrl` and all ten courses are open.

- [ ] **Step 3: Add status and exact landing URLs to course config**

Extend `FunnelCourseConfig` with `status` and `statusLabel`, set four live products to `open`, and set the other six to `coming-soon`:

```ts
type FunnelCourseConfig = {
  status: CourseStatus;
  statusLabel: string;
  // existing fields remain unchanged
};

const liveLandingPages: Record<string, string> = {
  "facebook-ads-2026": "/academy/facebook-ads-master-2026",
  "ebook-facebook-ads-2026": "/academy/ebook-facebook-ads-2026-premium",
  "ai-master-x10-hieu-suat": "/academy/ai-master-x10-hieu-suat",
  "bo-agent-kit-x10-hieu-suat-cong-viec": "/academy/bo-kit-agent-doanh-nghiep",
};
```

`createCourse()` must copy config state instead of hard-coding `open`.

- [ ] **Step 4: Make card actions status-aware**

Remove generic cart and generic course-detail actions from public cards. Render one live link or one disabled label:

```tsx
const isComingSoon = course.status === "coming-soon";

{isComingSoon ? (
  <span aria-disabled="true" className="course-coming-soon">Sắp ra mắt</span>
) : (
  <Link href={course.landingPageUrl!}>Xem chương trình</Link>
)}
```

Do not wrap coming-soon titles/images in links. In `app/khoa-hoc/[slug]/page.tsx`, call `notFound()` for `coming-soon` courses so direct generic sales URLs cannot bypass the card state.

- [ ] **Step 5: Run focused tests and commit**

Run:

```bash
node --test tests/noti-style-course-catalog.test.mjs
git diff --check
```

Expected: PASS and no whitespace errors.

Commit:

```bash
git add data/courses.ts components/content/course-card.tsx components/site/course-catalog-grid.tsx app/khoa-hoc/[slug]/page.tsx tests/noti-style-course-catalog.test.mjs
git commit -m "feat: lock public course availability"
```

### Task 2: Replace the system page with the simple services surface

**Files:**
- Create: `data/services.ts`
- Create: `app/dich-vu/page.tsx`
- Modify: `data/site.ts`
- Modify: `components/site/footer.tsx`
- Modify: `data/home.ts`
- Modify: `app/tai-lieu/page.tsx`
- Modify: `app/workshop/page.tsx`
- Delete: `app/he-sinh-thai/page.tsx`
- Delete: `app/gioi-thieu/page.tsx`
- Delete: `app/doi-tac/page.tsx`
- Delete: `app/lien-he/page.tsx`
- Delete: `app/blog/page.tsx`
- Delete: `app/blog/[slug]/page.tsx`
- Delete: `app/hoc-vien/page.tsx`
- Delete: `app/ky-nang/page.tsx`
- Test: `tests/simple-public-services.test.mjs`

- [ ] **Step 1: Write the failing public-surface test**

```js
assert.deepEqual(publicNavLabels, ["Trang chủ", "Dịch vụ", "Khóa học", "Tài liệu", "Workshop"]);
assert.match(servicesPage, /Học Offline 1 kèm 1 tại TP\.HCM/);
assert.match(servicesPage, /Training doanh nghiệp Online\/Offline/);
assert.match(servicesPage, /Khóa học chuyên sâu 1 kèm 1/);
assert.doesNotMatch(servicesPage, /Growth System|Operating System|Engine|dashboard/i);
for (const removed of removedRouteFiles) assert.equal(existsSync(removed), false);
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
node --test tests/simple-public-services.test.mjs
```

Expected: FAIL because `/dich-vu` is absent and legacy routes still exist.

- [ ] **Step 3: Add the service data contract**

Create `data/services.ts`:

```ts
export const marketingAiServices = [
  { id: "offline-1-1-hcm", title: "Học Offline 1 kèm 1 tại TP.HCM", format: "Offline tại TP.HCM" },
  { id: "training-doanh-nghiep", title: "Training doanh nghiệp Online/Offline", format: "Online hoặc tại doanh nghiệp" },
  { id: "chuyen-sau-1-1", title: "Khóa học chuyên sâu 1 kèm 1", format: "Lộ trình riêng theo mục tiêu" },
] as const;
```

Each item also receives a concise buyer-facing description and CTA href `/dang-ky-tu-van?service=<id>`.

- [ ] **Step 4: Build `/dich-vu` with the approved public visual system**

Use `PageShell`, `PublicSectionHeading`, `Reveal`, and `ButtonLink`. Keep one hero, one three-card service grid, one transparent 500.000đ policy note, and one final CTA. Do not import `ai-os-visuals`.

- [ ] **Step 5: Simplify navigation and retained routes**

Set `mainNav` to:

```ts
export const mainNav = [
  { label: "Trang chủ", href: "/" },
  { label: "Dịch vụ", href: "/dich-vu" },
  { label: "Khóa học", href: "/khoa-hoc" },
  { label: "Tài liệu", href: "/tai-lieu" },
  { label: "Workshop", href: "/workshop" },
];
```

Turn `/tai-lieu` into a real resource page using `getResources()` instead of redirecting to deleted `/blog`. Remove stale Workshop and homepage links to deleted routes while leaving homepage sections and visual composition intact.

- [ ] **Step 6: Delete the legacy public route files and clean stale links**

Use `apply_patch` deletions for the eight listed route files. Run:

```bash
rg -n 'href="/(he-sinh-thai|gioi-thieu|doi-tac|lien-he|blog|hoc-vien|ky-nang)' app components data
```

Expected: no public navigation/content links to removed routes. Internal lesson resource URLs pointing to `/blog#tai-lieu` must be changed to `/tai-lieu`.

- [ ] **Step 7: Run focused tests and commit**

```bash
node --test tests/simple-public-services.test.mjs tests/noti-style-public-foundation.test.mjs
git diff --check
git add app components data tests/simple-public-services.test.mjs tests/noti-style-public-foundation.test.mjs
git commit -m "feat: simplify public services navigation"
```

Expected: tests pass and removed routes no longer compile as pages.

### Task 3: Add the fixed 500.000đ consultation request checkout

**Files:**
- Create: `lib/consultation/constants.ts`
- Create: `services/consultationService.ts`
- Create: `app/api/consultations/route.ts`
- Create: `app/dang-ky-tu-van/page.tsx`
- Create: `components/consultation/consultation-request-form.tsx`
- Modify: `services/orderService.ts`
- Test: `tests/consultation-payment-flow.test.mjs`

- [ ] **Step 1: Write the failing fixed-product and API tests**

Assert the server-known values and fail-closed behavior:

```js
assert.match(constants, /CONSULTATION_PRODUCT_SLUG = "marketing-ai-consultation"/);
assert.match(constants, /CONSULTATION_PRICE_VND = 500_000/);
assert.match(route, /isConsultationService/);
assert.match(route, /createConsultationRequest/);
assert.doesNotMatch(form, /appointmentDate|appointmentTime|type="date"|type="time"/);
assert.match(form, /không hoàn lại/);
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node --test tests/consultation-payment-flow.test.mjs
```

Expected: FAIL because consultation constants, API and form do not exist.

- [ ] **Step 3: Create the fixed consultation contract**

```ts
export const CONSULTATION_PRODUCT_SLUG = "marketing-ai-consultation";
export const CONSULTATION_PAYMENT_PLAN = "consultation-deposit-500";
export const CONSULTATION_PRODUCT_TITLE = "Phí tư vấn Marketing & AI";
export const CONSULTATION_PRICE_VND = 500_000;

export function isConsultationService(value: unknown): value is MarketingAiServiceId {
  return marketingAiServices.some((service) => service.id === value);
}
```

Export the exact public policy string from this file so the service page, form, checkout and email cannot drift.

- [ ] **Step 4: Teach `orderService` one fixed non-course package**

Before course resolution, recognize only the exact slug/plan pair:

```ts
function getFixedPaymentPackage(input: CreatePaymentOrderInput) {
  if (
    input.courseSlug !== CONSULTATION_PRODUCT_SLUG ||
    input.paymentPlan !== CONSULTATION_PAYMENT_PLAN
  ) return null;

  return {
    amount: CONSULTATION_PRICE_VND,
    courseSlug: CONSULTATION_PRODUCT_SLUG,
    courseTitle: CONSULTATION_PRODUCT_TITLE,
    orderItems: [{ slug: CONSULTATION_PRODUCT_SLUG, title: CONSULTATION_PRODUCT_TITLE, price: CONSULTATION_PRICE_VND }],
  };
}
```

Unknown fixed slugs/plans still fail with `Không tìm thấy khóa học đã chọn` or `Gói thanh toán không hợp lệ`.

- [ ] **Step 5: Implement `createConsultationRequest` and the API**

Validate name, email, Vietnamese phone, service ID and a 10–1200 character need summary. Create a lead whose source is `Tư vấn Marketing & AI - <service label>`, then create the fixed order with the lead ID and safe attribution. Return only `{ ok, orderCode, paymentUrl }`.

The route uses the existing rate-limit helpers and `Cache-Control: no-store`.

- [ ] **Step 6: Build the no-calendar public form**

The form posts:

```ts
{
  service,
  studentName,
  email,
  phone,
  note,
  pageUrl: window.location.href,
}
```

On success, `router.push(paymentUrl)`. The CTA says `Thanh toán 500.000đ để gửi yêu cầu`; the policy appears immediately above it.

- [ ] **Step 7: Run focused tests and commit**

```bash
node --test tests/consultation-payment-flow.test.mjs tests/sepay-order-code.test.mjs
git diff --check
git add lib/consultation services/consultationService.ts services/orderService.ts app/api/consultations app/dang-ky-tu-van components/consultation tests
git commit -m "feat: add paid consultation request checkout"
```

### Task 4: Make paid consultation fulfillment distinct from course fulfillment

**Files:**
- Create: `lib/notifications/consultation-payment-email.ts`
- Modify: `app/api/sepay/webhook/route.ts`
- Modify: `app/thanh-toan/[code]/page.tsx`
- Modify: `components/payment/payment-status-poller.tsx`
- Test: `tests/consultation-payment-flow.test.mjs`
- Test: `tests/support-booking-payment.test.mjs`

- [ ] **Step 1: Extend tests with the non-provisioning invariant**

```js
assert.match(webhook, /isConsultationOrder/);
assert.match(webhook, /sendConsultationPaymentEmail/);
assert.match(webhook, /!consultationOrder[\s\S]*ensureStudentAccountForPaidOrder/);
assert.match(checkout, /The Anh sẽ chủ động liên hệ/);
assert.doesNotMatch(consultationEmail, /temporaryPassword|mật khẩu tạm|Vào khóa học/);
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/consultation-payment-flow.test.mjs tests/support-booking-payment.test.mjs
```

Expected: FAIL because the generic paid-order path would attempt student provisioning.

- [ ] **Step 3: Add consultation-specific webhook branching**

Define:

```ts
const consultationOrder = isConsultationOrder(confirmation.order);
```

For a newly paid consultation order:

- send the consultation confirmation email;
- mark the existing payment email sent/error fields;
- send the normal paid Telegram owner notification once;
- do not call `ensureStudentAccountForPaidOrder`;
- do not call `notifyStudentPortalProvisioning`;
- do not grant enrollment/access.

Preserve existing `wasAlreadyPaid` idempotency guards.

- [ ] **Step 4: Add consultation checkout and paid-status copy**

Checkout must show the chosen service from safe lead/order context, the 500.000đ policy and the message `Sau khi thanh toán thành công, The Anh sẽ chủ động liên hệ để sắp xếp buổi tư vấn.` Payment status success must say the same rather than promising course credentials.

- [ ] **Step 5: Run tests and commit**

```bash
node --test tests/consultation-payment-flow.test.mjs tests/support-booking-payment.test.mjs tests/payment-success-email.test.mjs
git diff --check
git add app/api/sepay/webhook/route.ts app/thanh-toan/[code]/page.tsx components/payment/payment-status-poller.tsx lib/notifications/consultation-payment-email.ts tests
git commit -m "feat: fulfill paid consultation requests safely"
```

### Task 5: Share owned-course resolution between Dashboard and Account

**Files:**
- Create: `services/studentPortalService.ts`
- Modify: `app/dashboard/page.tsx`
- Test: `tests/student-account-portal.test.mjs`

- [ ] **Step 1: Write the failing shared-service test**

```js
assert.match(portalService, /getStudentPortalSnapshot/);
assert.match(portalService, /getCourseAccessSlugs/);
assert.match(portalService, /getStudentLmsAccess/);
assert.match(dashboard, /getStudentPortalSnapshot/);
assert.doesNotMatch(dashboard, /Promise\.all\(\[\s*getCurrentAuth\(\),\s*getCourses/);
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/student-account-portal.test.mjs
```

- [ ] **Step 3: Extract the server snapshot**

Return one safe structure:

```ts
export type StudentPortalSnapshot = {
  user: User | null;
  displayName: string;
  email: string;
  phone: string;
  courses: Course[];
  resources: Resource[];
  ownedSlugs: string[];
  ownedCourses: Course[];
  progressBySlug: Record<string, number>;
};
```

Move the existing order/lead/LMS merging logic unchanged into `getStudentPortalSnapshot()`. Keep local fallback behavior identical when the auth guard is disabled.

- [ ] **Step 4: Switch Dashboard to the shared service**

Dashboard retains its existing login activity log and `StudentDashboard` props, but reads them from the snapshot.

- [ ] **Step 5: Test and commit**

```bash
node --test tests/student-account-portal.test.mjs tests/student-dashboard*.test.mjs
git diff --check
git add services/studentPortalService.ts app/dashboard/page.tsx tests/student-account-portal.test.mjs
git commit -m "refactor: share student portal access snapshot"
```

### Task 6: Add authenticated header state and Account management

**Files:**
- Create: `app/tai-khoan/page.tsx`
- Create: `components/account/account-profile-form.tsx`
- Modify: `components/site/header-auth-actions.tsx`
- Modify: `components/site/mobile-menu.tsx`
- Modify: `app/doi-mat-khau/page.tsx`
- Modify: `components/auth/change-password-form.tsx`
- Test: `tests/student-account-portal.test.mjs`

- [ ] **Step 1: Extend tests for guest/student navigation and protected Account**

```js
assert.match(headerActions, /Khóa học của tôi/);
assert.match(headerActions, /href="\/tai-khoan"/);
assert.match(accountPage, /requireStudentAuth\("\/tai-khoan"\)/);
assert.match(accountPage, /ownedCourses/);
assert.match(profileForm, /updateUser\(\{[\s\S]*full_name[\s\S]*phone/);
assert.match(profileForm, /updateUser\(\{\s*email/);
assert.doesNotMatch(profileForm, /[?&](email|phone|name)=/);
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/student-account-portal.test.mjs
```

- [ ] **Step 3: Update authenticated header actions on desktop and mobile**

Guest state:

```tsx
<ButtonLink href="/dang-ky">Đăng ký</ButtonLink>
<ButtonLink href="/dang-nhap" variant="ghost">Đăng nhập</ButtonLink>
```

Student state:

```tsx
<ButtonLink href="/dashboard">Khóa học của tôi</ButtonLink>
<ButtonLink href="/tai-khoan" variant="ghost">Tài khoản</ButtonLink>
```

Mobile must use the same session state and must not keep the guest `Học thử ngay` action after authentication resolves.

- [ ] **Step 4: Build protected `/tai-khoan`**

Call `requireStudentAuth("/tai-khoan")`, then `getStudentPortalSnapshot()`. Render profile fields, owned course cards linking to `/dashboard`, a change-password link `/doi-mat-khau?mode=account&next=/tai-khoan`, and `SignOutButton`.

- [ ] **Step 5: Add safe profile updates**

Use the authenticated Supabase browser client:

```ts
await supabase.auth.updateUser({
  data: { full_name: normalizedName, phone: normalizedPhone },
});
```

For email:

```ts
await supabase.auth.updateUser({ email: normalizedEmail });
```

Show `Hãy kiểm tra email mới để xác nhận thay đổi.` on success. Do not mutate historical orders, leads or enrollment identities from the browser. Record profile/password actions through the existing bounded `/api/student/activity` endpoint without sending field values.

- [ ] **Step 6: Permit voluntary password changes**

Allow `mode=account` for an authenticated user even when `must_change_password` is false. Reuse password validation/update logic and return to `/tai-khoan`; keep reset and first-login behavior unchanged.

- [ ] **Step 7: Test and commit**

```bash
node --test tests/student-account-portal.test.mjs tests/student-account.test.mjs tests/student-activity-log-flow.test.mjs
git diff --check
git add app/tai-khoan app/doi-mat-khau components/account components/site/header-auth-actions.tsx components/site/mobile-menu.tsx components/auth/change-password-form.tsx tests
git commit -m "feat: add student account management"
```

### Task 7: Full verification, browser QA and workspace handoff

**Files:**
- Modify: `CURRENT_STATE.md`
- Modify: `FEATURE_MAP.md`
- Modify: `SESSION_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/SESSION_STATE.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/FEATURE_REGISTRY.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/TASK_LOG.md`
- Modify: `/Users/theanh/CodexProjects/Kinh doanh/docs/CHANGELOG.md`

- [ ] **Step 1: Run the complete automated gate**

```bash
node --test tests/*.test.mjs
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
./node_modules/.bin/next build
git diff --check
```

Expected: all Node tests pass, TypeScript passes, ESLint has zero errors, Next generates every route successfully, and diff check is clean. Record any pre-existing warning separately.

- [ ] **Step 2: Verify public desktop/mobile behavior in the local browser**

Check `/`, `/dich-vu`, `/khoa-hoc`, `/tai-lieu`, `/workshop` and `/dang-ky-tu-van` at desktop and 390×844:

- header/footer contain only approved public destinations;
- homepage section composition is unchanged;
- three services and policy are exact;
- four live cards open exact landing pages;
- six cards are non-interactive `Sắp ra mắt`;
- no broken images, horizontal overflow or console errors.

- [ ] **Step 3: Verify auth/account states without customer mutation**

Use an existing safe local/test account only if already configured. Verify guest redirect from `/tai-khoan`, authenticated header labels, profile rendering and owned course list. Do not submit an email/profile/password change against production customer data during local visual QA.

- [ ] **Step 4: Verify consultation order creation without marking it paid**

Submit one clearly marked local QA request only when local Supabase/SePay is configured. Confirm exact 500.000đ order, QR/payment URL, consultation copy and no student provisioning. Do not simulate a production paid webhook and do not create a production customer account.

- [ ] **Step 5: Update required workspace docs and commit**

Document the exact routes, preserved flows, tests, local-only state and remaining production verification. Then commit:

```bash
git add CURRENT_STATE.md FEATURE_MAP.md SESSION_LOG.md
git commit -m "docs: record simplified public services release candidate"
```

Do not deploy to Vercel. Leave the local catalog or services page open for owner review.
