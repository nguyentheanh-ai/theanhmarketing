"""Read reviewed source RPC and compare exact QA entitlement/progress with D1."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import urllib.request
import urllib.error

def main():
    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("qa_parity_keychain", root.parent / "scripts/backup-secrets.py")
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    token = helper.keychain_get("pat")
    qa = json.loads(Path("/private/tmp/theanh-cf-qa-20261013.json").read_text())
    uid, email = qa.get("auth_user_id"), qa.get("email")
    if not token or not isinstance(uid, str) or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", uid) or not isinstance(email, str) or not email or len(email) > 320:
        raise RuntimeError("Exact QA identity unavailable")
    def source(query, readonly=False):
        body = {"query": query}
        if readonly:
            body["read_only"] = True
        request = urllib.request.Request("https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query", method="POST",
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"}, data=json.dumps(body).encode())
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError("Source QA query HTTP " + str(error.code)) from None
    # Verify the deployed body before executing the existing scoped read RPC.
    definition = source("SELECT prosrc,provolatile,prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='student_lms_enrollments_scoped'", True)
    migration = (root / "supabase/migrations/20260925180425_student_scoped_lms_reads.sql").read_text()
    expected = migration.split("as $$", 1)[1].split("$$;", 1)[0]
    norm = lambda s: re.sub(r"\s+", " ", s).strip()
    if len(definition) != 1 or definition[0]["provolatile"] != "s" or definition[0]["prosecdef"] is not False or norm(definition[0]["prosrc"]) != norm(expected):
        raise RuntimeError("Source scoped read function drift; no RPC executed")
    literal = email.replace("'", "''")
    query = """BEGIN READ ONLY;
      WITH qa AS(SELECT id,email FROM auth.users WHERE id='%s'::uuid AND lower(email)=lower('%s'))
      SELECT jsonb_build_object('snapshotAt',clock_timestamp(),
        'course',(SELECT jsonb_build_object('slug',slug,'lms_status',lms_status) FROM public.courses WHERE slug='facebook-ads-2026'),
        'rpc',public.student_lms_enrollments_scoped(qa.id,qa.email,'facebook-ads-2026'),
        'orders',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.orders o WHERE lower(trim(o.email))=lower(trim(qa.email)) AND o.status='paid'),'[]'::jsonb),
        'overrides',coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM public.leads l WHERE lower(trim(l.email))=lower(trim(qa.email)) AND l.source LIKE 'admin-access-%%' AND l.deleted_at IS NULL),'[]'::jsonb)) AS payload FROM qa;
      COMMIT;""" % (uid, literal)
    rows = source(query)
    if not isinstance(rows, list) or len(rows) != 1 or not isinstance(rows[0].get("payload"), dict):
        raise RuntimeError("Exact QA source RPC snapshot unavailable")
    auth = (Path.home() / "Library/Preferences/.wrangler/config/default.toml").read_text()
    match = re.search(r'^oauth_token\s*=\s*"([^"\r\n]+)"', auth, re.M)
    if not match:
        raise RuntimeError("Cloudflare OAuth unavailable")
    node = "/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    result = subprocess.run([node, "scripts/verify-qa-access-parity.mjs"], cwd=root,
        input=json.dumps({"source": rows[0]["payload"], "subject": {"id": uid, "email": email}, "cloudToken": match.group(1)}),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
    report = json.loads(result.stdout)
    (root / "reports/cloudflare-d1/qa-access-parity.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
    if result.returncode or report.get("status") != "TESTED_REMOTE_QA_ACCESS_PARITY":
        raise RuntimeError("Source/D1 QA parity did not pass")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"status": "FAILED", "reason": str(error) if isinstance(error, RuntimeError) else "QA parity unavailable; private output withheld"}))
        raise SystemExit(1)
