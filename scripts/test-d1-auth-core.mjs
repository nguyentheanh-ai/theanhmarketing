// Synthetic fixtures only; no network, real accounts, passwords or hashes.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import bcrypt from 'bcryptjs';
const dir=mkdtempSync(join(tmpdir(),'tam-auth-fixture-'));
let count=0;
const check=async(name,fn)=>{await fn();count++;console.log(`PASS ${name}`)};
try{
 await build({stdin:{contents:'export * from "./lib/cloudflare/d1-auth-core"; export * from "./lib/cloudflare/legacy-password";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:join(dir,'core.mjs'),tsconfig:'tsconfig.json'});
 const core=await import(pathToFileURL(join(dir,'core.mjs')));
 const sql=new DatabaseSync(':memory:');
 sql.exec(readFileSync('scripts/d1-course-access-source-prototype.sql','utf8'));
 sql.exec(readFileSync('scripts/d1-auth-core-prototype.sql','utf8'));
 let beforeBatch=null;
 const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,batch:async(stmts)=>{
  if(beforeBatch){const hook=beforeBatch;beforeBatch=null;hook();}
  sql.exec('BEGIN');try{const result=stmts.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}
 }};
 const userId='00000000-0000-4000-8000-000000000001',projectId='vsxxgdzwtscuxcmjfckt';
 const policy={projectId,now:Date.parse('2026-10-14T00:00:00Z'),sessionTtlMs:3600000};
 const key=core.generateCredentialKey(),password='Synthetic-only-đăng-nhập';
 const hash=await bcrypt.hash(password,10);
 const envelope=await core.sealLegacyBcryptHash(hash,key,{projectId,userId});
 sql.prepare('INSERT INTO d1_access_users VALUES (?,?,NULL)').run(userId,'fixture@example.invalid');
 sql.prepare('INSERT INTO d1_auth_accounts(user_id,credential_ciphertext,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?,?)').run(userId,envelope,'2026-10-13T00:00:00Z','2026-10-13T00:00:00Z','2026-10-13T00:00:00Z');
 const login=(pw=password,email='fixture@example.invalid',allow=true)=>core.authenticateD1Password(db,{email,password:pw},{...policy,credentialKey:key,allowAttempt:async()=>allow});
 await check('bcrypt cost 6 and 10 compatibility',async()=>{assert(await core.verifyLegacyBcryptPassword(password,hash));assert(await core.verifyLegacyBcryptPassword(password,await bcrypt.hash(password,6)));assert.equal(await core.verifyLegacyBcryptPassword('wrong',hash),false)});
 await check('legacy UTF8 72-byte truncation preserved',async()=>{const p='đ'.repeat(36);const h=await bcrypt.hash(p,6);assert(await core.verifyLegacyBcryptPassword(p+'suffix',h))});
 await check('AES envelope bound to user and project',async()=>{assert.equal(await core.openLegacyBcryptHash(envelope,key,{projectId,userId}),hash);for(const context of [{projectId:'pppiqhkectojxbmhqcnx',userId},{projectId,userId:'00000000-0000-4000-8000-000000000002'}])await assert.rejects(core.openLegacyBcryptHash(envelope,key,context));await assert.rejects(core.openLegacyBcryptHash(envelope,core.generateCredentialKey(),{projectId,userId}));await assert.rejects(core.openLegacyBcryptHash(envelope.slice(0,-4)+'AAAA',key,{projectId,userId}))});
 await check('limiter and invalid password cannot create session',async()=>{assert.equal(await login(password,undefined,false),null);assert.equal(await login('wrong'),null);assert.equal(await login(password,'unknown@example.invalid'),null);assert.equal(sql.prepare('SELECT count(*) n FROM d1_auth_sessions').get().n,0)});
 await check('inactive accounts cannot login',async()=>{for(const [field,value] of [['email_confirmed_at',null],['email_confirmed_at','2026-10-15T00:00:00Z'],['banned_until','2026-10-15T00:00:00Z'],['deleted_at','2026-10-13T00:00:00Z'],['is_anonymous',1]]){const old=sql.prepare(`SELECT ${field} value FROM d1_auth_accounts`).get().value;sql.prepare(`UPDATE d1_auth_accounts SET ${field}=?`).run(value);assert.equal(await login(),null);sql.prepare(`UPDATE d1_auth_accounts SET ${field}=?`).run(old)}});
 let session;
 await check('opaque token and original UUID; token stored hashed',async()=>{session=await login();assert.equal(session.user.id,userId);assert.equal(session.token.length,43);assert.equal(sql.prepare('SELECT token_hash FROM d1_auth_sessions').get().token_hash.length,64);assert.notEqual(sql.prepare('SELECT token_hash FROM d1_auth_sessions').get().token_hash,session.token)});
 await check('expiry, other project and invalid tokens denied',async()=>{assert.equal(await core.getD1AuthSession(db,session.token,{...policy,now:policy.now+3600000}),null);assert.equal(await core.getD1AuthSession(db,session.token,{...policy,projectId:'pppiqhkectojxbmhqcnx'}),null);assert.equal(await core.getD1AuthSession(db,'bad',policy),null)});
 await check('metadata cannot grant admin; fresh role read',async()=>{sql.exec(`UPDATE d1_auth_accounts SET user_metadata='{"role":"admin"}'`);assert.equal((await core.getD1AuthSession(db,session.token,policy)).user.adminRole,null);beforeBatch=()=>sql.exec("UPDATE d1_access_users SET admin_role='fixture-admin'");const fresh=await login();assert.equal(fresh.user.adminRole,'fixture-admin');sql.exec('UPDATE d1_access_users SET admin_role=NULL')});
 await check('credential/version change during verification prevents session',async()=>{beforeBatch=()=>sql.exec('UPDATE d1_auth_accounts SET session_version=session_version+1');assert.equal(await login(),null)});
 await check('rotation single use with concurrent requests',async()=>{session=await login();const rotated=await Promise.all([core.rotateD1AuthSession(db,session.token,policy),core.rotateD1AuthSession(db,session.token,policy)]);assert.equal(rotated.filter(Boolean).length,1);assert.equal(await core.getD1AuthSession(db,session.token,policy),null);session=rotated.find(Boolean);assert(await core.getD1AuthSession(db,session.token,policy))});
 await check('rotation fault rolls back insert and revocation',async()=>{sql.exec("CREATE TRIGGER fixture_fault BEFORE UPDATE OF revoked_at ON d1_auth_sessions BEGIN SELECT RAISE(ABORT,'fixture'); END");const n=sql.prepare('SELECT count(*) n FROM d1_auth_sessions').get().n;await assert.rejects(core.rotateD1AuthSession(db,session.token,policy));assert.equal(sql.prepare('SELECT count(*) n FROM d1_auth_sessions').get().n,n);assert(await core.getD1AuthSession(db,session.token,policy));sql.exec('DROP TRIGGER fixture_fault')});
 await check('revoke one and all sessions',async()=>{assert(await core.revokeD1AuthSession(db,session.token,policy));assert.equal(await core.getD1AuthSession(db,session.token,policy),null);const a=await login(),b=await login();assert(await core.revokeAllD1AuthSessions(db,a.token,policy));assert.equal(await core.getD1AuthSession(db,a.token,policy),null);assert.equal(await core.getD1AuthSession(db,b.token,policy),null)});
 sql.close();console.log(`Auth prototype: ${count}/${count} synthetic behavior checks passed. No HTTP/Workers/Auth migration claim.`);
}finally{rmSync(dir,{recursive:true,force:true})}
