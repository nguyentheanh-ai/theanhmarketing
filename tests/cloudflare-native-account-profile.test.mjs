import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {build} from 'esbuild';import bcrypt from 'bcryptjs';
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-account-profile-http";export * from "./lib/cloudflare/d1-auth-import";export * from "./lib/cloudflare/d1-auth-core";export * from "./lib/cloudflare/legacy-password";export * from "./lib/cloudflare/native-auth-context";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const uid='00000000-0000-4000-8000-000000000001',origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
async function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());for(const f of ['d1-course-access-source-prototype.sql','d1-auth-core-prototype.sql'])sql.exec(readFileSync('scripts/'+f,'utf8'));
 const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,batch:async ss=>{sql.exec('BEGIN');try{const result=ss.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const stamp=new Date(Date.now()-1000).toISOString(),options={db,projectId:'vsxxgdzwtscuxcmjfckt',origin,credentialKey:h.generateCredentialKey(),authContextKey:h.generateCredentialKey(),sessionTtlMs:3600000,allowedUserIds:[uid],writeEnabled:true,allowAttempt:async()=>({allowed:true,retryAfter:1})};
 const plan=await h.prepareD1AuthInitialImport([{id:uid,email:'qa@example.invalid',encryptedPassword:await bcrypt.hash('synthetic-password',4),emailConfirmedAt:stamp,bannedUntil:null,deletedAt:null,isAnonymous:false,userMetadata:{full_name:'Original name',phone:'0000000000',retain:{nested:true}},appMetadata:null,createdAt:stamp,updatedAt:stamp}],{...options,resolveRole:()=>null});await db.batch(plan.statements);
 sql.prepare('INSERT INTO d1_auth_sync_state VALUES(?,?,?,?)').run(options.projectId,stamp,stamp,'verified');
 const session=await h.authenticateD1Password(db,{email:'qa@example.invalid',password:'synthetic-password'},{...options,allowAttempt:async()=>true});assert(session);
 const witness=await h.createNativeAuthContext(db,session.token,{...options,key:options.authContextKey});
 const body={fullName:'  Native QA name  ',phone:'090 123 4567'};
 const request=(data=body,headers={})=>new Request(origin+'/api/cloudflare-auth/profile',{method:'POST',headers:{origin,'content-type':'application/json',cookie:'__Host-tam-session='+session.token,'X-TAM-Auth-Context':witness,...headers},body:JSON.stringify(data)});
 const row=()=>sql.prepare('SELECT * FROM d1_auth_accounts WHERE user_id=?').get(uid);
 return {sql,db,options,body,request,row,session};
}
test('profile updates only own name/phone, retains metadata, UUID, role, credential and sessions',async t=>{
 const f=await fixture(t),before=f.row();for(let i=0;i<2;i++){const r=await h.handleD1AccountProfileHttp(f.request(),f.options);assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,profile:{fullName:'Native QA name',phone:'090 123 4567'}});assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal(r.headers.get('set-cookie'),null);}
 const after=f.row();assert.deepEqual(JSON.parse(after.user_metadata),{full_name:'Native QA name',phone:'090 123 4567',retain:{nested:true}});for(const k of ['user_id','credential_ciphertext','session_version','must_change_password'])assert.equal(after[k],before[k]);assert(await h.getD1AuthSession(f.db,f.session.token,f.options));
});
test('write gate, CSRF, extra identity/role/metadata and duplicate cookies cannot mutate',async t=>{
 const f=await fixture(t),before=f.row();assert.equal((await h.handleD1AccountProfileHttp(f.request(),{...f.options,writeEnabled:false})).status,503);
 for(const headers of [{origin:'https://evil.invalid'},{'sec-fetch-site':'cross-site'}])assert.equal((await h.handleD1AccountProfileHttp(f.request(f.body,headers),f.options)).status,403);
 for(const extra of [{userId:uid},{role:'admin'},{email:'other@example.invalid'},{metadata:{role:'admin'}}])assert.equal((await h.handleD1AccountProfileHttp(f.request({...f.body,...extra}),f.options)).status,400);
 assert.equal((await h.handleD1AccountProfileHttp(f.request(f.body,{cookie:'__Host-tam-session='+f.session.token+'; __Host-tam-session='+f.session.token}),f.options)).status,401);assert.deepEqual(f.row(),before);
});
test('revoked, out-of-cohort and stale Source authority deny without metadata writes',async t=>{
 const f=await fixture(t),before=f.row();assert.equal((await h.handleD1AccountProfileHttp(f.request(),{...f.options,allowedUserIds:['00000000-0000-4000-8000-000000000002']})).status,409);
 f.sql.exec("UPDATE d1_auth_sync_state SET status='pending'");assert.equal((await h.handleD1AccountProfileHttp(f.request(),f.options)).status,503);f.sql.exec("UPDATE d1_auth_sync_state SET status='verified';UPDATE d1_auth_sessions SET revoked_at='2020-01-01T00:00:00Z'");assert.equal((await h.handleD1AccountProfileHttp(f.request(),f.options)).status,401);assert.deepEqual(f.row(),before);
});
test('authority loss triggered after UPDATE rolls back metadata and authority together',async t=>{
 const f=await fixture(t),before=f.row();f.sql.exec("CREATE TRIGGER fixture_revoke AFTER UPDATE OF user_metadata ON d1_auth_accounts BEGIN UPDATE d1_auth_sync_state SET status='pending'; END");assert.equal((await h.handleD1AccountProfileHttp(f.request(),f.options)).status,503);assert.deepEqual(f.row(),before);assert.equal(f.sql.prepare('SELECT status FROM d1_auth_sync_state').get().status,'verified');
});
test('rate limiting and stale form witness stop before update and never expose token',async t=>{
 const f=await fixture(t),before=f.row();let subject;const r=await h.handleD1AccountProfileHttp(f.request(),{...f.options,allowAttempt:async(_,v)=>{subject=v;return {allowed:false,retryAfter:20}}});assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'20');assert.match(subject,/^profile:[a-f0-9]{64}$/);assert(!subject.includes(f.session.token));
 assert.equal((await h.handleD1AccountProfileHttp(f.request(),{...f.options,authContextKey:h.generateCredentialKey()})).status,409);assert.deepEqual(f.row(),before);
});

