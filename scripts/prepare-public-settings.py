#!/usr/bin/env python3
"""Capture two public settings read-only, publish verified D1 staging candidates with all gates OFF."""
import importlib.util,json,re,subprocess,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NODE='/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
def main():
 spec=importlib.util.spec_from_file_location('backup_secret',ROOT.parent/'scripts/backup-secrets.py')
 helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
 token=helper.keychain_get('pat')
 if not token:raise RuntimeError('SCOPED_PAT_UNAVAILABLE')
 sql="""SELECT 'vsxxgdzwtscuxcmjfckt' AS source_project_id, k.key,
 coalesce(s.value::text,'null') AS value_json,
 s.updated_at AS source_updated_at, s.key IS NOT NULL AS source_exists,
 now() AS captured_at
 FROM (VALUES ('marketing'),('brand')) AS k(key)
 LEFT JOIN public.site_settings s ON s.key=k.key ORDER BY k.key"""
 request=urllib.request.Request('https://api.supabase.com/v1/projects/vsxxgdzwtscuxcmjfckt/database/query',method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps({'query':sql,'read_only':True}).encode())
 try:
  with urllib.request.urlopen(request,timeout=30) as response:rows=json.load(response)
 except urllib.error.HTTPError as error:raise RuntimeError('SOURCE_HTTP_'+str(error.code)) from None
 token=None
 if not isinstance(rows,list) or len(rows)!=2:raise RuntimeError('SOURCE_SHAPE_INVALID')
 match=re.search(r'^oauth_token\s*=\s*"([^"\n]+)"',(Path.home()/'Library/Preferences/.wrangler/config/default.toml').read_text(),re.M)
 if not match:raise RuntimeError('CLOUDFLARE_AUTH_UNAVAILABLE')
 p=subprocess.run([NODE,'scripts/prepare-public-settings.mjs'],cwd=ROOT,input=json.dumps({'source':rows,'oauth':match.group(1),'mode':'apply-staging'}),capture_output=True,text=True,timeout=150)
 rows=[];result=json.loads(p.stdout)
 if p.returncode or result.get('status')!='STAGING_PUBLIC_SETTINGS_VERIFIED_GATES_OFF':raise RuntimeError(result.get('code','PREPARATION_FAILED'))
 (ROOT/'reports/cloudflare-d1/public-settings-staging-import.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result));return 0
if __name__=='__main__':
 try:raise SystemExit(main())
 except Exception as error:
  reason=str(error) if isinstance(error,RuntimeError) and re.fullmatch(r'[A-Z0-9_]+',str(error)) else 'PRIVATE_DIAGNOSTIC_WITHHELD'
  print(json.dumps({'status':'FAILED','reason':reason}));raise SystemExit(1)
