// D1 ports of support booking RPCs. The slot check and insert are one
// statement (D1 serializes writes), replacing the per-day advisory lock.
import {pgTimestamp,ShimFailure,type D1PostgrestClient,type ShimRpc} from './d1-postgrest';

const T='"a_public__support_bookings"',iso=(ms:number)=>pgTimestamp(new Date(ms).toISOString())!;
const fail=(m:string)=>new ShimFailure(m,'P0001');
async function readBooking(client:D1PostgrestClient,id:string){const r=await client.from('support_bookings').select('*').eq('id',id).single();if(r.error)throw new ShimFailure(r.error.message,r.error.code);return r.data;}
const vnDate=(ms:number)=>new Date(ms+7*3600_000).toISOString().slice(0,10);
const addDays=(d:string,n:number)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);

export const supportRpcs:Record<string,ShimRpc>={
 reserve_support_booking_v3:async(a,{client,now})=>{
  const type=String(a.p_booking_type??''),duration=Number(a.p_duration_minutes);
  if(!['student','consultation'].includes(type)||![30,60,90,120].includes(duration)||(type==='consultation'&&duration<60))throw fail('SUPPORT_DURATION_INVALID');
  const t=now(),today=vnDate(t),date=String(a.p_appointment_date??'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<addDays(today,3)||date>addDays(today,30)||new Date(date+'T00:00:00Z').getUTCDay()===0)throw fail('SUPPORT_DATE_INVALID');
  const time=String(a.p_appointment_time??''),m=time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  const start=m?Number(m[1])*60+Number(m[2]):-1,end=start+duration;
  const startsAt=a.p_starts_at?pgTimestamp(a.p_starts_at):null,endsAt=a.p_ends_at?pgTimestamp(a.p_ends_at):null;
  const expectedStart=m?iso(Date.parse(`${date}T${m[1]}:${m[2]}:00+07:00`)):null;
  if(!m||(m[3]&&m[3]!=='00')||start%30!==0||!((start>=540&&end<=720)||(start>=810&&end<=1230))||startsAt!==expectedStart||endsAt!==iso(Date.parse(startsAt!)+duration*60000))throw fail('SUPPORT_TIME_INVALID');
  const stamp=iso(t),id=crypto.randomUUID();
  await client.query(`UPDATE ${T} SET status='cancelled',updated_at=?2 WHERE appointment_date=?1 AND status='held' AND hold_expires_at<=?2`,[date,stamp]);
  const ins=await client.query(`INSERT INTO ${T}(id,customer_name,email,phone,topic,note,appointment_date,appointment_time,starts_at,ends_at,hold_expires_at,duration_minutes,booking_type,amount,status,created_at,updated_at)
   SELECT ?1,?2,lower(?3),?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,500000,'held',?14,?14
   WHERE NOT EXISTS(SELECT 1 FROM "a_public__support_busy_dates" WHERE busy_date=?7)
   AND NOT EXISTS(SELECT 1 FROM ${T} WHERE status IN ('held','confirmed') AND starts_at<?10 AND ends_at>?9) RETURNING id`,
   [id,(a.p_customer_name as string)??null,(a.p_email as string)??null,(a.p_phone as string)??null,(a.p_topic as string)??null,(a.p_note as string)??null,date,`${m[1]}:${m[2]}:00`,startsAt,endsAt,a.p_hold_expires_at?pgTimestamp(a.p_hold_expires_at):null,duration,type,stamp]).catch(e=>{if(/UNIQUE/i.test(String(e)))throw fail('SUPPORT_SLOT_TAKEN');throw e;});
  if(!ins.length){
   const busy=await client.query(`SELECT 1 FROM "a_public__support_busy_dates" WHERE busy_date=?1`,[date]);
   throw fail(busy.length?'SUPPORT_DATE_BUSY':'SUPPORT_SLOT_TAKEN');
  }
  return readBooking(client,id);
 },
 confirm_support_booking:async(a,{client,now})=>{
  const found=(await client.query(`SELECT id,status FROM ${T} WHERE order_id=?1 OR order_code=?2 ORDER BY created_at DESC LIMIT 1`,[(a.p_order_id as string)??null,(a.p_order_code as string)??null]))[0];
  if(!found)throw fail('SUPPORT_BOOKING_NOT_FOUND');
  const paid=a.p_paid_at?pgTimestamp(a.p_paid_at):null,stamp=iso(now());
  // Single conditional update: confirmed stays; a live hold confirms; anything else needs review.
  await client.query(`UPDATE ${T} SET status=CASE WHEN status='held' AND hold_expires_at>?2 THEN 'confirmed' ELSE 'needs_review' END,paid_at=?2,updated_at=?3 WHERE id=?1 AND status<>'confirmed'`,[String(found.id),paid,stamp]);
  return readBooking(client,String(found.id));
 },
};
