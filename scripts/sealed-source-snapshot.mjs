// Local archive utility. Never imported by a Worker or given a network API.
// Master secret is the EXISTING random encrypted-archive key, not a password
// typed by a student. Purpose/project-separated HKDF keys never leave process.
import {createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const format = 'tam-sealed-source-snapshot-v1';
const projects = {a: 'vsxxgdzwtscuxcmjfckt', b: 'pppiqhkectojxbmhqcnx'};
const id = /^[A-Za-z_][A-Za-z0-9_]*$/;
const hex = /^[a-f0-9]{64}$/;
function fail() { throw Error('SEALED_SNAPSHOT_UNAVAILABLE'); }
export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  fail();
}
const sha = value => createHash('sha256').update(value).digest('hex');
const mac = (key, value) => createHmac('sha256', key).update(canonical(value)).digest('hex');
function same(a, b) {
  return typeof a === 'string' && typeof b === 'string' && hex.test(a) && hex.test(b) && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
function keys(masterSecret, project) {
  if (typeof masterSecret !== 'string' || masterSecret.length < 32 || !Object.hasOwn(projects, project)) fail();
  const salt = createHash('sha256').update(format).digest();
  const derive = purpose => Buffer.from(hkdfSync('sha256', Buffer.from(masterSecret), salt, Buffer.from(format + ':' + projects[project] + ':' + purpose), 32));
  return {encryption: derive('encryption'), identity: derive('identity'), value: derive('value'), manifest: derive('manifest')};
}
function validateHeader(header) {
  if (!header || header.format !== format || !Object.hasOwn(projects, header.project) || header.sourceProject !== projects[header.project] || !/^\d+:\d+:[\d,]*$/.test(header.snapshot)
      || !Number.isFinite(Date.parse(header.capturedAt)) || !Array.isArray(header.catalog) || !header.catalog.length) fail();
  const scope = header.project === 'a' ? ['public', 'crm_v2', 'auth', 'storage'] : ['public', 'auth', 'storage'];
  const names = new Set();
  for (const table of header.catalog) {
    if (!scope.includes(table.s) || typeof table.t !== 'string' || !id.test(table.t) || !Array.isArray(table.cols) || !table.cols.length || !Array.isArray(table.pk)) fail();
    const name = table.s + '.' + table.t;
    if (names.has(name)) fail(); names.add(name);
    const cols = table.cols.map(c => c.n);
    if (new Set(cols).size !== cols.length || cols.some(c => typeof c !== 'string' || !id.test(c)) || table.cols.some(c => typeof c.ty !== 'string')
        || new Set(table.pk).size !== table.pk.length || table.pk.some(c => !cols.includes(c))) fail();
  }
}
function tableName(project, table) { return project + '_' + table.s + '__' + table.t; }
function valuesValid(values, table) {
  if (!Array.isArray(values) || values.length !== table.cols.length || values.some(v => v !== null && typeof v !== 'string')) fail();
}
function rowIdentity(key, table, values, occurrence) {
  const keyValues = table.pk.map(name => values[table.cols.findIndex(c => c.n === name)]);
  if (keyValues.some(v => v === null)) fail();
  return mac(key, [table.s, table.t, table.pk.length ? 'primary-key' : 'multiset-row', table.pk.length ? keyValues : values])
    + (table.pk.length ? '' : ':' + occurrence);
}
function aad(header, table, rowId) {
  return Buffer.from(canonical({format, sourceProject: header.sourceProject, snapshot: header.snapshot,
    capturedAt: header.capturedAt, catalogHash: sha(canonical(table)), table: tableName(header.project, table), rowId}));
}
function sealRow(key, header, table, rowId, values) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad(header, table, rowId));
  const content = Buffer.concat([cipher.update(canonical(values), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), content.toString('base64url')].join('.');
}
function openRow(key, header, table, rowId, envelope) {
  try {
    const parts = envelope.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1' || parts.slice(1).some(p => !/^[A-Za-z0-9_-]+$/.test(p))) fail();
    const iv = Buffer.from(parts[1], 'base64url'), tag = Buffer.from(parts[2], 'base64url');
    if (iv.length !== 12 || tag.length !== 16) fail();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad(header, table, rowId)); decipher.setAuthTag(tag);
    const value = JSON.parse(Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8'));
    valuesValid(value, table);
    return value;
  } catch { fail(); }
}
const multisetDigest = hashes => sha(hashes.sort().join(''));

