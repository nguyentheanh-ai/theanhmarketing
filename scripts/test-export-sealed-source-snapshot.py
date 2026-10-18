import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('sealed', Path(__file__).with_name('export-sealed-source-snapshot.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class SealedArchiveTests(unittest.TestCase):
    def archive(self):
        return {'manifest': {'header': {'project': 'a'}, 'totalRows': 2}, 'manifestMac': 'fixture-mac', 'records': [
            {'table': 'a_auth__users', 'rowId': 'opaque-one', 'valueMac': 'keyed-one', 'envelope': 'encrypted-fixture-one'},
            {'table': 'a_auth__users', 'rowId': 'opaque-two', 'valueMac': 'keyed-two', 'envelope': 'encrypted-fixture-two'}]}

    def test_exclusive_0600_sqlite_roundtrip_and_no_source_values(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / 'archive'
            archive = self.archive()
            path = m.persist_archive(target, archive)
            self.assertEqual(m.read_archive(path), archive)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)
            with self.assertRaises(FileExistsError):
                m.persist_archive(target, archive)
            with sqlite3.connect(path) as db:
                self.assertEqual(db.execute('SELECT count(*) FROM sealed_rows').fetchone()[0], 2)

    def test_secure_sql_includes_auth_storage_and_preserves_sensitive_columns_for_local_sealing(self):
        catalog = [{'s': 'auth', 't': 'users', 'pk': ['id'], 'cols': [{'n': 'id', 'ty': 'uuid'}, {'n': 'encrypted_password', 'ty': 'text'}]}]
        with self.assertRaises(ValueError):
            m.app.snapshot_sql('a', catalog)
        sql = m.app.snapshot_sql('a', catalog, sealed_archive=True)
        self.assertIn('"encrypted_password"::text', sql)
        self.assertIn("'auth'", sql)
        self.assertIn("'storage'", sql)
        self.assertNotIn(';', sql)
        self.assertNotIn('GRANT', sql)

    def test_helper_never_emits_unsealed_input(self):
        secret = 'fixture-only-master-key-12345678901234567890'
        payload = {'snapshot': '1:2:', 'capturedAt': '2026-10-18T11:30:00Z',
            'catalog': [{'s': 'auth', 't': 'users', 'pk': ['id'], 'cols': [{'n': 'id', 'ty': 'uuid'}, {'n': 'encrypted_password', 'ty': 'text'}]}],
            'tables': {'a_auth__users': {'count': 1, 'rows': [['fixture-user-identity', 'fixture-hash-not-plain-password']]}}}
        archive = m.helper('seal', secret, 'a', payload)
        text = json.dumps(archive)
        self.assertNotIn('fixture-user-identity', text)
        self.assertNotIn('fixture-hash-not-plain-password', text)
        self.assertNotIn(secret, text)
        self.assertTrue(m.helper('verify', secret, 'a', archive)['ok'])


if __name__ == '__main__':
    unittest.main()
