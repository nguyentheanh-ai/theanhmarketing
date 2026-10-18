#!/usr/bin/env python3
"""PLAN_ONLY by default. Negative hosted auth/parser probes, never settlement."""
import argparse,importlib.util,json,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--probe',action='store_true');args=parser.parse_args()
if not args.probe:
    print('PLAN_ONLY: wrong/missing bank auth and authenticated invalid JSON; unauthenticated cron routes');raise SystemExit(0)
spec=importlib.util.spec_from_file_location('runtime',ROOT/'scripts/restore-production-runtime-secrets.py');runtime=importlib.util.module_from_spec(spec);spec.loader.exec_module(runtime)
key=runtime.keychain_get('com.theanhmarketing.sepay.webhook.production')
if not key or '\n' in key:raise SystemExit('Verified saved webhook key unavailable')
# urllib transport receives edge403/text/plain here while the established Node
# QA transport reaches the route's401/400 JSON. Do not count an edge denial as
# application authorization evidence. No security setting is changed.
import subprocess
code = r"""
let input='';for await(const chunk of process.stdin)input+=chunk;const {key}=JSON.parse(input);
const origin='https://theanh-main-cf-production.12c1thdtheanh.workers.dev',checks=[];
async function request(path,body,auth){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(auth?{authorization:auth}:{})},body,redirect:'manual',signal:AbortSignal.timeout(20000)});const applicationJson=(r.headers.get('content-type')??'').includes('application/json');await r.body?.cancel();return{status:r.status,applicationJson};}
for(const [name,auth,expected] of [['missing-key',null,401],['wrong-key','Apikey fixture-invalid',401],['verified-key-invalid-json','Apikey '+key,400]]){const r=await request('/api/sepay/webhook','{',auth);checks.push({check:name,...r,passed:r.status===expected&&r.applicationJson});}
for(const path of ['/api/orders/expire','/api/orders/sync-google-sheet','/api/admin/purge-deleted','/api/meta/purchase-retry','/api/agent-kit/preorder-launch','/api/reports/telegram/full-day','/api/email/campaigns/send-due','/api/email/worker/send-due']){const r=await request(path);checks.push({check:'cron-denies-guest',path,...r,passed:[401,403].includes(r.status)&&r.applicationJson});}
console.log(JSON.stringify(checks));
"""
r=subprocess.run(['node','-e',code],cwd=ROOT,input=json.dumps({'key':key}),capture_output=True,text=True,timeout=100)
key=None
if r.returncode:raise SystemExit('Hosted probe failed; raw diagnostic withheld')
checks=json.loads(r.stdout)
from datetime import datetime,timezone
report={'checkedAt':datetime.now(timezone.utc).isoformat(),'status':'PASS' if all(c['passed'] for c in checks) else 'FAIL','checks':checks,'scope':'Hosted A preview auth/parser negative probes only; no valid payment JSON or authorized cron execution, no bank settlement, email or customer mutation'}
(ROOT/'reports/cloudflare-handoff-20261018/hosted-payment-cron-negative.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report));raise SystemExit(0 if report['status']=='PASS' else 1)
