import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('contract', Path(__file__).with_name('verify-source-lms-rpc.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class RpcContractTests(unittest.TestCase):
    def test_sql_tokens_preserve_literals_identifiers_and_boundaries(self):
        self.assertEqual(m.sql_tokens(" SELECT x FROM t -- outside\nWHERE x='--kept' "),
                         m.sql_tokens("select x from t /* outside */ where x = '--kept'"))
        self.assertNotEqual(m.sql_tokens('select a b'), m.sql_tokens('select ab'))
        self.assertNotEqual(m.sql_tokens("select 'Published'"), m.sql_tokens("select 'published'"))
        self.assertNotEqual(m.sql_tokens('select "ID"'), m.sql_tokens('select "id"'))

    def test_all_security_and_definition_checks_required(self):
        row = {'body': 'select 1', 'language': 'sql', 'volatility': 's', 'security_definer': False,
               'argument_types': 'uuid, text, text', 'argument_names': ['p_user_id', 'p_email', 'p_course_slug'],
               'result_type': 'jsonb', 'config': ['search_path=""'], 'anon_execute': False,
               'authenticated_execute': False, 'service_execute': True, 'transaction_read_only': 'on'}
        self.assertEqual(m.compare_contract(row, 'SELECT 1')['status'], 'TESTED_SOURCE_LMS_RPC_CONTRACT')
        for key, value in [('body', 'select 2'), ('security_definer', True), ('anon_execute', True),
                           ('authenticated_execute', True), ('transaction_read_only', 'off'), ('config', ['search_path=public'])]:
            result = m.compare_contract(dict(row, **{key: value}), 'SELECT 1')
            self.assertEqual(result['status'], 'BLOCKED_SOURCE_RPC_CONTRACT_DRIFT')
            self.assertNotIn('body', result)
            self.assertFalse(result['readyForCutover'])


if __name__ == '__main__':
    unittest.main()
