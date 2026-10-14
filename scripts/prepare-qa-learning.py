"""Prepare or initially import exact QA into D1 staging; Supabase remains read-only."""
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
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--apply-staging", action="store_true")
    modes.add_argument("--verify-staging", action="store_true")
    parser.add_argument("--mark-qa-verified", action="store_true")
    args = parser.parse_args()
    if args.mark_qa_verified and not args.verify_staging:
        raise RuntimeError("Marker promotion requires source revalidation")
    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("qa_learning_keychain", root.parent / "scripts/backup-secrets.py")
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    token = helper.keychain_get("pat")
    qa = json.loads(Path("/private/tmp/theanh-cf-qa-20261013.json").read_text())
    uid, email = qa.get("auth_user_id"), qa.get("email")
    if not token or not isinstance(uid, str) or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", uid) or not isinstance(email, str) or not email or len(email) > 320:
        raise RuntimeError("Exact approved QA identity/credential unavailable")
    def cloud(path, method="GET", body=None):
        auth = (Path.home() / "Library/Preferences/.wrangler/config/default.toml").read_text()
        match = re.search(r'^oauth_token\s*=\s*"([^"\r\n]+)"', auth, re.M)
        if not match:
            raise RuntimeError("Cloudflare OAuth unavailable")
        request = urllib.request.Request("https://api.cloudflare.com/client/v4/accounts/8035ac71ae1041614760882f4b8862b2" + path,
            method=method, headers={"Authorization": "Bearer " + match.group(1), "Content-Type": "application/json"},
            data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError("D1 staging HTTP " + str(error.code)) from None
        if result.get("success") is not True:
            raise RuntimeError("D1 staging request failed")
        return result["result"]
    def d1(statements):
        result = cloud("/d1/database/694139c9-6cda-4b8c-9228-c973dbcbb719/query", "POST", {"batch": statements})
        if len(result) != len(statements) or any(r.get("success") is not True for r in result):
            raise RuntimeError("D1 staging batch incomplete; gates remain closed")
        return result
    def check_worker():
        bindings = cloud("/workers/scripts/theanh-main-cf-staging/settings").get("bindings", [])
        if not any(b.get("name") == "CF_NATIVE_AUTH_MODE" and b.get("text") == "disabled" for b in bindings) or not any(b.get("name") == "CF_NATIVE_QA_USERS" and b.get("text") == "[]" for b in bindings):
            raise RuntimeError("Disabled Worker with empty cohort required")
        if not any(b.get("name") == "NATIVE_AUTH_DB" and b.get("id") == "694139c9-6cda-4b8c-9228-c973dbcbb719" for b in bindings):
            raise RuntimeError("Exact D1 staging required")
    if args.apply_staging or args.verify_staging:
        check_worker()
        identity = d1([{"sql": "SELECT (SELECT count(*) FROM d1_access_users) AS users,(SELECT count(*) FROM d1_auth_accounts) AS accounts,(SELECT count(*) FROM d1_auth_sessions WHERE revoked_at IS NULL) AS sessions,(SELECT count(*) FROM d1_access_users WHERE id=?1 AND normalized_email=?2 AND admin_role IS NULL) AS qa", "params": [uid, email.strip().lower()]}])[0]["results"][0]
        if identity != {"users": 1, "accounts": 1, "sessions": 0, "qa": 1}:
            raise RuntimeError("Exact QA identity and no active sessions required")
    if args.verify_staging:
        # Existing reviewed source RPC oracle is rerun, not an old report reused.
        node = "/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
        parity = subprocess.run(["python3", "scripts/verify-qa-access-parity.py"], cwd=root,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=70)
        oracle = json.loads(parity.stdout)
        if parity.returncode or oracle.get("status") != "TESTED_REMOTE_QA_ACCESS_PARITY" or oracle.get("matched") is not True:
            raise RuntimeError("Actual source/D1 semantic parity required")
    course_sql = (root / "scripts/course-content-source.sql").read_text().strip().rstrip(";")
    literal = email.replace("'", "''")
    query = """WITH course_doc AS (%s),
      qa AS(SELECT id,email FROM auth.users WHERE id='%s'::uuid AND lower(email)=lower('%s')),
      contacts AS(SELECT c.* FROM crm_v2.contacts c,qa WHERE lower(trim(c.email))=lower(trim(qa.email))),
      enrollments AS(SELECT e.* FROM crm_v2.enrollments e,qa WHERE e.user_id=qa.id OR e.contact_id IN(SELECT id FROM contacts) OR lower(trim(e.metadata->>'student_email'))=lower(trim(qa.email)))
      SELECT jsonb_build_object('snapshotAt',clock_timestamp(),'qaAccounts',(SELECT count(*) FROM qa),
      'course',(SELECT payload->'source' FROM course_doc),
      'contacts',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM contacts c),'[]'::jsonb),
      'enrollments',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM enrollments e),'[]'::jsonb),
      'progress',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM crm_v2.course_progress p WHERE p.enrollment_id IN(SELECT id FROM enrollments)),'[]'::jsonb),
      'orders',coalesce((SELECT jsonb_agg(to_jsonb(o)) FROM public.orders o,qa WHERE lower(trim(o.email))=lower(trim(qa.email)) AND o.status='paid'),'[]'::jsonb),
      'overrides',coalesce((SELECT jsonb_agg(to_jsonb(l)) FROM public.leads l,qa WHERE lower(trim(l.email))=lower(trim(qa.email)) AND l.source LIKE 'admin-access-%%' AND l.deleted_at IS NULL),'[]'::jsonb)) AS payload""" % (course_sql, uid, literal)
    request = urllib.request.Request("https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query", method="POST",
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}, data=json.dumps({"query": query, "read_only": True}).encode())
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            rows = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError("QA read-only source HTTP " + str(error.code)) from None
    if not isinstance(rows, list) or len(rows) != 1:
        raise RuntimeError("Expected one QA source snapshot")
    node = "/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    payload = rows[0]["payload"]
    def prepare(mode="prepare", **extra):
        result = subprocess.run([node, "scripts/prepare-qa-learning.mjs"], cwd=root,
            input=json.dumps({"payload": payload, "qa": {"userId": uid, "email": email}, "mode": mode, **extra}),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        output = json.loads(result.stdout)
        if result.returncode or output.get("status") == "FAILED":
            raise RuntimeError("QA learning verification failed; private source withheld")
        return output
    report = prepare()
    if report.get("status") != "TESTED_QA_LEARNING_PREPARE":
        raise RuntimeError("Unexpected QA preparation state")
    if args.verify_staging:
        tables = ["d1_lms_courses", "d1_lms_modules", "d1_lms_lessons", "d1_lms_contacts", "d1_lms_enrollments", "d1_lms_progress", "d1_access_orders", "d1_access_overrides", "d1_qa_learning_source", "d1_access_sync_state"]
        results = d1([{"sql": "SELECT * FROM " + table, "params": []} for table in tables])
        target = {table: result["results"] for table, result in zip(tables, results)}
        content = d1([{"sql": "SELECT * FROM d1_course_content WHERE slug=?1", "params": ["facebook-ads-2026"]}])[0]["results"]
        if len(content) != 1:
            raise RuntimeError("Exactly one source-compatible content document required")
        verified = prepare("reverify", targetRows=target, targetCourse=content[0])
        if verified.get("status") != "PREPARED_QA_VERIFICATION_INTERNAL":
            raise RuntimeError("QA current source/target revalidation failed")
        states = ["importing"]
        if args.mark_qa_verified:
            check_worker()
            updates = d1(verified["statements"])
            if any(update["results"] != [{"status": "verified"}] for update in updates):
                raise RuntimeError("QA rows changed after verification; access gate not promoted")
            state = d1([{"sql": "SELECT (SELECT status FROM d1_access_sync_state WHERE source_project_id=?1) AS access,(SELECT status FROM d1_qa_learning_source WHERE user_id=?2) AS archive", "params": ["vsxxgdzwtscuxcmjfckt", uid]}])[0]["results"][0]
            if state != {"access": "verified", "archive": "verified"}:
                raise RuntimeError("QA promoted state readback mismatch")
            states = [state["access"], state["archive"]]
        report.update(status="TESTED_QA_CURRENT_SOURCE_VERIFICATION", currentSourceReadback=verified["readback"],
            sourceSnapshotAt=verified["sourceSnapshotAt"], markerStates=states, marker=states[0], localVerificationMarker="importing", appliedToD1=args.mark_qa_verified,
            semanticParity=True, limits="One QA dataset current-source verification only; Worker disabled, no native Auth/content refresh, serving or primary-writer/cutover claim")
        (root / "reports/cloudflare-d1/qa-learning-verification.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report))
        return
    if args.apply_staging:
        target_course = d1([{"sql": "SELECT * FROM d1_course_content WHERE slug=?1", "params": ["facebook-ads-2026"]}])[0]["results"]
        if len(target_course) != 1:
            raise RuntimeError("Exactly one verified content document required")
        plan = prepare("plan", targetCourse=target_course[0])["plan"]
        tables = list(plan["expectedRows"])
        if any(not re.fullmatch(r"d1_[a-z_]+", table) for table in tables):
            raise RuntimeError("Invalid target table list")
        empty = d1([{"sql": "SELECT count(*) AS n FROM " + table, "params": []} for table in tables])
        if any(r["results"] != [{"n": 0}] for r in empty):
            raise RuntimeError("Initial QA learning target must be empty; no overwrite")
        cutoff = datetime.datetime.fromisoformat(payload["snapshotAt"].replace("Z", "+00:00"))
        if not 0 <= (datetime.datetime.now(datetime.timezone.utc) - cutoff).total_seconds() <= 300:
            raise RuntimeError("QA source expired before write")
        check_worker()
        d1(plan["statements"])
        results = d1([{"sql": "SELECT * FROM " + table, "params": []} for table in tables])
        target = {table: result["results"] for table, result in zip(tables, results)}
        verified = prepare("verify", targetRows=target)
        if verified.get("status") != "VERIFIED_REMOTE_ROWS":
            raise RuntimeError("QA remote verification failed; marker stays importing")
        fk = d1([{"sql": "PRAGMA foreign_key_check", "params": []}])[0]["results"]
        if fk:
            raise RuntimeError("QA remote foreign keys invalid; marker stays importing")
        report.update(status="IMPORTED_QA_LEARNING_PENDING", remoteReadback=verified["readback"], appliedToD1=True,
            limits="QA staging import/readback only; access importing and archive pending, Worker disabled; no source/customer/native authority mutation")
    (root / "reports/cloudflare-d1/qa-learning-prepare.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "FAILED", "reason": str(error) if isinstance(error, RuntimeError) else "QA source preparation unavailable; private output withheld"}))
        raise SystemExit(1)
