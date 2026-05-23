const baseUrl = process.env.VERIFY_BASE_URL || "http://localhost:3000";

const routes = [
  "/",
  "/gioi-thieu",
  "/he-sinh-thai",
  "/khoa-hoc",
  "/workshop",
  "/doi-tac",
  "/khoa-hoc/facebook-ads-2026",
  "/ladipage/facebook-ads-2026.html",
  "/academy/facebook-ads-master-2026",
  "/academy/ai-master-x10-hieu-suat",
  "/ladipage/ai-master-x10-hieu-suat.html",
  "/khoa-hoc/ai-agent-master-2026",
  "/blog",
  "/blog/sme-khong-thieu-tool-thieu-growth-system",
  "/tai-lieu",
  "/hoc-vien",
  "/lien-he",
  "/dang-ky",
  "/dang-nhap",
  "/login",
  "/dashboard",
  "/learn/facebook-ads-2026/lesson-1",
  "/admin",
  "/admin/login",
  "/admin/dashboard",
  "/admin/database",
  "/admin/khoa-hoc",
  "/admin/hoc-vien",
  "/admin/bai-viet",
  "/admin/tai-lieu",
  "/admin/feedback",
  "/admin/seo",
  "/admin/leads",
  "/admin/don-hang",
  "/admin/cms",
  "/robots.txt",
  "/sitemap.xml",
];

const failures = [];

for (const route of routes) {
  const url = new URL(route, baseUrl);

  try {
    const response = await fetch(url);
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "OK  " : "FAIL"} ${response.status} ${route}`);

    if (!ok) {
      failures.push(`${route} returned ${response.status}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log(`FAIL ERR ${route} ${message}`);
    failures.push(`${route} failed: ${message}`);
  }
}

if (failures.length > 0) {
  console.error("\nRoute verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nAll routes passed.");
