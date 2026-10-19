// Student presence on native D1 (CF_NATIVE_DATA_MODE=d1). No-op otherwise.
import {getNativeRequestContext} from './native-request-context';

type Stmt={bind:(...v:unknown[])=>{all:()=>Promise<{results:Record<string,unknown>[]}>;run:()=>Promise<unknown>}};
type D1={prepare:(sql:string)=>Stmt};
function db():D1|null{
 const env=getNativeRequestContext()?.env as {CF_NATIVE_DATA_MODE?:string;NATIVE_DATA_DB?:D1}|undefined;
 return env?.CF_NATIVE_DATA_MODE==='d1'&&env.NATIVE_DATA_DB?env.NATIVE_DATA_DB:null;
}
export const PRESENCE_WINDOW_MS=5*60_000;
// Only first-party student paths are stored; query strings/fragments never are.
export function cleanPresencePath(value:unknown){
 const raw=typeof value==='string'?value.split(/[?#]/)[0]:'';
 return /^\/(dashboard|learn|tai-khoan|thu-vien|doi-mat-khau)(\/[A-Za-z0-9._~%-]*)*$/.test(raw)&&raw.length<=200?raw:'/dashboard';
}
export async function recordStudentPresence(input:{userId:string;email:string;name?:string|null;path:unknown}){
 const d=db();if(!d)return false;
 const now=new Date().toISOString();
 await d.prepare(`INSERT INTO d1_student_presence(user_id,email,display_name,path,last_seen_at,first_seen_at) VALUES(?1,?2,?3,?4,?5,?5)
  ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,path=excluded.path,last_seen_at=excluded.last_seen_at,
  first_seen_at=CASE WHEN d1_student_presence.last_seen_at<?6 THEN excluded.last_seen_at ELSE d1_student_presence.first_seen_at END`)
  .bind(input.userId,input.email.slice(0,320),(input.name??'').slice(0,120)||null,cleanPresencePath(input.path),now,new Date(Date.now()-PRESENCE_WINDOW_MS).toISOString()).run();
 return true;
}
export async function readOnlineStudents(limit=50){
 const d=db();if(!d)return null;
 const since=new Date(Date.now()-PRESENCE_WINDOW_MS).toISOString(),today=new Date(Date.now()-86400000).toISOString();
 const rows=(await d.prepare(`SELECT user_id,email,display_name,path,last_seen_at,first_seen_at FROM d1_student_presence WHERE last_seen_at>=?1 ORDER BY last_seen_at DESC LIMIT ?2`).bind(since,Math.min(Math.max(limit,1),200)).all()).results;
 const day=(await d.prepare(`SELECT count(*) AS n FROM d1_student_presence WHERE last_seen_at>=?1`).bind(today).all()).results[0];
 return {online:rows.length,activeLast24h:Number(day?.n??0),windowMinutes:PRESENCE_WINDOW_MS/60000,students:rows.map(r=>({email:String(r.email),name:r.display_name?String(r.display_name):null,path:String(r.path),lastSeenAt:String(r.last_seen_at),sessionStartedAt:String(r.first_seen_at)}))};
}
