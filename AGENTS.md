# The Anh Marketing Website Rules

Applies to this repo: `E:\TheAnh-Business-Workspace\02_Website\landing-page`

Before editing the main website `theanhmarketing.com`, every Codex/agent session must read:

1. `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md`
2. `docs/DESIGN_RULES.md` when the task changes UI/UX/visual layout.
3. `docs/DATABASE_ARCHITECTURE.md`, `docs/SECURITY_HARDENING.md`, or `docs/SEPAY_SETUP.md` when the task touches data, auth, payment, tracking, or production behavior.

At the end of any session that changes routes, architecture, important components, auth roles, payment/email/tracking flows, deploy process, or other cross-session knowledge, update `docs/WEBSITE_DEEP_STRUCTURE_HANDOFF.md` before committing.

Do not update the handoff for tiny copy-only changes that do not affect structure, data flow, ownership, or future agent behavior.

Before final handoff, run the relevant tests plus the standard verification for the change type. For production website changes, prefer:

```powershell
node --test tests\*.mjs
npx.cmd tsc --noEmit --pretty false
npm.cmd run lint
npm.cmd run build
```

Never print or persist secrets, access tokens, service-role keys, passwords, or Meta access tokens in docs, commits, or final replies.

## Serena + GitNexus Code Intelligence

This is a production webapp. Before coding, understand the current architecture and data flow, then make the smallest safe change.

- Use Serena first for semantic code retrieval, symbol/component/function lookup, reference tracing, precise TypeScript/JavaScript edits, and preserving existing behavior.
- Use GitNexus when repo-scale context helps: route/module relationships, dependency graph, execution flow, blast-radius analysis, stale-index checks, or merge/refactor planning.
- Do not use both tools mechanically for every small task. Prefer Serena for exact edits; add GitNexus when graph context reduces risk.
- If GitNexus has no index or appears stale, run `gitnexus analyze` from this repo root before relying on graph context.
- Do not run `gitnexus publish` or send code graph data outside the local machine unless explicitly asked.
- Do not rewrite working systems, duplicate components, duplicate data access logic, or bypass existing services.
- Preserve existing business logic, Supabase schema, auth flow, payment/email/tracking flow, API contracts, and UI/design system unless the user explicitly approves a change.
- For performance work, identify the actual rendering/data bottleneck first; prefer targeted fixes such as lazy loading heavy modules, limiting Supabase queries, memoizing stable views, or virtualizing large lists where the existing architecture supports it.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
