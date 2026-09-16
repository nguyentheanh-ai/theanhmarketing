# Student course entry — VERIFIED in source behavior tests

Applicability: dashboard/account lists for courses with multiple delivery modes; this tenant only.
Observation: owned course titles linked to sales pages; generic first-lesson logic fell back to sales for library-only courses; account entries returned to dashboard.
Cause: VERIFIED inconsistent navigation mapping, independent of the existing entitlement union. Do not diagnose a missing entitlement from this symptom alone.
Correction: reuse a client-safe course destination resolver for owned cards, shortcut list, featured actions and account links. Use existing course-root route for published lesson ordering, dedicated library route for library content and existing Ebook reader. Keep destination authorization.
Verification: four failing behavior tests before correction; seven relevant tests after correction, including two simultaneous entitlements, no LMS lesson, unowned state and reader/PDF preservation. Relevant90tests, TypeScript/scoped lint/build passed.
Limits: does not establish a particular customer has access; does not fix missing/unpublished course content; no authenticated production session tested, release pending owner approval. Never expand entitlements to fix navigation.

Owner clarification: owned course cards belong at the top of the dashboard, before featured/support content. Non-owned or non-open courses are grayscale; styling must not revoke existing grants. Verified by rendered tree order/state tests.
