import test from 'node:test';
import assert from 'node:assert/strict';
import {postgresTimestamp,authUserFromTextRow,authIdentityFromTextRow} from '../scripts/probe-sealed-auth-native.mjs';

test('PostgreSQL text timestamps keep microsecond revision and explicit offsets',()=>{
  assert.equal(postgresTimestamp('2026-10-18 11:32:10.640639+00'),'2026-10-18T11:32:10.640639+00:00');
  assert.equal(postgresTimestamp('2026-10-18 18:32:10+07'),'2026-10-18T18:32:10+07:00');
  assert.equal(postgresTimestamp(null),null);
  for(const value of ['2026-10-18 11:30:00','infinity','2026-10-18','2026-02-30 12:00:00+00','2026-10-18 24:00:00+00']) assert.throws(()=>postgresTimestamp(value),/UNAVAILABLE/);
});
test('provider linkage retains subject/user UUID rather than linking by email',()=>{
  const doc={id:'identity-fixture',user_id:'original-user-fixture',provider:'google',provider_id:'verified-subject-fixture',email:'changed@example.invalid',identity_data:'{"sub":"verified-subject-fixture"}',last_sign_in_at:null,created_at:'2026-10-18 11:30:00+00',updated_at:'2026-10-18 11:30:00.123456+00'};
  const result=authIdentityFromTextRow(Object.keys(doc).map(n=>({n})),Object.values(doc));
  assert.equal(result.userId,doc.user_id);assert.equal(result.providerId,doc.provider_id);assert.equal(result.email,doc.email);assert.equal(result.lastSignInAt,null);
});
test('account adapter preserves UUID/status/passwordless, not role from user metadata',()=>{
  const doc={id:'fixture-original-uuid',email:'fixture@example.invalid',encrypted_password:'',email_confirmed_at:null,banned_until:null,deleted_at:null,
    is_anonymous:'false',raw_user_meta_data:'{"role":"owner","must_change_password":true}',raw_app_meta_data:'{}',created_at:'2026-10-18 11:30:00+00',updated_at:'2026-10-18 11:30:00.123456+00'};
  const result=authUserFromTextRow(Object.keys(doc).map(n=>({n})),Object.values(doc));
  assert.equal(result.id,doc.id);assert.equal(result.encryptedPassword,null);assert.equal(result.isAnonymous,false);
  assert.equal(result.userMetadata.must_change_password,true);assert.equal(result.appMetadata.admin_role,undefined);
  assert.ok(result.updatedAt.includes('.123456'));
});
