import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('audit_storage', Path(__file__).with_name('audit-private-storage-a.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class PrivateStorageTests(unittest.TestCase):
    def test_no_mutation_operations_allowed(self):
        for operation in [('r2', 'object', 'put'), ('r2', 'object', 'delete'), ('r2', 'bucket', 'create')]:
            with self.assertRaises(ValueError):
                m.cli(*operation)

    def test_exact_bytes_and_cleanup_on_success_or_failure(self):
        content = b'private synthetic fixture'
        record = {'file': 'a' * 64, 'sha256': hashlib.sha256(content).hexdigest(), 'bytes': len(content)}
        with tempfile.TemporaryDirectory() as directory:
            def runner(*args):
                self.assertEqual(args[:3], ('r2', 'object', 'get'))
                self.assertIn('--remote', args)
                Path(args[-1]).write_bytes(content)
            self.assertEqual(m.remote_bytes(record, directory, runner), len(content))
            self.assertEqual(list(Path(directory).iterdir()), [])
            with self.assertRaises(ValueError):
                m.remote_bytes(dict(record, sha256='b' * 64), directory, runner)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_invalid_mapping_cannot_create_a_temp_file_or_call_provider(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                m.remote_bytes({'file': '../source', 'sha256': 'a' * 64, 'bytes': 0}, directory,
                               lambda *args: self.fail('provider must not be called'))
            self.assertEqual(list(Path(directory).iterdir()), [])


if __name__ == '__main__':
    unittest.main()
