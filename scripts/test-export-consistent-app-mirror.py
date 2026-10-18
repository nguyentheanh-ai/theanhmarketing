import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-consistent-app-mirror.py'))
e = importlib.util.module_from_spec(spec); spec.loader.exec_module(e)


class ExportTests(unittest.TestCase):
    def fixture(self):
        catalog = [{'s': 'public', 't': 'orders', 'pk': ['id'], 'cols': [
            {'n': 'id', 'ty': 'uuid'}, {'n': 'amount', 'ty': 'numeric'},
            {'n': 'paid', 'ty': 'boolean'}, {'n': 'token', 'ty': 'text'}]}]
        payload = {'catalog': catalog, 'snapshot': '1:2:', 'capturedAt': '2026-10-18T00:00:00Z',
                   'tables': {'a_public__orders': {'count': 1, 'rows': [['uuid-original', '1.000000000000000001', 'true', None]]}}}
        return catalog, payload

    def test_single_statement_includes_catalog_counts_and_rows_but_no_writes(self):
        catalog, _ = self.fixture()
        sql = e.snapshot_sql('a', catalog)
        self.assertNotIn(';', sql)
        for required in ['pg_current_snapshot()', 'statement_timestamp()', 'count(*)', 'jsonb_agg(', '"public"."orders"']:
            self.assertIn(required, sql)
        self.assertNotIn('"token"::text', sql)
        self.assertNotIn('UPDATE ', sql)
        self.assertNotIn('INSERT ', sql)
        self.assertIn('key.ord<=i.indnkeyatts', sql)

    def test_wide_table_does_not_exceed_function_argument_limit(self):
        table = {'s': 'public', 't': 'wide', 'pk': [], 'cols': [{'n': 'col_' + str(i), 'ty': 'text'} for i in range(130)]}
        sql = e.snapshot_sql('a', [table])
        self.assertEqual(sql.count('jsonb_build_array('), 3)
        with self.assertRaises(ValueError):
            e.snapshot_sql('b', [dict(table, s='crm_v2')])

    def test_roundtrip_preserves_numeric_uuid_bool_and_marks_partial_secret_fields(self):
        catalog, payload = self.fixture()
        with tempfile.TemporaryDirectory() as temp:
            out = Path(temp) / 'snapshot'
            manifest = e.write_snapshot('a', catalog, payload, out)
            with sqlite3.connect(out / 'copy.sqlite') as db:
                row = db.execute('SELECT * FROM a_public__orders').fetchone()
            self.assertEqual(row, ('uuid-original', '1.000000000000000001', 1, None))
            self.assertEqual(manifest['redactedColumns'], {'a_public__orders': ['token']})
            self.assertEqual(manifest['tables']['a_public__orders']['rows'], 1)
            self.assertFalse(manifest['readyForCutover'])
            self.assertEqual((out / 'copy.sqlite').stat().st_mode & 0o777, 0o600)
            self.assertNotIn('uuid-original', json.dumps(manifest))
            with self.assertRaises(FileExistsError):
                e.write_snapshot('a', catalog, payload, out)

    def test_schema_drift_truncation_and_missing_redaction_are_rejected(self):
        for case in ['schema', 'count', 'secret']:
            catalog, payload = self.fixture()
            payload = json.loads(json.dumps(payload))
            if case == 'schema':
                payload['catalog'][0]['cols'].append({'n': 'new_column', 'ty': 'text'})
            elif case == 'count':
                payload['tables']['a_public__orders']['count'] = 2
            else:
                payload['tables']['a_public__orders']['rows'][0][3] = 'secret-fixture-never-copy'
            with tempfile.TemporaryDirectory() as temp:
                with self.assertRaises(ValueError):
                    e.write_snapshot('a', catalog, payload, Path(temp) / 'snapshot')

    def test_invalid_identifier_and_nonfinite_or_nontext_cells_fail_closed(self):
        with self.assertRaises(ValueError):
            e.identifier('orders;drop table users')
        for value, ty in [('Infinity', 'double precision'), ('truthy', 'boolean'), (1.25, 'numeric')]:
            with self.assertRaises(ValueError):
                e.convert(value, ty)


if __name__ == '__main__':
    unittest.main()
