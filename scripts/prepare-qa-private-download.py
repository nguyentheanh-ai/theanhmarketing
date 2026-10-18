"""Grant only the existing owner-approved QA an Ebook test entitlement; no order/email."""
import importlib.util,json,re,urllib.request,urllib.error,datetime
from pathlib import Path
if __name__=='__main__':
 import sys
 if sys.argv[1:]!=['--apply-qa']:
  print('PLAN_ONLY: existing QA only; grant Ebook through existing admin RPC, no paid order or email');raise SystemExit
 qa=json.loads(Path('/private/tmp/theanh-cf-qa-20261013.json').read_text());uid=qa['auth_user_id'];email=qa['email']
 if not re.fullmatch('[0-9a-f-]{36}',uid) or '+cloudflare-qa-' not in email or not re.fullmatch(r'[A-Za-z0-9+@._-]+',email):raise RuntimeError('QA_SCOPE_REQUIRED')
 spec=importlib.util.spec_from_file_location('qa_backup_secret',Path('../scripts/backup-secrets.py'));helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper);token=helper.keychain_get('pat')
 if not token:raise RuntimeError('AUTH_UNAVAILABLE')
 # Existing RPC serializes by QA email; preserves UUID and all existing courses.
 query=f"""SELECT public.admin_lms_set_student_access('grant',ARRAY['ebook-facebook-ads-2026']::text[],u.email,'Cloudflare QA','',u.id) AS result FROM auth.users u WHERE u.id='{uid}'::uuid AND lower(u.email)=lower('{email}') AND u.email_confirmed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM crm_v2.enrollments e JOIN public.courses c ON c.id=e.course_id WHERE e.user_id=u.id AND c.slug='ebook-facebook-ads-2026' AND e.status='active')"""
 request=urllib.request.Request('https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query',method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps({'query':query,'read_only':False}).encode())
 try:
  with urllib.request.urlopen(request,timeout=25) as response:rows=json.load(response)
 except urllib.error.HTTPError as e:
  raw=e.read().decode(errors='replace');message='';
  try:message=str(json.loads(raw).get('message',''))
  except Exception:pass
  classification='missing_relation' if 'does not exist' in message else 'permission_denied' if 'permission denied' in message.lower() else 'expired_auth' if 'expired' in message.lower() else 'other'
  print(json.dumps({'status':'FAILED','httpStatus':e.code,'classification':classification}));raise RuntimeError('QA_GRANT_FAILED_NO_PRIVATE_DETAIL_LOGGED') from None
 except Exception:raise RuntimeError('QA_GRANT_FAILED_NO_PRIVATE_DETAIL_LOGGED') from None
 if rows and (len(rows)!=1 or rows[0].get('result')!={'ok':True,'changed':1}):raise RuntimeError('UNEXPECTED_QA_RESULT')
 receipt={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'QA_GRANTED' if rows else 'NO_ROW_CHANGED_REQUIRES_READBACK','scope':'Existing QA only; Ebook test entitlement; no paid order, email, other students or D1 writer changes','grantedSlugs':['ebook-facebook-ads-2026'] if rows else []}
 Path('reports/cloudflare-handoff-20261018/qa-private-download-entitlement.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
