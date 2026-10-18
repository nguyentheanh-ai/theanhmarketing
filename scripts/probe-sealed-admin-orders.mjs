// Offline report parity only. Sessions below are synthetic RAM witnesses;
// this does NOT prove an administrator password login or hosted UI behavior.
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {visitVerifiedSourceRows} from './sealed-source-snapshot.mjs';
import {authUserFromTextRow} from './probe-sealed-auth-native.mjs';
import {postgresRowJson} from './probe-sealed-orders.mjs';
import {parseExactJson} from '../lib/cloudflare/precise-json.ts';

async function main(){
 let raw='';for await(const part of process.stdin)raw+=part;
 const input=JSON.parse(raw),require=createRequire(path.join(input.compilerRoot,'package.json'));
 const {build}=require('esbuild'),ts=require('typescript');
 const bundle=await build({stdin:{contents:`export * from './lib/cloudflare/d1-admin-order-report';export * from './lib/cloudflare/d1-auth-import';export * from './lib/cloudflare/native-order-settlement';export * from './lib/admin/admin-emails';export * from './lib/crm-v2/query';export * from './lib/crm-v2/normalize';export * from './lib/crm-v2/order-summary';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,nodePaths:[path.join(input.compilerRoot,'node_modules')]});
 const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 const sourceText=readFileSync('lib/crm-v2/data.ts','utf8'),ast=ts.createSourceFile('data.ts',sourceText,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const names=['getCrmV2PaidCustomerCount','isPaidStatus','isTimestampInCrmDateRange','timestampToCrmDateKey'];
 const functions=ast.statements.filter(s=>ts.isFunctionDeclaration(s)&&names.includes(s.name?.text)).map(s=>s.getText(ast).replace(/^export\s+/,''));
 if(functions.length!==names.length)throw Error('SOURCE_REPORT_REFERENCE_UNAVAILABLE');
 const refCode=ts.transpileModule(functions.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const users=[],orders=[];
 visitVerifiedSourceRows(input.masterSecret,'a',input.archive,row=>{
  if(row.schema==='auth'&&row.table==='users')users.push(authUserFromTextRow(row.columns,row.values));
  if(row.schema==='public'&&row.table==='orders')orders.push(postgresRowJson(row.columns,row.values));
 });
 const now=Date.parse(input.archive.manifest.header.capturedAt),stamp=new Date(now).toISOString(),project=input.archive.manifest.header.sourceProject;
 const owners=core.getConfiguredOwnerEmails({}),resolveRole=u=>['owner','editor'].includes(u.appMetadata?.admin_role)?u.appMetadata.admin_role:owners.includes(u.email?.trim().toLowerCase())?'owner':null;
 const auth=await core.prepareD1AuthInitialImport(users,{projectId:project,credentialKey:input.credentialKey,resolveRole});
 const sql=new DatabaseSync(':memory:');
 try{
  for(const schema of input.schemas)sql.exec(schema);
  sql.exec('BEGIN');
  for(const s of [...auth.statements,...core.prepareD1AdminRoleImport(users)])sql.prepare(s.sql).run(...s.params);
  for(const raw of orders){const o=core.prepareNativeOrderRecord(raw);sql.prepare('INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json) VALUES(?,?,?,?,?)').run(o.id,o.order_code,o.amount_vnd,o.status,o.row_json);}
  sql.prepare('INSERT INTO d1_auth_sync_state VALUES(?,?,?,?)').run(project,stamp,stamp,'verified');
  sql.prepare('INSERT INTO d1_native_order_authority VALUES(?,?,?,?)').run(project,stamp,stamp,'verified');sql.exec('COMMIT');
  if(sql.prepare('PRAGMA foreign_key_check').all().length)throw Error('ADMIN_REPORT_IMPORT_UNAVAILABLE');
  const sourceOrders=orders.map(o=>parseExactJson(o)),ranges=['today','yesterday','7d','30d','90d','custom'].map(range=>range==='custom'?{range,dateFrom:'2026-01-01',dateTo:'2026-10-18'}:{range});
  const getRange=q=>core.getCrmDateRange(q,new Date(now));
  // Execute the exact repository paid-customer function with a local read-only
  // source selector. No Source RPC/API call is claimed by this reference.
  const reference=new Function('canQueryLiveCrmV2','createSupabaseAdminClient','getCrmDateRange','listPublicOrdersForRange','normalizeEmail','normalizePhone',refCode+';return {getCrmV2PaidCustomerCount,isPaidStatus,isTimestampInCrmDateRange};');
  let ref;const select=async(_client,range)=>sourceOrders.filter(o=>ref.isTimestampInCrmDateRange(String(ref.isPaidStatus(String(o.status??o.payment_status??''))?o.paid_at??o.created_at??'':o.created_at??''),range));
  ref=reference(()=>true,()=>({}),getRange,select,core.normalizeEmail,core.normalizePhone);
  const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,batch:async()=>{throw Error('READ_ONLY_PROBE');}};
  let adminSubjects=0,deniedSubjects=0,comparisons=0;
  for(const user of users){
   const token=createHash('sha256').update('offline-admin-report-fixture:'+user.id).digest('base64url'),hash=createHash('sha256').update(token).digest('hex');
   sql.prepare('INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').run(hash,user.id,project,'offline-fixture',1,stamp,new Date(now+3600000).toISOString());
   const active=user.emailConfirmedAt&&Date.parse(user.emailConfirmedAt)<=now&&!user.deletedAt&&!user.isAnonymous&&(!user.bannedUntil||Date.parse(user.bannedUntil)<=now)&&user.userMetadata?.must_change_password!==true;
   const expected=Boolean(active&&resolveRole(user));
   for(const query of expected?ranges:[ranges[0]]){
    const actual=await core.readD1AdminOrderReport(db,token,query,{now,configuredOwnerEmails:owners,allowedRoles:['owner','editor']});
    if(!expected){if(actual.status!=='denied')throw Error('ADMIN_REPORT_UNAUTHORIZED');continue;}
    const range=getRange(query),selected=await select({},range),metrics=selected.map(o=>({status:String(o.status??o.payment_status??'pending'),amount:Number(o.amount),createdAt:String(ref.isPaidStatus(String(o.status??o.payment_status??''))?o.paid_at??o.created_at:o.created_at)}));
    if(actual.status!=='admin'||actual.paidCustomers!==await ref.getCrmV2PaidCustomerCount(query)||JSON.stringify(actual.summary)!==JSON.stringify(core.buildCrmOrderSummary(metrics,range)))throw Error('ADMIN_REPORT_PARITY_MISMATCH');comparisons++;
   }
   if(expected)adminSubjects++;else deniedSubjects++;
  }
  if(!comparisons)throw Error('ADMIN_REPORT_NO_VERIFIED_COMPARISON');
  return {project:'a',sourceSnapshotAt:input.archive.manifest.header.capturedAt,clockMode:'SNAPSHOT_TIME_OFFLINE_REPLAY',database:'IN_MEMORY_SQLITE_ONLY',sourceOrderRows:orders.length,sourceUsers:users.length,adminSubjects,deniedSubjects,reportComparisons:comparisons,sourceRepositoryFunctionsExecuted:true,sourceRpcExecuted:false,extraEnvironmentOwnerParityVerified:false,syntheticSessionWitnessesOnly:true,administratorPasswordLoginVerified:false,hostedUiVerified:false,productionWritten:false,remoteD1Written:false,readyForCutover:false};
 }finally{sql.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{process.stdout.write(JSON.stringify(await main()));}catch{process.stderr.write('ADMIN_REPORT_OFFLINE_PROBE_UNAVAILABLE\n');process.exitCode=2;}}