export function sealSourceSnapshot(masterSecret, project, payload) {
  const header = {format, project, sourceProject: projects[project], snapshot: payload.snapshot, capturedAt: payload.capturedAt, catalog: payload.catalog};
  validateHeader(header);
  const key = keys(masterSecret, project), records = [], tables = [];
  if (!payload.tables || Object.keys(payload.tables).length !== header.catalog.length) fail();
  for (const table of header.catalog) {
    const name = tableName(project, table), item = payload.tables[name];
    if (!item || !Number.isSafeInteger(item.count) || item.count < 0 || !Array.isArray(item.rows) || item.rows.length !== item.count) fail();
    const seen = new Set(), duplicates = new Map(), hashes = [];
    for (const values of item.rows) {
      valuesValid(values, table);
      const rowMac = mac(key.value, [table.s, table.t, sha(canonical(table)), values]);
      const occurrence = duplicates.get(rowMac) ?? 0; duplicates.set(rowMac, occurrence + 1);
      const rowId = rowIdentity(key.identity, table, values, occurrence);
      if (seen.has(rowId)) fail(); seen.add(rowId);
      records.push({table: name, rowId, valueMac: rowMac, envelope: sealRow(key.encryption, header, table, rowId, values)});
      hashes.push(rowMac);
    }
    tables.push({table: name, rows: item.count, stablePrimaryKey: table.pk.length > 0, digest: multisetDigest(hashes)});
  }
  const manifest = {header, tables, totalRows: records.length, snapshotConsistency: 'single-postgresql-statement',
    fieldsRedacted: false, readyForCutover: false};
  return {manifest, manifestMac: mac(key.manifest, manifest), records};
}

export function verifySourceSnapshot(masterSecret, expectedProject, archive) {
  try {
    const {manifest, manifestMac, records} = archive;
    validateHeader(manifest.header);
    if (manifest.header.project !== expectedProject || !Array.isArray(records) || records.length !== manifest.totalRows
        || manifest.tables.length !== manifest.header.catalog.length) fail();
    const key = keys(masterSecret, expectedProject);
    if (!same(manifestMac, mac(key.manifest, manifest))) fail();
    const seen = new Set(), hashes = new Map(), duplicates = new Map(), occurrences = new Map();
    const tables = new Map(manifest.header.catalog.map(t => [tableName(expectedProject, t), t]));
    for (const record of records) {
      const table = tables.get(record.table);
      if (!table || typeof record.rowId !== 'string' || seen.has(record.table + ':' + record.rowId)) fail();
      seen.add(record.table + ':' + record.rowId);
      const values = openRow(key.encryption, manifest.header, table, record.rowId, record.envelope);
      const rowMac = mac(key.value, [table.s, table.t, sha(canonical(table)), values]);
      if (!same(record.valueMac, rowMac)) fail();
      const duplicateKey = record.table + ':' + rowMac, occurrence = duplicates.get(duplicateKey) ?? 0;
      duplicates.set(duplicateKey, occurrence + 1);
      // For keyless tables, the authenticated occurrence suffix need not follow
      // storage iteration order, but must be unique and cover 0..count-1 below.
      if (table.pk.length) {
        if (record.rowId !== rowIdentity(key.identity, table, values, occurrence)) fail();
      } else {
        const prefix = rowIdentity(key.identity, table, values, 0).split(':')[0] + ':';
        if (!record.rowId.startsWith(prefix) || !/^\d+$/.test(record.rowId.slice(prefix.length))) fail();
        const index = Number(record.rowId.slice(prefix.length));
        if (!Number.isSafeInteger(index) || index < 0) fail();
        if (!occurrences.has(duplicateKey)) occurrences.set(duplicateKey, new Set());
        if (occurrences.get(duplicateKey).has(index)) fail();
        occurrences.get(duplicateKey).add(index);
      }
      if (!hashes.has(record.table)) hashes.set(record.table, []);
      hashes.get(record.table).push(rowMac);
    }
    for (const indices of occurrences.values()) for (let index = 0; index < indices.size; index++) if (!indices.has(index)) fail();
    for (const table of manifest.tables) {
      const values = hashes.get(table.table) ?? [];
      if (!tables.has(table.table) || values.length !== table.rows || !same(multisetDigest(values), table.digest)) fail();
    }
    return {ok: true, tables: tables.size, rows: records.length, project: expectedProject, fieldsRedacted: false,
      authTables: manifest.header.catalog.filter(t => t.s === 'auth').length,
      storageMetadataTables: manifest.header.catalog.filter(t => t.s === 'storage').length, readyForCutover: false};
  } catch { fail(); }
}

