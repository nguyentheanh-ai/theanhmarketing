import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const runtime = process.env.SUPPORT_UI_TEST_MODULE;

test("learning support prompt waits for visible study, survives lesson changes and respects dismissal/cooldown", { skip: !runtime }, async (t) => {
  const external = createRequire(runtime);
  const React = external("react");
  const { create, act } = external("react-test-renderer");
  const originals = Object.fromEntries(["window", "document", "setInterval", "clearInterval", "setTimeout", "clearTimeout", "IS_REACT_ACT_ENVIRONMENT"].map(key => [key, globalThis[key]]));
  const originalNow = Date.now;
  let now = 1_800_000_000_000;
  let nextId = 0;
  const timers = new Map();
  const listeners = new Map();
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.window = { sessionStorage: storage(), localStorage: storage() };
  globalThis.document = { visibilityState: "visible", fullscreenElement: null,
    addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  Date.now = () => now;
  globalThis.setInterval = (fn, delay) => { timers.set(++nextId, {fn, delay, next: now + delay, repeat: true}); return nextId; };
  globalThis.setTimeout = (fn, delay) => { timers.set(++nextId, {fn, delay, next: now + delay}); return nextId; };
  globalThis.clearTimeout = globalThis.clearInterval = id => timers.delete(id);
  const aliases = { react: React, "react/jsx-runtime": external("react/jsx-runtime"),
    "next/link": ({children, prefetch, ...props}) => React.createElement("a", props, children),
    "@/lib/support-booking/constants": {SUPPORT_PRICE_LABEL: "500.000đ"},
    "./support-booking-prompt.module.css": {default: {}} };
  const compiled = ts.transpileModule(fs.readFileSync("components/course/support-booking-prompt.tsx", "utf8"), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
  }).outputText;
  function load() {
    const mod = {exports: {}};
    new Function("require", "module", "exports", compiled)(key => aliases[key], mod, mod.exports);
    return mod.exports.SupportBookingPrompt;
  }
  let Prompt = load();
  let view;
  const mount = async () => act(() => { view = create(React.createElement(Prompt)); });
  const unmount = async () => act(() => view.unmount());
  const advance = async ms => {
    const end = now + ms;
    await act(() => {
      while (true) {
        const entry = [...timers].sort((a,b) => a[1].next - b[1].next)[0];
        if (!entry || entry[1].next > end) break;
        const [id, timer] = entry;
        now = timer.next;
        if (timer.repeat) timer.next += timer.delay; else timers.delete(id);
        timer.fn();
      }
      now = end;
    });
  };
  try {
    await t.test("hidden tabs do not count; changing lessons preserves study time", async () => {
      await mount();
      assert.equal(view.toJSON(), null);
      await advance(90_000);
      await unmount(); await mount();
      document.visibilityState = "hidden";
      await advance(20 * 60_000);
      assert.equal(view.toJSON(), null);
      document.visibilityState = "visible";
      await advance(90_000);
      assert.equal(view.toJSON(), null);
      await advance(15_000);
      assert.equal(view.root.findByType("aside").props["aria-label"], "Gợi ý hỗ trợ học tập");
      const link = view.root.findByType("a");
      assert.equal(link.props.href, "/dat-lich-ho-tro");
      assert.equal(link.props.target, "_blank");
      assert.match(JSON.stringify(view.toJSON()), /500.000đ/);
    });
    await t.test("closing and remounting or reloading does not repeat within 24 hours", async () => {
      await act(() => view.root.findByType("button").props.onClick());
      assert.equal(view.toJSON(), null);
      await unmount(); Prompt = load(); await mount();
      await advance(60 * 60_000);
      assert.equal(view.toJSON(), null);
    });
    await t.test("next-day prompt defers in fullscreen, then auto-hides", async () => {
      await unmount(); now += 24 * 60 * 60_000; await mount();
      document.fullscreenElement = {};
      await advance(4 * 60_000);
      assert.equal(view.toJSON(), null);
      document.fullscreenElement = null;
      await advance(15_000);
      assert.notEqual(view.toJSON(), null);
      await advance(45_000);
      assert.equal(view.toJSON(), null);
    });
    await t.test("storage errors keep the component usable and Escape dismisses it", async () => {
      await unmount(); now += 24 * 60 * 60_000;
      window.localStorage = window.sessionStorage = {getItem() {throw Error("blocked");}, setItem() {throw Error("blocked");}};
      await mount(); await advance(3 * 60_000);
      assert.notEqual(view.toJSON(), null);
      await act(() => listeners.get("keydown")({key: "Escape"}));
      assert.equal(view.toJSON(), null);
      await unmount(); await mount(); await advance(15 * 60_000);
      assert.equal(view.toJSON(), null);
    });
  } finally {
    await unmount();
    assert.equal(timers.size, 0);
    assert.equal(listeners.size, 0);
    Date.now = originalNow;
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
