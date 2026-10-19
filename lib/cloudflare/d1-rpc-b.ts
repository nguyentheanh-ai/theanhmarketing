// D1 ports of the Supabase B RPCs used by the student app (course editor with
// append-only revision history, Ads OS workspace/automation). Version checks
// live in each UPDATE's WHERE clause plus the SQLite version-guard triggers.
import {pgTimestamp,ShimFailure,type D1PostgrestClient,type ShimAuth,type ShimRow,type ShimRpc} from './d1-postgrest';

const T=(t:string)=>`"b_public__${t}"`;
const iso=(ms:number)=>pgTimestamp(new Date(ms).toISOString())!;
const fail=(msg:string,code:string)=>new ShimFailure(msg,code);
const s=(v:unknown)=>v===null||v===undefined?'':String(v);
const parse=(v:unknown)=>{if(typeof v!=='string')return v??null;try{return JSON.parse(v);}catch{return v;}};
const bool=(v:unknown)=>v===1||v===true||v==='1'||v==='true';
// jsonb "is distinct from": semantic (key-order independent) equality.
function canon(v:unknown):string{if(v===null||v===undefined)return 'null';if(Array.isArray(v))return '['+v.map(canon).join(',')+']';if(typeof v==='object')return '{'+Object.keys(v as object).sort().map(k=>JSON.stringify(k)+':'+canon((v as ShimRow)[k])).join(',')+'}';return JSON.stringify(v);}
const same=(a:unknown,b:unknown)=>canon(a)===canon(b);
async function one(client:D1PostgrestClient,sql:string,p:(string|number|null)[]){return (await client.query(sql,p))[0]??null;}

