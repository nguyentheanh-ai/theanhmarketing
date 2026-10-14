import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['lib/cloudflare/d1-student-session-access.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {readD1StudentSessionAccess}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const now=Date.parse('2026-10-15T00:00:00Z'),stamp=new Date(now).toISOString(),project='vsxxgdzwtscuxcmjfckt';
const token='a'.repeat(43),hash=createHash('sha256').update(token).digest('hex');
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const file of ['d1-lms-compatibility-prototype.sql','d1-course-access-source-prototype.sql','d1-lms-legacy-enrollment-owners-prototype.sql','d1-auth-core-prototype.sql'])sql.exec(readFileSync('scripts/'+file,'utf8'));
 for(const [id,email] of [['user-a','a@example.invalid'],['user-b','b@example.invalid']]){sql.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').run(id,email);sql.prepare('INSERT INTO d1_auth_accounts(user_id,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?)').run(id,stamp,stamp,stamp)}
 sql.prepare('INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(hash,'user-a',project,'family',1,stamp,new Date(now+3600000).toISOString());
 for(const table of ['d1_auth_sync_state','d1_access_sync_state'])sql.prepare(`INSERT INTO ${table} VALUES(?,?,?,?)`).run(project,stamp,stamp,'verified');
 sql.prepare('INSERT INTO d1_access_orders VALUES(?,?,?,?,?,?,?,NULL)').run('oa','a@example.invalid','paid','course-a','Fixture',null,null);
 sql.prepare('INSERT INTO d1_access_orders VALUES(?,?,?,?,?,?,?,NULL)').run('ob','b@example.invalid','paid','course-b','Fixture',null,null);
 let onAccess;
 const db={first:async(q,p)=>{if(onAccess&&q.includes('legacy_evidence_json')){const hook=onAccess;onAccess=null;hook()}return sql.prepare(q).get(...p)??null},batch:async()=>{throw new Error('Reader must not write')}};
 return {sql,read:(value=token)=>readD1StudentSessionAccess(db,value,{now,sessionTtlMs:3600000}),race:hook=>{onAccess=hook}};
}
test('opaque session resolves only its own original user and course rights without writing',async t=>{const f=fixture(t),r=await f.read();assert.equal(r.status,'student');assert.equal(r.user.id,'user-a');assert.deepEqual(r.access.ownedSlugs,['course-a']);assert(!r.access.ownedSlugs.includes('course-b'));assert.equal((await f.read('user-b')).status,'guest')});
test('revoked, expired, foreign-project and changed-version sessions cannot read rights',async t=>{const f=fixture(t);for(const [q,p] of [["UPDATE d1_auth_sessions SET revoked_at=?",[stamp]],["UPDATE d1_auth_sessions SET expires_at=?",[stamp]],["UPDATE d1_auth_sessions SET project_id=?",['pppiqhkectojxbmhqcnx']],["UPDATE d1_auth_accounts SET session_version=2 WHERE user_id='user-a'",[]]]){f.sql.exec('SAVEPOINT scenario');f.sql.prepare(q).run(...p);assert.equal((await f.read()).status,'guest');f.sql.exec('ROLLBACK TO scenario');f.sql.exec('RELEASE scenario')}});
test('must-change-password returns redirect status before exposing rights; admin path is not silently downgraded',async t=>{const f=fixture(t);f.sql.exec("UPDATE d1_auth_accounts SET must_change_password=1 WHERE user_id='user-a'");const r=await f.read();assert.equal(r.status,'password-change-required');assert.equal(r.access,undefined);f.sql.exec("UPDATE d1_auth_accounts SET must_change_password=0;UPDATE d1_access_users SET admin_role='owner' WHERE id='user-a'");await assert.rejects(f.read(),/Admin access projection/) });
test('revocation between session lookup and rights query is denied in the rights statement',async t=>{const f=fixture(t);f.race(()=>f.sql.prepare('UPDATE d1_auth_sessions SET revoked_at=?').run(stamp));assert.equal((await f.read()).status,'guest')});
test('credential/status/password-change races cannot use the earlier session lookup',async t=>{const f=fixture(t);for(const q of ["UPDATE d1_auth_accounts SET session_version=2 WHERE user_id='user-a'","UPDATE d1_auth_accounts SET deleted_at='2026-10-15T00:00:00Z' WHERE user_id='user-a'","UPDATE d1_auth_accounts SET must_change_password=1 WHERE user_id='user-a'","UPDATE d1_auth_accounts SET banned_until='2026-10-16T00:00:00Z' WHERE user_id='user-a'"]){f.sql.exec('SAVEPOINT scenario');f.race(()=>f.sql.exec(q));assert.equal((await f.read()).status,'guest');f.sql.exec('ROLLBACK TO scenario');f.sql.exec('RELEASE scenario')}});
test('both Auth and rights projections must be current, including mirror changes during the rights query',async t=>{const f=fixture(t);for(const table of ['d1_auth_sync_state','d1_access_sync_state']){f.sql.exec('SAVEPOINT scenario');f.sql.prepare(`UPDATE ${table} SET source_snapshot_at=?`).run(new Date(now-300001).toISOString());await assert.rejects(f.read(),/current and verified/);f.sql.exec('ROLLBACK TO scenario');f.sql.exec('RELEASE scenario')}f.race(()=>f.sql.exec("UPDATE d1_auth_sync_state SET status='pending'"));await assert.rejects(f.read(),/current and verified/)});
