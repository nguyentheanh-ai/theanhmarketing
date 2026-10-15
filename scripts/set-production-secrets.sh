#!/bin/zsh
# Owner-run helper: enter each production secret for Worker theanh-main-cf-production.
# Values are typed hidden into Wrangler's own prompt; nothing is stored or printed.
# Press Enter on an empty prompt to skip a name (set it later).
set -u
cd "$(dirname "$0")/.."
W=theanh-main-cf-production
NAMES=(
  SUPABASE_SERVICE_ROLE_KEY RESEND_API_KEY SEPAY_WEBHOOK_API_KEY SEPAY_WEBHOOK_SECRET
  SEPAY_BANK_ACCOUNT_NAME SEPAY_BANK_ACCOUNT_NUMBER SEPAY_BANK_CODE CRON_SECRET CHECKOUT_ABUSE_HMAC_KEY
  META_CAPI_ACCESS_TOKEN META_CAPI_DATASET_ID META_CAPI_API_VERSION META_CODEX_CAPI_ACCESS_TOKEN
  META_ADS_ACCESS_TOKEN META_ADS_AD_ACCOUNT_ID META_APP_ID META_APP_SECRET
  TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID TELEGRAM_REPORT_SECRET GOOGLE_SHEETS_WEBHOOK_URL
  STUDENT_PORTAL_PROVISION_SECRET STUDENT_PORTAL_PROVISION_URL
  ACCOUNTING_NOTIFICATION_EMAIL ADMIN_EMAILS ADMIN_LOGIN_EMAIL NEW_LEAD_NOTIFICATION_TO
  PAYMENT_SUCCESS_EMAIL_FROM PENDING_PAYMENT_EMAIL_FROM REGISTRATION_NOTIFICATION_EMAIL REGISTRATION_NOTIFICATION_FROM
  CRM_V2_ENABLED CRM_V2_USE_DEMO_DATA CRM_V2_ALLOW_DEMO_SEED
)
for n in $NAMES; do
  printf '\n== %s ==\n' "$n"
  read -s "v?Dán giá trị (ẩn), Enter để bỏ qua: "; echo
  [[ -z "$v" ]] && { echo "bỏ qua $n"; continue; }
  print -rn -- "$v" | node_modules/.bin/wrangler secret put "$n" --name "$W" >/dev/null 2>&1 && echo "đã lưu $n" || echo "LỖI khi lưu $n"
  unset v
done
# Native keys required by the config: fresh random values, never shown.
for n in NATIVE_AUTH_REFRESH_KEY NATIVE_AUTH_CREDENTIAL_KEY NATIVE_AUTH_LIMITER_KEY R2_PRIVATE_URL_SECRET; do
  node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64url"))' | node_modules/.bin/wrangler secret put "$n" --name "$W" >/dev/null 2>&1 && echo "đã tạo $n" || echo "LỖI khi tạo $n"
done
echo "Xong. Danh sách tên đã lưu:"; node_modules/.bin/wrangler secret list --name "$W" 2>/dev/null | grep '"name"'
