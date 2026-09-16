# OfficeうりずんOS — Production-Oriented Interactive Prototype

社会保険労務士・行政書士事務所向け「AI業務統合・自動化システム」のインタラクティブ・プロトタイプです。
単なる AI チャットやダッシュボードではなく、**依頼受付 → 匿名化 → AI整理 → ナレッジ検索 → 案件・タスク候補 → 担当者承認 → 業務DB登録 → 監査** という業務フローを、本番に拡張できるアーキテクチャで実装しています。

> すべてのデータは架空です。外部サービス（Gmail / LINE WORKS / Notion / Obsidian / LLM API）には接続していません（Mock Connector / Mock AI）。画面上では `SIMULATED` / `MOCK DATA` / `DEMO DATA` と明示しています。

---

## 1. Project Overview

| 項目 | 内容 |
| --- | --- |
| 対象 | 士業事務所（社労士・行政書士）の依頼整理・案件登録・ナレッジ参照業務 |
| 形態 | Next.js 製の Web アプリ（ローカル起動、SQLite） |
| 目的 | RFP の設計方針（ナレッジ正本の不変性・匿名化・権限制御・人間の承認・監査）を **動くもの** として確認する |
| 状態 | Prototype（本番拡張可能な構造。Mock 実装は Interface 越しにのみ利用） |

## 2. Business Purpose

- 電話・面談・Gmail・LINE WORKS・音声メモなどに分散した依頼情報を一元的に扱う
- 事務所が検証した知識（Obsidian）を AI が **参照のみ** できるようにする
- AI は候補（案件・タスク・回答案）を作り、**担当者が承認して初めて登録**される
- 何を根拠に、誰が、いつ、何をしたかを **監査ログ** で追跡できる
- 導入前後の業務時間削減効果を測定できる（本プロトタイプでは DEMO 仮定値）

## 3. Architecture

```
External Sources (Gmail / LINE WORKS / Voice Memo / Phone / Meeting)
        ↓ Input Processing (Inbox, 重複検出)
        ↓ PII Masking (氏名・組織・電話・メール・住所 → トークン)
        ↓ AI / Agent Layer (分類・抽出・候補生成 / 権限制御 / Provider 抽象)
   ↙                       ↘
Knowledge (Obsidian)      Business Data (Notion)
READ ONLY                 顧客 / 案件 / タスク / 対応履歴
Knowledge Search          Case / Task Management
   ↘                       ↙
        Human Approval (確認・編集・承認 / 却下)
        ↓
        Audit / Monitoring (全操作の記録 + 効果測定)
```

レイヤー構成（責務分離）:

| Layer | Directory | 責務 |
| --- | --- | --- |
| UI | `src/app`, `src/components`, `src/features` | App Router ページ、UI コンポーネント、機能単位のクライアント部品 |
| Application | `src/services`, `src/app/actions` | ユースケース（パイプライン・承認・検索・同期）。Server Actions が入口 |
| Domain | `src/domain` | エンティティ型・列挙・Zod スキーマ・エラー |
| AI Service | `src/ai` | `AIProvider` 抽象 + Mock / OpenAI(placeholder) |
| Knowledge Service | `src/knowledge` | `KnowledgeProvider` 抽象 + Local Markdown 検索（書き込み API なし） |
| Security | `src/security` | PII マスキング、権限チェック（deny by default）、現在ユーザー |
| Audit | `src/audit` | 追記専用の監査ログ |
| Business Data / Repository | `src/repositories`, `src/db` | SQLite（Notion 模擬）。ナレッジ文書は read-only リポジトリ |

詳細: [docs/02-system-architecture.md](docs/02-system-architecture.md)

## 4. Technology Stack

- Next.js 16 (App Router, Server Components, Server Actions) / React 19 / TypeScript
- Tailwind CSS v4
- SQLite (better-sqlite3) — Notion 業務DBの代替
- Zod — AI 出力・編集入力の検証
- Vitest — Unit / Integration / E2E(service-level)
- lucide-react — アイコン
- playwright-core（開発用）— ローカル Chrome でのブラウザ確認スクリプト

## 5. Directory Structure

```
src/
  app/            ページ・レイアウト・Server Actions (app/actions)
  components/     ui/（Button, Card, Badge, Table, Dialog, Toast…）layout/（Sidebar, Topbar）
  features/       inbox / proposal / cases / assistant / agent / knowledge / demo / integrations …
  services/       intake（パイプライン）, approval, assistant, agent, dashboard, effectiveness, integration, case, search, demo
  domain/         enums, types, schemas(Zod), errors
  ai/             provider.ts（抽象）, intents.ts, mock/, openai/（placeholder）
  knowledge/      provider.ts（抽象）, local-markdown-provider.ts, tokenizer.ts
  security/       pii-masker.ts, permissions.ts, current-user.ts
  audit/          audit-logger.ts
  repositories/   エンティティごとのリポジトリ（SQLite）
  db/             client.ts, schema.ts, seed/（架空データ）
tests/            unit / integration / e2e
docs/             設計ドキュメント
scripts/          reset-db.ts, smoke.ts, e2e/drive.mjs（ブラウザ確認）
data/             SQLite ファイルとバックアップ（生成物）
```

