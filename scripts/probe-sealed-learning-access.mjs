// Offline rights/progress projection across ALL source subjects. This does not
// authenticate a browser or grant access; real request entry must verify Auth.
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {visitVerifiedSourceRows} from './sealed-source-snapshot.mjs';
import {postgresRowJson} from './probe-sealed-orders.mjs';
import {authUserFromTextRow} from './probe-sealed-auth-native.mjs';
import {assembleCourseDocuments} from './probe-sealed-courses.mjs';
import {parseExactJson} from '../lib/cloudflare/precise-json.ts';

const fields={contacts:['id','email'],enrollments:['id','contact_id','user_id','course_id','course_slug','status','expires_at','updated_at','metadata','last_seen_at'],
  course_progress:['id','enrollment_id','lesson_id','status','progress_percent','completed_at','updated_at','metadata'],
  orders:['id','email','status','course_slug','course_title','payment_plan','order_items'],
  leads:['id','email','source','created_at','deleted_at']};
const normalize=value=>typeof value==='string'?value.trim().toLowerCase():'';
const stableSet=values=>JSON.stringify([...new Set(values)].sort());
export function sourceProgressExpectations(tables,enrollments,byCourse,lessonCounts,courseSlug){
  const catalog=tables.courses.filter(c=>courseSlug===undefined||c.slug===courseSlug);
  const byId=new Map(catalog.map(c=>[c.id,c])),bySlug=new Map(catalog.map(c=>[c.slug,c]));
  const publishedCount=id=>{const modules=new Set((tables.course_modules??[]).filter(m=>m.course_id===id&&(m.status??'published')==='published').map(m=>m.id));
    return (tables.lessons??[]).filter(l=>modules.has(l.module_id)&&(l.status??'published')==='published').length;};
  const playableCount=id=>{const modules=new Set((tables.course_modules??[]).filter(m=>m.course_id===id&&(m.status??'published')==='published').map(m=>m.id));
    return (tables.lessons??[]).filter(l=>modules.has(l.module_id)&&(l.status??'published')==='published'&&['youtube_url','embed_url','content'].some(k=>typeof l[k]==='string'&&l[k].trim())).length;};
  const counts=lessonCounts??Object.fromEntries(catalog.map(c=>[c.slug,playableCount(c.id)]));
  const progress=Object.fromEntries(Object.entries(byCourse).map(([slug,ids])=>{
    const e=enrollments.find(e=>e.id===ids[0]);if(!e)throw Error('LEARNING_PROGRESS_REFERENCE_UNAVAILABLE');
    const resolved=e.course_slug||e.metadata?.course_slug||byId.get(e.course_id)?.slug;
    const total=bySlug.has(resolved)?counts[resolved]:byId.has(e.course_id)?publishedCount(e.course_id):0;
    const completed=(tables.course_progress??[]).filter(p=>p.enrollment_id===e.id&&(p.status==='completed'||p.completed_at)).length;
    const number=Number(e.metadata?.progress_percent??0),stored=Number.isFinite(number)?number:0;
    return [slug,Math.max(0,Math.min(100,total>0?Math.round(completed/total*100):stored))];
  }));
  return {progressBySlug:progress,lessonCountsBySlug:counts};
}
export function sourceLearningExpectations(tables,subject,now,getCourseAccessSlugs,courseSlug){
  // Match the CURRENT Source service selector: ILIKE on the stored email does
  // NOT trim stored values. Wildcard characters in the supplied email are escaped.
  const sameStoredEmail=row=>typeof row.email==='string'&&row.email.toLowerCase()===normalize(subject.email);
  const orders=tables.orders.filter(o=>o.status==='paid'&&sameStoredEmail(o)).sort((a,b)=>a.id.localeCompare(b.id));
  const leads=tables.leads.filter(l=>l.deleted_at===null&&l.source?.startsWith('admin-access-')&&sameStoredEmail(l)).sort((a,b)=>a.id.localeCompare(b.id));
  const legacy=getCourseAccessSlugs({email:subject.email,orders:orders.map(o=>({email:o.email,status:o.status,courseSlug:o.course_slug,courseTitle:o.course_title,paymentPlan:o.payment_plan,orderItems:o.order_items})),
    leads:leads.map(l=>({email:l.email,source:l.source,createdAt:l.created_at}))});
  const contacts=new Map(tables.contacts.map(c=>[c.id,c])),courses=new Map(tables.courses.map(c=>[c.id,c]));
  const published=tables.courses.filter(c=>(courseSlug===undefined||c.slug===courseSlug)&&(c.lms_status??(c.status==='open'?'published':c.status==='closed'?'archived':'draft'))==='published');
  const matching=tables.enrollments.filter(e=>{
    const contact=contacts.get(e.contact_id),email=(contact?.email!==null&&contact?.email!==undefined&&contact.email!=='')?contact.email:e.metadata?.student_email;
    return ['active','completed'].includes(e.status)&&(e.expires_at===null||Date.parse(e.expires_at)>now)&&
      (e.user_id===subject.id||(normalize(subject.email)&&normalize(email)===normalize(subject.email)));
  }).map(e=>({...e,resolvedSlug:e.course_slug||e.metadata?.course_slug||courses.get(e.course_id)?.slug}))
    // Source RPC applies its slug predicate BEFORE mapCourse's ID-or-slug join.
    .filter(e=>courseSlug===undefined||e.resolvedSlug===courseSlug);
  const byCourse=Object.fromEntries(published.map(c=>[c.slug,matching.filter(e=>e.resolvedSlug===c.slug||e.course_id===c.id).map(e=>e.id)]).filter(([,ids])=>ids.length));
  const owned=new Set(Object.values(byCourse).flat());
  const matchingPublished=matching.filter(e=>owned.has(e.id));
  const ids=new Set(matchingPublished.map(e=>e.id));
  const completed=tables.course_progress.filter(p=>ids.has(p.enrollment_id)&&(p.status==='completed'||p.completed_at)).map(p=>p.lesson_id);
  return {legacyOwnedSlugs:legacy,lmsOwnedSlugs:Object.keys(byCourse),ownedSlugs:[...legacy,...Object.keys(byCourse)],
    completedLessonIds:completed,enrollmentIdsBySlug:byCourse,...sourceProgressExpectations(tables,matching,byCourse,undefined,courseSlug)};
}
export function rpcLearningExpectations(tables,rpc,legacyOwnedSlugs,courseSlug){
  if(!rpc||!Array.isArray(rpc.enrollments)||!Array.isArray(rpc.progress)||!rpc.lesson_counts||typeof rpc.lesson_counts!=='object')throw Error('LEARNING_RPC_ORACLE_UNAVAILABLE');
  const courses=new Map(tables.courses.map(c=>[c.id,c]));
  const matching=rpc.enrollments.map(e=>({...e,resolvedSlug:e.course_slug||e.metadata?.course_slug||courses.get(e.course_id)?.slug}));
  const published=tables.courses.filter(c=>(courseSlug===undefined||c.slug===courseSlug)&&(c.lms_status??(c.status==='open'?'published':c.status==='closed'?'archived':'draft'))==='published');
  const byCourse=Object.fromEntries(published.map(c=>[c.slug,matching.filter(e=>e.resolvedSlug===c.slug||e.course_id===c.id).map(e=>e.id)]).filter(([,ids])=>ids.length));
  const ids=new Set(Object.values(byCourse).flat());
  return {legacyOwnedSlugs,lmsOwnedSlugs:Object.keys(byCourse),ownedSlugs:[...legacyOwnedSlugs,...Object.keys(byCourse)],
    completedLessonIds:rpc.progress.filter(p=>ids.has(p.enrollment_id)&&(p.status==='completed'||p.completed_at)).map(p=>p.lesson_id),enrollmentIdsBySlug:byCourse,...sourceProgressExpectations({...tables,course_progress:rpc.progress},matching,byCourse,rpc.lesson_counts,courseSlug)};
}
export async function probeLearningAccess(input,core){
  const tables=Object.fromEntries([...Object.keys(fields),'courses','course_modules','lessons','lesson_resources','course_resources'].map(n=>[n,[]]));
  const users=[];
  visitVerifiedSourceRows(input.masterSecret,'a',input.archive,row=>{
    if(row.schema==='auth'&&row.table==='users'){users.push(authUserFromTextRow(row.columns,row.values));return;}
    if(!((row.schema==='public'&&['orders','leads','courses','course_modules','lessons','lesson_resources','course_resources'].includes(row.table))||
      (row.schema==='crm_v2'&&['contacts','enrollments','course_progress'].includes(row.table))))return;
    let columns=row.columns,values=row.values;
    if(fields[row.table]){
      const wanted=fields[row.table],indexes=wanted.map(n=>row.columns.findIndex(c=>c.n===n));
      if(indexes.some(i=>i<0))throw Error('LEARNING_SOURCE_SCHEMA_UNAVAILABLE');
      columns=indexes.map(i=>row.columns[i]);values=indexes.map(i=>row.values[i]);
    }
    tables[row.table].push(parseExactJson(postgresRowJson(columns,values)));
  });
  const documents=assembleCourseDocuments(tables).documents,sql=new DatabaseSync(':memory:');
  const expected=new Map();
  function insert(name,columns,values){
    if(!expected.has(name))expected.set(name,{columns,rows:[]});expected.get(name).rows.push(values);
    sql.prepare(`INSERT INTO ${name}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...values);
  }
  let studentsChecked=0,knownAdminsSkipped=0,crossSubjectIdentityDenials=0,courseScopedComparisons=0,rpcResultsCompared=0;
  let checkedUsers=users;
  if(input.subjectIds!==undefined){
    if(!Array.isArray(input.subjectIds)||!input.subjectIds.length||input.subjectIds.length>100||new Set(input.subjectIds).size!==input.subjectIds.length||input.subjectIds.some(id=>typeof id!=='string'||!users.some(u=>u.id===id)))throw Error('LEARNING_RPC_ORACLE_UNAVAILABLE');
    checkedUsers=users.filter(u=>input.subjectIds.includes(u.id));
  }
  const oracle=input.rpcOracle===undefined?null:new Map();
  if(oracle){
    if(!Array.isArray(input.rpcOracle))throw Error('LEARNING_RPC_ORACLE_UNAVAILABLE');
    for(const entry of input.rpcOracle){
      if(typeof entry.id!=='string'||entry.scope!==null&&typeof entry.scope!=='string'||typeof entry.value!=='string')throw Error('LEARNING_RPC_ORACLE_UNAVAILABLE');
      const key=JSON.stringify([entry.id,entry.scope]);if(oracle.has(key))throw Error('LEARNING_RPC_ORACLE_UNAVAILABLE');
      oracle.set(key,parseExactJson(entry.value));
    }
    if(oracle.size!==checkedUsers.length*(tables.courses.length+1))throw Error('LEARNING_RPC_ORACLE_UNAVAILABLE');
  }
  try{
    for(const schema of input.schemas)sql.exec(schema);
    sql.exec('BEGIN');
    try{
      for(const user of users){const role=user.appMetadata?.admin_role;insert('d1_access_users',['id','normalized_email','admin_role'],[user.id,normalize(user.email),['owner','editor'].includes(role)?role:core.isAdminEmail(user.email)?'owner':null]);}
      for(const course of documents){const mapped=core.mapDbCourseToCourse(course);
        insert('d1_lms_courses',['id','slug','lms_status','visibility'],[course.id,course.slug,mapped.lmsStatus,mapped.visibility]);
        for(const mod of mapped.modules){insert('d1_lms_modules',['id','course_id','status'],[mod.id,course.id,mod.status]);
          for(const lesson of mod.lessons)insert('d1_lms_lessons',['id','course_id','module_id','slug','status','playable'],[lesson.id,course.id,mod.id,lesson.slug??null,lesson.status,Number(Boolean(lesson.youtubeUrl.trim()||lesson.embedUrl.trim()||lesson.content?.trim()))]);}
      }
      for(const c of tables.contacts)insert('d1_lms_contacts',['id','normalized_email','source_email'],[c.id,normalize(c.email)||null,c.email]);
      for(const e of tables.enrollments)insert('d1_lms_enrollments',fields.enrollments.map(n=>n),fields.enrollments.map(n=>n==='metadata'?JSON.stringify(e[n]??{}):e[n]));
      for(const p of tables.course_progress)insert('d1_lms_progress',fields.course_progress,fields.course_progress.map(n=>n==='metadata'?JSON.stringify(p[n]??{}):p[n]));
      // public.orders has no deleted_at in the verified current catalog. The
      // old native access slice has a nullable compatibility column; no Source
      // deletion filter exists in studentPortalAccessService, so keep it NULL.
      for(const o of tables.orders.filter(o=>o.status==='paid'))insert('d1_access_orders',['id','normalized_email','status','course_slug','course_title','payment_plan','order_items_json','deleted_at'],[o.id,normalize(o.email),o.status,o.course_slug,o.course_title,o.payment_plan,o.order_items===null?null:JSON.stringify(o.order_items),null]);
      for(const l of tables.leads.filter(l=>l.source?.startsWith('admin-access-')&&l.deleted_at===null))insert('d1_access_overrides',['id','normalized_email','source','created_at','deleted_at'],[l.id,normalize(l.email),l.source,l.created_at,l.deleted_at]);
      // Replay at actual source cutoff only, never publish this marker remotely.
      const stamp=input.archive.manifest.header.capturedAt;
      sql.prepare("INSERT INTO d1_access_sync_state VALUES(?,?,?,'verified')").run('vsxxgdzwtscuxcmjfckt',stamp,stamp);
      if(sql.prepare('PRAGMA foreign_key_check').all().length)throw Error();sql.exec('COMMIT');
    }catch{sql.exec('ROLLBACK');throw Error('LEARNING_TARGET_REJECTED');}
    for(const [name,value] of expected){
      const actual=sql.prepare(`SELECT ${value.columns.join(',')} FROM ${name}`).all().map(r=>JSON.stringify(Object.values(r))).sort();
      if(JSON.stringify(actual)!==JSON.stringify(value.rows.map(r=>JSON.stringify(r)).sort()))throw Error('LEARNING_TARGET_READBACK_MISMATCH');
    }
    const now=Date.parse(input.archive.manifest.header.capturedAt),read=async(q,p)=>sql.prepare(q).get(...p)??null;
    for(const user of checkedUsers){
      if(['owner','editor'].includes(user.appMetadata?.admin_role)||core.isAdminEmail(user.email)){knownAdminsSkipped++;continue;}
      const subject={id:user.id,email:user.email},actual=await (input.verifyProgress?core.readD1StudentCourseProgress:core.readD1StudentCourseAccess)(read,subject,{now});
      const expectedAt=scope=>{
        const reference=sourceLearningExpectations(tables,subject,now,core.getCourseAccessSlugs,scope);
        if(!oracle)return reference;
        const rpc=oracle.get(JSON.stringify([user.id,scope??null]));
        if(!rpc)throw Error('LEARNING_RPC_ORACLE_UNAVAILABLE');
        const result=rpcLearningExpectations(tables,rpc,reference.legacyOwnedSlugs,scope);
        const expectedCourses=tables.courses.filter(c=>scope===undefined||c.slug===scope);
        if(Object.keys(rpc.lesson_counts).length!==expectedCourses.length)throw Error('LEARNING_RPC_COUNT_MISMATCH');
        for(const c of expectedCourses){const count=sql.prepare("SELECT count(*) n FROM d1_lms_modules m JOIN d1_lms_lessons l ON l.module_id=m.id WHERE m.course_id=? AND m.status='published' AND l.status='published' AND l.playable=1").get(c.id).n;
          if(rpc.lesson_counts[c.slug]!==count)throw Error('LEARNING_RPC_COUNT_MISMATCH');}
        rpcResultsCompared++;return result;
      };
      const wanted=expectedAt();
      if(input.verifyProgress){
        for(const slug of actual.ownedSlugs)if(actual.progressBySlug[slug]!== (wanted.progressBySlug[slug]??0))throw Error('LEARNING_PROGRESS_PARITY_MISMATCH');
        const entries=value=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
        if(entries(actual.lessonCountsBySlug)!==entries(wanted.lessonCountsBySlug))throw Error('LEARNING_PROGRESS_PARITY_MISMATCH');
      }
      for(const name of ['legacyOwnedSlugs','lmsOwnedSlugs','ownedSlugs','completedLessonIds'])if(stableSet(actual[name])!==stableSet(wanted[name]))throw Error('LEARNING_PERMISSION_PARITY_MISMATCH');
      for(const slug of new Set([...Object.keys(actual.enrollmentIdsBySlug),...Object.keys(wanted.enrollmentIdsBySlug)]))
        if(stableSet(actual.enrollmentIdsBySlug[slug]??[])!==stableSet(wanted.enrollmentIdsBySlug[slug]??[]))throw Error('LEARNING_ENROLLMENT_PARITY_MISMATCH');
      for(const course of tables.courses){
        const scoped=await core.readD1StudentCourseAccess(async(q,p)=>sql.prepare(core.scopeD1StudentAccessSql(q,5)).get(...p,course.slug)??null,subject,{now});
        const reference=expectedAt(course.slug);
        for(const name of ['legacyOwnedSlugs','lmsOwnedSlugs','ownedSlugs','completedLessonIds'])if(stableSet(scoped[name])!==stableSet(reference[name]))throw Error('LEARNING_PERMISSION_PARITY_MISMATCH');
        for(const slug of new Set([...Object.keys(scoped.enrollmentIdsBySlug),...Object.keys(reference.enrollmentIdsBySlug)]))
          if(stableSet(scoped.enrollmentIdsBySlug[slug]??[])!==stableSet(reference.enrollmentIdsBySlug[slug]??[]))throw Error('LEARNING_ENROLLMENT_PARITY_MISMATCH');
        courseScopedComparisons++;
      }
      const other=users.find(u=>u.id!==user.id&&normalize(u.email)!==normalize(user.email));
      if(other){let denied=false;try{await core.readD1StudentCourseAccess(read,{id:user.id,email:other.email},{now});}catch(e){denied=e?.message==='Student identity is not in verified projection';}
        if(!denied)throw Error('LEARNING_CROSS_SUBJECT_ACCEPTED');crossSubjectIdentityDenials++;}
      studentsChecked++;
    }
    return {project:'a',sourceSnapshotAt:input.archive.manifest.header.capturedAt,database:'IN_MEMORY_SQLITE_ONLY',clock:'SNAPSHOT_TIME_OFFLINE_REPLAY',
      projectedRows:Object.fromEntries([...expected].map(([table,v])=>[table,v.rows.length])),allProjectedRowsReadBack:true,
      studentsChecked,knownAdminsSkipped,crossSubjectIdentityDenials,courseScopedComparisons,studentRightsAndCompletedLessonSetsMatched:true,
      allSourceSubjectsCompared:checkedUsers.length===users.length,selectedSubjects:checkedUsers.length,
      sourceRpcExecuted:Boolean(oracle),sourceRpcResultsCompared:rpcResultsCompared,
      reference:oracle?'POSTGRESQL_RPC_WITH_REPOSITORY_POSTPROCESSING_AND_ENTITLEMENT_RULES_CONSISTENCY_CHECKED_BY_CALLER':'CURRENT_REPOSITORY_SOURCE_SERVICE_PREDICATES_AND_SHARED_ENTITLEMENT_RULES',
      extraConfiguredOwnerRoleParityVerified:false,progressPercentParityVerified:Boolean(input.verifyProgress),progressWritesExecuted:0,
      productionWritten:false,remoteD1Written:false,readyForCutover:false};
  }finally{sql.close();}
}
async function main(){
  let text='';for await(const part of process.stdin)text+=part;
  const input=JSON.parse(text),root=path.resolve(input.compilerRoot),{build}=createRequire(path.join(root,'package.json'))('esbuild');
  const bundle=await build({stdin:{contents:'export {readD1StudentCourseProgress} from "./lib/cloudflare/d1-student-progress-read";export {readD1StudentCourseAccess,scopeD1StudentAccessSql} from "./lib/cloudflare/d1-course-access";export {getCourseAccessSlugs,isAdminEmail} from "./lib/course-access";export {mapDbCourseToCourse} from "./lib/courses/course-projection";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,tsconfig:'tsconfig.json',nodePaths:[path.join(root,'node_modules')]});
  const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  process.stdout.write(JSON.stringify(await probeLearningAccess(input,core)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await main();}catch(e){const allowed=['LEARNING_SOURCE_SCHEMA_UNAVAILABLE','LEARNING_TARGET_REJECTED','LEARNING_TARGET_READBACK_MISMATCH','LEARNING_PERMISSION_PARITY_MISMATCH','LEARNING_ENROLLMENT_PARITY_MISMATCH','LEARNING_CROSS_SUBJECT_ACCEPTED','LEARNING_PROGRESS_PARITY_MISMATCH','Ambiguous source progress order'];
    process.stderr.write((allowed.includes(e?.message)?e.message:'LEARNING_SNAPSHOT_UNAVAILABLE')+'\n');process.exitCode=2;}
}
