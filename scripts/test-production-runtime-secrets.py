import contextlib
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('runtime', Path(__file__).with_name('restore-production-runtime-secrets.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class RuntimeSecretSafety(unittest.TestCase):
    def test_default_plan_has_no_external_operations(self):
        with patch.object(m.sys, 'argv', ['script']), patch.object(m, 'keychain_get') as get, patch.object(m, 'put_secret') as put, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(m.main(), 0)
            get.assert_not_called()
            put.assert_not_called()

    def test_retry_reuses_saved_values_without_rotation(self):
        saved = 'synthetic-existing-value'
        output = io.StringIO()
        with patch.object(m.sys, 'argv', ['script', '--apply']), patch.object(m, 'keychain_get', return_value=saved), patch.object(m, 'keychain_save') as save, patch.object(m, 'existing_resend_secret') as fetch, patch.object(m, 'put_secret') as put, contextlib.redirect_stdout(output):
            self.assertEqual(m.main(), 0)
            save.assert_not_called()
            fetch.assert_not_called()
            self.assertEqual(put.call_count, 4)
            self.assertNotIn(saved, output.getvalue())

    def test_failure_stops_and_redacts_exception(self):
        output = io.StringIO()
        with patch.object(m.sys, 'argv', ['script', '--apply']), patch.object(m, 'keychain_get', side_effect=RuntimeError('synthetic-sensitive-detail')), patch.object(m, 'put_secret') as put, contextlib.redirect_stderr(output):
            self.assertEqual(m.main(), 1)
            put.assert_not_called()
            self.assertNotIn('synthetic-sensitive-detail', output.getvalue())

    def test_wrangler_receives_secret_only_on_stdin(self):
        value = 'synthetic-secret-on-stdin'
        result = type('Result', (), {'returncode': 0})()
        with patch.object(m.subprocess, 'run', return_value=result) as run:
            m.put_secret('theanh-main-cf-production', 'CRON_SECRET', value)
            args, kwargs = run.call_args
            self.assertNotIn(value, args[0])
            self.assertEqual(kwargs['input'], value + '\n')
            self.assertTrue(kwargs['capture_output'])
            self.assertEqual(kwargs['env']['WRANGLER_WRITE_LOGS'], 'false')
            self.assertEqual(kwargs['env']['WRANGLER_LOG_SANITIZE'], 'true')

    def test_b_uses_environment_name_without_suffixing_explicit_name(self):
        result = type('Result', (), {'returncode': 0})()
        with patch.object(m.subprocess, 'run', return_value=result) as run:
            m.put_secret('theanh-student-cf-production', 'CRON_SECRET', 'synthetic')
            cmd = run.call_args.args[0]
            self.assertNotIn('--name', cmd)
            self.assertEqual(cmd[cmd.index('--env') + 1], 'production')
            self.assertEqual(cmd[cmd.index('--config') + 1], str(m.B / 'wrangler.jsonc'))

    def test_targeted_retry_does_not_touch_a(self):
        with patch.object(m.sys, 'argv', ['script', '--apply', '--only-worker', 'theanh-student-cf-production']), patch.object(m, 'keychain_get', return_value='synthetic'), patch.object(m, 'put_secret') as put, contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(m.main(), 0)
            put.assert_called_once_with('theanh-student-cf-production', 'CRON_SECRET', 'synthetic')

if __name__ == '__main__':
    unittest.main()
