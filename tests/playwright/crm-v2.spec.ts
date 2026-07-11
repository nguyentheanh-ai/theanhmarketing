import { expect, test } from "@playwright/test";

const routes = [
  "/admin/crm-v2/outline",
  "/admin/crm-v2",
  "/admin/crm-v2/leads",
  "/admin/crm-v2/leads/lead_demo_1",
  "/admin/crm-v2/segments",
  "/admin/crm-v2/email",
  "/admin/crm-v2/automation",
  "/admin/crm-v2/orders",
  "/admin/crm-v2/students",
  "/admin/crm-v2/reports",
  "/admin/crm-v2/team",
  "/admin/crm-v2/integrations",
] as const;

for (const route of routes) {
  test(`CRM v2 route renders ${route}`, async ({ page }) => {
    await page.goto(route);
    const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await expect(page).toHaveURL(new RegExp(`${escapedRoute}(\\?.*)?$`));
    await expect(page.locator("body")).not.toContainText("Application error");
  });
}

test("CRM v2 pages do not expose hash-only or javascript links", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    const issues = await page.locator("a").evaluateAll((elements, currentRoute) =>
      elements.flatMap((element) => {
        const label = (element.textContent || element.getAttribute("aria-label") || element.getAttribute("title") || "link").trim();
        if (label.includes("Next.js Dev Tools")) return [];
        if (label === "Compiling...") return [];
        if (element.closest(".react-flow__controls")) return [];
        const href = element.getAttribute("href") || "";
        return href === "#" || href.toLowerCase().startsWith("javascript:") ? [`${label}: bad href ${href} on ${currentRoute}`] : [];
      }),
      route,
    );
    expect(issues).toEqual([]);
  }
});

test("CRM v2 pages do not horizontally overflow on desktop preview", async ({ page }) => {
  await page.setViewportSize({ width: 1620, height: 900 });
  for (const route of routes) {
    await page.goto(route);
    const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(4);
  }
});

test("legacy admin lead route resolves to the canonical customer workspace", async ({ page }) => {
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/admin\/crm-v2\/leads$/);
  await expect(page.getByRole("heading", { name: "Leads & Pipeline" })).toBeVisible();
});

test("legacy admin dashboard redirects to CRM v2 when enabled", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/crm-v2$/);
  await expect(page.getByRole("heading", { name: "Trung tâm điều hành" })).toBeVisible();
});

test("Executive dashboard and Course Hub render their verified shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/crm-v2");
  await expect(page.getByText("Executive Operating System")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trung tâm điều hành" })).toBeVisible();
  await page.screenshot({ path: "test-results/admin-executive-dashboard.png", fullPage: true });

  await page.goto("/admin/crm-v2/students?view=courses");
  await expect(page.getByRole("heading", { name: "Không gian vận hành khóa học" })).toBeVisible();
  await expect(page.getByText("Chuyển tự do giữa các bước — không bắt buộc hoàn thành theo thứ tự.")).toBeVisible();
  const analyticsStep = page.getByRole("button", { name: /Bước 6 Analytics/ });
  if (await analyticsStep.count()) {
    await analyticsStep.click();
    await expect(page).toHaveURL(/step=analytics/);
    await expect(page.getByText("Phân bố tiến độ thực tế")).toBeVisible();
  } else {
    await expect(page.getByText("Chưa có khóa học")).toBeVisible();
  }
  await page.screenshot({ path: "test-results/admin-course-hub.png", fullPage: true });
});

const apiRoutes = [
  "/api/admin/crm-v2/leads",
  "/api/admin/crm-v2/orders",
  "/api/admin/crm-v2/students",
  "/api/admin/crm-v2/segments",
  "/api/admin/crm-v2/email",
  "/api/admin/crm-v2/automation",
  "/api/admin/crm-v2/reports",
  "/api/admin/crm-v2/team",
  "/api/admin/crm-v2/integrations",
] as const;

for (const route of apiRoutes) {
  test(`CRM v2 API responds ${route}`, async ({ request }) => {
    const response = await request.get(route);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.ok).toBeTruthy();
  });
}

