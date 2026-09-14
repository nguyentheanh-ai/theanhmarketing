import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const slug='bo-agent-kit-x10-hieu-suat-cong-viec';
function load(file, deps){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:n=>{if(n in deps)return deps[n];throw Error(n)},Response,URL});return exports;}
function access({user={id:'u',email:'x@example.test'},adminRole=null,lms=[],legacy=[]}={}){
 const calls=[];
 const mod=load('lib/agent-library-access.ts',{
 '@/lib/auth/session':{getCurrentAuth:async()=>({user,adminRole})},
 '@/lib/agent-kit-preorder':{AGENT_KIT_SLUG:slug},
 '@/lib/course-access':{getCourseAccessSlugs:()=>legacy},
 '@/services/lmsService':{getStudentLmsAccess:async()=>({ownedSlugs:lms})},
 '@/services/orderService':{getPaymentOrders:async opts=>{calls.push(opts);return []}},
 '@/services/leadService':{getLeads:async opts=>{calls.push(opts);return []}},
 });return {run:mod.requireAgentLibraryAccess,calls};
}
for(const [name,input,expected] of [['guest',{user:null},401],['unentitled',{},403],['other course',{lms:['other']},403],['admin',{adminRole:'owner'},true],['paid LMS',{lms:[slug]},true],['legacy purchase',{legacy:[slug]},true]])test(`access: ${name}`,async()=>{const a=access(input),r=await a.run();assert.equal(r.ok?true:r.status,expected);for(const call of a.calls)assert.equal(call.includeFallback,false)});
test('guest access never consults environment auth-guard bypass',()=>assert.doesNotMatch(fs.readFileSync('lib/agent-library-access.ts','utf8'),/isAuthGuardEnabled|AUTH_GUARD_ENABLED/));
function route(status=true,failure=false){let calls=0;const mod=load('app/api/agent-library/[agent]/download/route.ts',{
 '@/lib/agent-library-access':{requireAgentLibraryAccess:async()=>status===true?{ok:true}:{ok:false,status}},
 '@/lib/agent-library-files':{DOWNLOAD_SLUGS:['video'],getAgentDownloadUrl:async()=>{calls++;if(failure)throw Error('missing');return 'https://storage.example/signed';}},
 });return {run:async(id='video',query='')=>mod.GET(new Request('https://example.test/api/download'+query),{params:Promise.resolve({agent:id})}),calls:()=>calls};}
for(const status of [401,403])test(`download denies ${status} without signing`,async()=>{const r=route(status),res=await r.run();assert.equal(res.status,status);assert.equal(r.calls(),0);assert.match(res.headers.get('cache-control'),/no-store/);assert.equal(res.headers.get('vary'),'Cookie');});
test('unknown/traversal slug does not touch signer',async()=>{const r=route();assert.equal((await r.run('../video')).status,404);assert.equal(r.calls(),0)});
test('entitled download redirects privately; JSON route gives same destination',async()=>{const r=route(),res=await r.run();assert.equal(res.status,302);assert.equal(res.headers.get('location'),'https://storage.example/signed');assert.equal(res.headers.get('referrer-policy'),'no-referrer');assert.equal((await (await r.run('video','?format=json')).json()).url,'https://storage.example/signed')});
test('missing storage returns honest503 without internal error',async()=>{const res=await route(true,true).run();assert.equal(res.status,503);assert.doesNotMatch(await res.text(),/missing|signed|storage/)});
test('catalog maps ten unique approved UI agents to private allowlisted ZIPs',()=>{const catalog=JSON.parse(fs.readFileSync('data/agent-library-packages.json'));const ui=load('components/agent-library/catalog.ts',{}).agents;assert.equal(catalog.agents.length,10);assert.equal(new Set(catalog.agents.map(a=>a.slug)).size,10);assert.deepEqual(Array.from(ui,a=>`${a.id}-agent`).sort(),catalog.agents.map(a=>a.slug).sort());for(const a of catalog.agents){assert.match(a.filename,/^[a-zA-Z0-9._-]+\.zip$/);assert.ok(a.size_bytes>0);assert.match(a.sha256,/^[a-f0-9]{64}$/)}});
test('signed URLs use private bucket, short expiry and catalog filename only',async()=>{let captured;const mod=load('lib/agent-library-files.ts',{'@/data/agent-library-resources.json':{resources:[]},'@/data/agent-library-packages.json':{agents:[{slug:'video-agent',filename:'video-1.zip',version:'1.0'}]},'@/lib/supabase/admin':{createSupabaseAdminClient:()=>({storage:{getBucket:async()=>({data:{public:false}}),from:bucket=>({createSignedUrl:async(...args)=>{captured={bucket,args};return {data:{signedUrl:'https://storage.example/signed'}}}})}})}});assert.equal(await mod.getAgentDownloadUrl('../video'),null);await mod.getAgentDownloadUrl('video');assert.equal(captured.bucket,'agent-library-private');assert.equal(captured.args[0],'1.0/video-1.zip');assert.equal(captured.args[1],120);assert.equal(captured.args[2].download,'video-1.zip');});
function uploadRoute({user={id:'owner'},adminRole='owner',isPublic=false}={}){let signCount=0;return {run:async(slug='video-agent',origin='https://example.test')=>load('app/api/admin/agent-library/upload/route.ts',{
 '@/data/agent-library-resources.json':{resources:[]},'@/data/agent-library-packages.json':{agents:[{slug:'video-agent',version:'1',filename:'video.zip'}]},
 '@/lib/auth/session':{getCurrentAuth:async()=>({user,adminRole})},
 '@/lib/supabase/admin':{createSupabaseAdminClient:()=>({storage:{getBucket:async()=>({data:{public:isPublic}}),from:()=>({createSignedUploadUrl:async(path,opts)=>{signCount++;assert.equal(path,'1/video.zip');assert.equal(opts.upsert,false);return {data:{signedUrl:'https://private.example/upload'}}}})}})},
 }).POST(new Request('https://example.test/api/admin/agent-library/upload',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({slug,action:'upload'})})),count:()=>signCount};}
for(const [name,input,status] of [['guest',{user:null},401],['student',{adminRole:null},403],['editor',{adminRole:'editor'},403],['public bucket',{isPublic:true},503]])test(`upload rejects ${name}`,async()=>{const r=uploadRoute(input);assert.equal((await r.run()).status,status);assert.equal(r.count(),0)});
test('upload rejects noncatalog slug and cross origin',async()=>{const r=uploadRoute();assert.equal((await r.run('../video')).status,400);assert.equal((await r.run('video-agent','https://other.test')).status,403);assert.equal(r.count(),0)});
test('authenticated owner gets immutable signed upload in private bucket',async()=>{const r=uploadRoute();assert.equal((await r.run()).status,200);assert.equal(r.count(),1)});
