"""Cutover delta: copy rows written to Supabase after --since into the native D1.

Read-only on Supabase. Rows with created_at/updated_at >= --since are upserted
into D1 (INSERT ... ON CONFLICT(pk) DO UPDATE) with the loader's encoding.
New Auth users since --since are reported (they sign in again via signup/reset
or are copied with the next full auth fetch). DRY RUN unless --apply.
"""
import argparse, datetime, importlib.util, json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT.parent / 'main'
spec = importlib.util.spec_from_file_location('copy_supabase', MAIN / 'scripts/copy-supabase-to-d1.py')
cs = importlib.util.module_from_spec(spec); spec.loader.exec_module(cs)
PROJECTS = {'a': 'vsxxgdzwtscuxcmjfckt', 'b': 'pppiqhkectojxbmhqcnx'}

def encode(v):
    if isinstance(v, bool): return int(v)
    if isinstance(v, (dict, list)): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    return v

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--project', choices=['a', 'b'], required=True)
    p.add_argument('--database', required=True)
    p.add_argument('--since', required=True)
    p.add_argument('--apply', action='store_true')
    a = p.parse_args()
    since = datetime.datetime.fromisoformat(a.since.replace('Z', '+00:00')).astimezone(datetime.timezone.utc).isoformat()
    ref = PROJECTS[a.project]; pat = cs.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat')
    schema = json.loads((ROOT / f'lib/cloudflare/generated/supabase-schema-{a.project}.json').read_text())['tables']
    stmts, report = [], {}
    for name, meta in sorted(schema.items()):
        cols = [c for c in meta['cols'] if not c.endswith('lease_token')]
        stamps = [c for c in ('created_at', 'updated_at') if c in meta['cols']]
        if not stamps or not meta['pk']: continue
        s, t = name.split('.')
        # Non-timestamptz stamps (e.g. courses.updated_at is text): copy the whole (small) table.
        where = 'true' if any(meta['cols'][c][0] != 'timestamptz' for c in stamps) else ' OR '.join(f'"{c}">=\'{since}\'::timestamptz' for c in stamps)
        try: rows = cs.query(ref, f'SELECT coalesce(json_agg(row_to_json(x)),\'[]\'::json) r FROM (SELECT * FROM "{s}"."{t}" WHERE {where}) x', pat)[0]['r']
        except SystemExit as e: raise SystemExit(f'{name}: {e}')
        if not rows: continue
        report[name] = len(rows)
        updates = ','.join(f'"{c}"=excluded."{c}"' for c in cols if c not in meta['pk'])
        for row in rows:
            vals = ','.join(cs.literal(encode(row.get(c))) for c in cols)
            stmts.append(f'INSERT INTO "{a.project}_{s}__{t}" ({",".join(chr(34)+c+chr(34) for c in cols)}) VALUES ({vals}) ON CONFLICT ({",".join(chr(34)+c+chr(34) for c in meta["pk"])}) DO UPDATE SET {updates};')
    # New/changed Auth users: same audited plan as the full load (sealed bcrypt).
    plist = cs.query(ref, f"""SELECT coalesce(json_agg(json_build_object('id',id,'email',email,'encryptedPassword',nullif(encrypted_password,''),
      'emailConfirmedAt',email_confirmed_at,'bannedUntil',banned_until,'deletedAt',deleted_at,'isAnonymous',coalesce(is_anonymous,false),
      'userMetadata',raw_user_meta_data,'appMetadata',raw_app_meta_data,'createdAt',created_at,'updatedAt',updated_at) ORDER BY id),'[]'::json) r
      FROM auth.users WHERE (created_at>='{since}'::timestamptz OR updated_at>='{since}'::timestamptz) AND coalesce(trim(email),'')<>''""", pat)[0]['r']
    users = len(plist)
    if plist:
        cred = cs.keychain('native-a-credential', 'theanh-main-cf-staging-credential')
        proc = subprocess.run(['node', str(MAIN / 'scripts/copy-supabase-auth-plan.mjs')], cwd=MAIN, capture_output=True, text=True,
                              input=json.dumps({'projectId': ref, 'credentialKey': cred, 'adminRoles': a.project == 'a', 'users': plist}))
        if proc.returncode != 0: raise SystemExit('Auth delta plan failed')
        import re as _re
        for st in json.loads(proc.stdout)['statements']:
            sql = _re.sub(r'\?(\d+)', '?', st['sql']).replace('INSERT INTO', 'INSERT OR IGNORE INTO', 1)  # never delete+reinsert (sessions reference accounts)
            parts = sql.split('?'); out = parts[0]
            for i, v in enumerate(st['params']): out += cs.literal(v) + parts[i + 1]
            stmts.append(out.rstrip(';') + ';')
    print(json.dumps({'apply': a.apply, 'tables': report, 'rows': sum(report.values()), 'newAuthUsers': users}, ensure_ascii=False))
    if a.apply and stmts:
        with tempfile.NamedTemporaryFile('w', suffix='.sql', delete=False) as f:
            f.write('PRAGMA defer_foreign_keys = on;\n' + '\n'.join(stmts) + '\n'); path = f.name
        r = subprocess.run([str(MAIN / 'node_modules/.bin/wrangler'), 'd1', 'execute', a.database, '--remote', '--yes', '--file', path], cwd=MAIN, capture_output=True, text=True)
        Path(path).unlink()
        if r.returncode != 0: raise SystemExit('Delta apply failed: ' + (r.stderr or r.stdout)[-300:])
        print('delta applied')

if __name__ == '__main__': main()
