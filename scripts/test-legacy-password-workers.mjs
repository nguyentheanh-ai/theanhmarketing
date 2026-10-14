// Synthetic credential fixture executed by local workerd, not production.
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
const password='Workers-synthetic-fixture-only';
const hash=await bcrypt.hash(password,10);
const source=`import {verifyLegacyBcryptPassword,generateCredentialKey,sealLegacyBcryptHash,openLegacyBcryptHash} from './lib/cloudflare/legacy-password';
export default {async fetch(){const started=Date.now();const context={projectId:'vsxxgdzwtscuxcmjfckt',userId:'00000000-0000-4000-8000-000000000001'};const key=generateCredentialKey();const envelope=await sealLegacyBcryptHash(${JSON.stringify(hash)},key,context);const restored=await openLegacyBcryptHash(envelope,key,context);const correct=await verifyLegacyBcryptPassword(${JSON.stringify(password)},restored);const wrong=await verifyLegacyBcryptPassword('wrong',restored);return Response.json({correct,wrong,elapsedMs:Date.now()-started})}};`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',write:false,tsconfig:'tsconfig.json'});
const mf=new Miniflare({workers:[{config:{name:'auth-fixture',compatibilityDate:'2026-10-13',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'fixture.mjs',modules:{'fixture.mjs':{type:'esm',contents:bundle.outputFiles[0].text}}}}}]});
try{const response=await mf.dispatchFetch('https://fixture.invalid/');const result=await response.json();assert.equal(result.correct,true);assert.equal(result.wrong,false);console.log(JSON.stringify({status:'PASS',runtime:'local workerd',checks:3,elapsedMs:result.elapsedMs,limit:'No hosted Workers CPU-limit or HTTP login verification'}));}finally{await mf.dispose();}
