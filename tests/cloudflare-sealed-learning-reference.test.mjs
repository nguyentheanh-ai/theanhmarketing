import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceLearningExpectations} from '../scripts/probe-sealed-learning-access.mjs';
test('reference retains Source exact email selector, expiry, contact precedence and published course filter',()=>{
  let picked;
  const tables={orders:[{id:'1',status:'paid',email:'QA@example.invalid'},{id:'2',status:'paid',email:' qa@example.invalid '}],leads:[],
    contacts:[{id:'contact',email:'   '}],courses:[{id:'course',slug:'fixture',lms_status:'published'}],
    enrollments:[{id:'owned',user_id:'user',status:'active',expires_at:null,course_id:'course',metadata:{}},
      {id:'expired',user_id:'user',status:'active',expires_at:'2000-01-01T00:00:00Z',course_id:'course',metadata:{}},
      {id:'wrong-contact',user_id:null,contact_id:'contact',status:'active',expires_at:null,course_id:'course',metadata:{student_email:'qa@example.invalid'}}],
    course_progress:[{enrollment_id:'owned',lesson_id:'lesson',status:'completed',completed_at:null},{enrollment_id:'expired',lesson_id:'forbidden',status:'completed',completed_at:null}]};
  const result=sourceLearningExpectations(tables,{id:'user',email:'qa@example.invalid'},Date.now(),input=>{picked=input;return ['paid-fixture'];});
  assert.equal(picked.orders.length,1);assert.equal(picked.orders[0].email,'QA@example.invalid');
  assert.deepEqual(result.enrollmentIdsBySlug,{fixture:['owned']});assert.deepEqual(result.completedLessonIds,['lesson']);
  assert.deepEqual(result.ownedSlugs,['paid-fixture','fixture']);
});
test('Source dashboard attaches a legacy slug enrollment by course ID, while lesson RPC first scopes by slug',()=>{
  const tables={orders:[],leads:[],contacts:[],course_progress:[],courses:[{id:'a',slug:'new-course',lms_status:'published'},{id:'b',slug:'other-published',lms_status:'published'}],
    enrollments:[{id:'enrollment',user_id:'user',status:'active',expires_at:null,course_id:'a',course_slug:'old-slug',metadata:{}}]};
  const subject={id:'user',email:'fixture@example.invalid'},rule=()=>[];
  assert.deepEqual(sourceLearningExpectations(tables,subject,Date.now(),rule).lmsOwnedSlugs,['new-course']);
  assert.deepEqual(sourceLearningExpectations(tables,subject,Date.now(),rule,'new-course').lmsOwnedSlugs,[]);
  tables.enrollments[0].course_slug='other-published';
  assert.deepEqual(sourceLearningExpectations(tables,subject,Date.now(),rule).lmsOwnedSlugs,['new-course','other-published']);
  assert.deepEqual(sourceLearningExpectations(tables,subject,Date.now(),rule,'other-published').lmsOwnedSlugs,['other-published']);
});
