import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-student-public-catalog";export * from "./lib/cloudflare/student-public-catalog";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const now=Date.parse('2026-10-18T12:00:00Z'),stamp=new Date(now).toISOString();
const input=()=>({courses:[{id:'course-id',slug:'fixture-source-course',title:'Khóa thật mẫu kiểm thử',status:'open',lms_status:'published',visibility:'enrolled',price:100000,created_at:stamp,
 course_modules:[{id:'module',title:'Module',sort_order:1,status:'published',lessons:[{id:'lesson',title:'Bài',status:'published',duration:'10 phút',sort_order:1,content:'NEVER-RETAIN-PRIVATE-BODY',youtube_url:'NEVER-RETAIN-PRIVATE-VIDEO',lesson_resources:[{title:'Hidden',url:'NEVER-RETAIN-PRIVATE-FILE'}]}]}]}],
 resources:[{id:'resource',title:'Tài liệu thật mẫu',description:null,thumbnail:null,file_url:'/fixture-download',access_type:'free',created_at:stamp}]});
function fixture(t){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(readFileSync('scripts/d1-student-public-catalog-prototype.sql','utf8'));
 const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,batch:async statements=>{
  sql.exec('BEGIN');try{const result=statements.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}
 }};
 const store=async(value,at=stamp)=>{const plan=await core.prepareD1StudentPublicCatalog(value,at);sql.prepare(plan.statement.sql).run(...plan.statement.params);return plan;};
 return {sql,db,store,read:options=>core.readD1StudentPublicCatalog(db,options??{now})};
}
test('catalog projection preserves real course/resource fields and strips private lesson data before storage',async t=>{
 const f=fixture(t),source=input(),plan=await f.store(source);
 for(const value of ['NEVER-RETAIN-PRIVATE-BODY','NEVER-RETAIN-PRIVATE-VIDEO','NEVER-RETAIN-PRIVATE-FILE'])assert(!plan.sourceDocument.includes(value));
 await assert.rejects(f.read(),/Verified public/);
 await core.verifyD1StudentPublicCatalog(f.db,source,stamp,{now});
 const actual=await f.read();assert.deepEqual(actual,plan.normalized);assert.equal(actual.courses[0].title,source.courses[0].title);
 assert.equal(actual.resources[0].fileUrl,'/fixture-download');assert.equal(actual.resources[0].access,'Miễn phí');
 assert.equal(actual.courses[0].modules[0].lessons[0].content,'');assert.equal(actual.courses[0].modules[0].lessons[0].youtubeUrl,'');
});
test('missing, stale, future and corrupted catalogues fail without fallback data',async t=>{
 const f=fixture(t),source=input();await assert.rejects(f.read(),/Verified public/);
 await f.store(source);await core.verifyD1StudentPublicCatalog(f.db,source,stamp,{now});
 await assert.rejects(f.read({now:now+300001}),/Verified public/);await assert.rejects(f.read({now:now-1}),/Verified public/);
 f.sql.exec("UPDATE d1_student_catalog_snapshots SET normalized_document='{}'");await assert.rejects(f.read(),/Verified public/);
});
test('older or same-time conflicting snapshots cannot replace a verified newer publication',async t=>{
 const f=fixture(t),original=input();await f.store(original);await core.verifyD1StudentPublicCatalog(f.db,original,stamp,{now});
 for(const at of [new Date(now-1000).toISOString(),stamp]){
  const altered=input();altered.courses[0].title='Conflicting';await f.store(altered,at);
  await assert.rejects(core.verifyD1StudentPublicCatalog(f.db,altered,at,{now}));
  assert.equal((await f.read()).courses[0].title,original.courses[0].title);
 }
});
test('verified empty source keeps existing catalogue policy; malformed types or duplicate identities are rejected',async t=>{
 const f=fixture(t),empty={courses:[],resources:[]};await f.store(empty);await core.verifyD1StudentPublicCatalog(f.db,empty,stamp,{now});
 const result=await f.read();assert(result.courses.length>0);assert(result.resources.length>0);
 for(const mutate of [s=>s.courses.push(s.courses[0]),s=>s.resources.push(s.resources[0]),s=>s.courses[0].price={},s=>s.resources[0].file_url={},s=>s.courses[0].course_modules[0].lessons[0].duration={}]){
  const source=input();mutate(source);await assert.rejects(core.prepareD1StudentPublicCatalog(source,stamp),/Verified public/);
 }
});
