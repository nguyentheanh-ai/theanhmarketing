import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {spawnSync} from 'node:child_process';import {mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-course-content";export * from "./lib/courses/course-projection";export * from "./lib/course-learning";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,project='vsxxgdzwtscuxcmjfckt',snapshot='2026-10-15T00:00:00.000Z';
const lesson=(n,mod,extra={})=>({id:id(n),module_id:id(mod),course_id:id(1),title:'Bài '+n,description:null,content:'Nội dung thật trong fixture',lesson_type:'text',duration:'5 phút',youtube_url:'',embed_url:'',access_type:'enrolled_only',sort_order:n,status:'published',published_at:snapshot,lesson_resources:[{id:id(n+100),lesson_id:id(n),title:'Tài liệu',url:'https://files.example.invalid/private.pdf'}],...extra});
const source={id:id(1),slug:'fixture-course',title:'Khóa thử',short_description:null,description:'Nội dung',price:799000,original_price:null,status:'open',lms_status:'published',visibility:'enrolled',duration:null,lesson_count:4,level:null,updated_at:snapshot,banner_image:null,thumbnail_image:null,preview_video_url:null,cta_text:null,sort_order:1,unknown_cms_column:{keep:'all columns'},course_modules:[{id:id(2),course_id:id(1),title:'Sau',description:null,sort_order:2,status:'published',lessons:[lesson(5,2),lesson(6,2,{status:'draft'})]},{id:id(3),course_id:id(1),title:'Trước',description:null,sort_order:1,status:'published',lessons:[lesson(4,3,{youtube_url:'https://youtu.be/abcdef12345',embed_url:null,content:null}),lesson(7,3,{content:'',description:'',lesson_resources:[]})]}]};
function sqlite(file,sql,params=[]){const r=spawnSync('python3',['-c',"import sqlite3,json,sys\np=json.load(sys.stdin);c=sqlite3.connect(p['file']);c.row_factory=sqlite3.Row\nif p.get('script'):c.executescript(p['sql']);rows=[]\nelse:rows=[dict(r) for r in c.execute(p['sql'],p['params']).fetchall()]\nc.commit();print(json.dumps(rows))"],{input:JSON.stringify({file,sql,params}),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
function db(file){return {first:async(sql,params)=>sqlite(file,sql,params)[0]??null};}
const file=join(mkdtempSync(join(tmpdir(),'course-content-')),'fixture.sqlite');
const schema=readFileSync('scripts/d1-course-content-prototype.sql','utf8');
const r=spawnSync('python3',['-c','import sqlite3,sys;sqlite3.connect(sys.argv[1]).executescript(sys.stdin.read())',file],{input:schema,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
const prepared=await h.prepareD1CourseContent(source,snapshot);sqlite(file,prepared.sql,prepared.params);sqlite(file,'INSERT INTO d1_course_content_sync VALUES(?,?,?,?,?)',[project,snapshot,snapshot,'verified',1]);
test('real SQLite content read preserves original IDs, publication, ordering, video and resources',async()=>{
 const course=await h.readD1PublishedCourse(db(file),source.slug,{now:Date.parse(snapshot)+1000});
 const ordered=h.getOrderedCourseLessons(course);assert.deepEqual(ordered.map(x=>x.id),[id(4),id(5)]);assert.equal(ordered[0].embedUrl,'https://www.youtube.com/embed/abcdef12345');assert.equal(ordered[1].resources[0].url,'https://files.example.invalid/private.pdf');assert.equal(course.visibility,'enrolled');
 const target=sqlite(file,'SELECT * FROM d1_course_content')[0];assert((await h.verifyD1CourseContent(source,target)).matched);assert.equal(JSON.parse(target.source_document).unknown_cms_column.keep,'all columns');
});
test('stale, future, pending, mismatched snapshot and missing slug fail closed in actual SQL',async()=>{
 for(const now of [Date.parse(snapshot)-1,Date.parse(snapshot)+300001])await assert.rejects(h.readD1PublishedCourse(db(file),source.slug,{now}));
 await assert.rejects(h.readD1PublishedCourse(db(file),'missing',{now:Date.parse(snapshot)}));
 sqlite(file,"UPDATE d1_course_content_sync SET status='pending'");await assert.rejects(h.readD1PublishedCourse(db(file),source.slug,{now:Date.parse(snapshot)}));sqlite(file,"UPDATE d1_course_content_sync SET status='verified', source_snapshot_at='2026-10-14T23:59:59.000Z'");await assert.rejects(h.readD1PublishedCourse(db(file),source.slug,{now:Date.parse(snapshot)}));sqlite(file,'UPDATE d1_course_content_sync SET source_snapshot_at=?',[snapshot]);sqlite(file,'UPDATE d1_course_content_sync SET course_count=2');await assert.rejects(h.readD1PublishedCourse(db(file),source.slug,{now:Date.parse(snapshot)}));sqlite(file,'UPDATE d1_course_content_sync SET course_count=1');
});
test('document tampering cannot retain a valid stored digest; JSON key ordering is canonical',async()=>{
 const target=sqlite(file,'SELECT * FROM d1_course_content')[0];const changed=JSON.parse(target.source_document);changed.course_modules[0].lessons[0].content='Changed';await assert.rejects(h.verifyD1CourseContent(source,{...target,source_document:JSON.stringify(changed)}));
 await assert.rejects(h.verifyD1CourseContent(source,{...target,course_id:id(999)}));assert((await h.verifyD1CourseContent(source,{...target,source_document:JSON.stringify(source)})).matched);
});
test('cross-course, duplicate lesson IDs, cross-lesson resources and oversized input denied before import',async()=>{
 for(const mutate of [s=>s.course_modules[0].course_id=id(8),s=>s.course_modules[0].lessons[0].module_id=id(3),s=>s.course_modules[0].lessons[0].lesson_resources[0].lesson_id=id(4),s=>s.course_modules[1].lessons[0].id=id(5),s=>s.description='x'.repeat(512*1024)]){const s=structuredClone(source);mutate(s);await assert.rejects(h.prepareD1CourseContent(s,snapshot));}
});
test('initial marker compares actual document again and cannot promote edited or expired source',async()=>{
 const fresh=new Date().toISOString(),f=join(mkdtempSync(join(tmpdir(),'course-marker-')),'fixture.sqlite');
 const setup=spawnSync('python3',['-c','import sqlite3,sys;sqlite3.connect(sys.argv[1]).executescript(sys.stdin.read())',f],{input:schema,encoding:'utf8'});assert.equal(setup.status,0,setup.stderr);
 const plan=await h.prepareD1CourseContent(source,fresh);sqlite(f,plan.sql,plan.params);sqlite(f,'INSERT INTO d1_course_content_sync VALUES(?,?,?,?,?)',[project,fresh,fresh,'pending',1]);
 const target=sqlite(f,'SELECT * FROM d1_course_content')[0];
 await assert.rejects(h.verifyD1CourseContent(source,{...target,source_snapshot_at:snapshot},fresh));
 await assert.rejects(h.prepareVerifiedD1CourseMarker(source,target,fresh,Date.parse(fresh)+300001));
 const marker=await h.prepareVerifiedD1CourseMarker(source,target,fresh);
 sqlite(f,"UPDATE d1_course_content SET source_document=json_set(source_document,'$.title','Changed')");assert.deepEqual(sqlite(f,marker.sql,marker.params),[]);assert.equal(sqlite(f,'SELECT status FROM d1_course_content_sync')[0].status,'pending');
 sqlite(f,'UPDATE d1_course_content SET source_document=?',[target.source_document]);assert.deepEqual(sqlite(f,marker.sql,marker.params),[{status:'verified'}]);
 assert.deepEqual(sqlite(f,marker.sql,marker.params),[]);
});
test('additive identity guards also reject NULL on the earlier SQLite primary-key schema',()=>{
 const legacy=schema.replaceAll('PRIMARY KEY NOT NULL','PRIMARY KEY');
 const code="import sqlite3,json,sys\np=json.load(sys.stdin);c=sqlite3.connect(':memory:');c.executescript(p['schema']);errors=[]\nfor sql in p['queries']:\n try:c.execute(sql)\n except sqlite3.IntegrityError as e:errors.append(str(e))\nprint(json.dumps(errors))";
 const queries=["INSERT INTO d1_course_content VALUES(NULL,'nullable','vsxxgdzwtscuxcmjfckt','{\"id\":null,\"slug\":\"nullable\"}','"+'0'.repeat(64)+"','2026-10-15T00:00:00Z')","INSERT INTO d1_course_content_sync VALUES(NULL,'2026-10-15T00:00:00Z','2026-10-15T00:00:00Z','pending',0)"];
 const result=spawnSync('python3',['-c',code],{input:JSON.stringify({schema:legacy,queries}),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),['course_identity_required','course_project_required']);
});
test('course refresh compares content and old marker in SQL; intervening edits fail closed',async()=>{
 const target=sqlite(file,'SELECT * FROM d1_course_content')[0],marker=sqlite(file,'SELECT * FROM d1_course_content_sync')[0];
 // Local initial fixture cutoff must be historic relative to real SQL now.
 const old=new Date(Date.now()-60000).toISOString();sqlite(file,'UPDATE d1_course_content SET source_snapshot_at=?',[old]);sqlite(file,'UPDATE d1_course_content_sync SET source_snapshot_at=?,last_verified_at=?',[old,old]);
 target.source_snapshot_at=old;marker.source_snapshot_at=old;marker.last_verified_at=old;
 const fresh=new Date().toISOString(),plan=await h.prepareD1CourseRevalidation(source,target,marker,fresh);
 sqlite(file,"UPDATE d1_course_content SET source_document=json_set(source_document,'$.title','Changed')");assert.deepEqual(sqlite(file,plan.statements[0].sql,plan.statements[0].params),[]);
 sqlite(file,'UPDATE d1_course_content SET source_document=?',[target.source_document]);assert.equal(sqlite(file,plan.statements[0].sql,plan.statements[0].params).length,1);assert.deepEqual(sqlite(file,plan.statements[1].sql,plan.statements[1].params),[{status:'verified'}]);
 const changed=structuredClone(source);changed.title='Changed';await assert.rejects(h.prepareD1CourseRevalidation(changed,target,marker,fresh));await assert.rejects(h.prepareD1CourseRevalidation(source,target,marker,new Date(Date.now()+1000).toISOString()));
});
