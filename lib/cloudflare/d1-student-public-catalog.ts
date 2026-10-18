import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import type {DbCourse} from '@/lib/courses/course-projection';
import type {DbResource} from '@/lib/resources/resource-projection';
import {projectStudentPublicCatalog,publicCourseSummarySource} from '@/lib/cloudflare/student-public-catalog';
import {parseExactJson} from '@/lib/cloudflare/precise-json';
const PROJECT='vsxxgdzwtscuxcmjfckt';
type CatalogSource={courses:DbCourse[];resources:DbResource[]};
type Row=Record<string,unknown>;
const unavailable=()=>new Error('Verified public student catalog required');
function object(value:unknown):value is Row{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function canonical(value:unknown):string{
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(object(value))return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 throw unavailable();
}
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');}
function source(value:unknown):CatalogSource{
 if(!object(value)||Object.keys(value).some(k=>!['courses','resources'].includes(k))||!Array.isArray(value.courses)||!Array.isArray(value.resources)||value.courses.length>1000||value.resources.length>10000)throw unavailable();
 const courseIds=new Set(),slugs=new Set(),resourceIds=new Set();
 for(const c of value.courses){
  if(!object(c)||typeof c.id!=='string'||!c.id||typeof c.slug!=='string'||!c.slug||typeof c.title!=='string'||courseIds.has(c.id)||slugs.has(c.slug)||!Array.isArray(c.course_modules))throw unavailable();
  for(const key of ['short_description','description','status','lms_status','visibility','duration','level','updated_at','banner_image','thumbnail_image','preview_video_url','cta_text'])if(c[key]!==undefined&&c[key]!==null&&typeof c[key]!=='string')throw unavailable();
  for(const key of ['price','original_price'])if(c[key]!==undefined&&c[key]!==null&&typeof c[key]!=='string'&&!(typeof c[key]==='number'&&Number.isFinite(c[key])))throw unavailable();
  for(const key of ['lesson_count','sort_order'])if(c[key]!==undefined&&c[key]!==null&&!(typeof c[key]==='number'&&Number.isSafeInteger(c[key])))throw unavailable();
  courseIds.add(c.id);slugs.add(c.slug);
  const moduleIds=new Set(),lessonIds=new Set();
  for(const m of c.course_modules){
   if(!object(m)||typeof m.id!=='string'||typeof m.title!=='string'||moduleIds.has(m.id)||!Array.isArray(m.lessons))throw unavailable();
   for(const key of ['description','status'])if(m[key]!==undefined&&m[key]!==null&&typeof m[key]!=='string')throw unavailable();
   if(m.sort_order!==undefined&&m.sort_order!==null&&!(typeof m.sort_order==='number'&&Number.isSafeInteger(m.sort_order)))throw unavailable();
   moduleIds.add(m.id);
   for(const l of m.lessons){if(!object(l)||typeof l.id!=='string'||typeof l.title!=='string'||lessonIds.has(l.id))throw unavailable();for(const key of ['duration','status'])if(l[key]!==undefined&&l[key]!==null&&typeof l[key]!=='string')throw unavailable();if(l.sort_order!==undefined&&l.sort_order!==null&&!(typeof l.sort_order==='number'&&Number.isSafeInteger(l.sort_order)))throw unavailable();lessonIds.add(l.id);}
  }
 }
 const resourceFields=new Set(['id','title','description','thumbnail','file_url','access_type','created_at']);
 for(const r of value.resources){
  if(!object(r)||typeof r.id!=='string'||!r.id||typeof r.title!=='string'||resourceIds.has(r.id)||Object.keys(r).some(k=>!resourceFields.has(k))||
    [...resourceFields].some(k=>k!=='id'&&k!=='title'&&r[k]!==null&&typeof r[k]!=='string'))throw unavailable();
  resourceIds.add(r.id);
 }
 // Runtime field types are validated above where identity and traversal matter;
 // projection additionally validates the remaining mapper-compatible values.
 return value as unknown as CatalogSource;
}
function iso(value:string){const time=Date.parse(value);if(!Number.isFinite(time))throw unavailable();return new Date(time).toISOString();}
export async function prepareD1StudentPublicCatalog(input:unknown,capturedAt:string){
 const original=source(input),captured=iso(capturedAt);
 // Exclude every non-summary lesson field before retaining the candidate.
 const summary={courses:original.courses.map(publicCourseSummarySource),resources:original.resources};
 const document=canonical(summary);
 if(new TextEncoder().encode(document).length>1024*1024)throw unavailable();
 const normalized=projectStudentPublicCatalog(summary.courses,summary.resources),normalizedDocument=canonical(normalized),normalizedDigest=await digest(normalizedDocument);
 if(new TextEncoder().encode(normalizedDocument).length>2*1024*1024)throw unavailable();
 const id=await digest(canonical([PROJECT,captured,document,normalizedDigest]));
 return {snapshotId:id,sourceDocument:document,normalizedDocument,normalizedDigest,capturedAt:captured,normalized,
  statement:{sql:`INSERT INTO d1_student_catalog_snapshots(snapshot_id,source_project_id,source_document,normalized_document,normalized_digest,captured_at,status) VALUES(?1,?2,?3,?4,?5,?6,'pending') ON CONFLICT(snapshot_id) DO NOTHING`,params:[id,PROJECT,document,normalizedDocument,normalizedDigest,captured]}};
}
export async function verifyD1StudentPublicCatalog(db:AuthDatabase,input:unknown,capturedAt:string,options:{now?:number}={}){
 const plan=await prepareD1StudentPublicCatalog(input,capturedAt),now=options.now??Date.now(),cutoff=Date.parse(plan.capturedAt);
 if(!Number.isFinite(now)||cutoff>now||now-cutoff>300000)throw unavailable();
 const params=[plan.snapshotId,PROJECT,plan.sourceDocument,plan.normalizedDocument,plan.normalizedDigest,plan.capturedAt,new Date(now).toISOString()];
 const matches="s.snapshot_id=?1 AND s.source_project_id=?2 AND s.source_document=?3 AND s.normalized_document=?4 AND s.normalized_digest=?5 AND s.captured_at=?6";
 const row=await db.first(`SELECT snapshot_id FROM d1_student_catalog_snapshots s WHERE ${matches}`,params.slice(0,6));
 if(!row)throw unavailable();
 const results=await db.batch([
  {sql:`UPDATE d1_student_catalog_snapshots AS s SET status='verified',last_verified_at=?7 WHERE ${matches}`,params},
  {sql:`INSERT INTO d1_student_catalog_current(source_project_id,snapshot_id,published_at) SELECT ?2,s.snapshot_id,?7 FROM d1_student_catalog_snapshots s WHERE ${matches} AND s.status='verified' AND s.last_verified_at=?7 ON CONFLICT(source_project_id) DO UPDATE SET snapshot_id=excluded.snapshot_id,published_at=excluded.published_at WHERE (SELECT captured_at FROM d1_student_catalog_snapshots old WHERE old.snapshot_id=d1_student_catalog_current.snapshot_id)<?6 OR d1_student_catalog_current.snapshot_id=excluded.snapshot_id`,params},
  {sql:`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_student_catalog_current c JOIN d1_student_catalog_snapshots s ON s.snapshot_id=c.snapshot_id AND s.source_project_id=c.source_project_id WHERE c.source_project_id=?2 AND c.snapshot_id=?1 AND c.published_at=?7 AND ${matches} AND s.status='verified' AND s.last_verified_at=?7) THEN 1 ELSE abs(-9223372036854775808) END AS published`,params},
 ]);
 if(results.length!==3||results.at(-1)?.results?.[0]?.published!==1)throw unavailable();
 return {matched:true as const};
}
export async function readD1StudentPublicCatalog(db:Pick<AuthDatabase,'first'>,options:{now?:number;maxSnapshotAgeMs?:number}={}){
 const now=options.now??Date.now(),age=options.maxSnapshotAgeMs??300000;
 if(!Number.isFinite(now)||!Number.isSafeInteger(age)||age<1||age>300000)throw unavailable();
 const row=await db.first(`SELECT s.* FROM d1_student_catalog_current c JOIN d1_student_catalog_snapshots s ON s.snapshot_id=c.snapshot_id AND s.source_project_id=c.source_project_id WHERE c.source_project_id=?1 AND s.status='verified' AND julianday(s.captured_at) BETWEEN julianday(?2)-?3/86400000.0 AND julianday(?2) AND julianday(s.last_verified_at) BETWEEN julianday(s.captured_at) AND julianday(?2) AND julianday(c.published_at) BETWEEN julianday(s.captured_at) AND julianday(?2)`,[PROJECT,new Date(now).toISOString(),age]);
 if(!row||typeof row.source_document!=='string'||typeof row.captured_at!=='string')throw unavailable();
 const plan=await prepareD1StudentPublicCatalog(parseExactJson(row.source_document),row.captured_at);
 if(plan.snapshotId!==row.snapshot_id||plan.sourceDocument!==row.source_document||plan.normalizedDocument!==row.normalized_document||plan.normalizedDigest!==row.normalized_digest)throw unavailable();
 return plan.normalized;
}
