// Read a verified encrypted snapshot into RAM, exercise the EXISTING B backend.
// No endpoint, network, credential creation, or persistent plaintext output.
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {visitVerifiedSourceRows} from './sealed-source-snapshot.mjs';
import {authUserFromTextRow,postgresTimestamp} from './probe-sealed-auth-native.mjs';

export function bAuthorizationProjection(masterSecret, archive) {
  const data={users:[],profiles:[],workspaces:[],memberships:[]};
  visitVerifiedSourceRows(masterSecret,'b',archive,row=>{
    if(row.schema==='auth'&&row.table==='users') {
      const user=authUserFromTextRow(row.columns,row.values);
      if(typeof user.email!=='string'||!user.email.trim())throw Error('B_AUTHORIZATION_UNAVAILABLE');
      data.users.push([user.id,user.email.trim().toLowerCase(),null]);
    }
    if(row.schema!=='public')return;
    const value=Object.fromEntries(row.columns.map((c,i)=>[c.n,row.values[i]]));
    if(row.table==='profiles')data.profiles.push([value.id,value.email,value.role,value.status,postgresTimestamp(value.created_at),postgresTimestamp(value.updated_at)]);
    if(row.table==='ads_os_workspaces')data.workspaces.push([value.id,value.owner_id,value.name,postgresTimestamp(value.created_at)]);
    if(row.table==='ads_os_memberships')data.memberships.push([value.workspace_id,value.user_id,value.role]);
  });
  if(!data.users.length||!data.profiles.length)throw Error('B_AUTHORIZATION_UNAVAILABLE');
  return data;
}
export async function probeBAuthz(input,core) {
  const stamp=input.archive.manifest.header.capturedAt;
  const now=Date.now();
  // Do not invent a new verification timestamp for an old source snapshot.
  if(!Number.isFinite(Date.parse(stamp))||now-Date.parse(stamp)>300000||Date.parse(stamp)>now)throw Error('B_AUTHORIZATION_SNAPSHOT_STALE');
  const data=bAuthorizationProjection(input.masterSecret,input.archive),sql=new DatabaseSync(':memory:');
  let sessions=0,memberships=0,crossDenials=0,inactiveDenials=0;
  try {
    sql.exec(input.schema);sql.exec('BEGIN');
    try {
      for(const [name,rows] of [['d1_access_users',data.users],['d1_b_profiles',data.profiles],['d1_b_workspaces',data.workspaces],['d1_b_memberships',data.memberships]]) {
        for(const row of rows)sql.prepare(`INSERT INTO ${name} VALUES(${row.map(()=>'?').join(',')})`).run(...row);
        if(sql.prepare(`SELECT count(*) n FROM ${name}`).get().n!==rows.length)throw Error();
        // Exact source-to-target row readback, not only counts or HTTP status.
        const actual=sql.prepare(`SELECT * FROM ${name}`).all().map(r=>JSON.stringify(Object.values(r))).sort();
        const expected=rows.map(r=>JSON.stringify(r)).sort();
        if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error();
      }
      sql.prepare('INSERT INTO d1_b_authz_sync_state VALUES(?,?,?,?)').run('pppiqhkectojxbmhqcnx',stamp,stamp,'verified');
      if(sql.prepare('PRAGMA foreign_key_check').all().length)throw Error();
      sql.exec('COMMIT');
    }catch{sql.exec('ROLLBACK');throw Error('B_AUTHORIZATION_PROJECTION_REJECTED');}
    const db={first:async(q,p)=>sql.prepare(q).get(...p)??null,
      batch:async statements=>{sql.exec('BEGIN');try{const result=statements.map(s=>({results:sql.prepare(s.sql).all(...s.params)}));sql.exec('COMMIT');return result;}catch{sql.exec('ROLLBACK');throw Error('B_AUTHORIZATION_TRANSACTION_REJECTED');}}};
    for(const [id,email,role,status] of data.profiles){
      const session={userId:id,email:'stale@example.invalid',role:role==='admin'?'student':'admin',expiresAt:new Date(now+3600000).toISOString()};
      const verified=await core.readD1BPortalSession(db,session);
      if(status!=='active'){if(verified!==null)throw Error('B_AUTHORIZATION_INACTIVE_ACCEPTED');inactiveDenials++;continue;}
      if(!verified||verified.userId!==id||verified.email!==email.trim().toLowerCase()||verified.role!==role)throw Error('B_AUTHORIZATION_PROFILE_MISMATCH');
      sessions++;
      for(const [wid,uid,memberRole] of data.memberships.filter(m=>m[1]===id)){
        const result=await core.resolveD1BWorkspace(db,session,wid);
        const space=data.workspaces.find(w=>w[0]===wid);
        if(result.id!==wid||result.userId!==uid||result.role!==memberRole||result.name!==space?.[2])throw Error('B_AUTHORIZATION_MEMBERSHIP_MISMATCH');
        memberships++;
      }
      const other=data.workspaces.find(w=>!data.memberships.some(m=>m[0]===w[0]&&m[1]===id));
      if(other){let denied=false;try{await core.resolveD1BWorkspace(db,session,other[0]);}catch(e){denied=e instanceof core.D1BWorkspaceDeniedError;}
        if(!denied)throw Error('B_AUTHORIZATION_CROSS_WORKSPACE_ACCEPTED');crossDenials++;}
    }
    return {project:'b',database:'IN_MEMORY_SQLITE_ONLY',users:data.users.length,profiles:data.profiles.length,
      workspaces:data.workspaces.length,memberships:data.memberships.length,allRowsReadBack:true,
      activeProfilesChecked:sessions,membershipsChecked:memberships,crossWorkspaceDenials:crossDenials,inactiveProfileDenials:inactiveDenials,
      staleCookieRolesRevalidated:true,authCryptographicSessionValidationTested:false,sourceSnapshotAt:stamp,
      productionWritten:false,remoteD1Written:false,readyForCutover:false};
  }finally{sql.close();}
}
async function main(){
  let text='';for await(const part of process.stdin)text+=part;
  const input=JSON.parse(text),root=path.resolve(input.bSourceRoot);
  const {build}=createRequire(path.join(path.resolve(input.compilerRoot),'package.json'))('esbuild');
  const bundle=await build({stdin:{contents:'export * from "./src/lib/cloudflare/d1-b-authorization";',resolveDir:root},bundle:true,platform:'node',format:'esm',write:false,tsconfig:path.join(root,'tsconfig.json'),nodePaths:[path.join(root,'node_modules')]});
  const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  process.stdout.write(JSON.stringify(await probeBAuthz(input,core)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await main();}catch(e){const allowed=['B_AUTHORIZATION_SNAPSHOT_STALE','B_AUTHORIZATION_PROJECTION_REJECTED','B_AUTHORIZATION_INACTIVE_ACCEPTED','B_AUTHORIZATION_PROFILE_MISMATCH','B_AUTHORIZATION_MEMBERSHIP_MISMATCH','B_AUTHORIZATION_CROSS_WORKSPACE_ACCEPTED'];
    process.stderr.write((allowed.includes(e?.message)?e.message:'B_AUTHORIZATION_UNAVAILABLE')+'\n');process.exitCode=2;}
}
