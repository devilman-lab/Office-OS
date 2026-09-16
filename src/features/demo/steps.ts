export interface DemoContext {
  proposalId: string | null;
  caseId: string | null;
  inboxItemId: string;
}

export interface DemoStep {
  id: number;
  title: string;
  body: string;
  /** Route to navigate to. Function form can use runtime context (ids created during the demo). */
  route: string | ((ctx: DemoContext) => string | null) | null;
  focus?: string;
}

export const DEMO_STEPS: DemoStep[] = [
  { id: 1, title: "ダッシュボード", body: "事務所の今日の状況（未処理の依頼、AI確認待ち、期限）と、AIがどこまで整理しているかを確認します。", route: "/" },
  { id: 2, title: "Inbox を開く", body: "Gmail / LINE WORKS / 音声メモ / 電話メモ / 面談記録から届いた依頼が一覧になります。AI Status が「未処理」のものが対象です。", route: "/inbox" },
  { id: 3, title: "依頼を開いて「AIで整理」", body: "「社会保険手続きについてのご相談」を開き、[AIで整理] を押してください。9 段階のパイプラインが順に実行されます。", route: (c) => `/inbox/${c.inboxItemId}`, focus: "run-pipeline" },
  { id: 4, title: "PII マスキング", body: "「マスキング」タブで、氏名・会社名・電話・メール・住所が [PERSON_001] などのトークンに置き換わっていることを確認します。AI にはこの右側の文章しか渡されません。", route: null, focus: "tab-masking" },
  { id: 5, title: "依頼内容の分類", body: "AI が「社会保険 資格取得（入社手続き）」と分類し、根拠となったキーワードと確信度を表示します。", route: null, focus: "tab-analysis" },
  { id: 6, title: "ナレッジ検索", body: "分類結果に応じた検索クエリで、Obsidian の確認済みナレッジを検索します。", route: null, focus: "tab-knowledge" },
  { id: 7, title: "関連ナレッジと参照元", body: "取得したドキュメントの Relevance / Verified / 更新日が表示されます。未確認（Verified: NO）の文書は提案の根拠に使われません。", route: null, focus: "tab-knowledge" },
  { id: 8, title: "案件候補", body: "「提案」タブで AI が生成した案件候補（タイトル・優先度・期限・担当）を確認します。期限は入社日から法定期限を逆算しています。", route: null, focus: "tab-proposal" },
  { id: 9, title: "タスク候補", body: "手続きに必要なタスクが期限付きで分解されています。すべて「候補」であり、まだ業務DBには登録されていません。", route: null, focus: "tab-proposal" },
  { id: 10, title: "不足情報の検出", body: "必要な情報（期限・対象者など）が本文から特定できない場合は「不足情報」として明示され、承認前に担当者が補います。", route: null, focus: "tab-proposal" },
  { id: 11, title: "AI 提案を確認する", body: "[提案を確認する] を押して承認画面へ進みます。「AI generated proposal. Human review required.」が表示されます。", route: (c) => (c.proposalId ? `/approvals/${c.proposalId}` : null) },
  { id: 12, title: "必要なら編集", body: "[編集] で案件名・優先度・期限・担当・タスクを修正できます。修正内容は再検証され、監査ログに残ります。", route: null },
  { id: 13, title: "承認して登録", body: "[承認して登録] を押します。人間の承認が、AI 提案が業務DBへ入る唯一の経路です。", route: null, focus: "approve" },
  { id: 14, title: "案件が登録された", body: "案件詳細を開きます。顧客に紐付き、ステータス「新規」で登録されています。", route: (c) => (c.caseId ? `/cases/${c.caseId}` : "/cases") },
  { id: 15, title: "タスクが登録された", body: "「タスク」タブに、承認したタスク候補が期限付きで登録されています。", route: null },
  { id: 16, title: "対応履歴が記録された", body: "「対応履歴」タブに元のメールが原本／マスキング版の両方で記録され、案件に紐付いています。", route: null },
  { id: 17, title: "監査ログ", body: "AI入力・マスキング・ナレッジ検索・検証・承認・登録が、時刻・実行者・結果付きで残っています。", route: "/audit" },
  { id: 18, title: "ナレッジ参照の追跡", body: "案件の「参照ナレッジ」タブ、または監査ログの KNOWLEDGE_REFERENCE から、どの文書が根拠になったか追跡できます。", route: (c) => (c.caseId ? `/cases/${c.caseId}?tab=knowledge` : "/knowledge") },
  { id: 19, title: "AI エージェントの権限", body: "エージェントが使えるツールと権限（ALLOWED / APPROVAL REQUIRED / DENIED）を確認します。", route: "/agent" },
  { id: 20, title: "WRITE_KNOWLEDGE を試す → 拒否", body: "「Write Knowledge」の [実行を試す] を押してください。ACCESS DENIED となり、監査ログに記録されます。ナレッジ正本は AI から不変です。", route: null, focus: "tool-WRITE_KNOWLEDGE" },
  { id: 21, title: "効果測定", body: "AI支援件数・生成タスク数・推定削減時間の Before / After を確認します（DEMO DATA）。", route: "/effectiveness" },
];
