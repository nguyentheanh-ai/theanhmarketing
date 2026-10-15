"""Copy Supabase A/B application data into a SEPARATE Cloudflare D1 database.

Read-only on Supabase (Management API, read_only transactions). The target D1
is not bound to any Worker. Never prints customer rows or secrets.

Stages (run in order):
  fetch   -> local SQLite in --work (sensitive; outside Git, deleted by `clean`)
  upload  -> wrangler d1 execute --remote --file into --database
  verify  -> compare per-table row counts source vs D1, write receipt
  clean   -> delete local working files
"""
import argparse, datetime, hashlib, json, os, re, sqlite3, subprocess, sys, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = {"a": ("vsxxgdzwtscuxcmjfckt", ["public", "crm_v2"]), "b": ("pppiqhkectojxbmhqcnx", ["public"])}
# Values in these columns are never copied (left NULL) and listed in the receipt.
SECRET = re.compile(r"(password|secret|token|api_?key|private_?key|access_?key|service_?role|credential|refresh|otp)", re.I)
PAGE = 500
SERVICE = "com.theanhmarketing.cloudflare-migration.backup-secret."


def keychain(service, account):
    r = subprocess.run(["/usr/bin/security", "find-generic-password", "-w", "-s", SERVICE + service, "-a", account], capture_output=True, text=True)
    if r.returncode != 0 or not r.stdout.strip():
        raise SystemExit("Keychain entry unavailable: " + service)
    return r.stdout.strip()


def query(ref, sql, pat):
    req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query", method="POST",
                                 headers={"Authorization": "Bearer " + pat, "Content-Type": "application/json"},
                                 data=json.dumps({"query": sql, "read_only": True}).encode())
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                import time; time.sleep(2 * (attempt + 1)); continue
            raise SystemExit(f"Supabase query failed for {ref}: HTTP {e.code}")


def ident(name):
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise SystemExit("Unsupported identifier: " + name)
    return name


def affinity(pg_type):
    t = pg_type.lower()
    if t in ("integer", "bigint", "smallint"): return "INTEGER"
    if t in ("real", "double precision"): return "REAL"
    if t == "boolean": return "INTEGER"
    return "TEXT"  # numeric kept as exact text; json/arrays as JSON text


