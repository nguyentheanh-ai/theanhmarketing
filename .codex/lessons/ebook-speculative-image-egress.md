# Paid ebook speculative image downloads

- Applicability: this React reader and its private per-page image API; not public landing thumbnails.
- Observation: executing mount effects requested 35 pages even behind the policy gate; traversing focus/hover targets raised the total to 109.
- Cause: VERIFIED for unnecessary transfers in the component. Buffered and idle TOC preloads ran without reader intent. This does not quantify all historical organization egress.
- Correction: remove background, hover and focus preloads; keep the visible page and decode an explicitly selected page before changing the view.
- Verification: three behavioral regressions failed before and pass after; 21 Ebook tests, 39 commerce guards, TypeScript, lint and build pass. Production rollout is tracked in the handoff.
- Limits: preserves private Storage/access contracts. Does not refund accumulated bandwidth, prove provider restriction removal, or establish live paid-user acceptance.
