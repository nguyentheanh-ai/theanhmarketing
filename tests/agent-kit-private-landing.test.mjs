import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const landingPage = readFileSync("app/khoa-hoc/bo-kit-agent-doanh-nghiep/page.tsx", "utf8");
const checkoutForm = readFileSync("app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-checkout-form.tsx", "utf8");
const calculator = readFileSync("app/khoa-hoc/bo-kit-agent-doanh-nghiep/agent-kit-calculator.tsx", "utf8");
const orderService = readFileSync("services/orderService.ts", "utf8");

function assertIncludes(source, expected) {
  assert.match(source, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

test("agent kit private landing uses kit source facts and requested ads price", () => {
  const landingSurface = `${landingPage}\n${calculator}`;
  for (const text of [
    "Bộ Agent Kit X10 hiệu suất công việc",
    "AI Agent Business",
    "Offer AI Agent thoát vòng lặp công việc",
    "vòng lặp công việc",
    "Attract, Grow, Scale, CRM/Data",
    "Growth Strategy",
    "Insight Research",
    "Content Creative",
    "Performance Ads",
    "CRM Data",
    "Automation Delivery",
    "359K",
    "/growth-system",
    "/content-calendar",
    "/crm-dashboard",
    "KHACH-HANG-COPY-THONG-TIN-VAO-DAY",
    "Nhận trọn bộ",
    "việc lặp",
  ]) {
    assertIncludes(landingSurface, text);
  }
});

test("agent kit private landing maps Noti design DNA without copying Noti offer claims", () => {
  const landingSurface = `${landingPage}\n${calculator}`;
  for (const text of [
    "--primary: #0061ff",
    "--secondary: #00c2ff",
    "bg-blob",
    "hero-grid",
    "hero-video-note",
    "hero-video-card",
    "prereq-wrap",
    "stats-grid",
    "pain-grid",
    "promise-grid",
    "radar-wrap",
    "calculator-wrap",
    "AgentKitCalculator",
    "roadmap-grid",
    "pillar-grid",
    "library-grid",
    "tech-wrap",
    "proof-grid",
    "price-timeline",
    "faq-list",
    "sticky-bar",
    "Lưu ý quan trọng - đọc trước khi xem",
    "Yêu cầu tiên quyết - đọc kỹ trước khi đăng ký",
    "Sự thật khó nghe",
    "Lời hứa của bộ kit",
    "So sánh trực quan",
    "Test velocity calculator",
    "Quy trình 8 bước, không giấu gì",
    "9 trụ cột khác biệt",
    "Xem trước bộ kit",
    "Kỹ thuật bên trong",
    "Proof stack",
    "Bản quyền trọn đời",
    "Câu hỏi thường gặp",
    "Bắt đầu từ dữ liệu đang có",
  ]) {
    assertIncludes(landingSurface, text);
  }

  assert.doesNotMatch(landingPage, /design-landingpage-vip-v2/);
  assert.doesNotMatch(landingPage, /Claude Cowork/);
  assert.doesNotMatch(landingPage, /686\.868/);
  assert.doesNotMatch(landingPage, /168 landing page/);
  assert.doesNotMatch(landingPage, /Offer box trình bày/);
  assert.doesNotMatch(landingPage, /Feature 1|Feature 2|Lorem ipsum/);
});

test("agent kit calculator has a real range input that updates live results", () => {
  for (const text of [
    '"use client"',
    "useState",
    "type=\"range\"",
    "onChange",
    "setBudget",
    "calculator-range",
    "calc-live-panel",
    "standardizedOutputs",
    "qualityCheckpoints",
    "reusableAssets",
    "Kéo thanh ngân sách giả lập",
  ]) {
    assertIncludes(calculator, text);
  }
});

test("agent kit checkout posts to orders API with the 359K payment plan", () => {
  assert.match(checkoutForm, /courseSlug:\s*COURSE_SLUG/);
  assert.match(checkoutForm, /paymentPlan:\s*PAYMENT_PLAN/);
  assert.match(checkoutForm, /fetch\("\/api\/orders"/);
  assert.match(checkoutForm, /router\.push\(`\/thanh-toan\/\$\{encodeURIComponent\(result\.order\.orderCode\)\}`\)/);
  assertIncludes(checkoutForm, "Thanh toán SePay");
  assertIncludes(checkoutForm, "Thanh toán 359K ngay");
  assert.match(orderService, /"bo-agent-kit-x10-hieu-suat-cong-viec"/);
  assert.match(orderService, /"agent-kit-ads-359"/);
  assert.match(orderService, /amount:\s*359000/);
});
