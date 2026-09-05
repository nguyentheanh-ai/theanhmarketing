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
      { appointment_date: "2026-09-08", appointment_time: "09:00:00", status: "confirmed" },
      { appointment_date: "2026-09-08", appointment_time: "09:30:00", status: "held", hold_expires_at: "2026-09-05T02:10:00Z" },
      { appointment_date: "2026-09-08", appointment_time: "10:00:00", status: "held", hold_expires_at: "2026-09-05T01:59:00Z" },
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
