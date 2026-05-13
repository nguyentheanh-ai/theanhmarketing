# Deploy & Domain Checklist

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
- Replace media placeholders with real images/videos.
- Add social links in `components/seo/json-ld.tsx` when official channels are ready.
- Connect forms to a backend or form service when static `mailto` is not enough.
- Connect auth, enrollment, orders, and admin CRUD to a backend before allowing real students/admins to use private areas.
- Protect `/dashboard`, `/learn`, and `/admin` with real authentication/authorization on production.
