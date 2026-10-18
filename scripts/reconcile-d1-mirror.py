#!/usr/bin/env python3
"""Offline application-mirror delta rehearsal; never connects to a provider.

Inputs are SQLite exports from copy-supabase-to-d1.py. Only counts/digests leave
this process. Source credentials, Auth and runtime d1_* tables are out of scope.
An export is NOT a consistent PostgreSQL snapshot or a cutover certificate.
"""
import argparse
import base64
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sqlite3
import sys

PROJECTS = {"a": "vsxxgdzwtscuxcmjfckt", "b": "pppiqhkectojxbmhqcnx"}
TABLE = re.compile(r"^[ab]_(?:public|crm_v2)__[A-Za-z_][A-Za-z0-9_]*$")


class ReconciliationError(Exception):
    """Only fixed, non-sensitive messages may be reported to the operator."""


def fail(code):
    raise ReconciliationError(code)


def quote(name):
    if not TABLE.fullmatch(name):
        fail("INVALID_APPLICATION_TABLE")
    return '"' + name + '"'


def readonly(path):
    path = Path(path).resolve(strict=True)
    db = sqlite3.connect(path.as_uri() + "?mode=ro", uri=True)
    db.execute("PRAGMA query_only=ON")
    db.execute("BEGIN")
    return db


def encoded(value):
    # SQLite affinities can hide numeric/text drift. Keep types, exact strings,
    # binary and NULL distinct; never normalize JSON/timestamps silently.
    if value is None:
        return ["null"]
    if isinstance(value, int):
        return ["integer", str(value)]
    if isinstance(value, float):
        if not math.isfinite(value):
            fail("NON_FINITE_VALUE")
        return ["real", value.hex()]
    if isinstance(value, str):
        return ["text", value]
    if isinstance(value, bytes):
        return ["blob", base64.b64encode(value).decode("ascii")]
    fail("UNSUPPORTED_VALUE_TYPE")


def canonical(values):
    return json.dumps([encoded(v) for v in values], ensure_ascii=False,
                      separators=(",", ":")).encode("utf-8")


def digest(rows):
    # Hash a sorted multiset of fixed-size hashes: order independent, duplicate
    # multiplicity preserved, row concatenation cannot create ambiguity.
    return hashlib.sha256(b"".join(sorted(hashlib.sha256(canonical(r)).digest()
                                         for r in rows))).hexdigest()


def schema(db, table):
    q = quote(table)
    cols = db.execute(f"PRAGMA table_info({q})").fetchall()
    if not cols:
        fail("TABLE_MISSING")
    # Include indexes, constraints, FK and triggers, not just column names.
    objects = db.execute("SELECT type,name,sql FROM sqlite_master WHERE tbl_name=? "
                         "ORDER BY type,name", (table,)).fetchall()
    return cols, objects, db.execute(f"PRAGMA foreign_key_list({q})").fetchall()


def read_table(db, table):
    shape = schema(db, table)
    cols = shape[0]
    pk = [c[0] for c in sorted(cols, key=lambda c: c[5]) if c[5]]
    rows = db.execute(f"SELECT * FROM {quote(table)}").fetchall()
    keyed = {}
    if pk:
        for row in rows:
            key_values = tuple(row[i] for i in pk)
            if any(v is None for v in key_values):
                fail("NULL_PRIMARY_KEY")
            key = canonical(key_values)
            if key in keyed:
                fail("DUPLICATE_PRIMARY_KEY")
            keyed[key] = row
    return {"schema": shape, "columns": [c[1] for c in cols], "pk": pk,
            "rows": rows, "keyed": keyed, "digest": digest(rows)}


def load_manifest(path, project):
    try:
        doc = json.loads(Path(path).read_text())
        if not isinstance(doc.get("tables"), dict) or not isinstance(doc.get("redactedColumns", {}), dict):
            fail("INVALID_MANIFEST")
        for name, entry in doc["tables"].items():
            if name.startswith(project + "_"):
                expected = PROJECTS[project] + ":" + name[2:].replace("__", ".", 1)
                if not TABLE.fullmatch(name) or entry["source"] != expected:
                    fail("PROJECT_MANIFEST_MISMATCH")
        return doc
    except (KeyError, TypeError, ValueError):
        fail("INVALID_MANIFEST")


