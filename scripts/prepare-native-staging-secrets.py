"""Internal crypto keys for exact staging A only. Never prints key material."""
import argparse
import base64
import importlib.util
import json
from pathlib import Path
import re
import secrets
import urllib.request
import urllib.error

ACCOUNT = "8035ac71ae1041614760882f4b8862b2"
WORKER = "theanh-main-cf-staging"
DATABASE = "694139c9-6cda-4b8c-9228-c973dbcbb719"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply-staging", action="store_true")
    args = parser.parse_args()
    if not args.apply_staging:
        raise RuntimeError("Explicit --apply-staging required")
    auth = Path.home() / "Library/Preferences/.wrangler/config/default.toml"
    match = re.search(r'^oauth_token\s*=\s*"([^"\r\n]+)"', auth.read_text(), re.M)
    if not match:
        raise RuntimeError("Cloudflare OAuth unavailable")
    token = match.group(1)
    def call(path, method="GET", body=None):
        request = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT + path,
            method=method, headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
            data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError("Cloudflare request rejected: HTTP " + str(error.code)) from None
        if result.get("success") is not True:
            raise RuntimeError("Cloudflare request unsuccessful")
        return result["result"]
    rows = call("/d1/database/" + DATABASE + "/query", "POST", {"batch": [{"sql": "SELECT count(*) AS accounts FROM d1_auth_accounts;", "params": []}]})
    if len(rows) != 1 or rows[0].get("success") is not True or rows[0]["results"][0]["accounts"] != 0:
        raise RuntimeError("Keys may only be prepared before any Auth account import")
    remote = call("/workers/scripts/" + WORKER + "/secrets")
    existing = {entry["name"] for entry in remote}
    helper = Path(__file__).resolve().parents[2] / "scripts/backup-secrets.py"
    spec = importlib.util.spec_from_file_location("staging_keychain", helper)
    keychain = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(keychain)
    checked = []
    for name, suffix in [("NATIVE_AUTH_CREDENTIAL_KEY", "credential"), ("NATIVE_AUTH_LIMITER_KEY", "limiter")]:
        slot = "native-a-" + suffix
        keychain.ACCOUNTS[slot] = WORKER + "-" + suffix
        value = keychain.keychain_get(slot)
        if value is None:
            if name in existing:
                raise RuntimeError("Existing remote key lacks local recovery copy; no rotation performed")
            value = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
            keychain.keychain_add(slot, value)
        if not re.fullmatch(r"[A-Za-z0-9_-]{43}", value):
            raise RuntimeError("Invalid local crypto key; no rotation performed")
        if name not in existing:
            call("/workers/scripts/" + WORKER + "/secrets", "PUT", {"name": name, "type": "secret_text", "text": value})
        checked.append(name)
    names = {entry["name"] for entry in call("/workers/scripts/" + WORKER + "/secrets")}
    if not set(checked).issubset(names):
        raise RuntimeError("Secret metadata readback incomplete")
    print(json.dumps({"status": "PREPARED", "worker": WORKER, "secretNames": checked,
        "limits": "Metadata presence only; no ciphertext roundtrip or Auth account import"}))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # No traceback, response body, token, key or raw Keychain error output.
        message = str(error) if isinstance(error, RuntimeError) else "Staging secret preparation unavailable"
        print(json.dumps({"status": "FAILED", "message": message}))
        raise SystemExit(1)
