// Synthetic RSA token/public JWK, local workerd only. Never deploy this harness.
import {build} from 'esbuild';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {Miniflare} from 'miniflare';
import assert from 'node:assert/strict';
const {publicKey,privateKey}=await generateKeyPair('RS256');
const jwk={...await exportJWK(publicKey),kid:'fixture',alg:'RS256',use:'sig'};
const now=Date.now(),sec=Math.floor(now/1000),nonce='A'.repeat(43),clientId='fixture.apps.googleusercontent.com';
const payload={iss:'https://accounts.google.com',aud:clientId,sub:'100000000000000000000001',iat:sec,exp:sec+300,nonce};
const valid=await new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'fixture'}).sign(privateKey);
const wrong=await new SignJWT({...payload,aud:'wrong.apps.googleusercontent.com'}).setProtectedHeader({alg:'RS256',kid:'fixture'}).sign(privateKey);
const source=`import {createLocalJWKSet} from 'jose';import {createGoogleIdTokenVerifier} from './lib/cloudflare/google-id-token';
const verify=createGoogleIdTokenVerifier({clientId:${JSON.stringify(clientId)},projectId:'vsxxgdzwtscuxcmjfckt'},createLocalJWKSet({keys:[${JSON.stringify(jwk)}]}));
export default {async fetch(){const good=await verify(${JSON.stringify(valid)},${JSON.stringify(nonce)},${now});const bad=await verify(${JSON.stringify(wrong)},${JSON.stringify(nonce)},${now});const replayNonce=await verify(${JSON.stringify(valid)},'B'.repeat(43),${now});return Response.json({good:good?.subject===${JSON.stringify(payload.sub)},wrongAudience:bad===null,wrongNonce:replayNonce===null})}};`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',write:false,tsconfig:'tsconfig.json'});
const mf=new Miniflare({workers:[{config:{name:'google-oidc-fixture',compatibilityDate:'2026-10-13',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'fixture.mjs',modules:{'fixture.mjs':{type:'esm',contents:bundle.outputFiles[0].text}}}}}]});
try{const result=await (await mf.dispatchFetch('https://fixture.invalid/')).json();assert.deepEqual(result,{good:true,wrongAudience:true,wrongNonce:true});console.log('PASS 3/3 Google ID-token verification checks in local workerd; synthetic RSA key, no Google provider/callback claim');}finally{await mf.dispose()}
