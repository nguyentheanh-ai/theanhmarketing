import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/native-order-settlement";export * from "./lib/cloudflare/native-paid-order-access";export {getCourseAccessSlugs} from "./lib/course-access";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const code='TAMTEST001',email='qa@example.invalid',kit='bo-agent-kit-x10-hieu-suat-cong-viec';
function fixture(t,patch={}){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 for(const file of ['d1-native-order-settlement.sql','d1-course-access-source-prototype.sql','d1-native-paid-order-access.sql'])sql.exec(readFileSync('scripts/'+file,'utf8'));
 const stamp=new Date(Date.now()-1000).toISOString();sql.prepare('INSERT INTO d1_native_order_authority VALUES(?,?,?,?)').run('vsxxgdzwtscuxcmjfckt',stamp,stamp,'verified');
 const source={id:'00000000-0000-4000-8000-000000000001',order_code:code,status:'pending',amount:100000,currency:'VND',email:' QA@Example.invalid ',course_slug:'course-one',course_title:'Fixture',order_items:[],...patch};
 sql.prepare('INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json) VALUES(?,?,?,?,?)').run(source.id,code,100000,'pending',JSON.stringify(source));
 const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,all:async(q,p)=>sql.prepare(q).all(...p),batch:async ss=>{sql.exec('BEGIN');try{const result=ss.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
 const pay=()=>h.settleNativeSepayOrder(db,{id:123,referenceCode:'FIXTURE-123',code,transferType:'in',accountNumber:'1234567890',transferAmount:100000},{expectedAccount:'1234567890',allowedOrderCodes:[code]});
 const apply=()=>h.applyNativePaidOrderAccess(db,code,[code]);
 const access=(who=email,leads=[])=>h.getCourseAccessSlugs({email:who,leads,orders:sql.prepare('SELECT normalized_email email,status,course_slug courseSlug,course_title courseTitle,payment_plan paymentPlan,order_items_json FROM d1_access_orders').all().map(r=>({...r,orderItems:JSON.parse(r.order_items_json)}))});
 return {sql,db,pay,apply,access,source};
}
test('settlement then access application unlocks exact course for payer; retry has one receipt and no cross-user access',async t=>{
 const f=fixture(t);await assert.rejects(f.apply());assert.deepEqual(f.access(),[]);await f.pay();await f.apply();await f.apply();assert.deepEqual(f.access(),['course-one']);assert.deepEqual(f.access('someone-else@example.invalid'),[]);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_native_order_access_applied').get().n,1);assert.equal(f.sql.prepare('SELECT status FROM d1_native_order_fulfillment').get().status,'pending');
});
test('combo item precedence, preorder deposit exclusion, and admin revoke rules survive native payment',async t=>{
 const f=fixture(t,{course_slug:kit,payment_plan:'agent-kit-preorder-deposit-399',order_items:[{slug:kit,title:'Cọc preorder'},{slug:'course-two',title:'Course 2'}]});await f.pay();await f.apply();assert.deepEqual(f.access(),['course-two']);assert.deepEqual(f.access(email,[{email,source:'admin-access-revoke:course-two',createdAt:new Date().toISOString()}]),[]);
});
test('existing imported pending order updates status only and preserves identity',async t=>{
 const f=fixture(t);f.sql.prepare('INSERT INTO d1_access_orders(id,normalized_email,status,course_slug,course_title,order_items_json) VALUES(?,?,?,?,?,?)').run(f.source.id,email,'pending','course-one','Fixture','[]');await f.pay();await f.apply();assert.deepEqual(f.access(),['course-one']);assert.equal(f.sql.prepare('SELECT id FROM d1_access_orders').get().id,f.source.id);
});
test('conflicting imported owner cannot be overwritten or receive payer access',async t=>{
 const f=fixture(t);f.sql.prepare('INSERT INTO d1_access_orders(id,normalized_email,status,course_slug,course_title,order_items_json) VALUES(?,?,?,?,?,?)').run(f.source.id,'other@example.invalid','pending','course-one','Fixture','[]');await f.pay();await assert.rejects(f.apply());assert.equal(f.sql.prepare('SELECT status FROM d1_access_orders').get().status,'pending');assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_native_order_access_applied').get().n,0);
});
test('authority revoked mid-batch rolls back both access row and receipt',async t=>{
 const f=fixture(t);await f.pay();f.sql.exec("CREATE TRIGGER invalidate AFTER INSERT ON d1_access_orders BEGIN UPDATE d1_native_order_authority SET status='pending'; END");await assert.rejects(f.apply());assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_access_orders').get().n,0);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_native_order_access_applied').get().n,0);assert.equal(f.sql.prepare('SELECT status FROM d1_native_order_authority').get().status,'verified');
});
test('changed snapshot between read and batch cannot grant stale purchased content',async t=>{
 const f=fixture(t);await f.pay();const batch=f.db.batch;f.db.batch=async ss=>{f.sql.exec("UPDATE d1_native_orders SET revision=revision+1,row_json=json_set(row_json,'$.course_slug','other-course')");return batch(ss)};await assert.rejects(f.apply());assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_access_orders').get().n,0);
});
test('lost acknowledgement retries safely and unapproved cohort fails closed',async t=>{
 const f=fixture(t);await f.pay();await assert.rejects(h.applyNativePaidOrderAccess(f.db,code,[]));const batch=f.db.batch;f.db.batch=async ss=>{await batch(ss);throw Error('lost ack')};await assert.rejects(f.apply());f.db.batch=batch;await f.apply();assert.deepEqual(f.access(),['course-one']);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_native_order_access_applied').get().n,1);
});

test('full Agent Kit purchase unlocks kit while missing settlement proof prevents application',async t=>{
 const f=fixture(t,{course_slug:kit,payment_plan:'agent-kit-standard-999'});await f.pay();await f.apply();assert.deepEqual(f.access(),[kit]);f.sql.exec('PRAGMA foreign_keys=OFF; DELETE FROM d1_native_sepay_receipts; PRAGMA foreign_keys=ON');await assert.rejects(f.apply());
});
test('corrupted access row after insert rolls back the entire application',async t=>{
 const f=fixture(t);await f.pay();f.sql.exec("CREATE TRIGGER corrupt_access AFTER INSERT ON d1_access_orders BEGIN UPDATE d1_access_orders SET normalized_email='other@example.invalid'; END");await assert.rejects(f.apply());assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_access_orders').get().n,0);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_native_order_access_applied').get().n,0);
});
