// Offline native Auth projection from a VERIFIED sealed archive. No HTTP route,
// no network, no files containing decrypted rows. SQLite is RAM-only.
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {visitVerifiedSourceRows} from './sealed-source-snapshot.mjs';
import {parseExactJson} from '../lib/cloudflare/precise-json.ts';

export function postgresTimestamp(value) {
  if (value === null) return null;
  if (typeof value !== 'string') throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
  const text = value.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T').replace(/([+-]\d{2})$/, '$1:00');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(text) || !Number.isFinite(Date.parse(text))) throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
  const [year,month,day,hour,minute,second]=text.slice(0,19).split(/[-T:]/).map(Number);
  const calendar=new Date(0);calendar.setUTCFullYear(year,month,0);
  if(month<1||month>12||day<1||day>calendar.getUTCDate()||hour>23||minute>59||second>59)throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
  return text;
}
function pgBoolean(value) {
  if (value === null || value === 'false') return false;
  if (value === 'true') return true;
  throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
}
function metadata(value) {
  if (value === null) return null;
  const doc = parseExactJson(value);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
  return doc;
}
export function authUserFromTextRow(columns, values) {
  const row = Object.fromEntries(columns.map((c, i) => [c.n, values[i]]));
  return {id: row.id, email: row.email, encryptedPassword: row.encrypted_password || null,
    emailConfirmedAt: postgresTimestamp(row.email_confirmed_at), bannedUntil: postgresTimestamp(row.banned_until),
    deletedAt: postgresTimestamp(row.deleted_at), isAnonymous: pgBoolean(row.is_anonymous),
    userMetadata: metadata(row.raw_user_meta_data), appMetadata: metadata(row.raw_app_meta_data),
    createdAt: postgresTimestamp(row.created_at), updatedAt: postgresTimestamp(row.updated_at)};
}
export function authIdentityFromTextRow(columns,values){
  const row=Object.fromEntries(columns.map((c,i)=>[c.n,values[i]]));
  return {id:row.id,userId:row.user_id,provider:row.provider,providerId:row.provider_id,email:row.email,
    identityData:metadata(row.identity_data),lastSignInAt:postgresTimestamp(row.last_sign_in_at),
    createdAt:postgresTimestamp(row.created_at),updatedAt:postgresTimestamp(row.updated_at)};
}

