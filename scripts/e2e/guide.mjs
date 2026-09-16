import { chromium } from "playwright-core";
const BASE = "http://localhost:3010";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(BASE + "/");
await page.click("text=Start Guided Demo");
await page.waitForSelector("text=Guided Demo");
for (let i = 0; i < 3; i++) { await page.click("button:has-text('次へ')"); await page.waitForTimeout(600); }
console.log("url after 3 next:", page.url());
await page.screenshot({ path: "scripts/e2e/shots/30-guide.png" });
// Missing information demo: INBOX-003 has no date
await page.goto(BASE + "/inbox/INBOX-003?run=1");
await page.waitForSelector("text=提案を確認する", { timeout: 30000 });
await page.click("[role=tab]:has-text('提案')");
await page.screenshot({ path: "scripts/e2e/shots/31-missing.png", fullPage: true });
await page.click("a:has-text('提案を確認する')");
await page.waitForSelector("text=Missing Information");
await page.screenshot({ path: "scripts/e2e/shots/32-missing-review.png" });
await page.click("button:has-text('期限を追加する')");
await page.fill("input[type=date] >> nth=0", "2026-11-30");
await page.click("button:has-text('保存')");
await page.waitForSelector("text=提案を更新しました");
await page.waitForTimeout(800);
await page.screenshot({ path: "scripts/e2e/shots/33-after-edit.png" });
// Global search
await page.keyboard.press("Control+K");
await page.fill("input[placeholder*='検索キーワード']", "資格取得");
await page.waitForSelector("text=ナレッジ");
await page.waitForTimeout(600);
await page.screenshot({ path: "scripts/e2e/shots/34-search.png" });
// Integrations retry
await page.goto(BASE + "/integrations");
await page.click("button:has-text('再試行')");
await page.waitForSelector("text=SYNC COMPLETED");
await page.screenshot({ path: "scripts/e2e/shots/35-retry.png", fullPage: true });
await page.click("button:has-text('同期を実行') >> nth=0");
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/e2e/shots/36-sync.png", fullPage: true });
console.log("errors:", errors.length ? errors : "none");
await browser.close();
