"""Read exact approved QA data and verify initial D1 plan in memory; no remote writes."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import urllib.request
import urllib.error

def main():
    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("qa_learning_keychain", root.parent / "scripts/backup-secrets.py")
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    token = helper.keychain_get("pat")
    qa = json.loads(Path("/private/tmp/theanh-cf-qa-20261013.json").read_text())
    uid, email = qa.get("auth_user_id"), qa.get("email")
    if not token or not isinstance(uid, str) or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", uid) or not isinstance(email, str) or not email or len(email) > 320:
        raise RuntimeError("Exact approved QA identity/credential unavailable")
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
    result = subprocess.run([node, "scripts/prepare-qa-learning.mjs"], cwd=root,
        input=json.dumps({"payload": rows[0]["payload"], "qa": {"userId": uid, "email": email}}),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
    report = json.loads(result.stdout)
    if result.returncode or report.get("status") != "TESTED_QA_LEARNING_PREPARE":
        raise RuntimeError("QA learning verification failed; private source withheld")
    (root / "reports/cloudflare-d1/qa-learning-prepare.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "FAILED", "reason": str(error) if isinstance(error, RuntimeError) else "QA source preparation unavailable; private output withheld"}))
        raise SystemExit(1)
