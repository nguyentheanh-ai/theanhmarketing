import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/cloudflare/native-learning-response.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {protectNativeLearningResponse}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const origin='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev',env={CF_NATIVE_AUTH_MODE:'qa',CF_NATIVE_AUTH_ORIGIN:origin};
test('native HTML and RSC stay private, preserve stream, cookie and existing Vary',async()=>{
 const source=new Response('Synthetic private lesson',{headers:{'Vary':'RSC, Next-Router-State-Tree','Set-Cookie':'synthetic=value; HttpOnly','Cache-Control':'public, max-age=60'}});
 const result=protectNativeLearningResponse(new Request(origin+'/learn/course/lesson'),env,source);
 assert.equal(result.body,source.body);assert.equal(source.bodyUsed,false);assert.equal(result.headers.get('Cache-Control'),'private, no-store');assert.equal(result.headers.get('Cloudflare-CDN-Cache-Control'),'no-store');assert.equal(result.headers.get('CDN-Cache-Control'),'no-store');assert.equal(result.headers.get('Vary'),'RSC, Next-Router-State-Tree, Cookie');assert.equal(result.headers.get('Set-Cookie'),'synthetic=value; HttpOnly');assert.equal(await result.text(),'Synthetic private lesson');
});
test('native login redirects remain private and do not duplicate Cookie variance',()=>{
 const source=new Response(null,{status:307,headers:{Location:'/dang-nhap',Vary:'Cookie'}});
 const result=protectNativeLearningResponse(new Request(origin+'/dang-nhap'),env,source);assert.equal(result.status,307);assert.equal(result.headers.get('Location'),'/dang-nhap');assert.equal(result.headers.get('Vary'),'Cookie');assert.equal(result.headers.get('Cache-Control'),'private, no-store');
});
test('disabled staging, production and unrelated routes preserve the original response',()=>{
 for(const [url,settings] of [[origin+'/learn/course/lesson',{...env,CF_NATIVE_AUTH_MODE:'disabled'}],['https://www.theanhmarketing.com/learn/course/lesson',env],[origin+'/landing',env]]){const response=new Response('Public');assert.equal(protectNativeLearningResponse(new Request(url),settings,response),response)}
});
test('native Ebook and Agent pages/RSC receive the same private response policy',()=>{for(const path of ['/thu-vien/facebook-ads','/thu-vien/facebook-ads/pdf','/dashboard/agents','/dashboard/agents/marketing']){const result=protectNativeLearningResponse(new Request(origin+path),env,new Response('Synthetic private resource',{headers:{Vary:'RSC'}}));assert.equal(result.headers.get('Cache-Control'),'private, no-store');assert.equal(result.headers.get('Vary'),'RSC, Cookie')}});
test('native password HTML/RSC responses remain private and vary by cookie',()=>{const result=protectNativeLearningResponse(new Request(origin+'/doi-mat-khau?mode=account'),env,new Response('fixture'));assert.equal(result.headers.get('Cache-Control'),'private, no-store');assert.equal(result.headers.get('CDN-Cache-Control'),'no-store');assert.match(result.headers.get('Vary'),/Cookie/)});
