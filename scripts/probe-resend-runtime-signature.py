#!/usr/bin/env python3
"""Check only the A preview signature gate with intentionally invalid JSON.

The reviewed handler verifies the signature then rejects invalid JSON before
calling email providers or database writers. Never sends a real email event.
Keychain values and signatures are never printed, persisted, or passed as argv.
"""
import argparse
import base64
import datetime
import hashlib
import hmac
import json
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request
import uuid

URL = 'https://theanh-main-cf-production.12c1thdtheanh.workers.dev/api/resend/webhook'
SERVICE = 'com.theanhmarketing.cloudflare-migration.production.runtime.RESEND_WEBHOOK_SECRET'
WORKER = 'theanh-main-cf-production'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--send-probes', action='store_true')
    args = parser.parse_args()
    if not args.send_probes:
        print(json.dumps({'mode': 'PLAN_ONLY', 'target': URL, 'body': 'intentionally_invalid_json', 'checks': 3}))
        return 0
    try:
        result = subprocess.run(['/usr/bin/security', 'find-generic-password', '-w', '-s', SERVICE, '-a', WORKER],
                                capture_output=True, text=True, timeout=15)
        if result.returncode:
            raise RuntimeError('credential unavailable')
        secret = result.stdout.rstrip('\r\n')
        if not secret.startswith('whsec_'):
            raise RuntimeError('credential format')
        key = base64.b64decode(secret[6:], validate=True)
        body = b'{'
        checks = []
        for kind, age, bad, expected, message in [
            ('valid_signature_invalid_json', 0, False, 400, 'Invalid webhook payload'),
            ('wrong_signature', 0, True, 401, 'Invalid webhook signature'),
            ('expired_signature', 600, False, 401, 'Invalid webhook signature'),
        ]:
            event_id = 'tam-qa-invalid-json-' + uuid.uuid4().hex
            timestamp = str(int(time.time()) - age)
            signature = base64.b64encode(hmac.new(key, event_id.encode() + b'.' + timestamp.encode() + b'.' + body, hashlib.sha256).digest()).decode()
            if bad:
                signature = ('A' if signature[0] != 'A' else 'B') + signature[1:]
            request = urllib.request.Request(URL, data=body, method='POST', headers={
                'Content-Type': 'application/json', 'User-Agent': 'TheAnhMigrationQA/1',
                'svix-id': event_id, 'svix-timestamp': timestamp, 'svix-signature': 'v1,' + signature})
            try:
                response = urllib.request.urlopen(request, timeout=15)
            except urllib.error.HTTPError as error:
                response = error
            with response:
                data = json.loads(response.read(2048))
                status = response.code
            checks.append({'check': kind, 'status': status, 'expected_status': expected,
                           'passed': status == expected and data.get('message') == message and data.get('events') == 0})
        report = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'target': URL, 'status': 'PASS' if all(x['passed'] for x in checks) else 'FAIL',
                  'checks': checks, 'scope': 'Signature acceptance/rejection only; invalid JSON stops before event handling. No delivery/payment/valid-event idempotency claim.'}
        path = Path(__file__).resolve().parents[1] / 'reports/cloudflare-handoff-20261018/resend-signature-hosted.json'
        path.write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
        return 0 if report['status'] == 'PASS' else 1
    except Exception:
        print(json.dumps({'status': 'BLOCKED', 'reason': 'Probe failed; credential and raw response suppressed'}))
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
