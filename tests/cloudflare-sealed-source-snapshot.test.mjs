import test from 'node:test';
import assert from 'node:assert/strict';
import {sealSourceSnapshot, verifySourceSnapshot, visitVerifiedSourceRows, compareSealedSourceSnapshots} from '../scripts/sealed-source-snapshot.mjs';

const master = 'fixture-only-archive-key-never-production-123456789';
function fixture(project = 'a', pk = ['id']) {
  const table = {s: 'auth', t: 'users', pk, cols: [{n: 'id', ty: 'uuid'}, {n: 'encrypted_password', ty: 'character varying'}, {n: 'role', ty: 'text'}]};
  return {snapshot: '123:124:', capturedAt: '2026-10-18T11:30:00Z', catalog: [table],
    tables: {[project + '_auth__users']: {count: 2, rows: [['id-user-one', '$2b$hash-fixture-one', 'student'], ['id-user-two', '$2b$hash-fixture-two', 'owner']]}}};
}

test('preserves all encrypted fields while output contains no raw account or hash', () => {
  const archive = sealSourceSnapshot(master, 'a', fixture());
  const text = JSON.stringify(archive);
  for (const privateValue of ['id-user-one', '$2b$hash-fixture-one', 'student', 'owner', master]) assert.ok(!text.includes(privateValue));
  assert.deepEqual(verifySourceSnapshot(master, 'a', archive), {ok: true, tables: 1, rows: 2, project: 'a', fieldsRedacted: false,
    authTables: 1, storageMetadataTables: 0, readyForCutover: false});
});

test('wrong archive key and cross-project substitution fail closed', () => {
  const archive = sealSourceSnapshot(master, 'a', fixture());
  assert.throws(() => verifySourceSnapshot(master + 'wrong', 'a', archive), /UNAVAILABLE/);
  assert.throws(() => verifySourceSnapshot(master, 'b', archive), /UNAVAILABLE/);
  const b = sealSourceSnapshot(master, 'b', fixture('b'));
  assert.notEqual(archive.records[0].rowId, b.records[0].rowId);
  assert.notEqual(archive.records[0].valueMac, b.records[0].valueMac);
});

test('ciphertext nonces are random, stable keyed value checksums survive row reorder', () => {
  const a = sealSourceSnapshot(master, 'a', fixture());
  const payload = fixture(); payload.tables.a_auth__users.rows.reverse();
  const b = sealSourceSnapshot(master, 'a', payload);
  assert.equal(a.manifest.tables[0].digest, b.manifest.tables[0].digest);
  assert.notEqual(a.records[0].envelope, b.records[1].envelope);
  assert.equal(a.records[0].valueMac, b.records[1].valueMac);
  b.records.reverse(); assert.equal(verifySourceSnapshot(master, 'a', b).ok, true);
});

test('edited headers, removed or duplicated rows, values and table digests cannot verify', () => {
  const original = sealSourceSnapshot(master, 'a', fixture());
  const changes = [
    a => {a.manifest.header.snapshot = '124:125:';},
    a => {a.manifest.header.catalog[0].pk = [];},
    a => {a.records.pop(); a.manifest.totalRows--; a.manifest.tables[0].rows--;},
    a => {a.records[1] = a.records[0];},
    a => {a.records[0].valueMac = '0'.repeat(64);},
    a => {a.manifest.tables[0].digest = '0'.repeat(64);},
    a => {a.records[0].envelope = a.records[1].envelope;},
    a => {const p=a.records[0].envelope.split('.'); p[2]=p[2][0]==='a'?'b'+p[2].slice(1):'a'+p[2].slice(1); a.records[0].envelope=p.join('.');},
  ];
  for (const change of changes) {const a=structuredClone(original); change(a); assert.throws(() => verifySourceSnapshot(master, 'a', a), /UNAVAILABLE/);}
});

test('primary keys reject null and duplicate; keyless bags preserve duplicate multiplicity', () => {
  for (const value of [null, 'id-user-two']) {
    const payload = fixture(); payload.tables.a_auth__users.rows[0][0] = value;
    assert.throws(() => sealSourceSnapshot(master, 'a', payload), /UNAVAILABLE/);
  }
  const payload = fixture('a', []); payload.tables.a_auth__users.rows[1] = payload.tables.a_auth__users.rows[0];
  const archive = sealSourceSnapshot(master, 'a', payload);
  archive.records.reverse(); assert.equal(verifySourceSnapshot(master, 'a', archive).rows, 2);
  assert.notEqual(archive.records[0].rowId, archive.records[1].rowId);
  assert.equal(archive.manifest.tables[0].stablePrimaryKey, false);
});

test('schema/count drift, foreign schema and untyped cells are rejected', () => {
  for (const edit of [p => p.tables.a_auth__users.count++, p => p.catalog[0].s='vault',
    p => p.tables.a_auth__users.rows[0][2]=1, p => p.catalog[0].pk=['missing'],
    p => p.catalog[0].cols[0].n=undefined]) {
    const payload=fixture(); edit(payload); assert.throws(() => sealSourceSnapshot(master,'a',payload), /UNAVAILABLE/);
  }
});

test('verified in-memory visitor preserves original fields and refuses partial tampered delivery', () => {
  const payload=fixture(), archive=sealSourceSnapshot(master,'a',payload), rows=[];
  visitVerifiedSourceRows(master,'a',archive, row=>rows.push(row.values));
  assert.deepEqual(rows,payload.tables.a_auth__users.rows);
  archive.records[1].envelope=archive.records[0].envelope;
  let calls=0; assert.throws(()=>visitVerifiedSourceRows(master,'a',archive,()=>calls++),/UNAVAILABLE/);
  assert.equal(calls,0);
});

test('two sealed snapshots detect real inserts updates deletes without exposing keys or values', () => {
  const before=sealSourceSnapshot(master,'a',fixture()), next=fixture();
  next.snapshot='124:125:'; next.capturedAt='2026-10-18T11:40:00Z';
  next.tables.a_auth__users.rows=[['id-user-one','$2b$changed-fixture','student'],['id-user-three','$2b$new-fixture','student']];
  const after=sealSourceSnapshot(master,'a',next), result=compareSealedSourceSnapshots(master,'a',before,after);
  assert.deepEqual(result.tables.map(({inserted,updated,removed})=>({inserted,updated,removed})),[{inserted:1,updated:1,removed:1}]);
  for(const secret of ['id-user-one','$2b$changed-fixture','id-user-three']) assert.ok(!JSON.stringify(result).includes(secret));
  assert.equal(result.readyForCutover,false);
  assert.throws(()=>compareSealedSourceSnapshots(master,'a',after,before),/UNAVAILABLE/);
});
