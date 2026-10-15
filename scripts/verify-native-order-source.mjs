// Offline source-order parity only. Private input/database must stay in AES volume.
import {DatabaseSync} from 'node:sqlite';import {build} from 'esbuild';import {createHash} from 'node:crypto';import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';
process.umask(0o077);
const [input,output]=process.argv.slice(2),volume=resolve('../.private-backups/mounted')+'/';
if(!input||!output||!resolve(input).startsWith(volume)||!resolve(output).startsWith(volume)||existsSync(output))throw Error('New encrypted-volume output required');
const bundle=await build({stdin:{contents:'export {prepareNativeOrderRecord} from "./lib/cloudflare/native-order-settlement";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {prepareNativeOrderRecord}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text+'\n//# sourceURL=native-order-import-fixture.mjs').toString('base64'));
const source=readFileSync(input,'utf8').split('\n').filter(Boolean),db=new DatabaseSync(output),hash=s=>createHash('sha256').update(s).digest('hex');
let accepted=0,rejected=0,maxColumns=0;const statuses={},currencies={},unsupported={},transactionOwners=new Map(),referenceOwners=new Map();let paidWithoutBankIdentity=0,paidWithRetainedTransaction=0;
try{
 db.exec(readFileSync('scripts/d1-native-order-settlement.sql','utf8'));db.exec('BEGIN');
 for(const raw of source){let value;try{value=JSON.parse(raw)}catch{throw Error('Encrypted source is not JSONL')};maxColumns=Math.max(maxColumns,Object.keys(value).length);const status=['pending','expired','failed','paid'].includes(value.status)?value.status:'other';statuses[status]=(statuses[status]??0)+1;const currency=value.currency==='VND'?'VND':'other';currencies[currency]=(currencies[currency]??0)+1;
  const txn=typeof value.sepay_transaction_id==='string'?value.sepay_transaction_id.trim():'';const ref=typeof value.sepay_reference_code==='string'?value.sepay_reference_code.trim():'';
  for(const [key,map] of [[txn,transactionOwners],[ref,referenceOwners]])if(key){const owners=map.get(key)??new Set();owners.add(value.order_code);map.set(key,owners)}
  if(status==='paid'){if(txn)paidWithRetainedTransaction++;if(!txn&&(!ref||ref===value.order_code))paidWithoutBankIdentity++;}
  try{const row=prepareNativeOrderRecord(raw);db.prepare('INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json) VALUES(?,?,?,?,?)').run(row.id,row.order_code,row.amount_vnd,row.status,row.row_json);accepted++}catch{rejected++;const reason=currency!=='VND'?'unsupported_currency':status==='other'?'unsupported_status':'requires_field_review';unsupported[reason]=(unsupported[reason]??0)+1;}
 }
 db.exec('COMMIT');const imported=db.prepare('SELECT row_json FROM d1_native_orders').all().map(r=>r.row_json),digest=rows=>hash(rows.map(hash).sort().join('\n'));
 const exact=accepted===source.length&&digest(source)===digest(imported);console.log(JSON.stringify({status:exact?'VERIFIED_FULL_ORDER_JSON_SNAPSHOT':'INCOMPLETE_REQUIRES_FIELD_REVIEW',sourceRows:source.length,importedRows:accepted,rejectedRows:rejected,sourceColumns:maxColumns,statuses,currencies,unsupported,fullJsonMultisetSha256Matched:exact,sourceSha256:digest(source),importedSha256:digest(imported),financialTransitionsExecuted:0,sourceContacted:false,legacyPaymentAudit:{paidWithRetainedTransaction,paidWithoutBankIdentity,duplicateTransactionIdentifierGroups:[...transactionOwners.values()].filter(v=>v.size>1).length,duplicateReferenceIdentifierGroups:[...referenceOwners.values()].filter(v=>v.size>1).length},limits:'Offline restored snapshot; no fresh Source/delta, all relational constraints, pricing, webhook authentication or fulfillment proof'}));
 if(!exact)process.exitCode=2;
}finally{db.close()}