export async function probeNativeAuthSnapshot(input, loadCore) {
  const source = [],identities=[];
  visitVerifiedSourceRows(input.masterSecret, input.project, input.archive, row => {
    if (row.schema === 'auth' && row.table === 'users') source.push(authUserFromTextRow(row.columns, row.values));
    if (row.schema === 'auth' && row.table === 'identities') identities.push(authIdentityFromTextRow(row.columns,row.values));
  });
  if (!source.length) throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
  const core = await loadCore();
  const projectId = input.archive.manifest.header.sourceProject;
  // Mirrors only protected metadata + the default owner rules always present in
  // the existing A code. Extra production ENV owners are NOT assumed verified.
  // B authorization remains its independent public.profiles/membership model.
  const defaultOwners = new Set(core.getConfiguredOwnerEmails({}));
  const resolveRole = row => {
    if (input.project !== 'a') return null;
    const role = row.appMetadata?.admin_role;
    if (role === 'owner' || role === 'editor') return role;
    return defaultOwners.has(row.email?.trim().toLowerCase()) ? 'owner' : null;
  };
  const options = {projectId, credentialKey: input.credentialKey, resolveRole};
  const plan = await core.prepareD1AuthInitialImport(source, options);
  const sql = new DatabaseSync(':memory:');
  try {
    sql.exec(input.schemas.access); sql.exec(input.schemas.auth);sql.exec(input.schemas.identities);
    sql.exec('BEGIN');
    try {for (const s of plan.statements) sql.prepare(s.sql).run(...s.params); sql.exec('COMMIT');}
    catch {sql.exec('ROLLBACK'); throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');}
    for (const row of source) {
      const target = sql.prepare(`SELECT u.id,u.normalized_email,u.admin_role,a.*,v.source_revision,v.source_digest,v.source_project_id
        FROM d1_access_users u JOIN d1_auth_accounts a ON a.user_id=u.id JOIN d1_auth_source_versions v ON v.user_id=u.id WHERE u.id=?`).get(row.id);
      await core.verifyD1InitialAuthRow(row, target, options);
    }
    const identityPlan=core.prepareD1ProviderIdentityImport(identities,{projectId,userIds:source.map(u=>u.id)});
    sql.exec('BEGIN');try{for(const statement of identityPlan)sql.prepare(statement.sql).run(...statement.params);sql.exec('COMMIT');}
    catch{sql.exec('ROLLBACK');throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');}
    const columns=['id','source_project_id','user_id','provider','provider_id','email','identity_data','last_sign_in_at','created_at','updated_at'];
    for(const statement of identityPlan){const row=sql.prepare('SELECT * FROM d1_auth_provider_identities WHERE id=?').get(statement.params[0]);
      if(!row||columns.some((c,i)=>row[c]!==statement.params[i]))throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');}
    if(sql.prepare('SELECT count(*) n FROM d1_auth_provider_identities').get().n!==identities.length||sql.prepare('PRAGMA foreign_key_check').all().length)throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
    const providerIdentityCounts=Object.fromEntries(['email','google'].map(p=>[p,identities.filter(i=>i.provider===p).length]));
    const linkedGoogleUsers=new Set(identities.filter(i=>i.provider==='google').map(i=>i.userId));
    let qaLogin = false, qaUuidPreserved = false, wrongPasswordDenied = false, staleSnapshotDenied = false;
    if (input.qa) {
      const user = source.find(u => u.email?.trim().toLowerCase() === input.qa.email.trim().toLowerCase());
      if (!user || resolveRole(user) !== null || !user.encryptedPassword) throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
      // Deliberate replay at snapshot time, NOT a forged live freshness marker.
      // This RAM database is never mounted into a Worker or used for cutover.
      const at = Date.parse(input.archive.manifest.header.capturedAt), stamp = new Date(at).toISOString();
      sql.prepare('INSERT INTO d1_auth_sync_state(source_project_id,source_snapshot_at,last_verified_at,status) VALUES(?,?,?,?)')
        .run(projectId, stamp, stamp, 'verified');
      const db = {first: async (q, p) => sql.prepare(q).get(...p) ?? null,
        batch: async statements => {sql.exec('BEGIN'); try {const results=statements.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return results;}catch{sql.exec('ROLLBACK');throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');}}};
      const policy = {projectId, now: at, sessionTtlMs: 3600000, credentialKey: input.credentialKey,
        allowedUserIds: [user.id], allowAttempt: async () => true};
      const login = await core.authenticateD1Password(db, {email: input.qa.email, password: input.qa.password}, policy);
      qaLogin = Boolean(login); qaUuidPreserved = login?.user?.id === user.id;
      wrongPasswordDenied = await core.authenticateD1Password(db, {email: input.qa.email, password: input.qa.password + '-wrong-fixture'}, policy) === null;
      try {await core.getD1AuthSession(db, login?.token ?? '', {...policy, now: at + 300001});}
      catch (error) {staleSnapshotDenied = error?.message === 'Auth projection is not current and verified';}
      if (!qaLogin || !qaUuidPreserved || !wrongPasswordDenied || !staleSnapshotDenied) throw Error('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE');
    }
    return {project: input.project, users: source.length, passwordCredentials: plan.summary.passwordCredentials,
      passwordlessUsers: plan.summary.passwordlessUsers, allIdentityStatusMetadataCredentialRowsVerified: true,
      providerIdentityRowsReadBack:identities.length,providerIdentityCounts,
      passwordlessUsersWithGoogleLink:source.filter(u=>!u.encryptedPassword&&linkedGoogleUsers.has(u.id)).length,
      providerLoginTested:false,
      extraConfiguredOwnerRoleParityVerified: false, bProfileWorkspaceAuthorizationVerified: false,
      qaStatus: input.qa ? 'TESTED' : 'NOT_RUN_NO_VERIFIED_PASSWORD',
      qaLogin, qaUuidPreserved, wrongPasswordDenied, staleSnapshotDenied,
      clock: 'SNAPSHOT_TIME_OFFLINE_REPLAY', database: 'IN_MEMORY_SQLITE_ONLY',
      existingSessionsMigrated: false, productionWritten: false, remoteD1Written: false, readyForCutover: false};
  } finally {sql.close();}
}

async function main() {
  let text=''; for await (const chunk of process.stdin) text+=chunk;
  const input=JSON.parse(text), compilerRoot=path.resolve(input.compilerRoot);
  const {build}=createRequire(path.join(compilerRoot,'package.json'))('esbuild');
  const core=async()=>{
    const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-auth-import";export * from "./lib/cloudflare/d1-auth-import-verification";export * from "./lib/cloudflare/d1-auth-core";export * from "./lib/cloudflare/d1-auth-identities";export {getConfiguredOwnerEmails} from "./lib/admin/admin-emails";',resolveDir:process.cwd()},
      bundle:true,format:'esm',platform:'node',write:false,tsconfig:'tsconfig.json',nodePaths:[path.join(compilerRoot,'node_modules')]});
    return import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  };
  const result=await probeNativeAuthSnapshot(input,core);
  process.stdout.write(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await main();}catch{process.stderr.write('NATIVE_AUTH_SNAPSHOT_UNAVAILABLE\n');process.exitCode=2;}
}
