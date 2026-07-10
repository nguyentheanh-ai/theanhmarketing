# Facebook Ads Post-Payment Access Guide Design

## Goal

After a paid Facebook Ads Master 2026 order is confirmed, the customer lands on a noindex guide that explains the exact visible journey: payment success, check email, open the payment-success email, copy the temporary password, log in, and open the course from the student dashboard.

## Approved Direction

The owner approved a visual guide based on real website screens, then clarified that the guide must teach customers to open their email and retrieve the temporary password because the student area requires an account.

## Route And Flow

- Keep the existing paid redirect in `components/payment/payment-status-poller.tsx`.
- The course route remains `/cam-on-thanh-toan/facebook-ads-2026`.
- The login CTA remains `/dang-nhap?next=%2Fdashboard`.
- The support CTA remains `/vao-khoa-hoc`.
- The page stays public and noindex; it must not expose course content, real passwords, tokens, or customer data.

## Customer-Facing Steps

1. Thanh toán thành công.
2. Check mail.
3. Mở email xác nhận thanh toán.
4. Lấy mật khẩu tạm.
5. Đăng nhập và vào học.

The page must explicitly say not to create a new account before checking the payment-success email.

## Verification

Add a source-level regression test requiring the full email-password-login journey and preserving the existing paid redirect target.
