# Zalo ZBS API contract

Verified on 2026-08-03 against the authenticated Zalo for Developers documentation for app `The Anh Marketing` and OA `Greezhub Academy - The Anh Marketing`. This file contains no credential values.

## Official sources

- Send by phone: <https://developers.zalo.me/docs/zbs-template-message/gui-tin-template-qua-sdt/api-gui-tin-qua-sdt/api-gui-tin>
- OAuth v4 authorization and refresh: <https://developers.zalo.me/docs/official-account/bat-dau/xac-thuc-va-uy-quyen-cho-ung-dung-new>
- Error catalogue: <https://developers.zalo.me/docs/zbs-template-message/bang-ma-loi/>

## Send by phone

- Permission: `Gửi tin qua số điện thoại`.
- Request: `POST https://business.openapi.zalo.me/message/template`.
- Content type and response type: `application/json`.
- Authentication header: `access_token`, containing the OA access token without a documented scheme prefix.
- Required JSON fields: `phone`, `template_id`, `template_data`, `tracking_id`.
- Optional field: `sending_mode`; this integration omits it and therefore uses normal sending mode. It never requests the whitelist-only over-quota mode.
- Phone format: Vietnamese country-code form such as `84987654321` or `+84987654321`. The application standardizes on digits-only `84...`.
- Zalo recommends `tracking_id` at most 48 characters and without special characters. This integration uses `pp` followed by the uppercase alphanumeric order code.
- Success is `error = 0`; the provider message identifier is `data.msg_id`. Other documented success data includes `sent_time`, `sending_mode`, and quota fields.
- Provider errors expose top-level `error` and `message`. Application logs and worker responses keep only a bounded internal reason code and safe HTTP/error classification; raw provider bodies are never logged.

The send page does not prescribe application retry timing. This project retries only timeouts, HTTP 429, and HTTP 5xx, using two bounded delays. Documented permanent template, recipient, permission, and configuration errors are terminal.

## OAuth v4 refresh

- Access tokens last 25 hours.
- Refresh tokens last three months and are single-use. Every successful refresh returns a new refresh token, so both tokens must be replaced atomically.
- Request: `POST https://oauth.zaloapp.com/v4/oa/access_token`.
- Content type: `application/x-www-form-urlencoded`.
- Secret header: `secret_key`.
- Body fields: `refresh_token`, `app_id`, and `grant_type=refresh_token`.
- Response fields: `access_token`, `refresh_token`, and `expires_in` in seconds.

Tokens are stored server-side behind service-role-only RPCs. No token is committed, returned to the browser, included in an API response, or written to normal logs.

## Pending-payment template contract

The immutable proposed variables are:

1. `customer_name`
2. `product_name`
3. `order_code`
4. `amount`
5. `transfer_content`
6. `status`

The action URL reuses `order_code` in the fixed pattern `https://www.theanhmarketing.com/thanh-toan/<order_code>?openBank=1`.

The ZBS template is not yet approved. Provider sending remains disabled until Zalo approves a template with exactly these variables; after approval this section will record the template ID and status without storing tokens.

## VietQR bank-app handoff

Verified on 2026-08-03 against <https://vietqr.io/en/danh-sach-api/deeplink-app-ngan-hang/> and <https://www.vietqr.io/changelog/>.

- VietQR documents platform-specific app directories at `https://api.vietqr.io/v2/android-app-deeplinks` and `https://api.vietqr.io/v2/ios-app-deeplinks`.
- A current handoff is app-specific: `https://dl.vietqr.io/pay?app=<app_id>`. The customer must click a chosen installed banking app on Android or iOS.
- The documented parameters are `ba` for beneficiary account and bank, `am` for amount, `tn` for transfer content, `bn` for beneficiary name, and `url` for the return URL.
- VietQR explicitly describes a universal `vietqr://` chooser as an expected future standard, not a generally available current capability. The website therefore does not claim or attempt universal automatic opening.
- `openBank=1` shows a server-derived mobile app chooser. Every app link is generated from the stored order and server bank configuration; URL query parameters cannot override amount, account, or transfer content.
- Unsupported devices, directory failures, missing apps, or blocked handoffs remain on the existing payment page with VietQR and copy controls.
