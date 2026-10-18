#!/usr/bin/env python3
"""Offline verified archive probes. No source contact or remote writes.

Secrets enter child stdin only. Child output is captured; failed output and
exceptions are never forwarded. Only aggregate receipts are printed.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location('sealed_archive', ROOT / 'scripts/export-sealed-source-snapshot.py')
sealed = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(sealed)
B_SOURCE = Path('/Users/theanh/CodexProjects/TheAnh-Web/worktrees/b-cf-production-20261017')
SAFE_FAILURES = {'LEARNING_SOURCE_SCHEMA_UNAVAILABLE', 'LEARNING_TARGET_REJECTED',
                 'LEARNING_TARGET_READBACK_MISMATCH', 'LEARNING_PERMISSION_PARITY_MISMATCH',
                 'LEARNING_ENROLLMENT_PARITY_MISMATCH', 'LEARNING_CROSS_SUBJECT_ACCEPTED',
                 'B_AUTHORIZATION_SNAPSHOT_STALE', 'B_AUTHORIZATION_PROJECTION_REJECTED',
                 'B_AUTHORIZATION_PROFILE_MISMATCH', 'B_AUTHORIZATION_MEMBERSHIP_MISMATCH',
                 'B_AUTHORIZATION_CROSS_WORKSPACE_ACCEPTED'}


class ProbeFailure(Exception):
    def __init__(self, code):
        self.safe_code = code


def archive(directory):
    directory = Path(directory).resolve(strict=True)
    if not os.path.ismount(sealed.app.VOLUME) or sealed.app.VOLUME.resolve() not in directory.parents:
        raise ValueError('mounted archive required')
    return sealed.read_archive(directory / 'sealed.sqlite')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['auth', 'legacy-sessions', 'b-authorization', 'orders', 'courses', 'learning-access', 'compare'])
    parser.add_argument('--project', required=True, choices=['a', 'b'])
    parser.add_argument('--directory', required=True)
    parser.add_argument('--before-directory')
    parser.add_argument('--qa-file', help='Existing private QA credential file; never passed as a command argument to Node')
    args = parser.parse_args()
    if (args.operation == 'b-authorization' and args.project != 'b') or (args.operation in ['orders', 'courses', 'learning-access'] and args.project != 'a') or (args.qa_file and args.operation != 'auth'):
        raise ValueError('operation scope mismatch')
    data = {'project': args.project, 'archive': archive(args.directory),
            'masterSecret': sealed.keychain('archive', 'theanh-cloudflare-migration-archive'),
            'compilerRoot': str(ROOT.parent / 'main')}
    if args.operation in ['auth', 'legacy-sessions']:
        data['credentialKey'] = sealed.keychain('native-a-credential', 'theanh-main-cf-staging-credential')
    if args.operation == 'auth':
        script = 'probe-sealed-auth-native.mjs'
        data['schemas'] = {'access': (ROOT / 'scripts/d1-course-access-source-prototype.sql').read_text(),
                           'auth': (ROOT / 'scripts/d1-auth-core-prototype.sql').read_text(),
                           'identities': (ROOT / 'scripts/d1-auth-provider-identities-prototype.sql').read_text()}
        if args.qa_file:
            qa = json.loads(Path(args.qa_file).read_text())
            data['qa'] = {'email': qa['email'], 'password': qa['password']}
    elif args.operation == 'legacy-sessions':
        script = 'probe-sealed-legacy-sessions.mjs'
        data['schema'] = (ROOT / 'scripts/d1-auth-legacy-snapshot.sql').read_text()
    elif args.operation == 'b-authorization':
        script = 'probe-sealed-b-authorization.mjs'
        data['bSourceRoot'] = str(B_SOURCE)
        data['schema'] = (B_SOURCE / 'scripts/d1-b-profile-workspace-prototype.sql').read_text()
    elif args.operation == 'orders':
        script = 'probe-sealed-orders.mjs'
        data['schema'] = (ROOT / 'scripts/d1-native-order-settlement.sql').read_text()
    elif args.operation == 'courses':
        script = 'probe-sealed-courses.mjs'
        data['schema'] = (ROOT / 'scripts/d1-course-content-prototype.sql').read_text()
    elif args.operation == 'learning-access':
        script = 'probe-sealed-learning-access.mjs'
        data['schemas'] = [(ROOT / 'scripts' / name).read_text() for name in
                           ['d1-course-access-source-prototype.sql', 'd1-lms-compatibility-prototype.sql',
                            'd1-lms-legacy-enrollment-owners-prototype.sql']]
    else:
        if not args.before_directory:
            raise ValueError('baseline required')
        script = 'sealed-source-snapshot.mjs'
        data.update(operation='compare', before=archive(args.before_directory), after=data.pop('archive'))
    result = subprocess.run(['node', str(ROOT / 'scripts' / script)], cwd=ROOT,
                            input=json.dumps(data), capture_output=True, text=True, timeout=240)
    if result.returncode:
        reason = result.stderr.strip()
        raise ProbeFailure(reason if reason in SAFE_FAILURES else 'OFFLINE_PROBE_UNAVAILABLE_PRIVATE_DETAILS_WITHHELD')
    report = json.loads(result.stdout)
    if report.get('readyForCutover') is not False:
        raise ValueError('unexpected authority assertion')
    print(json.dumps(report))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'status': 'FAILED', 'reason': error.safe_code if isinstance(error, ProbeFailure) else 'OFFLINE_PROBE_UNAVAILABLE_PRIVATE_DETAILS_WITHHELD',
                          'productionWritten': False, 'readyForCutover': False}))
        sys.exit(2)
