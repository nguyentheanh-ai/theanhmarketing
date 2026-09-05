import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const now = new Date("2026-09-05T02:00:00Z");

function load(file, aliases = {}, environment = "production") {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", "process", compiled)(
    (name) => Object.hasOwn(aliases, name) ? aliases[name] : require(name),
    loaded, loaded.exports, { env: { NODE_ENV: environment } },
  );
  return loaded.exports;
}

const constants = load("lib/support-booking/constants.ts");
const aliases = { "@/lib/support-booking/constants": constants };
const domain = load("lib/support-booking/domain.ts", aliases);
aliases["@/lib/support-booking/domain"] = domain;

function serviceFixture(environment = "production") {
  let databaseCalls = 0;
  const rows = {
    support_busy_dates: [{ busy_date: "2026-09-09" }],
    support_bookings: [
      { appointment_date: "2026-09-08", appointment_time: "09:00:00", starts_at: "2026-09-08T02:00:00Z", ends_at: "2026-09-08T02:30:00Z", status: "confirmed" },
      { appointment_date: "2026-09-08", appointment_time: "09:30:00", starts_at: "2026-09-08T02:30:00Z", ends_at: "2026-09-08T03:00:00Z", status: "held", hold_expires_at: "2026-09-05T02:10:00Z" },
      { appointment_date: "2026-09-08", appointment_time: "10:00:00", starts_at: "2026-09-08T03:00:00Z", ends_at: "2026-09-08T03:30:00Z", status: "held", hold_expires_at: "2026-09-05T01:59:00Z" },
      { appointment_date: "2026-09-08", appointment_time: "14:00:00", starts_at: "2026-09-08T07:00:00Z", ends_at: "2026-09-08T08:30:00Z", status: "confirmed" },
    ],
  };
  const service = load("services/supportBookingService.ts", {
    ...aliases,
    "@/lib/course-access": {},
    "@/services/orderService": {},
    "@/lib/supabase/admin": {
      createSupabaseAdminClient() {
        databaseCalls++;
        return {
          from(table) {
            assert.ok(Object.hasOwn(rows, table));
            const query = {
              select() { return query; }, gte() { return query; },
              lte() { return query; }, in() { return query; },
              then(resolve) { return Promise.resolve({ data: rows[table], error: null }).then(resolve); },
            };
            return query;
          },
        };
      },
    },
  }, environment);
  return { service, calls: () => databaseCalls };
}

test("production availability opens day 3, closes every Sunday and preserves busy/occupied slots", async () => {
  const { service } = serviceFixture();
  const availability = await service.getSupportAvailability(now);
  assert.equal(availability.minLeadDays, 3);
  assert.equal(availability.days[0].date, "2026-09-08");
  assert.equal(availability.days.at(-1).date, "2026-10-05");
  const firstDay = availability.days[0];
  assert.equal(firstDay.slots.find((slot) => slot.time === "09:00").available, false);
  assert.equal(firstDay.slots.find((slot) => slot.time === "09:30").available, false);
  assert.equal(firstDay.slots.find((slot) => slot.time === "10:00").available, true);
  for (const time of ["14:00", "14:30", "15:00"]) assert.equal(firstDay.slots.find((slot) => slot.time === time).available, false);
  assert.equal(firstDay.slots.find((slot) => slot.time === "15:30").available, true);
  assert.equal(domain.isSupportSlotAvailable(firstDay.slots, "13:30", 60), false);
  assert.equal(domain.isSupportSlotAvailable(firstDay.slots, "15:30", 90), true);
  for (const date of ["2026-09-09", "2026-09-13", "2026-09-20", "2026-09-27", "2026-10-04"]) {
    const day = availability.days.find((item) => item.date === date);
    assert.equal(day.busy, true);
    assert.ok(day.slots.every((slot) => !slot.available));
  }
});

test("server rejects Sunday bookings and admin reopening before any database access", async () => {
  const { service, calls } = serviceFixture();
  const input = { customerName: "Học viên kiểm tra", email: "test@example.com", phone: "0900000000", topic: "kiem-tra-quang-cao", note: "Kiểm tra lịch hỗ trợ", appointmentTime: "09:00" };
  await assert.rejects(service.reserveSupportBooking({ ...input, appointmentDate: "2026-09-13" }, now), /Chủ nhật/);
  await assert.rejects(service.reserveSupportBooking({ ...input, appointmentDate: "2026-09-07" }, now), /từ 3 đến 30 ngày/);
  await assert.rejects(service.setSupportBusyDate({ date: "2026-09-13", busy: false }, now), /Chủ nhật/);
  await assert.rejects(service.setSupportBusyDate({ date: "2026-09-07", busy: false }, now), /từ 3 ngày/);
  assert.equal(calls(), 0);
});

