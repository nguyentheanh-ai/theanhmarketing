// Dedicated QA existing progress row only. Source Supabase is never written.
import {privateDecrypt,constants} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {observeNativeSession} from './native-session-readiness.mjs';
const [keyFile,sealedFile,stateFile]=process.argv.slice(2);
if(!keyFile?.startsWith('/private/tmp/theanh-native-api-qa-')||!sealedFile?.startsWith('/private/tmp/theanh-native-api-qa-')||!stateFile?.startsWith('/private/tmp/theanh-native-progress-qa-'))throw Error('Private QA paths required');
const bytes=privateDecrypt({key:readFileSync(keyFile),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},Buffer.from(JSON.parse(readFileSync(sealedFile,'utf8')).sealed,'base64'));
const access=JSON.parse(bytes.toString());bytes.fill(0);
const qa=JSON.parse(readFileSync('/private/tmp/theanh-cf-qa-20261013.json','utf8')),saved=JSON.parse(readFileSync(stateFile,'utf8'));
assert.equal(saved.qa.userId,qa.auth_user_id);assert.equal(saved.qa.email,qa.email.trim().toLowerCase());
const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev',checks=[];
const course=saved.before.enrollment.course_slug,lesson=saved.before.progress.lesson_id,initial=saved.before.progress.status==='completed',first=saved.plannedOperations[0].completed,last=saved.plannedOperations[1].completed;assert.equal(first,!initial);assert.equal(last,initial);
const percent=value=>value?Math.round(100/saved.before.lessonCount):0,ids=value=>value?[lesson]:[];
const lessonPath='/api/cloudflare-student/lesson?courseSlug='+encodeURIComponent(course)+'&lessonId='+encodeURIComponent(lesson);
const pagePath='/learn/'+encodeURIComponent(course)+'/'+encodeURIComponent(lesson);
let cookie,step='ready',readinessProbes=[],lastResponse;
const headers={'CF-Access-Client-Id':access.client_id,'CF-Access-Client-Secret':access.client_secret};
async function call(path,body,extra={}){lastResponse=undefined;const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',redirect:'manual',signal:AbortSignal.timeout(20000),headers:{...headers,...(cookie?{Cookie:cookie}:{}),...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...extra},body:body===undefined?undefined:JSON.stringify(body)});lastResponse={status:response.status,contentType:response.headers.get('content-type'),redirected:response.status>=300&&response.status<400};return response;}
async function bounded(response,limit=65536){const reader=response.body.getReader(),chunks=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('QA response exceeds bound')}chunks.push(value)}return Buffer.concat(chunks).toString()}finally{reader.releaseLock()}}
async function json(response){return JSON.parse(await bounded(response))}
function privateResponse(response){assert(response.headers.get('Cache-Control')?.includes('private'));assert(response.headers.get('Cache-Control')?.includes('no-store'));assert(response.headers.get('Vary')?.toLowerCase().includes('cookie'));assert.notEqual(response.headers.get('CF-Cache-Status'),'HIT')}
const progress=op=>call('/api/cloudflare-student/progress',{courseSlug:course,lessonId:lesson,operationId:op.id,completed:op.completed});
const reportFile='reports/cloudflare-d1/native-phase2-a-progress-http.json';
try{
 const readiness=await observeNativeSession(call,json,origin);readinessProbes=readiness.probes;assert(readiness.ready,'Native session not ready');
 step='native-password-login';const login=await call('/api/cloudflare-auth/login',{email:qa.email,password:qa.password,rememberLogin:true});assert.equal(login.status,200);assert.equal((await json(login)).user.id,qa.auth_user_id);cookie=login.headers.get('Set-Cookie')?.split(';')[0];assert(cookie?.startsWith('__Host-tam-session='));checks.push({name:step,status:200,originalUuid:true});
 step='baseline-existing-lesson';const baseline=await call(lessonPath);assert.equal(baseline.status,200);privateResponse(baseline);const data=await json(baseline);assert.equal(data.currentLesson.id,lesson);assert.equal(data.currentLessonCompleted,initial);checks.push({name:step,status:200,sourceStateRetained:true});
 step='reject-client-authority';const forged=await call('/api/cloudflare-student/progress',{courseSlug:course,lessonId:lesson,operationId:saved.plannedOperations[0].id,userId:'forged'});assert.equal(forged.status,400);await forged.body?.cancel();const csrf=await call('/api/cloudflare-student/progress',{}, {Origin:'https://attacker.example.invalid'});assert.equal(csrf.status,403);await csrf.body?.cancel();checks.push({name:step,bodyStatus:400,csrfStatus:403});
 step='save-completion';const completed=await progress(saved.plannedOperations[0]);assert.equal(completed.status,200);privateResponse(completed);const receipt=await json(completed);assert.equal(receipt.ok,true);assert.equal(receipt.enrollmentId,saved.before.enrollment.id);assert.equal(receipt.progressPercent,percent(first));assert.deepEqual(receipt.completedLessonIds,ids(first));checks.push({name:step,status:200,percentMatchesPublishedCount:true});
 step='retry-identical-intent';const replay=await progress(saved.plannedOperations[0]);assert.equal(replay.status,200);assert.deepEqual(await json(replay),receipt);checks.push({name:step,status:200,sameReceipt:true});
 step='refresh-completed-api';const refreshed=await call(lessonPath);assert.equal(refreshed.status,200);assert.equal((await json(refreshed)).currentLessonCompleted,first);checks.push({name:step,status:200,completionPersisted:true});
 step='refresh-completed-ssr';const page=await call(pagePath);assert.equal(page.status,200);privateResponse(page);const html=await bounded(page,2000000);assert(html.includes('native-d1'));assert.equal(html.includes('✓ Đã hoàn thành'),first);assert(!html.includes(qa.password));assert(!html.includes('__Host-tam-session='));checks.push({name:step,status:200,visibleCompletion:true,privateNoStore:true});
 step='undo-qa-completion';const undone=await progress(saved.plannedOperations[1]);assert.equal(undone.status,200);const undoReceipt=await json(undone);assert.equal(undoReceipt.ok,true);assert.equal(undoReceipt.progressPercent,percent(last));assert.deepEqual(undoReceipt.completedLessonIds,ids(last));checks.push({name:step,status:200});
 step='late-original-retry';const late=await progress(saved.plannedOperations[0]);assert.equal(late.status,200);assert.deepEqual(await json(late),receipt);const latest=await call(lessonPath);assert.equal((await json(latest)).currentLessonCompleted,last);checks.push({name:step,status:200,lateRetryDidNotOverwriteUndo:true});
 step='refresh-undone-ssr';const undoPage=await call(pagePath);assert.equal(undoPage.status,200);privateResponse(undoPage);const undoHtml=await bounded(undoPage,2000000);assert.equal(undoHtml.includes('✓ Đã hoàn thành'),last);checks.push({name:step,status:200,uncompletedVisible:true});
 step='logout';const out=await call('/api/cloudflare-auth/logout',{});assert.equal(out.status,200);assert.equal((await json(out)).ok,true);const denied=await call(lessonPath);assert.equal(denied.status,401);await denied.body?.cancel();checks.push({name:step,status:200,oldCookieDenied:true});
 const result={status:'PASS',checkedAt:new Date().toISOString(),scope:'Hosted D1 QA progress on one existing row, API and HTTP SSR',checks,limits:'QA row requires separate full-field CAS restoration; no browser/video playback, customer write authority or production cutover claim'};writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){
 const failedResponse=lastResponse;
 if(cookie)try{await (await call('/api/cloudflare-auth/logout',{})).body?.cancel()}catch{}
 const result={status:'FAILED',step,completedChecks:checks.length,readinessProbes,failedResponse,errorCategory:['AssertionError','TimeoutError','AbortError','TypeError','SyntaxError'].includes(error?.name)?error.name:'CHECK_FAILED',limits:'QA restore and cleanup still required; sensitive response/credential withheld'};writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));process.exitCode=1;
}
