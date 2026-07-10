# Current State - theanh-main

Updated: 2026-07-10

- Production branch remains `deploy/website-production-20260604`; this worktree is isolated on local recovery branch `chore/workspace-recovery-20260710`.
- Live Vercel project: `theanhmarketing`; domains `theanhmarketing.com` and `www.theanhmarketing.com`.
- Active surfaces: public site, landing/product routes, checkout/SePay/order, transactional email, student dashboard/LMS, ebook reader, admin and CRM V2.
- Known state: the previously dirty state has been classified, secret-scanned and prepared as a local recovery checkpoint; staging root remains deploy-locked and temp Vercel identity has been removed.
- Verification: 247/247 tests, typecheck, lint and Next.js production build pass locally.
- Deploy state: production remains blocked because the worktree is not on the production branch and the recovery branch is not pushed/merged.
- Next: review the recovery checkpoint by feature before any deliberate merge into the production branch.
