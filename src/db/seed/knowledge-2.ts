import type { KnowledgeDocument } from "@/domain/types";
import { DEMO_NOTICE, daysAgoIso } from "./helpers";

export const KNOWLEDGE_DOCS_2: KnowledgeDocument[] = [
  {
    id: "KB-005",
    title: "就業規則変更の手順.md",
    category: "労務",
    source: "obsidian://vault/労務/就業規則変更の手順.md",
    tags: ["就業規則", "変更", "届出", "意見書", "労基署"],
    verified: true,
    verifiedBy: "佐藤（所長）",
    updatedAt: daysAgoIso(21),
    content: `${DEMO_NOTICE}

# 就業規則 変更の手順

1. 変更したい条項・施行希望日・対象者を顧客からヒアリングする。
2. 改定案を作成し、顧客へ内容確認を依頼する（不利益変更の場合は所長判断）。
3. 従業員代表（過半数代表者）から意見書を取得する。
4. 就業規則変更届・意見書・改定後の就業規則を労働基準監督署へ届け出る。
5. 従業員への周知（掲示・配布・イントラ掲載など）を顧客に依頼する。

## 注意
- 常時10人以上の労働者を使用する事業場は届出義務がある。
- 施行日の1週間前までに届出が完了するよう工程を組む。
`,
  },
  {
    id: "KB-006",
    title: "36協定の届出チェックリスト.md",
    category: "労務",
    source: "obsidian://vault/労務/36協定の届出チェックリスト.md",
    tags: ["36協定", "残業", "時間外労働", "届出"],
    verified: true,
    verifiedBy: "高橋",
    updatedAt: daysAgoIso(75),
    content: `${DEMO_NOTICE}

# 36協定 届出チェックリスト

- 協定の有効期間と起算日を確認する（更新漏れが最も多い）。
- 時間外労働の上限（月・年）と特別条項の有無を確認する。
- 労働者代表の選出方法が適正か確認する。
- 事業場ごとに届出が必要（本社一括届出の要件を満たす場合を除く）。
- 電子申請の場合は e-Gov のアカウントと事業所情報を事前に確認する。
`,
  },
  {
    id: "KB-007",
    title: "労働条件通知書の作成ポイント.md",
    category: "労務",
    source: "obsidian://vault/労務/労働条件通知書の作成ポイント.md",
    tags: ["労働条件通知書", "雇用契約", "入社"],
    verified: true,
    verifiedBy: "鈴木",
    updatedAt: daysAgoIso(90),
    content: `${DEMO_NOTICE}

# 労働条件通知書 作成ポイント

- 契約期間、就業場所、業務内容、始業終業時刻、休日、賃金、退職に関する事項は必須記載。
- 有期契約の場合は更新の有無と判断基準を明記する。
- 就業場所・業務内容は将来の変更範囲も記載する。
- 顧客のひな形を使う場合も、必ず事務所の最新テンプレートと差分を確認する。
`,
  },
  {
    id: "KB-008",
    title: "FAQ_年次有給休暇の管理.md",
    category: "FAQ",
    source: "obsidian://vault/FAQ/FAQ_年次有給休暇の管理.md",
    tags: ["有給", "有給休暇", "年休", "FAQ", "労務相談"],
    verified: true,
    verifiedBy: "高橋",
    updatedAt: daysAgoIso(45),
    content: `${DEMO_NOTICE}

# FAQ 年次有給休暇の管理

- Q: 入社後いつから付与されるか → 雇入れから6か月継続勤務し、全労働日の8割以上出勤した場合に付与。
- Q: 年5日の取得義務の対象者は → 年10日以上付与される労働者。
- Q: 時季指定は誰が行うか → 使用者が労働者の意見を聴いたうえで時季を指定する。
- Q: パートタイマーへの付与は → 所定労働日数に応じた比例付与。
- 顧客からの相談は「相談内容の事実確認」→「回答案作成」→「所長確認」の順で対応する。
`,
  },
  {
    id: "KB-009",
    title: "FAQ_社会保険の加入条件.md",
    category: "FAQ",
    source: "obsidian://vault/FAQ/FAQ_社会保険の加入条件.md",
    tags: ["社会保険", "加入条件", "パート", "FAQ"],
    verified: true,
    verifiedBy: "佐藤（所長）",
    updatedAt: daysAgoIso(18),
    content: `${DEMO_NOTICE}

# FAQ 社会保険の加入条件

- 正社員および所定労働時間・日数が正社員の4分の3以上のパートタイマーは加入対象。
- 短時間労働者の適用拡大の要件（週の所定労働時間・賃金・雇用見込み・学生でないこと・企業規模）は最新の確認済み基準を参照する。
- 試用期間中でも入社日から加入が必要。
- 加入条件の判断が難しい場合は所長に確認し、顧客への回答は確認後に行う。
`,
  },
];
