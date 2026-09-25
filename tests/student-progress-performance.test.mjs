import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
function load(file,mocks={}) {const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const m={exports:{}};new Function('exports','module','require',code)(m.exports,m,n=>n in mocks?mocks[n]:n.startsWith('@/')?load(n.slice(2)+'.ts',mocks):(()=>{throw Error(n)})());return m.exports;}
const uid='00000000-0000-4000-8000-000000000001';
const lesson='00000000-0000-4000-8000-000000000002';
test('completion reads exactly one course and never global CRM/resources/activity on the response path',async()=>{
 const calls=[];
 const client={from(table){assert.equal(table,'courses');calls.push(table);return {select(fields){assert.ok(!fields.includes('*'));return this},eq(k,v){assert.equal(k,'slug');assert.equal(v,'course');return this},maybeSingle:async()=>({data:{id:uid,slug:'course',title:'Course',lms_status:'published',course_modules:[{id:uid,status:'published',lessons:[{id:lesson,title:'Lesson',status:'published',youtube_url:'https://youtube.com/watch?v=test'},{id:uid,title:'Unready',status:'published'}]}]},error:null})}},rpc:async(name,args)=>{assert.equal(name,'crm_v2_lms_mark_lesson_completed');assert.equal(args.p_user_id,uid);assert.equal(args.p_lesson_id,lesson);assert.equal(args.p_total_lessons,1);return {data:{progress_percent:100,completed_lesson_ids:[lesson]},error:null}}};
 const service=load('services/lmsService.ts',{'@/lib/supabase/admin':{createSupabaseAdminClient:()=>client},'@/services/activityLogService':{logStudentActivity:()=>{throw Error('blocking activity')}},'@/services/studentProvisioningOperationService':{},'@/lib/admin/command-center-source':{}});
 const result=await service.markLessonCompleted({userId:uid,email:'fixture@example.invalid',courseSlug:'course',lessonId:lesson});assert.equal(result.ok,true);assert.equal(result.progressPercent,100);assert.deepEqual(calls,['courses']);assert.equal(result.activity.eventType,'lesson_completed');
});
test('progress route schedules activity after response and rejects first-password sessions',async()=>{
 let first=false;const scheduled=[];
 const route=load('app/api/student/progress/route.ts',{
 'next/server':{NextResponse:{json:(body,{status=200}={})=>({body,status})},after:fn=>scheduled.push(fn)},
 zod:{z:{object:()=>({parse:x=>x}),string:()=>({trim:()=>({min:()=>({})})}),boolean:()=>({optional:()=>({})})}},
 '@/lib/auth/session':{getCurrentAuth:async()=>({user:{id:uid,email:'fixture@example.invalid'}}),isAuthGuardEnabled:()=>true},
 '@/lib/auth/student-account':{shouldRequirePasswordChange:()=>first},
 '@/services/lmsService':{markLessonCompleted:async()=>({ok:true,progressPercent:100,completedLessonIds:[lesson],activity:{eventType:'lesson_completed'}})},
 '@/services/activityLogService':{logStudentActivity:async()=>({ok:true})},
 });
 const request={json:async()=>({courseSlug:'course',lessonId:lesson})};
 const result=await route.POST(request);assert.equal(result.body.ok,true);assert.equal('activity' in result.body,false);assert.equal(scheduled.length,1);
 first=true;assert.equal((await route.POST(request)).status,403);assert.equal(scheduled.length,1);
});
