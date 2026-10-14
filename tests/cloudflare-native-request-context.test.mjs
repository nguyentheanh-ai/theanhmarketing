import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/cloudflare/native-request-context.ts'],bundle:true,platform:'node',format:'esm',write:false});
const moduleUrl='data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64');
const a=await import(moduleUrl+'#worker'),b=await import(moduleUrl+'#rsc');
const env={CF_NATIVE_AUTH_MODE:'disabled'},request=(cookie)=>new Request('https://fixture.example.invalid/learn/course/lesson',{headers:{Cookie:cookie}});
test('context is absent outside a Worker request and shared between Worker/RSC module copies',async()=>{
 assert.equal(a.getNativeRequestContext(),undefined);await a.runNativeRequestContext(request('fixture=a'),env,async()=>{await Promise.resolve();assert.equal(b.getNativeRequestContext().request.headers.get('Cookie'),'fixture=a');assert.equal(b.getNativeRequestContext().env,env)});assert.equal(a.getNativeRequestContext(),undefined);
});
test('interleaved requests retain separate cookies and bindings; rejected request leaves no context',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),other={CF_NATIVE_AUTH_MODE:'qa'};
 const first=a.runNativeRequestContext(request('fixture=a'),env,async()=>{await gate;assert.equal(b.getNativeRequestContext().request.headers.get('Cookie'),'fixture=a');assert.equal(b.getNativeRequestContext().env,env)});
 await b.runNativeRequestContext(request('fixture=b'),other,async()=>{assert.equal(a.getNativeRequestContext().request.headers.get('Cookie'),'fixture=b');assert.equal(a.getNativeRequestContext().env,other);release();await Promise.resolve();assert.equal(a.getNativeRequestContext().request.headers.get('Cookie'),'fixture=b')});await first;
 await assert.rejects(a.runNativeRequestContext(request('fixture=bad'),env,async()=>{throw Error('Synthetic failure')}));assert.equal(b.getNativeRequestContext(),undefined);
});
test('nested request scope restores the parent rather than replacing its user',()=>{
 a.runNativeRequestContext(request('fixture=parent'),env,()=>{b.runNativeRequestContext(request('fixture=child'),env,()=>assert.equal(a.getNativeRequestContext().request.headers.get('Cookie'),'fixture=child'));assert.equal(b.getNativeRequestContext().request.headers.get('Cookie'),'fixture=parent')});assert.equal(a.getNativeRequestContext(),undefined);
});
