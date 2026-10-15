import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {authSourceRevision} from '@/lib/cloudflare/auth-source-fingerprint';

// Offline restored-backup projection, NOT an authentication issuer or a live
// session certificate. Bearers enter process memory from an encrypted volume;
// only keyed digests enter the returned plan. Do not log inputs or plan values.
export type LegacySourceSession={
 id:string;userId:string;createdAt:string;updatedAt:string;refreshedAt:string|null;
 aal:string;factorId:string|null;notAfter:string|null;tag:string|null;oauthClientId:string|null;scopes:string|null;
 refreshTokenHmacKey:string|null;refreshTokenCounter:number|null;
 amr:readonly {method:string;createdAt:string;updatedAt:string}[];
};
export type LegacySourceToken={id:string;token:string;userId:string;sessionId:string;revoked:boolean;parent:string|null;createdAt:string;updatedAt:string};
export type LegacySourceSnapshot={projectId:string;userIds:readonly string[];sessions:readonly LegacySourceSession[];tokens:readonly LegacySourceToken[]};
export type LegacySnapshotOptions={projectId:string;snapshotId:string;keyId:string;key:string;sourceEvidenceDigest:string;observedAt:string};
type Row=Record<string,string|number|null>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const hex=/^[0-9a-f]{64}$/,v1=/^[a-z0-9]{12}$/;
type FailureCode='metadata'|'timestamp'|'chronology'|'session-shape'|'session-clock'|'amr'|'token-shape'|'token-clock'|'multiple-current'|'parent-graph';
const fail=(code:FailureCode='metadata')=>Object.assign(new Error('Legacy snapshot unavailable'),{code});
function time(v:string){
 // Preserve PostgreSQL microseconds in the snapshot. Date.parse is used only
 // for chronology checks, not serialization or source-delta revision cursors.
 if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(v)||!Number.isFinite(Date.parse(v)))throw fail('timestamp');
 // The exporter sets UTC explicitly. Reject Date.parse rollover (Feb 30,
 // 24:00) instead of silently accepting a different source instant.
 if(new Date(Date.parse(v)).toISOString().slice(0,19)!==v.slice(0,19))throw fail('timestamp');
 return Date.parse(v);
}
function chronology(created:string,updated:string,observed:number){const c=time(created),u=time(updated);if(c>u||u>observed)throw fail('chronology');}
function keyBytes(value:string){
 try{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value))throw fail();const bytes=Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='),c=>c.charCodeAt(0));
  if(bytes.length!==32||btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')!==value)throw fail();return bytes;
 }catch{throw fail();}
}
async function signer(o:LegacySnapshotOptions){
 if(typeof o.projectId!=='string'||!/^[a-z0-9]{20}$/.test(o.projectId)||!uuid.test(o.snapshotId)||!/^[A-Za-z0-9_-]{1,64}$/.test(o.keyId)||!hex.test(o.sourceEvidenceDigest))throw fail();time(o.observedAt);
 const key=await crypto.subtle.importKey('raw',keyBytes(o.key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return async(domain:string,value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify([domain,o.projectId,o.snapshotId,o.keyId,o.sourceEvidenceDigest,value])))),b=>b.toString(16).padStart(2,'0')).join('');
}
// This is a lookup digest, not proof validation. A later issuer must pin a
// verified FINAL snapshot, native authority, account version and redemption.
export async function legacySnapshotProofDigest(token:string,o:LegacySnapshotOptions){if(typeof token!=='string'||!v1.test(token))throw fail();return (await signer(o))('tam-source-refresh-proof-v1',token);}
function insert(table:string,row:Row){const columns=Object.keys(row);return{sql:`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>'?'+(i+1)).join(',')})`,params:columns.map(c=>row[c])};}

