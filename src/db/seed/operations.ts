import type { Case, Task } from "@/domain/types";
import { daysAgoDate, daysAgoIso, daysAheadDate } from "./helpers";

type SeedCase = Omit<Case, "updatedAt">;
type SeedTask = Omit<Task, "updatedAt">;

export const CASES: SeedCase[] = [
  { id: "CASE-0001", customerId: "CUS-001", title: "株式会社サンプル商事 算定基礎届 提出", description: "定時決定に伴う算定基礎届の作成・提出。", status: "completed", priority: "medium", dueDate: daysAgoDate(40), assignee: "鈴木", source: "gmail", proposalId: null, createdAt: daysAgoIso(60) },
  { id: "CASE-0002", customerId: "CUS-002", title: "有限会社テスト建設 建設業許可 更新申請", description: "許可有効期限に向けた更新申請。決算変更届の提出状況を確認中。", status: "in_progress", priority: "high", dueDate: daysAheadDate(20), assignee: "高橋", source: "meeting_note", proposalId: null, createdAt: daysAgoIso(25) },
  { id: "CASE-0003", customerId: "CUS-003", title: "合同会社デモ食品 36協定 届出更新", description: "有効期間満了に伴う36協定の更新届出。労働者代表の選出待ち。", status: "waiting", priority: "high", dueDate: daysAheadDate(5), assignee: "鈴木", source: "line_works", proposalId: null, createdAt: daysAgoIso(18) },
  { id: "CASE-0004", customerId: "CUS-004", title: "サンプル物流株式会社 有給休暇管理 相談", description: "年5日取得義務への対応方法と管理簿の整備について相談対応。", status: "review", priority: "medium", dueDate: daysAheadDate(3), assignee: "高橋", source: "phone_memo", proposalId: null, createdAt: daysAgoIso(6) },
  { id: "CASE-0005", customerId: "CUS-001", title: "株式会社サンプル商事 被扶養者異動届", description: "被扶養者の追加・削除に伴う異動届の作成と提出。\n異動日（事実発生日）: " + daysAgoDate(7) + "\n参照ナレッジ: 被扶養者異動届の取り扱い.md、FAQ_社会保険の加入条件.md", status: "in_progress", priority: "medium", dueDate: daysAgoDate(2), assignee: "鈴木", source: "ai", proposalId: "PROP-0002", createdAt: daysAgoIso(8) },
  { id: "CASE-0006", customerId: "CUS-003", title: "合同会社デモ食品 賞与支払届 提出", description: "夏季賞与の支払いに伴う賞与支払届の作成・提出。", status: "new", priority: "medium", dueDate: daysAheadDate(10), assignee: "鈴木", source: "gmail", proposalId: null, createdAt: daysAgoIso(1) },
];

export const TASKS: SeedTask[] = [
  { id: "TASK-0001", caseId: "CASE-0001", title: "算定基礎届の作成", description: "4〜6月の報酬を集計し届出書を作成する。", status: "done", priority: "medium", dueDate: daysAgoDate(45), assignee: "鈴木", source: "manual", createdAt: daysAgoIso(60) },
  { id: "TASK-0002", caseId: "CASE-0001", title: "電子申請と控えの送付", description: "e-Gov で提出し控えを顧客へ送付する。", status: "done", priority: "medium", dueDate: daysAgoDate(40), assignee: "鈴木", source: "manual", createdAt: daysAgoIso(60) },
  { id: "TASK-0003", caseId: "CASE-0002", title: "決算変更届の提出状況確認", description: "直近5期分の決算変更届が提出済みか確認する。", status: "done", priority: "high", dueDate: daysAgoDate(10), assignee: "高橋", source: "manual", createdAt: daysAgoIso(25) },
  { id: "TASK-0004", caseId: "CASE-0002", title: "更新申請書一式の作成", description: "様式に沿って更新申請書を作成する。", status: "in_progress", priority: "high", dueDate: daysAheadDate(7), assignee: "高橋", source: "manual", createdAt: daysAgoIso(25) },
  { id: "TASK-0005", caseId: "CASE-0002", title: "納税証明書の取得依頼", description: "顧客に納税証明書の取得を依頼する。", status: "todo", priority: "medium", dueDate: daysAheadDate(0), assignee: "高橋", source: "manual", createdAt: daysAgoIso(20) },
  { id: "TASK-0006", caseId: "CASE-0003", title: "労働者代表の選出方法を顧客に案内", description: "適正な選出手続きを案内する。", status: "done", priority: "high", dueDate: daysAgoDate(5), assignee: "鈴木", source: "manual", createdAt: daysAgoIso(18) },
  { id: "TASK-0007", caseId: "CASE-0003", title: "36協定届の作成・提出", description: "選出完了後に協定届を作成し提出する。", status: "todo", priority: "high", dueDate: daysAheadDate(5), assignee: "鈴木", source: "manual", createdAt: daysAgoIso(18) },
  { id: "TASK-0008", caseId: "CASE-0004", title: "有給管理簿のひな形送付", description: "事務所テンプレートを顧客へ送付する。", status: "in_progress", priority: "medium", dueDate: daysAheadDate(1), assignee: "高橋", source: "manual", createdAt: daysAgoIso(6) },
  { id: "TASK-0009", caseId: "CASE-0004", title: "回答案の所長確認", description: "確認済みナレッジに基づく回答案を所長が確認する。", status: "todo", priority: "medium", dueDate: daysAheadDate(3), assignee: "佐藤（所長）", source: "manual", createdAt: daysAgoIso(6) },
  { id: "TASK-0010", caseId: "CASE-0005", title: "異動事由と必要書類の確認", description: "続柄・収入要件・同居要件を確認し必要書類を案内する。", status: "done", priority: "medium", dueDate: daysAgoDate(6), assignee: "鈴木", source: "ai", createdAt: daysAgoIso(8) },
  { id: "TASK-0011", caseId: "CASE-0005", title: "被扶養者異動届の作成・提出", description: "届出書を作成し提出する。", status: "in_progress", priority: "medium", dueDate: daysAgoDate(2), assignee: "鈴木", source: "ai", createdAt: daysAgoIso(8) },
  { id: "TASK-0012", caseId: "CASE-0006", title: "賞与支給データの受領", description: "支給額・対象者一覧を受領する。", status: "todo", priority: "medium", dueDate: daysAheadDate(2), assignee: "鈴木", source: "manual", createdAt: daysAgoIso(1) },
  { id: "TASK-0013", caseId: "CASE-0006", title: "賞与支払届の作成・提出", description: "支給日から5日以内に提出する。", status: "todo", priority: "medium", dueDate: daysAheadDate(10), assignee: "鈴木", source: "manual", createdAt: daysAgoIso(1) },
  { id: "TASK-0014", caseId: "CASE-0002", title: "経営業務管理責任者の経験証明資料の再確認", description: "過去案件の教訓に基づき証明資料の現物を確認する。", status: "todo", priority: "high", dueDate: daysAgoDate(1), assignee: "高橋", source: "manual", createdAt: daysAgoIso(12) },
];
