// Existing course content importer/readback from the complete sealed source.
// No student response or authority marker is published by this offline probe.
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {visitVerifiedSourceRows} from './sealed-source-snapshot.mjs';
import {postgresRowJson} from './probe-sealed-orders.mjs';
import {parseExactJson} from '../lib/cloudflare/precise-json.ts';

export function assembleCourseDocuments(tables){
  const {courses,course_modules:modules,lessons,lesson_resources:resources,course_resources:managed}=tables;
  const byCourse=new Map(courses.map(c=>[c.id,{...c,course_modules:[]}])) ,byModule=new Map(),byLesson=new Map();
  if(byCourse.size!==courses.length)throw Error('COURSE_SOURCE_IDENTITY_UNAVAILABLE');
  for(const value of modules){const parent=byCourse.get(value.course_id);if(!parent||byModule.has(value.id))throw Error('COURSE_SOURCE_ORPHAN_MODULE');
    const row={...value,lessons:[]};byModule.set(value.id,row);parent.course_modules.push(row);}
  for(const value of lessons){const parent=byModule.get(value.module_id);if(!parent||byLesson.has(value.id))throw Error('COURSE_SOURCE_ORPHAN_LESSON');
    if(Object.hasOwn(value,'course_id')&&value.course_id!==parent.course_id)throw Error('COURSE_SOURCE_CROSS_COURSE_LESSON');
    const row={...value,lesson_resources:[]};byLesson.set(value.id,row);parent.lessons.push(row);}
  let unlinkedResources=0;
  for(const value of [...resources,...managed]){
    if(value.lesson_id===null){unlinkedResources++;continue;}
    const parent=byLesson.get(value.lesson_id);if(!parent)throw Error('COURSE_SOURCE_ORPHAN_RESOURCE');
    parent.lesson_resources.push({...value});
  }
  const duplicateOrders=rows=>{const counts=new Map();for(const row of rows){const key=row.sort_order??0;counts.set(key,(counts.get(key)??0)+1);}return [...counts.values()].filter(n=>n>1).length;};
  let duplicateSortOrderGroups=0;
  for(const course of byCourse.values()){duplicateSortOrderGroups+=duplicateOrders(course.course_modules);for(const mod of course.course_modules)duplicateSortOrderGroups+=duplicateOrders(mod.lessons);}
  return {documents:[...byCourse.values()],unlinkedResources,duplicateSortOrderGroups};
}
export async function probeCourses(input,core){
  const tables=Object.fromEntries(['courses','course_modules','lessons','lesson_resources','course_resources'].map(t=>[t,[]]));
  visitVerifiedSourceRows(input.masterSecret,'a',input.archive,row=>{
    if(row.schema==='public'&&Object.hasOwn(tables,row.table))tables[row.table].push(parseExactJson(postgresRowJson(row.columns,row.values)));
  });
  if(!tables.courses.length)throw Error('COURSE_SOURCE_UNAVAILABLE');
  const assembled=assembleCourseDocuments(tables),sql=new DatabaseSync(':memory:');
  let published=0,publishedLessons=0,publishedResources=0,duplicatePublishedSortOrderGroups=0,requiredUrlLessonPublished=false;
  try{
    sql.exec(input.schema);sql.exec('BEGIN');
    try{for(const course of assembled.documents){const s=await core.prepareD1CourseContent(course,input.archive.manifest.header.capturedAt);sql.prepare(s.sql).run(...s.params);}sql.exec('COMMIT');}
    catch{sql.exec('ROLLBACK');throw Error('COURSE_TARGET_REJECTED');}
    for(const course of assembled.documents){
      const target=sql.prepare('SELECT * FROM d1_course_content WHERE course_id=?').get(course.id);
      await core.verifyD1CourseContent(course,target,input.archive.manifest.header.capturedAt);
      const actual=await core.decodeD1PublishedCourseRow(JSON.stringify(target));
      if(actual){
        // Expected visible fields use the existing source rendering functions.
        // This is content projection parity, not an independent hosted SSR test.
        let expected=core.normalizeCourseText(core.normalizeCourseTiming(core.mapDbCourseToCourse(course)));
        expected=core.publishedLessonsOnly(core.mergeOfficialCourseMetadata(expected));
        if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('COURSE_RENDERING_MISMATCH');
        published++;publishedLessons+=actual.modules.reduce((n,m)=>n+m.lessons.length,0);
        publishedResources+=actual.modules.reduce((n,m)=>n+m.lessons.reduce((n,l)=>n+l.resources.length,0),0);
        const ties=rows=>{const counts=new Map();for(const row of rows)counts.set(row.order,(counts.get(row.order)??0)+1);return [...counts.values()].filter(n=>n>1).length;};
        duplicatePublishedSortOrderGroups+=ties(actual.modules)+actual.modules.reduce((n,m)=>n+ties(m.lessons),0);
        if(course.slug==='facebook-ads-2026')requiredUrlLessonPublished=actual.modules.some(m=>m.lessons.some(l=>l.id==='47da65a2-c6c6-4a21-a109-c1feb1d64c8f'||l.slug==='47da65a2-c6c6-4a21-a109-c1feb1d64c8f'));
      }
    }
    if(sql.prepare('SELECT count(*) n FROM d1_course_content').get().n!==assembled.documents.length)throw Error('COURSE_TARGET_COUNT_MISMATCH');
    const requiredCourse=assembled.documents.find(c=>c.slug==='facebook-ads-2026');
    const requiredUrlLessonPresent=Boolean(requiredCourse?.course_modules.some(m=>m.lessons.some(l=>l.id==='47da65a2-c6c6-4a21-a109-c1feb1d64c8f'||l.slug==='47da65a2-c6c6-4a21-a109-c1feb1d64c8f')));
    return {project:'a',sourceSnapshotAt:input.archive.manifest.header.capturedAt,database:'IN_MEMORY_SQLITE_ONLY',
      sourceCounts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),
      allCourseDocumentsReadBack:true,publishedCourses:published,publishedLessons,publishedLessonResourceLinks:publishedResources,
      unlinkedResourceRowsNotInLessonProjection:assembled.unlinkedResources,duplicateSortOrderGroups:assembled.duplicateSortOrderGroups,
      requiredUrlLessonPresent,requiredUrlLessonPublished,duplicatePublishedSortOrderGroups,resourceBytesFetched:0,studentAuthorizationTested:false,
      hostedRenderingTested:false,productionWritten:false,remoteD1Written:false,readyForCutover:false};
  }finally{sql.close();}
}
async function main(){
  let text='';for await(const part of process.stdin)text+=part;
  const input=JSON.parse(text),root=path.resolve(input.compilerRoot);
  const {build}=createRequire(path.join(root,'package.json'))('esbuild');
  const bundle=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-course-content";export {mapDbCourseToCourse,normalizeCourseText,normalizeCourseTiming,publishedLessonsOnly,mergeOfficialCourseMetadata} from "./lib/courses/course-projection";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,tsconfig:'tsconfig.json',nodePaths:[path.join(root,'node_modules')]});
  const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  process.stdout.write(JSON.stringify(await probeCourses(input,core)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await main();}catch{process.stderr.write('COURSE_SNAPSHOT_UNAVAILABLE\n');process.exitCode=2;}
}
