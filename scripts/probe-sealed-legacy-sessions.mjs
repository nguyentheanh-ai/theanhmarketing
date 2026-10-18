// Offline graph projection only. Never certifies a final source fence or issues
// sessions. Bearers are decrypted in RAM and only keyed digests reach RAM SQL.
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {visitVerifiedSourceRows} from './sealed-source-snapshot.mjs';
import {postgresTimestamp} from './probe-sealed-auth-native.mjs';

export function refreshedTimestamp(value,pgType){
  if(value===null)return null;
  // Supabase Auth UpdateOnlyRefreshInfo explicitly writes UTC into this one
  // timestamp-without-zone field. Do not generalize to other application dates.
  // https://github.com/supabase/auth/blob/master/internal/models/sessions.go
  if(pgType!=='timestamp without time zone'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(value))throw Error('LEGACY_SOURCE_TIMESTAMP_UNAVAILABLE');
  return postgresTimestamp(value+'+00');
}
export function legacyGraphFromArchive(input){
  const users=[],sessions=[],tokens=[],amr=[];
  visitVerifiedSourceRows(input.masterSecret,input.project,input.archive,row=>{
    if(row.schema!=='auth')return;
    const r=Object.fromEntries(row.columns.map((c,i)=>[c.n,row.values[i]]));
    const exact=(names)=>{if(row.columns.length!==names.length||row.columns.some(c=>!names.includes(c.n)))throw Error('LEGACY_SOURCE_SCHEMA_UNAVAILABLE');};
    if(row.table==='users')users.push(r.id);
    if(row.table==='sessions'){
      exact(['id','user_id','created_at','updated_at','factor_id','aal','not_after','refreshed_at','user_agent','ip','tag','oauth_client_id','refresh_token_hmac_key','refresh_token_counter','scopes']);
      sessions.push({id:r.id,userId:r.user_id,createdAt:postgresTimestamp(r.created_at),updatedAt:postgresTimestamp(r.updated_at),
        refreshedAt:refreshedTimestamp(r.refreshed_at,row.columns.find(c=>c.n==='refreshed_at').ty),aal:r.aal,
        factorId:r.factor_id,notAfter:r.not_after,tag:r.tag,oauthClientId:r.oauth_client_id,scopes:r.scopes,
        refreshTokenHmacKey:r.refresh_token_hmac_key,refreshTokenCounter:r.refresh_token_counter,amr:[]});
    }
    if(row.table==='refresh_tokens'){
      exact(['instance_id','id','token','user_id','revoked','created_at','updated_at','parent','session_id']);
      if(!['true','false'].includes(r.revoked))throw Error('LEGACY_SOURCE_BOOLEAN_UNAVAILABLE');
      tokens.push({id:r.id,token:r.token,userId:r.user_id,sessionId:r.session_id,revoked:r.revoked==='true',parent:r.parent,
        createdAt:postgresTimestamp(r.created_at),updatedAt:postgresTimestamp(r.updated_at)});
    }
    if(row.table==='mfa_amr_claims'){
      exact(['session_id','created_at','updated_at','authentication_method','id']);
      amr.push({sessionId:r.session_id,method:r.authentication_method,createdAt:postgresTimestamp(r.created_at),updatedAt:postgresTimestamp(r.updated_at)});
    }
  });
  const bySession=new Map(sessions.map(s=>[s.id,s]));
  for(const claim of amr){const session=bySession.get(claim.sessionId);if(!session)throw Error('LEGACY_SOURCE_ORPHAN_AMR');
    session.amr.push({method:claim.method,createdAt:claim.createdAt,updatedAt:claim.updatedAt});}
  return {projectId:input.archive.manifest.header.sourceProject,userIds:users,sessions,tokens};
}
export async function probeLegacySessions(input,core){
  const source=legacyGraphFromArchive(input),options={projectId:source.projectId,snapshotId:randomUUID(),keyId:'offline-sealed-v1',
    key:input.credentialKey,sourceEvidenceDigest:input.archive.manifestMac,observedAt:input.archive.manifest.header.capturedAt};
  const plan=await core.prepareLegacySessionSnapshot(source,options),sql=new DatabaseSync(':memory:');
  try{
    sql.exec(input.schema);sql.exec('BEGIN');
    try{for(const s of plan.statements)sql.prepare(s.sql).run(...s.params);sql.exec('COMMIT');}catch{sql.exec('ROLLBACK');throw Error('LEGACY_TARGET_REJECTED');}
    await core.verifyLegacySessionSnapshot(plan,{first:async(q,p)=>sql.prepare(q).get(...p)??null});
    // Independent source bearer/parent/state readback; no source value printed.
    for(const token of source.tokens){
      const digest=await core.legacySnapshotProofDigest(token.token,options);
      const row=sql.prepare('SELECT * FROM d1_auth_legacy_proofs WHERE snapshot_id=? AND proof_hash=?').get(options.snapshotId,digest);
      const parent=token.parent?await core.legacySnapshotProofDigest(token.parent,options):null;
      if(!row||row.source_token_id!==token.id||row.user_id!==token.userId||row.source_session_id!==token.sessionId||row.revoked!==Number(token.revoked)||row.parent_hash!==parent)throw Error('LEGACY_TARGET_MISMATCH');
    }
    const serialized=JSON.stringify(plan);
    if(serialized.includes(options.key)||source.tokens.some(t=>serialized.includes(t.token)))throw Error('LEGACY_TARGET_BEARER_EXPOSED');
    if(sql.prepare('PRAGMA foreign_key_check').all().length)throw Error('LEGACY_TARGET_RELATION_MISMATCH');
    return {project:input.project,summary:plan.summary,allRowsReadBack:true,sourceBearerAndParentDigestsVerified:source.tokens.length,
      sourceSnapshotAt:options.observedAt,sourceKind:'restored-backup',snapshotStatus:'pending',database:'IN_MEMORY_SQLITE_ONLY',
      sourceWriterFenced:false,nativeSessionsIssued:0,existingSessionsAcceptedByWorker:false,productionWritten:false,remoteD1Written:false,readyForCutover:false};
  }finally{sql.close();}
}
async function main(){
  let text='';for await(const part of process.stdin)text+=part;
  const input=JSON.parse(text),root=path.resolve(input.compilerRoot);
  const {build}=createRequire(path.join(root,'package.json'))('esbuild');
  const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/legacy-session-snapshot";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,tsconfig:'tsconfig.json',nodePaths:[path.join(root,'node_modules')]});
  const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  process.stdout.write(JSON.stringify(await probeLegacySessions(input,core)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await main();}catch(e){const allowed=['metadata','timestamp','chronology','session-shape','session-clock','amr','token-shape','token-clock','multiple-current','parent-graph'];
    process.stderr.write(JSON.stringify({status:'FAILED',reason:allowed.includes(e?.code)?e.code:'LEGACY_SNAPSHOT_UNAVAILABLE',readyForCutover:false})+'\n');process.exitCode=2;}
}