## 6. Demo Flow

Dashboard 右上の **Start Guided Demo** で 21 ステップのガイドが始まります。

1. Dashboard → 2. Inbox → 3. 「社会保険手続きについてのご相談」を開き **AIで整理**
4. PII マスキング（Original / AI Processing Input） → 5. 分類 → 6-7. ナレッジ検索と参照元
8. 案件候補 → 9. タスク候補 → 10. 不足情報
11. **提案を確認する** → 12. 編集 → 13. **承認して登録**
14. 案件 → 15. タスク → 16. 対応履歴 → 17. 監査ログ → 18. 参照ナレッジの追跡
19. AI エージェント → 20. **WRITE_KNOWLEDGE → ACCESS DENIED**（監査ログにも記録）
21. 効果測定（DEMO DATA）

3 つの重点デモ:

- **KEY DEMO 1 — Knowledge Grounding**: AI Assistant で質問 → ナレッジ検索 → 参照元 → 根拠付き回答。根拠がなければ推測しない（最後の候補質問で確認可能）。
- **KEY DEMO 2 — Human-in-the-loop**: Gmail → マスキング → 分類 → 案件候補 → 承認 → 業務DB。
- **KEY DEMO 3 — Security / Governance**: AI Agent → 権限チェック → WRITE_KNOWLEDGE → DENIED → 監査ログ。

エラーデモ（AI Agent 画面）: AI 出力の検証失敗 / ナレッジソース接続失敗。Integrations 画面: SYNC FAILED → Retry、DUPLICATE DETECTED。承認画面: 期限不足（Add Due Date）、重複案件の検出。

詳細: [docs/08-demo-scenario.md](docs/08-demo-scenario.md)

## 7. Data Model

Customer / Case / Task / Interaction / KnowledgeDocument / KnowledgeReference / AIProposal / AuditLog / AgentPermission / InboxItem / Integration / Backup。
詳細: [docs/03-data-model.md](docs/03-data-model.md)

## 8. Security Model

1. Knowledge Source is immutable from AI（ナレッジ文書に書き込み API が存在しない）
2. AI actions are permission controlled（`agent_permissions`、未定義は拒否）
3. Important actions require human approval（案件登録は承認が唯一の経路）
4. PII is masked before AI processing（Original と AI Input を分離）
5. AI outputs are auditable（入出力・検証・拒否を記録）
6. Knowledge references are traceable（提案・案件から参照元へ）
7. External AI provider can be replaced（`AIProvider` 抽象）
8. Business data and knowledge data are separated（Notion / Obsidian）

詳細: [docs/05-security-design.md](docs/05-security-design.md), [docs/06-permission-model.md](docs/06-permission-model.md)

## 9. AI Design

- AI への入力は **マスキング済みテキストのみ**。原本は業務DB（対応履歴）に担当者向けに保存。
- パイプライン: Input → Masking → Intent → Entities → Knowledge Search → Case Analysis → Task Generation → Validation → Human Review。
- AI 出力は **未信頼** として Zod で検証。失敗した出力は DB に保存されない。
- Mock AI はルールベース（オフライン・決定的・再現可能）。本番は同じ Interface で LLM / Local LLM に置換。

詳細: [docs/04-ai-architecture.md](docs/04-ai-architecture.md)

## 10. Knowledge Design

- Obsidian Vault の Markdown を **読み取り専用** で索引化（`knowledge_documents` は seed 経由でのみ書き込まれ、アプリ・AI からの更新経路なし）。
- 各文書に `verified / verifiedBy / updatedAt / tags / source` のメタデータ。**未確認文書は AI の根拠に使わない**。
- 検索は文字バイグラム + IDF の軽量スコアリング（依存ゼロ）。本番は Embedding + Vector DB のハイブリッド検索へ。
- 参照は `knowledge_references` として提案・案件・アシスタントに紐付き、監査ログにも残る。

## 11. Permission Model

| Action | Permission |
| --- | --- |
| READ_KNOWLEDGE / SEARCH_KNOWLEDGE / READ_CASE / READ_INTERACTION | ALLOWED |
| CREATE_CASE_PROPOSAL / CREATE_TASK_PROPOSAL | ALLOWED |
| CREATE_CASE / CREATE_TASK / UPDATE_CUSTOMER / SEND_EXTERNAL_MESSAGE | APPROVAL REQUIRED |
| WRITE_KNOWLEDGE / DELETE_KNOWLEDGE / DELETE_CASE / EXPORT_PII | DENIED |

## 12. Audit Design

すべての AI リクエスト・マスキング・ナレッジ検索/参照・権限チェック・承認/却下・DB 登録・API 同期・エラー・拒否を `audit_logs` に追記します（actor / actorType / action / resource / result / reason / metadata / timestamp）。原本 PII はログに含めません。
詳細: [docs/07-audit-log-design.md](docs/07-audit-log-design.md)

## 13. Mock Integration Design

`Integrations` 画面の各コネクタ（Gmail / LINE WORKS / Notion / Obsidian / 音声メモ）は Mock です。同期・失敗・再試行・重複検出は実際のコードパス（`services/integration.service.ts`）で動作し、監査ログに記録されます。

