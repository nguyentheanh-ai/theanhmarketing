#!/usr/bin/env python3
"""Prepare four runtime credentials. --apply requires owner's specific approval.

Default mode only prints names and destinations: no Keychain/API/Worker calls.
Never changes provider webhooks, domains, schedulers, or database data.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'main'
B = Path('/Users/theanh/CodexProjects/TheAnh-Web/worktrees/b-cf-production-20261017')
PREFIX = 'com.theanhmarketing.cloudflare-migration.production.runtime.'
TASKS = (
    ('theanh-main-cf-production', 'RESEND_WEBHOOK_SECRET', 'existing_resend'),
    ('theanh-main-cf-production', 'CRON_SECRET', 'generate_once'),
    ('theanh-student-cf-production', 'CRON_SECRET', 'generate_once'),
    ('theanh-main-cf-production', 'TELEGRAM_REPORT_SECRET', 'generate_once'),
)

def keychain_get(service, account=None):
    cmd = ['/usr/bin/security', 'find-generic-password', '-w', '-s', service]
    if account:
        cmd += ['-a', account]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    if r.returncode == 44:
        return None
    if r.returncode:
        raise RuntimeError('Keychain read failed')
    return r.stdout.rstrip('\r\n')

def keychain_save(name, worker, value):
    r = subprocess.run(
        ['/usr/bin/security', 'add-generic-password', '-U', '-s', PREFIX + name,
         '-a', worker, '-w'], input=value + '\n' + value + '\n',
        capture_output=True, text=True, timeout=15)
    if r.returncode or keychain_get(PREFIX + name, worker) != value:
        raise RuntimeError('Keychain save/readback failed')

def existing_resend_secret():
    api_key = keychain_get('com.theanhmarketing.resend.production')
    if not api_key or not api_key.startswith('re_'):
        raise RuntimeError('Missing existing Resend API credential')
    req = urllib.request.Request(
        'https://api.resend.com/webhooks/0f1c3dc2-b52c-4eb6-878c-a16a56254ea5',
        headers={'Authorization': 'Bearer ' + api_key, 'User-Agent': 'TheAnhMigration/1'})
    with urllib.request.urlopen(req, timeout=20) as response:
        data = json.load(response)
    if data.get('endpoint') != 'https://www.theanhmarketing.com/api/resend/webhook' or data.get('status') != 'enabled':
        raise RuntimeError('Existing webhook identity/status mismatch')
    value = data.get('signing_secret', '')
    if not value.startswith('whsec_') or '\n' in value or '\r' in value:
        raise RuntimeError('Existing signing secret unavailable')
    return value

def put_secret(worker, name, value):
    is_b = worker == 'theanh-student-cf-production'
    root = B if is_b else A
    config = root / ('.open-next/wrangler.json' if is_b else 'dist/server/wrangler.json')
    if is_b:
        # B's reviewed source config defines env.production and OpenNext main.
        config = root / 'wrangler.jsonc'
    if not config.is_file():
        raise RuntimeError('Reviewed Worker config missing')
    cmd = ['node', str(root / 'node_modules/wrangler/bin/wrangler.js'), 'secret', 'put',
           name, '--name', worker, '--config', str(config)]
    if is_b:
        cmd += ['--env', 'production']
    env = dict(os.environ, CI='1')
    r = subprocess.run(cmd, cwd=root, input=value + '\n', capture_output=True,
                       text=True, env=env, timeout=90)
    if r.returncode:
        # Do not relay tool output; an upstream tool may echo sensitive input.
        raise RuntimeError('Worker secret write failed')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if not args.apply:
        print(json.dumps({'mode': 'PLAN_ONLY', 'requires_specific_owner_approval': True,
                          'tasks': [dict(worker=w, name=n, source=s) for w,n,s in TASKS]}))
        return 0
    current = 'preparation'
    try:
        for worker, name, source in TASKS:
            current = worker + ':' + name
            value = keychain_get(PREFIX + name, worker)
            if not value:
                value = existing_resend_secret() if source == 'existing_resend' else base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')
                keychain_save(name, worker, value)
            put_secret(worker, name, value)
            print(json.dumps({'worker': worker, 'name': name, 'written': True}), flush=True)
            value = None
        return 0
    except Exception:
        print('STOP: ' + current + ' failed; raw diagnostics suppressed', file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
