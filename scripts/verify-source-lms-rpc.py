#!/usr/bin/env python3
"""Read current RPC definition/privileges; never execute it or print its body."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('sealed', ROOT / 'scripts/export-sealed-source-snapshot.py')
sealed = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(sealed)
TOKEN = re.compile(r"('(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|--[^\n]*(?:\n|$)|/\*[\s\S]*?\*/|\s+|[A-Za-z_][A-Za-z_0-9$]*|[0-9]+|->>|->|::|>=|<=|<>|!=|\|\||.)")


def sql_tokens(text):
    tokens = []
    offset = 0
    for match in TOKEN.finditer(text):
        if match.start() != offset:
            raise ValueError('unrecognized SQL token')
        offset = match.end()
        token = match.group()
        if token.isspace() or token.startswith('--') or token.startswith('/*'):
            continue
        tokens.append(token if token.startswith(("'", '"')) else token.lower())
    if offset != len(text):
        raise ValueError('unrecognized SQL token')
    return tokens


def compare_contract(row, expected):
    configs = row.get('config')
    empty_path = isinstance(configs, list) and len(configs) == 1 and configs[0] in ['search_path=', 'search_path=""']
    checks = {'bodyMatchesRepository': sql_tokens(row['body']) == sql_tokens(expected),
              'languageSql': row.get('language') == 'sql', 'stable': row.get('volatility') == 's',
              'securityInvoker': row.get('security_definer') is False,
              'parameterTypesMatch': row.get('argument_types') == 'uuid, text, text',
              'parameterNamesMatch': row.get('argument_names') == ['p_user_id', 'p_email', 'p_course_slug'],
              'returnsJsonb': row.get('result_type') == 'jsonb', 'emptySearchPath': empty_path,
              'anonDenied': row.get('anon_execute') is False,
              'authenticatedDenied': row.get('authenticated_execute') is False,
              'serviceRoleAllowed': row.get('service_execute') is True,
              'readOnlyTransactionVerified': row.get('transaction_read_only') == 'on'}
    return {'status': 'TESTED_SOURCE_LMS_RPC_CONTRACT' if all(checks.values()) else 'BLOCKED_SOURCE_RPC_CONTRACT_DRIFT',
            'sourceProject': 'vsxxgdzwtscuxcmjfckt',
            'function': 'public.student_lms_enrollments_scoped(uuid,text,text)',
            'checks': checks, 'repositoryDefinitionSha256': hashlib.sha256(json.dumps(sql_tokens(expected)).encode()).hexdigest(),
            'sourceRpcExecuted': False, 'customerRowsRead': 0, 'productionWritten': False, 'readyForCutover': False}


def main():
    path = ROOT / 'supabase/migrations/20260925180425_student_scoped_lms_reads.sql'
    body = re.search(r'as\s+\$\$([\s\S]*?)\$\$', path.read_text(), re.I)
    if not body:
        raise ValueError('repository function unavailable')
    token = sealed.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat')
    query = """SELECT p.prosrc body,p.provolatile volatility,p.prosecdef security_definer,l.lanname language,
      oidvectortypes(p.proargtypes) argument_types,p.proargnames argument_names,
      pg_get_function_result(p.oid) result_type,p.proconfig config,
      has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') service_execute,
      current_setting('transaction_read_only') transaction_read_only
      FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang
      WHERE p.oid='public.student_lms_enrollments_scoped(uuid,text,text)'::regprocedure"""
    request = urllib.request.Request('https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query',
        data=json.dumps({'query': query, 'read_only': True}).encode(), method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read(1024 * 1024 + 1)
    if len(raw) > 1024 * 1024:
        raise ValueError('response too large')
    rows = json.loads(raw)
    if not isinstance(rows, list) or len(rows) != 1:
        raise ValueError('function metadata unavailable')
    report = compare_contract(rows[0], body.group(1))
    (ROOT / 'reports/cloudflare-phase2-20261018/source-lms-rpc-contract.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
    return 0 if report['status'] == 'TESTED_SOURCE_LMS_RPC_CONTRACT' else 2


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception:
        print(json.dumps({'status': 'FAILED_SOURCE_CONTRACT_READ_PRIVATE_DETAILS_WITHHELD',
                          'productionWritten': False, 'readyForCutover': False}))
        sys.exit(2)
