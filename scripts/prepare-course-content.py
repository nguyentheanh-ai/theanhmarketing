"""Prepare or initially import one course into exact D1 staging; never write Supabase."""
import argparse
import datetime
import importlib.util
import json
from pathlib import Path
import subprocess
import re
import urllib.request
import urllib.error

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply-staging", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    def cloud(path, method="GET", body=None):
        auth = Path.home() / "Library/Preferences/.wrangler/config/default.toml"
        match = re.search(r'^oauth_token\s*=\s*"([^"\r\n]+)"', auth.read_text(), re.M)
        if not match:
            raise RuntimeError("Cloudflare OAuth unavailable")
        req = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts/8035ac71ae1041614760882f4b8862b2" + path,
            method=method, headers={"Authorization": "Bearer " + match.group(1), "Content-Type": "application/json"},
            data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError("D1 staging request HTTP " + str(error.code)) from None
        if result.get("success") is not True:
            raise RuntimeError("D1 staging request failed")
        return result["result"]
    def d1(statements):
        result = cloud("/d1/database/694139c9-6cda-4b8c-9228-c973dbcbb719/query", "POST", {"batch": statements})
        if len(result) != len(statements) or any(row.get("success") is not True for row in result):
            raise RuntimeError("D1 staging batch incomplete")
        return result
    if args.apply_staging:
        bindings = cloud("/workers/scripts/theanh-main-cf-staging/settings").get("bindings", [])
        if not any(b.get("name") == "CF_NATIVE_AUTH_MODE" and b.get("text") == "disabled" for b in bindings):
            raise RuntimeError("Native staging must remain disabled")
        if not any(b.get("name") == "NATIVE_AUTH_DB" and b.get("id") == "694139c9-6cda-4b8c-9228-c973dbcbb719" for b in bindings):
            raise RuntimeError("Exact D1 staging binding required")
        counts = d1([{"sql": "SELECT (SELECT count(*) FROM d1_course_content) AS documents,(SELECT count(*) FROM d1_course_content_sync) AS markers", "params": []}])[0]["results"][0]
        if counts != {"documents": 0, "markers": 0}:
            raise RuntimeError("Initial course import requires empty content and marker tables; no overwrite")
    spec = importlib.util.spec_from_file_location("course_backup_keychain", root.parent / "scripts/backup-secrets.py")
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    token = helper.keychain_get("pat")
    if not token:
        raise RuntimeError("Scoped PAT unavailable")
    request = urllib.request.Request("https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query", method="POST",
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        data=json.dumps({"query": (root / "scripts/course-content-source.sql").read_text(), "read_only": True}).encode())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            rows = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError("Source read-only query HTTP " + str(error.code)) from None
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0].get("payload"), dict):
        raise RuntimeError("Expected exactly one course source")
    payload = rows[0]["payload"]
    node = "/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    def prepare(mode="prepare", target=None):
        result = subprocess.run([node, "scripts/prepare-course-content.mjs"], cwd=root,
            input=json.dumps({"source": payload["source"], "snapshotAt": payload["snapshotAt"], "mode": mode, "target": target}),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        output = json.loads(result.stdout)
        if result.returncode or output.get("status") == "FAILED":
            raise RuntimeError("Course preparation failed; source withheld")
        return output
    report = prepare()
    if report.get("status") != "TESTED_PREPARE_ONLY":
        raise RuntimeError("Unexpected course preparation state")
    if args.apply_staging:
        if report["ambiguousPublishedOrder"] or not report["requiredLessonPresent"]:
            raise RuntimeError("Required course lesson/order evidence incomplete")
        cutoff = datetime.datetime.fromisoformat(payload["snapshotAt"].replace("Z", "+00:00"))
        if not 0 <= (datetime.datetime.now(datetime.timezone.utc) - cutoff).total_seconds() <= 300:
            raise RuntimeError("Course source snapshot expired before import")
        plan = prepare("plan")["plan"]
        snapshot = plan["params"][5]
        d1([plan, {"sql": "INSERT INTO d1_course_content_sync(source_project_id,source_snapshot_at,last_verified_at,status,course_count) VALUES(?1,?2,?2,'pending',1)", "params": ["vsxxgdzwtscuxcmjfckt", snapshot]}])
        target_rows = d1([{"sql": "SELECT * FROM d1_course_content WHERE course_id=?1", "params": [plan["params"][0]]}])[0]["results"]
        if len(target_rows) != 1:
            raise RuntimeError("Course readback incomplete; marker remains pending")
        verified = prepare("verify", target_rows[0])
        if verified.get("status") != "VERIFIED_INTERNAL":
            raise RuntimeError("Course readback verification failed; marker remains pending")
        updated = d1([verified["marker"]])[0]["results"]
        if updated != [{"status": "verified"}]:
            raise RuntimeError("Course content changed after readback; marker not promoted")
        state = d1([{"sql": "SELECT (SELECT count(*) FROM d1_course_content) AS documents,(SELECT status FROM d1_course_content_sync WHERE source_project_id=?1) AS marker", "params": ["vsxxgdzwtscuxcmjfckt"]}])[0]["results"][0]
        if state != {"documents": 1, "marker": "verified"}:
            raise RuntimeError("Course staging final state mismatch")
        report.update(status="IMPORTED_VERIFIED_ONE_COURSE", appliedToD1=True, marker="verified", sourceSnapshotAt=snapshot,
            limits="One-course staging projection only; Worker disabled, no Auth/access/SSR/progress/streaming or full migration claim")
    (root / "reports/cloudflare-d1/course-content-prepare.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "FAILED", "reason": str(error) if isinstance(error, RuntimeError) else "Source preparation unavailable; private output withheld"}))
        raise SystemExit(1)
