import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const modulePath = process.env.SUPPORT_SQL_TEST_MODULE;

test("duration migration executes on PostgreSQL with preserved history, overlap constraints and RPC guards", { skip: !modulePath }, async (t) => {
  const { PGlite } = await import(modulePath);
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table public.orders(id uuid primary key);");
    await db.exec(fs.readFileSync("supabase/migrations/20260725021737_support_booking.sql", "utf8"));
    await db.exec("insert into public.support_bookings(customer_name,email,phone,topic,note,appointment_date,appointment_time,starts_at,ends_at,hold_expires_at,status,amount) values ('Test','test@example.com','0900000000','test','Historical test booking','2020-01-01','09:00','2020-01-01T02:00Z','2020-01-01T02:30Z','2020-01-01T01:00Z','cancelled',500000);");
    await db.exec(fs.readFileSync("supabase/migrations/20260816152642_support_booking_price_1m.sql", "utf8"));
    await db.exec(fs.readFileSync("supabase/migrations/20260905055235_support_booking_public_duration.sql", "utf8"));
    const { rows } = await db.query("select ((now() at time zone 'Asia/Ho_Chi_Minh')::date + 3)::text as day");
    let date = new Date(rows[0].day + "T00:00:00Z");
    if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
    const day = date.toISOString().slice(0,10);
    const reserve = async (minutes, type, time = "09:00", date = day) => (await db.query(`select * from public.reserve_support_booking_v2(
      'Test','test@example.com','0900000000','test','Testing a support booking', $1::date,$2::time,
      ($1::date+$2::time) at time zone 'Asia/Ho_Chi_Minh',
      (($1::date+$2::time) at time zone 'Asia/Ho_Chi_Minh') + $3::integer * interval '1 minute',
      now()+interval '20 minutes',$3::integer,$4::text)`, [date,time,minutes,type])).rows[0];
    const cancel = () => db.exec("update public.support_bookings set status='cancelled' where status='held'");

    await t.test("historical amounts and private RPC grants remain intact", async () => {
      const row=(await db.query("select amount,duration_minutes,booking_type from public.support_bookings where appointment_date='2020-01-01'")).rows[0];
      assert.equal(Number(row.amount),500000);assert.equal(row.duration_minutes,30);assert.equal(row.booking_type,"student");
      const grants=(await db.query("select has_function_privilege('anon','public.reserve_support_booking_v2(text,text,text,text,text,date,time,timestamptz,timestamptz,timestamptz,integer,text)','execute') as anon, has_function_privilege('authenticated','public.reserve_support_booking_v2(text,text,text,text,text,date,time,timestamptz,timestamptz,timestamptz,integer,text)','execute') as authenticated, has_function_privilege('service_role','public.reserve_support_booking_v2(text,text,text,text,text,date,time,timestamptz,timestamptz,timestamptz,integer,text)','execute') as service")).rows[0];
      assert.deepEqual(grants,{anon:false,authenticated:false,service:true});
    });
    await t.test("database calculates every price and stores the entire duration", async () => {
      for (const [type,minutes,amount] of [["student",30,1000000],["student",60,1500000],["student",90,2000000],["student",120,2500000],["consultation",60,2000000],["consultation",90,2700000],["consultation",120,3400000]]) {
        const row=await reserve(minutes,type);
        assert.equal(Number(row.amount),amount);assert.equal(row.duration_minutes,minutes);
        assert.equal(new Date(row.ends_at)-new Date(row.starts_at),minutes*60000);
        await cancel();
      }
    });
    await t.test("overlapping starts are rejected while a back-to-back booking is allowed", async () => {
      const held = await reserve(90,"student");
      await assert.rejects(db.query(`insert into public.support_bookings(customer_name,email,phone,topic,note,appointment_date,appointment_time,starts_at,ends_at,hold_expires_at,duration_minutes,booking_type,amount)
        select customer_name,email,phone,topic,note,appointment_date,'09:30',starts_at+interval '30 minutes',starts_at+interval '60 minutes',hold_expires_at,30,'student',1000000 from public.support_bookings where id=$1`, [held.id]), /exclusion constraint/);
      await assert.rejects(reserve(30,"student","09:30"),/SUPPORT_SLOT_TAKEN/);
      await assert.rejects(reserve(30,"student","10:00"),/SUPPORT_SLOT_TAKEN/);
      assert.equal((await reserve(30,"student","10:30")).duration_minutes,30);
      await cancel();
    });
    await t.test("simultaneously submitted overlapping reservations cannot both succeed", async () => {
      const results=await Promise.allSettled([reserve(90,"student","09:00"),reserve(60,"consultation","09:30")]);
      assert.equal(results.filter((result)=>result.status==="fulfilled").length,1);
      assert.equal(results.filter((result)=>result.status==="rejected").length,1);
      await cancel();
    });
    await t.test("database rejects lunch, closing-time, Sunday and invalid duration requests", async () => {
      await assert.rejects(reserve(60,"student","11:30"),/SUPPORT_TIME_INVALID/);
      await assert.rejects(reserve(60,"student","20:00"),/SUPPORT_TIME_INVALID/);
      await assert.rejects(reserve(30,"consultation"),/SUPPORT_DURATION_INVALID/);
      await assert.rejects(reserve(45,"student"),/SUPPORT_DURATION_INVALID/);
      const sunday=new Date(day+"T00:00:00Z");while(sunday.getUTCDay()!==0)sunday.setUTCDate(sunday.getUTCDate()+1);
      await assert.rejects(reserve(60,"consultation","09:00",sunday.toISOString().slice(0,10)),/SUPPORT_DATE_INVALID/);
    });
    await t.test("expired holds can be reused and late payments require review", async () => {
      const first=await reserve(90,"student");
      await db.query("update public.support_bookings set hold_expires_at=now()-interval '1 minute',order_code='OLDTEST' where id=$1",[first.id]);
      await reserve(60,"consultation","09:30");
      const confirmed=(await db.query("select * from public.confirm_support_booking(null,'OLDTEST',now())")).rows[0];
      assert.equal(confirmed.status,"needs_review");
      await cancel();
    });
    await t.test("paid confirmation is idempotent and the old reservation API remains compatible", async () => {
      const row=(await db.query(`select * from public.reserve_support_booking('Test','test@example.com','0900000000','test','Legacy client reservation',$1::date,'09:00',($1::date+'09:00'::time) at time zone 'Asia/Ho_Chi_Minh',(($1::date+'09:00'::time) at time zone 'Asia/Ho_Chi_Minh')+interval '30 minutes',now()+interval '20 minutes')`,[day])).rows[0];
      assert.equal(Number(row.amount),1000000);assert.equal(row.duration_minutes,30);
      await db.query("update public.support_bookings set order_code='PAIDTEST' where id=$1",[row.id]);
      for(let i=0;i<2;i++) assert.equal((await db.query("select * from public.confirm_support_booking(null,'PAIDTEST',now())")).rows[0].status,"confirmed");
    });
  } finally { await db.close(); }
});
