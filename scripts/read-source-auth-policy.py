#!/usr/bin/env python3
"""Owner-approved read-only A/B Auth audit; secrets never enter files/logs.

Existing service_role stays RAM-only. Selected migration Auth/provider settings
may be retained as one JSON value per project in macOS Keychain. No provider
configuration, role, API key or Worker secret is created/changed.
"""
import base64
import datetime
import importlib.util
import hashlib
import json
from pathlib import Path
import subprocess
import re
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
PARENT = ROOT.parent
PROJECTS = {'a': 'vsxxgdzwtscuxcmjfckt', 'b': 'pppiqhkectojxbmhqcnx'}
SAFE_CONFIG = ['external_email_enabled', 'external_google_enabled', 'external_anonymous_users_enabled',
               'disable_signup', 'mailer_autoconfirm', 'phone_autoconfirm', 'external_google_skip_nonce_check',
               'security_captcha_enabled', 'jwt_exp', 'refresh_token_rotation_enabled',
               'security_refresh_token_reuse_interval', 'sessions_timebox', 'sessions_inactivity_timeout',
               'sessions_single_per_user', 'password_min_length', 'password_required_characters',
               'otp_exp', 'site_url', 'uri_allow_list']
SENSITIVE_CONFIG = ['external_google_client_id', 'external_google_secret', 'jwt_secret']


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None


def get_json(url, headers):
    request = urllib.request.Request(url, headers=headers, method='GET')
    with urllib.request.build_opener(NoRedirect).open(request, timeout=45) as response:
        raw = response.read(1024 * 1024 + 1)
    if len(raw) > 1024 * 1024:
        raise ValueError('BOUNDED_AUTH_RESPONSE_EXCEEDED')
    return json.loads(raw)


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    loaded = importlib.util.module_from_spec(spec); spec.loader.exec_module(loaded)
    return loaded


def encode_config(value):
    document = json.dumps(value, sort_keys=True, separators=(',', ':')).encode()
    if len(document) > 65536:
        raise ValueError('BOUNDED_AUTH_CONFIG_EXCEEDED')
    text = base64.b64encode(document).decode('ascii')
    parts = [text[offset:offset + 96] for offset in range(0, len(text), 96)]
    return parts, 'v2:' + str(len(parts)) + ':' + hashlib.sha256(document).hexdigest()


def keychain_read(service, account):
    read = subprocess.run(['/usr/bin/security', 'find-generic-password', '-w', '-s', service, '-a', account], capture_output=True, text=True, timeout=15)
    if read.returncode == 44:
        return None
    if read.returncode:
        raise ValueError('KEYCHAIN_READ_UNAVAILABLE')
    return read.stdout.rstrip('\r\n')


def keychain_insert(service, account, value):
    # Observed security CLI truncates interactive stdin values at128bytes on
    # this Mac. Keep ASCII cache chunks below that boundary; never use argv.
    if len(value.encode('ascii')) > 96:
        raise ValueError('BOUNDED_KEYCHAIN_CHUNK_REQUIRED')
    old = keychain_read(service, account)
    if old is not None:
        if old != value:
            raise ValueError('EXISTING_LOCAL_AUTH_POLICY_DIFFERS_NO_OVERWRITE')
        return
    result = subprocess.run(['/usr/bin/security', 'add-generic-password', '-s', service, '-a', account, '-w'],
                            input=value + '\n' + value + '\n', capture_output=True, text=True, timeout=20)
    if result.returncode:
        raise ValueError('KEYCHAIN_SAVE_UNAVAILABLE')
    if keychain_read(service, account) != value:
        raise ValueError('KEYCHAIN_READBACK_UNAVAILABLE')


