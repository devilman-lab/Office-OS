import { chromium } from "playwright-core";
const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.goto(BASE + "/");
await page.click("text=Start Guided Demo");
await page.waitForSelector("text=Guided Demo");
await page.click("button:has-text('次へ')"); await page.waitForURL("**/inbox"); await page.waitForLoadState("networkidle");
await page.click("button:has-text('次へ')"); await page.waitForURL("**/inbox/INBOX-001"); await page.waitForLoadState("networkidle");
await page.waitForSelector("#run-pipeline");
await page.click("#run-pipeline");
// click 次へ several times while the pipeline is running (the scenario that errored)
for (let i = 0; i < 8; i++) { await page.click("button:has-text('次へ')"); await page.waitForTimeout(300); }
await page.waitForSelector("a:has-text('提案を確認する')", { timeout: 30000 });
await page.click("a:has-text('提案を確認する')");
await page.waitForSelector("#approve", { timeout: 15000 });
await page.click("button:has-text('次へ')"); await page.click("button:has-text('次へ')");
await page.click("#approve");
await page.waitForSelector("text=承認して登録しました", { timeout: 15000 });
await page.click("a:has-text('登録された案件を開く')");
await page.waitForSelector("text=案件概要", { timeout: 15000 });
await page.screenshot({ path: "scripts/e2e/shots/50-guide-case.png" });
await page.goto(BASE + "/");
await page.screenshot({ path: "scripts/e2e/shots/51-topbar.png", clip: { x: 240, y: 0, width: 700, height: 60 } });
console.log("url:", page.url(), "errors:", errors.length ? errors : "none");
await browser.close();
