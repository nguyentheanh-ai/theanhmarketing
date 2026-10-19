"""Translate Supabase RLS policies into SQLite predicates for the D1 shim.

Placeholders filled by the shim with validated literals: $UID (uuid or NULL),
$IS_ADMIN (1/0, current_user_is_admin), $JWT_ADMIN_ROLE (text or NULL).
Any policy that cannot be translated becomes '0' (deny) and is reported.
"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
NOW = "strftime('%Y-%m-%dT%H:%M:%f+00:00','now')"

def tables_of(key):
    return {(c['schema'], c['table']) for c in json.loads((ROOT / f'reports/cloudflare-d1/supabase-schema-{key}.json').read_text())['columns']}

def translate(expr, key, table, tables):
    e = ' '.join(expr.split())
    rules = [
        (r"\( ?SELECT auth\.uid\(\) AS uid\)", "$UID"), (r"auth\.uid\(\)", "$UID"),
        (r"\( ?SELECT current_user_is_admin\(\) AS current_user_is_admin\)", "$IS_ADMIN"), (r"\bcurrent_user_is_admin\(\)", "$IS_ADMIN"),
        (r"\bcrm_v2\.is_admin\(\)", "($JWT_ADMIN_ROLE IN ('owner','editor'))"),
        (r"\(\(auth\.jwt\(\) -> 'app_metadata'::text\) ->> 'admin_role'::text\)", "$JWT_ADMIN_ROLE"),
        (r"\( ?SELECT private_course_editor\.is_course_admin\(\) AS is_course_admin\)", f"EXISTS(SELECT 1 FROM \"{key}_public__profiles\" p WHERE p.id=$UID AND p.role='admin' AND p.status='active')"),
    ]
    for a, b in rules: e = re.sub(a, b, e)
    def call(name, sql):
        nonlocal e
        e = re.sub(r"\( ?SELECT private_course_editor\.%s\(([\w.]+)\) AS \w+\)" % name, lambda m: sql.replace('$X', m.group(1)), e)
    pub = lambda t: f'"{key}_public__{t}"'
    call('is_published_chapter', f"EXISTS(SELECT 1 FROM {pub('course_chapters')} ch JOIN {pub('courses')} c ON c.id=ch.course_id WHERE ch.id=$X AND c.status='published')")
    call('is_published_module', f"EXISTS(SELECT 1 FROM {pub('course_modules')} m JOIN {pub('course_chapters')} ch ON ch.id=m.chapter_id JOIN {pub('courses')} c ON c.id=ch.course_id WHERE m.id=$X AND c.status='published' AND m.status='published')")
    call('is_published_lesson', f"EXISTS(SELECT 1 FROM {pub('course_lessons')} l JOIN {pub('course_modules')} m ON m.id=l.module_id JOIN {pub('course_chapters')} ch ON ch.id=m.chapter_id JOIN {pub('courses')} c ON c.id=ch.course_id WHERE l.id=$X AND c.status='published' AND m.status='published' AND l.status='published')")
    call('is_published_block', f"EXISTS(SELECT 1 FROM {pub('course_blocks')} b JOIN {pub('course_lessons')} l ON l.id=b.lesson_id JOIN {pub('course_modules')} m ON m.id=l.module_id JOIN {pub('course_chapters')} ch ON ch.id=m.chapter_id JOIN {pub('courses')} c ON c.id=ch.course_id WHERE b.id=$X AND c.status='published' AND m.status='published' AND l.status='published')")
    e = re.sub(r"private\.can_access_lesson_task\(([\w.]+)\)", lambda m: f"EXISTS(SELECT 1 FROM {pub('lessons')} l JOIN {pub('courses')} c ON c.id=l.course_id WHERE l.id={m.group(1)} AND coalesce(l.status,'published')='published' AND coalesce(c.lms_status,'published')='published' AND (coalesce(c.visibility,'enrolled')='public' OR EXISTS(SELECT 1 FROM \"{key}_crm_v2__enrollments\" e WHERE e.user_id=$UID AND e.course_slug=c.slug AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>{NOW}))))", e)
    e = re.sub(r"\bads_os_member_role\(([\w.]+)\)", lambda m: f"(SELECT r.role FROM {pub('ads_os_memberships')} r WHERE r.workspace_id={m.group(1)} AND r.user_id=$UID)", e)
    # Remaining FROM <table> references -> D1 table names.
    e = re.sub(r"\bFROM (\w+) (\w+)\b", lambda m: f"FROM {pub(m.group(1))} {m.group(2)}" if ('public', m.group(1)) in tables else m.group(0), e)
    e = re.sub(r"::\"?[a-z_]+\"?(\[\])?", '', e)
    e = re.sub(r"(\$JWT_ADMIN_ROLE|[\w.]+|\([\w.]+\)) = ANY \(ARRAY\[(.*?)\]\)", lambda m: f"{m.group(1)} IN ({m.group(2)})", e)
    e = re.sub(r"\b" + table + r"\.", "__row.", e)  # policy row; shim substitutes its alias
    e = e.replace('now()', NOW)
    if re.search(r"auth\.|\bprivate|\bjwt\(|ANY|ARRAY|::|\bcurrent_setting", e): raise ValueError(e)
    return e

for key in (sys.argv[1:] or ['a', 'b']):
    d = json.loads((ROOT / f'reports/cloudflare-d1/supabase-schema-{key}.json').read_text()); tables = tables_of(key)
    out, gaps = {}, []
    # Tables with RLS enabled but no policy deny everyone except service_role.
    for p in d['policies']:
        k = f"{p['schema']}.{p['table']}"; entry = {'name': p['name'], 'cmd': p['cmd'], 'roles': p['roles']}
        for field in ('using', 'check'):
            if p[field] is None: entry[field] = None; continue
            try: entry[field] = translate(p[field], key, p['table'], tables)
            except ValueError as ex: entry[field] = '0'; gaps.append({'table': k, 'policy': p['name'], field: p[field][:300], 'left': str(ex)[:300]})
        out.setdefault(k, []).append(entry)
    meta = {f"{r['schema']}.{r['table']}": {'rls': r['rls'], 'grants': sorted({f"{g['grantee']}:{g['privilege']}" for g in d['grants'] if g['schema'] == r['schema'] and g['table'] == r['table']})} for r in d['rls']}
    out = {'tables': meta, 'policies': out}
    (ROOT / f'lib/cloudflare/generated/supabase-rls-{key}.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
    (ROOT / f'reports/cloudflare-d1/d1-rls-gaps-{key}.json').write_text(json.dumps(gaps, ensure_ascii=False, indent=1) + '\n')
    print(key, sum(len(v) for v in out['policies'].values()), 'policies,', len(gaps), 'untranslated')
    for g in gaps: print('  GAP', g['table'], g['policy'], g['left'][:200])
