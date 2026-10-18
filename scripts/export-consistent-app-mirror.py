#!/usr/bin/env python3
"""Read-only, single-statement application snapshot into the encrypted archive.

Auth, Storage bytes and secret columns require their separate migration paths.
No network response, customer row, token or database error is printed.
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
VOLUME = ROOT / '.private-backups/mounted'
PROJECTS = {'a': ('vsxxgdzwtscuxcmjfckt', ['public', 'crm_v2']), 'b': ('pppiqhkectojxbmhqcnx', ['public'])}
SECRET = re.compile(r'(password|secret|token|api_?key|private_?key|access_?key|service_?role|credential|refresh|otp)', re.I)
MAX_RESPONSE = 256 * 1024 * 1024
STAGE = 'arguments'


def identifier(name):
    if not isinstance(name, str) or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', name):
        raise ValueError('unsupported identifier')
    return '"' + name + '"'


def catalog_sql(project, include_auth_storage=False):
    scopes = PROJECTS[project][1] + (['auth', 'storage'] if include_auth_storage else [])
    schemas = ','.join("'" + s + "'" for s in scopes)
    return """SELECT coalesce(json_agg(x ORDER BY s,t),'[]'::json) FROM (
      SELECT c.table_schema s,c.table_name t,
       json_agg(json_build_object('n',c.column_name,'ty',c.data_type) ORDER BY c.ordinal_position) cols,
       coalesce((SELECT json_agg(a.attname ORDER BY key.ord)
        FROM pg_index i CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY key(attnum,ord)
        JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=key.attnum
        WHERE i.indrelid=(quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass
         AND i.indisprimary AND key.ord<=i.indnkeyatts),'[]'::json) pk
      FROM information_schema.columns c JOIN information_schema.tables b
       ON b.table_schema=c.table_schema AND b.table_name=c.table_name AND b.table_type='BASE TABLE'
      WHERE c.table_schema IN (%s) GROUP BY c.table_schema,c.table_name) x""" % schemas


def validate_catalog(catalog, project, include_auth_storage=False):
    if not isinstance(catalog, list) or not catalog:
        raise ValueError('empty catalog')
    names = set()
    for table in catalog:
        identifier(table['s']); identifier(table['t'])
        scopes = PROJECTS[project][1] + (['auth', 'storage'] if include_auth_storage else [])
        if table['s'] not in scopes or (table['s'], table['t']) in names:
            raise ValueError('catalog scope mismatch')
        names.add((table['s'], table['t']))
        cols = [c['n'] for c in table['cols']]
        if not cols or len(cols) != len(set(cols)) or not isinstance(table['pk'], list):
            raise ValueError('invalid columns')
        for col in table['cols']:
            identifier(col['n'])
            if not isinstance(col['ty'], str):
                raise ValueError('invalid type')
        if any(pk not in cols for pk in table['pk']):
            raise ValueError('invalid primary key')


def snapshot_sql(project, catalog, *, sealed_archive=False):
    validate_catalog(catalog, project, include_auth_storage=sealed_archive)
    parts = []
    for table in catalog:
        name = project + '_' + table['s'] + '__' + table['t']
        relation = identifier(table['s']) + '.' + identifier(table['t'])
        cells = ['NULL' if not sealed_archive and SECRET.search(c['n']) else identifier(c['n']) + '::text' for c in table['cols']]
        # PostgreSQL functions accept at most 100 arguments; wide tables are
        # represented as concatenated JSON arrays without losing column order.
        array = ' || '.join('jsonb_build_array(' + ','.join(cells[i:i + 50]) + ')' for i in range(0, len(cells), 50))
        parts.append("SELECT '%s' AS name,jsonb_build_object('count',(SELECT count(*) FROM %s),"
                     "'rows',(SELECT coalesce(jsonb_agg(%s),'[]'::jsonb) FROM %s)) AS payload"
                     % (name, relation, array, relation))
    # The catalog recheck, all counts, rows and snapshot ID are in ONE SELECT,
    # so concurrent edits cannot give one table a later MVCC snapshot.
    return "SELECT jsonb_build_object('snapshot',pg_current_snapshot()::text,'capturedAt',statement_timestamp()," \
           "'catalog',(%s),'tables',(SELECT jsonb_object_agg(name,payload) FROM (%s) tables)) AS export" \
           % (catalog_sql(project, include_auth_storage=sealed_archive), ' UNION ALL '.join(parts))


def affinity(ty):
    if ty in ['integer', 'bigint', 'smallint', 'boolean']:
        return 'INTEGER'
    if ty in ['real', 'double precision']:
        return 'REAL'
    return 'TEXT'


def convert(value, ty):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError('expected PostgreSQL text cell')
    if ty == 'boolean':
        if value not in ['true', 'false']:
            raise ValueError('invalid boolean')
        return int(value == 'true')
    if affinity(ty) == 'INTEGER':
        return int(value)
    if affinity(ty) == 'REAL':
        number = float(value)
        if not math.isfinite(number):
            raise ValueError('non-finite float requires separate migration')
        return number
    return value  # numeric, JSON, UUID, timestamps, arrays and bytea stay exact


def write_snapshot(project, catalog, payload, directory):
    if payload['catalog'] != catalog or set(payload['tables']) != {
            project + '_' + t['s'] + '__' + t['t'] for t in catalog}:
        raise ValueError('schema drift between discovery and snapshot')
    directory = Path(directory)
    directory.mkdir(mode=0o700, exist_ok=False)
    database = directory / 'copy.sqlite'
    fd = os.open(database, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    manifest = {'format': 'tam-consistent-app-mirror-v1', 'representationVersion': 'pg-text-v1',
                'sourceProject': PROJECTS[project][0], 'snapshotConsistency': 'single-postgresql-statement',
                'snapshotStartedAt': payload['capturedAt'], 'postgresSnapshot': payload['snapshot'],
                'readyForCutover': False, 'tables': {}, 'redactedColumns': {}}
    spec = importlib.util.spec_from_file_location('reconcile', Path(__file__).with_name('reconcile-d1-mirror.py'))
    reconcile = importlib.util.module_from_spec(spec); spec.loader.exec_module(reconcile)
    with sqlite3.connect(database) as db:
        for table in catalog:
            name = project + '_' + table['s'] + '__' + table['t']
            cols = table['cols']
            item = payload['tables'][name]
            if not isinstance(item['rows'], list) or len(item['rows']) != item['count']:
                raise ValueError('source count or response truncation mismatch')
            ddl = ','.join(identifier(c['n']) + ' ' + affinity(c['ty']) for c in cols)
            if table['pk']:
                ddl += ',PRIMARY KEY(' + ','.join(identifier(c) for c in table['pk']) + ')'
            db.execute('CREATE TABLE ' + identifier(name) + '(' + ddl + ')')
            redacted = [c['n'] for c in cols if SECRET.search(c['n'])]
            if redacted:
                manifest['redactedColumns'][name] = redacted
            for row in item['rows']:
                if not isinstance(row, list) or len(row) != len(cols):
                    raise ValueError('row shape mismatch')
                if any(row[i] is not None for i, c in enumerate(cols) if c['n'] in redacted):
                    raise ValueError('secret column was not redacted upstream')
                values = [convert(v, c['ty']) for v, c in zip(row, cols)]
                db.execute('INSERT INTO ' + identifier(name) + ' VALUES(' + ','.join('?' for _ in values) + ')', values)
            row = reconcile.read_table(db, name)
            manifest['tables'][name] = {'source': PROJECTS[project][0] + ':' + table['s'] + '.' + table['t'],
                                        'rows': len(row['rows']), 'primaryKey': table['pk'], 'digest': row['digest']}
    manifest['snapshotFinishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with (directory / 'manifest.json').open('x') as out:
        json.dump(manifest, out, indent=2)
    return manifest


def main():
    global STAGE
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True, choices=PROJECTS)
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()
    out = Path(args.output_dir).resolve()
    if not os.path.ismount(VOLUME) or VOLUME.resolve() not in out.parents:
        raise ValueError('encrypted archive mount required')
    # Existing owner-authorized credential; no creation, grants or role changes.
    key = subprocess.run(['/usr/bin/security', 'find-generic-password', '-w', '-s',
                          'com.theanhmarketing.cloudflare-migration.backup-secret.pat', '-a',
                          'theanh-cloudflare-migration-supabase-scoped-pat'], capture_output=True, text=True)
    if key.returncode or not key.stdout.strip():
        raise ValueError('credential unavailable')
    token = key.stdout.strip()

    def query(sql):
        request = urllib.request.Request('https://api.supabase.com/v1/projects/' + PROJECTS[args.project][0] + '/database/query',
            data=json.dumps({'query': sql, 'read_only': True}).encode(), method='POST',
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = response.read(MAX_RESPONSE + 1)
        if len(raw) > MAX_RESPONSE:
            raise ValueError('bounded export exceeded')
        return json.loads(raw)

    STAGE = 'catalog'
    catalog = query('SELECT (' + catalog_sql(args.project) + ') AS catalog')[0]['catalog']
    STAGE = 'snapshot'
    payload = query(snapshot_sql(args.project, catalog))[0]['export']
    STAGE = 'local-copy'
    manifest = write_snapshot(args.project, catalog, payload, out)
    print(json.dumps({'project': args.project, 'tables': len(manifest['tables']),
                      'rows': sum(t['rows'] for t in manifest['tables'].values()),
                      'redactedTables': len(manifest['redactedColumns']),
                      'snapshotConsistency': manifest['snapshotConsistency'], 'readyForCutover': False}))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'ok': False, 'code': 'CONSISTENT_EXPORT_FAILED_NO_RAW_DETAILS',
                          'stage': STAGE, 'type': type(error).__name__,
                          'httpStatus': getattr(error, 'code', None) if isinstance(getattr(error, 'code', None), int) else None}))
        sys.exit(2)
