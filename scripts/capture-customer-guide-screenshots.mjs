import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.GUIDE_DEMO_BASE_URL || "http://127.0.0.1:3025";
const outputDir = path.resolve("public/huong-dan");
const tempDir = path.resolve("docs/qa-screenshots/customer-guide-capture-temp");

await mkdir(outputDir, { recursive: true });
await mkdir(tempDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

async function saveViewport(name, url, prepare) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  if (prepare) await prepare(page);
  const png = path.join(tempDir, `${name}.png`);
  await page.screenshot({ path: png });
  await sharp(png).resize(1120, 720, { fit: "cover", position: "top" }).webp({ quality: 88 }).toFile(path.join(outputDir, `${name}.webp`));
}

await saveViewport("01-thanh-toan", "/thanh-toan/AIMASTERX10DEMO");
await saveViewport("02-email-tai-khoan", "/demo/huong-dan-email", async (emailPage) => {
  const accountHeading = emailPage.frameLocator("iframe").getByText("Tài khoản học", { exact: true });
  await accountHeading.scrollIntoViewIfNeeded();
});
await saveViewport("03-dang-nhap", "/dang-nhap", async (loginPage) => {
  const offerClose = loginPage.locator('button[aria-label="Đóng popup ưu đãi"]');
  if (await offerClose.isVisible().catch(() => false)) await offerClose.click();
  await loginPage.locator('input[name="email"]').fill("minhanh.demo@gmail.com");
  await loginPage.locator('input[name="password"]').fill("MatKhauDemo2026");
});
await saveViewport("04-dashboard-khoa-hoc", "/dashboard");

await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
const ebookCard = page.locator("article").filter({ hasText: "Thư viện kiến thức Facebook Ads 2026" }).first();
await ebookCard.scrollIntoViewIfNeeded();
const ebookPng = path.join(tempDir, "05-ebook.png");
await ebookCard.screenshot({ path: ebookPng });
await sharp(ebookPng).resize(1120, 720, { fit: "contain", background: "#202026" }).webp({ quality: 88 }).toFile(path.join(outputDir, "05-ebook.webp"));

await browser.close();
await rm(tempDir, { recursive: true, force: true });
console.log(`Captured 5 customer-guide screenshots in ${outputDir}`);
