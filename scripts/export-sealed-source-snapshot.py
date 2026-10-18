#!/usr/bin/env python3
"""Local sealed archive: complete app/Auth/Storage metadata, no provider writes.

Source values exist only in captured process memory. SQLite contains per-row
AES-GCM envelopes; decrypted values are never written or printed. Existing
encrypted archive Keychain secret stays local, never sent to Supabase/Workers.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import urllib.request

SPEC = importlib.util.spec_from_file_location('app_export', Path(__file__).with_name('export-consistent-app-mirror.py'))
app = importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(app)
STAGE = 'arguments'


def keychain(suffix, account):
    result = subprocess.run(['/usr/bin/security', 'find-generic-password', '-w', '-s',
        'com.theanhmarketing.cloudflare-migration.backup-secret.' + suffix, '-a', account], capture_output=True, text=True)
    if result.returncode or not result.stdout.strip():
        raise ValueError('archive credential unavailable')
    return result.stdout.rstrip('\r\n')


def helper(operation, master, project, value):
    node = shutil.which('node')
    if not node:
        raise ValueError('local Node runtime unavailable')
    data = {'operation': operation, 'masterSecret': master, 'project': project,
            'payload' if operation == 'seal' else 'archive': value}
    result = subprocess.run([node, str(Path(__file__).with_name('sealed-source-snapshot.mjs'))],
                            input=json.dumps(data), capture_output=True, text=True, timeout=180)
    if result.returncode:
        raise ValueError('local authenticated encryption unavailable')
    return json.loads(result.stdout)


def persist_archive(directory, archive):
    # Exclusively create a fresh location. On failure, keep the incomplete file
    # for inspection inside the encrypted image; never overwrite old backups.
    directory = Path(directory)
    directory.mkdir(mode=0o700, exist_ok=False)
    path = directory / 'sealed.sqlite'
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    with sqlite3.connect(path) as db:
        db.executescript('''CREATE TABLE snapshot_manifest(id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL, mac TEXT NOT NULL);
          CREATE TABLE sealed_rows(table_name TEXT NOT NULL,row_id TEXT NOT NULL,value_mac TEXT NOT NULL,envelope TEXT NOT NULL,
            PRIMARY KEY(table_name,row_id));''')
        db.execute('INSERT INTO snapshot_manifest VALUES(1,?,?)',
                   (json.dumps(archive['manifest'], separators=(',', ':')), archive['manifestMac']))
        db.executemany('INSERT INTO sealed_rows VALUES(?,?,?,?)',
                       [(r['table'], r['rowId'], r['valueMac'], r['envelope']) for r in archive['records']])
    return path


def read_archive(path):
    db = sqlite3.connect(Path(path).resolve(strict=True).as_uri() + '?mode=ro', uri=True)
    try:
        db.execute('PRAGMA query_only=ON')
        db.execute('BEGIN')
        doc, mac = db.execute('SELECT document,mac FROM snapshot_manifest WHERE id=1').fetchone()
        rows = db.execute('SELECT table_name,row_id,value_mac,envelope FROM sealed_rows ORDER BY table_name,row_id').fetchall()
        return {'manifest': json.loads(doc), 'manifestMac': mac,
                'records': [dict(zip(['table', 'rowId', 'valueMac', 'envelope'], row)) for row in rows]}
    finally:
        db.close()


def main():
    global STAGE
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['export', 'verify'])
    parser.add_argument('--project', required=True, choices=app.PROJECTS)
    parser.add_argument('--directory', required=True)
    args = parser.parse_args()
    directory = Path(args.directory).resolve()
    if not os.path.ismount(app.VOLUME) or app.VOLUME.resolve() not in directory.parents:
        raise ValueError('existing encrypted image must be mounted')
    STAGE = 'archive-key'
    master = keychain('archive', 'theanh-cloudflare-migration-archive')
    if args.command == 'export':
        STAGE = 'source-access'
        token = keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat')

        def query(sql):
            request = urllib.request.Request('https://api.supabase.com/v1/projects/' + app.PROJECTS[args.project][0] + '/database/query',
                data=json.dumps({'query': sql, 'read_only': True}).encode(), method='POST',
                headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=90) as response:
                raw = response.read(app.MAX_RESPONSE + 1)
            if len(raw) > app.MAX_RESPONSE:
                raise ValueError('bounded source snapshot exceeded')
            return json.loads(raw)

        STAGE = 'catalog'
        catalog = query('SELECT (' + app.catalog_sql(args.project, include_auth_storage=True) + ') AS catalog')[0]['catalog']
        STAGE = 'snapshot'
        payload = query(app.snapshot_sql(args.project, catalog, sealed_archive=True))[0]['export']
        if payload['catalog'] != catalog:
            raise ValueError('source schema changed during discovery')
        STAGE = 'seal'
        archive = helper('seal', master, args.project, payload)
        del payload
        STAGE = 'memory-verification'
        helper('verify', master, args.project, archive)
        STAGE = 'persist'
        persist_archive(directory, archive)
        del archive
    STAGE = 'disk-verification'
    stored = read_archive(directory / 'sealed.sqlite')
    result = helper('verify', master, args.project, stored)
    manifest = stored['manifest']
    result.update({'snapshotAt': manifest['header']['capturedAt'], 'encryptedAtRowLevel': True,
                   'restoredFromDiskVerified': True, 'storageObjectBytesIncluded': False,
                   'productionWritten': False, 'remoteD1Written': False,
                   'tablesWithoutStablePrimaryKey': sum(not t['stablePrimaryKey'] for t in manifest['tables'])})
    # A small non-PII receipt only; raw manifest/records remain in the image.
    with (directory / 'verification-summary.json').open('w') as output:
        json.dump(result, output, indent=2)
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'ok': False, 'code': 'SEALED_SOURCE_SNAPSHOT_FAILED', 'stage': STAGE,
            'type': type(error).__name__, 'httpStatus': getattr(error, 'code', None) if isinstance(getattr(error, 'code', None), int) else None}))
        sys.exit(2)