test("local preview follows the same Sunday closure", async () => {
  const { service, calls } = serviceFixture("development");
  const { days } = await service.getSupportAvailability(now);
  assert.ok(days[0].slots.every((slot) => slot.available));
  assert.ok(days.filter((day) => domain.isSupportSunday(day.date)).every((day) => day.busy && day.slots.every((slot) => !slot.available)));
  assert.equal(calls(), 0);
});

test("student and owner see identical booking forms with no internal notice and disabled Sundays", async () => {
  const { service } = serviceFixture("development");
  const { days } = await service.getSupportAvailability(now);
  const { SupportBookingForm } = load("components/support-booking/support-booking-form.tsx", aliases);
  const customer = { customerName: "Học viên kiểm tra", email: "test@example.com", phone: "", purchasedCourseSlug: "facebook-ads-2026" };
  const render = (previewMode) => renderToStaticMarkup(React.createElement(SupportBookingForm, { today: "2026-09-05", bookableDays: days, customer: { ...customer, previewMode } }));
  const html = render(false);
  assert.equal(render(true), html);
  assert.doesNotMatch(html, /quản trị|xem thử|Telegram|không tạo dữ liệu|luồng của khách hàng/);
  assert.match(html, /ít nhất 3 ngày/);
  assert.match(html, /1\.000\.000đ/);
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  assert.ok(buttons.slice(0, 3).every((button) => button[1].includes("disabled")));
  assert.ok(!buttons[3][1].includes("disabled"));
  for (const index of [1, 8, 15, 22, 29]) {
    assert.ok(buttons[index][1].includes("disabled"));
    assert.match(buttons[index][2], /Nghỉ/);
  }
  assert.ok(buttons.at(-1)[1].includes("disabled"));
});

test("public booking form asks for contact details and starts at the consultation package", async () => {
  const {service}=serviceFixture("development");
  const {days}=await service.getSupportAvailability(now);
  const {SupportBookingForm}=load("components/support-booking/support-booking-form.tsx",aliases);
  const html=renderToStaticMarkup(React.createElement(SupportBookingForm,{today:"2026-09-05",bookableDays:days,customer:null}));
  assert.match(html,/name="customerName"/);assert.match(html,/name="email"/);assert.match(html,/name="phone"/);
  assert.match(html,/2\.000\.000đ/);assert.match(html,/2\.700\.000đ/);assert.match(html,/3\.400\.000đ/);
  assert.doesNotMatch(html,/value="30"/);assert.match(html,/value="60"/);
});

