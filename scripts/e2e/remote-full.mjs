// Detailed end-to-end verification against a deployed instance.
// Usage: BASE_URL=https://... node scripts/e2e/remote-full.mjs
import { chromium } from "playwright-core";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "scripts/e2e/shots/remote";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("content.js")) errors.push("console: " + m.text().slice(0, 160)); });
const results = [];
const ok = (name, cond, note = "") => { results.push({ name, ok: !!cond, note }); console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${note}`); };
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const body = async () => (await page.textContent("body")) ?? "";

async function step(name, fn) {
  try { await fn(); } catch (e) { ok(name, false, e.message.split("\n")[0]); await shot(`fail-${name.replace(/\W+/g, "_")}`); }
}

await step("reset", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.click("button:has-text('Reset Demo Data')");
  await page.click("button:has-text('リセットする')");
  await page.waitForSelector("text=デモデータをリセットしました", { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.goto(BASE + "/inbox", { waitUntil: "networkidle" });
  ok("reset: INBOX-001 back to 未処理", (await body()).includes("社会保険手続きについてのご相談"));
  ok("storage mode = Vercel Blob", (await body()).includes("Vercel Blob に保存"));
});

await step("dashboard", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const t = await body();
  ok("dashboard renders", t.includes("ダッシュボード") && t.includes("Unprocessed Requests"));
  await shot("01-dashboard");
});

await step("pipeline", async () => {
  await page.goto(BASE + "/inbox/INBOX-001", { waitUntil: "networkidle" });
  await page.click("#run-pipeline");
  await page.waitForSelector("a:has-text('提案を確認する')", { timeout: 60000 });
  const t = await body();
  ok("pipeline: 9 steps success", t.includes("HUMAN REVIEW REQUIRED") && t.includes("スキーマ検証 OK"));
  ok("pipeline: PII masked", t.includes("[PERSON_001]") && t.includes("[EMAIL_001]"));
  await page.click("[role=tab]:has-text('ナレッジ')");
  ok("pipeline: knowledge retrieved", (await body()).includes("社会保険_資格取得手続き.md"));
  await page.click("[role=tab]:has-text('提案')");
  ok("pipeline: proposal shown", (await body()).includes("Task Proposals"));
  await shot("02-pipeline");
  await page.click("a:has-text('提案を確認する')");
  await page.waitForSelector("#approve", { timeout: 30000 });
});

await step("cross-request persistence", async () => {
  const url = page.url();
  const id = url.split("/").pop();
  let seen = 0;
  for (let i = 0; i < 6; i++) { await page.goto(BASE + "/approvals", { waitUntil: "networkidle" }); if ((await body()).includes(id)) seen++; }
  ok(`persistence: ${id} visible across requests`, seen === 6, `${seen}/6`);
  await page.goto(url, { waitUntil: "networkidle" });
});

await step("edit + approve", async () => {
  await page.waitForSelector("#approve");
  await page.click("button:has-text('編集') >> nth=0");
  await page.waitForSelector("text=提案を編集");
  await page.fill("input[type=date] >> nth=0", "2026-10-06");
  await page.click("button:has-text('保存')");
  await page.waitForSelector("text=提案を更新しました", { timeout: 20000 });
  await page.waitForTimeout(1200);
  ok("edit: due date updated", (await body()).includes("2026/10/06"));
  await page.click("#approve");
  await page.waitForSelector("text=承認して登録しました", { timeout: 30000 });
  await shot("03-approved");
  await page.click("a:has-text('登録された案件を開く')");
  await page.waitForSelector("text=案件概要", { timeout: 30000 });
  const t = await body();
  ok("case: registered with customer name", t.includes("株式会社サンプル商事 社会保険 資格取得手続き"));
  await page.click("[role=tab]:has-text('タスク')");
  ok("case: 4 AI tasks", ((await body()).match(/TASK-\d{4}/g) ?? []).length >= 4);
  await page.click("[role=tab]:has-text('参照ナレッジ')");
  ok("case: knowledge references", (await body()).includes("KB-001") || (await body()).includes("社会保険_資格取得手続き.md"));
  await page.click("[role=tab]:has-text('監査履歴')");
  ok("case: audit history", (await body()).includes("HUMAN_APPROVAL"));
  await shot("04-case");
});

await step("missing info flow", async () => {
  await page.goto(BASE + "/inbox/INBOX-003?run=1");
  await page.waitForSelector("a:has-text('提案を確認する')", { timeout: 60000 });
  await page.click("a:has-text('提案を確認する')");
  await page.waitForSelector("text=Missing Information", { timeout: 30000 });
  ok("missing info: approve disabled", await page.isDisabled("#approve"));
  await page.click("button:has-text('期限を追加する')");
  await page.fill("input[type=date] >> nth=0", "2026-11-30");
  await page.click("button:has-text('保存')");
  await page.waitForSelector("text=提案を更新しました", { timeout: 20000 });
  await page.waitForTimeout(1200);
  ok("missing info: approve enabled after edit", !(await page.isDisabled("#approve")));
});

await step("agent", async () => {
  await page.goto(BASE + "/agent", { waitUntil: "networkidle" });
  await page.click("#tool-WRITE_KNOWLEDGE button");
  await page.waitForSelector("text=ACCESS DENIED", { timeout: 20000 });
  ok("agent: WRITE_KNOWLEDGE denied", true);
  await page.click("#tool-CREATE_CASE button");
  await page.waitForSelector("text=APPROVAL REQUIRED", { timeout: 20000 });
  ok("agent: CREATE_CASE approval required", true);
  await page.click("button:has-text('不正な AI 出力を検証する')");
  await page.waitForSelector("text=AI RESPONSE VALIDATION FAILED", { timeout: 20000 });
  ok("agent: validation failure demo", true);
  await page.click("button:has-text('接続失敗をシミュレート')");
  await page.waitForSelector("text=KNOWLEDGE UNAVAILABLE", { timeout: 20000 });
  ok("agent: knowledge unavailable demo", true);
  await shot("05-agent");
  await page.goto(BASE + "/audit?result=denied", { waitUntil: "networkidle" });
  ok("audit: denied entries recorded", (await body()).includes("WRITE_KNOWLEDGE"));
});

await step("assistant", async () => {
  await page.goto(BASE + "/assistant", { waitUntil: "networkidle" });
  await page.fill("input[placeholder*='例:']", "社会保険の資格取得手続きについて必要な書類を教えてください。");
  await page.press("input[placeholder*='例:']", "Enter");
  await page.waitForSelector("text=ANSWER GROUNDED IN VERIFIED KNOWLEDGE", { timeout: 30000 });
  ok("assistant: grounded answer", (await body()).includes("Verified: 1 / 1"));
  await page.fill("input[placeholder*='例:']", "宇宙旅行保険の加入手続きについて教えてください。");
  await page.press("input[placeholder*='例:']", "Enter");
  await page.waitForSelector("text=INSUFFICIENT GROUNDING", { timeout: 30000 });
  ok("assistant: refuses without grounding", true);
  await shot("06-assistant");
});

await step("integrations", async () => {
  await page.goto(BASE + "/integrations", { waitUntil: "networkidle" });
  await page.click("button:has-text('再試行')");
  await page.waitForSelector("text=SYNC COMPLETED", { timeout: 20000 });
  ok("integrations: retry succeeds", true);
  await page.click("button:has-text('同期を実行') >> nth=0");
  await page.waitForTimeout(2500);
  const t = await body();
  ok("integrations: gmail sync", t.includes("SYNC COMPLETED") || t.includes("DUPLICATE DETECTED"));
  await page.click("button:has-text('同期を実行') >> nth=0");
  await page.waitForTimeout(2500);
  ok("integrations: duplicate detected on re-sync", (await body()).includes("DUPLICATE DETECTED"));
});

await step("settings knowledge toggle", async () => {
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.click("button:has-text('Obsidian 接続を切断する')");
  await page.waitForSelector("text=Obsidian 接続を復旧する", { timeout: 20000 });
  await page.goto(BASE + "/assistant", { waitUntil: "networkidle" });
  ok("settings: knowledge unavailable banner", (await body()).includes("ナレッジソースが利用できません"));
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.click("button:has-text('Obsidian 接続を復旧する')");
  await page.waitForSelector("text=Obsidian 接続を切断する", { timeout: 20000 });
});

await step("backup + tasks + search", async () => {
  await page.goto(BASE + "/backup", { waitUntil: "networkidle" });
  await page.click("button:has-text('今すぐバックアップ')");
  await page.waitForSelector("text=バックアップを作成しました", { timeout: 20000 });
  ok("backup: created", true);
  await page.goto(BASE + "/tasks?view=all", { waitUntil: "networkidle" });
  await page.selectOption("select >> nth=0", "done");
  await page.waitForSelector("text=タスクを更新しました", { timeout: 20000 });
  ok("tasks: status update", true);
  await page.keyboard.press("Control+K");
  await page.fill("input[placeholder*='検索キーワード']", "資格取得");
  await page.waitForSelector("text=KB-001", { timeout: 20000 });
  ok("search: results", true);
  await page.keyboard.press("Escape");
});

await step("all pages", async () => {
  for (const p of ["cases", "interactions", "knowledge", "knowledge?doc=KB-013", "approvals", "security", "effectiveness", "architecture", "data-flow", "audit"]) {
    const res = await page.goto(BASE + "/" + p, { waitUntil: "networkidle" });
    ok(`page /${p}`, res.status() === 200 && !(await body()).includes("エラーが発生しました"));
  }
});

await step("guided demo", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.click("text=Start Guided Demo");
  await page.waitForSelector("text=Guided Demo");
  await page.click("button:has-text('次へ')"); await page.waitForURL("**/inbox", { timeout: 20000 });
  await page.click("button:has-text('次へ')"); await page.waitForURL("**/inbox/INBOX-001", { timeout: 20000 });
  ok("guided demo: navigation", true);
  await page.click("button[aria-label='終了']");
});

await step("final reset", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.click("button:has-text('Reset Demo Data')");
  await page.click("button:has-text('リセットする')");
  await page.waitForSelector("text=デモデータをリセットしました", { timeout: 20000 });
  await page.waitForTimeout(1500);
  await page.goto(BASE + "/cases", { waitUntil: "networkidle" });
  ok("final reset: 6 seed cases", new Set((await body()).match(/CASE-\d{4}/g) ?? []).size === 6);
});

console.log("\nSUMMARY:", results.filter((r) => r.ok).length, "passed /", results.length, "| browser errors:", errors.length ? errors : "none");
await browser.close();
