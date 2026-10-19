"""Load Supabase A (or B) into a NATIVE D1 database with the generated schema.

Read-only on Supabase (Management API read_only queries, scoped PAT from
Keychain, same as copy-supabase-to-d1.py). Never prints rows or secrets.

  fetch  -> <work>/native-<p>.sqlite : generated DDL, all public/crm_v2 rows,
            native Auth (sealed bcrypt via the audited auth plan) and the
            Storage object index. Triggers are installed AFTER the rows, so no
            reminder runs are invented for historical orders.
  upload -> wrangler d1 execute --remote --file into --database
  verify -> per-table row counts source vs D1 -> reports/cloudflare-d1/native-load-<p>.json
  clean  -> delete <work> files (customer data)
"""
import argparse, datetime, hashlib, importlib.util, json, os, re, sqlite3, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT.parent / 'main'
spec = importlib.util.spec_from_file_location('copy_supabase', MAIN / 'scripts/copy-supabase-to-d1.py')
cs = importlib.util.module_from_spec(spec); spec.loader.exec_module(cs)
PROJECTS = {'a': ('vsxxgdzwtscuxcmjfckt', ['public', 'crm_v2']), 'b': ('pppiqhkectojxbmhqcnx', ['public'])}
# Ephemeral lease tokens are not copied (a lease never survives a cutover).
SKIP_COLUMNS = re.compile(r'(^|_)lease_token$')
PAGE = 500
AUTH_SQL = ['d1-course-access-source-prototype.sql', 'd1-auth-core-prototype.sql', 'd1-auth-email-tokens.sql', 'd1-auth-refresh-family.sql', 'd1-auth-provider-identities-prototype.sql']

def encode(v):
    if isinstance(v, bool): return int(v)
    if isinstance(v, (dict, list)): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    return v

