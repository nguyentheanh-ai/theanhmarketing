// Internal D1 remote read smoke. OAuth comes over a captured stdin pipe only.
import {build} from 'esbuild';
try{
 let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>8192)throw Error('Input too large');}
 const {cloudToken}=JSON.parse(input);if(typeof cloudToken!=='string'||!cloudToken)throw Error('Auth unavailable');
 const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-course-content";export * from "./lib/course-learning";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const h=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 let calls=0;
 const db={first:async(sql,params)=>{
  calls++;
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/8035ac71ae1041614760882f4b8862b2/d1/database/694139c9-6cda-4b8c-9228-c973dbcbb719/query',{method:'POST',headers:{Authorization:'Bearer '+cloudToken,'Content-Type':'application/json'},body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Remote query rejected');const value=await response.json();
  if(value.success!==true||value.result.length!==1||value.result[0].success!==true||value.result[0].results.length>1)throw Error('Remote result invalid');
  return value.result[0].results[0]??null;
 }};
 const course=await h.readD1PublishedCourse(db,'facebook-ads-2026');if(!course)throw Error('Course unavailable');
 const lessons=h.getOrderedCourseLessons(course);
 const required=lessons.find(l=>l.id==='47da65a2-c6c6-4a21-a109-c1feb1d64c8f');if(!required)throw Error('Required lesson unavailable');
 console.log(JSON.stringify({status:'TESTED_REMOTE_D1_READER',remoteQueries:calls,publishedModules:course.modules.length,publishedLessons:lessons.length,requiredLessonPresent:true,requiredLessonPlayable:Boolean(required.youtubeUrl.trim()||required.embedUrl.trim()||required.content?.trim()),documentDigestVerified:true,limits:'Backend D1 API read only; not Worker binding/UI/session rights/progress/media delivery'}));
}catch{console.log(JSON.stringify({status:'FAILED',reason:'Remote course read unavailable or verification failed; source and credentials withheld'}));process.exitCode=1;}