def retain_config(project, value):
    # The earlier128byte CLI cache entries stay unused; never overwrite them.
    service = 'com.theanhmarketing.cloudflare-migration.source-auth-policy.v2.' + project
    account = PROJECTS[project]
    parts, manifest = encode_config(value)
    for number, chunk in enumerate(parts):
        keychain_insert(service + '.part' + str(number).zfill(3), account, chunk)
    keychain_insert(service + '.manifest', account, manifest)
    actual = ''.join(keychain_read(service + '.part' + str(i).zfill(3), account) or '' for i in range(len(parts)))
    document = base64.b64decode(actual, validate=True)
    if hashlib.sha256(document).hexdigest() != manifest.split(':')[-1] or json.loads(document) != value:
        raise ValueError('KEYCHAIN_READBACK_UNAVAILABLE')
    return True


def read_retained_config(project):
    if project not in PROJECTS:
        raise ValueError('SOURCE_PROJECT_REQUIRED')
    service = 'com.theanhmarketing.cloudflare-migration.source-auth-policy.v2.' + project
    account = PROJECTS[project]
    manifest = keychain_read(service + '.manifest', account)
    match = re.fullmatch(r'v2:([1-9][0-9]{0,3}):([a-f0-9]{64})', manifest or '')
    if not match or int(match.group(1)) > 1024:
        raise ValueError('KEYCHAIN_READBACK_UNAVAILABLE')
    parts = [keychain_read(service + '.part' + str(i).zfill(3), account) for i in range(int(match.group(1)))]
    if any(not isinstance(part, str) or not 1 <= len(part) <= 96 for part in parts):
        raise ValueError('KEYCHAIN_READBACK_UNAVAILABLE')
    raw = base64.b64decode(''.join(parts), validate=True)
    if len(raw) > 65536 or hashlib.sha256(raw).hexdigest() != match.group(2):
        raise ValueError('KEYCHAIN_READBACK_UNAVAILABLE')
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError('KEYCHAIN_READBACK_UNAVAILABLE')
    return value


def summarize_config(config):
    # Never emit URLs, client IDs, secret values or arbitrary provider fields.
    keys = ['external_email_enabled', 'external_google_enabled', 'external_anonymous_users_enabled',
            'disable_signup', 'mailer_autoconfirm', 'security_captcha_enabled', 'jwt_exp',
            'refresh_token_rotation_enabled', 'security_refresh_token_reuse_interval',
            'sessions_timebox', 'sessions_inactivity_timeout', 'sessions_single_per_user', 'password_min_length']
    result = {}
    for name in keys:
        value = config.get(name)
        if name in config and (value is None or type(value) in [bool, int, float]):
            result[name] = value
    result.update({name + '_present': isinstance(config.get(name), str) and bool(config[name]) for name in SENSITIVE_CONFIG})
    client = config.get('external_google_client_id')
    secret = config.get('external_google_secret')
    result['googleSingleClientShapeCompatible'] = isinstance(client, str) and re.fullmatch(r'[A-Za-z0-9_-]+\.apps\.googleusercontent\.com', client) is not None
    result['googleSecretLooksUnredacted'] = isinstance(secret, str) and len(secret) >= 12 and not re.search(r'\*{3,}|redacted|hidden|placeholder', secret, re.I)
    return result


