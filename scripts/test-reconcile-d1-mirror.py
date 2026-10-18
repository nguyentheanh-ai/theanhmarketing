import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("delta", Path(__file__).with_name("reconcile-d1-mirror.py"))
delta = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delta)
TABLE = "a_public__orders"
DDL = f"CREATE TABLE {TABLE}(tenant TEXT, id TEXT, amount TEXT, payload BLOB, PRIMARY KEY(tenant,id))"


class DeltaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.a, self.b = self.root / "old.sqlite", self.root / "new.sqlite"
        for path in [self.a, self.b]:
            with sqlite3.connect(path) as db:
                db.execute(DDL)
                db.executemany(f"INSERT INTO {TABLE} VALUES (?,?,?,?)", [
                    ("tenant-one", "stable-id", "1.000000000000000001", b"\x00\xff"),
                    ("tenant-two", "stable-id", "2", None),
                ])

    def tearDown(self):
        self.tmp.cleanup()

    def manifest(self, path, redact=False):
        with sqlite3.connect(path) as db:
            n = db.execute(f"SELECT count(*) FROM {TABLE}").fetchone()[0]
        return {"tables": {TABLE: {"source": delta.PROJECTS["a"] + ":public.orders", "rows": n,
                                    "primaryKey": ["tenant", "id"]}},
                "redactedColumns": {TABLE: ["payload"]} if redact else {}}

    def compare(self, redact=False):
        a, b = delta.readonly(self.a), delta.readonly(self.b)
        try:
            return delta.compare(a, b, self.manifest(self.a), self.manifest(self.b, redact), "a")
        finally:
            a.close()
            b.close()

    def target(self):
        path = self.root / "target.sqlite"
        delta.prepare_local(self.a, path, "a")
        return path

    def apply(self, path, report, plans):
        delta.apply_local(path, report, plans, [self.a, self.b])

    def test_equal_count_changed_content_is_detected_and_exact_composite_keys_preserved(self):
        with sqlite3.connect(self.b) as db:
            db.execute(f"UPDATE {TABLE} SET amount=? WHERE tenant=?", ("1.000000000000000002", "tenant-one"))
            db.execute(f"DELETE FROM {TABLE} WHERE tenant='tenant-two'")
            db.execute(f"INSERT INTO {TABLE} VALUES ('tenant-three','stable-id','3',NULL)")
        report, plans = self.compare()
        row = report["tables"][0]
        self.assertEqual(row["beforeRows"], row["afterRows"])
        self.assertNotEqual(row["beforeDigest"], row["afterDigest"])
        self.assertEqual(row["changes"], {"insert": 1, "update": 1, "delete": 1})
        target = self.target()
        self.apply(target, report, plans)
        with sqlite3.connect(target) as db:
            self.assertEqual(delta.read_table(db, TABLE)["digest"], row["afterDigest"])
        with delta.readonly(self.a) as db:
            self.assertEqual(delta.read_table(db, TABLE)["digest"], row["beforeDigest"])
        self.assertFalse(report["readyForCutover"])
        self.assertEqual(target.stat().st_mode & 0o777, 0o600)

    def test_target_edit_since_snapshot_is_not_overwritten(self):
        target = self.target()
        with sqlite3.connect(target) as db:
            db.execute(f"UPDATE {TABLE} SET amount='newer-customer-change'")
        report, plans = self.compare()
        with self.assertRaisesRegex(delta.ReconciliationError, "TARGET_DRIFT"):
            self.apply(target, report, plans)
        with sqlite3.connect(target) as db:
            self.assertEqual(db.execute(f"SELECT DISTINCT amount FROM {TABLE}").fetchall(), [("newer-customer-change",)])

    def test_production_like_or_wrong_project_target_cannot_be_used(self):
        report, plans = self.compare()
        with self.assertRaisesRegex(delta.ReconciliationError, "TARGET_IS_SOURCE"):
            self.apply(self.a, report, plans)
        target = self.target()
        with sqlite3.connect(target) as db:
            db.execute("UPDATE _cf_local_mirror_guard SET project='b'")
        with self.assertRaisesRegex(delta.ReconciliationError, "LOCAL_MIRROR_GUARD"):
            self.apply(target, report, plans)
        alias = self.root / "source-hardlink.sqlite"
        os.link(self.a, alias)
        with self.assertRaisesRegex(delta.ReconciliationError, "TARGET_IS_SOURCE"):
            self.apply(alias, report, plans)

    def test_redacted_secret_columns_block_complete_delta(self):
        report, plans = self.compare(redact=True)
        self.assertIn("REDACTED_COLUMNS_REQUIRE_SECURE_MIGRATION", report["tables"][0]["blockers"])
        with self.assertRaisesRegex(delta.ReconciliationError, "DELTA_BLOCKED"):
            self.apply(self.target(), report, plans)

    def test_trigger_is_refused_even_if_source_matches(self):
        target = self.target()
        with sqlite3.connect(target) as db:
            db.execute(f"CREATE TRIGGER malicious AFTER UPDATE ON {TABLE} BEGIN SELECT 1; END")
        report, plans = self.compare()
        with self.assertRaisesRegex(delta.ReconciliationError, "TRIGGERS_UNSUPPORTED"):
            self.apply(target, report, plans)

    def test_foreign_key_failure_rolls_back_every_prior_table_mutation(self):
        for path in [self.a, self.b]:
            with sqlite3.connect(path) as db:
                db.execute("CREATE TABLE a_public__parents(id TEXT PRIMARY KEY)")
                db.execute("CREATE TABLE a_public__children(id TEXT PRIMARY KEY,parent TEXT REFERENCES a_public__parents(id))")
                db.execute("INSERT INTO a_public__parents VALUES ('parent')")
                db.execute("INSERT INTO a_public__children VALUES ('child','parent')")
        with sqlite3.connect(self.b) as db:
            db.execute(f"UPDATE {TABLE} SET amount='changed'")
            db.execute("DELETE FROM a_public__parents")
        target = self.target()
        manifests = []
        for path in [self.a, self.b]:
            doc = self.manifest(path)
            with sqlite3.connect(path) as db:
                for name in ["parents", "children"]:
                    table = "a_public__" + name
                    doc["tables"][table] = {"source": delta.PROJECTS['a'] + ':public.' + name,
                                            "rows": db.execute(f"SELECT count(*) FROM {table}").fetchone()[0], "primaryKey": ['id']}
            manifests.append(doc)
        with delta.readonly(self.a) as a, delta.readonly(self.b) as b:
            report, plans = delta.compare(a, b, *manifests, 'a')
        with self.assertRaisesRegex(delta.ReconciliationError, "FOREIGN_KEY_MISMATCH"):
            self.apply(target, report, plans)
        with sqlite3.connect(target) as db, sqlite3.connect(self.a) as source:
            self.assertEqual(delta.read_table(db, TABLE)['digest'], delta.read_table(source, TABLE)['digest'])

    def test_unselected_fk_cascade_cannot_silently_delete_rows(self):
        for path in [self.a, self.b]:
            with sqlite3.connect(path) as db:
                db.execute(f"CREATE TABLE unselected(tenant TEXT,id TEXT, FOREIGN KEY(tenant,id) REFERENCES {TABLE}(tenant,id) ON DELETE CASCADE)")
                db.execute("INSERT INTO unselected VALUES ('tenant-one','stable-id')")
        with sqlite3.connect(self.b) as db:
            db.execute(f"DELETE FROM {TABLE} WHERE tenant='tenant-one'")
        target = self.target()
        report, plans = self.compare()
        with self.assertRaisesRegex(delta.ReconciliationError, "UNSELECTED_TABLE_CHANGED"):
            self.apply(target, report, plans)
        with sqlite3.connect(target) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM unselected").fetchone()[0], 1)

    def test_multiset_hash_retains_type_blob_duplicate_and_precision(self):
        self.assertEqual(delta.digest([(1,), (2,)]), delta.digest([(2,), (1,)]))
        for a, b in [([(1,)], [("1",)]), ([(1,)], [(1.0,)]), ([(None,)], [("",)]),
                     ([(b'a',)], [('YQ==',)]), ([(1,), (1,)], [(1,)]),
                     ([('1.000000000000000001',)], [('1.000000000000000002',)])]:
            self.assertNotEqual(delta.digest(a), delta.digest(b))

    def test_schema_drift_missing_pk_missing_table_and_manifest_tenant_are_blocked(self):
        with sqlite3.connect(self.b) as db:
            db.execute(f"ALTER TABLE {TABLE} ADD COLUMN extra TEXT")
        report, _ = self.compare()
        self.assertIn('SCHEMA_CHANGED', report['tables'][0]['blockers'])
        with self.assertRaisesRegex(delta.ReconciliationError, 'INVALID_TABLE_SELECTION'):
            with delta.readonly(self.a) as a, delta.readonly(self.b) as b:
                delta.compare(a, b, self.manifest(self.a), self.manifest(self.b), 'b', [TABLE])
        bad = self.manifest(self.a)
        bad['tables'][TABLE]['source'] = delta.PROJECTS['b'] + ':public.orders'
        file = self.root / 'manifest.json'
        file.write_text(json.dumps(bad))
        with self.assertRaisesRegex(delta.ReconciliationError, 'PROJECT_MANIFEST_MISMATCH'):
            delta.load_manifest(file, 'a')

    def test_report_never_contains_customer_values_or_keys(self):
        with sqlite3.connect(self.b) as db:
            db.execute(f"UPDATE {TABLE} SET amount='private-value-not-for-report'")
        report, _ = self.compare()
        text = json.dumps(report)
        for private in ['private-value-not-for-report', 'tenant-one', 'stable-id', '1.000000000000000001']:
            self.assertNotIn(private, text)

    def test_no_primary_key_and_missing_table_are_not_blindly_replaced(self):
        for path in [self.a, self.b]:
            with sqlite3.connect(path) as db:
                db.execute('CREATE TABLE a_public__events(value TEXT)')
                db.execute("INSERT INTO a_public__events VALUES ('same')")
        docs = []
        for path in [self.a, self.b]:
            doc = self.manifest(path)
            doc['tables']['a_public__events'] = {'source': delta.PROJECTS['a'] + ':public.events', 'rows': 1, 'primaryKey': []}
            docs.append(doc)
        with delta.readonly(self.a) as a, delta.readonly(self.b) as b:
            report, _ = delta.compare(a, b, *docs, 'a')
        self.assertIn('NO_STABLE_PRIMARY_KEY', report['tables'][0]['blockers'])
        with sqlite3.connect(self.b) as db:
            db.execute('DROP TABLE a_public__events')
        with delta.readonly(self.a) as a, delta.readonly(self.b) as b:
            report, _ = delta.compare(a, b, *docs, 'a')
        self.assertIn('TABLE_SET_CHANGED', report['tables'][0]['blockers'])

    def test_empty_tables_change_digest_and_null_pk_is_rejected(self):
        with sqlite3.connect(self.b) as db:
            db.execute(f'DELETE FROM {TABLE}')
        report, plans = self.compare()
        target = self.target()
        self.apply(target, report, plans)
        with sqlite3.connect(target) as db:
            self.assertEqual(db.execute(f'SELECT count(*) FROM {TABLE}').fetchone()[0], 0)
        with sqlite3.connect(self.b) as db:
            db.execute(f"INSERT INTO {TABLE} VALUES(NULL,'null-key','1',NULL)")
        with self.assertRaisesRegex(delta.ReconciliationError, 'NULL_PRIMARY_KEY'):
            self.compare()

    def test_snapshot_connections_keep_stable_views_during_concurrent_change(self):
        with sqlite3.connect(self.b) as db:
            db.execute('PRAGMA journal_mode=WAL')
            # Initialize WAL/SHM with the writer before opening mode=ro. Merely
            # changing journal_mode does not create its companion files.
            db.execute(f'SELECT count(*) FROM {TABLE}').fetchone()
        snapshot = delta.readonly(self.b)
        before = delta.read_table(snapshot, TABLE)['digest']
        with sqlite3.connect(self.b) as db:
            db.execute(f"UPDATE {TABLE} SET amount='concurrent-new-value'")
        self.assertEqual(delta.read_table(snapshot, TABLE)['digest'], before)
        snapshot.close()
        with delta.readonly(self.b) as db:
            self.assertNotEqual(delta.read_table(db, TABLE)['digest'], before)

    def test_prepare_never_overwrites_or_writes_sensitive_copy_into_git(self):
        target = self.target()
        with self.assertRaises(FileExistsError):
            delta.prepare_local(self.a, target, 'a')
        (self.root / '.git').mkdir()
        with self.assertRaisesRegex(delta.ReconciliationError, 'OUTSIDE_GIT'):
            delta.prepare_local(self.a, self.root / 'secret.sqlite', 'a')

    def test_reverse_delta_restores_original_but_never_erases_newer_writes(self):
        with sqlite3.connect(self.b) as db:
            db.execute(f"UPDATE {TABLE} SET amount='modified'")
        report, plans = self.compare()
        target = self.target()
        self.apply(target, report, plans)
        with delta.readonly(self.b) as b, delta.readonly(self.a) as a:
            reverse, undo = delta.compare(b, a, self.manifest(self.b), self.manifest(self.a), 'a')
        self.apply(target, reverse, undo)
        with sqlite3.connect(target) as db, sqlite3.connect(self.a) as source:
            self.assertEqual(delta.read_table(db, TABLE)['digest'], delta.read_table(source, TABLE)['digest'])
        self.apply(target, report, plans)
        with sqlite3.connect(target) as db:
            db.execute(f"INSERT INTO {TABLE} VALUES('new-paid-order','new-id','500000',NULL)")
        with self.assertRaisesRegex(delta.ReconciliationError, 'TARGET_DRIFT'):
            self.apply(target, reverse, undo)
        with sqlite3.connect(target) as db:
            self.assertEqual(db.execute(f"SELECT count(*) FROM {TABLE} WHERE tenant='new-paid-order'").fetchone()[0], 1)

    def test_incompatible_export_encoding_or_corrupt_manifest_digest_is_rejected(self):
        before, after = self.manifest(self.a), self.manifest(self.b)
        after['representationVersion'] = 'pg-text-v1'
        with delta.readonly(self.a) as a, delta.readonly(self.b) as b:
            with self.assertRaisesRegex(delta.ReconciliationError, 'REPRESENTATION_MISMATCH'):
                delta.compare(a, b, before, after, 'a')
        after.pop('representationVersion')
        after['tables'][TABLE]['digest'] = '0' * 64
        with delta.readonly(self.a) as a, delta.readonly(self.b) as b:
            with self.assertRaisesRegex(delta.ReconciliationError, 'DIGEST_MISMATCH'):
                delta.compare(a, b, before, after, 'a')


if __name__ == '__main__':
    unittest.main()
