"""Read reviewed source RPC and compare exact QA entitlement/progress with D1."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import urllib.request
import urllib.error

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError('QA source redirect refused')

def assert_qa_source_window(before,after):
    from datetime import datetime
    clock=lambda value:datetime.fromisoformat(value.replace('Z','+00:00'))
    low,high=clock(before['snapshotAt']),clock(after['snapshotAt'])
    if low.utcoffset() is None or high.utcoffset() is None or high<low or any(before[k]!=after[k] for k in ['course','orders','overrides','guard']):
        raise RuntimeError('QA source inputs changed during RPC window')
    if any(e.get('expires_at') and low<=clock(e['expires_at'])<=high for e in before['guard']['enrollments']):
        raise RuntimeError('QA enrollment expiry crossed RPC window')

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
            with urllib.request.build_opener(NoRedirect()).open(request, timeout=25) as response:
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
    # The Management API role cannot EXECUTE this service-role-only RPC.
    # Keep Source privileges unchanged: call the reviewed STABLE read via its
    # existing service_role in RAM, bracketed by complete relevant input reads.
    policy_spec=importlib.util.spec_from_file_location("qa_rpc_no_redirect",root/"scripts/read-source-auth-policy.py")
    policy=importlib.util.module_from_spec(policy_spec);policy_spec.loader.exec_module(policy)
    storage_spec=importlib.util.spec_from_file_location("qa_rpc_existing_key",root.parent/"scripts/backup-storage.py")
    storage=importlib.util.module_from_spec(storage_spec);storage_spec.loader.exec_module(storage)
    opener=urllib.request.build_opener(policy.NoRedirect)
    query = """WITH qa AS(SELECT id,email FROM auth.users WHERE id='%s'::uuid AND lower(email)=lower('%s')),
      contacts AS(SELECT c.* FROM crm_v2.contacts c,qa WHERE lower(trim(c.email))=lower(trim(qa.email))
       OR c.id IN(SELECT e.contact_id FROM crm_v2.enrollments e WHERE e.user_id=qa.id OR lower(trim(e.metadata->>'student_email'))=lower(trim(qa.email)))),
      enrollments AS(SELECT e.* FROM crm_v2.enrollments e,qa WHERE e.user_id=qa.id OR e.contact_id IN(SELECT id FROM contacts) OR lower(trim(e.metadata->>'student_email'))=lower(trim(qa.email)))
      SELECT jsonb_build_object('snapshotAt',clock_timestamp(),
        'course',(SELECT jsonb_build_object('slug',slug,'lms_status',lms_status) FROM public.courses WHERE slug='facebook-ads-2026'),
        'orders',coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) FROM public.orders o,qa WHERE lower(trim(o.email))=lower(trim(qa.email)) AND o.status='paid'),'[]'::jsonb),
        'overrides',coalesce((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) FROM public.leads l,qa WHERE lower(trim(l.email))=lower(trim(qa.email)) AND l.source LIKE 'admin-access-%%' AND l.deleted_at IS NULL),'[]'::jsonb),
        'guard',jsonb_build_object(
         'identity',(SELECT jsonb_agg(to_jsonb(q) ORDER BY q.id) FROM qa q),
         'contacts',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM contacts c),'[]'::jsonb),
         'enrollments',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM enrollments e),'[]'::jsonb),
         'progress',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM crm_v2.course_progress p WHERE p.enrollment_id IN(SELECT id FROM enrollments)),'[]'::jsonb),
         'courses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'lms_status',c.lms_status) ORDER BY c.id) FROM public.courses c),'[]'::jsonb),
         'modules',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'course_id',m.course_id,'status',m.status) ORDER BY m.id) FROM public.course_modules m),'[]'::jsonb),
         'lessons',coalesce((SELECT jsonb_agg(jsonb_build_object('id',l.id,'module_id',l.module_id,'status',l.status,'playable',nullif(trim(l.youtube_url),'') IS NOT NULL OR nullif(trim(l.embed_url),'') IS NOT NULL OR nullif(trim(l.content),'') IS NOT NULL) ORDER BY l.id) FROM public.lessons l),'[]'::jsonb))) AS payload""" % (uid,literal)
    def snapshot():
        result=source(query,True)
        if not isinstance(result,list) or len(result)!=1 or not isinstance(result[0].get('payload'),dict) or len(result[0]['payload']['guard']['identity'] or [])!=1:
            raise RuntimeError('Exact QA source read snapshot unavailable')
        return result[0]['payload']
    before=snapshot()
    key=storage.service_key('A',use_scoped_pat=True)
    request=urllib.request.Request('https://vsxxgdzwtscuxcmjfckt.supabase.co/rest/v1/rpc/student_lms_enrollments_scoped',method='POST',
        headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'tx=rollback'},
        data=json.dumps({'p_user_id':uid,'p_email':email,'p_course_slug':'facebook-ads-2026'}).encode())
    try:
        with opener.open(request,timeout=45) as response:
            raw=response.read(1024*1024+1)
        if len(raw)>1024*1024:raise RuntimeError('QA RPC response bound exceeded')
        oracle=json.loads(raw)
        if not isinstance(oracle,dict):raise RuntimeError('QA RPC result unavailable')
    finally:
        key=None;request=None
    after=snapshot()
    assert_qa_source_window(before,after)
    before.pop('guard');before['rpc']=oracle
    rows=[{'payload':before}]
    auth = (Path.home() / "Library/Preferences/.wrangler/config/default.toml").read_text()
    match = re.search(r'^oauth_token\s*=\s*"([^"\r\n]+)"', auth, re.M)
    if not match:
        raise RuntimeError("Cloudflare OAuth unavailable")
    node = "/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
    result = subprocess.run([node, "scripts/verify-qa-access-parity.mjs"], cwd=root,
        input=json.dumps({"source": rows[0]["payload"], "subject": {"id": uid, "email": email}, "cloudToken": match.group(1)}),
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
    report = json.loads(result.stdout)
    report.update(sourceRpcTransport='EXISTING_SERVICE_ROLE_READ_REST',sourceWindowStartedAt=before['snapshotAt'],sourceWindowEndedAt=after['snapshotAt'],inputRowsEqualAtWindowEndpoints=True,transientSourceChangesExcluded=False,sourceInputsAndOracleSameMvccStatement=False,sourceWriterFenced=False,serviceRolePersisted=False)
    (root / "reports/cloudflare-d1/qa-access-parity.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))
    if result.returncode or report.get("status") != "TESTED_REMOTE_QA_ACCESS_PARITY":
        raise SystemExit(1)

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        failure={"status": "FAILED", "reason": str(error) if isinstance(error, RuntimeError) else "QA parity unavailable; private output withheld", "exceptionType":type(error).__name__, **({"httpStatus":error.code} if isinstance(error,urllib.error.HTTPError) else {})}
        Path(__file__).resolve().parents[1].joinpath("reports/cloudflare-d1/qa-access-parity-last-failure.json").write_text(json.dumps(failure,indent=2)+"\n")
        print(json.dumps(failure))
        raise SystemExit(1)
