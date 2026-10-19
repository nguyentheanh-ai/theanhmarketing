"""Capture Supabase A/B SCHEMA metadata (no table rows) for the D1 shim.

Read-only Management API query (read_only transaction), same scoped PAT as
copy-supabase-to-d1.py. Writes reports/cloudflare-d1/supabase-schema-<a|b>.json:
columns (type/default/nullable), primary/unique keys, foreign keys, triggers,
RLS policies and public/crm_v2 function definitions. Never reads row data.
"""
import json, re, subprocess, sys, urllib.request, urllib.error, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PROJECTS = {"a": ("vsxxgdzwtscuxcmjfckt", ["public", "crm_v2"]), "b": ("pppiqhkectojxbmhqcnx", ["public"])}
SERVICE = "com.theanhmarketing.cloudflare-migration.backup-secret."
SECRETISH = re.compile(r"(sk_live|re_[A-Za-z0-9]{20}|eyJhbGci|-----BEGIN)")

def keychain(service, account):
    r = subprocess.run(["/usr/bin/security", "find-generic-password", "-w", "-s", SERVICE + service, "-a", account], capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip(): raise SystemExit("Keychain entry unavailable")
    return r.stdout.strip()

def query(ref, sql, pat):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query", method="POST",
        headers={"Authorization": "Bearer " + pat, "Content-Type": "application/json"}, data=json.dumps({"query": sql, "read_only": True}).encode())
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp: return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < 3: time.sleep(2 * (attempt + 1)); continue
            raise SystemExit(f"Schema query failed for {ref}: HTTP {e.code}")

def capture(key, ref, schemas, pat):
    s = ",".join(f"'{x}'" for x in schemas)
    q = {
     "columns": f"SELECT json_agg(json_build_object('schema',table_schema,'table',table_name,'column',column_name,'type',data_type,'udt',udt_name,'default',column_default,'nullable',is_nullable='YES','position',ordinal_position) ORDER BY table_schema,table_name,ordinal_position) FROM information_schema.columns c WHERE table_schema IN ({s}) AND EXISTS(SELECT 1 FROM information_schema.tables t WHERE t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE')",
     "indexes": f"SELECT json_agg(json_build_object('schema',n.nspname,'table',t.relname,'name',i.relname,'unique',x.indisunique,'primary',x.indisprimary,'def',pg_get_indexdef(x.indexrelid))) FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ({s})",
     "constraints": f"SELECT json_agg(json_build_object('schema',n.nspname,'table',t.relname,'name',c.conname,'type',c.contype,'def',pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ({s})",
     "triggers": f"SELECT json_agg(json_build_object('schema',n.nspname,'table',t.relname,'name',g.tgname,'def',pg_get_triggerdef(g.oid))) FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE NOT g.tgisinternal AND n.nspname IN ({s})",
     "policies": f"SELECT json_agg(json_build_object('schema',schemaname,'table',tablename,'name',policyname,'cmd',cmd,'roles',roles,'using',qual,'check',with_check)) FROM pg_policies WHERE schemaname IN ({s})",
     "functions": f"SELECT json_agg(json_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'def',pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ({s}) AND p.prokind='f' AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.deptype='e')",
     "private_functions": "SELECT json_agg(json_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'def',pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('private','private_course_editor') AND p.prokind='f'",
     "rls": f"SELECT json_agg(json_build_object('schema',n.nspname,'table',c.relname,'rls',c.relrowsecurity,'force',c.relforcerowsecurity)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ({s})",
     "grants": f"SELECT json_agg(json_build_object('schema',table_schema,'table',table_name,'grantee',grantee,'privilege',privilege_type)) FROM information_schema.role_table_grants WHERE table_schema IN ({s}) AND grantee IN ('anon','authenticated')",
     "enums": f"SELECT json_agg(json_build_object('schema',n.nspname,'name',t.typname,'values',(SELECT json_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_enum e WHERE e.enumtypid=t.oid))) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE t.typtype='e' AND n.nspname IN ({s})",
    }
    out = {"project": ref, "schemas": schemas}
    for name, sql in q.items():
        out[name] = query(ref, sql, pat)[0]["json_agg"] or []
    text = json.dumps(out, ensure_ascii=False, indent=1)
    if SECRETISH.search(text): raise SystemExit(f"Refusing to write {key}: secret-like literal found in schema metadata")
    path = ROOT / "reports/cloudflare-d1" / f"supabase-schema-{key}.json"; path.write_text(text + "\n")
    print(key, {k: len(v) for k, v in out.items() if isinstance(v, list)})

if __name__ == "__main__":
    pat = keychain("pat", "theanh-cloudflare-migration-supabase-scoped-pat")
    for key in (sys.argv[1:] or PROJECTS):
        ref, schemas = PROJECTS[key]; capture(key, ref, schemas, pat)
