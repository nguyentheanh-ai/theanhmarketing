import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function loadSupportDomain() {
  const root = process.cwd();
  const constantsSource = fs.readFileSync(path.join(root, "lib/support-booking/constants.ts"), "utf8");
  const domainSource = fs.readFileSync(path.join(root, "lib/support-booking/domain.ts"), "utf8");

  function compile(source) {
    return ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
  }

  const constantsModule = { exports: {} };
  new Function("exports", "module", compile(constantsSource))(constantsModule.exports, constantsModule);

  const domainModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier === "@/lib/support-booking/constants") return constantsModule.exports;
    throw new Error(`Unexpected import: ${specifier}`);
  };
  new Function("exports", "module", "require", compile(domainSource))(
    domainModule.exports,
    domainModule,
    localRequire,
  );

  return { ...constantsModule.exports, ...domainModule.exports };
}

const now = new Date("2026-07-25T02:00:00.000Z"); // 09:00 Vietnam

test("support booking window locks today through day 6 and includes day 30", () => {
  const { getSupportBookingWindow, isSupportDateBookable } = loadSupportDomain();
  const window = getSupportBookingWindow(now);

  assert.deepEqual(window, { minDate: "2026-08-01", maxDate: "2026-08-24" });
  assert.equal(isSupportDateBookable("2026-07-25", now), false);
  assert.equal(isSupportDateBookable("2026-07-31", now), false);
  assert.equal(isSupportDateBookable("2026-08-01", now), true);
  assert.equal(isSupportDateBookable("2026-08-24", now), true);
  assert.equal(isSupportDateBookable("2026-08-25", now), false);
});

test("support slots follow the approved morning and afternoon schedule", () => {
  const { listSupportSlots } = loadSupportDomain();
  const slots = listSupportSlots();

  assert.equal(slots.length, 20);
  assert.deepEqual(slots.slice(0, 6), ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  assert.deepEqual(slots.slice(6), [
    "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
  ]);
});

test("Vietnam appointment conversion produces exact UTC 30-minute bounds", () => {
  const { toVietnamAppointment } = loadSupportDomain();

  assert.deepEqual(toVietnamAppointment("2026-08-01", "09:30"), {
    startsAt: "2026-08-01T02:30:00.000Z",
    endsAt: "2026-08-01T03:00:00.000Z",
  });
});

test("booking input is normalized and rejects invalid or unavailable requests", () => {
  const { validateSupportBookingInput } = loadSupportDomain();
  const valid = validateSupportBookingInput({
    customerName: "  Nguyễn Văn A ",
    email: " TEST@EXAMPLE.COM ",
    phone: "090 123 4567",
    topic: "kiem-tra-quang-cao",
    note: "  Cần kiểm tra cấu trúc chiến dịch đang chạy. ",
    appointmentDate: "2026-08-01",
    appointmentTime: "09:30",
  }, now);

  assert.equal(valid.customerName, "Nguyễn Văn A");
  assert.equal(valid.email, "test@example.com");
  assert.equal(valid.phone, "0901234567");
  assert.equal(valid.startsAt, "2026-08-01T02:30:00.000Z");

  assert.throws(
    () => validateSupportBookingInput({ ...valid, appointmentDate: "2026-07-31" }, now),
    /chỉ có thể đặt từ 7 đến 30 ngày tới/i,
  );
  assert.throws(
    () => validateSupportBookingInput({ ...valid, appointmentTime: "12:00" }, now),
    /khung giờ không hợp lệ/i,
  );
  assert.throws(
    () => validateSupportBookingInput({ ...valid, note: "ngắn" }, now),
    /ít nhất 10 ký tự/i,
  );
});