// Explicit in-process migration boundary. Verification completes before the
// first callback, and no CLI operation ever emits decrypted rows. Consumers
// must retain data in RAM or re-seal it before writing an isolated artifact.
export function visitVerifiedSourceRows(masterSecret, expectedProject, archive, visitor) {
  verifySourceSnapshot(masterSecret, expectedProject, archive);
  const key = keys(masterSecret, expectedProject), header = archive.manifest.header;
  const tables = new Map(header.catalog.map(t => [tableName(expectedProject, t), t]));
  for (const record of archive.records) {
    const table = tables.get(record.table);
    visitor({schema: table.s, table: table.t, columns: table.cols, primaryKey: table.pk,
      values: openRow(key.encryption, header, table, record.rowId, record.envelope)});
  }
}

export function compareSealedSourceSnapshots(masterSecret, project, before, after) {
  verifySourceSnapshot(masterSecret, project, before);
  verifySourceSnapshot(masterSecret, project, after);
  if (canonical(before.manifest.header.catalog) !== canonical(after.manifest.header.catalog)
      || Date.parse(after.manifest.header.capturedAt) < Date.parse(before.manifest.header.capturedAt)) fail();
  const out = [];
  for (const table of before.manifest.tables) {
    const prior = new Map(before.records.filter(r => r.table === table.table).map(r => [r.rowId, r.valueMac]));
    const next = new Map(after.records.filter(r => r.table === table.table).map(r => [r.rowId, r.valueMac]));
    let inserted = 0, updated = 0, removed = 0;
    for (const [id, value] of next) {if (!prior.has(id)) inserted++; else if (prior.get(id) !== value) updated++;}
    for (const id of prior.keys()) if (!next.has(id)) removed++;
    out.push({table: table.table, beforeRows: prior.size, afterRows: next.size, inserted, updated, removed,
      stablePrimaryKey: table.stablePrimaryKey,
      changesCanBeAppliedToNativeRuntime: false});
  }
  return {project, beforeAt: before.manifest.header.capturedAt, afterAt: after.manifest.header.capturedAt,
    evidence: 'VERIFIED_SEALED_SOURCE_SNAPSHOT_DIFFERENCE', tables: out,
    schemaMatched: true, fieldsRedacted: false, sourceWriterFenced: false, readyForCutover: false};
}

// Parent captures both streams. Raw source input never reaches stdout; verify
// emits only aggregate results. No secret is accepted via argv or environment.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let text = '';
    for await (const chunk of process.stdin) { text += chunk; if (text.length > 512 * 1024 * 1024) fail(); }
    const input = JSON.parse(text);
    const result = input.operation === 'seal' ? sealSourceSnapshot(input.masterSecret, input.project, input.payload)
      : input.operation === 'verify' ? verifySourceSnapshot(input.masterSecret, input.project, input.archive)
      : input.operation === 'compare' ? compareSealedSourceSnapshots(input.masterSecret, input.project, input.before, input.after) : fail();
    process.stdout.write(JSON.stringify(result));
  } catch { process.stderr.write('SEALED_SNAPSHOT_UNAVAILABLE\n'); process.exitCode = 2; }
}