def fetch(args, pat):
    key = args.project; ref, schemas = PROJECTS[key]
    work = Path(args.work); work.mkdir(parents=True, exist_ok=True); os.chmod(work, 0o700)
    path = work / f'native-{key}.sqlite'
    if path.exists(): path.unlink()
    db = sqlite3.connect(path)
    db.executescript((ROOT / f'scripts/generated/d1-native-{key}.sql').read_text())
    schema = json.loads((ROOT / f'lib/cloudflare/generated/supabase-schema-{key}.json').read_text())['tables']
    manifest = {'project': ref, 'snapshotStartedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'tables': {}}
    db.execute('PRAGMA foreign_keys=OFF')
    for name, meta in sorted(schema.items()):
        s, t = name.split('.'); target = f'{key}_{s}__{t}'
        cols = [c for c in meta['cols'] if not SKIP_COLUMNS.search(c)]
        order = ', '.join(f'"{p}"' for p in meta['pk']) if meta['pk'] else 'ctid'
        count, offset = 0, 0
        while True:
            rows = cs.query(ref, f'SELECT coalesce(json_agg(row_to_json(t)),\'[]\'::json) r FROM (SELECT * FROM "{cs.ident(s)}"."{cs.ident(t)}" ORDER BY {order} LIMIT {PAGE} OFFSET {offset}) t', pat)[0]['r']
            for row in rows:
                db.execute(f'INSERT INTO "{target}" ({",".join(chr(34)+c+chr(34) for c in cols)}) VALUES ({",".join("?"*len(cols))})', [encode(row.get(c)) for c in cols])
            count += len(rows); offset += PAGE
            if len(rows) < PAGE: break
        manifest['tables'][target] = count
        print(f'fetched {target}: {count}', flush=True)
    # Native Auth (UUIDs, sealed hashes, metadata, admin roles) into d1_* tables.
    for f in AUTH_SQL: db.executescript((ROOT / 'scripts' / f).read_text())
    cred = cs.keychain('native-a-credential', 'theanh-main-cf-staging-credential')
    users = cs.query(ref, """SELECT coalesce(json_agg(json_build_object('id',id,'email',email,'encryptedPassword',nullif(encrypted_password,''),
      'emailConfirmedAt',email_confirmed_at,'bannedUntil',banned_until,'deletedAt',deleted_at,'isAnonymous',coalesce(is_anonymous,false),
      'userMetadata',raw_user_meta_data,'appMetadata',raw_app_meta_data,'createdAt',created_at,'updatedAt',updated_at) ORDER BY id),'[]'::json) r FROM auth.users""", pat)[0]['r']
    with_email = [u for u in users if (u.get('email') or '').strip()]
    proc = subprocess.run(['node', str(MAIN / 'scripts/copy-supabase-auth-plan.mjs')], cwd=MAIN, capture_output=True, text=True,
                          input=json.dumps({'projectId': ref, 'credentialKey': cred, 'adminRoles': key == 'a', 'users': with_email}))
    if proc.returncode != 0: raise SystemExit('Auth import plan failed')
    plan = json.loads(proc.stdout)
    for stmt in plan['statements']: db.execute(re.sub(r'\?(\d+)', '?', stmt['sql']), stmt['params'])
    for t in ('d1_access_users', 'd1_auth_accounts'): manifest['tables'][t] = db.execute(f'SELECT count(*) FROM {t}').fetchone()[0]
    manifest['auth'] = {**plan['summary'], 'sourceUsers': len(users), 'skippedWithoutEmail': len(users) - len(with_email)}
    # Storage index: same opaque keys as the R2 mirror (supabase-a/sha256(bucket\0name)).
    db.executescript((ROOT / 'scripts/d1-native-storage.sql').read_text())
    buckets = cs.query(ref, "SELECT coalesce(json_agg(json_build_object('id',id,'public',public,'limit',file_size_limit,'mimes',allowed_mime_types,'created_at',created_at)),'[]'::json) r FROM storage.buckets", pat)[0]['r']
    for b in buckets: db.execute('INSERT INTO d1_storage_buckets VALUES(?,?,?,?,?)', [b['id'], int(bool(b['public'])), b['limit'], json.dumps(b['mimes']) if b['mimes'] else None, b['created_at']])
    objects = cs.query(ref, "SELECT coalesce(json_agg(json_build_object('b',bucket_id,'n',name,'size',coalesce((metadata->>'size')::bigint,0),'type',metadata->>'mimetype','c',created_at,'u',updated_at)),'[]'::json) r FROM storage.objects", pat)[0]['r']
    prefix = 'supabase-a' if key == 'a' else 'supabase-b'
    for o in objects:
        rk = prefix + '/' + hashlib.sha256(f"{o['b']}\0{o['n']}".encode()).hexdigest()
        db.execute('INSERT INTO d1_storage_objects VALUES(?,?,?,?,?,?,?)', [o['b'], o['n'], rk, o['size'], o['type'], o['c'], o['u'] or o['c']])
    manifest['tables']['d1_storage_buckets'] = len(buckets); manifest['tables']['d1_storage_objects'] = len(objects)
    if key == 'b': db.executescript((ROOT / 'scripts/d1-native-b-sso.sql').read_text())
    trig = ROOT / f'scripts/d1-native-triggers-{key}.sql'
    if trig.exists(): db.executescript(trig.read_text())
    db.execute('PRAGMA foreign_keys=ON')
    fk = db.execute('PRAGMA foreign_key_check').fetchall()
    manifest['foreignKeyViolations'] = len(fk)
    manifest['snapshotFinishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    db.commit(); db.close()
    (work / f'native-{key}-manifest.json').write_text(json.dumps(manifest, indent=2))
    print(json.dumps({'tables': len(manifest['tables']), 'rows': sum(manifest['tables'].values()), 'fkViolations': len(fk), 'auth': manifest['auth']['users'] if 'users' in manifest['auth'] else None}))

def dump(args):
    work = Path(args.work); db = sqlite3.connect(work / f'native-{args.project}.sqlite'); out = work / f'native-{args.project}.sql'
    with out.open('w') as f:
        f.write('PRAGMA defer_foreign_keys = on;\n')
        objs = db.execute("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name").fetchall()
        # Tables, then indexes (FK parent keys need their UNIQUE index), then rows; triggers last.
        for typ, name, sql in objs:
            if typ == 'table': f.write(sql + ';\n')
        for typ, name, sql in objs:
            if typ == 'index': f.write(sql + ';\n')
        # D1 applies a file in chunks: insert parents before children (FK order).
        names = [n for t, n, _ in objs if t == 'table']
        deps = {n: {r[2] for r in db.execute(f'PRAGMA foreign_key_list("{n}")') if r[2] != n} for n in names}
        ordered, done = [], set()
        while len(ordered) < len(names):
            ready = [n for n in names if n not in done and deps[n] <= done]
            if not ready: raise SystemExit('Foreign key cycle between tables')
            for n in ready: ordered.append(n); done.add(n)
        for name in ordered:
            typ = 'table'
            cols = [r[1] for r in db.execute(f'PRAGMA table_info("{name}")')]
            # Self-references: parents (NULL parent) first.
            self_fk = [r[3] for r in db.execute(f'PRAGMA foreign_key_list("{name}")') if r[2] == name]
            order = ' ORDER BY ' + ', '.join(f'"{c}" IS NOT NULL' for c in self_fk) if self_fk else ''
            for row in db.execute(f'SELECT * FROM "{name}"{order}'):
                stmt = f'INSERT INTO "{name}" ({",".join(chr(34)+c+chr(34) for c in cols)}) VALUES ({",".join(cs.literal(v) for v in row)});'
                if len(stmt.encode()) <= cs.LIMIT:
                    f.write(stmt + '\n'); continue
                # Oversized row: write it with large text columns empty, then append chunks by primary key.
                pk = [r[1] for r in sorted(db.execute(f'PRAGMA table_info("{name}")'), key=lambda r: r[5]) if r[5] > 0]
                if not pk: raise SystemExit(f'Oversized row without primary key in {name}')
                where = ' AND '.join(f'"{c}"={cs.literal(row[cols.index(c)])}' for c in pk)
                big = {i for i, v in enumerate(row) if isinstance(v, str) and len(v.encode()) > 20000 and cols[i] not in pk}
                first = [("''" if i in big else cs.literal(v)) for i, v in enumerate(row)]
                f.write(f'INSERT INTO "{name}" ({",".join(chr(34)+c+chr(34) for c in cols)}) VALUES ({",".join(first)});\n')
                for i in big:
                    text = row[i]
                    for start in range(0, len(text), 15000):
                        f.write(f'UPDATE "{name}" SET "{cols[i]}"="{cols[i]}"||{cs.literal(text[start:start+15000])} WHERE {where};\n')
        for typ, name, sql in objs:
            if typ == 'trigger': f.write(sql + ';\n')
    return out

def upload(args):
    path = dump(args)
    print('sql sha256', hashlib.sha256(path.read_bytes()).hexdigest(), flush=True)
    r = subprocess.run([str(MAIN / 'node_modules/.bin/wrangler'), 'd1', 'execute', args.database, '--remote', '--yes', '--file', str(path)], cwd=MAIN, capture_output=True, text=True)
    if r.returncode != 0: raise SystemExit('Upload failed: ' + (r.stderr or r.stdout)[-500:])
    print('uploaded', flush=True)

def verify(args):
    manifest = json.loads((Path(args.work) / f'native-{args.project}-manifest.json').read_text())
    tables = list(manifest['tables']); actual = {}
    for i in range(0, len(tables), 4):
        q = ' UNION ALL '.join(f"SELECT '{t}' t, count(*) n FROM \"{t}\"" for t in tables[i:i + 4])
        r = subprocess.run([str(MAIN / 'node_modules/.bin/wrangler'), 'd1', 'execute', args.database, '--remote', '--json', '--command', q], cwd=MAIN, capture_output=True, text=True)
        if r.returncode != 0: raise SystemExit('Verify query failed')
        actual.update({row['t']: row['n'] for row in json.loads(r.stdout)[0]['results']})
    mismatch = {t: (n, actual.get(t)) for t, n in manifest['tables'].items() if actual.get(t) != n}
    receipt = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'database': args.database, 'project': manifest['project'],
               'status': 'PASS' if not mismatch and manifest['foreignKeyViolations'] == 0 else 'MISMATCH', 'tables': len(tables), 'rows': sum(manifest['tables'].values()),
               'mismatch': mismatch, 'foreignKeyViolations': manifest['foreignKeyViolations'], 'auth': manifest['auth'],
               'snapshot': [manifest['snapshotStartedAt'], manifest['snapshotFinishedAt']],
               'limits': 'Point-in-time copy (pages are separate reads); lease tokens and sessions not copied; Storage bytes live in R2 (index only here).'}
    (ROOT / f'reports/cloudflare-d1/native-load-{args.project}.json').write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({k: receipt[k] for k in ('status', 'tables', 'rows', 'mismatch', 'foreignKeyViolations')}))
    if receipt['status'] != 'PASS': sys.exit(1)

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('stage', choices=['fetch', 'upload', 'verify', 'clean'])
    p.add_argument('--project', choices=['a', 'b'], default='a')
    p.add_argument('--work', required=True)
    p.add_argument('--database')
    a = p.parse_args()
    if a.stage == 'fetch': fetch(a, cs.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat'))
    elif a.stage in ('upload', 'verify'):
        if not a.database: raise SystemExit('--database required')
        upload(a) if a.stage == 'upload' else verify(a)
    else:
        for f in Path(a.work).glob(f'native-{a.project}*'): f.unlink()
        print('cleaned')
