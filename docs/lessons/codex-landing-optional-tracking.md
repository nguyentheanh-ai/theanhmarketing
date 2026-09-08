# Optional tracking must not block Codex registration

- Applicability: the Codex landing registration component, shared tracking helpers as read on 2026-09-08.
- Evidence: `_fbc=%invalid` threw during URI decoding before the submit catch; a double-submit browser test observed zero intercepted order requests and a locked form. A simulated ViewContent analytics exception unmounted the form.
- Cause status: VERIFIED locally. Optional analytics ran outside the registration error boundary.
- Correction: catch attribution parsing with empty optional attribution fallback; isolate ViewContent tracking failure. Do not weaken order validation or silently retry order creation.
- Verification: `tests/codex-resilience-browser.mjs` covers malformed cookie, analytics failure, concurrent submit and retry; all writes are intercepted. Record final pass/build status in the landing handoff.
- Limits: not evidence of a production outage, actual payment or email delivery. Shared tracking utilities and other landing pages are not changed by this scoped fix.
