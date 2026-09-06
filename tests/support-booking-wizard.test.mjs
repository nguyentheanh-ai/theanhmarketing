import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const runtime = process.env.SUPPORT_UI_TEST_MODULE;
const require = createRequire(import.meta.url);
function load(file, aliases = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)((name) => Object.hasOwn(aliases, name) ? aliases[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}

test("booking wizard preserves data, skips verified student contacts and submits only at payment", { skip: !runtime }, async (t) => {
  const external = createRequire(runtime);
  const React = external("react");
  const { create, act } = external("react-test-renderer");
  const constants = load("lib/support-booking/constants.ts");
  const domain = load("lib/support-booking/domain.ts", { "@/lib/support-booking/constants": constants });
  const icons = Object.fromEntries(["ArrowLeft", "ArrowRight", "Bot", "CalendarDays", "Check", "ChevronLeft", "ChevronRight", "Clock3", "GraduationCap", "Loader2", "Megaphone", "Palette", "ShieldCheck", "Sparkles", "UserRound"].map((name) => [name, () => null]));
  const { SupportBookingForm } = load("components/support-booking/support-booking-form.tsx", {
    react: React, "react/jsx-runtime": external("react/jsx-runtime"), "lucide-react": icons,
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "@/lib/support-booking/constants": constants, "@/lib/support-booking/domain": domain,
  });
  const days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 9 + i)).toISOString().slice(0, 10);
    return { date, busy: domain.isSupportSunday(date), slots: domain.listSupportSlots().map((time) => ({ time, available: !domain.isSupportSunday(date) && !(date === "2026-09-10" && time === "09:30") })) };
  });
  const oldFetch = globalThis.fetch;
  const oldWindow = globalThis.window;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let requests = [];
  globalThis.window = { location: { href: "" } };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: options?.body && JSON.parse(options.body) });
    return { ok: true, status: 201, json: async () => ({ ok: true, checkoutUrl: "/thanh-toan/UNITTEST" }) };
  };
  let view;
  const content = () => JSON.stringify(view.toJSON());
  const heading = () => view.root.findByType("h2").props.children;
  const field = (name) => view.root.findAllByType("input").find((node) => node.props.name === name);
  const enter = async (name, value) => act(() => field(name).props.onChange({ target: { value } }));
  const submit = async () => act(() => view.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  const textOf = (value) => typeof value === "string" || typeof value === "number" ? String(value) : Array.isArray(value) ? value.map(textOf).join("") : value?.props ? textOf(value.props.children) : "";
  const button = (text) => view.root.findAllByType("button").find((node) => textOf(node.props.children).includes(text));
  const click = async (text) => act(() => button(text).props.onClick());
  const chooseTopic = async () => act(() => view.root.findAllByType("input").find((node) => node.props.value === "ai-agent").props.onChange());
  const chooseDate = async (day = "2026-09-09") => {
    const label = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "long", day: "numeric", month: "numeric", year: "numeric" }).format(new Date(day + "T00:00:00Z"));
    await act(() => view.root.findAllByType("button").find((node) => node.props["aria-label"]?.startsWith(label)).props.onClick());
  };
  const start = async (customer = null, isAuthenticated = Boolean(customer)) => {
    requests = [];
    await act(() => { view = create(React.createElement(SupportBookingForm, { today: "2026-09-06", bookableDays: days, customer, isAuthenticated })); });
  };
  try {
    await t.test("guest walks all steps, retains entries on back, rejects invalid contacts, and sends optional empty note", async () => {
      await start();
      assert.match(heading(), /Bạn có phải học viên/);
      assert.equal(view.root.findByType("a").props.href, "/dang-nhap?next=%2Fdat-lich-ho-tro");
      await click("Không, tôi chưa là học viên");
      assert.equal(view.root.findAllByType("textarea").length, 0);
      await chooseTopic();
      assert.equal(view.root.findByType("textarea").props.required, undefined);
      await submit();
      assert.match(heading(), /Thông tin liên hệ/);
      await enter("customerName", "Guest test"); await enter("email", "bad"); await enter("phone", "0900000000");
      await submit(); assert.match(content(), /Email không hợp lệ/);
      await enter("email", "test@example.com"); await submit();
      assert.match(heading(), /Chọn lịch và thời lượng/);
      assert.equal(view.root.findAllByType("input").some((node) => node.props.value === 30), false);
      await click("Quay lại"); assert.equal(field("email").props.value, "test@example.com");
      await click("Quay lại"); assert.match(heading(), /Bạn cần hướng dẫn/);
      assert.equal(view.root.findAllByType("input").find((node) => node.props.value === "ai-agent").props.checked, true);
      await submit(); await submit();
      await chooseDate(); await click('09:00');
      assert.equal(requests.length, 0);
      await submit(); assert.match(heading(), /Kiểm tra và thanh toán/);
      assert.match(content(), /2.000.000đ/);
      await submit();
      assert.equal(requests.length, 1);
      assert.deepEqual(requests[0], { url: "/api/support-bookings", body: { topic: "ai-agent", note: "", appointmentDate: "2026-09-09", appointmentTime: "09:00", durationMinutes: 60, phone: "0900000000", customerName: "Guest test", email: "test@example.com" } });
      assert.equal(globalThis.window.location.href, "/thanh-toan/UNITTEST");
      await act(() => view.unmount());
    });
    await t.test("students skip contacts; duration changes clear the time; calendar spans months and excludes Sundays", async () => {
      await start({ customerName: "Student test", email: "student@example.com", phone: "0900000000" });
      assert.match(heading(), /Bạn cần hướng dẫn/);
      await chooseTopic(); await submit();
      assert.match(heading(), /Chọn lịch và thời lượng/);
      assert.equal(field("phone"), undefined);
      const sundays = view.root.findAllByType("button").filter((node) => node.props["aria-label"]?.includes("Nghỉ Chủ nhật"));
      assert.ok(sundays.length > 0 && sundays.every((node) => node.props.disabled));
      await chooseDate("2026-09-10"); await click("09:00");
      await act(() => view.root.findAllByType("input").find((node) => node.props.value === 60).props.onChange());
      assert.equal(button("09:00"), undefined);
      assert.equal(button("Tiếp tục").props.disabled, true);
      await click("10:00"); await submit();
      assert.match(content(), /1.500.000đ/);
      await click("Sửa lịch");
      await act(() => view.root.findAllByType("button").find((node) => node.props["aria-label"] === "Tháng sau").props.onClick());
      assert.match(content(), /tháng 10/);
      await chooseDate("2026-10-01"); await click("09:00"); await submit(); await submit();
      assert.equal(requests[0].body.appointmentDate, "2026-10-01");
      assert.equal(requests[0].body.email, undefined);
      await act(() => view.unmount());
    });
    await t.test("student missing phone completes it on schedule; conflicts return to schedule and refresh availability", async () => {
      await start({ customerName: "Student test", email: "student@example.com", phone: "" });
      await chooseTopic(); await submit(); await chooseDate(); await click("09:00");
      await submit(); assert.match(content(), /bổ sung số điện thoại hợp lệ/);
      await enter("phone", "0900000000"); await submit();
      globalThis.fetch = async (url, options) => {
        requests.push({ url, body: options?.body && JSON.parse(options.body) });
        if (url.endsWith("availability")) return { ok: true, json: async () => ({ ok: true, days: days.map((day) => ({ ...day, busy: true })) }) };
        return { ok: false, status: 409, json: async () => ({ ok: false, message: "Khung giờ vừa được chọn." }) };
      };
      await submit();
      assert.match(heading(), /Chọn lịch và thời lượng/);
      assert.match(content(), /Khung giờ vừa được chọn/);
      assert.equal(button("Tiếp tục").props.disabled, true);
      assert.equal(requests[1].url, "/api/support-bookings/availability");
      await click("Quay lại"); assert.match(heading(), /Bạn cần hướng dẫn/);
      await act(() => view.unmount());
    });
    await t.test("authenticated nonbuyer skips the question but still supplies contacts", async () => {
      await start(null, true);
      assert.match(heading(), /Bạn cần hướng dẫn/);
      await chooseTopic(); await submit();
      assert.match(heading(), /Thông tin liên hệ/);
      await act(() => view.unmount());
    });
  } finally {
    globalThis.fetch = oldFetch; globalThis.window = oldWindow;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
