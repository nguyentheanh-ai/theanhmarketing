# Meta CAPI Test Runbook

Cap nhat: 2026-07-06

Dung cho `theanhmarketing.com` / Pixel-Dataset `1315653423712065`.

## Trang thai hien tai

- Browser Pixel live: `NEXT_PUBLIC_META_PIXEL_ID=1315653423712065`.
- Server CAPI live: `lib/meta/conversions-api.ts`.
- Server `Lead`: tao qua `POST /api/orders`, chay nen sau khi order pending duoc tao.
- Server `Purchase`: tao qua SePay/manual paid confirm lan dau, co marker chong trung `purchase_event_sent`.
- Dedup `Lead`: landing page tao client `leadId`, gui cung ID vao Pixel `Lead` va `/api/orders`; server dung ID do lam `event_id`.
- Khong giu `META_CAPI_TEST_EVENT_CODE` trong Production khi khong test.

## Endpoint test nhanh trong Graph API Explorer

Method:

```text
POST
```

Endpoint:

```text
/v25.0/1315653423712065/events
```

Graph API Explorer se hien thanh:

```text
https://graph.facebook.com/v25.0/1315653423712065/events
```

Tham so rieng:

```text
test_event_code=TEST...
```

Payload toi thieu:

```json
{
  "data": [
    {
      "event_name": "Lead",
      "event_time": 1783330000,
      "action_source": "website",
      "event_id": "manual-capi-test-001",
      "event_source_url": "https://www.theanhmarketing.com/academy/facebook-ads-master-2026",
      "user_data": {
        "client_user_agent": "manual Meta CAPI test"
      },
      "custom_data": {
        "content_name": "Manual CAPI test",
        "currency": "VND",
        "value": 0
      }
    }
  ]
}
```

Thay `event_time` bang Unix timestamp hien tai truoc khi gui.

Ket qua dung:

```json
{
  "events_received": 1,
  "messages": []
}
```

Trong Events Manager > Test Events, event nen hien la `Lead`, nguon `Server`/`May chu`.

## Test dung route website

Chi lam khi anh approve tao mot lead/order test co kiem soat.

1. Lay `test_event_code` moi trong Meta Events Manager > Test Events.
2. Them tam `META_CAPI_TEST_EVENT_CODE=TEST...` vao Vercel Production.
3. Redeploy Production.
4. Mo landing live:

```text
https://www.theanhmarketing.com/academy/facebook-ads-master-2026
```

5. Submit form voi thong tin test da approve.
6. Kiem tra Events Manager:
   - Browser `Lead` tu website.
   - Server `Lead` tu CAPI.
   - Hai event dung chung `event_id`/dedup ID.
7. Go `META_CAPI_TEST_EVENT_CODE` khoi Vercel Production.
8. Redeploy Production lan nua.
9. Kiem tra `vercel env ls production` khong con `META_CAPI_TEST_EVENT_CODE`.

## Khong lam

- Khong commit/paste access token, app secret, CAPI token vao docs/chat.
- Khong tao Supabase webhook hoac route CAPI song song khi `/api/orders`, SePay webhook va payment confirm da la flow that.
- Khong tao lead/order production chi de test neu anh chua approve.
- Khong de `META_CAPI_TEST_EVENT_CODE` trong Production sau khi test xong.