def main():
    sealed = module('sealed_auth_policy', ROOT / 'scripts/export-sealed-source-snapshot.py')
    token = sealed.keychain('pat', 'theanh-cloudflare-migration-supabase-scoped-pat')
    results = {}
    for project, ref in PROJECTS.items():
        row = {'sourceProject': ref}
        try:
            row['stage'] = 'existing-api-key-read'
            entries = get_json('https://api.supabase.com/v1/projects/' + ref + '/api-keys?reveal=true', {'Authorization': 'Bearer ' + token})
            keys = [entry.get('api_key') for entry in entries if isinstance(entry, dict) and entry.get('name') == 'service_role'] if isinstance(entries, list) else []
            if len(keys) != 1 or not isinstance(keys[0], str) or not keys[0]:
                raise ValueError('SOURCE_SERVICE_KEY_UNAVAILABLE')
            key = keys[0]
            claims = json.loads(base64.urlsafe_b64decode(key.split('.')[1] + '==='))
            if claims.get('role') != 'service_role' or claims.get('ref') != ref:
                raise ValueError('SOURCE_SERVICE_KEY_NAMESPACE_UNVERIFIED')
            row['serviceRoleReadIntoMemoryOnly'] = True
            row['stage'] = 'public-auth-settings'
            public = get_json('https://' + ref + '.supabase.co/auth/v1/settings', {'apikey': key, 'Authorization': 'Bearer ' + key})
            external = public.get('external', {})
            row['publicProviderFlags'] = {k: v for k, v in external.items() if type(v) is bool} if isinstance(external, dict) else {}
            jwks = get_json('https://' + ref + '.supabase.co/auth/v1/.well-known/jwks.json', {'apikey': key})
            public_keys = jwks.get('keys', [])
            row['publicSigningKeyCount'] = len(public_keys)
            row['publicSigningAlgorithms'] = sorted({k['alg'] for k in public_keys if k.get('alg') in ['ES256', 'RS256']})
            del key, keys, entries, claims
            try:
                row['stage'] = 'private-auth-config-read'
                config = get_json('https://api.supabase.com/v1/projects/' + ref + '/config/auth', {'Authorization': 'Bearer ' + token})
                if not isinstance(config, dict):
                    raise ValueError('SOURCE_AUTH_CONFIG_UNAVAILABLE')
                selected = {k: config[k] for k in SAFE_CONFIG + SENSITIVE_CONFIG if k in config}
                selected['public_jwks'] = jwks
                row['configSummary'] = summarize_config(config)
                row['stage'] = 'local-keychain-retain'
                row['selectedConfigRetainedInKeychain'] = retain_config(project, selected)
                row['configSummary'] = summarize_config(config)
                row['privateConfigStatus'] = 'READ_AND_KEYCHAIN_READBACK_VERIFIED'
                row['stage'] = 'complete'
                del config, selected
            except urllib.error.HTTPError as error:
                row['privateConfigStatus'] = 'UNAVAILABLE'
                row['privateConfigHttpStatus'] = error.code
        except Exception as error:
            row['status'] = 'AUTH_POLICY_READ_UNAVAILABLE_PRIVATE_DETAILS_WITHHELD'
            row['errorType'] = type(error).__name__
            safe_codes = ['SOURCE_SERVICE_KEY_UNAVAILABLE', 'SOURCE_SERVICE_KEY_NAMESPACE_UNVERIFIED',
                          'SOURCE_AUTH_CONFIG_UNAVAILABLE', 'KEYCHAIN_READ_UNAVAILABLE', 'KEYCHAIN_SAVE_UNAVAILABLE',
                          'KEYCHAIN_READBACK_UNAVAILABLE', 'EXISTING_LOCAL_AUTH_POLICY_DIFFERS_NO_OVERWRITE']
            if isinstance(error, ValueError) and str(error) in safe_codes:
                row['safeCode'] = str(error)
            row['httpStatus'] = error.code if isinstance(error, urllib.error.HTTPError) else None
        results[project] = row
    report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'projects': results,
              'serviceRoleKeysPersisted': False, 'productionWritten': False, 'workerSecretsChanged': False, 'readyForCutover': False}
    (ROOT / 'reports/cloudflare-phase2-20261018/source-auth-policy.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    try:
        if sys.argv[1:] == ['--local-summary']:
            report_path = ROOT / 'reports/cloudflare-phase2-20261018/source-auth-policy.json'
            report = json.loads(report_path.read_text())
            for project in PROJECTS:
                report['projects'][project]['configSummary'] = summarize_config(read_retained_config(project))
            report['keychainLocalReadbackAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            report_path.write_text(json.dumps(report, indent=2) + '\n')
            print(json.dumps(report))
        elif not sys.argv[1:]:
            main()
        else:
            raise ValueError('READ_ONLY_AUTH_MODE_REQUIRED')
    except Exception:
        print(json.dumps({'status': 'AUTH_POLICY_READ_UNAVAILABLE_PRIVATE_DETAILS_WITHHELD', 'productionWritten': False, 'readyForCutover': False}))
        sys.exit(2)
