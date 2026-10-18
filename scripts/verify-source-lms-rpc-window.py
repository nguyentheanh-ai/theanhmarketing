#!/usr/bin/env python3
"""Approved service-role READ RPC sample, checked against two input endpoints.

No login, source data/role write, email or Worker secret update. All private
inputs and RPC results stay in RAM/captured child stdin. This is a stable-window
sample, NOT one MVCC snapshot across the HTTP requests or a final writer fence.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
import datetime
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
PROJECT = 'vsxxgdzwtscuxcmjfckt'
STAGE = 'credentials'
RPC_READS_COMPLETED = 0


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec); spec.loader.exec_module(loaded)
    return loaded


def table_rows(payload, schema, table):
    catalog = next(t for t in payload['catalog'] if t['s'] == schema and t['t'] == table)
    return [dict(zip([c['n'] for c in catalog['cols']], row)) for row in payload['tables']['a_' + schema + '__' + table]['rows']]


def subjects(payload, qa_email):
    users = table_rows(payload, 'auth', 'users')
    eligible = [u for u in users if u.get('email') and u.get('email_confirmed_at') and not u.get('deleted_at') and
                u.get('is_anonymous') != 'true' and json.loads(u.get('raw_app_meta_data') or '{}').get('admin_role') not in ['owner', 'editor']]
    ids, selected = set(), []
    def add(user):
        if user and user['id'] not in ids and len(selected) < 5:
            selected.append(user); ids.add(user['id'])
    add(next((u for u in eligible if u['email'].lower() == qa_email.lower()), None))
    progress_ids = {p['enrollment_id'] for p in table_rows(payload, 'crm_v2', 'course_progress')}
    enrollments = table_rows(payload, 'crm_v2', 'enrollments')
    contacts = {c['id']: c for c in table_rows(payload, 'crm_v2', 'contacts')}
    for e in sorted(enrollments, key=lambda e: e['id'] not in progress_ids):
        metadata = json.loads(e.get('metadata') or '{}')
        email = contacts.get(e.get('contact_id'), {}).get('email') or metadata.get('student_email') or ''
        add(next((u for u in eligible if u['id'] == e.get('user_id') or email and u['email'].lower().strip() == email.lower().strip()), None))
    for u in eligible:
        add(u)
    if not selected:
        raise ValueError('NO_ELIGIBLE_READ_ONLY_SUBJECT')
    return selected


def timestamp(value):
    value = value.replace(' ', 'T').replace('Z', '+00:00')
    value = re.sub(r'([+-]\d{2})$', r'\1:00', value)
    value = re.sub(r'\.(\d{1,5})(?=[+-]\d{2}:\d{2}$)', lambda m: '.' + m.group(1).ljust(6, '0'), value)
    return datetime.datetime.fromisoformat(value)


def assert_window_endpoints(before, after, comparison):
    # Equal endpoints do not rule out transient changes between the requests.
    if any(t['inserted'] or t['updated'] or t['removed'] for t in comparison['tables']):
        raise ValueError('SOURCE_INPUT_CHANGED_DURING_RPC_WINDOW')
    low, high = timestamp(before['capturedAt']), timestamp(after['capturedAt'])
    if low.utcoffset() is None or high.utcoffset() is None or high < low:
        raise ValueError('INVALID_SOURCE_WINDOW_CLOCK')
    if any(e.get('expires_at') and low <= timestamp(e['expires_at']) <= high for e in table_rows(before, 'crm_v2', 'enrollments')):
        raise ValueError('ENROLLMENT_EXPIRY_CROSSED_RPC_WINDOW')


def main():
    global STAGE, RPC_READS_COMPLETED
    live = module('live_window_input', ROOT / 'scripts/verify-live-lms-rpc-parity.py')
    sealed = live.sealed
    policy = module('policy_window_http', ROOT / 'scripts/read-source-auth-policy.py')
    storage = module('existing_source_key_reader', ROOT.parent / 'scripts/backup-storage.py')
    token = sealed.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat')
    key = storage.service_key('A', use_scoped_pat=True)  # Owner-approved RAM-only read.
    master = sealed.keychain('archive', 'theanh-cloudflare-migration-archive')
    opener = urllib.request.build_opener(policy.NoRedirect)
    def query(sql):
        request = urllib.request.Request('https://api.supabase.com/v1/projects/' + PROJECT + '/database/query',
            data=json.dumps({'query': sql, 'read_only': True}).encode(), method='POST',
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        with opener.open(request, timeout=90) as response:
            raw = response.read(64 * 1024 * 1024 + 1)
        if len(raw) > 64 * 1024 * 1024:
            raise ValueError('BOUNDED_INPUT_RESPONSE_EXCEEDED')
        rows = json.loads(raw)
        if not isinstance(rows, list) or len(rows) != 1:
            raise ValueError('SOURCE_INPUT_UNAVAILABLE')
        return rows[0]
    STAGE = 'catalog'
    catalog = query('SELECT (' + live.catalog_sql() + ') catalog')['catalog']
    if {(t['s'], t['t']) for t in catalog} != set(live.RELATIONS):
        raise ValueError('SOURCE_INPUT_RELATIONS_UNAVAILABLE')
    snapshot_sql = 'WITH source AS MATERIALIZED (' + live.source_snapshot_sql(catalog) + ") SELECT export,current_setting('transaction_read_only') read_only FROM source"
    def snapshot():
        result = query(snapshot_sql)
        if result.get('read_only') != 'on' or result['export']['catalog'] != catalog:
            raise ValueError('SOURCE_INPUT_SNAPSHOT_UNVERIFIED')
        archive = sealed.helper('seal', master, 'a', result['export'])
        sealed.helper('verify', master, 'a', archive)
        return result['export'], archive
    STAGE = 'source-before'
    before, before_archive = snapshot()
    qa = json.loads(Path('/private/tmp/theanh-cf-qa-20261013.json').read_text())
    selected = subjects(before, qa['email']); del qa
    scopes = [None] + [c['slug'] for c in table_rows(before, 'public', 'courses')]
    STAGE = 'source-readonly-rpc-sample'
    def call(user, scope):
        request = urllib.request.Request('https://' + PROJECT + '.supabase.co/rest/v1/rpc/student_lms_enrollments_scoped',
            data=json.dumps({'p_user_id': user['id'], 'p_email': user['email'], 'p_course_slug': scope}).encode(), method='POST',
            headers={'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': 'tx=rollback'})
        with opener.open(request, timeout=45) as response:
            raw = response.read(1024 * 1024 + 1)
        if len(raw) > 1024 * 1024:
            raise ValueError('BOUNDED_RPC_RESPONSE_EXCEEDED')
        # JSON text remains exact until the native oracle's numeric guard.
        document = raw.decode()
        if not isinstance(json.loads(document), dict):
            raise ValueError('RPC_RESPONSE_UNAVAILABLE')
        return {'id': user['id'], 'scope': scope, 'value': document}
    oracle = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        pending = [pool.submit(call, user, scope) for user in selected for scope in scopes]
        try:
            for result in as_completed(pending):
                oracle.append(result.result()); RPC_READS_COMPLETED += 1
        except Exception:
            for future in pending:
                future.cancel()
            raise
    del key
    STAGE = 'source-after'
    after, after_archive = snapshot()
    result = subprocess.run(['node', str(ROOT / 'scripts/sealed-source-snapshot.mjs')], cwd=ROOT, capture_output=True, text=True,
                            input=json.dumps({'operation': 'compare', 'masterSecret': master, 'project': 'a', 'before': before_archive, 'after': after_archive}), timeout=180)
    if result.returncode:
        raise ValueError('INPUT_COMPARISON_UNAVAILABLE')
    comparison = json.loads(result.stdout)
    assert_window_endpoints(before, after, comparison)
    STAGE = 'native-parity-comparison'
    data = {'project': 'a', 'archive': before_archive, 'masterSecret': master, 'rpcOracle': oracle,
            'subjectIds': [u['id'] for u in selected], 'compilerRoot': str(ROOT),
            'schemas': [(ROOT / 'scripts' / name).read_text() for name in ['d1-course-access-source-prototype.sql', 'd1-lms-compatibility-prototype.sql', 'd1-lms-legacy-enrollment-owners-prototype.sql']]}
    result = subprocess.run(['node', str(ROOT / 'scripts/probe-sealed-learning-access.mjs')], cwd=ROOT, capture_output=True, text=True,
                            input=json.dumps(data), timeout=240)
    if result.returncode:
        raise ValueError('SOURCE_RPC_NATIVE_PARITY_UNAVAILABLE')
    report = json.loads(result.stdout)
    if report.get('readyForCutover') is not False or report.get('sourceRpcExecuted') is not True:
        raise ValueError('RPC_COMPARISON_RECEIPT_UNVERIFIED')
    report.update(status='TESTED_READ_ONLY_RPC_SAMPLE_STABLE_INPUT_WINDOW', sourceInputsAndOracleSameMvccStatement=False,
                  reference='POSTGRESQL_RPC_STABLE_INPUT_WINDOW_WITH_REPOSITORY_POSTPROCESSING_AND_ENTITLEMENT_RULES',
                  inputTablesCheckedBeforeAndAfter=len(catalog), inputRowsEqualAtWindowEndpoints=True, transientSourceChangesExcluded=False,
                  sourceWindowStartedAt=before['capturedAt'], sourceWindowEndedAt=after['capturedAt'],
                  rpcReadsCompleted=RPC_READS_COMPLETED, sourceWriterFenced=False, expiresDuringWindow=False,
                  sourceLoginExecuted=False, sourceDataWritten=False, serviceRolePersisted=False)
    (ROOT / 'reports/cloudflare-phase2-20261018/source-lms-rpc-window-a.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        safe = ['SOURCE_INPUT_CHANGED_DURING_RPC_WINDOW', 'ENROLLMENT_EXPIRY_CROSSED_RPC_WINDOW', 'SOURCE_RPC_NATIVE_PARITY_UNAVAILABLE']
        report = {'status': 'READ_ONLY_RPC_SAMPLE_NOT_VERIFIED', 'stage': STAGE,
                  'reason': str(error) if isinstance(error, ValueError) and str(error) in safe else 'PRIVATE_DETAILS_WITHHELD',
                  'rpcReadsCompleted': RPC_READS_COMPLETED, 'productionWritten': False, 'readyForCutover': False}
        (ROOT / 'reports/cloudflare-phase2-20261018/source-lms-rpc-window-a.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report)); sys.exit(2)
