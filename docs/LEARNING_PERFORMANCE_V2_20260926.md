# Tối ưu học viên v2 — 26/09/2026


## 26/09/2026 — Learning performance v2 (READY, migration applied)

Base0efb3f0 retains live morning reminder release. Scope student portal only: new service-only SECURITY INVOKER student_lms_enrollments_scoped filters exact Auth identity, course, active/completed and expiry; returns only matching progress and playable lesson counts. Applied migration20260925180425; grants readback anon/authenticated false,service true. Local PostgreSQL isolation/expiry/legacy/grants PASS;209 scoped tests PASS; build108/108, TS and scoped lint PASS. Reviewer found stale prefetched progress; fixed router.refresh after success.

getStudentLmsAccess now scopes courses by slug on lesson request. markLessonCompleted reads only matching course/modules/lessons, defers activity via after. Client props remove duplicate full-course/all-lesson bodies. Adjacent full prefetch + hover/focus intent, pending spinner, press/success motion,reduced-motion; log prefetch skipped, actual onNavigate logs nonblocking. Password-first guard on direct lesson and progress403; reset preserves next/errors, change-password log nonblocking with retryable failure state; login distinguishes credentials/provider failure. Dashboard count uses23 playable lessons vs26 raw rows.

Live baseline confirms function iad1 (x-vercel-id) while Supabase ap-southeast-2 Sydney. Student routes choose preferredRegion syd1; confirm actual region after release. No global deployment/checkout/cron config changes. Baseline6 full-page authenticated lesson requests6118/3569/2125/2688/1704/2183ms;save4576ms. Same test account, metadata-only evidence; no secret stored. Runtime release pending, no completion claim until post-deploy checks.

Evidence: reports/learning-smooth-20260926/student-before-v2.json; scripts/verify-student-scoped-lms.mjs, tests/student-progress-performance.test.mjs, tests/student-auth-navigation.test.mjs. API test account was explicitly authorized by owner. No changes to real student credentials/entitlements.
