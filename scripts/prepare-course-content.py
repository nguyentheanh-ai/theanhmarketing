"""Read one course from A into memory and verify D1 preparation; no remote writes."""
import importlib.util
import json
from pathlib import Path
import subprocess
import urllib.request
import urllib.error

def main():
    root = Path(__file__).resolve().parents[1]
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
    result = subprocess.run([node, "scripts/prepare-course-content.mjs"], cwd=root,
        input=json.dumps({"source": payload["source"], "snapshotAt": payload["snapshotAt"]}),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
    report = json.loads(result.stdout)
    if result.returncode or report.get("status") != "TESTED_PREPARE_ONLY":
        raise RuntimeError("Course preparation failed; source withheld")
    (root / "reports/cloudflare-d1/course-content-prepare.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "FAILED", "reason": str(error) if isinstance(error, RuntimeError) else "Source preparation unavailable; private output withheld"}))
        raise SystemExit(1)
