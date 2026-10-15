import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const jsx=(type,props)=>({type,props});
function nodes(root){const result=[];function walk(n){if(Array.isArray(n))return n.forEach(walk);if(n&&typeof n==='object'){result.push(n);walk(n.props?.children)}}walk(root);return result;}
function fixture(){
 const states=[],refs=[],refreshes=[];let cursor=0,refCursor=0;
 const mocks={
  'react/jsx-runtime':{jsx,jsxs:jsx},react:{useEffect(){},useRef(initial){const i=refCursor++;return refs[i]??(refs[i]={current:initial})},useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=v}]}},
  'next/navigation':{useRouter:()=>({refresh:()=>refreshes.push(true)})},'next/link':{default:'a'},'./lesson-link':{LessonLink:'a'},'./support-booking-prompt':{SupportBookingPrompt:'Support'},'./learning-room.module.css':{default:{}},
  '@/components/auth/sign-out-button':{SignOutButton:'SignOut'},'@/components/course/course-reference-library':{CourseReferenceLibrary:'Library'},'@/components/site/brand-mark':{BrandMark:'Brand'},'@/data/site':{siteConfig:{name:'Fixture'}},'@/lib/lesson-title':{cleanLessonTitle:x=>x},'@/lib/youtube':{toYouTubeThumbnailUrl:()=>''},
 };
 const code=ts.transpileModule(readFileSync('components/course/learning-room.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;const compiled={exports:{}};
 new Function('exports','module','require',code)(compiled.exports,compiled,name=>{if(name in mocks)return mocks[name];throw Error('Unexpected import '+name)});
 return {states,refreshes,render(lesson='original-lesson'){cursor=0;refCursor=0;return compiled.exports.LearningRoom({course:{slug:'fixture-course',title:'Fixture'},currentLesson:{id:lesson,title:'Lesson',access:'paid'},lessons:[],authProvider:'native-d1',authContext:'A'.repeat(43)})}};
}
function saveButton(root){return nodes(root).find(n=>n.type==='button'&&n.props.onClick?.name==='updateProgress')}
test('native progress retry preserves operation ID and never shows completion for timeout or rejected write',async()=>{
 const original=globalThis.fetch,requests=[],f=fixture();
 try{
  globalThis.fetch=async(url,options)=>{assert.equal(options.headers['X-TAM-Auth-Context'],'A'.repeat(43));requests.push({url,body:JSON.parse(options.body)});throw Error('Synthetic network timeout')};
  await saveButton(f.render()).props.onClick();assert.equal(f.states[1],false);assert.equal(f.states[3],false);assert.equal(f.refreshes.length,0);
  globalThis.fetch=async(url,options)=>{assert.equal(options.headers['X-TAM-Auth-Context'],'A'.repeat(43));requests.push({url,body:JSON.parse(options.body)});return Response.json({ok:false,code:'WRITE_DISABLED'},{status:503})};
  await saveButton(f.render()).props.onClick();assert.equal(f.states[1],false);assert.equal(f.refreshes.length,0);assert.equal(requests[0].body.operationId,requests[1].body.operationId);assert.match(requests[0].body.operationId,/^[0-9a-f-]{36}$/);assert.equal(requests[0].url,'/api/cloudflare-student/progress');
  globalThis.fetch=async(url,options)=>{assert.equal(options.headers['X-TAM-Auth-Context'],'A'.repeat(43));requests.push({url,body:JSON.parse(options.body)});return Response.json({ok:true,progressPercent:25})};
  await saveButton(f.render()).props.onClick();assert.equal(f.states[1],true);assert.equal(f.refreshes.length,1);assert.equal(requests[2].body.operationId,requests[0].body.operationId);assert.match(f.states[2],/25%/);
 }finally{globalThis.fetch=original}
});