export async function prepareLegacySessionSnapshot(source:LegacySourceSnapshot,o:LegacySnapshotOptions){
 const sign=await signer(o),observed=time(o.observedAt);
 if(!source||source.projectId!==o.projectId||!Array.isArray(source.userIds)||!Array.isArray(source.sessions)||!Array.isArray(source.tokens))throw fail();
 const users=new Set<string>();for(const id of source.userIds){if(typeof id!=='string'||!uuid.test(id)||users.has(id))throw fail();users.add(id);}
 const sessions=new Map<string,LegacySourceSession>();
 for(const s of source.sessions){
  if(!s||!uuid.test(s.id)||sessions.has(s.id)||!users.has(s.userId)||s.aal!=='aal1'||
   [s.factorId,s.notAfter,s.tag,s.oauthClientId,s.scopes,s.refreshTokenHmacKey,s.refreshTokenCounter].some(v=>v!==null)||!Array.isArray(s.amr)||s.amr.length<1||s.amr.length>2)throw fail('session-shape');
  chronology(s.createdAt,s.updatedAt,observed);if(s.refreshedAt!==null&&(time(s.refreshedAt)<time(s.createdAt)||time(s.refreshedAt)>observed))throw fail('session-clock');
  const methods=new Set<string>();for(const a of s.amr){if(!a||!['password','otp'].includes(a.method)||methods.has(a.method))throw fail('amr');methods.add(a.method);chronology(a.createdAt,a.updatedAt,observed);}
  sessions.set(s.id,s);
 }
 const tokens=new Map<string,LegacySourceToken>(),ids=new Set<string>(),current=new Map<string,LegacySourceToken>();
 for(const t of source.tokens){
  if(!t||typeof t.id!=='string'||!/^[1-9][0-9]{0,18}$/.test(t.id)||BigInt(t.id)>BigInt('9223372036854775807')||ids.has(t.id)||(typeof t.token!=='string'||!v1.test(t.token))||tokens.has(t.token)||typeof t.revoked!=='boolean'||
   (t.parent!==null&&t.parent!==''&&(typeof t.parent!=='string'||!v1.test(t.parent)))||sessions.get(t.sessionId)?.userId!==t.userId)throw fail('token-shape');
  chronology(t.createdAt,t.updatedAt,observed);if(time(t.createdAt)<time(sessions.get(t.sessionId)!.createdAt))throw fail('token-clock');
  if(!t.revoked){if(current.has(t.sessionId))throw fail('multiple-current');current.set(t.sessionId,t);}
  tokens.set(t.token,t);ids.add(t.id);
 }
 for(const t of tokens.values())if(t.parent){const p=tokens.get(t.parent);if(!p||p.sessionId!==t.sessionId||p.userId!==t.userId||!p.revoked||BigInt(p.id)>=BigInt(t.id)||time(p.createdAt)>time(t.createdAt))throw fail('parent-graph');}
 // Every validation completes before a single statement is returned. Sorting
 // binds the same graph regardless of PostgreSQL row order.
 const hashes=new Map<string,string>();for(const t of tokens.values())hashes.set(t.token,await sign('tam-source-refresh-proof-v1',t.token));
 const sessionRows:Row[]=Array.from(sessions.values()).sort((a,b)=>a.id.localeCompare(b.id)).map(s=>({
  snapshot_id:o.snapshotId,project_id:o.projectId,source_session_id:s.id,user_id:s.userId,
  created_at:s.createdAt,updated_at:s.updatedAt,refreshed_at:s.refreshedAt,aal:s.aal,
  created_revision:authSourceRevision(s.createdAt),updated_revision:authSourceRevision(s.updatedAt),refreshed_revision:s.refreshedAt===null?null:authSourceRevision(s.refreshedAt),
  amr_json:JSON.stringify([...s.amr].sort((a,b)=>a.method.localeCompare(b.method)).map(a=>({method:a.method,createdAt:a.createdAt,updatedAt:a.updatedAt}))),
  current_proof_hash:current.has(s.id)?hashes.get(current.get(s.id)!.token)!:null,
  native_session_version:null,account_source_digest:null,
 }));
 const proofRows:Row[]=Array.from(tokens.values()).sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:1).map(t=>({
  snapshot_id:o.snapshotId,project_id:o.projectId,source_token_id:t.id,proof_hash:hashes.get(t.token)!,
  source_session_id:t.sessionId,user_id:t.userId,revoked:Number(t.revoked),parent_hash:t.parent?hashes.get(t.parent)!:null,
  created_at:t.createdAt,updated_at:t.updatedAt,role:!t.revoked?'current':current.get(t.sessionId)?.parent===t.token?'direct_parent':'revoked',
  created_revision:authSourceRevision(t.createdAt),updated_revision:authSourceRevision(t.updatedAt),
 }));
 const graphDigest=await sign('tam-source-session-graph-v1',[o.observedAt,sessionRows,proofRows]);
 const snapshot:Row={snapshot_id:o.snapshotId,project_id:o.projectId,source_kind:'restored-backup',source_evidence_digest:o.sourceEvidenceDigest,observed_at:o.observedAt,proof_key_id:o.keyId,graph_digest:graphDigest,status:'pending',source_cutoff_at:null,authority_context_hash:null,session_count:sessionRows.length,proof_count:proofRows.length};
 return {snapshot,sessions:sessionRows,proofs:proofRows,statements:[insert('d1_auth_legacy_snapshots',snapshot),...sessionRows.map(r=>insert('d1_auth_legacy_sessions',r)),...proofRows.map(r=>insert('d1_auth_legacy_proofs',r))],summary:{sessions:sessionRows.length,tokens:proofRows.length,currentTokens:current.size,directParents:proofRows.filter(r=>r.role==='direct_parent').length,otherRevokedTokens:proofRows.filter(r=>r.role==='revoked').length,closedSessions:sessionRows.length-current.size}};
}

export async function verifyLegacySessionSnapshot(plan:Awaited<ReturnType<typeof prepareLegacySessionSnapshot>>,db:Pick<AuthDatabase,'first'>){
 const failed=()=>new Error('Legacy snapshot verification failed');
 for(const [table,rows,key] of [['d1_auth_legacy_snapshots',[plan.snapshot],'snapshot_id'],['d1_auth_legacy_sessions',plan.sessions,'source_session_id'],['d1_auth_legacy_proofs',plan.proofs,'source_token_id']] as const){
  const n=await db.first(`SELECT count(*) n FROM ${table} WHERE snapshot_id=?1`,[String(plan.snapshot.snapshot_id)]);if(n?.n!==rows.length)throw failed();
  for(const row of rows){const target=await db.first(`SELECT * FROM ${table} WHERE snapshot_id=?1 AND ${key}=?2`,[String(plan.snapshot.snapshot_id),String(row[key])]);if(!target||Object.keys(row).some(k=>target[k]!==row[k]))throw failed();}
 }
 return {matched:true as const,sessions:plan.sessions.length,proofs:plan.proofs.length,published:false as const};
}
