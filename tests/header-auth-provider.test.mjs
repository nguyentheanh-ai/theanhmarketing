import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const module={exports:{}};
new Function('exports','module',ts.transpileModule(readFileSync('lib/auth/header-auth-state.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module.exports,module);
const {observeHeaderAuth}=module.exports;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const response=(user,status=200,type='application/json')=>new Response(JSON.stringify({ok:true,user}),{status,headers:{'Content-Type':type}});
const user={id:'00000000-0000-4000-8000-000000000001'};
const forbiddenSource=()=>{throw Error('An old Source cookie must never be consulted');};

test('native guest ignores a legacy session and reads its own private endpoint',async()=>{
 const states=[],requests=[];
 const observer=observeHeaderAuth('native-d1',{createSourceClient:forbiddenSource,onState:s=>states.push(s),fetchSession:async(...args)=>{requests.push(args);return response(null);}});
 await tick();observer.close();
 assert.deepEqual(states,['guest','guest']);assert.equal(requests.length,1);
 assert.equal(requests[0][0],'/api/cloudflare-auth/session');
 assert.equal(requests[0][1].credentials,'same-origin');assert.equal(requests[0][1].cache,'no-store');assert.equal(requests[0][1].redirect,'error');
});
test('native session updates from student to guest on refocus, without Source fallback on errors',async()=>{
 const states=[],responses=[response(user),response(null),response(user,503),response(user,200,'text/html'),response({id:'invalid'}),Error('offline')];
 const observer=observeHeaderAuth('native-d1',{createSourceClient:forbiddenSource,onState:s=>states.push(s),fetchSession:async()=>{const next=responses.shift();if(next instanceof Error)throw next;return next;}});
 await tick();assert.equal(states.at(-1),'student');
 for(let i=0;i<5;i++){observer.refresh();await tick();assert.equal(states.at(-1),'guest');}
 observer.close();
});
test('a delayed pre-logout read cannot overwrite a newer guest observation; unmount suppresses updates',async()=>{
 const states=[],pending=[],signals=[];
 const observer=observeHeaderAuth('native-d1',{createSourceClient:forbiddenSource,onState:s=>states.push(s),fetchSession:(_url,opts)=>{signals.push(opts.signal);return new Promise(resolve=>pending.push(resolve));}});
 observer.refresh();assert(signals[0].aborted);pending[1](response(null));await tick();pending[0](response(user));await tick();assert.equal(states.at(-1),'guest');
 observer.refresh();const before=[...states];observer.close();assert(signals[2].aborted);pending[2](response(user));await tick();assert.deepEqual(states,before);
});
test('legacy observer preserves Source behavior and ignores an initial session read after a logout event',async()=>{
 const states=[];let event,resolve,unsubscribed=false;
 const observer=observeHeaderAuth('supabase',{fetchSession:()=>{throw Error('Native endpoint forbidden');},onState:s=>states.push(s),createSourceClient:()=>({auth:{getSession:()=>new Promise(r=>resolve=r),onAuthStateChange:callback=>{event=callback;return {data:{subscription:{unsubscribe(){unsubscribed=true;}}}};}}})});
 event('SIGNED_IN',{});assert.equal(states.at(-1),'student');event('SIGNED_OUT',null);resolve({data:{session:{}}});await tick();assert.equal(states.at(-1),'guest');observer.close();assert(unsubscribed);
 event('SIGNED_IN',{});assert.equal(states.at(-1),'guest');
});
