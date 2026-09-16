import { chromium } from "playwright-core";
const BASE = "http://localhost:3010";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
const shot = (n) => page.screenshot({ path: `scripts/e2e/shots/${n}.png` });
try {
  // Reset via UI
  await page.goto(BASE + "/cases");
  await page.click("button:has-text('Reset Demo Data')");
  await page.click("button:has-text('リセットする')");
  await page.waitForSelector("text=デモデータをリセットしました");
  await page.waitForURL(BASE + "/");
  // Search dialog
  await page.keyboard.press("Control+K");
  await page.fill("input[placeholder*='検索キーワード']", "サンプル商事");
  await page.waitForSelector("text=顧客");
  await page.waitForTimeout(500);
  await shot("40-search");
  await page.keyboard.press("Escape");
  // Agent error demos
  await page.goto(BASE + "/agent");
  await page.click("button:has-text('不正な AI 出力を検証する')");
  await page.waitForSelector("text=AI RESPONSE VALIDATION FAILED");
  await shot("41-validation-failed");
  await page.click("button:has-text('接続失敗をシミュレート')");
  await page.waitForSelector("text=KNOWLEDGE UNAVAILABLE");
  await shot("42-knowledge-unavailable");
  await page.click("#tool-CREATE_CASE button");
  await page.waitForSelector("text=APPROVAL REQUIRED");
  await shot("43-approval-required");
  // Full main flow again (post-refactor) using guide navigation
  await page.goto(BASE + "/inbox/INBOX-001?run=1");
  await page.waitForSelector("a:has-text('提案を確認する')", { timeout: 30000 });
  await page.click("a:has-text('提案を確認する')");
  await page.waitForSelector("#approve");
  await page.click("button:has-text('編集') >> nth=0");
  await page.waitForSelector("text=提案を編集");
  await page.fill("input[type=date] >> nth=0", "2026-10-05");
  await page.click("button:has-text('保存')");
  await page.waitForSelector("text=提案を更新しました");
  await page.waitForTimeout(700);
  await page.click("#approve");
  await page.waitForSelector("text=承認して登録しました", { timeout: 15000 });
  await shot("44-approved-after-edit");
  // Knowledge unavailable via settings → assistant refuses
  await page.goto(BASE + "/settings");
  await page.click("button:has-text('Obsidian 接続を切断する')");
  await page.waitForSelector("text=Obsidian 接続を復旧する");
  await page.goto(BASE + "/assistant");
  await page.waitForSelector("text=ナレッジソースが利用できません");
  await page.fill("input[placeholder*='例:']", "有給休暇の年5日取得義務の対象者は誰ですか？");
  await page.press("input[placeholder*='例:']", "Enter");
  await page.waitForSelector("text=KNOWLEDGE UNAVAILABLE", { timeout: 15000 });
  await shot("45-assistant-unavailable");
  await page.goto(BASE + "/settings");
  await page.click("button:has-text('Obsidian 接続を復旧する')");
  await page.waitForSelector("text=Obsidian 接続を切断する");
  // Backup
  await page.goto(BASE + "/backup");
  await page.click("button:has-text('今すぐバックアップ')");
  await page.waitForSelector("text=バックアップを作成しました");
  await page.waitForTimeout(800);
  await shot("46-backup");
  // Task status change
  await page.goto(BASE + "/tasks?view=all");
  await page.selectOption("select >> nth=0", "done");
  await page.waitForSelector("text=タスクを更新しました");
  await shot("47-task-updated");
} catch (e) {
  console.error("FINAL FAILED:", e.message);
  await shot("99-final-failure");
  process.exitCode = 1;
} finally {
  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
}
