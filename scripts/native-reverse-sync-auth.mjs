// Rollback: recreate native Auth users created on D1 after the cutover in
// Supabase Auth (same UUID, same bcrypt hash, confirmed state, metadata).
// DRY RUN by default; --apply writes to Supabase and needs owner approval.
// Usage: node scripts/native-reverse-sync-auth.mjs --project a --database <d1> --since <iso> [--apply]
import {build} from 'esbuild';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';
const arg=n=>{const i=process.argv.indexOf('--'+n);return i>0?process.argv[i+1]:undefined;};
const project=arg('project'),database=arg('database'),since=arg('since'),apply=process.argv.includes('--apply');
const REF={a:'vsxxgdzwtscuxcmjfckt',b:'pppiqhkectojxbmhqcnx'}[project];
if(!REF||!database||!since)throw new Error('usage: --project a|b --database <d1> --since <iso>');
const MAIN=resolve(process.cwd(),'../main');
const b=await build({stdin:{contents:'export * from "./lib/cloudflare/legacy-password";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'error'});
const h=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const d1=sql=>JSON.parse(execFileSync(MAIN+'/node_modules/.bin/wrangler',['d1','execute',database,'--remote','--json','--command',sql],{cwd:MAIN}).toString())[0].results;
const iso=new Date(since).toISOString().slice(0,19);
const users=d1(`SELECT u.id,u.normalized_email email,a.credential_ciphertext c,a.email_confirmed_at,a.user_metadata,a.created_at,a.updated_at FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id WHERE a.deleted_at IS NULL AND a.created_at>='${iso}'`);
console.log(JSON.stringify({apply,newUsers:users.length}));
if(!apply||!users.length)process.exit(0);
const sec=(s,a)=>execFileSync('/usr/bin/security',['find-generic-password','-w','-s','com.theanhmarketing.cloudflare-migration.backup-secret.'+s,'-a',a]).toString().trim();
const cred=sec('native-a-credential','theanh-main-cf-staging-credential'),pat=sec('pat','theanh-cloudflare-migration-supabase-scoped-pat');
const rows=[];for(const u of users){const hash=u.c?await h.openLegacyBcryptHash(u.c,cred,{projectId:REF,userId:u.id}):null;rows.push({id:u.id,email:u.email,encrypted_password:hash??'',email_confirmed_at:u.email_confirmed_at,raw_user_meta_data:JSON.parse(u.user_metadata||'{}'),created_at:u.created_at,updated_at:u.updated_at});}
const payload=JSON.stringify(rows);if(payload.includes('$J$'))throw new Error('Unsafe payload');
const sql=`INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 SELECT '00000000-0000-0000-0000-000000000000',(r->>'id')::uuid,'authenticated','authenticated',r->>'email',r->>'encrypted_password',(r->>'email_confirmed_at')::timestamptz,'{"provider":"email","providers":["email"]}'::jsonb,r->'raw_user_meta_data',(r->>'created_at')::timestamptz,(r->>'updated_at')::timestamptz
 FROM jsonb_array_elements($J$${payload}$J$::jsonb) r ON CONFLICT (id) DO NOTHING`;
const res=await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`,{method:'POST',headers:{Authorization:'Bearer '+pat,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
console.log(JSON.stringify({applied:res.ok,status:res.status}));
