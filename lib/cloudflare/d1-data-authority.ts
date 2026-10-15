import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
// Backend-only candidate. Receipts are references to independently verified
// operator evidence, not proof that this module fenced a Supabase service.
export type AuthorityIdentity={projectId:string;component:'auth';epoch:string;restoreFence:string};
export type AuthorityHandoff=AuthorityIdentity&{transitionId:string;sourceCutoffAt:string;manifestDigest:string;sourceFenceReceipt:string;approvalReceipt:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,hash=/^[0-9a-f]{64}$/;
const fail=()=>new Error('Data authority unavailable');
function identity(v:AuthorityIdentity){if(!/^[a-z0-9]{20}$/.test(v.projectId)||v.component!=='auth'||!uuid.test(v.epoch)||!uuid.test(v.restoreFence))throw fail();}
function stamp(now:number){if(!Number.isFinite(now))throw fail();return new Date(now).toISOString();}
async function digest(v:unknown){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v)))),b=>b.toString(16).padStart(2,'0')).join('');}
function receipt(v:AuthorityHandoff,now:number){identity(v);if(!uuid.test(v.transitionId)||![v.manifestDigest,v.sourceFenceReceipt,v.approvalReceipt].every(x=>hash.test(x))||!Number.isFinite(Date.parse(v.sourceCutoffAt))||new Date(Date.parse(v.sourceCutoffAt)).toISOString()!==v.sourceCutoffAt||Date.parse(v.sourceCutoffAt)>now)throw fail();}
function predicate(v:AuthorityIdentity,alias='a'){
 identity(v);if(!/^[a-z]+$/.test(alias))throw fail();
 // Only validated backend UUID/tenant literals enter SQL; no browser inputs.
 return `${alias}.source_project_id='${v.projectId}' AND ${alias}.component='auth' AND ${alias}.epoch='${v.epoch}' AND ${alias}.restore_fence='${v.restoreFence}'`;
}
function boundPredicate(v:AuthorityHandoff){
 receipt(v,Date.parse(v.sourceCutoffAt));
 return `${predicate(v)} AND a.transition_id='${v.transitionId}' AND a.source_cutoff_at='${v.sourceCutoffAt}' AND a.manifest_digest='${v.manifestDigest}' AND a.source_fence_receipt='${v.sourceFenceReceipt}' AND a.approval_receipt='${v.approvalReceipt}'`;
}
export function nativeAuthoritySql(v:AuthorityHandoff,timePosition:number){if(!Number.isSafeInteger(timePosition)||timePosition<1)throw fail();return `EXISTS(SELECT 1 FROM d1_data_authority a WHERE ${boundPredicate(v)} AND a.phase='native' AND julianday(a.source_cutoff_at)<=julianday(a.prepared_at) AND julianday(a.prepared_at)<=julianday(a.activated_at) AND julianday(a.activated_at)<=julianday(?${timePosition}) AND a.frozen_at IS NULL)`;}
export async function assertNativeAuthority(db:Pick<AuthDatabase,'first'>,v:AuthorityHandoff,now=Date.now()){
 const row=await db.first(`SELECT 1 AS ready WHERE ${nativeAuthoritySql(v,1)}`,[stamp(now)]);if(row?.ready!==1)throw fail();
}
// Operator transition must run through a separately authorized tool after
// full final-delta/source-writer/approval evidence. None is mounted in runtime.
export async function prepareAuthorityHandoff(db:AuthDatabase,v:AuthorityHandoff,now=Date.now()){
 receipt(v,now);const time=stamp(now),payload=await digest(['prepare',v.projectId,v.component,v.epoch,v.restoreFence,v.transitionId,v.sourceCutoffAt,v.manifestDigest,v.sourceFenceReceipt,v.approvalReceipt]);
 const prior=await db.first('SELECT request_digest,kind FROM d1_data_authority_operations WHERE id=?1',[v.transitionId]);if(prior){if(prior.kind!=='prepare'||prior.request_digest!==payload)throw fail();return {replayed:true};}
 const params=[v.projectId,v.component,v.epoch,v.restoreFence,v.transitionId,v.sourceCutoffAt,v.manifestDigest,v.sourceFenceReceipt,v.approvalReceipt,time,payload];
 // Initial handoff only. Epoch changes/restores require a separate protocol;
 // this helper cannot overwrite an existing native or frozen authority row.
 const result=await db.batch([
  {sql:`INSERT INTO d1_data_authority(source_project_id,component,epoch,restore_fence,transition_id,last_operation_id,phase,source_cutoff_at,manifest_digest,source_fence_receipt,approval_receipt,prepared_at)
   SELECT ?1,?2,?3,?4,?5,?5,'fenced',?6,?7,?8,?9,?10 WHERE NOT EXISTS(SELECT 1 FROM d1_data_authority WHERE source_project_id=?1 AND component=?2)`,params:params.slice(0,10)},
  {sql:`INSERT INTO d1_data_authority_operations(id,source_project_id,component,request_digest,kind,epoch,created_at)
   SELECT ?5,?1,?2,?11,'prepare',?3,?10 WHERE EXISTS(SELECT 1 FROM d1_data_authority a WHERE ${boundPredicate(v)} AND a.transition_id=?5 AND a.prepared_at=?10 AND a.last_operation_id=?5 AND a.phase='fenced')`,params},
  {sql:`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_data_authority_operations WHERE id=?1 AND request_digest=?2 AND kind='prepare') THEN 1 ELSE abs(-9223372036854775808) END AS done`,params:[v.transitionId,payload]},
 ]);if(result.at(-1)?.results?.[0]?.done!==1)throw fail();return {replayed:false};
}
export async function transitionAuthority(db:AuthDatabase,v:AuthorityHandoff,operation:{id:string;kind:'activate'|'freeze';transitionId:string},now=Date.now()){
 receipt(v,now);if(!uuid.test(operation.id)||!uuid.test(operation.transitionId)||!['activate','freeze'].includes(operation.kind))throw fail();
 const time=stamp(now),payload=await digest([operation.kind,v.projectId,v.component,v.epoch,v.restoreFence,operation.transitionId,v.sourceCutoffAt,v.manifestDigest,v.sourceFenceReceipt,v.approvalReceipt]);
 const prior=await db.first('SELECT request_digest,kind FROM d1_data_authority_operations WHERE id=?1',[operation.id]);if(prior){if(prior.kind!==operation.kind||prior.request_digest!==payload)throw fail();return {replayed:true};}
 const activate=operation.kind==='activate',change=activate?"phase='native',activated_at=?2":"phase='fenced',frozen_at=?2",from=activate?"a.phase='fenced' AND a.activated_at IS NULL AND a.frozen_at IS NULL AND julianday(a.prepared_at)<=julianday(?2)":"a.phase='native' AND julianday(a.activated_at)<=julianday(?2)";
 const match=activate?"a.phase='native' AND a.activated_at=?2":"a.phase='fenced' AND a.frozen_at=?2";
 const result=await db.batch([
  {sql:`UPDATE d1_data_authority AS a SET ${change},last_operation_id=?3 WHERE ${boundPredicate(v)} AND a.transition_id=?1 AND ${from}`,params:[operation.transitionId,time,operation.id]},
  {sql:`INSERT INTO d1_data_authority_operations(id,source_project_id,component,request_digest,kind,epoch,created_at) SELECT ?3,'${v.projectId}','auth',?4,?5,'${v.epoch}',?2 WHERE EXISTS(SELECT 1 FROM d1_data_authority a WHERE ${boundPredicate(v)} AND a.transition_id=?1 AND a.last_operation_id=?3 AND ${match})`,params:[operation.transitionId,time,operation.id,payload,operation.kind]},
  {sql:`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_data_authority_operations WHERE id=?1 AND request_digest=?2 AND kind=?3) THEN 1 ELSE abs(-9223372036854775808) END AS done`,params:[operation.id,payload,operation.kind]},
 ]);if(result.at(-1)?.results?.[0]?.done!==1)throw fail();return {replayed:false};
}
