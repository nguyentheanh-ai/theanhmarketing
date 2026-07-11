# Current State - theanh-main

Updated: 2026-07-11

- Production remains unchanged on the verified `deploy/website-production-20260604` release; this Solo Admin Command Center work exists only on `feat/solo-command-center-20260710`.
- Implemented locally: `/admin` defaults to the Solo Command Center; truthful KPIs and six chart groups; bounded queue/report/CSV; lazy student activity; paid/free/trial provisioning journal and orchestrator; unified three-step student wizard; safe operation recovery and owner-only ambiguous-email review.
- Safety state: paid revenue excludes free/trial; admin reads are bounded; public results contain no credentials or contact PII. The workspace deploy guard fail-closes on source path/package, Git remote/branch/dirty tree, build and Vercel identity. Separately, command-center/provisioning runtime fails closed on missing RPC/schema, mismatched fingerprint or invalid/lost operation lease.
- Verification: focused provisioning 73/73; full Node 394/394; TypeScript, ESLint, Next.js production build and diff check pass. Spec and quality reviews approved Tasks 1-8.
- Visual verification: synthetic/no-PII desktop 1440px, mobile 390px, paid confirmation, trial mode and partial email-review states rendered without browser error overlay or console errors. Unauthenticated `/admin` redirected to `/admin/login`; grant and review POST routes returned 403.
- Pending database work: three migrations are committed but not applied or live-compiled: `20260711100000_command_center_reporting.sql`, `20260711110000_admin_student_provisioning_operations.sql`, and `20260711120000_student_provisioning_idempotency.sql`. No production data, Vercel project, domain or environment value was changed.
- Release status: **not safe to deploy production yet**. Required order: compile and test reporting RPC, then journal RPCs, then idempotency/enrollment/email RPCs on disposable/staging PostgreSQL; run concurrency tests; apply with review; perform authenticated owner smoke with a designated non-customer test account; then verify a preview through the protected deploy guard.
