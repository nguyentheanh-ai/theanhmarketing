import importlib.util
from pathlib import Path
import unittest
import base64
import json
import hashlib
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('auth_policy', Path(__file__).with_name('read-source-auth-policy.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)


class AuthPolicyTests(unittest.TestCase):
    def test_large_configuration_roundtrips_through_bounded_ascii_chunks(self):
        value = {'private': 'synthetic-only' * 1000, 'text': 'Tiếng Việt'}
        parts, manifest = m.encode_config(value)
        self.assertTrue(all(len(v.encode('ascii')) <= 96 for v in parts))
        raw = base64.b64decode(''.join(parts), validate=True)
        self.assertEqual(json.loads(raw), value)
        self.assertEqual(manifest, 'v2:' + str(len(parts)) + ':' + hashlib.sha256(raw).hexdigest())
        values = {'.manifest': manifest, **{'.part' + str(i).zfill(3): part for i, part in enumerate(parts)}}
        with patch.object(m, 'keychain_read', side_effect=lambda service, account: next((value for suffix, value in values.items() if service.endswith(suffix)), None)):
            self.assertEqual(m.read_retained_config('a'), value)
        values['.part000'] = 'A' * len(values['.part000'])
        with patch.object(m, 'keychain_read', side_effect=lambda service, account: next((value for suffix, value in values.items() if service.endswith(suffix)), None)):
            with self.assertRaises(ValueError):
                m.read_retained_config('a')

    def test_summary_cannot_emit_credentials_or_urls(self):
        raw = {'external_google_client_id': 'synthetic-client.apps.googleusercontent.com', 'external_google_secret': 'synthetic-secret', 'jwt_secret': 'synthetic-jwt', 'site_url': 'https://private.example.invalid', 'external_google_enabled': True, 'jwt_exp': 3600, 'smtp_pass': 'synthetic-smtp', 'sessions_timebox': None}
        result = m.summarize_config(raw)
        self.assertTrue(result['external_google_secret_present'])
        self.assertTrue(result['external_google_enabled'])
        self.assertEqual(result['jwt_exp'], 3600)
        self.assertFalse(any(v in str(result) for v in ['synthetic', 'private.example', 'smtp_pass']))

    def test_summary_rejects_wrong_typed_policy_values(self):
        result = m.summarize_config({'jwt_exp': 'credential-must-not-print', 'external_google_enabled': {'token': 'sensitive'}})
        self.assertNotIn('jwt_exp', result)
        self.assertNotIn('external_google_enabled', result)


if __name__ == '__main__':
    unittest.main()
