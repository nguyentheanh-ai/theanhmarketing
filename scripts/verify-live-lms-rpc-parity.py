#!/usr/bin/env python3
"""Live READ ONLY: RPC oracle and exact source inputs in ONE MVCC statement.

Rows/password hashes/oracle outputs stay in captured RAM and child stdin.
An authenticated sealed snapshot is produced/verified in RAM; no provider write,
customer file, raw SQL error or credential is emitted.
"""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('sealed_live_lms', ROOT / 'scripts/export-sealed-source-snapshot.py')
sealed = importlib.util.module_from_spec(spec); spec.loader.exec_module(sealed)
RELATIONS = [('auth', 'users'), ('public', 'orders'), ('public', 'leads'), ('public', 'courses'),
             ('public', 'course_modules'), ('public', 'lessons'), ('public', 'lesson_resources'),
             ('public', 'course_resources'), ('crm_v2', 'contacts'), ('crm_v2', 'enrollments'), ('crm_v2', 'course_progress')]
STAGE = 'arguments'
RPC_EXECUTION_STATUS = 'NOT_STARTED'


def assert_rpc_permission(row):
    if row.get('read_only') is not True or row.get('can_execute_rpc') is not True:
        raise PermissionError('SOURCE_RPC_EXECUTE_PERMISSION_UNAVAILABLE')


def catalog_sql():
    full = sealed.app.catalog_sql('a', include_auth_storage=True)
    scopes = ','.join("('%s','%s')" % item for item in RELATIONS)
    return "SELECT coalesce(jsonb_agg(item ORDER BY item->>'s',item->>'t'),'[]'::jsonb) FROM jsonb_array_elements((%s)::jsonb) item WHERE (item->>'s',item->>'t') IN (%s)" % (full, scopes)


def source_snapshot_sql(catalog):
    full = sealed.app.catalog_sql('a', include_auth_storage=True)
    base = sealed.app.snapshot_sql('a', catalog, sealed_archive=True)
    if base.count('(' + full + ')') != 1:
        raise ValueError('SOURCE_SNAPSHOT_COMPOSITION_UNAVAILABLE')
    base = base.replace('(' + full + ')', '(' + catalog_sql() + ')')
    # RPC expires_at uses now() == transaction_timestamp(), so the native
    # replay clock must be that SAME source clock, not a later local timestamp.
    base = base.replace("'capturedAt',statement_timestamp()", "'capturedAt',transaction_timestamp()")
    return base


def oracle_sql(catalog):
    base = source_snapshot_sql(catalog)
    return """WITH snapshot_doc AS MATERIALIZED (%s),
      scopes AS (SELECT NULL::text slug UNION ALL SELECT slug FROM public.courses),
      oracle AS MATERIALIZED (SELECT u.id,s.slug,
        public.student_lms_enrollments_scoped(u.id,u.email,s.slug)::text value
        FROM auth.users u CROSS JOIN scopes s)
      SELECT (SELECT export FROM snapshot_doc) export,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'scope',slug,'value',value)),'[]'::jsonb) FROM oracle) oracle,
        current_setting('transaction_read_only') read_only""" % base


def main():
    global STAGE, RPC_EXECUTION_STATUS
    STAGE = 'source-credential'
    token = sealed.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat')
    def query(sql):
        request = urllib.request.Request('https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query',
            data=json.dumps({'query': sql, 'read_only': True}).encode(), method='POST',
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read(64 * 1024 * 1024 + 1)
        if len(raw) > 64 * 1024 * 1024:
            raise ValueError('BOUNDED_SOURCE_RESPONSE_EXCEEDED')
        result = json.loads(raw)
        if not isinstance(result, list) or len(result) != 1:
            raise ValueError('SOURCE_RESPONSE_UNAVAILABLE')
        return result[0]
    STAGE = 'source-rpc-execute-permission'
    permission = query("SELECT has_function_privilege(current_user,'public.student_lms_enrollments_scoped(uuid,text,text)','EXECUTE') can_execute_rpc, current_setting('transaction_read_only')='on' read_only")
    assert_rpc_permission(permission)
    STAGE = 'catalog'
    catalog = query('SELECT (' + catalog_sql() + ') catalog')['catalog']
    if {(t['s'], t['t']) for t in catalog} != set(RELATIONS):
        raise ValueError('SOURCE_RELATIONS_UNAVAILABLE')
    STAGE = 'source-single-statement'
    RPC_EXECUTION_STATUS = 'ATTEMPTED_UNCONFIRMED'
    source = query(oracle_sql(catalog))
    RPC_EXECUTION_STATUS = 'EXECUTED_READ_ONLY_ORACLE' if source.get('oracle') else 'NO_ORACLE_ROWS'
    if source.get('read_only') != 'on' or source['export']['catalog'] != catalog:
        raise ValueError('SOURCE_READ_ONLY_SNAPSHOT_UNVERIFIED')
    STAGE = 'archive-credential'
    master = sealed.keychain('archive', 'theanh-cloudflare-migration-archive')
    STAGE = 'seal-memory'
    archive = sealed.helper('seal', master, 'a', source['export'])
    sealed.helper('verify', master, 'a', archive)
    data = {'project': 'a', 'archive': archive, 'masterSecret': master, 'rpcOracle': source['oracle'],
            'compilerRoot': str(ROOT), 'schemas': [(ROOT / 'scripts' / name).read_text() for name in
            ['d1-course-access-source-prototype.sql', 'd1-lms-compatibility-prototype.sql', 'd1-lms-legacy-enrollment-owners-prototype.sql']]}
    STAGE = 'native-oracle-comparison'
    result = subprocess.run(['node', str(ROOT / 'scripts/probe-sealed-learning-access.mjs')], cwd=ROOT,
                            input=json.dumps(data), capture_output=True, text=True, timeout=240)
    if result.returncode:
        raise ValueError('LIVE_RPC_NATIVE_PARITY_UNAVAILABLE')
    report = json.loads(result.stdout)
    if report.get('sourceRpcExecuted') is not True or report.get('readyForCutover') is not False:
        raise ValueError('RPC_EXECUTION_RECEIPT_UNVERIFIED')
    report.update(sourceInputsAndOracleSameMvccStatement=True, sourceTransactionReadOnlyVerified=True,
                  sourceRelationsCaptured=len(catalog), sourceRpcOracleRows=len(source['oracle']),
                  sourceInputsPersisted=False, sourceRpcDefinitionReadback='reports/cloudflare-phase2-20261018/source-lms-rpc-contract.json')
    (ROOT / 'reports/cloudflare-phase2-20261018/live-lms-rpc-parity-a.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        receipt = {'status': 'BLOCKED_SOURCE_RPC_EXECUTE_PERMISSION' if isinstance(error, PermissionError) else 'LIVE_LMS_RPC_PARITY_UNAVAILABLE_PRIVATE_DETAILS_WITHHELD',
                          'stage': STAGE, 'errorType': type(error).__name__,
                          'httpStatus': error.code if hasattr(error, 'code') and isinstance(error.code, int) else None,
                          'sourceRpcExecuted': False if RPC_EXECUTION_STATUS == 'NOT_STARTED' else True if RPC_EXECUTION_STATUS == 'EXECUTED_READ_ONLY_ORACLE' else None,
                          'rpcExecutionStatus': RPC_EXECUTION_STATUS, 'permissionsChanged': False,
                          'productionWritten': False, 'readyForCutover': False}
        (ROOT / 'reports/cloudflare-phase2-20261018/live-lms-rpc-parity-a.json').write_text(json.dumps(receipt, indent=2) + '\n')
        print(json.dumps(receipt))
        sys.exit(2)
