import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('rpc_window', Path(__file__).with_name('verify-source-lms-rpc-window.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


def fixture(expiry=None):
    return {'capturedAt': '2026-10-18 12:00:00.123456+00',
            'catalog': [{'s': 'crm_v2', 't': 'enrollments', 'cols': [{'n': 'expires_at'}]}],
            'tables': {'a_crm_v2__enrollments': {'rows': [[expiry]]}}}


class WindowTests(unittest.TestCase):
    def test_timestamp_retains_microseconds_and_offset(self):
        value = m.timestamp('2026-10-18 12:00:00.123456+00')
        self.assertEqual(value.microsecond, 123456)
        self.assertEqual(value.utcoffset().total_seconds(), 0)

    def test_endpoint_guard_rejects_delta_reverse_clock_and_expiry_boundary(self):
        before, after = fixture(), fixture()
        after['capturedAt'] = '2026-10-18T12:01:00Z'
        unchanged = {'tables': [{'inserted': 0, 'updated': 0, 'removed': 0}]}
        m.assert_window_endpoints(before, after, unchanged)
        for field in ['inserted', 'updated', 'removed']:
            changed = {'tables': [{**unchanged['tables'][0], field: 1}]}
            with self.assertRaisesRegex(ValueError, 'SOURCE_INPUT_CHANGED'):
                m.assert_window_endpoints(before, after, changed)
        for expiry in [before['capturedAt'], after['capturedAt']]:
            with self.assertRaisesRegex(ValueError, 'EXPIRY_CROSSED'):
                m.assert_window_endpoints(fixture(expiry), after, unchanged)
        with self.assertRaisesRegex(ValueError, 'CLOCK'):
            m.assert_window_endpoints(after, before, unchanged)

    def test_selection_is_bounded_and_prioritizes_qa_and_progress(self):
        tables = {
            ('auth', 'users'): [{'id': str(i), 'email': f'fixture{i}@example.invalid', 'email_confirmed_at': 'confirmed', 'raw_app_meta_data': '{}'} for i in range(9)],
            ('crm_v2', 'course_progress'): [{'enrollment_id': 'done'}],
            ('crm_v2', 'enrollments'): [{'id': 'done', 'user_id': '7', 'metadata': '{}'}],
            ('crm_v2', 'contacts'): [],
        }
        tables[('auth', 'users')][0]['raw_app_meta_data'] = '{"admin_role":"owner"}'
        from unittest.mock import patch
        with patch.object(m, 'table_rows', side_effect=lambda payload, schema, table: tables[(schema, table)]):
            selected = m.subjects({}, 'FIXTURE8@example.invalid')
        self.assertEqual([u['id'] for u in selected[:2]], ['8', '7'])
        self.assertEqual(len(selected), 5)
        self.assertNotIn('0', [u['id'] for u in selected])


if __name__ == '__main__':
    unittest.main()