## 14. Production Migration Plan

| Component | Prototype | MVP | Production |
| --- | --- | --- | --- |
| Email | Mock Gmail | Gmail API（readonly, ラベル限定） | + Pub/Sub push |
| Messaging | Mock LINE WORKS | LINE WORKS Bot / Message API | + アーカイブ |
| Voice | Mock 文字起こし | ローカル Whisper → 匿名化 | + 話者分離 |
| Business DB | SQLite（Notion 模擬） | Notion API | Notion + 中間DB（集計・監査） |
| Knowledge | Local Markdown 検索 | Vault 同期 + Embedding + Vector DB | + 再ランキング |
| LLM | Mock AI | LLM Provider（学習オプトアウト） | Local LLM 切替 |
| Agent runtime | 権限表 + シミュレーション | Hermes Agent 等にツール定義・権限表を適用 | + サンドボックス |
| Auth | 固定ユーザー | Google Workspace SSO | + ロール別権限 |

詳細: [docs/09-production-roadmap.md](docs/09-production-roadmap.md)

## 15. Local LLM Migration Plan

`src/ai/provider.ts` の `AIProvider` を実装するクラスを追加し、`URIZUN_AI_PROVIDER` を切り替えるだけで移行できます。プロンプト・出力スキーマ（Zod）・監査・UI は変更不要です。ナレッジ検索も `KnowledgeProvider` でローカル埋め込みモデルへ置換可能です。

## 16. Test Instructions

```bash
npm test          # Unit + Integration + E2E(service-level) — 36 tests
npm run typecheck # TypeScript
npm run lint      # ESLint
```

- Unit: PII masking / Permission check / Proposal validation / Knowledge retrieval / Audit logging
- Integration: Inbox → AI Proposal / Proposal → Approval / Approval → Case / Case → Task / AI → Knowledge Search / Permission → Denied / Action → Audit Log / 重複検出 / 検証失敗 / ナレッジ停止 / 同期・再試行 / バックアップ / リセット
- E2E: Inbox → AI Processing → Knowledge Search → Proposal → Approval → Case → Task → Audit Log

ブラウザでの動作確認（ローカルの Chrome を使用、開発サーバー起動後）:

```bash
node scripts/e2e/drive.mjs           # 主要フローを操作しスクリーンショットを scripts/e2e/shots/ に保存
```

## 17. Run Instructions

```bash
npm install
npm run dev        # http://localhost:3000  （初回アクセス時に data/urizun-os.db を自動作成・シード）
npm run db:reset   # デモデータを初期化（画面の Reset Demo Data と同等）
npm run build && npm start
```

環境変数（`.env.example`）: `URIZUN_AI_PROVIDER=mock`, `URIZUN_KNOWLEDGE_PROVIDER=local-markdown`, `URIZUN_DB_PATH=./data/urizun-os.db`

---

### Responsible AI

- AIによる回答・提案は、事務所内で確認済みのナレッジを参照して生成されています。
- 最終的な判断・顧客への回答・重要な業務処理は担当者が確認してください。
- 根拠となるナレッジが不足する場合、AIは推測による回答を行いません。

ナレッジの内容は `DEMO SAMPLE KNOWLEDGE` であり、法令・制度の正確性を保証するものではありません。

---

## 18. Deploy to Vercel (via GitHub)

Vercel の Serverless 環境ではデプロイ物が読み取り専用で、しかもリクエストごとに別インスタンスへ振り分けられることがあります。
そのため本アプリは **SQLite をメモリ上で動かし、その DB イメージ（約 170 KB）を Vercel Blob に保存して各リクエストで同期**します（`src/db/snapshot.ts`）。
リポジトリ層の同期 API はそのままで、ページ／Server Action の入口で `prepareDb()`（最新スナップショット取得）と `persistDb()`（更新後のアップロード）を行います。

### 手順

1. GitHub に push
   ```bash
   git add -A
   git commit -m "OfficeうりずんOS prototype"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. Vercel で **Add New Project** → リポジトリを選択 → Deploy（Next.js は自動検出）
3. **Blob ストアを作成して接続**（必須）: Vercel ダッシュボード → プロジェクト → **Storage** → **Create Database** → **Blob** → 作成後 **Connect Project**。環境変数 `BLOB_READ_WRITE_TOKEN` が自動追加されます。
4. **Redeploy**（環境変数を反映するため）。左下の表示が「デモデータ: Vercel Blob に保存（共有状態）」になれば完了です。

Blob 未接続のままだと `/tmp` の一時 DB で動き、インスタンスが切り替わったときに「ページが見つかりません」になります（左下に警告を表示）。

### 補足
- `vercel.json` でリージョンを東京（`hnd1`）に固定しています。
- スナップショットは 1 ストアに 1 つ（`urizun-os/snapshot.db`）。同時に複数人が操作する用途ではなく、デモ用途の設計です。
- ローカルで同じ仕組みを試す場合: `URIZUN_SNAPSHOT_STORE=file npm run build && npm start`（`data/snapshot/` に保存）。
