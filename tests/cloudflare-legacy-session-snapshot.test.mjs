import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/legacy-session-snapshot";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),stamp='2026-10-14T12:00:00.123456+00:00';
function fixture(){return {source:{projectId:'vsxxgdzwtscuxcmjfckt',userIds:[id(1)],sessions:[{id:id(2),userId:id(1),createdAt:stamp,updatedAt:stamp,refreshedAt:null,aal:'aal1',factorId:null,notAfter:null,tag:null,oauthClientId:null,scopes:null,refreshTokenHmacKey:null,refreshTokenCounter:null,amr:[{method:'password',createdAt:stamp,updatedAt:stamp}]}],tokens:[
 {id:'1',token:'aaaaaaaaaaaa',userId:id(1),sessionId:id(2),revoked:true,parent:null,createdAt:stamp,updatedAt:stamp},
 {id:'2',token:'bbbbbbbbbbbb',userId:id(1),sessionId:id(2),revoked:true,parent:'aaaaaaaaaaaa',createdAt:stamp,updatedAt:stamp},
 {id:'3',token:'cccccccccccc',userId:id(1),sessionId:id(2),revoked:false,parent:'bbbbbbbbbbbb',createdAt:stamp,updatedAt:stamp}]},options:{projectId:'vsxxgdzwtscuxcmjfckt',snapshotId:id(10),keyId:'offline-fixture',key:Buffer.alloc(32,9).toString('base64url'),sourceEvidenceDigest:'1'.repeat(64),observedAt:'2026-10-15T08:00:00.000Z'}}}
