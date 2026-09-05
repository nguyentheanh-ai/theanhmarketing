# Support booking policy and customer-facing text

- Applicability: this repository's authenticated support booking page, success page and CRM availability calendar.
- Observation/evidence: the customer form embedded owner-preview operational text; success copy described an internal notification transport. The lead-time constant coexisted with hard-coded calendar locks and messages.
- Cause status: VERIFIED by source inspection; the reproduced domain tests failed before the requested schedule update. Logged-in production rendering was not inspected.
- Correction: use the shared lead-time constant and a date-only weekday helper across availability, form and admin calendar; reject disallowed dates before reservation/database calls; remove operational copy from customer rendering.
- Verification: boundary/weekday/timezone tests, availability occupancy tests and rendering both normal and preview customer props. The owner and customer form markup is identical and excludes internal notices.
- Limits: this is a local source/test result until production release/readback is recorded. Do not cancel existing bookings or change payment confirmation to enforce a new scheduling policy retrospectively. Preserve server authorization when removing UI notices.
