// Synthetic QA only. Generates SQL requests; never connects to a database.
import { build } from "esbuild";
const bundle=await build({entryPoints:["scripts/d1-parity-entry.ts"],bundle:true,platform:"node",format:"esm",write:false,logLevel:"silent"});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
if(process.argv[2]==="--query"){
 process.stdout.write(JSON.stringify({sql:api.D1_STUDENT_ACCESS_SQL}));
}else{
 const source=JSON.parse(process.argv[2]);
 // All rows must have been obtained from the isolated, empty-before-seed QA DB.
 for(const rows of [JSON.parse(source.row.orders_json),JSON.parse(source.row.leads_json)]){
  if(rows.some(x=>x.email!=="qa@example.invalid"))throw new Error("Non-synthetic fixture rejected");
 }
 const now=Date.parse(source.stamp),read=async()=>source.row;
 const access=await api.readD1StudentCourseAccess(read,{id:id(1),email:"qa@example.invalid"},{now});
 const second=process.argv[3]==="--second";
 const plan=await api.prepareD1LegacyAwareLessonCompletionBatch(read,{userId:id(1),email:"qa@example.invalid",courseSlug:"qa-course",
  lessonId:id(second?6:5),lessonTitle:"Fixture",operationId:id(second?11:10)},{now});
 process.stdout.write(JSON.stringify({sqls:plan.map(x=>x.sql),params:plan[0].params,
  access:{ownedSlugs:access.ownedSlugs,completedLessonIds:access.completedLessonIds}}));
}
