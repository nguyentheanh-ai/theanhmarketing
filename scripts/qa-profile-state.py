"""Dedicated QA D1 profile snapshot/CAS restore; no Source or credential output."""
import argparse,datetime,importlib.util,json,os,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('qa_d1_state',ROOT/'scripts/qa-progress-state.py');helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
NODE='/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
def state(qa):
 helper.disabled_worker()
 settings=helper.cloud('/workers/scripts/theanh-main-cf-staging/settings')['bindings']
 for key in ['CF_NATIVE_QA_PROFILE_WRITES','CF_NATIVE_QA_AUTH_CONTEXT_MODE','CF_NATIVE_QA_REFRESH_MODE']:
  if not any(b.get('name')==key and b.get('text')=='disabled' for b in settings):raise RuntimeError('Closed profile gates required')
 rows=helper.d1([{'sql':'SELECT * FROM d1_auth_accounts WHERE user_id=?1','params':[qa['userId']]},{'sql':"SELECT (SELECT count(*) FROM d1_access_users) users,(SELECT count(*) FROM d1_auth_accounts) accounts,(SELECT count(*) FROM d1_access_users WHERE id=?1 AND normalized_email=?2 AND admin_role IS NULL) qa,(SELECT count(*) FROM d1_auth_sessions WHERE revoked_at IS NULL) active,(SELECT count(*) FROM d1_auth_refresh_families WHERE revoked_at IS NULL) refresh,(SELECT count(*) FROM d1_auth_credential_operations) credentialWrites",'params':[qa['userId'],qa['email']]}])
 if len(rows[0])!=1 or rows[1]!=[{'users':1,'accounts':1,'qa':1,'active':0,'refresh':0,'credentialWrites':0}]:raise RuntimeError('Exact QA identity with no active authority required')
 return rows[0][0]
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('mode',choices=['snapshot','restore']);parser.add_argument('--state',required=True);args=parser.parse_args();path=Path(args.state).resolve()
 if not str(path).startswith('/private/tmp/theanh-native-profile-qa-') or path.name!='state.json' or not path.parent.is_dir() or path.parent.stat().st_mode&0o077:raise RuntimeError('Private QA state directory required')
 qa=json.loads(Path('/private/tmp/theanh-cf-qa-20261013.json').read_text());qa={'userId':qa['auth_user_id'],'email':qa['email'].strip().lower()}
 if not re.fullmatch('[0-9a-f-]{36}',qa['userId']):raise RuntimeError('Exact QA identity required')
 current=state(qa)
 if args.mode=='snapshot':
  value={'qa':qa,'before':current,'profile':{'fullName':'QA kiểm thử Cloudflare','phone':'0000000001'},'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
  fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
  with os.fdopen(fd,'w') as stream:json.dump(value,stream)
  print(json.dumps({'status':'QA_PROFILE_SNAPSHOT_SAVED','rows':1}));return
 if not path.exists() or path.stat().st_mode&0o077:raise RuntimeError('Private QA snapshot required')
 saved=json.loads(path.read_text())
 if saved['qa']!=qa:raise RuntimeError('QA snapshot identity changed')
 if current==saved['before']:print(json.dumps({'status':'UNCHANGED','restoredRows':0}));return
 child=subprocess.run([NODE,'scripts/prepare-qa-profile-restore.mjs'],cwd=ROOT,input=json.dumps({**saved,'after':current,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}),capture_output=True,text=True,timeout=25)
 plan=json.loads(child.stdout)
 if child.returncode or plan.get('status')!='PREPARED':raise RuntimeError('QA planned profile restoration rejected')
 result=helper.d1(plan['statements'])
 if result[0]!=[{'matched':1}] or result[-1]!=[{'matched':1}] or state(qa)!=saved['before']:raise RuntimeError('QA profile restoration readback mismatch')
 report={'status':'RESTORED_VERIFIED','restoredRows':1,'fullFieldMatch':True,'credentialAndAuthorityPreserved':True,'productionWrites':False}
 (ROOT/'reports/cloudflare-d1/native-qa-profile-restoration.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if __name__=='__main__':
 try:main()
 except Exception as error:
  print(json.dumps({'status':'FAILED','reason':str(error) if isinstance(error,RuntimeError) else 'QA profile state unavailable; private details withheld'}));raise SystemExit(1)