test('profile write fails closed without context config or form witness after a different login',async t=>{
 const f=await fixture(t),before=f.row();assert.equal((await h.handleD1AccountProfileHttp(f.request(),{...f.options,authContextKey:undefined})).status,503);
 assert.equal((await h.handleD1AccountProfileHttp(f.request(f.body,{'X-TAM-Auth-Context':''}),f.options)).status,409);
 const newer=await h.authenticateD1Password(f.db,{email:'qa@example.invalid',password:'synthetic-password'},{...f.options,allowAttempt:async()=>true});
 const r=await h.handleD1AccountProfileHttp(f.request(f.body,{cookie:'__Host-tam-session='+newer.token}),f.options);assert.equal(r.status,409);assert.deepEqual(f.row(),before);
});
test('form rendered for A cannot change profile B after another tab logs into B',async t=>{
 const f=await fixture(t),other='00000000-0000-4000-8000-000000000002',stamp=new Date(Date.now()-1000).toISOString();f.options.allowedUserIds.push(other);
 const plan=await h.prepareD1AuthInitialImport([{id:other,email:'other@example.invalid',encryptedPassword:await bcrypt.hash('synthetic-other',4),emailConfirmedAt:stamp,bannedUntil:null,deletedAt:null,isAnonymous:false,userMetadata:{full_name:'Other unchanged',phone:'0000000002'},appMetadata:null,createdAt:stamp,updatedAt:stamp}],{...f.options,resolveRole:()=>null});await f.db.batch(plan.statements);
 const otherSession=await h.authenticateD1Password(f.db,{email:'other@example.invalid',password:'synthetic-other'},{...f.options,allowAttempt:async()=>true});assert(otherSession);
 const before=f.sql.prepare('SELECT user_metadata FROM d1_auth_accounts WHERE user_id=?').get(other);
 const r=await h.handleD1AccountProfileHttp(f.request(f.body,{cookie:'__Host-tam-session='+otherSession.token}),f.options);assert.equal(r.status,409);assert.deepEqual(f.sql.prepare('SELECT user_metadata FROM d1_auth_accounts WHERE user_id=?').get(other),before);assert.equal(JSON.parse(f.row().user_metadata).full_name,'Original name');
});
