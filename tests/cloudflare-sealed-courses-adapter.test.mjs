import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleCourseDocuments} from '../scripts/probe-sealed-courses.mjs';
import {postgresRowJson} from '../scripts/probe-sealed-orders.mjs';
import {parseExactJson} from '../lib/cloudflare/precise-json.ts';
const fixture=()=>({courses:[{id:'c',slug:'fixture'}],course_modules:[{id:'m',course_id:'c'}],lessons:[{id:'l',module_id:'m'}],
  lesson_resources:[{id:'r',lesson_id:'l',title:'Fixture',url:'https://example.invalid/file'}],course_resources:[{id:'r2',lesson_id:null}]});
test('course documents keep IDs, nested resources and explicit count for non-lesson resources',()=>{
  const source=fixture(),result=assembleCourseDocuments(source);
  assert.equal(result.documents[0].course_modules[0].lessons[0].id,'l');
  assert.deepEqual(result.documents[0].course_modules[0].lessons[0].lesson_resources,source.lesson_resources);
  assert.equal(result.unlinkedResources,1);assert.equal(result.duplicateSortOrderGroups,0);
  assert.equal(source.course_modules[0].lessons,undefined);
});
test('course fields that would be rounded are refused before importer and verifier share parsed data',()=>{
  const raw=postgresRowJson([{n:'metadata',ty:'jsonb'}],['{"external_id":9007199254740993}']);
  assert.throws(()=>parseExactJson(raw),/unavailable/);
});
test('orphans, duplicate identities and cross-course lessons fail instead of disappearing',()=>{
  for(const mutate of [s=>s.course_modules[0].course_id='other',s=>s.lessons[0].module_id='other',s=>s.lessons[0].course_id='other',s=>s.lesson_resources[0].lesson_id='other',s=>s.courses.push({...s.courses[0]}),s=>s.lessons.push({...s.lessons[0]})]){const s=fixture();mutate(s);assert.throws(()=>assembleCourseDocuments(s));}
});
