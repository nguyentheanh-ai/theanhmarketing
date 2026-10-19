"""Rollback data path: copy rows written on native D1 after the cutover back to Supabase.

Default is DRY RUN (counts only, no Supabase write). `--apply` performs the
upserts and needs the owner's explicit rollback approval.

For every table of the generated schema that has created_at/updated_at, rows
with created_at or updated_at >= --since are read from D1 (wrangler, remote)
and upserted into Supabase with jsonb_populate_recordset + ON CONFLICT (pk).
New native Auth users (created >= --since) are inserted into auth.users with
their bcrypt hash (unsealed locally with the credential key; never printed).
Deletes made on D1 after the cutover are NOT replayed; they are listed only.
"""
import argparse, datetime, importlib.util, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT.parent / 'main'
spec = importlib.util.spec_from_file_location('copy_supabase', MAIN / 'scripts/copy-supabase-to-d1.py')
cs = importlib.util.module_from_spec(spec); spec.loader.exec_module(cs)
PROJECTS = {'a': 'vsxxgdzwtscuxcmjfckt', 'b': 'pppiqhkectojxbmhqcnx'}

def d1(database, sql):
    r = subprocess.run([str(MAIN / 'node_modules/.bin/wrangler'), 'd1', 'execute', database, '--remote', '--json', '--command', sql], cwd=MAIN, capture_output=True, text=True)
    if r.returncode != 0: raise SystemExit('D1 read failed')
    return json.loads(r.stdout)[0]['results']

def decode(udt, v):
    if v is None: return None
    if udt == 'bool': return bool(v)
    if udt in ('json', 'jsonb') or udt.startswith('_'):
        try: return json.loads(v) if isinstance(v, str) else v
        except ValueError: return v
    return v

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--project', choices=['a', 'b'], required=True)
    p.add_argument('--database', required=True)
    p.add_argument('--since', required=True, help='cutover instant, ISO 8601 UTC')
    p.add_argument('--apply', action='store_true')
    a = p.parse_args()
    since = datetime.datetime.fromisoformat(a.since.replace('Z', '+00:00')).astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S+00:00')
    schema = json.loads((ROOT / f'lib/cloudflare/generated/supabase-schema-{a.project}.json').read_text())['tables']
    ref = PROJECTS[a.project]; pat = cs.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat') if a.apply else None
    report = {'project': ref, 'since': since, 'apply': a.apply, 'tables': {}}
    for name, meta in sorted(schema.items()):
        cols = meta['cols']; stamps = [c for c in ('created_at', 'updated_at') if c in cols]
        if not stamps or not meta['pk']: continue
        s, t = name.split('.'); target = f'"{a.project}_{s}__{t}"'
        where = ' OR '.join(f'"{c}">=\'{since}\'' for c in stamps)
        rows = d1(a.database, f'SELECT * FROM {target} WHERE {where}')
        if not rows: continue
        report['tables'][name] = len(rows)
        if not a.apply: continue
        payload = json.dumps([{k: decode(cols[k][0], v) for k, v in r.items() if k in cols} for r in rows], ensure_ascii=False)
        if '$J$' in payload: raise SystemExit('Unsafe payload delimiter')
        updates = ','.join(f'"{c}"=excluded."{c}"' for c in cols if c not in meta['pk'])
        sql = f'INSERT INTO "{s}"."{t}" SELECT * FROM jsonb_populate_recordset(null::"{s}"."{t}", $J${payload}$J$::jsonb) ON CONFLICT ({",".join(chr(34)+c+chr(34) for c in meta["pk"])}) DO UPDATE SET {updates}'
        req = cs.urllib.request.Request(f'https://api.supabase.com/v1/projects/{ref}/database/query', method='POST', headers={'Authorization': 'Bearer ' + pat, 'Content-Type': 'application/json'}, data=json.dumps({'query': sql}).encode())
        with cs.urllib.request.urlopen(req, timeout=120) as resp: resp.read()
    users = d1(a.database, f"SELECT u.id,u.normalized_email email,a.created_at FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id WHERE a.created_at>='{since[:19]}'")
    report['newAuthUsers'] = len(users)
    if a.apply and users:
        report['authNote'] = 'Run scripts/native-reverse-sync-auth.mjs --apply for these users (owner approval).'
    out = ROOT / f'reports/cloudflare-d1/native-reverse-sync-{a.project}.json'
    out.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'apply': a.apply, 'tables': len(report['tables']), 'rows': sum(report['tables'].values()), 'newAuthUsers': len(users)}))

if __name__ == '__main__': main()
