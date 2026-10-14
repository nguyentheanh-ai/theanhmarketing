import {prepareD1CourseContent} from '@/lib/cloudflare/d1-course-content';
import {mapDbCourseToCourse,type DbCourse} from '@/lib/courses/course-projection';
type Row=Record<string,unknown>;
type Statement={sql:string;params:(string|number|null)[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,project='vsxxgdzwtscuxcmjfckt';
function obj(v:unknown):Row{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid QA source');return v as Row;}
function rows(v:unknown):Row[]{if(!Array.isArray(v)||v.length>1000)throw Error('Invalid QA source');const result=v.map(obj);const ids=result.map(r=>id(r.id));if(new Set(ids).size!==ids.length)throw Error('Duplicate QA source identity');return result;}
function id(v:unknown):string{if(typeof v!=='string'||!uuid.test(v))throw Error('Invalid QA source identity');return v;}
function text(v:unknown):string|null{if(v===null||v===undefined)return null;if(typeof v!=='string')throw Error('Invalid QA source text');return v;}
function email(v:unknown){return (text(v)??'').trim().toLowerCase();}
function stamp(v:unknown):string|null{const s=text(v);if(s===null)return null;if(!Number.isFinite(Date.parse(s)))throw Error('Invalid QA source timestamp');return new Date(s).toISOString();}
function canonical(v:unknown):string{if(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Row)[k])).join(',')+'}';throw Error('Invalid QA source JSON');}
async function digest(s:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');}
// Initial one-user staging import only. Caller must prove the exact QA identity
// in Auth, empty target tables, disabled Worker and fresh source snapshot.
// Preserve NULL legacy linkage fields rather than inventing replacement UUIDs.
export async function prepareD1QaLearningImport(payload:unknown,qa:{userId:string;email:string}){
 const p=obj(payload),uid=id(qa.userId),mail=email(qa.email),snapshot=stamp(p.snapshotAt);
 if(!mail||!snapshot||p.qaAccounts!==1)throw Error('Exact QA source identity required');
 const course=obj(p.course);await prepareD1CourseContent(course,snapshot);
 const courseId=id(course.id),slug=text(course.slug)!;
 const mapped=mapDbCourseToCourse(course as DbCourse),contacts=rows(p.contacts),enrollments=rows(p.enrollments),progress=rows(p.progress),orders=rows(p.orders),overrides=rows(p.overrides);
 const statements:Statement[]=[];
 const expectedRows:Record<string,Row[]>=Object.fromEntries(['d1_lms_courses','d1_lms_modules','d1_lms_lessons','d1_lms_contacts','d1_lms_enrollments','d1_lms_progress','d1_access_orders','d1_access_overrides','d1_qa_learning_source','d1_access_sync_state'].map(table=>[table,[]]));
 const add=(sql:string,params:Statement['params'])=>{const match=/^INSERT INTO (d1_[a-z_]+)\(([^)]+)\) VALUES/.exec(sql);if(!match)throw Error('Invalid initial import statement');const columns=match[2].split(',');if(columns.length!==params.length)throw Error('Invalid initial import bindings');(expectedRows[match[1]]??=[]).push(Object.fromEntries(columns.map((column,i)=>[column,params[i]])));statements.push({sql,params});};
 add('INSERT INTO d1_lms_courses(id,slug,lms_status,visibility) VALUES(?1,?2,?3,?4)',[courseId,slug,mapped.lmsStatus!,mapped.visibility!]);
 const lessonIds=new Set<string>();
 for(const m of mapped.modules){
  add('INSERT INTO d1_lms_modules(id,course_id,status) VALUES(?1,?2,?3)',[m.id,courseId,m.status!]);
  for(const l of m.lessons){lessonIds.add(l.id);add('INSERT INTO d1_lms_lessons(id,course_id,module_id,slug,status,playable) VALUES(?1,?2,?3,?4,?5,?6)',[l.id,courseId,m.id,l.slug??null,l.status!,Number(Boolean(l.youtubeUrl.trim()||l.embedUrl.trim()||l.content?.trim()))]);}
 }
 const contactIds=new Set(contacts.map(c=>id(c.id))),enrollmentIds=new Set(enrollments.map(e=>id(e.id)));
 for(const c of contacts){if(email(c.email)!==mail)throw Error('Foreign QA contact');add('INSERT INTO d1_lms_contacts(id,normalized_email,source_email) VALUES(?1,?2,?3)',[id(c.id),mail,text(c.email)]);}
 for(const e of enrollments){
  const metadata=e.metadata===null?{}:obj(e.metadata),contact=text(e.contact_id),user=text(e.user_id),cid=text(e.course_id),storedSlug=text(e.course_slug);
  if((user!==null&&user!==uid)||(contact!==null&&!contactIds.has(contact))||(cid!==null&&cid!==courseId))throw Error('Foreign QA enrollment');
  if(user!==uid&&!(contact&&contactIds.has(contact))&&email(metadata.student_email)!==mail)throw Error('Unowned QA enrollment');
  if((storedSlug!==null&&storedSlug!==slug)||(cid===null&&storedSlug!==slug&&metadata.course_slug!==slug))throw Error('Unmapped QA enrollment course');
  if(!['active','paused','completed','revoked'].includes(String(e.status)))throw Error('Unsupported QA enrollment status');
  const updated=stamp(e.updated_at);if(!updated)throw Error('Missing QA enrollment timestamp');
  add('INSERT INTO d1_lms_enrollments(id,contact_id,user_id,course_id,course_slug,status,expires_at,updated_at,metadata,last_seen_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)',[id(e.id),contact,user,cid,storedSlug,String(e.status),stamp(e.expires_at),updated,canonical(metadata),stamp(e.last_seen_at)]);
 }
 for(const r of progress){
  if(!enrollmentIds.has(id(r.enrollment_id))||!lessonIds.has(id(r.lesson_id))||(r.course_id!==null&&r.course_id!==undefined&&r.course_id!==courseId)||(r.contact_id!==null&&r.contact_id!==undefined&&!contactIds.has(id(r.contact_id))))throw Error('Foreign QA progress');
  if(!['not_started','in_progress','completed'].includes(String(r.status))||typeof r.progress_percent!=='number'||!Number.isInteger(r.progress_percent)||r.progress_percent<0||r.progress_percent>100)throw Error('Invalid QA progress status');
  const updated=stamp(r.updated_at);if(!updated)throw Error('Missing QA progress timestamp');
  add('INSERT INTO d1_lms_progress(id,enrollment_id,lesson_id,status,progress_percent,completed_at,updated_at,metadata) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)',[id(r.id),id(r.enrollment_id),id(r.lesson_id),String(r.status),r.progress_percent,stamp(r.completed_at),updated,canonical(r.metadata??{})]);
 }
 for(const o of orders){if(email(o.email)!==mail||o.status!=='paid'||(o.order_items!==null&&o.order_items!==undefined&&!Array.isArray(o.order_items)))throw Error('Foreign QA paid order');add('INSERT INTO d1_access_orders(id,normalized_email,status,course_slug,course_title,payment_plan,order_items_json,deleted_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)',[id(o.id),mail,'paid',text(o.course_slug),text(o.course_title),text(o.payment_plan),o.order_items==null?null:canonical(o.order_items),stamp(o.deleted_at)]);}
 for(const l of overrides){if(email(l.email)!==mail||typeof l.source!=='string'||!l.source.startsWith('admin-access-')||l.deleted_at!=null)throw Error('Foreign QA access override');add('INSERT INTO d1_access_overrides(id,normalized_email,source,created_at,deleted_at) VALUES(?1,?2,?3,?4,?5)',[id(l.id),mail,l.source,stamp(l.created_at),null]);}
 const document=canonical({contacts,enrollments,progress,orders,overrides});if(new TextEncoder().encode(document).length>512*1024)throw Error('QA source archive requires partitioning');
 add('INSERT INTO d1_qa_learning_source(user_id,source_project_id,source_snapshot_at,source_document,source_digest,status) VALUES(?1,?2,?3,?4,?5,?6)',[uid,project,snapshot,document,await digest(document),'pending']);
 add('INSERT INTO d1_access_sync_state(source_project_id,source_snapshot_at,last_verified_at,status) VALUES(?1,?2,?3,?4)',[project,snapshot,null,'importing']);
 return {statements,expectedRows,summary:{courses:1,modules:mapped.modules.length,lessons:lessonIds.size,contacts:contacts.length,enrollments:enrollments.length,progress:progress.length,orders:orders.length,overrides:overrides.length},snapshot,limits:'QA initial plan only; no source mutation, overwrite, verified marker or customer migration'};
}

// Initial readback only, before any native QA write or marker promotion.
// Verify actual fields, not counts or the archived source hash alone.
export function verifyD1QaLearningRows(expected:Record<string,Row[]>,actual:unknown){
 const target=obj(actual);
 if(Object.keys(target).length!==Object.keys(expected).length)throw Error('QA target table mismatch');
 for(const [table,rows] of Object.entries(expected)){
  const found=target[table];if(!Array.isArray(found)||found.length!==rows.length)throw Error('QA target row count mismatch');
  const sort=(values:unknown[])=>values.map(canonical).sort();
  if(canonical(sort(found))!==canonical(sort(rows)))throw Error('QA target fields differ from source plan');
 }
 return {matched:true as const,tables:Object.keys(expected).length,rows:Object.values(expected).reduce((n,rows)=>n+rows.length,0)};
}

// Reverify unchanged initial QA data against a NEW genuine source read. The
// historical imported cutoff is used only to compare the old target fields;
// it is never presented as a fresh source clock. Two guarded updates fail
// closed: archive first, then access. A partial outcome keeps access importing.
export async function prepareD1QaLearningVerification(payload:unknown,qa:{userId:string;email:string},actual:unknown,now=Date.now()){
 const source=obj(payload),target=obj(actual);
 if(!Array.isArray(target.d1_qa_learning_source))throw Error('Initial QA archive required');
 const archives=target.d1_qa_learning_source.map(obj);
 if(archives.length!==1||archives[0].user_id!==qa.userId||!['pending','verified'].includes(String(archives[0].status)))throw Error('Initial QA archive required');
 const oldSnapshot=stamp(archives[0].source_snapshot_at),freshSnapshot=stamp(source.snapshotAt);
 if(!oldSnapshot||!freshSnapshot||!Number.isFinite(now)||Date.parse(oldSnapshot)>Date.parse(freshSnapshot)||now<Date.parse(freshSnapshot)||now-Date.parse(freshSnapshot)>300000)throw Error('Genuine fresh QA snapshot required');
 const plan=await prepareD1QaLearningImport({...source,snapshotAt:oldSnapshot},qa);
 if(!Array.isArray(target.d1_access_sync_state)||target.d1_access_sync_state.length!==1)throw Error('One QA access marker required');
 const sync=obj(target.d1_access_sync_state[0]);
 if(!['importing','verified'].includes(String(sync.status))||!stamp(sync.source_snapshot_at)||Date.parse(String(sync.source_snapshot_at))>Date.parse(freshSnapshot))throw Error('Invalid historical QA marker');
 if(sync.status==='importing'&&sync.last_verified_at!==null)throw Error('Invalid initial QA marker');
 if(sync.status==='verified'&&(!stamp(sync.last_verified_at)||Date.parse(String(sync.last_verified_at))<Date.parse(String(sync.source_snapshot_at))||Date.parse(String(sync.last_verified_at))>now))throw Error('Invalid verified QA marker');
 plan.expectedRows.d1_qa_learning_source[0].status=archives[0].status;
 plan.expectedRows.d1_access_sync_state[0].status=sync.status;
 plan.expectedRows.d1_access_sync_state[0].source_snapshot_at=sync.source_snapshot_at;
 plan.expectedRows.d1_access_sync_state[0].last_verified_at=sync.last_verified_at;
 verifyD1QaLearningRows(plan.expectedRows,target);
 const guard=(expected:Record<string,Row[]>)=>Object.entries(expected).map(([table,records])=>{
  if(!/^d1_[a-z_]+$/.test(table))throw Error('Invalid QA verification table');
  const columns=records.length?Object.keys(records[0]):[];
  if(columns.some(column=>!/^\w+$/.test(column)))throw Error('Invalid QA verification column');
  const predicates=columns.map(column=>`actual.${column} IS json_extract(wanted.value,'$.${column}')`).join(' AND ');
  return `(SELECT count(*) FROM ${table})=json_array_length(?1,'$.${table}') AND NOT EXISTS(SELECT 1 FROM json_each(?1,'$.${table}') wanted WHERE NOT EXISTS(SELECT 1 FROM ${table} actual WHERE ${predicates||'1=1'}))`;
 }).join(' AND ');
 const clock="julianday(?2) BETWEEN julianday('now')-300000/86400000.0 AND julianday('now') AND julianday(?3) BETWEEN julianday(?2) AND julianday('now')";
 const verifiedAt=new Date(now).toISOString(),expected=plan.expectedRows;
 const archive:Statement={sql:`UPDATE d1_qa_learning_source SET status='verified',source_snapshot_at=?2 WHERE user_id=?4 AND source_project_id=?5 AND ${clock} AND ${guard(expected)} RETURNING status`,params:[canonical(expected),freshSnapshot,verifiedAt,qa.userId,project]};
 const next=structuredClone(expected);next.d1_qa_learning_source[0].status='verified';next.d1_qa_learning_source[0].source_snapshot_at=freshSnapshot;
 const access:Statement={sql:`UPDATE d1_access_sync_state SET status='verified',source_snapshot_at=?2,last_verified_at=?3 WHERE source_project_id=?5 AND EXISTS(SELECT 1 FROM d1_qa_learning_source WHERE user_id=?4 AND status='verified' AND source_snapshot_at=?2) AND ${clock} AND ${guard(next)} RETURNING status`,params:[canonical(next),freshSnapshot,verifiedAt,qa.userId,project]};
 return {statements:[archive,access],readback:{matched:true as const,tables:Object.keys(expected).length},sourceSnapshotAt:freshSnapshot,limits:'One QA source revalidation only; no native primary-write authority'};
}
