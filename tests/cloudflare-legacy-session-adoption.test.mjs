import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {readFileSync} from 'node:fs';
import {h as auth,fixture as authFixture,uid,project,base} from './helpers/native-refresh-fixture.mjs';
const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-legacy-session-adoption";export * from "./lib/cloudflare/legacy-session-snapshot";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),stamp=new Date(base-1000).toISOString();
async function fixture(t,{certified=true,active=true,sourceMutator}={}){
 const f=await authFixture(t);for(const path of ['d1-data-authority.sql','d1-auth-legacy-snapshot.sql'])f.sql.exec(readFileSync('scripts/'+path,'utf8'));
 const authority={projectId:project,component:'auth',epoch:id(40),restoreFence:id(41),transitionId:id(42),sourceCutoffAt:stamp,manifestDigest:'1'.repeat(64),sourceFenceReceipt:'2'.repeat(64),approvalReceipt:'3'.repeat(64)};
 await auth.prepareAuthorityHandoff(f.db,authority,base);if(active)await auth.transitionAuthority(f.db,authority,{id:id(43),kind:'activate',transitionId:authority.transitionId},base);
 const options={projectId:project,snapshotId:id(20),keyId:'fixture-legacy',key:f.options.keys['test-key-1'],sourceEvidenceDigest:'4'.repeat(64),observedAt:new Date(base).toISOString()};
 const source={projectId:project,userIds:[uid],sessions:[{id:id(2),userId:uid,createdAt:stamp,updatedAt:stamp,refreshedAt:null,aal:'aal1',factorId:null,notAfter:null,tag:null,oauthClientId:null,scopes:null,refreshTokenHmacKey:null,refreshTokenCounter:null,amr:[{method:'password',createdAt:stamp,updatedAt:stamp}]}],tokens:[{id:'1',token:'aaaaaaaaaaaa',userId:uid,sessionId:id(2),revoked:true,parent:null,createdAt:stamp,updatedAt:stamp},{id:'2',token:'bbbbbbbbbbbb',userId:uid,sessionId:id(2),revoked:true,parent:'aaaaaaaaaaaa',createdAt:stamp,updatedAt:stamp},{id:'3',token:'cccccccccccc',userId:uid,sessionId:id(2),revoked:false,parent:'bbbbbbbbbbbb',createdAt:stamp,updatedAt:stamp}]};
 sourceMutator?.(source);const plan=await h.prepareLegacySessionSnapshot(source,options);await f.db.batch(plan.statements);
 const policy={...f.options,nativeAuthority:authority,legacySnapshot:options,expectedGraphDigest:plan.snapshot.graph_digest,bridgeAcceptUntil:base+86400000,rememberLogin:true,allowAttempt:async()=>true};
 // Fixture certification only. No production exporter/fence is represented.
 if(certified){f.sql.prepare("UPDATE d1_auth_legacy_snapshots SET source_kind='fenced-final',status='verified',source_cutoff_at=?,authority_context_hash=?").run(stamp,await h.legacyAdoptionAuthorityDigest(policy));f.sql.exec('UPDATE d1_auth_legacy_sessions SET native_session_version=1,account_source_digest=(SELECT source_digest FROM d1_auth_source_versions WHERE user_id=d1_auth_legacy_sessions.user_id)');}
 f.sql.exec("UPDATE d1_auth_sync_state SET status='pending'");return{...f,policy,source,plan};
}
test('restored/pending snapshot or unactivated native authority can never issue a session',async t=>{
 for(const opts of [{certified:false},{active:false}]){const f=await fixture(t,opts),n=f.sql.prepare('SELECT count(*) n FROM d1_auth_sessions').get().n;await assert.rejects(h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy));assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_sessions').get().n,n);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_legacy_adoptions').get().n,0)}
});
test('current and direct-parent proofs concurrently adopt one original UUID and one native family',async t=>{
 const f=await fixture(t),[a,b]=await Promise.all(['cccccccccccc','bbbbbbbbbbbb'].map(proof=>h.adoptLegacyD1Session(f.db,proof,f.policy)));assert(a&&b);assert.equal(a.user.id,uid);assert.deepEqual(a,b);assert.equal(a.familyId,id(2));assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_refresh_families').get().n,1);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_legacy_adoptions').get().n,1);assert.equal((await auth.getD1AuthSession(f.db,a.accessToken,f.policy)).user.id,uid);
});
test('retry after a lost bootstrap commit response recovers the same redemption instead of creating another family',async t=>{
 const f=await fixture(t),batch=f.db.batch;let lose=true;f.db.batch=async ss=>{const result=await batch(ss);if(lose){lose=false;throw Error('synthetic lost commit')}return result};await assert.rejects(h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy));const a=await h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy);assert(a);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_legacy_adoptions').get().n,1);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_refresh_families').get().n,1);
});
test('replay window ends without resurrecting a per-device logout or forcing other sessions to close',async t=>{
 const f=await fixture(t),a=await h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy);assert(a);await auth.revokeD1RefreshFamily(f.db,a.accessToken,f.policy);assert.equal(await h.adoptLegacyD1Session(f.db,'bbbbbbbbbbbb',f.policy),null);assert.equal(await h.adoptLegacyD1Session(f.db,'cccccccccccc',{...f.policy,now:base+120001}),null);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_refresh_families').get().n,1);
});
test('global logout invalidates all imported sessions through the account version, including unredeemed ones',async t=>{
 const f=await fixture(t),a=await h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy);assert(a);await auth.revokeAllD1RefreshFamilies(f.db,a.accessToken,f.policy);assert.equal(await h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy),null);assert.equal(f.sql.prepare('SELECT session_version FROM d1_auth_accounts').get().session_version,2);
});
test('known older ancestor within source reuse grace works; later replay tombstones the family and revokes native leases',async t=>{
 const f=await fixture(t),a=await h.adoptLegacyD1Session(f.db,'aaaaaaaaaaaa',f.policy);assert(a);assert.equal(await h.adoptLegacyD1Session(f.db,'aaaaaaaaaaaa',{...f.policy,now:base+10001}),null);assert.equal(await auth.getD1AuthSession(f.db,a.accessToken,{...f.policy,now:base+10001}),null);assert.equal(await h.adoptLegacyD1Session(f.db,'cccccccccccc',{...f.policy,now:base+10001}),null);assert(f.sql.prepare('SELECT revoked_at FROM d1_auth_legacy_adoptions').get().revoked_at);
});
test('unknown proof cannot revoke a valid family; old known replay before adoption prevents future adoption',async t=>{
 const f=await fixture(t);assert.equal(await h.adoptLegacyD1Session(f.db,'dddddddddddd',f.policy),null);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_legacy_adoptions').get().n,0);assert.equal(await h.adoptLegacyD1Session(f.db,'aaaaaaaaaaaa',{...f.policy,now:base+10001}),null);assert.equal(await h.adoptLegacyD1Session(f.db,'cccccccccccc',{...f.policy,now:base+10001}),null);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_refresh_families').get().n,0);
});
test('source digest drift, revoked user, cohort, bridge deadline and restore-fence mismatch fail closed',async t=>{
 for(const change of [f=>f.sql.exec("UPDATE d1_auth_accounts SET banned_until='2099-01-01T00:00:00Z'"),f=>f.sql.exec('UPDATE d1_auth_accounts SET deleted_at=updated_at'),f=>f.sql.exec("UPDATE d1_auth_source_versions SET source_digest='ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'"),f=>f.policy.allowedUserIds=[],f=>f.policy.now=base+86400001]){const f=await fixture(t);change(f);assert.equal(await h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy),null);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_legacy_adoptions').get().n,0)}
 const f=await fixture(t);await assert.rejects(h.adoptLegacyD1Session(f.db,'cccccccccccc',{...f.policy,nativeAuthority:{...f.policy.nativeAuthority,restoreFence:id(99)}}));
});
test('freeze during bootstrap transaction rolls back both redemption and new native lease',async t=>{
 const f=await fixture(t),n=f.sql.prepare('SELECT count(*) n FROM d1_auth_sessions').get().n;f.sql.exec("CREATE TRIGGER synthetic_freeze AFTER INSERT ON d1_auth_legacy_adoptions BEGIN UPDATE d1_data_authority SET phase='fenced',frozen_at=activated_at; END;");await assert.rejects(h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy));assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_legacy_adoptions').get().n,0);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_sessions').get().n,n);assert.equal(f.sql.prepare('SELECT phase FROM d1_data_authority').get().phase,'native');
});
test('rate denial and malformed proof do not read or write account state',async t=>{
 const f=await fixture(t);const db={first:async()=>assert.fail('no DB'),batch:async()=>assert.fail('no DB')};assert.equal(await h.adoptLegacyD1Session(db,'cccccccccccc',{...f.policy,allowAttempt:async()=>false}),null);assert.equal(await h.adoptLegacyD1Session(db,'bad',f.policy),null);
});
test('one microsecond beyond legacy reuse grace cannot be rounded back into validity by SQLite',async t=>{
 const f=await fixture(t,{sourceMutator:s=>{s.sessions[0].createdAt=new Date(base-3000).toISOString();s.tokens[0].createdAt=new Date(base-2000).toISOString();s.tokens[0].updatedAt=new Date(base-1001).toISOString().replace('.999Z','.999999Z')}});
 assert.equal(await h.adoptLegacyD1Session(f.db,'aaaaaaaaaaaa',{...f.policy,now:base+9000}),null);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_refresh_families').get().n,0);
});
test('a source token changed one microsecond after the pinned cutoff is not eligible',async t=>{
 const f=await fixture(t,{sourceMutator:s=>{s.tokens[2].updatedAt=stamp.replace('.000Z','.000001Z')}});assert.equal(await h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy),null);
});
test('losing the family-attach response recovers once, and a wrong project cannot redeem the same source proof',async t=>{
 const f=await fixture(t),batch=f.db.batch;let calls=0;f.db.batch=async ss=>{const result=await batch(ss);if(++calls===2)throw Error('synthetic lost family response');return result};await assert.rejects(h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy));const a=await h.adoptLegacyD1Session(f.db,'bbbbbbbbbbbb',f.policy);assert(a);assert.equal(f.sql.prepare('SELECT count(*) n FROM d1_auth_refresh_families').get().n,1);
 const other='pppiqhkectojxbmhqcnx';await assert.rejects(h.adoptLegacyD1Session(f.db,'cccccccccccc',{...f.policy,projectId:other,nativeAuthority:{...f.policy.nativeAuthority,projectId:other},legacySnapshot:{...f.policy.legacySnapshot,projectId:other}}));
});
test('failed ancestor replay revocation rolls back the tombstone and all lease changes',async t=>{
 const f=await fixture(t),a=await h.adoptLegacyD1Session(f.db,'cccccccccccc',f.policy);assert(a);f.sql.exec("CREATE TRIGGER deny_revoke BEFORE UPDATE OF revoked_at ON d1_auth_refresh_families BEGIN SELECT RAISE(IGNORE); END;");await assert.rejects(h.adoptLegacyD1Session(f.db,'aaaaaaaaaaaa',{...f.policy,now:base+10001}));assert.equal(f.sql.prepare('SELECT revoked_at FROM d1_auth_legacy_adoptions').get().revoked_at,null);assert(await auth.getD1AuthSession(f.db,a.accessToken,{...f.policy,now:base+10001}));
});
