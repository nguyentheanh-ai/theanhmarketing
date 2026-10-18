import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('live_lms', Path(__file__).with_name('verify-live-lms-rpc-parity.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class LiveLmsSqlTests(unittest.TestCase):
    def test_missing_execution_or_read_only_permission_stops_before_rpc(self):
        m.assert_rpc_permission({'read_only': True, 'can_execute_rpc': True})
        for row in [{}, {'read_only': True, 'can_execute_rpc': False}, {'read_only': False, 'can_execute_rpc': True}]:
            with self.assertRaises(PermissionError):
                m.assert_rpc_permission(row)

    def test_one_read_statement_same_mvcc_and_transaction_clock(self):
        catalog = [{'s': 'public', 't': 'orders', 'pk': ['id'], 'cols': [{'n': 'id', 'ty': 'uuid'}]}]
        sql = m.oracle_sql(catalog)
        self.assertTrue(sql.startswith('WITH snapshot_doc AS MATERIALIZED'))
        self.assertNotIn(';', sql)
        self.assertIn("'capturedAt',transaction_timestamp()", sql)
        self.assertNotIn('statement_timestamp()', sql)
        self.assertIn('public.student_lms_enrollments_scoped(u.id,u.email,s.slug)::text', sql)
        self.assertIn("current_setting('transaction_read_only')", sql)
        self.assertIn('jsonb_array_elements', sql)
        self.assertNotIn('GRANT ', sql)
        self.assertNotIn('UPDATE ', sql)


if __name__ == '__main__':
    unittest.main()
