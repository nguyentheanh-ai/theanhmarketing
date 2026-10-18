#!/usr/bin/env python3
"""Probe preview authentication denial and public Range; no valid writes/events."""
import argparse
import datetime
import json
from pathlib import Path
import urllib.error
import urllib.request

A = 'https://theanh-main-cf-production.12c1thdtheanh.workers.dev'
B = 'https://theanh-student-cf-production.12c1thdtheanh.workers.dev'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--send-probes', action='store_true')
    args = parser.parse_args()
    if not args.send_probes:
        print(json.dumps({'mode': 'PLAN_ONLY', 'targets': [A, B]}))
        return 0
    opener = urllib.request.build_opener(NoRedirect)
    cases = [
        ('A_dashboard', A+'/dashboard', 'GET', None, {}, [302,303,307,308]),
        ('A_paid_lesson', A+'/learn/facebook-ads-2026/828c23b3-449b-4a54-bece-aeb4daf476ba', 'GET', None, {}, [302,303,307,308]),
        ('A_progress', A+'/api/student/progress', 'POST', b'{}', {}, [401]),
        ('A_payment_admin', A+'/api/payment/confirm', 'POST', b'{}', {}, [401,403]),
        ('A_sepay_wrong_key', A+'/api/sepay/webhook', 'POST', b'{', {'Authorization':'Apikey intentionally-invalid-qa'}, [401]),
        ('B_meta_status', B+'/api/ads/meta/status', 'GET', None, {}, [401]),
        ('B_session_invalid', B+'/api/auth/session-cookie', 'POST', b'{"accessToken":"intentionally-invalid-qa"}', {}, [401]),
    ]
    results = []
    for name, url, method, data, extra, expected in cases:
        headers = {'User-Agent':'TheAnhMigrationQA/1', 'Content-Type':'application/json', **extra}
        try:
            response = opener.open(urllib.request.Request(url, method=method, data=data, headers=headers), timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            # Only content type/status and expected redirect are retained, never body/cookie.
            response.read(1024)
            location = response.headers.get('Location', '')
            passed = response.status in expected
            if name in ('A_dashboard','A_paid_lesson'):
                passed = passed and '/dang-nhap' in location
            else:
                passed = passed and 'application/json' in response.headers.get('Content-Type','')
            results.append({'check':name, 'status':response.status, 'passed':passed,
                            'content_type':response.headers.get('Content-Type'),
                            'cache_control':response.headers.get('Cache-Control')})
    path = '/course-resources/facebook-ads-2026/master-prompts/01_MASTER_PROMPT_NGHIEN_CUU_DOI_THU_FACEBOOK.txt'
    for origin in ('https://www.theanhmarketing.com', A):
        try:
            request = urllib.request.Request(origin+path, headers={'Range':'bytes=0-63','User-Agent':'TheAnhMigrationQA/1'})
            with opener.open(request, timeout=20) as response:
                body = response.read()
                results.append({'check':'public_resource_range','origin':origin,'status':response.status,
                                'bytes':len(body),'content_range':response.headers.get('Content-Range'),
                                'passed':response.status==206 and len(body)==64})
        except urllib.error.HTTPError as error:
            results.append({'check':'public_resource_range','origin':origin,'status':error.code,'passed':False})
    report = {'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'scope':'No-session/invalid-token denial and public-file Range only; not cross-user isolation, valid payment or private-file streaming',
              'transport_observation':'Default Python-urllib agent got edge text/plain 403; explicit TheAnhMigration/1 got application/json 401 on same progress URL. No protection setting changed.',
              'results':results,'status':'PASS' if all(r['passed'] for r in results) else 'FAIL'}
    (Path(__file__).resolve().parents[1]/'reports/cloudflare-handoff-20261018/hosted-denial-and-public-range.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    return 0 if report['status']=='PASS' else 1

if __name__ == '__main__':
    raise SystemExit(main())
