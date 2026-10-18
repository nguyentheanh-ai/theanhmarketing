// Complete current source order rows -> existing native order core, in RAM.
// No webhook, financial transition, email, or source/native authority mutation.
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {visitVerifiedSourceRows} from './sealed-source-snapshot.mjs';
import {postgresTimestamp} from './probe-sealed-auth-native.mjs';
import {parseExactJson} from '../lib/cloudflare/precise-json.ts';

export function postgresRowJson(columns,values){
  if(columns.length!==values.length)throw Error('ORDER_SOURCE_SHAPE_UNAVAILABLE');
  const cells=columns.map((column,i)=>{
    const value=values[i];if(value===null)return 'null';
    if(typeof value!=='string')throw Error('ORDER_SOURCE_TYPE_UNAVAILABLE');
    if(['smallint','integer','bigint','numeric','real','double precision'].includes(column.ty)){
      if(!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(value))throw Error('ORDER_SOURCE_NUMERIC_UNAVAILABLE');
      return value; // Keep decimal and large integer literals, never Number().
    }
    if(column.ty==='boolean'){if(!['true','false'].includes(value))throw Error('ORDER_SOURCE_BOOLEAN_UNAVAILABLE');return value;}
    if(['json','jsonb'].includes(column.ty)){JSON.parse(value);return value;}
    if(column.ty==='timestamp with time zone')return JSON.stringify(postgresTimestamp(value));
    if(['text','uuid','character varying','character','USER-DEFINED'].includes(column.ty))return JSON.stringify(value);
    throw Error('ORDER_SOURCE_TYPE_UNAVAILABLE');
  });
  if(new Set(columns.map(c=>c.n)).size!==columns.length)throw Error('ORDER_SOURCE_SHAPE_UNAVAILABLE');
  return '{'+columns.map((c,i)=>JSON.stringify(c.n)+':'+cells[i]).join(',')+'}';
}
export async function probeOrders(input,core){
  const source=[];let columns=0;
  visitVerifiedSourceRows(input.masterSecret,'a',input.archive,row=>{
    if(row.schema==='public'&&row.table==='orders'){source.push(postgresRowJson(row.columns,row.values));columns=row.columns.length;}
  });
  const sql=new DatabaseSync(':memory:');let accepted=0,rejected=0,paidWithoutBankProof=0,paidWithTransaction=0;
  const transactionOwners=new Map(),referenceOwners=new Map(),statuses={};
  try{
    sql.exec(input.schema);sql.exec('BEGIN');
    for(const raw of source){
      const order=parseExactJson(raw),status=['pending','expired','failed','paid'].includes(order.status)?order.status:'other';
      statuses[status]=(statuses[status]??0)+1;
      for(const [value,map] of [[order.sepay_transaction_id,transactionOwners],[order.sepay_reference_code,referenceOwners]]){
        if(typeof value==='string'&&value.trim()){const key=value.trim(),owners=map.get(key)??new Set();owners.add(order.id);map.set(key,owners);}
      }
      if(status==='paid'){if(order.sepay_transaction_id)paidWithTransaction++;if(!order.sepay_transaction_id&&(!order.sepay_reference_code||order.sepay_reference_code===order.order_code))paidWithoutBankProof++;}
      let prepared;try{prepared=core.prepareNativeOrderRecord(raw);}catch{rejected++;continue;}
      // SQL errors are NOT classified as an unsupported input. Fail the probe.
      // The exact JSON gate has already rejected a numeric literal that would
      // round before validation. vnd must also remain a positive safe integer.
      if(!Number.isSafeInteger(Number(order.amount))||Number(order.amount)!==prepared.amount_vnd)throw Error('ORDER_AMOUNT_MISMATCH');
      sql.prepare('INSERT INTO d1_native_orders(id,order_code,amount_vnd,status,row_json) VALUES(?,?,?,?,?)').run(prepared.id,prepared.order_code,prepared.amount_vnd,prepared.status,prepared.row_json);accepted++;
    }
    sql.exec('COMMIT');
    const actual=sql.prepare('SELECT row_json FROM d1_native_orders').all().map(r=>r.row_json).sort();
    const allFieldsMatched=accepted===source.length&&JSON.stringify(actual)===JSON.stringify([...source].sort());
    const executableAmounts=sql.prepare('SELECT amount_vnd,row_json FROM d1_native_orders').all();
    if(executableAmounts.some(r=>r.amount_vnd!==Number(parseExactJson(r.row_json).amount)))throw Error('ORDER_AMOUNT_MISMATCH');
    if(sql.prepare('SELECT count(*) n FROM d1_native_sepay_receipts').get().n!==0||sql.prepare('SELECT count(*) n FROM d1_native_order_fulfillment').get().n!==0)throw Error('ORDER_PROBE_SIDE_EFFECT');
    return {project:'a',sourceSnapshotAt:input.archive.manifest.header.capturedAt,database:'IN_MEMORY_SQLITE_ONLY',
      sourceRows:source.length,sourceColumns:columns,importedRows:accepted,rejectedRows:rejected,allProjectedFieldsReadBack:allFieldsMatched,executableAmountsReadBack:true,numericPrecisionGuarded:true,statuses,
      bankIdentityAudit:{paidWithRetainedTransaction:paidWithTransaction,paidWithoutRetainedBankIdentity:paidWithoutBankProof,
        duplicateTransactionGroups:[...transactionOwners.values()].filter(s=>s.size>1).length,
        duplicateReferenceGroups:[...referenceOwners.values()].filter(s=>s.size>1).length},
      financialTransitionsExecuted:0,emailsSent:0,productionWritten:false,remoteD1Written:false,readyForCutover:false};
  }finally{sql.close();}
}
async function main(){
  let text='';for await(const part of process.stdin)text+=part;
  const input=JSON.parse(text),root=path.resolve(input.compilerRoot);
  const {build}=createRequire(path.join(root,'package.json'))('esbuild');
  const bundle=await build({stdin:{contents:'export {prepareNativeOrderRecord} from "./lib/cloudflare/native-order-settlement";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,tsconfig:'tsconfig.json',nodePaths:[path.join(root,'node_modules')]});
  const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  process.stdout.write(JSON.stringify(await probeOrders(input,core)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await main();}catch{process.stderr.write('ORDER_SNAPSHOT_UNAVAILABLE\n');process.exitCode=2;}
}
