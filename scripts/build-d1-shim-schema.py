"""Compile captured Supabase schema metadata into a compact module for the D1 PostgREST shim."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
FK = re.compile(r"FOREIGN KEY \(([^)]*)\) REFERENCES ([\w.]+)\(([^)]*)\)(.*)", re.S)
UQ = re.compile(r"CREATE UNIQUE INDEX \S+ ON (\w+)\.(\w+) USING btree \(([^)]*)\)(.*)", re.S)
def cols(s): return [c.strip().strip('"') for c in s.split(',')]
for key in (sys.argv[1:] or ['a', 'b']):
    d = json.loads((ROOT / f'reports/cloudflare-d1/supabase-schema-{key}.json').read_text())
    tables = {}
    for c in d['columns']:
        t = tables.setdefault(f"{c['schema']}.{c['table']}", {'cols': {}, 'pk': [], 'uniques': [], 'fks': []})
        t['cols'][c['column']] = [c['udt'], c['default'], c['nullable']]
    for i in d['indexes']:
        name = f"{i['schema']}.{i['table']}"
        m = UQ.match(i['def'])
        if not m or name not in tables: continue
        cs, rest = cols(m.group(3)), m.group(4).strip()
        if any(not re.fullmatch(r'\w+', c) for c in cs): continue
        if i['primary']: tables[name]['pk'] = cs
        else: tables[name]['uniques'].append({'cols': cs, 'where': rest[6:] if rest.startswith('WHERE ') else None})
    for c in d['constraints']:
        if c['type'] != 'f': continue
        m = FK.match(c['def']); name = f"{c['schema']}.{c['table']}"
        if not m or name not in tables: continue
        ref = m.group(2) if '.' in m.group(2) else 'public.' + m.group(2)
        od = re.search(r'ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION|SET DEFAULT)', m.group(4))
        tables[name]['fks'].append({'name': c['name'], 'cols': cols(m.group(1)), 'ref': ref, 'refCols': cols(m.group(3)), 'onDelete': od.group(1) if od else 'NO ACTION'})
    trig = re.compile(r"CREATE TRIGGER (\w+) (BEFORE|AFTER) (.+?) ON (\w+)\.(\w+) FOR EACH ROW (?:WHEN \((.*)\) )?EXECUTE FUNCTION ([\w.]+)\(\)")
    for t in d['triggers']:
        m = trig.match(t['def']); name = f"{t['schema']}.{t['table']}"
        if not m or name not in tables: raise SystemExit('Unparsed trigger: ' + t['def'])
        tables[name].setdefault('triggers', []).append({'name': m.group(1), 'timing': m.group(2), 'events': m.group(3), 'function': m.group(7)})
    checks = [{'table': f"{c['schema']}.{c['table']}", 'def': c['def']} for c in d['constraints'] if c['type'] == 'c']
    out = {'project': d['project'], 'tables': tables, 'enums': {e['name']: e['values'] for e in d['enums']}, 'checks': checks}
    (ROOT / f'lib/cloudflare/generated/supabase-schema-{key}.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(key, len(tables), 'tables', sum(len(t['fks']) for t in tables.values()), 'fks', sum(len(t['uniques']) for t in tables.values()), 'uniques')
