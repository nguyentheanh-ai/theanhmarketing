import test from 'node:test';
import assert from 'node:assert/strict';
import {sealSourceSnapshot} from '../scripts/sealed-source-snapshot.mjs';
import {bAuthorizationProjection,probeBAuthz} from '../scripts/probe-sealed-b-authorization.mjs';
const master='fixture-key-not-a-production-secret-1234567890';
function archive(){
  const user={id:'00000000-0000-4000-8000-000000000001',email:'fixture@example.invalid',encrypted_password:null,
    email_confirmed_at:null,banned_until:null,deleted_at:null,is_anonymous:'false',raw_user_meta_data:'{"role":"admin"}',raw_app_meta_data:'{}',created_at:'2026-10-18 11:30:00+00',updated_at:'2026-10-18 11:30:00+00'};
  const profile={id:user.id,email:user.email,role:'student',status:'inactive',created_at:user.created_at,updated_at:user.updated_at};
  const entries=[['auth','users',user],['public','profiles',profile]],catalog=[],tables={};
  for(const [s,t,row] of entries){catalog.push({s,t,pk:['id'],cols:Object.keys(row).map(n=>({n,ty:'text'}))});tables['b_'+s+'__'+t]={count:1,rows:[Object.values(row)]};}
  return sealSourceSnapshot(master,'b',{snapshot:'1:2:',capturedAt:'2026-10-18T11:30:00Z',catalog,tables});
}
test('B keeps profile role/status separate from Auth metadata and preserves UUID',()=>{
  const result=bAuthorizationProjection(master,archive());
  assert.equal(result.profiles[0][0],result.users[0][0]);
  assert.deepEqual(result.profiles[0].slice(2,4),['student','inactive']);
  assert.equal(result.users[0][2],null);
});
test('B refuses old snapshots before invoking authorization core',async()=>{
  const result=archive();result.manifest.header.capturedAt='2000-01-01T00:00:00Z';
  await assert.rejects(probeBAuthz({masterSecret:master,archive:result},{}),/SNAPSHOT_STALE/);
  const changed=archive();changed.records[0].envelope+='x';
  assert.throws(()=>bAuthorizationProjection(master,changed),/SEALED_SNAPSHOT_UNAVAILABLE/);
});
