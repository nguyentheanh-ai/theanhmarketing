"""One QA staging snapshot/CAS restore; no Supabase calls or credential output."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request
import uuid

ACCOUNT = "8035ac71ae1041614760882f4b8862b2"
DATABASE = "694139c9-6cda-4b8c-9228-c973dbcbb719"
PROJECT = "vsxxgdzwtscuxcmjfckt"
ROOT = Path(__file__).resolve().parents[1]

def cloud(path, method="GET", body=None):
    config = (Path.home() / "Library/Preferences/.wrangler/config/default.toml").read_text()
    token = re.search(r'^oauth_token\s*=\s*"([^"\r\n]+)"', config, re.M)
    if not token:
        raise RuntimeError("Cloudflare OAuth unavailable")
    request = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT + path,
        method=method, headers={"Authorization": "Bearer " + token.group(1), "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError("Staging API HTTP " + str(error.code)) from None
    if result.get("success") is not True:
        raise RuntimeError("Staging API rejected")
    return result["result"]

def d1(statements):
    results = cloud("/d1/database/" + DATABASE + "/query", "POST", {"batch": statements})
    if len(results) != len(statements) or any(r.get("success") is not True for r in results):
        raise RuntimeError("Staging batch incomplete")
    return [r["results"] for r in results]

def disabled_worker():
    bindings = cloud("/workers/scripts/theanh-main-cf-staging/settings").get("bindings", [])
    required = {"CF_NATIVE_AUTH_MODE": "disabled", "CF_NATIVE_QA_PROGRESS_MODE": "disabled", "CF_NATIVE_QA_USERS": "[]"}
    if any(not any(b.get("name") == key and b.get("text") == value for b in bindings) for key, value in required.items()):
        raise RuntimeError("Disabled Auth/progress and empty QA cohort required")
    if not any(b.get("name") == "NATIVE_AUTH_DB" and b.get("id") == DATABASE for b in bindings):
        raise RuntimeError("Exact staging database required")

def read_state(qa):
    uid, mail = qa["userId"], qa["email"]
    results = d1([
        {"sql": "SELECT e.* FROM d1_lms_enrollments e LEFT JOIN d1_lms_contacts c ON c.id=e.contact_id WHERE e.user_id=?1 OR c.normalized_email=?2", "params": [uid, mail]},
        {"sql": "SELECT p.* FROM d1_lms_progress p JOIN d1_lms_enrollments e ON e.id=p.enrollment_id LEFT JOIN d1_lms_contacts c ON c.id=e.contact_id WHERE e.user_id=?1 OR c.normalized_email=?2", "params": [uid, mail]},
        {"sql": "SELECT * FROM d1_lms_progress_operations ORDER BY id", "params": []},
        {"sql": "SELECT (SELECT count(*) FROM d1_access_users) AS users,(SELECT count(*) FROM d1_access_users WHERE id=?1 AND normalized_email=?2 AND admin_role IS NULL) AS qa,(SELECT count(*) FROM d1_auth_accounts) AS accounts,(SELECT count(*) FROM d1_auth_sessions WHERE revoked_at IS NULL) AS active,(SELECT count(*) FROM d1_auth_sessions WHERE user_id<>?1 OR project_id<>?3) AS foreign_sessions,(SELECT count(*) FROM d1_lms_enrollments) AS enrollments,(SELECT count(*) FROM d1_lms_progress) AS progress", "params": [uid, mail, PROJECT]},
        {"sql": "SELECT count(*) AS total FROM d1_lms_lessons l JOIN d1_lms_modules m ON m.id=l.module_id JOIN d1_lms_courses c ON c.id=m.course_id WHERE c.slug=(SELECT course_slug FROM d1_lms_enrollments LIMIT 1) AND m.status='published' AND l.status='published' AND l.playable=1", "params": []},
    ])
    stats = results[3][0]
    if stats != {"users": 1, "qa": 1, "accounts": 1, "active": 0, "foreign_sessions": 0, "enrollments": 1, "progress": 1} or len(results[0]) != 1 or len(results[1]) != 1:
        raise RuntimeError("Exact QA rows and zero active/foreign sessions required")
    return {"enrollment": results[0][0], "progress": results[1][0], "operations": results[2], "lessonCount": results[4][0]["total"]}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["snapshot", "restore", "revoke-sessions"])
    parser.add_argument("--state", required=True)
    args = parser.parse_args()
    path = Path(args.state).resolve()
    if not str(path).startswith("/private/tmp/theanh-native-progress-qa-") or path.name != "state.json" or not path.parent.is_dir() or path.parent.stat().st_mode & 0o077:
        raise RuntimeError("Private QA state directory required")
    actual = json.loads(Path("/private/tmp/theanh-cf-qa-20261013.json").read_text())
    qa = {"userId": actual.get("auth_user_id"), "email": actual.get("email", "").strip().lower()}
    if not isinstance(qa["userId"], str) or not re.fullmatch(r"[0-9a-f-]{36}", qa["userId"]) or not qa["email"]:
        raise RuntimeError("Approved QA identity required")
    disabled_worker()
    if args.mode == "revoke-sessions":
        identity = d1([{"sql": "SELECT (SELECT count(*) FROM d1_access_users) AS users,(SELECT count(*) FROM d1_access_users WHERE id=?1 AND normalized_email=?2 AND admin_role IS NULL) AS qa,(SELECT count(*) FROM d1_auth_accounts) AS accounts,(SELECT count(*) FROM d1_auth_sessions WHERE user_id<>?1 OR project_id<>?3) AS foreign_sessions", "params": [qa["userId"], qa["email"], PROJECT]}])[0][0]
        if identity != {"users": 1, "qa": 1, "accounts": 1, "foreign_sessions": 0}:
            raise RuntimeError("Exact QA session scope required")
        stamp = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        result = d1([
            {"sql": "UPDATE d1_auth_sessions SET revoked_at=?4 WHERE user_id=?1 AND project_id=?3 AND revoked_at IS NULL AND (SELECT count(*) FROM d1_access_users)=1 AND (SELECT count(*) FROM d1_auth_accounts)=1 AND EXISTS(SELECT 1 FROM d1_access_users WHERE id=?1 AND normalized_email=?2 AND admin_role IS NULL)", "params": [qa["userId"], qa["email"], PROJECT, stamp]},
            {"sql": "SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE revoked_at IS NULL) THEN 1 ELSE json('qa_session_cleanup_denied') END AS revoked", "params": []},
        ])
        if result[-1] != [{"revoked": 1}]:
            raise RuntimeError("QA session cleanup incomplete")
        print(json.dumps({"status": "QA_SESSIONS_REVOKED", "activeSessions": 0}))
        return
    if args.mode == "snapshot":
        before = read_state(qa)
        progress=before["progress"]
        completed=progress["status"]=="completed" and progress["progress_percent"]==100 and isinstance(progress["completed_at"],str)
        incomplete=progress["status"] in ("not_started","in_progress") and progress["progress_percent"]==0 and progress["completed_at"] is None
        if before["enrollment"]["status"] != "active" or not (completed or incomplete):
            raise RuntimeError("Consistent existing QA progress required")
        plan = [{"id": str(uuid.uuid4()), "completed": not completed}, {"id": str(uuid.uuid4()), "completed": completed}]
        payload = {"qa": qa, "before": before, "plannedOperations": plan, "capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as output:
            json.dump(payload, output)
        print(json.dumps({"status": "SNAPSHOT_SAVED", "rows": 2, "operations": len(before["operations"]), "lessonCount": before["lessonCount"]}))
        return
    if not path.exists() or path.stat().st_mode & 0o077:
        raise RuntimeError("Private existing snapshot required")
    saved = json.loads(path.read_text())
    if saved.get("qa") != qa:
        raise RuntimeError("Snapshot identity mismatch")
    after = read_state(qa)
    if after == saved["before"]:
        print(json.dumps({"status": "UNCHANGED", "restoredRows": 0}))
        return
    child = subprocess.run(["/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node", "scripts/prepare-qa-progress-restore.mjs"],
        cwd=ROOT, input=json.dumps({**saved, "after": after}), capture_output=True, text=True, timeout=25)
    prepared = json.loads(child.stdout)
    if child.returncode or prepared.get("status") != "PREPARED":
        raise RuntimeError("QA CAS validation rejected; no restore attempted")
    result = d1(prepared["statements"])
    if result[0] != [{"matched": 1}] or result[-1] != [{"matched": 1}]:
        raise RuntimeError("QA restore assertion incomplete")
    restored = read_state(qa)
    if restored["enrollment"] != saved["before"]["enrollment"] or restored["progress"] != saved["before"]["progress"] or restored["operations"] != after["operations"]:
        raise RuntimeError("QA full-field readback mismatch")
    report = {"status": "RESTORED_VERIFIED", "restoredRows": 2, "retainedOperations": len(restored["operations"]), "fullFieldMatch": True, "limits": "QA staging only; no source database restoration"}
    (ROOT / "reports/cloudflare-d1/native-qa-progress-restoration.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # All RuntimeError messages above are fixed, non-sensitive strings.
        reason = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        print(json.dumps({"status": "FAILED", "message": reason}))
        raise SystemExit(1)
