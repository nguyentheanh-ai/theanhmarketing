import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
function read(file,mocks){const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const m={exports:{}};new Function('exports','module','require',code)(m.exports,m,n=>n in mocks?mocks[n]:require(n));return m.exports;}
function render(){
 const Link=({children,prefetch,...props})=>React.createElement('a',props,children);
 const styles=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)});
 const {LearningRoom}=read('components/course/learning-room.tsx',{
 'next/navigation':{useRouter:()=>({refresh(){}})},'next/link':Link,'./lesson-link':{LessonLink:Link},'./learning-room.module.css':styles,
 '@/components/auth/sign-out-button':{SignOutButton:()=>null},'@/components/site/brand-mark':{BrandMark:()=>null},
 '@/components/course/course-reference-library':{CourseReferenceLibrary:()=>{throw new Error('Heavy reference library should not mount until opened')}},
 '@/data/site':{siteConfig:{name:'Academy'}},'@/lib/lesson-title':{cleanLessonTitle:x=>x},
 '@/lib/youtube':{toYouTubeThumbnailUrl:()=> 'https://img.youtube.com/vi/test/hqdefault.jpg'},
 });
 const lessons=Array.from({length:80},(_,i)=>({id:`l${i}`,title:`Bài ${i+1}`,access:'paid',moduleTitle:'Module',moduleOrder:1,embedUrl:'https://www.youtube.com/embed/test',youtubeUrl:'https://www.youtube.com/watch?v=test'}));
 return renderToStaticMarkup(React.createElement(LearningRoom,{course:{slug:'course',title:'Khóa học'},currentLesson:lessons[30],lessons,previousLesson:lessons[29],nextLesson:lessons[31],referencePacks:[{id:'reference'}]}));
}
test('lesson list renders every lesson, marks current one and has a direct mobile action',()=>{const html=render();assert.match(html,/id="lesson-list"/);assert.match(html,/aria-current="page"/);assert.match(html,/href="#lesson-list">Bài học/);assert.equal((html.match(/loading="lazy"/g)||[]).length,80);assert.match(html,/Bài 80/)});
test('video has inline playback, explicit referrer policy and sidebar cannot trap hidden focus',()=>{const html=render();assert.match(html,/playsinline=1/);assert.match(html,/referrerPolicy="strict-origin-when-cross-origin"/i);assert.match(html,/<aside inert=""/);assert.match(html,/<details class="references"/);assert.doesNotMatch(html,/<details[^>]+open/)});
