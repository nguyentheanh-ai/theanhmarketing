# Account UX and Owner Booking Preview Design

## Goal

Make `/tai-khoan` immediately understandable for students and let the verified The Anh owner account inspect the real support-booking journey without fabricating a paid order.

## Account experience

- Keep one protected account page and group actions into three explicit cards: `Thông tin cá nhân`, `Email đăng nhập`, and `Đổi mật khẩu`.
- Show the current email as read-only and provide a separate empty `Email mới` field so the user cannot mistake the current address for a pending change.
- Keep password change inline on `/tai-khoan`; require at least eight characters and matching confirmation, expose show/hide controls, and show success/error feedback in the same card.
- Give every form its own loading and result state. Successful profile/password changes stay on the page; an email change explains that the new address becomes active only after inbox verification.
- Keep `/doi-mat-khau` for forced recovery/reset flows. Do not break its current redirect contract.
- Present enrolled courses as a compact summary below account controls. Existing access/order history remains authoritative.

## Owner booking preview

- Normal customers remain eligible only through an actual paid, non-support course order.
- A server-verified owner session may preview the same booking page using identity data from the owner's latest existing non-support order. This does not change that order's status and does not create revenue.
- The page shows an owner-preview notice explaining that merely viewing is read-only, while pressing the final booking action creates a real 500.000đ pending support order.
- The booking POST endpoint repeats the same server-side owner check. Client metadata alone never grants preview access.

## Safety and verification

- Do not reset the owner password, create a paid order, send an email, or apply a database migration.
- Add regression coverage for the three account sections, inline password behavior, separate new-email input, and owner-only booking preview guard.
- Run focused tests first, then the full Node suite, TypeScript, ESLint and production build. Review `/tai-khoan` and `/dat-lich-ho-tro` locally on desktop and mobile without submitting a form.
