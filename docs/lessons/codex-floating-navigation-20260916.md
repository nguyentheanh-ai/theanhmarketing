# Codex sticky navigation after form focus
Status: VERIFIED reproduction and fix in six browser configurations.
Scope: Codex landing with sticky CTA, React form focus handlers and IntersectionObserver (Chrome/macOS, default and reduced motion).
Observed: sticky is viewport-fixed at top, problem and video sections. After focusing studentName and scrolling to the problem section, form top21768px with viewport844px but sticky is absent.
Cause: formFocused stays true after scrolling away; visibility used both focus and intersection. This is not a transform-containing-block bug in the observed page.
Correction: hide only while form intersects viewport. Replace section-jump contents link with native modal dialog, matching owner reference; preserve keyboard dismissal/focus, active section and scrollable links.
Verification: tests/codex-sticky-navigation-browser.mjs covers both motion modes,1440/390/320, five scroll positions, close/Escape/section/CTA navigation and focus-then-scroll regression. Final results in task handoff.
Limits: narrow UI scope; do not change payment, price, tracking or other pages. Focus alone is not a valid proxy for current viewport visibility.
