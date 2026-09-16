# Codex offer and legacy browser assertions
Status: VERIFIED for candidate 2026-09-16.
Applicability: Codex landing after its explicit migration to enterprise Kit offer990.
Observation: shared historical official constant is999000, whereas the active Kit bundle and order plan offer990 charge990000. Browser audit still selected Đặt cọc and failed despite the new990000 submit button rendering.
Cause: independent offer version and stale test expectations, not a payment API failure.
Correction: bind Codex display/tracking/form to offer990 and verify against current Kit bundle plus buildOrderPackage; update browser assertions to the approved offer. Keep historical preorder/standard plans intact.
Verification: bundle/server offer parity test passed; browser final evidence recorded in task handoff.
Limits: no real payment or email tested; do not change historical plans or infer live deployment from local QA.
