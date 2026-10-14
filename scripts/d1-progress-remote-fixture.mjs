// Generates ONLY synthetic QA requests for the authorized staging D1 API.
// Contains no credential and never sends requests itself.
import { build } from "esbuild";
const bundle=await build({entryPoints:["lib/cloudflare/d1-lesson-progress.ts"],bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
const {buildD1LessonCompletionBatch}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const now=Date.now(),stamp=new Date(now).toISOString();
const input={userId:id(1),email:"qa@example.invalid",courseSlug:"qa-course",lessonId:id(5),lessonTitle:"Bài thử",operationId:id(10)};
const generate=(patch={})=>buildD1LessonCompletionBatch({...input,...patch},{now});
const first=generate();
const payload={stamp,sqls:first.map(x=>x.sql),params:{
 first:first[0].params,
 second:generate({lessonId:id(6),operationId:id(11)})[0].params,
 undo:generate({completed:false,operationId:id(12)})[0].params,
 denied:generate({userId:id(2),email:"other@example.invalid",operationId:id(13)})[0].params,
 fault:generate({operationId:id(14)})[0].params,
}};
process.stdout.write(JSON.stringify(payload));
