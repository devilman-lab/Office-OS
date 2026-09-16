import type { Priority } from "@/domain/enums";

export interface TaskTemplate {
  title: string;
  description: string;
  priority: Priority;
  /** days relative to the anchor date (negative = before anchor). null = no due date */
  offsetDays: number | null;
  anchor: "event" | "received";
}

export interface IntentDefinition {
  intent: string;
  label: string;
  keywords: string[];
  strongKeywords: string[];
  caseTitle: (org: string) => string;
  description: string;
  priority: Priority;
  /** Date role the AI must find to compute a deadline; when missing → missing information. */
  requiredDateRole: "start" | "deadline" | "event" | null;
  requiredDateLabel: string;
  caseDueOffsetDays: number | null;
  knowledgeQuery: string;
  tasks: TaskTemplate[];
}

export const INTENTS: IntentDefinition[] = [
  {
    intent: "social_insurance_enrollment",
    label: "社会保険 資格取得（入社手続き）",
    keywords: ["社会保険", "加入", "入社", "採用", "新入社員", "資格取得", "健康保険", "厚生年金", "雇用保険"],
    strongKeywords: ["入社", "資格取得", "採用"],
    caseTitle: (org) => `${org} 社会保険 資格取得手続き`,
    description: "新規入社者の健康保険・厚生年金・雇用保険の資格取得手続き",
    priority: "high",
    requiredDateRole: "start",
    requiredDateLabel: "入社予定日",
    caseDueOffsetDays: 5,
    knowledgeQuery: "社会保険 資格取得 手続き 入社 必要書類",
    tasks: [
      { title: "必要書類の受領確認（基礎年金番号・雇用契約書・マイナンバー）", description: "顧客から入社者の基礎情報と必要書類を受領し、不足があれば依頼する。", priority: "high", offsetDays: -3, anchor: "event" },
      { title: "健康保険・厚生年金 資格取得届の作成", description: "取得日・標準報酬月額を確認のうえ届出書を作成する。", priority: "high", offsetDays: 3, anchor: "event" },
      { title: "雇用保険 被保険者資格取得届の作成", description: "ハローワーク提出用の取得届を作成する。", priority: "medium", offsetDays: 5, anchor: "event" },
      { title: "電子申請と控えの顧客送付", description: "e-Gov で提出し、控えを顧客へ送付。対応履歴に記録する。", priority: "medium", offsetDays: 5, anchor: "event" },
    ],
  },
  {
    intent: "social_insurance_loss",
    label: "社会保険 資格喪失（退職手続き）",
    keywords: ["退職", "資格喪失", "離職", "離職票", "退社", "辞め"],
    strongKeywords: ["退職", "資格喪失", "離職票"],
    caseTitle: (org) => `${org} 退職者 資格喪失手続き`,
    description: "退職者の社会保険・雇用保険の資格喪失手続きと離職票の交付",
    priority: "high",
    requiredDateRole: "event",
    requiredDateLabel: "退職日",
    caseDueOffsetDays: 10,
    knowledgeQuery: "資格喪失 退職 離職票 手続き",
    tasks: [
      { title: "退職日・退職理由・最終出勤日の確認", description: "顧客に退職日と離職理由を確認する。", priority: "high", offsetDays: 1, anchor: "received" },
      { title: "健康保険・厚生年金 資格喪失届の作成", description: "退職日の翌日を喪失日として届出を作成する。", priority: "high", offsetDays: 5, anchor: "event" },
      { title: "雇用保険 資格喪失届・離職証明書の作成", description: "賃金台帳・出勤簿をもとに離職証明書を作成する。", priority: "high", offsetDays: 10, anchor: "event" },
      { title: "健康保険証の回収確認", description: "退職者から保険証を回収したか顧客に確認する。", priority: "medium", offsetDays: 5, anchor: "event" },
    ],
  },
  {
    intent: "dependent_change",
    label: "被扶養者 異動手続き",
    keywords: ["扶養", "被扶養者", "配偶者", "出産", "扶養に入", "扶養から外"],
    strongKeywords: ["扶養", "被扶養者"],
    caseTitle: (org) => `${org} 被扶養者異動届`,
    description: "被扶養者の追加・削除に伴う異動届の作成と提出",
    priority: "medium",
    requiredDateRole: "event",
    requiredDateLabel: "異動日（事実発生日）",
    caseDueOffsetDays: 5,
    knowledgeQuery: "扶養 異動届 被扶養者 必要書類",
    tasks: [
      { title: "異動事由と必要書類の確認", description: "続柄・収入要件・同居要件を確認し必要書類を案内する。", priority: "medium", offsetDays: 2, anchor: "received" },
      { title: "被扶養者異動届の作成・提出", description: "届出書を作成し提出する。", priority: "medium", offsetDays: 5, anchor: "event" },
    ],
  },
  {
    intent: "work_rules",
    label: "就業規則 作成・変更",
    keywords: ["就業規則", "規程", "規定", "改定", "労基署", "意見書"],
    strongKeywords: ["就業規則", "規程"],
    caseTitle: (org) => `${org} 就業規則 変更対応`,
    description: "就業規則の変更内容の整理、意見聴取、労基署への届出",
    priority: "medium",
    requiredDateRole: "deadline",
    requiredDateLabel: "施行希望日",
    caseDueOffsetDays: -7,
    knowledgeQuery: "就業規則 変更 手順 届出 意見書",
    tasks: [
      { title: "変更希望内容のヒアリング", description: "変更条項・施行日・対象者を確認する。", priority: "medium", offsetDays: 5, anchor: "received" },
      { title: "改定案の作成と顧客確認", description: "改定案を作成し顧客へ確認依頼する。", priority: "medium", offsetDays: 14, anchor: "received" },
      { title: "従業員代表の意見書取得", description: "意見聴取の手続きを案内し意見書を取得する。", priority: "medium", offsetDays: -10, anchor: "event" },
      { title: "労働基準監督署への届出", description: "変更届・意見書・改定後の規則を提出する。", priority: "high", offsetDays: -7, anchor: "event" },
    ],
  },
  {
    intent: "labor_consultation",
    label: "労務相談（労働時間・休暇・トラブル）",
    keywords: ["残業", "有給", "有休", "年休", "労働時間", "休憩", "ハラスメント", "解雇", "トラブル", "36協定", "休職"],
    strongKeywords: ["残業", "有給", "ハラスメント", "解雇", "36協定"],
    caseTitle: (org) => `${org} 労務相談対応`,
    description: "労働時間・休暇・職場トラブル等に関する相談対応",
    priority: "medium",
    requiredDateRole: null,
    requiredDateLabel: "",
    caseDueOffsetDays: 7,
    knowledgeQuery: "労働時間 有給休暇 36協定 相談",
    tasks: [
      { title: "相談内容の事実確認", description: "経緯・関係者・時系列を整理する。", priority: "medium", offsetDays: 2, anchor: "received" },
      { title: "確認済みナレッジに基づく回答案の作成", description: "事務所ナレッジを参照し担当者が回答案を作成する。", priority: "medium", offsetDays: 5, anchor: "received" },
    ],
  },
  {
    intent: "subsidy_consultation",
    label: "助成金・補助金 相談",
    keywords: ["助成金", "補助金", "キャリアアップ", "業務改善助成金", "交付"],
    strongKeywords: ["助成金", "補助金"],
    caseTitle: (org) => `${org} 助成金 相談・申請支援`,
    description: "助成金・補助金の要件確認と申請支援",
    priority: "medium",
    requiredDateRole: null,
    requiredDateLabel: "",
    caseDueOffsetDays: 14,
    knowledgeQuery: "助成金 補助金 相談 初動 要件確認",
    tasks: [
      { title: "対象制度と要件の確認", description: "事業内容・雇用状況から候補制度を整理する。", priority: "medium", offsetDays: 5, anchor: "received" },
      { title: "必要書類リストの送付", description: "申請に必要な書類一覧を顧客へ送付する。", priority: "medium", offsetDays: 7, anchor: "received" },
      { title: "申請スケジュールの合意", description: "締切から逆算した工程を顧客と合意する。", priority: "medium", offsetDays: 10, anchor: "received" },
    ],
  },
  {
    intent: "construction_license",
    label: "建設業許可 申請",
    keywords: ["建設業", "許可", "経営事項", "専任技術者", "経営業務", "工事"],
    strongKeywords: ["建設業", "建設業許可"],
    caseTitle: (org) => `${org} 建設業許可 申請`,
    description: "建設業許可の新規・更新申請に関する要件確認と書類作成",
    priority: "high",
    requiredDateRole: "deadline",
    requiredDateLabel: "許可希望日・有効期限",
    caseDueOffsetDays: -30,
    knowledgeQuery: "建設業許可 新規申請 必要書類 要件",
    tasks: [
      { title: "許可要件（経営業務管理責任者・専任技術者・財産要件）の確認", description: "要件充足を確認しヒアリングシートを送付する。", priority: "high", offsetDays: 5, anchor: "received" },
      { title: "必要書類の収集依頼", description: "登記事項証明書・納税証明書・決算書等を依頼する。", priority: "high", offsetDays: 10, anchor: "received" },
      { title: "申請書類一式の作成", description: "様式に沿って申請書を作成し確認する。", priority: "high", offsetDays: 21, anchor: "received" },
    ],
  },
  {
    intent: "immigration",
    label: "在留資格 申請・変更",
    keywords: ["在留資格", "ビザ", "外国人", "技術・人文知識・国際業務", "特定技能", "在留期間", "入管", "在留カード"],
    strongKeywords: ["在留資格", "ビザ", "特定技能", "入管"],
    caseTitle: (org) => `${org} 在留資格 変更・更新申請`,
    description: "外国人雇用に伴う在留資格の変更・更新申請",
    priority: "high",
    requiredDateRole: "deadline",
    requiredDateLabel: "在留期限",
    caseDueOffsetDays: -14,
    knowledgeQuery: "在留資格 変更 就労 必要書類 入管",
    tasks: [
      { title: "在留カード・パスポート・雇用契約内容の確認", description: "現在の在留資格と業務内容の適合性を確認する。", priority: "high", offsetDays: 3, anchor: "received" },
      { title: "申請書類の作成", description: "在留資格変更（更新）許可申請書と理由書を作成する。", priority: "high", offsetDays: -21, anchor: "event" },
      { title: "入管への申請", description: "オンラインまたは窓口で申請し受付票を保管する。", priority: "high", offsetDays: -14, anchor: "event" },
    ],
  },
  {
    intent: "payroll",
    label: "給与計算・賞与",
    keywords: ["給与", "給料", "賞与", "算定", "月額変更", "年末調整"],
    strongKeywords: ["給与計算", "賞与", "算定基礎", "月額変更"],
    caseTitle: (org) => `${org} 給与・賞与 関連手続き`,
    description: "給与計算・賞与支払届・算定基礎届等の手続き",
    priority: "medium",
    requiredDateRole: "event",
    requiredDateLabel: "支給日",
    caseDueOffsetDays: 5,
    knowledgeQuery: "給与 賞与 支払届 算定基礎届",
    tasks: [
      { title: "支給データの受領", description: "支給額・対象者一覧を受領する。", priority: "medium", offsetDays: 1, anchor: "received" },
      { title: "届出書類の作成・提出", description: "必要な届出書を作成し提出する。", priority: "medium", offsetDays: 5, anchor: "event" },
    ],
  },
  {
    intent: "other",
    label: "その他・分類不能",
    keywords: [],
    strongKeywords: [],
    caseTitle: (org) => `${org} 問い合わせ対応`,
    description: "分類できなかった依頼。担当者による内容確認が必要。",
    priority: "low",
    requiredDateRole: null,
    requiredDateLabel: "",
    caseDueOffsetDays: 7,
    knowledgeQuery: "",
    tasks: [{ title: "依頼内容の確認と分類", description: "AI が分類できなかったため担当者が内容を確認する。", priority: "medium", offsetDays: 3, anchor: "received" }],
  },
];

export function findIntent(intent: string): IntentDefinition {
  return INTENTS.find((i) => i.intent === intent) ?? INTENTS[INTENTS.length - 1];
}
