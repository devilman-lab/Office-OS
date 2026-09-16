// Drives the running dev server with the locally installed Chrome (no browser download).
// Usage: node scripts/e2e/drive.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const OUT = "scripts/e2e/shots";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: process.env.FULL === "1" });

const steps = process.argv.slice(2);
const want = (s) => steps.length === 0 || steps.includes(s);

try {
  if (want("dashboard")) { await page.goto(BASE + "/"); await page.waitForSelector("text=ダッシュボード"); await shot("01-dashboard"); }
  if (want("inbox")) { await page.goto(BASE + "/inbox"); await page.waitForSelector("text=受信トレイ"); await shot("02-inbox"); }
  if (want("pipeline")) {
    await page.goto(BASE + "/inbox/INBOX-001");
    await page.waitForSelector("#run-pipeline");
    await page.click("#run-pipeline");
    await page.waitForSelector("text=提案を確認する", { timeout: 30000 });
    await shot("03-pipeline-done");
    await page.click("[role=tab]:has-text(\"分類・抽出\")"); await shot("04-analysis");
    await page.click("[role=tab]:has-text(\"ナレッジ\")"); await shot("05-knowledge");
    await page.click("[role=tab]:has-text(\"提案\")"); await shot("06-proposal");
    await page.click("a:has-text(\"提案を確認する\")");
    await page.waitForSelector("text=承認して登録");
    await shot("07-review");
    await page.click("#approve");
    await page.waitForSelector("text=承認して登録しました", { timeout: 15000 });
    await shot("08-approved");
    await page.click("text=登録された案件を開く");
    await page.waitForSelector("text=案件概要");
    await shot("09-case");
    await page.click("[role=tab]:has-text(\"タスク\")"); await shot("10-case-tasks");
  }
  if (want("agent")) {
    await page.goto(BASE + "/agent");
    await page.waitForSelector("#tool-WRITE_KNOWLEDGE");
    await page.click("#tool-WRITE_KNOWLEDGE button");
    await page.waitForSelector("text=ACCESS DENIED");
    await shot("11-agent-denied");
  }
  if (want("assistant")) {
    await page.goto(BASE + "/assistant");
    await page.fill("input[placeholder*='例:']", "社会保険の資格取得手続きについて必要な書類を教えてください。");
    await page.press("input[placeholder*='例:']", "Enter");
    await page.waitForSelector("text=ANSWER GROUNDED IN VERIFIED KNOWLEDGE", { timeout: 15000 });
    await shot("12-assistant");
  }
  if (want("audit")) { await page.goto(BASE + "/audit"); await page.waitForSelector("text=監査ログ"); await shot("13-audit"); }
  if (want("pages")) {
    for (const p of ["cases", "tasks", "interactions", "knowledge", "approvals", "security", "effectiveness", "settings", "integrations", "architecture", "data-flow", "backup"]) {
      await page.goto(BASE + "/" + p); await page.waitForLoadState("networkidle"); await shot("20-" + p);
    }
  }
} catch (e) {
  console.error("DRIVE FAILED:", e.message);
  await shot("99-failure");
  process.exitCode = 1;
} finally {
  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
}