def inventory(db, project):
    return {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")
            if r[0].startswith(project + "_") and TABLE.fullmatch(r[0])}


def compare(baseline, current, before_manifest, after_manifest, project, tables=None):
    if before_manifest.get('representationVersion') != after_manifest.get('representationVersion'):
        fail('SNAPSHOT_REPRESENTATION_MISMATCH')
    old, new = inventory(baseline, project), inventory(current, project)
    selected = set(tables) if tables is not None else old | new
    if not selected or any(not TABLE.fullmatch(t) or not t.startswith(project + "_") for t in selected):
        fail("INVALID_TABLE_SELECTION")
    result, plans = [], {}
    for table in sorted(selected):
        if table not in old or table not in new:
            result.append({"table": table, "blockers": ["TABLE_SET_CHANGED"]})
            continue
        prior, fresh = read_table(baseline, table), read_table(current, table)
        blockers = []
        for manifest, snapshot in [(before_manifest, prior), (after_manifest, fresh)]:
            entry = manifest["tables"].get(table)
            if not entry or entry.get("rows") != len(snapshot["rows"]):
                fail("MANIFEST_COUNT_MISMATCH")
            if entry.get('digest') is not None and entry['digest'] != snapshot['digest']:
                fail('MANIFEST_DIGEST_MISMATCH')
            if entry.get("primaryKey") != [snapshot["columns"][i] for i in snapshot["pk"]]:
                fail("MANIFEST_PRIMARY_KEY_MISMATCH")
        if prior["schema"] != fresh["schema"]:
            blockers.append("SCHEMA_CHANGED")
        if before_manifest.get("redactedColumns", {}).get(table) or after_manifest.get("redactedColumns", {}).get(table):
            blockers.append("REDACTED_COLUMNS_REQUIRE_SECURE_MIGRATION")
        changes = {"insert": [], "update": [], "delete": []}
        if prior["schema"] == fresh["schema"] and prior["pk"]:
            a, b = prior["keyed"], fresh["keyed"]
            changes["insert"] = [b[k] for k in b.keys() - a.keys()]
            changes["delete"] = [a[k] for k in a.keys() - b.keys()]
            changes["update"] = [(a[k], b[k]) for k in a.keys() & b.keys()
                                 if canonical(a[k]) != canonical(b[k])]
        elif not prior["pk"]:
            blockers.append("NO_STABLE_PRIMARY_KEY")
        result.append({"table": table, "beforeRows": len(prior["rows"]),
                       "afterRows": len(fresh["rows"]), "beforeDigest": prior["digest"],
                       "afterDigest": fresh["digest"], "changes": {k: len(v) for k, v in changes.items()},
                       "blockers": blockers})
        plans[table] = (prior, fresh, changes)
    return {"format": "tam-offline-mirror-delta-v1", "project": project,
            "sourceProject": PROJECTS[project], "scope": "application-mirror-only",
            "snapshotConsistency": "NOT_PROVEN", "readyForCutover": False,
            "tables": result, "blocked": any(t["blockers"] for t in result)}, plans


def prepare_local(baseline_path, target_path, project):
    # Caller must select a protected/encrypted working directory. Never overwrite
    # an existing file; 0600 before SQLite writes, independent of shell umask.
    target = Path(target_path).resolve()
    if target.parent.stat().st_mode & 0o077:
        fail("PRIVATE_WORK_DIRECTORY_REQUIRED")
    if any((parent / ".git").exists() for parent in target.parents):
        fail("SENSITIVE_COPY_MUST_BE_OUTSIDE_GIT")
    if target == Path(baseline_path).resolve():
        fail("TARGET_IS_SOURCE")
    fd = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    source = readonly(baseline_path)
    try:
        with sqlite3.connect(target) as db:
            source.backup(db)
            db.execute("CREATE TABLE _cf_local_mirror_guard(project TEXT PRIMARY KEY, mode TEXT NOT NULL)")
            db.execute("INSERT INTO _cf_local_mirror_guard VALUES(?, 'offline-only')", (project,))
    finally:
        source.close()


