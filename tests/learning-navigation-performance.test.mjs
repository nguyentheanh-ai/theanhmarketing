import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const jsx=(type,props,key)=>({type,props,key});
function load(file,mocks) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const m={exports:{}};new Function('exports','module','require',code)(m.exports,m,name=>{if(name in mocks)return mocks[name];throw new Error(`Unexpected dependency: ${name}`);});return m.exports;
}
function fixture({user={id:'student',email:'student@example.invalid'},adminRole=null,owned=['course'],visibility='private',access='paid',records={orders:[],leads:[]}}={}) {
 const calls=[];const scheduled=[];
 const lesson={id:'lesson-id',title:'Lesson',access,moduleOrder:1,moduleTitle:'Module'};
 const course={slug:'course',title:'Course',visibility};
 const page=load('app/learn/[course]/[lesson]/page.tsx',{
 'react/jsx-runtime':{jsx,jsxs:jsx},'next/server':{after:fn=>scheduled.push(fn)},
 'next/navigation':{redirect:url=>{throw new Error(`redirect:${url}`)},notFound:()=>{throw new Error('notFound')}},
 '@/components/course/learning-room':{LearningRoom:'room'},'@/data/course-reference-packs':{getCourseReferencePacks:()=>[]},
 '@/lib/auth/session':{getCurrentAuth:async()=>({user,adminRole})},
 '@/lib/course-access':{getCourseAccessSlugs:({email,orders,leads})=>{calls.push(['resolve',email,orders,leads]);return orders.map(x=>x.courseSlug)}},
 '@/lib/course-learning':{getOrderedCourseLessons:()=>[lesson,{...lesson,id:'next'}]},
 '@/services/activityLogService':{logStudentActivity:async()=>calls.push(['log'])},
 '@/services/courseService':{getPublishedCourseForStudent:async()=>course},
 '@/services/studentPortalAccessService':{getStudentPortalAccessRecords:async email=>{calls.push(['records',email]);return records}},
 '@/services/lmsService':{getStudentLmsAccess:async()=>{calls.push(['lms']);return {ownedSlugs:owned,completedLessonIds:['lesson-id']}}},
 });
 return {calls,scheduled,run:(id='lesson-id')=>page.default({params:Promise.resolve({course:'course',lesson:id})})};
}
test('lesson response uses student-scoped records and does not wait for activity writes',async()=>{
 const f=fixture();const out=await f.run();assert.equal(out.type,'room');assert.equal(out.key,'course:lesson-id');assert.equal(out.props.currentLessonCompleted,true);
 assert.deepEqual(f.calls.find(x=>x[0]==='records'),['records','student@example.invalid']);assert.ok(!f.calls.some(x=>x[0]==='log'));assert.equal(f.scheduled.length,1);await f.scheduled[0]();assert.ok(f.calls.some(x=>x[0]==='log'));
});
test('guest is redirected before any access or LMS reads on paid lessons',async()=>{const f=fixture({user:null});await assert.rejects(f.run(),/redirect:\/dang-nhap/);assert.equal(f.calls.length,0);assert.equal(f.scheduled.length,0)});
test('unowned student cannot render or log entry to paid lesson',async()=>{const f=fixture({owned:[]});await assert.rejects(f.run(),/redirect:\/dashboard\?error=course-access/);assert.equal(f.scheduled.length,0)});
test('payment access remains valid without an LMS enrollment',async()=>{const f=fixture({owned:[],records:{orders:[{courseSlug:'course'}],leads:[]}});assert.equal((await f.run()).type,'room')});
test('admin bypasses CRM access reads and free public lesson stays available',async()=>{const a=fixture({adminRole:'admin',owned:[]});assert.equal((await a.run()).type,'room');assert.ok(!a.calls.some(x=>x[0]==='records'));const f=fixture({user:null,visibility:'public',access:'free',owned:[]});assert.equal((await f.run()).type,'room');assert.ok(!f.calls.some(x=>x[0]==='records'))});
test('legacy lesson links resolve and changed lesson gets independent progress state',async()=>{const f=fixture();assert.equal((await f.run('lesson-2')).key,'course:next');assert.equal((await f.run('lesson-2')).props.currentLessonCompleted,false)});
