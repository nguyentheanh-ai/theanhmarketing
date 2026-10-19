// Runs the real admin student provisioning (free grant) on a local copy of the
// native D1 database in native data mode. Usage: node scripts/smoke-native-provisioning.mjs <sqlite> <authority-json>
import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {writeFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const entry=`export * as prov from "./services/studentProvisioningService";export {runNativeRequestContext} from "./lib/cloudflare/native-request-context";export {installNativeDataFactory} from "./lib/cloudflare/native-data-client";`;
const built=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'error',external:['next/*','react','react-dom'],alias:{'server-only':'./scripts/empty-module.mjs'},define:{'process.env.NODE_ENV':'"test"'}});
writeFileSync('/private/tmp/claude-501/prov-bundle.mjs',built.outputFiles[0].text.replace(/from ?"next\/[^"]+"/g,'from "/private/tmp/claude-501/next-stub.mjs"').replace(/from ?"react"/g,'from "/private/tmp/claude-501/react-stub.mjs"'));
writeFileSync('/private/tmp/claude-501/next-stub.mjs','export const after=f=>{};export const unstable_cache=f=>f;export const revalidatePath=()=>{};export const revalidateTag=()=>{};export const cookies=async()=>({get:()=>undefined,getAll:()=>[]});export const headers=async()=>new Headers();export const redirect=()=>{throw new Error("redirect")};export const notFound=()=>{throw new Error("notFound")};export class NextResponse extends Response{static json(b,i){return Response.json(b,i)}};export default {};');
writeFileSync('/private/tmp/claude-501/react-stub.mjs','export const cache=f=>f;export default {cache:f=>f};');
const h=await import('/private/tmp/claude-501/prov-bundle.mjs');h.installNativeDataFactory();
const sql=new DatabaseSync(process.argv[2]);
const stmt=(q,p)=>{try{return sql.prepare(q).all(...p.map(v=>v===undefined?null:v))}catch(e){console.log('SQLERR',e.message,'::',q.slice(0,160));throw e}};
const binding={withSession:()=>({prepare:q=>({q,bind:(...p)=>({q,p,all:async()=>({results:stmt(q,p)}),first:async()=>stmt(q,p)[0]??null})}),batch:async ss=>{sql.exec('BEGIN');try{const r=ss.map(s=>({results:stmt(s.q,s.p)}));sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}})};
const cred=execFileSync('/usr/bin/security',['find-generic-password','-w','-s','com.theanhmarketing.cloudflare-migration.backup-secret.native-a-credential','-a','theanh-main-cf-staging-credential']).toString().trim();
process.env.NEXT_PUBLIC_SUPABASE_URL='https://x.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='x';
const env={CF_NATIVE_DATA_MODE:'d1',NATIVE_DATA_DB:binding,NATIVE_AUTH_CREDENTIAL_KEY:cred,NATIVE_DATA_AUTHORITY:process.argv[3]};
const r=await h.runNativeRequestContext(new Request('https://x.invalid'),env,()=>h.prov.provisionStudent({operationId:crypto.randomUUID(),mode:'free',name:'QA',email:'qa-grant@example.invalid',phone:'0900000002',courseSlugs:['ebook-facebook-ads-2026'],source:'qa',sendEmail:false,actorId:null}));
console.log('RESULT',JSON.stringify({ok:r.ok,student:r.student?.state,reason:r.student?.reason,order:r.order?.state,access:r.access?.state,email:r.email?.state,next:r.nextActions}));
