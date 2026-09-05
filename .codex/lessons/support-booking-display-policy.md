# Support booking policy and customer-facing text

- Applicability: this repository's authenticated support booking page, success page and CRM availability calendar.
- Observation/evidence: the customer form embedded owner-preview operational text; success copy described an internal notification transport. The lead-time constant coexisted with hard-coded calendar locks and messages.
- Cause status: VERIFIED by source inspection; the reproduced domain tests failed before the requested schedule update. Logged-in production rendering was not inspected.
- Correction: use the shared lead-time constant and a date-only weekday helper across availability, form and admin calendar; reject disallowed dates before reservation/database calls; remove operational copy from customer rendering.
- Verification: boundary/weekday/timezone tests, availability occupancy tests and rendering both normal and preview customer props. The owner and customer form markup is identical and excludes internal notices.
- Limits: production release and public availability/success-page readback are recorded in CURRENT_STATE.md; authenticated browser DOM remains uninspected. Do not cancel existing bookings or change payment confirmation to enforce a new scheduling policy retrospectively. Preserve server authorization when removing UI notices.

## Preview availability permissions

- Applicability: Vercel previews of this tenant using the existing Supabase admin-client fallback.
- Observation: both the pre-change and changed preview returned `permission denied for table support_busy_dates`; production returned successful availability responses before and after the release.
- Cause status: VERIFIED environment mismatch. Environment metadata lists the service-role credential for Production only; the unchanged admin-client helper falls back to the less-privileged server client when that credential is absent.
- Correction: retain restricted permissions and use the authorized production promotion/rebuild with its existing environment; verify the actual production endpoint. Do not weaken RLS or copy credentials into preview to make a preview smoke green.
- Verification/limits: production availability and closed-weekday rules were read back successfully. This does not claim preview availability is fixed, and applies only after confirming the same environment scope and fallback behavior.
