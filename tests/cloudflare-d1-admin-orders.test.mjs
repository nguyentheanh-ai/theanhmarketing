import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-admin-order-report";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const now=Date.parse('2026-10-18T12:00:00Z'),stamp=new Date(now).toISOString(),project='vsxxgdzwtscuxcmjfckt';
const user='00000000-0000-4000-8000-000000000001',token='a'.repeat(43),hash=createHash('sha256').update(token).digest('hex');
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const name of ['d1-course-access-source-prototype.sql','d1-auth-core-prototype.sql','d1-admin-role-prototype.sql','d1-native-order-settlement.sql'])sql.exec(readFileSync('scripts/'+name,'utf8'));
 sql.prepare('INSERT INTO d1_access_users VALUES(?,?,?)').run(user,'admin@example.invalid','owner');
 sql.prepare('INSERT INTO d1_auth_accounts(user_id,email_confirmed_at,user_metadata,created_at,updated_at) VALUES(?,?,?,?,?)').run(user,stamp,'{}',stamp,stamp);
 sql.prepare('INSERT INTO d1_auth_source_versions VALUES(?,?,?,?)').run(user,'17923248000000000000','0'.repeat(64),project);
 sql.prepare('INSERT INTO d1_admin_source_roles VALUES(?,?,?,?)').run(user,project,'17923248000000000000','owner');
 sql.prepare('INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(hash,user,project,'fixture',1,stamp,new Date(now+3600000).toISOString());
 sql.prepare('INSERT INTO d1_auth_sync_state VALUES(?,?,?,?)').run(project,stamp,stamp,'verified');
 sql.prepare('INSERT INTO d1_native_order_authority VALUES(?,?,?,?)').run(project,stamp,stamp,'verified');
 let id=10,hook;
 const add=(patch={})=>{const n=id++,row={id:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,order_code:'TAMTEST'+n,status:'paid',amount:100000,currency:'VND',email:'customer@example.invalid',phone:null,created_at:'2026-10-10T00:00:00Z',paid_at:'2026-10-17T17:00:00Z',...patch};sql.prepare('INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json) VALUES(?,?,?,?,?)').run(row.id,row.order_code,Number(row.amount),row.status,JSON.stringify(row));return row;};
 const db={first:async(q,p)=>{if(hook&&q.includes('admin_actor')){const run=hook;hook=null;run();}return sql.prepare(q).get(...p)??null;},batch:async()=>{throw Error('Read-only boundary');}};
 const policy={now,configuredOwnerEmails:[],allowedRoles:['owner','editor']};
 return {sql,db,policy,add,race:f=>{hook=f;},read:(query={range:'today'},value=token,extra={})=>core.readD1AdminOrderReport(db,value,query,{...policy,...extra})};
}
test('admin aggregates use payment date, VN day, distinct email/phone and existing summary, never raw rows',async t=>{
 const f=fixture(t);f.add();f.add({email:' CUSTOMER@example.invalid '});f.add({email:null,phone:'0901234567'});f.add({email:null,phone:'+84901234567'});f.add({status:'pending',created_at:'2026-10-17T16:59:59.999999Z'});f.add({paid_at:'2026-10-18T17:00:00Z'});
 const r=await f.read();assert.equal(r.status,'admin');assert.equal(r.paidCustomers,2);assert.equal(r.summary.paid,4);assert.equal(r.summary.revenue,400000);assert.equal(r.summary.total,4);assert.equal(r.summary.resolution,'hour');assert(!JSON.stringify(r).includes('example.invalid'));assert(!JSON.stringify(r).includes('TAMTEST'));assert(!JSON.stringify(r).includes('row_json'));
});
test('student metadata cannot elevate, protected editor overrides configured owner and restrictions are current',async t=>{
 const f=fixture(t);f.add();f.sql.exec("UPDATE d1_admin_source_roles SET protected_role=NULL;UPDATE d1_access_users SET admin_role='owner';UPDATE d1_auth_accounts SET user_metadata='{\"admin_role\":\"owner\"}'");
 assert.equal((await f.read()).status,'denied');assert.equal((await f.read({},token,{configuredOwnerEmails:['ADMIN@example.invalid']})).status,'admin');
 f.sql.exec("UPDATE d1_admin_source_roles SET protected_role='editor'");assert.equal((await f.read({},token,{configuredOwnerEmails:['admin@example.invalid'],allowedRoles:['owner']})).status,'denied');
});
test('session revocation, foreign tenant, version/status/claim races never expose aggregates',async t=>{
 const f=fixture(t);f.add();
 for(const change of ["UPDATE d1_auth_sessions SET revoked_at='2026-10-18T12:00:00Z'","UPDATE d1_auth_sessions SET project_id='pppiqhkectojxbmhqcnx'","UPDATE d1_auth_sessions SET expires_at='2026-10-18T12:00:00Z'","UPDATE d1_auth_accounts SET session_version=2","UPDATE d1_auth_accounts SET deleted_at='2026-10-18T12:00:00Z'","UPDATE d1_auth_accounts SET must_change_password=1","UPDATE d1_auth_accounts SET banned_until='2026-10-19T00:00:00Z'","UPDATE d1_admin_source_roles SET source_revision='00000000000000000000'","DELETE FROM d1_admin_source_roles"]){f.sql.exec('SAVEPOINT scenario');f.race(()=>f.sql.exec(change));assert.deepEqual(await f.read(),{status:'denied'});f.sql.exec('ROLLBACK TO scenario;RELEASE scenario');}
 assert.deepEqual(await f.read({},'user-id'),{status:'denied'});
});
test('stale or invalidated mirrors and row limits fail closed; arbitrary filters cannot silently change meaning',async t=>{
 const f=fixture(t);f.add();for(const table of ['d1_auth_sync_state','d1_native_order_authority']){f.sql.exec('SAVEPOINT scenario');f.race(()=>f.sql.exec(`UPDATE ${table} SET status='pending'`));await assert.rejects(f.read());f.sql.exec('ROLLBACK TO scenario;RELEASE scenario');}
 for(const query of [{range:'custom',dateFrom:'2026-02-30',dateTo:'2026-03-01'},{range:'custom',dateFrom:'2020-01-01',dateTo:'2026-01-01'},{range:'today',search:'customer'},{range:'today',filters:{status:'paid'}}])await assert.rejects(f.read(query));
 f.sql.exec('WITH RECURSIVE n(v) AS (VALUES(1) UNION ALL SELECT v+1 FROM n WHERE v<10000) INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json) SELECT printf(\'id-%d\',v),printf(\'TAMBULK%d\',v),1,\'paid\',json_object(\'id\',printf(\'id-%d\',v),\'order_code\',printf(\'TAMBULK%d\',v),\'status\',\'paid\',\'amount\',1) FROM n');await assert.rejects(f.read(),/unavailable/i);
});
test('admin role import reads protected metadata only, never overwrites a previous role and preserves source revision',()=>{
 const row={id:user,updatedAt:'2026-10-18T12:00:00.000001Z',appMetadata:{admin_role:'editor'},userMetadata:{admin_role:'owner'}};
 const plan=core.prepareD1AdminRoleImport([row]);assert.equal(plan[0].params[3],'editor');assert.equal(plan[0].params[2],'00001792324800000001');assert(!plan[0].sql.includes('REPLACE'));assert(!plan[0].sql.includes('CONFLICT'));
 assert.equal(core.prepareD1AdminRoleImport([{...row,appMetadata:{}}])[0].params[3],null);assert.throws(()=>core.prepareD1AdminRoleImport([row,row]));
});
