import test from 'node:test';import assert from 'node:assert/strict';import {observeNativeSession} from '../scripts/native-session-readiness.mjs';
const origin='https://qa.invalid';
function response(status,body,type='application/json',url=origin+'/api/cloudflare-auth/session'){const r=new Response(body,{status,headers:{'content-type':type}});Object.defineProperty(r,'url',{value:url});return r;}
test('bounded transient configuration responses require exact anonymous native JSON before login',async()=>{
 const calls=[],waits=[],responses=[response(404,''),response(503,''),response(200,JSON.stringify({ok:true,user:null}))];
 const r=await observeNativeSession(async path=>{calls.push(path);return responses.shift()},r=>r.json(),origin,async ms=>waits.push(ms));
 assert(r.ready);assert.equal(calls.length,3);assert(calls.every(p=>p==='/api/cloudflare-auth/session'));assert.deepEqual(waits,[2000,2000]);
});
test('Access HTML, redirect destination, forbidden status and unexpected principal fail without retry',async()=>{
 for(const r of [response(200,'private body','text/html'),response(200,'{}','application/json','https://access.invalid'),response(403,''),response(200,'{"ok":true,"user":{"id":"synthetic"}}')]){
  let count=0;const actual=await observeNativeSession(async()=>{count++;return r},r=>r.json(),origin,async()=>{throw Error('must not retry')});assert(!actual.ready);assert.equal(count,1);assert(!JSON.stringify(actual).includes('private body'));
 }
});
test('all transient failures stay unavailable at the bound',async()=>{let count=0;const r=await observeNativeSession(async()=>{count++;return response(503,'')},r=>r.json(),origin,async()=>{});assert.equal(count,20);assert(!r.ready)});
test('network error records a category without exposing its message',async()=>{const r=await observeNativeSession(async()=>{throw Error('private transport details')},r=>r.json(),origin,async()=>{});assert.deepEqual(r.probes,[{attempt:1,status:null,ready:false,error:'REQUEST_FAILED'}]);assert(!r.ready)});
