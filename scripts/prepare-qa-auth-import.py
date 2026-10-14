"""Prepare one previously authorized QA account in memory; no remote writes."""
import importlib.util
import argparse
import datetime
import json
from pathlib import Path
import re
import subprocess
import urllib.request
import urllib.error

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply-staging", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("qa_keychain", root.parent / "scripts/backup-secrets.py")
    keychain = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(keychain)
    pat = keychain.keychain_get("pat")
    keychain.ACCOUNTS["native-a-credential"] = "theanh-main-cf-staging-credential"
    key = keychain.keychain_get("native-a-credential")
    if not pat or not key:
        raise RuntimeError("Required Keychain entry unavailable")
    qa = json.loads(Path("/private/tmp/theanh-cf-qa-20261013.json").read_text())
    uid, email = qa.get("auth_user_id", ""), qa.get("email", "")
    if (uid is not None and (not isinstance(uid, str) or not re.fullmatch(r"[0-9a-f-]{36}", uid))) or not isinstance(email, str) or not email or len(email) > 320:
        raise RuntimeError("Invalid QA selector")
    # UUID validated; SQL email literal escaped. Management API has no parameter
    # binding here. This is one SELECT in a read_only transaction, not an export.
    literal = email.replace("'", "''")
    query = """SELECT jsonb_build_object('snapshotAt',clock_timestamp(),'source',jsonb_build_object(
      'id',id,'email',email,'encryptedPassword',encrypted_password,
      'emailConfirmedAt',email_confirmed_at,'bannedUntil',banned_until,'deletedAt',deleted_at,
      'isAnonymous',coalesce(is_anonymous,false),'userMetadata',raw_user_meta_data,
      'appMetadata',raw_app_meta_data,'createdAt',created_at,'updatedAt',updated_at)) AS qa_source
      FROM auth.users WHERE lower(email)=lower('%s') %s;""" % (literal, "AND id='%s'::uuid" % uid if uid else "")
    request = urllib.request.Request("https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query",
        method="POST", headers={"Authorization": "Bearer " + pat, "Content-Type": "application/json"},
        data=json.dumps({"query": query, "read_only": True}).encode())
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            source = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError("QA read-only source query rejected: HTTP " + str(error.code)) from None
    if not isinstance(source, list) or len(source) != 1 or "qa_source" not in source[0]:
        raise RuntimeError("QA source selection did not return exactly one account")
    payload = source[0]["qa_source"]
    node = "/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    child = subprocess.run([node, "scripts/prepare-qa-auth-import.mjs"], cwd=root,
        input=json.dumps({"source": payload["source"], "credentialKey": key}),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
    prepared = json.loads(child.stdout)
    if child.returncode or prepared.get("status") != "PREPARED_ONLY":
        raise RuntimeError("QA encryption/credential verification failed")
    if uid is None:
        # Recover the ORIGINAL UUID after exact alias/password/status validation;
        # never create a replacement identity or reset a password.
        qa["auth_user_id"] = payload["source"]["id"]
        Path("/private/tmp/theanh-cf-qa-20261013.json").write_text(json.dumps(qa))
    applied = False
    if args.apply_staging:
        auth = Path.home() / "Library/Preferences/.wrangler/config/default.toml"
        match = re.search(r'^oauth_token\s*=\s*"([^"\r\n]+)"', auth.read_text(), re.M)
        if not match:
            raise RuntimeError("Cloudflare OAuth unavailable")
        account, database = "8035ac71ae1041614760882f4b8862b2", "694139c9-6cda-4b8c-9228-c973dbcbb719"
        def cloud(path, method="GET", body=None):
            req = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts/" + account + path,
                method=method, headers={"Authorization": "Bearer " + match.group(1), "Content-Type": "application/json"},
                data=json.dumps(body).encode() if body is not None else None)
            try:
                with urllib.request.urlopen(req, timeout=25) as response:
                    result = json.load(response)
            except urllib.error.HTTPError as error:
                raise RuntimeError("D1 staging request rejected: HTTP " + str(error.code)) from None
            if result.get("success") is not True:
                raise RuntimeError("D1 staging request unsuccessful")
            return result["result"]
        settings = cloud("/workers/scripts/theanh-main-cf-staging/settings")
        bindings = settings.get("bindings", [])
        if not any(b.get("name") == "CF_NATIVE_AUTH_MODE" and b.get("text") == "disabled" for b in bindings):
            raise RuntimeError("Native mode must remain disabled before QA import")
        if not any(b.get("name") == "NATIVE_AUTH_DB" and b.get("id") == database for b in bindings):
            raise RuntimeError("Exact staging binding required")
        def d1(statements):
            results = cloud("/d1/database/" + database + "/query", "POST", {"batch": statements})
            if len(results) != len(statements) or any(r.get("success") is not True for r in results):
                raise RuntimeError("D1 staging batch incomplete")
            return results
        empty = d1([{"sql": "SELECT (SELECT count(*) FROM d1_access_users) AS users,(SELECT count(*) FROM d1_auth_accounts) AS accounts,(SELECT count(*) FROM d1_auth_sync_state) AS markers;", "params": []}])[0]["results"][0]
        if any(n != 0 for n in empty.values()):
            raise RuntimeError("Initial QA import requires empty identity/Auth/marker tables; no overwrite")
        cutoff = datetime.datetime.fromisoformat(payload["snapshotAt"].replace("Z", "+00:00"))
        age = (datetime.datetime.now(datetime.timezone.utc) - cutoff).total_seconds()
        if age < 0 or age > 300:
            raise RuntimeError("QA source snapshot is not fresh")
        snapshot = cutoff.isoformat()
        statements = prepared["statements"] + [{"sql": "INSERT INTO d1_auth_sync_state(source_project_id,source_snapshot_at,last_verified_at,status) VALUES(?1,?2,?2,'pending')", "params": ["vsxxgdzwtscuxcmjfckt", snapshot]}]
        d1(statements)
        readback = d1([{"sql": "SELECT u.id,u.normalized_email,a.credential_ciphertext,a.email_confirmed_at,a.session_version,v.source_project_id FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id JOIN d1_auth_source_versions v ON v.user_id=u.id WHERE u.id=?1;", "params": [payload["source"]["id"]]}, {"sql": "SELECT (SELECT count(*) FROM d1_access_users) AS users,(SELECT count(*) FROM d1_auth_accounts) AS accounts,(SELECT count(*) FROM d1_auth_source_versions) AS source_versions,(SELECT count(*) FROM d1_auth_sessions) AS sessions,(SELECT status FROM d1_auth_sync_state WHERE source_project_id=?1) AS marker;", "params": ["vsxxgdzwtscuxcmjfckt"]}])
        if len(readback[0]["results"]) != 1:
            raise RuntimeError("QA imported identity readback missing; marker remains pending")
        row = readback[0]["results"][0]
        expected = prepared["statements"]
        if row["id"] != expected[0]["params"][0] or row["normalized_email"] != expected[0]["params"][1] or row["credential_ciphertext"] != expected[1]["params"][1] or row["session_version"] != 1 or row["source_project_id"] != "vsxxgdzwtscuxcmjfckt":
            raise RuntimeError("QA imported fields mismatch; marker remains pending")
        counts = readback[1]["results"][0]
        if counts != {"users": 1, "accounts": 1, "source_versions": 1, "sessions": 0, "marker": "pending"}:
            raise RuntimeError("QA import counts mismatch; marker remains pending")
        applied = True
    # Raw source and prepared parameters are deliberately not persisted/logged.
    report = {"status": "IMPORTED_QA_PENDING" if applied else "TESTED_PREPARE_ONLY", "sourceAccounts": 1,
        "summary": prepared["summary"], "sourcePasswordMatches": prepared["sourcePasswordMatches"],
        "ciphertextRoundtrip": prepared["ciphertextRoundtrip"], "sourceSnapshotAt": payload["snapshotAt"],
        "appliedToD1": applied, "marker": "pending" if applied else None,
        "limits": "One QA account only; no verified source marker, Worker key roundtrip, native login or customer migration"}
    (root / "reports/cloudflare-d1/qa-auth-prepare.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        message = str(error) if isinstance(error, RuntimeError) else "QA preparation unavailable; sensitive output withheld"
        print(json.dumps({"status": "FAILED", "message": message, "exceptionType": type(error).__name__}))
        raise SystemExit(1)
