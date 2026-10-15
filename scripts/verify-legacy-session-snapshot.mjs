// Private restored graph -> keyed proof projection on the encrypted volume.
// stdout is an aggregate receipt. Never print exceptions, source or plan values.
import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';
const [sourcePath,targetPath,keyPath,evidenceDigest]=process.argv.slice(2),volume='/Users/theanh/CodexProjects/Kinh doanh/_cloudflare-migration/.private-backups/mounted/';
const report={status:'FAILED',sourceContacted:false,remoteD1Written:false,sourceBearerPrinted:false,nativeSessionsIssued:0,scope:'Restored backup graph projection and full row readback only; no live-session acceptance or primary activation'};let db,source;
try{
 if(![sourcePath,targetPath,keyPath].every(p=>p?.startsWith(volume)&&path.resolve(p)===p)||!(/^[0-9a-f]{64}$/).test(evidenceDigest))throw Error();
 if(fs.existsSync(targetPath)||fs.existsSync(keyPath)||!fs.lstatSync(sourcePath).isFile()||fs.lstatSync(sourcePath).isSymbolicLink())throw Error();
 source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));if(!['vsxxgdzwtscuxcmjfckt','pppiqhkectojxbmhqcnx'].includes(source.projectId))throw Error();
 const built=await build({stdin:{contents:'export * from "./lib/cloudflare/legacy-session-snapshot";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const h=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const options={projectId:source.projectId,snapshotId:randomUUID(),keyId:'offline-restored-v1',key:randomBytes(32).toString('base64url'),sourceEvidenceDigest:evidenceDigest,observedAt:new Date().toISOString()};
 fs.writeFileSync(keyPath,JSON.stringify(options),{mode:0o600,flag:'wx'});
 const plan=await h.prepareLegacySessionSnapshot(source,options);db=new DatabaseSync(targetPath);fs.chmodSync(targetPath,0o600);db.exec('PRAGMA foreign_keys=ON');db.exec(fs.readFileSync('scripts/d1-auth-legacy-snapshot.sql','utf8'));
 db.exec('BEGIN IMMEDIATE');try{for(const s of plan.statements)db.prepare(s.sql).run(...s.params);db.exec('COMMIT')}catch{db.exec('ROLLBACK');throw Error()}
 await h.verifyLegacySessionSnapshot(plan,{first:async(q,args)=>db.prepare(q).get(...args)??null});
 // Independent source graph oracle: match every input bearer digest, source ID,
 // revoked state and exact parent relation against the imported rows.
 let matched=0;const byToken=new Map(source.tokens.map(t=>[t.token,t]));
 const currentBySession=new Map(source.tokens.filter(t=>!t.revoked).map(t=>[t.sessionId,t]));
 for(const t of source.tokens){const hash=await h.legacySnapshotProofDigest(t.token,options),row=db.prepare('SELECT * FROM d1_auth_legacy_proofs WHERE snapshot_id=? AND proof_hash=?').get(options.snapshotId,hash),parent=t.parent?await h.legacySnapshotProofDigest(t.parent,options):null;
  if(!row||row.source_token_id!==t.id||row.source_session_id!==t.sessionId||row.user_id!==t.userId||row.revoked!==Number(t.revoked)||row.parent_hash!==parent||row.role!==(!t.revoked?'current':currentBySession.get(t.sessionId)?.parent===t.token?'direct_parent':'revoked'))throw Error();
  if(t.parent&&byToken.get(t.parent)?.sessionId!==t.sessionId)throw Error();matched++;
 }
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error();
 const serialized=JSON.stringify(plan);if(serialized.includes(options.key)||source.tokens.some(t=>serialized.includes(t.token)))throw Error();
 report.status='VERIFIED_OFFLINE_LEGACY_SESSION_PROJECTION';report.summary=plan.summary;report.sourceProofsMatched=matched;report.allRowsReadBack=true;report.foreignKeyViolations=0;report.rawBearersInProjection=0;report.snapshotStatus='pending';report.checkedAt=new Date().toISOString();
}catch(error){if(error?.code==='timestamp'&&source){report.timestampAnomalies={};for(const [group,rows] of [['sessions',source.sessions],['tokens',source.tokens],['amr',source.sessions.flatMap(s=>s.amr)]])for(const field of ['createdAt','updatedAt']){const n=rows.filter(r=>typeof r[field]!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(r[field])||!Number.isFinite(Date.parse(r[field]))).length;if(n)report.timestampAnomalies[group+'.'+field]={invalid:n,nulls:rows.filter(r=>r[field]===null).length};}}if(['metadata','timestamp','chronology','session-shape','session-clock','amr','token-shape','token-clock','multiple-current','parent-graph'].includes(error?.code))report.failureCode=error.code;report.error=error?.message==='Legacy snapshot unavailable'?'Unsupported or inconsistent restored legacy session graph':'Offline legacy snapshot verification failed; sensitive details withheld';process.exitCode=1}
finally{db?.close();console.log(JSON.stringify(report))}
