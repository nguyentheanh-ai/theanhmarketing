# Current State - theanh-main

Updated: 2026-07-10

- Production branch `deploy/website-production-20260604` now contains the verified recovery checkpoint; the backup branch remains available remotely.
- Live Vercel project: `theanhmarketing`; domains `theanhmarketing.com` and `www.theanhmarketing.com`.
- Active surfaces: public site, landing/product routes, checkout/SePay/order, transactional email, student dashboard/LMS, ebook reader, admin and CRM V2.
- Known state: the previously dirty state has been classified, secret-scanned, backed up remotely and fast-forwarded after a complete local gate; staging remains deploy-locked.
- Verification: 247/247 tests, typecheck, lint and Next.js production build pass locally.
- Deploy state: production branch and central guard pass; preview `dpl_FFnYLkGmZsPn5Aay2MzpYkXCphKD` is Ready and smoke-tested.
- Next: push the verified production branch, monitor deployment and run protected-route live smoke tests.
