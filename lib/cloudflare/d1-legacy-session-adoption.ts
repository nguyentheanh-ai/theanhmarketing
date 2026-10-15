import {authProofDigest} from '@/lib/cloudflare/auth-proof-domain';
import {assertNativeAuthority,nativeAuthoritySql,type AuthorityHandoff} from '@/lib/cloudflare/d1-data-authority';
import {attachD1RefreshFamily,type RefreshFamilyPolicy} from '@/lib/cloudflare/d1-refresh-family';
import {legacySnapshotProofDigest,type LegacySnapshotOptions} from '@/lib/cloudflare/legacy-session-snapshot';
import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {authSourceRevision} from '@/lib/cloudflare/auth-source-fingerprint';

// Backend candidate only: NOT mounted in an HTTP route or enabled by an env
// flag. A final, fenced Source export/certification operator is still required.
// The restored-backup converter can never create that certification.
export type LegacyAdoptionPolicy=RefreshFamilyPolicy&{
 nativeAuthority:AuthorityHandoff;legacySnapshot:LegacySnapshotOptions;expectedGraphDigest:string;
 bridgeAcceptUntil:number;rememberLogin:boolean;allowAttempt:()=>Promise<boolean>;
};
type Statement={sql:string;params:(string|number|null)[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,hex=/^[0-9a-f]{64}$/;
const fail=()=>new Error('Legacy session adoption unavailable');
export async function legacyAdoptionAuthorityDigest(p:LegacyAdoptionPolicy){
 if(!p.nativeAuthority||p.nativeAuthority.projectId!==p.projectId)throw fail();
 return authProofDigest('tam-legacy-adoption-authority-v1',p);
}
function statement(sql:string,params:(string|number|null)[]):Statement{
 const n=Math.max(0,...Array.from(sql.matchAll(/\?(\d+)/g),m=>Number(m[1])));return{sql,params:params.slice(0,n)};
}
async function bootstrapToken(p:LegacyAdoptionPolicy,context:string,session:string,version:number){
 const bytes=Uint8Array.from(atob(p.legacySnapshot.key.replaceAll('-','+').replaceAll('_','/')+'='),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('raw',bytes,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const raw=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify(['tam-legacy-bootstrap-v1',context,p.legacySnapshot.snapshotId,session,version])));
 return btoa(String.fromCharCode(...new Uint8Array(raw))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}

export async function adoptLegacyD1Session(db:AuthDatabase,proof:string,p:LegacyAdoptionPolicy){
 if(typeof proof!=='string'||!/^[a-z0-9]{12}$/.test(proof))return null;
 if(!await p.allowAttempt())return null;
 const now=p.now??Date.now(),o=p.legacySnapshot,ids=p.allowedUserIds;
 if(!p.nativeAuthority||!o||o.projectId!==p.projectId||!hex.test(p.expectedGraphDigest)||!Number.isSafeInteger(now)||!Number.isFinite(p.bridgeAcceptUntil)||
  p.bridgeAcceptUntil<=Date.parse(p.nativeAuthority.sourceCutoffAt)||p.bridgeAcceptUntil>Date.parse(p.nativeAuthority.sourceCutoffAt)+400*86400000||typeof p.rememberLogin!=='boolean'||
  (ids!==undefined&&(!Array.isArray(ids)||ids.length>100||ids.some(id=>!uuid.test(id))||new Set(ids).size!==ids.length))||p.reuseIntervalMs!==10000||p.absoluteTtlMs!==null||p.idleTimeoutMs!==null)throw fail();
 if(now>p.bridgeAcceptUntil)return null;
 const stamp=new Date(now).toISOString(),context=await legacyAdoptionAuthorityDigest(p),digest=await legacySnapshotProofDigest(proof,o);
 await assertNativeAuthority(db,p.nativeAuthority,now);
 const nowRevision=authSourceRevision(stamp),cutoffRevision=authSourceRevision(p.nativeAuthority.sourceCutoffAt);
 const params:(string|number|null)[]=[p.projectId,stamp,o.snapshotId,p.expectedGraphDigest,context,digest,p.nativeAuthority.sourceCutoffAt,o.sourceEvidenceDigest,o.keyId,ids===undefined?'null':JSON.stringify(ids),authSourceRevision(new Date(now-10000).toISOString()),o.observedAt];
 const authority=nativeAuthoritySql(p.nativeAuthority,2);
 const snapshot=`m.snapshot_id=?3 AND m.project_id=?1 AND m.source_kind='fenced-final' AND m.status='verified' AND m.graph_digest=?4 AND m.authority_context_hash=?5
  AND m.source_cutoff_at=?7 AND m.source_evidence_digest=?8 AND m.proof_key_id=?9 AND m.observed_at=?12
  AND julianday(m.observed_at) BETWEEN julianday(?7) AND julianday(?2) AND ${authority}`;
 if((await db.first(`SELECT 1 AS ready FROM d1_auth_legacy_snapshots m WHERE ${snapshot}`,params.map(v=>v??'')))?.ready!==1)throw fail();
 const allowed=`((r.revoked=0 AND r.proof_hash=l.current_proof_hash) OR (r.revoked=1 AND (c.parent_hash=r.proof_hash OR r.updated_revision BETWEEN ?11 AND '${nowRevision}')))`;
 const from=`FROM d1_auth_legacy_proofs r
  JOIN d1_auth_legacy_sessions l ON l.snapshot_id=r.snapshot_id AND l.project_id=r.project_id AND l.source_session_id=r.source_session_id AND l.user_id=r.user_id
  JOIN d1_auth_legacy_snapshots m ON m.snapshot_id=l.snapshot_id AND m.project_id=l.project_id
  JOIN d1_auth_legacy_proofs c ON c.snapshot_id=l.snapshot_id AND c.project_id=l.project_id AND c.proof_hash=l.current_proof_hash AND c.source_session_id=l.source_session_id AND c.user_id=l.user_id AND c.revoked=0
  JOIN d1_auth_accounts a ON a.user_id=l.user_id
  JOIN d1_auth_source_versions v ON v.user_id=a.user_id AND v.source_project_id=l.project_id
  WHERE r.proof_hash=?6 AND ${snapshot} AND a.session_version=l.native_session_version AND v.source_digest=l.account_source_digest
   AND a.email_confirmed_at IS NOT NULL AND julianday(a.email_confirmed_at)<=julianday(?2) AND a.deleted_at IS NULL AND a.is_anonymous=0
   AND (a.banned_until IS NULL OR julianday(a.banned_until)<=julianday(?2))
   AND r.created_revision<=r.updated_revision AND r.updated_revision<='${cutoffRevision}'
   AND c.created_revision<=c.updated_revision AND c.updated_revision<='${cutoffRevision}'
   AND l.created_revision<=l.updated_revision AND l.updated_revision<='${cutoffRevision}' AND (l.refreshed_revision IS NULL OR l.refreshed_revision<='${cutoffRevision}')
   AND (?10='null' OR EXISTS(SELECT 1 FROM json_each(?10) allowed WHERE allowed.value=l.user_id))`;
 const select=`SELECT l.source_session_id,l.user_id,l.native_session_version,CASE WHEN ${allowed} THEN 1 ELSE 0 END proof_allowed ${from}`;
 const row=await db.first(select,params.map(v=>v??''));if(!row)return null;
 if(!uuid.test(String(row.source_session_id))||!uuid.test(String(row.user_id))||!Number.isSafeInteger(row.native_session_version)||Number(row.native_session_version)<1||![0,1].includes(Number(row.proof_allowed)))throw fail();
 if(p.allowFamilyAttempt&&!((await p.allowFamilyAttempt({projectId:p.projectId,userId:String(row.user_id),familyId:String(row.source_session_id)})).allowed))return null;
 const token=await bootstrapToken(p,context,String(row.source_session_id),Number(row.native_session_version)),bootstrapHash=await authProofDigest(token,p),operation=crypto.randomUUID();
 params.push(String(row.source_session_id),String(row.user_id),Number(row.native_session_version),bootstrapHash,operation,new Date(now+120000).toISOString());
 // ?13 family, ?14 user, ?15 captured version, ?16 derived bootstrap digest,
 // ?17 operation and ?18 retry deadline. No raw bearer enters a SQL parameter.
 const scope=`d.project_id=?1 AND d.authority_context_hash=?5 AND d.snapshot_id=?3 AND d.source_session_id=?13 AND d.user_id=?14 AND d.native_session_version=?15 AND d.bootstrap_hash=?16`;
 const eligible=`EXISTS(SELECT 1 ${from} AND l.source_session_id=?13 AND l.user_id=?14 AND l.native_session_version=?15)`;
 const validProof=`${eligible} AND EXISTS(SELECT 1 ${from} AND ${allowed})`;
 const receiptInsert=(revoked:boolean)=>`INSERT INTO d1_auth_legacy_adoptions(project_id,authority_context_hash,snapshot_id,source_session_id,user_id,native_session_version,bootstrap_hash,created_at,retry_until,operation_id,revoked_at)
  SELECT ?1,?5,?3,?13,?14,?15,?16,?2,?18,?17,${revoked?'?2':'NULL'} WHERE ${eligible} AND EXISTS(SELECT 1 ${from} AND ${revoked?'NOT ':''}${allowed})
  ${revoked?'':`AND NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE family_id=?13) AND NOT EXISTS(SELECT 1 FROM d1_auth_refresh_families WHERE family_id=?13)`}
  ON CONFLICT(project_id,authority_context_hash,source_session_id) DO NOTHING`;
 const receipt=()=>db.first(`SELECT d.* FROM d1_auth_legacy_adoptions d WHERE ${scope}`,params.slice(0,16).map(v=>v??''));
 if(row.proof_allowed===0){
  const own=`EXISTS(SELECT 1 FROM d1_auth_legacy_adoptions d WHERE ${scope} AND d.revoked_at IS NOT NULL)`;
  const family=`project_id=?1 AND user_id=?14 AND family_id=?13 AND bootstrap_access_hash=?16`;
  const leases=`project_id=?1 AND user_id=?14 AND family_id=?13 AND (token_hash=?16 OR EXISTS(SELECT 1 FROM d1_auth_refresh_families WHERE ${family}))`;
  const ss=[statement(receiptInsert(true),params),statement(`UPDATE d1_auth_legacy_adoptions AS d SET revoked_at=coalesce(revoked_at,?2) WHERE ${scope} AND ${eligible} AND EXISTS(SELECT 1 ${from} AND NOT ${allowed})`,params),
   statement(`UPDATE d1_auth_refresh_families SET revoked_at=coalesce(revoked_at,?2) WHERE ${family} AND ${own}`,params),statement(`UPDATE d1_auth_sessions SET revoked_at=coalesce(revoked_at,?2) WHERE ${leases} AND ${own}`,params),
   statement(`SELECT CASE WHEN ${own} AND ${eligible} AND NOT EXISTS(SELECT 1 FROM d1_auth_refresh_families WHERE ${family} AND revoked_at IS NULL) AND NOT EXISTS(SELECT 1 FROM d1_auth_sessions WHERE ${leases} AND revoked_at IS NULL) THEN 1 ELSE abs(-9223372036854775808) END AS valid`,params)];
  const results=await db.batch(ss);if(results.at(-1)?.results?.[0]?.valid!==1)throw fail();return null;
 }
 let prior=await receipt();
 if(!prior){
  const won=`EXISTS(SELECT 1 FROM d1_auth_legacy_adoptions d WHERE ${scope} AND d.operation_id=?17 AND d.revoked_at IS NULL AND d.created_at=?2 AND d.retry_until=?18)`;
  const ss=[statement(receiptInsert(false),params),statement(`INSERT INTO d1_auth_sessions(token_hash,user_id,project_id,family_id,session_version,created_at,expires_at)
   SELECT ?16,?14,?1,?13,?15,?2,?18 WHERE ${won} AND ${validProof}`,params),
   statement(`SELECT CASE WHEN ${won} AND ${validProof} AND EXISTS(SELECT 1 FROM d1_auth_sessions WHERE token_hash=?16 AND user_id=?14 AND project_id=?1 AND family_id=?13 AND session_version=?15 AND created_at=?2 AND expires_at=?18 AND revoked_at IS NULL) THEN 1 ELSE abs(-9223372036854775808) END AS valid`,params)];
  try{const results=await db.batch(ss);if(results.at(-1)?.results?.[0]?.valid!==1)throw fail();}
  catch{const winner=await receipt();if(!winner||winner.operation_id===operation)throw fail();}
  prior=await receipt();
 }
 if(!prior||prior.revoked_at!==null||!Number.isFinite(Date.parse(String(prior.created_at)))||Date.parse(String(prior.created_at))>now||Date.parse(String(prior.retry_until))!==Date.parse(String(prior.created_at))+120000||now>Date.parse(String(prior.retry_until)))return null;
 // attach is already transaction/CAS guarded, and can recover its first
 // committed response using the same internal bootstrap without rotating twice.
 const pair=await attachD1RefreshFamily(db,token,{...p,allowFamilyAttempt:undefined});if(!pair)return null;
 const checked=await db.first(`SELECT 1 AS ready FROM d1_auth_legacy_adoptions d WHERE ${scope} AND d.revoked_at IS NULL AND ${validProof}`,params.slice(0,16).map(v=>v??''));
 if(checked?.ready!==1)throw fail();
 return pair;
}