test("CRM v2 automation action API tests workflow without browser execution", async ({ request }) => {
  const response = await request.post("/api/admin/crm-v2/automation/actions", {
    data: {
      action: "test_workflow",
      nodes: [
        { id: "trigger", type: "trigger_form", config: {} },
        { id: "delay", type: "delay", config: { minutes: 5 } },
      ],
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.ok).toBeTruthy();
  expect(payload.message).toContain("không chạy automation dài trong browser");
});

test("CRM v2 topbar search and refresh are real controls", async ({ page }) => {
  await page.goto("/admin/crm-v2/leads");
  await page.getByLabel("Tìm kiếm CRM v2").fill("facebook");
  await page.getByRole("button", { name: "Tìm" }).click();
  await expect(page).toHaveURL(/\/admin\/crm-v2\/leads\?q=facebook/);
  await page.getByRole("link", { name: "90 ngày" }).click();
  await expect(page).toHaveURL(/range=90d/);
  await expect(page).toHaveURL(/q=facebook/);
  await expect(page.getByTitle("Đồng bộ")).toHaveAttribute("data-crm-action", "button");
});

test("CRM v2 automation header buttons call the workflow action API", async ({ page }) => {
  await page.goto("/admin/crm-v2/automation");
  await page.getByRole("button", { name: /Test workflow/ }).click();
  await expect(page.getByRole("status")).toContainText(/test_workflow|Workflow/i);

  await page.getByRole("button", { name: /Lưu nháp/ }).click();
  await expect(page.getByRole("status")).toContainText(/save_draft|mock|workflow/i);
});

test("CRM v2 email marketing workspace previews audience before real send", async ({ page }) => {
  await page.goto("/admin/crm-v2/email");
  await expect(page.getByRole("button", { name: /Mail báo thanh toán/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mail thanh toán thành công/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mail nhắc thanh toán/ })).toBeVisible();
  await page.getByRole("button", { name: /Mail báo thanh toán/ }).click();
  await page.getByLabel("Subject").fill("CRM v2 smoke subject");
  await page.getByLabel("Nội dung chính").fill("Nội dung test cho email marketing CRM v2.");
  await page.getByLabel("CTA text").fill("Xem khóa học");
  await page.getByLabel("CTA URL").fill("https://www.theanhmarketing.com/");
  await page.getByRole("button", { name: "Lưu nháp" }).click();
  await expect(page.getByRole("status")).toContainText(/save_draft|draft|nháp/i);
  await page.getByRole("button", { name: "Xem audience" }).click();
  await expect(page.getByRole("status")).toContainText(/preview_audience|audience|người nhận/i);
  await expect(page.getByRole("button", { name: "Gửi thật" })).toBeDisabled();
});

test("CRM v2 remaining module action APIs respond safely", async ({ request }) => {
  const actions = [
    ["/api/admin/crm-v2/segments/actions", { action: "save_segment", name: "VIP smoke", rules: { combinator: "and", conditions: [] } }],
    ["/api/admin/crm-v2/orders/actions", { action: "send_payment_reminder", orderId: "order_demo_1" }],
    ["/api/admin/crm-v2/students/actions", { action: "create_support_ticket", contactId: "contact_demo_1", subject: "Smoke ticket" }],
    ["/api/admin/crm-v2/team/actions", { action: "record_permission_audit", member: "crm-v2-smoke@example.test", role: "sales" }],
    ["/api/admin/crm-v2/integrations/actions", { action: "test_connection", provider: "resend" }],
  ] as const;

  for (const [url, data] of actions) {
    const response = await request.post(url, { data });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.ok).toBeTruthy();
  }
});

test("CRM v2 remaining module buttons call real action APIs", async ({ page }) => {
  const checks = [
    ["/admin/crm-v2/segments", /Lưu segment/, /save_segment|segment/i],
    ["/admin/crm-v2/orders", /Gửi nhắc thanh toán/, /send_payment_reminder|payment/i],
    ["/admin/crm-v2/students", /Tạo ticket CSKH/, /create_support_ticket|ticket/i],
    ["/admin/crm-v2/team", /Ghi audit quyền/, /record_permission_audit|audit/i],
    ["/admin/crm-v2/integrations", /Kiểm tra kết nối/, /test_connection|connection/i],
  ] as const;

  for (const [route, buttonName, statusText] of checks) {
    await page.goto(route);
    await page.getByRole("button", { name: buttonName }).click();
    await expect(page.getByRole("status")).toContainText(statusText);
  }
});

test("CRM v2 reports range and view controls change real query state", async ({ page }) => {
  await page.goto("/admin/crm-v2/reports");
  await page.getByRole("link", { name: "Hôm nay" }).first().click();
  await expect(page).toHaveURL(/range=today/);
  await page.getByRole("link", { name: "Theo giai đoạn" }).click();
  await expect(page).toHaveURL(/view=period/);
  await expect(page.getByText("Doanh thu theo giai đoạn")).toBeVisible();
  await page.getByLabel("Từ ngày").fill("2026-06-01");
  await page.getByLabel("Đến ngày").fill("2026-06-16");
  await page.getByRole("button", { name: "Xem giai đoạn" }).click();
  await expect(page).toHaveURL(/range=custom/);
  await expect(page).toHaveURL(/dateFrom=2026-06-01/);
  await expect(page).toHaveURL(/dateTo=2026-06-16/);
});
