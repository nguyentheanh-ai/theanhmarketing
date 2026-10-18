import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/cloudflare/d1-student-dashboard-activity.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {logD1StudentDashboardVisit}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',project='vsxxgdzwtscuxcmjfckt',token='a'.repeat(43),now=Date.parse('2026-10-18T12:00:00Z'),stamp=new Date(now).toISOString();
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const file of ['d1-course-access-source-prototype.sql','d1-auth-core-prototype.sql','d1-student-activity-prototype.sql'])sql.exec(readFileSync('scripts/'+file,'utf8'));
 sql.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').run(id,'qa@example.invalid');
 sql.prepare('INSERT INTO d1_auth_accounts(user_id,email_confirmed_at,created_at,updated_at) VALUES(?,?,?,?)').run(id,stamp,stamp,stamp);
 sql.prepare("INSERT INTO d1_auth_sync_state VALUES(?,?,?,'verified')").run(project,stamp,stamp);
 sql.prepare('INSERT INTO d1_auth_sessions VALUES(?,?,?,?,?,?,?,NULL)').run(createHash('sha256').update(token).digest('hex'),id,project,'family',1,stamp,new Date(now+3600000).toISOString());
 let onBatch;
 const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,batch:async statements=>{
  if(onBatch){const hook=onBatch;onBatch=null;hook();}
  sql.exec('BEGIN');try{const results=statements.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}
 }};
 const policy={now,sessionTtlMs:3600000,allowedUserIds:[id]};
 return {sql,db,policy,log:()=>logD1StudentDashboardVisit(db,token,['fixture-course'],policy),race:hook=>{onBatch=hook}};
}
test('native dashboard log uses verified identity and atomically deduplicates repeated visits',async t=>{
 const f=fixture(t);const result=await Promise.all([f.log(),f.log()]);assert.equal(result.filter(r=>r.recorded).length,1);
 const row=f.sql.prepare('SELECT * FROM d1_student_activity_events').get();assert.equal(row.user_id,id);assert.equal(row.student_email,'qa@example.invalid');assert.equal(row.actor_id,id);assert.equal(row.event_type,'student_login_success');
 assert.deepEqual(JSON.parse(row.metadata),{route:'/dashboard',ownedSlugs:['fixture-course']});assert(!JSON.stringify(row).includes(token));
});
test('revoked, wrong cohort and stale mirrors cannot create events',async t=>{
 const f=fixture(t);await assert.rejects(logD1StudentDashboardVisit(f.db,token,[],{...f.policy,allowedUserIds:[other]}),/Verified student/);
 f.sql.exec("UPDATE d1_auth_sessions SET revoked_at='2026-10-18T12:00:00Z'");await assert.rejects(f.log(),/Verified student/);
 f.sql.exec("UPDATE d1_auth_sessions SET revoked_at=NULL;UPDATE d1_auth_sync_state SET status='pending'");await assert.rejects(f.log(),/current and verified/);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_student_activity_events').get().n,0);
});
test('session changes after lookup and before INSERT are rechecked in the write statement',async t=>{
 const f=fixture(t);f.race(()=>f.sql.exec('UPDATE d1_auth_accounts SET session_version=2'));assert.equal((await f.log()).recorded,false);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_student_activity_events').get().n,0);
});