def fetch(args, pat):
    work = Path(args.work); work.mkdir(parents=True, exist_ok=True); os.chmod(work, 0o700)
    db_path = work / "copy.sqlite"
    if db_path.exists(): db_path.unlink()
    db = sqlite3.connect(db_path)
    manifest = {"snapshotStartedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "tables": {}, "redactedColumns": {}}
    for key, (ref, schemas) in PROJECTS.items():
        meta_sql = """SELECT json_agg(x) FROM (SELECT c.table_schema s, c.table_name t, json_agg(json_build_object('n',c.column_name,'ty',c.data_type) ORDER BY c.ordinal_position) cols,
          (SELECT json_agg(a.attname ORDER BY array_position(i.indkey, a.attnum)) FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
            WHERE i.indrelid=(quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass AND i.indisprimary) pk
          FROM information_schema.columns c JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
          WHERE c.table_schema IN (%s) GROUP BY c.table_schema,c.table_name ORDER BY 1,2) x""" % ",".join("'%s'" % s for s in schemas)
        tables = query(ref, meta_sql, pat)[0]["json_agg"] or []
        for tb in tables:
            schema, name, cols, pk = ident(tb["s"]), ident(tb["t"]), tb["cols"], tb["pk"] or []
            target = f"{key}_{schema}__{name}"
            names = [ident(c["n"]) for c in cols]
            redacted = [n for n in names if SECRET.search(n)]
            if redacted: manifest["redactedColumns"][target] = redacted
            col_defs = ", ".join(f'"{c["n"]}" {affinity(c["ty"])}' for c in cols)
            pk_def = f', PRIMARY KEY({", ".join(chr(34)+ident(p)+chr(34) for p in pk)})' if pk else ""
            db.execute(f'CREATE TABLE "{target}" ({col_defs}{pk_def})')
            order = ", ".join(f'"{p}"' for p in pk) if pk else "ctid"
            count, offset = 0, 0
            while True:
                rows = query(ref, f'SELECT coalesce(json_agg(row_to_json(t)),\'[]\'::json) r FROM (SELECT * FROM "{schema}"."{name}" ORDER BY {order} LIMIT {PAGE} OFFSET {offset}) t', pat)[0]["r"]
                for row in rows:
                    values = []
                    for c in cols:
                        v = None if c["n"] in redacted else row.get(c["n"])
                        if isinstance(v, bool): v = int(v)
                        elif isinstance(v, (dict, list)): v = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
                        elif isinstance(v, float) and affinity(c["ty"]) == "TEXT": v = repr(v)
                        values.append(v)
                    db.execute(f'INSERT INTO "{target}" VALUES ({",".join("?" * len(values))})', values)
                count += len(rows); offset += PAGE
                if len(rows) < PAGE: break
            manifest["tables"][target] = {"source": f"{ref}:{schema}.{name}", "rows": count, "primaryKey": pk}
            print(f"fetched {target}: {count}", flush=True)
        # Auth users (password hashes) are deliberately not copied in this pass.
    db.commit(); db.close()
    manifest["snapshotFinishedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (work / "manifest.json").write_text(json.dumps(manifest, indent=2))


LIMIT = 90_000  # D1 rejects statements over ~100 KB


def literal(v):
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def dump_sql(args):
    work = Path(args.work); db = sqlite3.connect(work / "copy.sqlite")
    out = work / "copy.sql"
    with out.open("w") as f:
        for name, create in db.execute("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
            f.write(create + ";\n")
            cols = [r[1] for r in db.execute(f'PRAGMA table_info("{name}")')]
            pk = [r[1] for r in sorted(db.execute(f'PRAGMA table_info("{name}")'), key=lambda r: r[5]) if r[5] > 0]
            for row in db.execute(f'SELECT * FROM "{name}"'):
                values = [literal(v) for v in row]
                stmt = f'INSERT INTO "{name}" VALUES ({",".join(values)});'
                if len(stmt.encode()) <= LIMIT:
                    f.write(stmt + "\n"); continue
                # Oversized row: insert with long text columns empty, then append
                # chunks keyed by primary key. Chunks split on characters.
                if not pk: raise SystemExit(f"Oversized row without primary key in {name}")
                where = " AND ".join(f'"{c}"={literal(row[cols.index(c)])}' for c in pk)
                big = {i for i, v in enumerate(row) if isinstance(v, str) and len(v.encode()) > 20_000 and cols[i] not in pk}
                first = [("''" if i in big else values[i]) for i in range(len(row))]
                f.write(f'INSERT INTO "{name}" VALUES ({",".join(first)});\n')
                for i in big:
                    text, size = row[i], 60_000
                    for start in range(0, len(text), size // 4):
                        piece = text[start:start + size // 4]
                        f.write(f'UPDATE "{name}" SET "{cols[i]}"="{cols[i]}"||{literal(piece)} WHERE {where};\n')
    return out


def wrangler(args, *extra, capture=True):
    cmd = [str(ROOT / "node_modules/.bin/wrangler"), "d1", "execute", args.database, "--remote", *extra]
    return subprocess.run(cmd, cwd=ROOT, capture_output=capture, text=True)


def upload(args):
    path = dump_sql(args)
    print("sql sha256", hashlib.sha256(path.read_bytes()).hexdigest(), flush=True)
    r = wrangler(args, "--yes", "--file", str(path))
    if r.returncode != 0:
        raise SystemExit("Upload failed: " + (r.stderr or r.stdout)[-500:])
    print("uploaded", flush=True)


def verify(args):
    manifest = json.loads((Path(args.work) / "manifest.json").read_text())
    tables = list(manifest["tables"])
    actual = {}
    def count(names):
        q = " UNION ALL ".join(f"SELECT '{t}' t, count(*) n FROM \"{t}\"" for t in names)
        r = wrangler(args, "--json", "--command", q)
        return {row["t"]: row["n"] for row in json.loads(r.stdout)[0]["results"]} if r.returncode == 0 else None
    for i in range(0, len(tables), 4):
        part = tables[i:i + 4]
        found = count(part)
        if found is None:  # D1 API occasionally rejects a batch; count one by one
            found = {}
            for t in part:
                one = count([t]) or count([t])
                if one is None: raise SystemExit("Verify query failed for " + t)
                found.update(one)
        actual.update(found)
    mismatch = {t: (m["rows"], actual.get(t)) for t, m in manifest["tables"].items() if actual.get(t) != m["rows"]}
    receipt = {"checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "database": args.database,
               "status": "PASS" if not mismatch else "MISMATCH", "tables": len(tables), "rows": sum(m["rows"] for m in manifest["tables"].values()),
               "mismatch": mismatch, "redactedColumns": manifest["redactedColumns"],
               "snapshot": [manifest["snapshotStartedAt"], manifest["snapshotFinishedAt"]],
               "limits": "Point-in-time copy (page reads are not one transaction); auth.users/passwords, sessions/refresh tokens and Storage bytes not included; secret-like columns left NULL; not bound to any Worker."}
    out = ROOT / "reports/cloudflare-d1/supabase-copy-verification.json"
    out.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({k: receipt[k] for k in ("status", "tables", "rows", "mismatch")}))
    if mismatch: sys.exit(1)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("stage", choices=["fetch", "upload", "verify", "clean"])
    p.add_argument("--work", required=True)
    p.add_argument("--database", default="theanh-supabase-copy")
    args = p.parse_args()
    if args.stage == "fetch":
        fetch(args, keychain("pat", "theanh-cloudflare-migration-supabase-scoped-pat"))
    elif args.stage == "upload": upload(args)
    elif args.stage == "verify": verify(args)
    else:
        for name in ("copy.sqlite", "copy.sql"):
            f = Path(args.work) / name
            if f.exists(): f.unlink()
        print("cleaned")


if __name__ == "__main__":
    main()
