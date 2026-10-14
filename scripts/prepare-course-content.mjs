// Sensitive course source arrives over stdin; output only aggregate evidence.
import {build} from 'esbuild';
let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>4*1024*1024)throw new Error('Course source too large');}
try{
 const {source,snapshotAt,mode='prepare',target,marker}=JSON.parse(input);
 if(!['prepare','plan','verify','revalidate'].includes(mode))throw new Error('Invalid preparation mode');
 const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-course-content";export * from "./lib/courses/course-projection";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const h=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const plan=await h.prepareD1CourseContent(source,snapshotAt);
 const row={course_id:plan.params[0],slug:plan.params[1],source_project_id:plan.params[2],source_document:plan.params[3],source_digest:plan.params[4],source_snapshot_at:plan.params[5]};
 await h.verifyD1CourseContent(source,row,snapshotAt);
 if(mode==='revalidate'){const result=await h.prepareD1CourseRevalidation(source,target,marker,snapshotAt);console.log(JSON.stringify({status:'PREPARED_REVALIDATION_INTERNAL',...result}));process.exit(0);}
 if(mode==='plan'){console.log(JSON.stringify({status:'PREPARED_INTERNAL',plan}));process.exit(0);}
 if(mode==='verify'){await h.verifyD1CourseContent(source,target,snapshotAt);const marker=await h.prepareVerifiedD1CourseMarker(source,target,snapshotAt);console.log(JSON.stringify({status:'VERIFIED_INTERNAL',marker}));process.exit(0);}
 const mapped=h.publishedLessonsOnly(h.mergeOfficialCourseMetadata(h.normalizeCourseText(h.normalizeCourseTiming(h.mapDbCourseToCourse(source)))));
 const lessons=mapped.modules.flatMap(m=>m.lessons);
 const duplicateOrder=(items)=>items.length!==new Set(items.map(x=>x.sort_order??0)).size;
 console.log(JSON.stringify({status:'TESTED_PREPARE_ONLY',courses:1,sourceModules:source.course_modules.length,sourceLessons:source.course_modules.flatMap(m=>m.lessons).length,publishedModules:mapped.modules.length,publishedLessons:lessons.length,resources:lessons.reduce((n,l)=>n+(l.resources?.length??0),0),documentBytes:Buffer.byteLength(plan.params[3]),roundtrip:true,requiredLessonPresent:lessons.some(l=>l.id==='47da65a2-c6c6-4a21-a109-c1feb1d64c8f'),ambiguousSourceOrder:duplicateOrder(source.course_modules)||source.course_modules.some(m=>duplicateOrder(m.lessons)),ambiguousPublishedOrder:mapped.modules.length!==new Set(mapped.modules.map(m=>m.order)).size||mapped.modules.some(m=>m.lessons.length!==new Set(m.lessons.map(l=>l.order)).size),limits:'No remote D1 import, authorization, rendering or streaming claim'}));
}catch{console.log(JSON.stringify({status:'FAILED',reason:'Course source/identity/content verification failed; private source withheld'}));process.exitCode=1;}
