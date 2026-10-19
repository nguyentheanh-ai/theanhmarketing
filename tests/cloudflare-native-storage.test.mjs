import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const built=await build({stdin:{contents:'export * from "./lib/cloudflare/native-storage";export * from "./lib/cloudflare/private-r2";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'error'});
const h=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
function r2(){const m=new Map();const meta=(k,v)=>({size:v.bytes.byteLength,httpEtag:'"e"',writeHttpMetadata:hd=>{if(v.type)hd.set('content-type',v.type)}});
 return {m,head:async k=>m.has(k)?meta(k,m.get(k)):null,get:async(k,o)=>{const v=m.get(k);if(!v)return null;const b=o?.range?v.bytes.slice(o.range.offset,o.range.offset+o.range.length):v.bytes;return {...meta(k,v),body:new Blob([b]).stream()}},put:async(k,val,o)=>{m.set(k,{bytes:new Uint8Array(val instanceof ArrayBuffer?val:await new Blob([val]).arrayBuffer()),type:o?.httpMetadata?.contentType})},delete:async ks=>{for(const k of [].concat(ks))m.delete(k)}};}
function fixture(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec(readFileSync('scripts/d1-native-storage.sql','utf8'));const db={all:async(q,p)=>sql.prepare(q).all(...p)};const bucket=r2();
 return {sql,bucket,s:h.createNativeStorage({db,r2:bucket,origin:'https://x.example',secret:'s'.repeat(32)})};}
test('bucket + upload/download/signed url/no overwrite/public url',async t=>{const f=fixture(t);assert.equal((await f.s.getBucket('media')).error.statusCode,'404');
 assert.equal((await f.s.createBucket('media',{public:true})).error,null);const up=await f.s.from('media').upload('a/b.png',new Blob(['png'],{type:'image/png'}));assert.equal(up.error,null);
 assert.equal((await f.s.from('media').upload('a/b.png',new Blob(['x']))).error.statusCode,'409');assert.equal((await f.s.from('media').upload('a/b.png',new Blob(['y']),{upsert:true})).error,null);
 assert.equal(await (await f.s.from('media').download('a/b.png')).data.text(),'y');
 const signed=(await f.s.from('media').createSignedUrl('a/b.png',60)).data.signedUrl;const key=new URL(signed).searchParams.get('key');assert.match(key,/^supabase-a\/[0-9a-f]{64}$/);
 const served=await h.servePrivateR2(new Request(signed),f.bucket,'s'.repeat(32),Date.now(),k=>f.s.isIndexedKey(k));assert.equal(served.status,200);assert.equal(await served.text(),'y');
 const pub=await f.s.handle(new Request(f.s.from('media').getPublicUrl('a/b.png').data.publicUrl));assert.equal(pub.status,200);
 await f.s.from('media').remove(['a/b.png']);assert.equal((await h.servePrivateR2(new Request(signed),f.bucket,'s'.repeat(32),Date.now(),k=>f.s.isIndexedKey(k))).status,403);});
test('signed upload URL accepts exactly its own name, private bucket not public',async t=>{const f=fixture(t);await f.s.createBucket('agent-library-private',{public:false,allowedMimeTypes:['application/zip']});
 const {signedUrl}=(await f.s.from('agent-library-private').createSignedUploadUrl('v1/kit.zip')).data;
 const ok=await f.s.handle(new Request(signedUrl,{method:'PUT',headers:{'content-type':'application/zip'},body:'zip'}));assert.equal(ok.status,200);
 const tampered=signedUrl.replace('kit.zip','other.zip');assert.equal((await f.s.handle(new Request(tampered,{method:'PUT',body:'x'}))).status,403);
 assert.equal((await f.s.handle(new Request(f.s.from('agent-library-private').getPublicUrl('v1/kit.zip').data.publicUrl))).status,404);
 const bad=await f.s.handle(new Request((await f.s.from('agent-library-private').createSignedUploadUrl('v1/a.txt')).data.signedUrl,{method:'PUT',headers:{'content-type':'text/html'},body:'x'}));assert.equal(bad.status,415);});
