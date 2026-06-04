# Email Gift Update Runbook

Use this when updating a gift/bonus shown in customer emails for the Facebook Ads Master 2026 packages.

## Scope

- Main app: `theanhmarketing.com`.
- Production hotfix branch/worktree: `C:\Users\12c1t\Desktop\theanhmarketing-email-account-hotfix` on `deploy/website-production-20260604`.
- Email templates:
  - `lib/notifications/pending-payment-email.ts`
  - `lib/notifications/payment-success-email.ts`
- Tests:
  - `tests/pending-payment-email.test.mjs`
  - `tests/payment-success-email.test.mjs`

## Current 799K Gift

- Label: `Agent Hỗ Trợ Quảng Cáo`
- Link: `https://chatgpt.com/g/g-6a1ffa1efa308191b76782e0b93d4e30-ads-performance-planner`
- Condition: only `facebook-ads-2026` support/799K orders.
- Do not show this gift on the 399K video package.

## Update Steps

1. Edit the constants and block copy in both email files:
   - `adsSupportAgentName`
   - `adsSupportAgentUrl`
   - `supportAgentBlock`

2. Keep `isFacebookAdsSupportPlan(order)` narrow:
   - course must be `facebook-ads-2026`
   - amount/package must be support/799K

3. Keep product-title normalization in place:
   - Facebook Ads 799K emails should render `Quảng cáo Facebook Master 2026 - Gói Hỗ Trợ 799K - Zoom lên ads + Agent kit`
   - This prevents old/test data such as `Qu?ng c?o...` from leaking into subject/body.

4. Update tests for both pending and paid email.

5. If the user asks for a paid email test, send `payment_success`, not just a pending `/api/orders` test.

## Verification

Run:

```powershell
node --test tests\pending-payment-email.test.mjs
node --test tests\payment-success-email.test.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
npm.cmd run build
```

Before production deploy or live email test:

- Verify `RESEND_API_KEY` is present and non-empty.
- Do not print the key.
- If testing from PowerShell, do not put Vietnamese subject/title directly in a here-string unless the generated subject is checked. Prefer a JS file or Unicode escapes.

## Deploy

Deploy from the production hotfix worktree:

```powershell
npx.cmd vercel deploy --prod --yes --force
```

After deploy, update:

- `E:\Kinh doanh\docs\SESSION_STATE.md`
- `E:\Kinh doanh\docs\FEATURE_REGISTRY.md`
- `E:\Kinh doanh\docs\TASK_LOG.md`
- `E:\Kinh doanh\docs\CHANGELOG.md`
- this runbook if the workflow changes
