#!/usr/bin/env python3
"""Read-only Source metadata + encrypted local bytes + private R2 readback.

Never upload/delete, change index, obtain a service-role key, or print names.
Only existing scoped PAT/CLI authentication and encrypted backup image are used.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
PARENT = ROOT.parent
MOUNT = PARENT / '.private-backups/mounted'
BUCKET = 'theanh-main-assets-staging'
PROJECT = 'vsxxgdzwtscuxcmjfckt'
WRANGLER = ROOT / 'node_modules/.bin/wrangler'


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec); spec.loader.exec_module(loaded)
    return loaded


def cli(*args):
    # Exact allowlist: this audit must never reuse a mirror's upload branch.
    if not (args[:3] == ('r2', 'object', 'get') or args[:3] == ('r2', 'bucket', 'info') or
            args[:4] in [('r2', 'bucket', 'dev-url', 'get'), ('r2', 'bucket', 'domain', 'list')]):
        raise ValueError('READ_ONLY_R2_OPERATION_REQUIRED')
    result = subprocess.run([str(WRANGLER), *args], cwd=ROOT, capture_output=True,
                            env={**os.environ, 'WRANGLER_SEND_METRICS': 'false'}, timeout=180)
    if result.returncode:
        raise ValueError('R2_READ_UNAVAILABLE')
    return result.stdout


def private_bucket():
    info = cli('r2', 'bucket', 'info', BUCKET).decode()
    if not re.search(r'^name:\s+' + re.escape(BUCKET) + r'\s*$', info, re.M):
        raise ValueError('R2_BUCKET_UNVERIFIED')
    if 'Public access via the r2.dev URL is disabled.' not in cli('r2', 'bucket', 'dev-url', 'get', BUCKET).decode():
        raise ValueError('R2_PUBLIC_ACCESS_UNVERIFIED')
    if 'There are no custom domains connected' not in cli('r2', 'bucket', 'domain', 'list', BUCKET).decode():
        raise ValueError('R2_DOMAIN_ACCESS_UNVERIFIED')


def remote_bytes(record, directory, runner=cli):
    if not re.fullmatch(r'[a-f0-9]{64}', record.get('file', '')) or not re.fullmatch(r'[a-f0-9]{64}', record.get('sha256', '')) or type(record.get('bytes')) is not int or record['bytes'] < 0:
        raise ValueError('PRIVATE_STORAGE_RECORD_UNAVAILABLE')
    descriptor, name = tempfile.mkstemp(prefix='.phase2-r2-audit-', dir=directory)
    os.close(descriptor)
    path = Path(name)
    try:
        runner('r2', 'object', 'get', BUCKET + '/supabase-a/' + record['file'], '--remote', '--file', str(path))
        digest, size = hashlib.sha256(), 0
        with path.open('rb') as stream:
            while chunk := stream.read(1024 * 1024):
                size += len(chunk)
                if size > record['bytes']:
                    raise ValueError('R2_BYTES_MISMATCH')
                digest.update(chunk)
        if size != record['bytes'] or digest.hexdigest() != record['sha256']:
            raise ValueError('R2_BYTES_MISMATCH')
        return size
    finally:
        path.unlink(missing_ok=True)  # Only this audit's exclusive temp file.


def read_metadata():
    sealed = module('sealed_storage_audit', ROOT / 'scripts/export-sealed-source-snapshot.py')
    token = sealed.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat')
    query = """SELECT bucket_id,name,id::text object_id,updated_at::text updated_at,
      (metadata->>'size')::bigint bytes FROM storage.objects ORDER BY bucket_id,name"""
    request = urllib.request.Request('https://api.supabase.com/v1/projects/' + PROJECT + '/database/query',
        data=json.dumps({'query': query, 'read_only': True}).encode(), method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read(8 * 1024 * 1024 + 1)
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError('SOURCE_STORAGE_METADATA_UNAVAILABLE')
    rows = json.loads(raw)
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise ValueError('SOURCE_STORAGE_METADATA_UNAVAILABLE')
    return rows


def verify_index(records):
    index_raw = cli('r2', 'object', 'get', BUCKET + '/supabase-a/current-index.json', '--remote', '--pipe')
    if len(index_raw) > 1024 * 1024:
        raise ValueError('R2_INDEX_UNAVAILABLE')
    index = json.loads(index_raw)
    keys = ['supabase-a/' + record['file'] for record in records]
    if index.get('version') != 1 or not isinstance(index.get('keys'), list) or len(index['keys']) != len(set(index['keys'])) or sorted(index['keys']) != sorted(keys):
        raise ValueError('R2_INDEX_UNAVAILABLE')


def main():
    if sys.argv[1:] not in [[], ['--recheck-index']]:
        raise ValueError('INVALID_READ_ONLY_AUDIT_MODE')
    recheck = sys.argv[1:] == ['--recheck-index']
    report_path = ROOT / 'reports/cloudflare-phase2-20261018/private-storage-a-readback.json'
    prior = json.loads(report_path.read_text()) if recheck else None
    if recheck and (prior.get('status') != 'TESTED_PRIVATE_R2_BYTES_AND_INDEX' or prior.get('readyForCutover') is not False or
                    not 0 <= (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(prior['completedAt'])).total_seconds() < 3600):
        raise ValueError('RECENT_BYTE_READBACK_REQUIRED')
    volume = module('volume_storage_audit', PARENT / 'scripts/backup-volume.py')
    verify = module('verify_storage_audit', PARENT / 'scripts/verify-storage-backup.py')
    if os.path.ismount(MOUNT):
        raise ValueError('EXCLUSIVE_BACKUP_MOUNT_REQUIRED')
    rows = read_metadata()
    checked_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    volume.run_hdiutil(['attach', '-stdinpass', '-nobrowse', '-mountpoint', str(MOUNT), '-quiet', str(volume.IMAGE)], with_password=True)
    try:
        if not os.path.ismount(MOUNT):
            raise ValueError('ENCRYPTED_MOUNT_REQUIRED')
        directory = MOUNT / 'storage/A'
        count, total = verify.verify(rows, directory)
        private_bucket()
        records = [json.loads(line) for line in (directory / 'current-index.jsonl').read_text().splitlines()]
        if len(records) != count:
            raise ValueError('STORAGE_INDEX_UNAVAILABLE')
        verify_index(records)
        if recheck:
            if prior.get('sourceObjects') != count or prior.get('r2HashVerifiedObjects') != count or prior.get('bytesVerified') != total:
                raise ValueError('BYTE_READBACK_SCOPE_CHANGED')
            prior.update(r2ConfigAndIndexRecheckedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                         sourceMetadataRecheckedAt=checked_at, r2ChecksRepeatedAfterByteReadback=True)
            report_path.write_text(json.dumps(prior, indent=2) + '\n')
            print(json.dumps(prior))
            return
        done, bytes_read = 0, 0
        with ThreadPoolExecutor(max_workers=3) as pool:
            pending = [pool.submit(remote_bytes, record, directory) for record in records]
            try:
                for result in as_completed(pending):
                    bytes_read += result.result(); done += 1
                    if done % 50 == 0:
                        print(json.dumps({'progress': 'PRIVATE_R2_READBACK', 'objectsVerified': done, 'objectsTotal': count}), flush=True)
            except Exception:
                for future in pending:
                    future.cancel()
                raise
        if done != count or bytes_read != total:
            raise ValueError('R2_READBACK_INCOMPLETE')
        # Source can keep writing during a long audit. Verify current identities,
        # versions and sizes again; do not label changed data as current.
        after = read_metadata()
        if rows != after:
            raise ValueError('SOURCE_STORAGE_CHANGED_DURING_AUDIT')
        private_bucket()
        verify_index(records)
        report = {'status': 'TESTED_PRIVATE_R2_BYTES_AND_INDEX', 'sourceMetadataCheckedAt': checked_at,
                  'completedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'sourceObjects': count, 'localHashVerifiedObjects': count, 'r2HashVerifiedObjects': done,
                  'bytesVerified': total, 'currentIndexMatched': True, 'r2DevDisabled': True,
                  'customDomainsAbsent': True, 'sourceMetadataUnchangedDuringAudit': True,
                  'r2ChecksRepeatedAfterByteReadback': True,
                  'sourceFileBytesFetchedThisRun': False, 'studentAuthorizationVerifiedThisRun': False,
                  'productionWritten': False, 'remoteR2Written': False, 'readyForCutover': False}
        report_path.write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
    finally:
        volume.run_hdiutil(['detach', '-quiet', str(MOUNT)])


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print(json.dumps({'status': 'PRIVATE_STORAGE_AUDIT_UNAVAILABLE_PRIVATE_DETAILS_WITHHELD',
                          'productionWritten': False, 'remoteR2Written': False, 'readyForCutover': False}))
        sys.exit(2)
