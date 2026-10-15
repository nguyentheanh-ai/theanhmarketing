"""Local SQLite race checks for QA marker promotion; no remote access."""
import importlib.util
from pathlib import Path
import sqlite3
import unittest

spec = importlib.util.spec_from_file_location('qa_import', Path(__file__).parents[1] / 'scripts/prepare-qa-auth-import.py')
qa_import = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa_import)

class LogoutMarkerGuard(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.executescript('''
          CREATE TABLE d1_auth_session_security_operations(id TEXT PRIMARY KEY,project_id TEXT,user_id TEXT,kind TEXT,expected_version INTEGER,target_version INTEGER,status TEXT);
          CREATE TABLE d1_auth_credential_operations(id TEXT);
          CREATE TABLE d1_auth_refresh_families(revoked_at TEXT);
          INSERT INTO d1_auth_session_security_operations VALUES('op1','fixture-project','fixture-user','global_logout',1,2,'done');
        ''')
        self.snapshot = self.db.execute(qa_import.QA_LOGOUT_OPERATIONS_JSON_SQL).fetchone()[0]

    def tearDown(self):
        self.db.close()

    def matches(self):
        return self.db.execute('SELECT ' + qa_import.QA_LOGOUT_MARKER_GUARD, [None] * 21 + [self.snapshot]).fetchone()[0] == 1

    def test_verified_snapshot_allows_marker_then_new_logout_denies_stale_promotion(self):
        self.assertTrue(self.matches())
        self.db.execute("INSERT INTO d1_auth_session_security_operations VALUES('op2','fixture-project','fixture-user','global_logout',2,3,'done')")
        self.assertFalse(self.matches())

    def test_in_place_status_change_is_not_hidden_by_same_row_count(self):
        self.db.execute("UPDATE d1_auth_session_security_operations SET status='pending'")
        self.assertFalse(self.matches())

    def test_credentials_and_active_refresh_family_each_deny(self):
        self.db.execute("INSERT INTO d1_auth_credential_operations VALUES('changed')")
        self.assertFalse(self.matches())
        self.db.execute('DELETE FROM d1_auth_credential_operations')
        self.db.execute('INSERT INTO d1_auth_refresh_families VALUES(NULL)')
        self.assertFalse(self.matches())
        self.db.execute("UPDATE d1_auth_refresh_families SET revoked_at='2026-10-15T00:00:00Z'")
        self.assertTrue(self.matches())

if __name__ == '__main__':
    unittest.main()
