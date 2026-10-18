// Source identities/payloads are supplied through a captured stdin pipe only.
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
try{
 let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>2*1024*1024)throw Error('Input too large');}
 const {payload,qa,mode='prepare',targetCourse,targetRows}=JSON.parse(input);
 if(!['prepare','plan','verify','reverify','refresh'].includes(mode))throw Error('Invalid preparation mode');
 const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-qa-learning-import";export * from "./lib/cloudflare/d1-course-content";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
 const h=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 const plan=await h.prepareD1QaLearningImport(payload,qa);
 if(mode==='plan'){await h.verifyD1CourseContent(payload.course,targetCourse);console.log(JSON.stringify({status:'PREPARED_INTERNAL',plan}));process.exit(0);}
 if(mode==='refresh'){await h.verifyD1CourseContent(payload.course,targetCourse);const refresh=await h.prepareD1QaLearningProgressRefresh(payload,qa,targetRows);console.log(JSON.stringify({status:'PREPARED_QA_PROGRESS_REFRESH_INTERNAL',...refresh}));process.exit(0);}
 if(mode==='reverify'){await h.verifyD1CourseContent(payload.course,targetCourse);const verified=await h.prepareD1QaLearningVerification(payload,qa,targetRows);console.log(JSON.stringify({status:'PREPARED_QA_VERIFICATION_INTERNAL',...verified}));process.exit(0);}
 if(mode==='verify'){const readback=h.verifyD1QaLearningRows(plan.expectedRows,targetRows);console.log(JSON.stringify({status:'VERIFIED_REMOTE_ROWS',readback}));process.exit(0);}
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON');
  for(const name of ['d1-lms-compatibility-prototype.sql','d1-course-access-source-prototype.sql','d1-qa-learning-source.sql'])db.exec(readFileSync('scripts/'+name,'utf8'));
  db.prepare('INSERT INTO d1_access_users VALUES(?,?,NULL)').run(qa.userId,qa.email.trim().toLowerCase());
  db.exec('BEGIN');for(const statement of plan.statements)db.prepare(statement.sql).run(...statement.params);db.exec('COMMIT');
  if(db.prepare('PRAGMA foreign_key_check').all().length!==0)throw Error('Foreign key mismatch');
  const targets=Object.fromEntries(Object.keys(plan.expectedRows).map(table=>[table,db.prepare('SELECT * FROM '+table).all()]));
  const readback=h.verifyD1QaLearningRows(plan.expectedRows,targets);
  const raw=db.prepare('SELECT source_document,status FROM d1_qa_learning_source WHERE user_id=?').get(qa.userId);
  if(raw.status!=='pending'||db.prepare('SELECT status FROM d1_access_sync_state').get().status!=='importing')throw Error('Import gate mismatch');
  const document=JSON.parse(raw.source_document);
  // Compare full original records, including microsecond dates and columns not
  // yet read by the normalized LMS slice. No private values leave this process.
  for(const table of ['contacts','enrollments','progress','orders','overrides']){
   const expected=payload[table],actual=document[table];
   if(!isDeepStrictEqual(actual,expected))throw Error('Source archive roundtrip mismatch');
  }
  console.log(JSON.stringify({status:'TESTED_QA_LEARNING_PREPARE',summary:plan.summary,statements:plan.statements.length,sourceSnapshotAt:plan.snapshot,localSqliteExecution:true,foreignKeyViolations:0,fullSourceArchiveRoundtrip:true,readback,marker:'importing',limits:plan.limits}));
 }finally{db.close();}
}catch(error){const allowed=new Set(['Only source QA progress may refresh','Only source QA progress may refresh: contacts','Only source QA progress may refresh: enrollments','Only source QA progress may refresh: orders','Only source QA progress may refresh: overrides','QA progress identity drift','QA override overwrite or removal refused','QA enrollment authority drift','QA enrollment clock regression','QA enrollment metadata authority drift','Source QA progress clock regression','One existing QA progress required','QA target fields differ from source plan','Invalid QA progress status','Missing QA progress timestamp','Foreign QA progress','Foreign QA enrollment','Foreign QA enrollment user','Foreign QA enrollment contact','Foreign QA enrollment course','Invalid historical QA marker','Genuine fresh QA snapshot required','Source records must contain exact required fields']);console.log(JSON.stringify({status:'FAILED',reason:'QA learning source preparation failed; private source withheld',diagnostic:allowed.has(error?.message)?error.message:'PRIVATE_DETAIL_WITHHELD',...(Array.isArray(error?.changedFields)?{changedFields:error.changedFields,addedColumns:error.addedColumns??[],removedColumns:error.removedColumns??[]}:{})}));process.exitCode=1;}