test("booking API admits guests but never trusts their claimed student identity or amount", async () => {
  const makeRoute=(user,paid,phone="0900000000") => load("app/api/support-bookings/route.ts",{
    "@/lib/auth/session":{getCurrentAuth:async()=>({user})},
    "@/lib/security/rate-limit":{checkRateLimit:()=>({ok:true}),rateLimitKey:()=>"unit-test"},
    "@/services/supportBookingService":{
      getEligibleSupportCustomer:async()=>paid?{customerName:"Verified student",email:"student@example.com",phone}:null,
      SupportBookingConflictError:class extends Error{},
      reserveSupportBooking:async(input,_now,type)=>({ok:true,appointment:domain.validateSupportBookingInput(input,now,type),checkoutUrl:"/thanh-toan/UNITTEST"}),
    },
  });
  const input={customerName:"Guest test",email:"student@example.com",phone:"0900000000",topic:"kiem-tra-quang-cao",note:"Nội dung cần trao đổi",appointmentDate:"2026-09-08",appointmentTime:"09:00",durationMinutes:90,bookingType:"student",amount:1};
  const request=()=>new Request("https://example.com/api/support-bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)});
  for(const user of [null,{email:"unpaid@example.com",user_metadata:{isStudent:true}}]) {
    const response=await makeRoute(user,false).POST(request());
    assert.equal(response.status,201);
    const data=await response.json();assert.equal(data.appointment.amount,2700000);assert.equal(data.appointment.bookingType,"consultation");
  }
  const response=await makeRoute({email:"student@example.com"},true).POST(request());
  assert.equal(response.status,201);
  const data=await response.json();assert.equal(data.appointment.amount,2000000);assert.equal(data.appointment.customerName,"Verified student");
  const missingPhone=await makeRoute({email:"student@example.com"},true,"").POST(request());
  const completed=await missingPhone.json();
  assert.equal(missingPhone.status,201);
  assert.equal(completed.appointment.bookingType,"student");
  assert.equal(completed.appointment.phone,input.phone);
});


test("checkout persists the selected price in order, item and SePay QR", async () => {
  const inserted = [];
  const qrAmounts = [];
  const service = load("services/orderService.ts", {
    ...aliases,
    "@/data/platform": {},
    "@/lib/orders/invoice": { emptyInvoiceDetails: {} },
    "@/lib/meta/purchase-outbox": {},
    "@/services/courseService": {},
    "@/lib/consultation/constants": {},
    "@/lib/agent-kit-preorder": {},
    "@/lib/admin/command-center-source": {},
    "@/lib/tracking/attribution": { normalizeAttribution: () => ({}) },
    "@/lib/payments/sepay": {
      createOrderCode: () => "UNITTEST",
      isSepayConfigured: () => true,
      createSepayQrUrl: ({amount}) => { qrAmounts.push(amount); return "https://example.com/qr"; },
      parseVndAmount: Number,
      formatVnd: String,
    },
    "@/lib/supabase/admin": { createSupabaseAdminClient: () => ({
      from(table) {
        assert.equal(table, "orders");
        return { insert(row) {
          inserted.push(row);
          return { select: () => ({ single: async () => ({ data: { id: "unit-test", ...row }, error: null }) }) };
        } };
      },
    }) },
  });
  for (const [bookingType,durationMinutes,amount] of [["student",30,1000000],["student",60,1500000],["student",90,2000000],["student",120,2500000],["consultation",60,2000000],["consultation",90,2700000],["consultation",120,3400000]]) {
    const result = await service.createSupportPaymentOrder({bookingType,durationMinutes,studentName:"Test",email:"test@example.com",phone:"0900000000",expiresAt:"2026-09-05T03:00:00Z"});
    const row = inserted.at(-1);
    assert.equal(row.amount,amount);
    assert.equal(row.order_items[0].price,amount);
    assert.equal(qrAmounts.at(-1),amount);
    assert.equal(result.amount,amount);
    assert.match(row.course_title,new RegExp(`${durationMinutes} phút`));
    assert.equal(row.course_slug,constants.SUPPORT_PRODUCT_SLUG);
  }
  await assert.rejects(service.createSupportPaymentOrder({bookingType:"consultation",durationMinutes:30}),/Thời lượng/);
  assert.equal(inserted.length,7);
});


test("paid students without a saved phone retain eligibility and can supply a phone", async () => {
  const service = load("services/supportBookingService.ts", {
    ...aliases,
    "@/lib/course-access": {},
    "@/lib/supabase/admin": {},
    "@/services/orderService": { getPaymentOrders: async () => [{email:"student@example.com",studentName:"Student",phone:"",status:"paid",courseSlug:"facebook-ads-2026",orderItems:[],paidAt:"2026-09-01T00:00Z"}] },
  });
  const customer = await service.getEligibleSupportCustomer("student@example.com");
  assert.ok(customer);
  assert.equal(customer.phone,"");
  const {SupportBookingForm}=load("components/support-booking/support-booking-form.tsx",aliases);
  const html=renderToStaticMarkup(React.createElement(SupportBookingForm,{today:"2026-09-05",bookableDays:[],customer}));
  assert.match(html,/Bổ sung số điện thoại/);
  assert.match(html,/name="phone"/);
  assert.match(html,/1\.000\.000đ/);
});


test("public page renders without an account and exposes both pricing tiers", async () => {
  const {default:Page}=load("app/dat-lich-ho-tro/page.tsx",{
    ...aliases,
    "@/components/site/brand-mark":{BrandMark:()=>null},
    "@/components/support-booking/support-booking-form":{SupportBookingForm:({customer})=>{assert.equal(customer,null);return React.createElement("div",null,"PUBLIC FORM");}},
    "@/lib/auth/session":{getCurrentAuth:async()=>({user:null})},
    "@/services/supportBookingService":{
      getEligibleSupportCustomer:()=>{throw new Error("Guests must not require eligibility lookup");},
      getSupportAvailability:async()=>({days:[]}),
    },
  });
  const html=renderToStaticMarkup(await Page());
  assert.match(html,/PUBLIC FORM/);
  assert.match(html,/Đặt lịch cùng Thế Anh/);
  assert.match(html,/30 phút · 1\.000\.000đ/);
  assert.match(html,/60 phút · 2\.000\.000đ/);
  assert.doesNotMatch(html,/Telegram|quản trị|xem thử/);
});