async function assertWriter(client:D1PostgrestClient,auth:ShimAuth|null,actor:unknown){
 const isAdmin=async(id:string)=>!!await one(client,`SELECT 1 FROM ${T('profiles')} WHERE id=?1 AND role='admin' AND status='active'`,[id]);
 if(!auth){ // service_role
  if(!actor)throw fail('service role course actor is required','42501');
  if(!await isAdmin(s(actor)))throw fail('service role course actor must be an active admin','42501');
  return s(actor);
 }
 if(auth.role==='authenticated'&&actor&&s(actor)!==auth.uid)throw fail('authenticated course actor spoofing is forbidden','42501');
 if(auth.role!=='authenticated'||!auth.uid||!await isAdmin(auth.uid))throw fail('course editing requires an active course administrator','42501');
 return auth.uid;
}
async function appendRevision(client:D1PostgrestClient,courseId:string,type:string,entityId:string,prev:unknown,next:unknown,action:string,source:string|null,actor:string,now:number){
 await client.query(`INSERT INTO ${T('course_revisions')}(id,sequence,course_id,entity_type,entity_id,previous_value,next_value,action,source_revision_id,actor_id,transaction_id,created_at)
  VALUES(?1,(SELECT coalesce(max(sequence),0)+1 FROM ${T('course_revisions')}),?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,[crypto.randomUUID(),courseId,type,entityId,JSON.stringify(prev),JSON.stringify(next),action,source,actor,crypto.randomUUID(),iso(now)]);
}
const ENTITY:Record<string,{table:string;course:string;fields:Record<string,[string,'text'|'json']>}>={
 course:{table:'courses',course:'c.id',fields:{title:['title','text'],description:['description','text']}},
 chapter:{table:'course_chapters',course:'c.course_id',fields:{title:['title','text'],description:['description','text']}},
 module:{table:'course_modules',course:'ch.course_id',fields:{title:['title','text'],objective:['objective','text'],duration:['duration','text'],status:['status','text']}},
 lesson:{table:'course_lessons',course:'ch.course_id',fields:{title:['title','text'],summary:['summary','text'],status:['status','text']}},
 assignment:{table:'course_assignments',course:'ch.course_id',fields:{title:['title','text'],instructions:['instructions_json','json'],inputs:['inputs_json','json'],deliverables:['deliverables_json','json'],rubric:['rubric_json','json'],reviewQuestions:['review_questions_json','json'],instructorNote:['instructor_note','text'],status:['status','text']}},
 appendix:{table:'course_appendices',course:'c.course_id',fields:{title:['title','text'],content:['content_json','json'],status:['status','text']}},
};
const JOIN:Record<string,string>={module:`JOIN ${T('course_chapters')} ch ON ch.id=c.chapter_id`,lesson:`JOIN ${T('course_modules')} m ON m.id=c.module_id JOIN ${T('course_chapters')} ch ON ch.id=m.chapter_id`,assignment:`JOIN ${T('course_modules')} m ON m.id=c.module_id JOIN ${T('course_chapters')} ch ON ch.id=m.chapter_id`};
async function entitySnapshot(client:D1PostgrestClient,kind:string,id:string){
 const e=ENTITY[kind];if(!e)throw fail('unsupported editable course entity kind','22023');
 const r=await one(client,`SELECT c.*,${e.course} AS __course FROM ${T(e.table)} c ${JOIN[kind]??''} WHERE c.id=?1`,[id]);
 if(!r)throw fail('course entity not found','P0002');
 const snap:ShimRow={kind,id:r.id,courseId:r.__course};
 for(const [k,[col,t]] of Object.entries(e.fields))snap[k]=t==='json'?parse(r[col]):r[col]??null;
 snap.version=Number(r.version);return snap;
}
async function restoreEntity(client:D1PostgrestClient,kind:string,id:string,expected:number,snap:ShimRow){
 if(s(snap.kind)!==kind||s(snap.id)!==id)throw fail('course entity snapshot mismatch','40001');
 const e=ENTITY[kind];if(!e)throw fail('unsupported editable course entity kind','22023');
 const cols=Object.entries(e.fields),params:(string|number|null)[]=[id,expected];
 const set=cols.map(([k,[col,t]],i)=>{const v=snap[k];params.push(t==='json'?(v===undefined||v===null?null:JSON.stringify(v)):(v===undefined||v===null?null:String(v)));return `"${col}"=?${i+3}`;});
 const r=await client.query(`UPDATE ${T(e.table)} SET ${set.join(',')},version=version+1,updated_at=?${params.length+1} WHERE id=?1 AND version=?2 RETURNING id`,[...params,iso(Date.now())]).catch(e2=>{if(/stale|version/i.test(String(e2)))throw fail('stale course entity version','40001');throw e2;});
 if(!r.length)throw fail('stale course entity version','40001');
 return entitySnapshot(client,kind,id);
}
async function blockCourse(client:D1PostgrestClient,blockId:string){const r=await one(client,`SELECT ch.course_id FROM ${T('course_blocks')} b JOIN ${T('course_lessons')} l ON l.id=b.lesson_id JOIN ${T('course_modules')} m ON m.id=l.module_id JOIN ${T('course_chapters')} ch ON ch.id=m.chapter_id WHERE b.id=?1`,[blockId]);return r?s(r.course_id):null;}
const blockRow=async(client:D1PostgrestClient,id:string)=>{const r=await client.from('course_blocks').select('*').eq('id',id).maybeSingle();if(r.error)throw new ShimFailure(r.error.message,r.error.code);return r.data as ShimRow|null;};
const noteRow=async(client:D1PostgrestClient,id:string)=>{const r=await client.from('course_notes').select('*').eq('id',id).maybeSingle();if(r.error)throw new ShimFailure(r.error.message,r.error.code);return r.data as ShimRow|null;};
const noteSnap=(n:ShimRow)=>({id:n.id,courseId:n.course_id,lessonId:n.lesson_id??null,authorId:n.author_id,content:n.content_json,position:n.position_json,pinned:n.pinned,version:n.version,deleted:false});
const noteTomb=(id:string,course:string,version:number)=>({id,courseId:course,version,deleted:true});
const imgSnap=(b:ShimRow,course:string)=>({kind:'imageBlock',id:b.id,courseId:course,lessonId:b.lesson_id,content:b.content_json,sortOrder:b.sort_order,version:b.version,deleted:false});
const imgTomb=(id:string,course:string,lesson:string,version:number)=>({kind:'imageBlock',id,courseId:course,lessonId:lesson,version,deleted:true});
async function selectRevision(client:D1PostgrestClient,id:string){
 const r=await client.from('course_revisions').select('*').eq('id',id).maybeSingle();if(r.error)throw new ShimFailure(r.error.message,r.error.code);
 if(!r.data)throw fail('course revision not found','P0001');const sel=r.data as ShimRow;
 const latest=await one(client,`SELECT id FROM ${T('course_revisions')} WHERE entity_type=?1 AND entity_id=?2 ORDER BY sequence DESC LIMIT 1`,[s(sel.entity_type),s(sel.entity_id)]);
 if(s(latest?.id)!==s(sel.id))throw fail('revision is not the latest entity revision','40001');return sel;
}
function checkDirection(sel:ShimRow,dir:string,undoable:string[]){
 if(dir==='undo'&&!undoable.includes(s(sel.action)))throw fail('revision cannot be undone','40001');
 if(dir==='redo'&&sel.action!=='undo')throw fail('redo requires latest undo revision','40001');
 if(dir!=='undo'&&dir!=='redo')throw fail('invalid revision direction','P0001');
}
async function applyRevision(client:D1PostgrestClient,auth:ShimAuth|null,id:string,dir:string,actorIn:unknown,now:number){
 const actor=await assertWriter(client,auth,actorIn);
 const sel=await selectRevision(client,id),next=sel.next_value as ShimRow,prev=sel.previous_value as ShimRow,kind=s(next?.kind);
 const course=s(sel.course_id),entity=s(sel.entity_id);
 if(kind==='imageBlock'){
  checkDirection(sel,dir,['create','redo']);
  const b=await blockRow(client,entity),current=b?imgSnap(b,course):next;
  if(!same(current,next))throw fail('current snapshot does not match revision head','40001');
  const nextVersion=Number((current as ShimRow).version)+1;let applied:unknown,saved:ShimRow|null=null;
  if(bool(prev?.deleted)){
   if(!b)throw fail('image block already deleted','40001');
   await client.query(`UPDATE ${T('course_assets')} SET block_id=NULL WHERE block_id=?1`,[entity]);
   const d=await client.query(`DELETE FROM ${T('course_blocks')} WHERE id=?1 AND version=?2 RETURNING id`,[entity,Number(b.version)]);if(!d.length)throw fail('stale course entity version','40001');
   applied=imgTomb(entity,course,s((current as ShimRow).lessonId),nextVersion);
  }else{
   const ins=await client.from('course_blocks').insert({id:entity,lesson_id:prev.lessonId,block_type:'image',content_json:prev.content,origin:'admin',needs_review:false,sort_order:prev.sortOrder,version:nextVersion}).select('*').single();
   if(ins.error)throw new ShimFailure(ins.error.message,ins.error.code);saved=ins.data as ShimRow;
   const asset=s((prev.content as ShimRow)?.assetId);
   const up=await client.query(`UPDATE ${T('course_assets')} SET block_id=?1 WHERE id=?2 AND course_id=?3 AND block_id IS NULL RETURNING id`,[entity,asset,course]);
   if(!up.length)throw fail('course asset cannot be reattached','40001');
   applied=imgSnap(saved,course);
  }
  await appendRevision(client,course,'block',entity,current,applied,dir,s(sel.id),actor,now);
  return {entity_type:'block',kind:'imageBlock',entity:saved};
 }
 if(ENTITY[kind]){
  checkDirection(sel,dir,['edit','redo']);
  const current=await entitySnapshot(client,kind,entity);
  if(!same(current,next))throw fail('current snapshot does not match revision head','40001');
  const applied=await restoreEntity(client,kind,entity,Number(current.version),prev);
  await appendRevision(client,course,s(sel.entity_type),entity,current,applied,dir,s(sel.id),actor,now);
  return {entity_type:sel.entity_type,kind,entity:applied};
 }
 checkDirection(sel,dir,['edit','create','delete','redo']);
 if(sel.entity_type==='block'){
  if(Number(next?.version)!==Number(prev?.version)+1)throw fail('invalid revision version chain','40001');
  const b=await blockRow(client,entity);if(!b||await blockCourse(client,entity)!==course)throw fail('revision entity ownership mismatch','40001');
  const current={content:b.content_json,version:b.version};
  if(!same(current,next))throw fail('current snapshot does not match revision head','40001');
  const up=await client.from('course_blocks').update({content_json:prev.content,version:Number(b.version)+1}).eq('id',entity).eq('version',Number(b.version)).select('*');
  if(up.error)throw new ShimFailure(up.error.message,up.error.code);const saved=(up.data as ShimRow[])[0];if(!saved)throw fail('stale course entity version','40001');
  await appendRevision(client,course,'block',entity,current,{content:saved.content_json,version:saved.version},dir,s(sel.id),actor,now);
  return {entity_type:'block',entity:saved};
 }
 if(sel.entity_type==='note'){
  if(Number(next?.version)!==Number(prev?.version)+1||s(next?.id)!==entity||s(prev?.id)!==entity||s(next?.courseId)!==course||s(prev?.courseId)!==course)throw fail('invalid note revision chain','40001');
  const pd=bool(prev?.deleted),nd=bool(next?.deleted);
  if(sel.action==='create'&&(!pd||nd))throw fail('invalid note create revision','40001');
  if(sel.action==='delete'&&(pd||!nd))throw fail('invalid note delete revision','40001');
  if(sel.action==='edit'&&(pd||nd))throw fail('invalid note edit revision','40001');
  const n=await noteRow(client,entity);let current:unknown;
  if(n)current=noteSnap(n);else{current=next;if(!nd)throw fail('current snapshot does not match revision head','40001');}
  if(!same(current,next))throw fail('current snapshot does not match revision head','40001');
  const cv=Number((current as ShimRow).version),nv=cv+1;let applied:unknown,saved:ShimRow|null=null;
  if(pd){
   if(!n)throw fail('note already deleted','40001');
   const d=await client.query(`DELETE FROM ${T('course_notes')} WHERE id=?1 AND version=?2 RETURNING id`,[entity,cv]);if(!d.length)throw fail('stale course entity version','40001');
   applied=noteTomb(entity,course,nv);
  }else{
   if(s(prev.courseId)!==course||s(prev.id)!==entity)throw fail('revision entity ownership mismatch','40001');
   const values={lesson_id:s(prev.lessonId)||null,content_json:prev.content,position_json:prev.position,pinned:bool(prev.pinned),version:nv};
   if(!n){const ins=await client.from('course_notes').insert({id:entity,course_id:course,author_id:prev.authorId,...values}).select('*').single();if(ins.error)throw new ShimFailure(ins.error.message,ins.error.code);saved=ins.data as ShimRow;}
   else{const up=await client.from('course_notes').update(values).eq('id',entity).eq('version',cv).select('*');if(up.error)throw new ShimFailure(up.error.message,up.error.code);saved=(up.data as ShimRow[])[0]??null;if(!saved)throw fail('stale course entity version','40001');}
   applied=noteSnap(saved);
  }
  await appendRevision(client,course,'note',entity,current,applied,dir,s(sel.id),actor,now);
  return {entity_type:'note',entity:saved};
 }
 throw fail('unsupported revision entity type','P0001');
}

export const supabaseBRpcs:Record<string,ShimRpc>={
 update_course_entity:async(a,{client,auth,now})=>{
  const actor=await assertWriter(client,auth,a.p_actor_id),kind=s(a.p_entity_kind),id=s(a.p_entity_id),patch=a.p_patch as ShimRow;
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length)throw fail('course entity patch must be a non-empty object','22023');
  const e=ENTITY[kind];const bad=Object.keys(patch).filter(k=>!e||!(k in e.fields));
  if(bad.length)throw fail(`unsupported course entity patch fields: {${bad.join(',')}}`,'22023');
  const previous=await entitySnapshot(client,kind,id);
  if(Number(previous.version)!==Number(a.p_expected_version))throw fail('stale course entity version','40001');
  const candidate={...previous,...patch};
  if('title' in candidate&&!s(candidate.title).trim())throw fail('course entity title cannot be empty','22023');
  if(kind==='assignment'&&['instructions','inputs','deliverables','rubric','reviewQuestions'].some(k=>candidate[k]==null))throw fail('assignment sections cannot be null','22023');
  if(kind==='appendix'&&candidate.content==null)throw fail('appendix content cannot be null','22023');
  const next=await restoreEntity(client,kind,id,Number(a.p_expected_version),candidate);
  const type=['module','lesson','assignment'].includes(kind)?kind:'course';
  await appendRevision(client,s(next.courseId),type,id,previous,next,'edit',null,actor,now());
  return {kind,entity:next};
 },
 update_course_block:async(a,{client,auth,now})=>{
  const actor=await assertWriter(client,auth,a.p_actor_id),id=s(a.p_block_id),v=Number(a.p_expected_version);
  const b=await blockRow(client,id);if(!b||Number(b.version)!==v)throw fail('stale course entity version','40001');
  const course=await blockCourse(client,id);if(!course)throw fail('course block ownership is missing','P0001');
  const up=await client.from('course_blocks').update({content_json:a.p_content,version:v+1}).eq('id',id).eq('version',v).select('*');
  if(up.error)throw new ShimFailure(up.error.message,up.error.code);const saved=(up.data as ShimRow[])[0];if(!saved)throw fail('stale course entity version','40001');
  await appendRevision(client,course,'block',id,{content:b.content_json,version:b.version},{content:saved.content_json,version:saved.version},'edit',null,actor,now());
  return saved;
 },
 create_course_note:async(a,{client,auth,now})=>{
  const actor=await assertWriter(client,auth,a.p_actor_id),id=crypto.randomUUID();
  const ins=await client.from('course_notes').insert({id,course_id:a.p_course_id,lesson_id:a.p_lesson_id??null,author_id:actor,content_json:a.p_content,position_json:a.p_position,pinned:a.p_pinned,version:1}).select('*').single();
  if(ins.error)throw new ShimFailure(ins.error.message,ins.error.code);const saved=ins.data as ShimRow;
  await appendRevision(client,s(a.p_course_id),'note',id,noteTomb(id,s(a.p_course_id),0),noteSnap(saved),'create',null,actor,now());
  return saved;
 },
 update_course_note:async(a,{client,auth,now})=>{
  const actor=await assertWriter(client,auth,a.p_actor_id),id=s(a.p_note_id),v=Number(a.p_expected_version);
  const n=await noteRow(client,id);if(!n||Number(n.version)!==v)throw fail('stale course entity version','40001');
  const up=await client.from('course_notes').update({lesson_id:a.p_lesson_id??null,content_json:a.p_content,position_json:a.p_position,pinned:a.p_pinned,version:v+1}).eq('id',id).eq('version',v).select('*');
  if(up.error)throw new ShimFailure(up.error.message,up.error.code);const saved=(up.data as ShimRow[])[0];if(!saved)throw fail('stale course entity version','40001');
  await appendRevision(client,s(n.course_id),'note',id,noteSnap(n),noteSnap(saved),'edit',null,actor,now());
  return saved;
 },
 delete_course_note:async(a,{client,auth,now})=>{
  const actor=await assertWriter(client,auth,a.p_actor_id),id=s(a.p_note_id),v=Number(a.p_expected_version);
  const n=await noteRow(client,id);if(!n||Number(n.version)!==v)throw fail('stale course entity version','40001');
  const d=await client.query(`DELETE FROM ${T('course_notes')} WHERE id=?1 AND version=?2 RETURNING id`,[id,v]);if(!d.length)throw fail('stale course entity version','40001');
  await appendRevision(client,s(n.course_id),'note',id,noteSnap(n),noteTomb(id,s(n.course_id),v+1),'delete',null,actor,now());
  return n;
 },
 undo_course_revision:async(a,{client,auth,now})=>applyRevision(client,auth,s(a.p_revision_id),'undo',a.p_actor_id,now()),
 redo_course_revision:async(a,{client,auth,now})=>applyRevision(client,auth,s(a.p_revision_id),'redo',a.p_actor_id,now()),
 create_course_image_block:async(a,{client,auth,now})=>{
  const actor=await assertWriter(client,auth,a.p_actor_id),lesson=s(a.p_lesson_id),assetId=s(a.p_asset_id);
  const owner=await one(client,`SELECT ch.course_id FROM ${T('course_lessons')} l JOIN ${T('course_modules')} m ON m.id=l.module_id JOIN ${T('course_chapters')} ch ON ch.id=m.chapter_id WHERE l.id=?1`,[lesson]);
  if(!owner)throw fail('course lesson not found','P0002');const course=s(owner.course_id);
  const asset=await one(client,`SELECT * FROM ${T('course_assets')} WHERE id=?1`,[assetId]);
  if(!asset||s(asset.course_id)!==course||s(asset.uploaded_by)!==actor||asset.block_id!=null)throw fail('course asset cannot be attached to this lesson','42501');
  const next=Number((await one(client,`SELECT coalesce(max(sort_order),-1)+1 AS n FROM ${T('course_blocks')} WHERE lesson_id=?1`,[lesson]))?.n??0);
  const ins=await client.from('course_blocks').insert({lesson_id:lesson,block_type:'image',content_json:{assetId,altText:a.p_alt_text??null},origin:'admin',needs_review:false,sort_order:next,version:1}).select('*').single();
  if(ins.error)throw new ShimFailure(ins.error.message,ins.error.code);const saved=ins.data as ShimRow;
  const claimed=await client.query(`UPDATE ${T('course_assets')} SET block_id=?1 WHERE id=?2 AND block_id IS NULL RETURNING id`,[s(saved.id),assetId]);
  if(!claimed.length){await client.query(`DELETE FROM ${T('course_blocks')} WHERE id=?1`,[s(saved.id)]);throw fail('course asset cannot be attached to this lesson','42501');}
  await appendRevision(client,course,'block',s(saved.id),imgTomb(s(saved.id),course,lesson,0),imgSnap(saved,course),'create',null,actor,now());
  return saved;
 },
 ads_os_ensure_workspace:async(a,{client,now})=>{
  const user=s(a.p_user);
  if(!await one(client,`SELECT 1 FROM ${T('profiles')} WHERE id=?1 AND status='active'`,[user]))throw fail('active profile required','P0001');
  const w=await one(client,`INSERT INTO ${T('ads_os_workspaces')}(id,owner_id,name,created_at) VALUES(?1,?2,'Workspace của tôi',?3) ON CONFLICT(owner_id) DO UPDATE SET owner_id=excluded.owner_id RETURNING id`,[crypto.randomUUID(),user,iso(now())]);
  await client.query(`INSERT INTO ${T('ads_os_memberships')}(workspace_id,user_id,role) VALUES(?1,?2,'owner') ON CONFLICT(workspace_id,user_id) DO NOTHING`,[s(w?.id),user]);
  return w?.id??null;
 },
 ads_os_claim_automation_rules:async(a,{client,now})=>{
  const t=now(),limit=Math.max(1,Math.min(Number(a.p_limit)||1,10));
  const rows=await client.query(`UPDATE ${T('ads_os_automation_rules')} SET lease_until=?2,next_run_at=?3 WHERE id IN (SELECT id FROM ${T('ads_os_automation_rules')} WHERE enabled=1 AND next_run_at<=?1 AND (lease_until IS NULL OR lease_until<?1) ORDER BY next_run_at LIMIT ?4) RETURNING *`,[iso(t),iso(t+600_000),iso(t+3600_000),limit]);
  return rows.map(r=>({...r,enabled:bool(r.enabled),definition:parse(r.definition)}));
 },
};
