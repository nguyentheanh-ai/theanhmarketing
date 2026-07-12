# Deploy & Domain Checklist

Project ID: `theanh-main`. Direct `vercel --prod` is forbidden.

- Preview: `node E:\_workspace-control\scripts\workspace.mjs deploy theanh-main preview`
- Production: `node E:\_workspace-control\scripts\workspace.mjs deploy theanh-main production`, then type `DEPLOY theanh-main TO PRODUCTION` exactly.

## Domain

Primary domain: `https://theanhmarketing.com`

If the production domain changes, update:

- `data/site.ts` → `siteConfig.url`

## Recommended Deploy Target

This project is a Next.js App Router site. Recommended deployment:

- Vercel
- Node runtime default
- Build command: `npm.cmd run build` on Windows local, `npm run build` on hosting

## DNS

For Vercel, configure DNS as instructed by Vercel:

- Apex domain: add the recommended `A` record
- `www`: add the recommended `CNAME`

Then set one canonical production domain in the hosting dashboard.

## Indexing

After deployment:

1. Open `/robots.txt`
2. Open `/sitemap.xml`
3. Submit sitemap in Google Search Console
4. Request indexing for:
   - `/`
   - `/khoa-hoc`
   - `/khoa-hoc/facebook-ads-2026`
   - `/blog`
   - `/tai-lieu`

Private areas are intentionally excluded from indexing:

- `/admin`
- `/dashboard`
- `/learn`
- `/dang-nhap`

## Before Launch

- Run `npm run lint`.
- Run `npm run build`.
- With the site running, run `npm run verify:routes`.
- Set these payment environment variable names on the hosting provider; values must not be stored in this document:
  - `SEPAY_BANK_CODE`
  - `SEPAY_BANK_ACCOUNT_NUMBER`
  - `SEPAY_BANK_ACCOUNT_NAME`
  - `SEPAY_WEBHOOK_API_KEY`
- Set Meta Ads reporting environment variable names on the hosting provider; values must not be stored in this document:
  - `META_ADS_ACCESS_TOKEN`
  - `META_ADS_AD_ACCOUNT_ID`
- Configure Sepay webhook URL: `https://theanhmarketing.com/api/sepay/webhook`.
- Replace media placeholders with real images/videos.
- Add social links in `components/seo/json-ld.tsx` when official channels are ready.
- Connect forms to a backend or form service when static `mailto` is not enough.
- Connect auth, enrollment, orders, and admin CRUD to a backend before allowing real students/admins to use private areas.
- Protect `/dashboard`, `/learn`, and `/admin` with real authentication/authorization on production.
