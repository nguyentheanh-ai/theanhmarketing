# Security Hardening Plan

This checklist tracks the production security work for The Anh Marketing.

## Phase 1 - App Guardrails

- Public API routes use basic rate limiting.
- Public order and registration notification endpoints use basic rate limiting. Public form anti-spam guard was removed on 2026-06-06 per owner request after a landing form regression.
- Public order lookup redacts personal data.
- SePay webhook requires an API key outside local development.
- SePay webhook checks incoming transfer direction, amount, order code, and receiver account.
- Admin media upload validates admin access, file size, MIME type, and image magic bytes.
- Blog HTML is sanitized before rendering.
- Site-wide security headers and CSP are enabled.

## Phase 2 - Production Readiness

- `sanitize-html` is used for CMS/blog allowlist sanitization.
- CSP violation reports are accepted at `/api/security/csp-report`.
- `npm audit` is wired into the review flow; current PostCSS advisory is patched with an override.
- `npm run verify:security` checks production-critical environment variables before deploy.
- Rate-limit buckets prune expired entries to reduce memory growth during long-running sessions.
- CSP script policy uses per-request nonces instead of static `unsafe-inline`.

## Phase 3 - Data And Operations

- Production RLS replacement SQL is available at `docs/SUPABASE_PRODUCTION_RLS.sql`.
- The production RLS script removes demo anon write policies and covers courses, modules, lessons, resources, leads, orders, blog posts, testimonials, comments, and site settings.
- Security events are logged for CSP reports, SePay webhook failures, and rejected admin uploads.
- No active form anti-spam audit logging is enabled after the 2026-06-06 removal.

## Required Production Environment

- `AUTH_GUARD_ENABLED=true`
- `ADMIN_EMAILS` set to real admin email addresses only.
- `SUPABASE_SERVICE_ROLE_KEY` kept server-side only.
- `SEPAY_WEBHOOK_API_KEY` generated as a high-entropy secret, at least 32 characters.
- `SEPAY_BANK_CODE` and `SEPAY_BANK_ACCOUNT_NUMBER` match the real receiving account.

## Next Phase

- Move rate limiting from memory to a shared store such as Upstash Redis or Vercel KV.
- Apply and verify production Supabase RLS in the dashboard.
- Add production log routing/alerting for the structured `security_event` logs.
- Rotate production secrets after deployment hardening is complete.