def apply_local(target_path, report, plans, source_paths):
    target = Path(target_path).resolve(strict=True)
    if any(os.path.samefile(target, p) for p in source_paths):
        fail("TARGET_IS_SOURCE")
    if report["blocked"]:
        fail("DELTA_BLOCKED")
    db = sqlite3.connect(target)
    try:
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("BEGIN IMMEDIATE")
        marker = db.execute("SELECT project,mode FROM _cf_local_mirror_guard").fetchall()
        if marker != [(report["project"], "offline-only")]:
            fail("LOCAL_MIRROR_GUARD_REQUIRED")
        # All triggers are rejected: even an unrelated table's trigger can
        # mutate an unselected table via cascading/reentrant SQL.
        if db.execute("SELECT 1 FROM sqlite_master WHERE type='trigger' LIMIT 1").fetchone():
            fail("LOCAL_MIRROR_TRIGGERS_UNSUPPORTED")
        untouched = {r[0]: digest(db.execute('SELECT * FROM "' + r[0].replace('"', '""') + '"').fetchall())
                     for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
                     if r[0] not in plans and not r[0].startswith("sqlite_")}
        for table, (prior, _, _) in plans.items():
            actual = read_table(db, table)
            if actual["schema"] != prior["schema"] or actual["digest"] != prior["digest"]:
                fail("TARGET_DRIFT_RECONCILIATION_REQUIRED")
        # Deferred constraints let related parent/child deltas commit together.
        db.execute("PRAGMA defer_foreign_keys=ON")
        for table, (prior, _, changes) in plans.items():
            cols = prior["columns"]
            names = ["\"" + c.replace('"', '""') + "\"" for c in cols]
            where = " AND ".join(names[i] + " IS ?" for i in prior["pk"])
            for row in changes["delete"]:
                db.execute(f"DELETE FROM {quote(table)} WHERE {where}", tuple(row[i] for i in prior["pk"]))
            for before, after in changes["update"]:
                db.execute(f"UPDATE {quote(table)} SET " + ",".join(n + "=?" for n in names) + " WHERE " + where,
                           tuple(after) + tuple(before[i] for i in prior["pk"]))
            for row in changes["insert"]:
                db.execute(f"INSERT INTO {quote(table)} VALUES ({','.join('?' for _ in row)})", row)
        # Detect FK cascade effects in *all* tables, including unselected ones.
        if db.execute("PRAGMA foreign_key_check").fetchone():
            fail("TARGET_FOREIGN_KEY_MISMATCH")
        for table, before_digest in untouched.items():
            after_digest = digest(db.execute('SELECT * FROM "' + table.replace('"', '""') + '"').fetchall())
            if before_digest != after_digest:
                fail("UNSELECTED_TABLE_CHANGED")
        for table, (_, fresh, _) in plans.items():
            if read_table(db, table)["digest"] != fresh["digest"]:
                fail("TARGET_FINAL_DIGEST_MISMATCH")
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["compare", "prepare-local", "apply-local"])
    parser.add_argument("--project", required=True, choices=PROJECTS)
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--current")
    parser.add_argument("--baseline-manifest")
    parser.add_argument("--current-manifest")
    parser.add_argument("--target")
    parser.add_argument("--tables", nargs="+")
    args = parser.parse_args()
    if args.command == "prepare-local":
        if not args.target:
            fail("TARGET_REQUIRED")
        prepare_local(args.baseline, args.target, args.project)
        print(json.dumps({"prepared": True, "project": args.project, "mode": "offline-only"}))
        return
    if not all([args.current, args.baseline_manifest, args.current_manifest]):
        fail("TWO_SNAPSHOTS_AND_MANIFESTS_REQUIRED")
    a, b = readonly(args.baseline), readonly(args.current)
    try:
        report, plans = compare(a, b, load_manifest(args.baseline_manifest, args.project),
                                load_manifest(args.current_manifest, args.project), args.project, args.tables)
        if args.command == "apply-local":
            if not args.target:
                fail("TARGET_REQUIRED")
            apply_local(args.target, report, plans, [args.baseline, args.current])
            report["localMirrorApplied"] = True
        print(json.dumps(report, indent=2))
    finally:
        a.close()
        b.close()


if __name__ == "__main__":
    try:
        main()
    except ReconciliationError as error:
        print(json.dumps({"ok": False, "code": str(error)}))
        sys.exit(2)
    except Exception:
        # SQLite errors, filenames and payloads must not enter logs.
        print(json.dumps({"ok": False, "code": "OFFLINE_RECONCILIATION_FAILED"}))
        sys.exit(2)