test('complete legacy graph retains UUIDs, revoked ancestors and microseconds; no raw bearer/key in prepared data',async()=>{
 const f=fixture(),p=await h.prepareLegacySessionSnapshot(f.source,f.options),serialized=JSON.stringify(p);
 assert.deepEqual(p.summary,{sessions:1,tokens:3,currentTokens:1,directParents:1,otherRevokedTokens:1,closedSessions:0});
 assert.equal(p.sessions[0].source_session_id,id(2));assert.equal(p.sessions[0].user_id,id(1));assert.equal(p.sessions[0].created_at,stamp);
 for(const value of [f.options.key,...f.source.tokens.map(r=>r.token)])assert(!serialized.includes(value));
 assert.equal(p.proofs.find(r=>r.source_token_id==='3').role,'current');assert.equal(p.proofs.find(r=>r.source_token_id==='2').role,'direct_parent');assert.equal(p.proofs.find(r=>r.source_token_id==='1').role,'revoked');
 assert.equal(p.snapshot.status,'pending');assert.equal(p.snapshot.source_kind,'restored-backup');
});
test('projection is deterministic under input order and HMAC separated by key/project/snapshot',async()=>{
 const f=fixture(),a=await h.prepareLegacySessionSnapshot(f.source,f.options);
 assert.deepEqual(await h.prepareLegacySessionSnapshot({...f.source,tokens:[...f.source.tokens].reverse()},f.options),a);
 for(const patch of [{key:Buffer.alloc(32,8).toString('base64url')},{snapshotId:id(11)},{projectId:'pppiqhkectojxbmhqcnx'}]){
  const o={...f.options,...patch},b=await h.prepareLegacySessionSnapshot({...f.source,projectId:o.projectId},o);assert.notEqual(a.proofs[0].proof_hash,b.proofs[0].proof_hash);assert.notEqual(a.snapshot.graph_digest,b.snapshot.graph_digest);
 }
 await assert.rejects(h.prepareLegacySessionSnapshot({...f.source,projectId:'pppiqhkectojxbmhqcnx'},f.options),/Legacy snapshot unavailable/);
});
test('SQLite import preserves complete graph; re-import cannot overwrite or activate a snapshot',async t=>{
 const f=fixture(),p=await h.prepareLegacySessionSnapshot(f.source,f.options),db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(readFileSync('scripts/d1-auth-legacy-snapshot.sql','utf8'));db.exec('PRAGMA foreign_keys=ON;BEGIN');for(const s of p.statements)db.prepare(s.sql).run(...s.params);db.exec('COMMIT');
 assert.equal(db.prepare('SELECT count(*) n FROM d1_auth_legacy_proofs').get().n,3);assert.equal(db.prepare('SELECT status FROM d1_auth_legacy_snapshots').get().status,'pending');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.throws(()=>db.prepare(p.statements[0].sql).run(...p.statements[0].params));
 await h.verifyLegacySessionSnapshot(p,{first:async(q,args)=>db.prepare(q).get(...args)??null});
 db.prepare("UPDATE d1_auth_legacy_proofs SET role='current' WHERE source_token_id='1'").run();await assert.rejects(h.verifyLegacySessionSnapshot(p,{first:async(q,args)=>db.prepare(q).get(...args)??null}),/Legacy snapshot verification failed/);
});
test('a session with no unrevoked token remains closed and never receives a current proof',async()=>{
 const f=fixture();f.source.tokens[2].revoked=true;const p=await h.prepareLegacySessionSnapshot(f.source,f.options);assert.equal(p.summary.closedSessions,1);assert.equal(p.summary.currentTokens,0);assert(p.proofs.every(r=>r.role==='revoked'));assert.equal(p.sessions[0].current_proof_hash,null);
});
test('ambiguous, cross-user, missing-parent and invalid chronology graphs are rejected completely',async()=>{
 const mutations=[f=>f.source.tokens.push({...f.source.tokens[0]}),f=>f.source.tokens[2].revoked=null,f=>f.source.tokens[1].revoked=false,f=>f.source.tokens[2].parent='dddddddddddd',f=>f.source.tokens[1].parent='cccccccccccc',f=>f.source.tokens[1].userId=id(9),f=>f.source.tokens[0].sessionId=id(9),f=>f.source.tokens[0].token='not-a-v1-token',f=>f.source.sessions.push({...f.source.sessions[0]}),f=>f.source.userIds=[],f=>f.source.tokens[0].createdAt='2026-10-14',f=>f.source.tokens[0].updatedAt='2026-10-13T00:00:00Z'];
 for(const mutate of mutations){const f=fixture();mutate(f);await assert.rejects(h.prepareLegacySessionSnapshot(f.source,f.options),/Legacy snapshot unavailable/)}
});
test('unimplemented assurance, refresh v2, expiry, recovery and OAuth-scoped sessions fail closed',async()=>{
 for(const patch of [{aal:'aal2'},{factorId:id(90)},{notAfter:stamp},{refreshTokenHmacKey:'withheld'},{refreshTokenCounter:0},{oauthClientId:id(90)},{tag:'custom'},{scopes:'openid'},{amr:[]},{amr:[{method:'recovery',createdAt:stamp,updatedAt:stamp}]}]){
  const f=fixture();Object.assign(f.source.sessions[0],patch);await assert.rejects(h.prepareLegacySessionSnapshot(f.source,f.options),/Legacy snapshot unavailable/)
 }
});
test('timezone-free refreshed_at is rejected until the PostgreSQL exporter explicitly normalizes UTC',async()=>{
 const f=fixture();f.source.sessions[0].refreshedAt='2026-10-14T12:01:00.123456';await assert.rejects(h.prepareLegacySessionSnapshot(f.source,f.options),/Legacy snapshot unavailable/);
 f.source.sessions[0].refreshedAt+='Z';const p=await h.prepareLegacySessionSnapshot(f.source,f.options);assert.equal(p.sessions[0].refreshed_at,'2026-10-14T12:01:00.123456Z');
});
test('invalid calendar rollovers and non-string bearer fields cannot become valid source evidence',async()=>{
 for(const stamp of ['2026-02-30T12:00:00Z','2026-10-14T24:00:00Z','2026-10-14T12:00:00+07:00']){const f=fixture();f.source.tokens[0].updatedAt=stamp;await assert.rejects(h.prepareLegacySessionSnapshot(f.source,f.options),/Legacy snapshot unavailable/)}
 const f=fixture();f.source.tokens[0].token=123456789012;await assert.rejects(h.prepareLegacySessionSnapshot(f.source,f.options),/Legacy snapshot unavailable/);
});
test('verifier requires every row and exact cardinality and cannot publish readiness',async t=>{
 const f=fixture(),p=await h.prepareLegacySessionSnapshot(f.source,f.options),db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec(readFileSync('scripts/d1-auth-legacy-snapshot.sql','utf8'));for(const s of p.statements)db.prepare(s.sql).run(...s.params);
 const api={first:async(q,args)=>db.prepare(q).get(...args)??null};await h.verifyLegacySessionSnapshot(p,api);assert.equal(db.prepare('SELECT status FROM d1_auth_legacy_snapshots').get().status,'pending');
 db.prepare("DELETE FROM d1_auth_legacy_proofs WHERE source_token_id='1'").run();await assert.rejects(h.verifyLegacySessionSnapshot(p,api),/Legacy snapshot verification failed/);
});
