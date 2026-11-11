# AGENTS.md

このリポジトリで作業する AI コーディングエージェント向けのガイド。

## リポジトリの性質

テスト対象アプリのコードを持たない、外部 QA 用リポジトリ。ドキュメント・テスト名は日本語で書かれている。

- `common/` — 独立した Playwright プロジェクト群。ルートに `package.json` は無く（ワークスペースでもない）、コマンドは各プロジェクトのディレクトリで実行する。
  - `playwright-ec2` — デモ EC サイト（tutorialsninja）の E2E
  - `playwright-next-article-share-app` — 別リポジトリ [next-article-share-app](https://github.com/Hashimoto-Noriaki/next-article-share-app) の外部 E2E
- `poc/` — 計画書と評価記録。セキュリティ系ツールの評価（`poc/docs/`）と、外部 E2E の計画（`poc/next-article-share-app/poc-plan.md`）。
  - `poc/targets/`, `poc/tools/` は clone した外部コードの置き場で git 管理外。リポジトリに取り込まない。

lint・ビルド・型チェックのスクリプトと CI（`.github/`）は現時点で存在しない。

## コマンド

各プロジェクトのディレクトリで実行する。

```bash
npm install && npx playwright install chromium   # セットアップ

npm test                                         # 全テスト（ヘッドレス）
npm run test:ui                                  # UI モード
npm run report                                   # 直近の HTML レポート
npm run test:smoke                               # @smoke のみ（next-article-share-app のみ）

npx playwright test tests/smoke/auth.spec.ts     # ファイル指定
npx playwright test -g "テスト名の一部"           # テスト名で絞り込み
npx playwright test --headed                     # ブラウザ表示
npx playwright test --debug                      # Inspector でステップ実行
npx playwright test --reporter=list              # 結果をターミナルに表示（既定の reporter は html）

BASE_URL=https://example.com/ npm test           # 接続先の切り替え
```

`playwright-next-article-share-app` の既定の接続先は `http://localhost:3000` なので、ローカル実行には別リポジトリのアプリ（docker compose + `npm run dev`）の起動が必要。

## 外部 E2E の設計（next-article-share-app）

詳細は `poc/next-article-share-app/poc-plan.md`。URL だけを前提にしたブラックボックステストで、同じテストをローカル → ステージング → 本番で流用する。

- アプリへの依存は URL・画面上の文言・`data-testid` のみ。アプリのコードの `import` やスキーマ参照はしない。
- テストデータは UI から作成・削除する。DB / Prisma には触らない（更新系は主に Server Actions で、外部から叩ける安定した API がほぼ無いため）。
- 本番では `@smoke` のみを流すため、`@smoke` には書き込みをするテストを入れない。タグは `{ tag: '@smoke' }` の形式で付ける。
- ステージング以降は DB を捨てられない。作成データには `e2e-` プレフィックスを付け、`afterEach` / fixture で必ず削除する。
- 対象外: パスワードリセット（Gmail）、画像アップロード（Cloudinary）、OAuth（GitHub / Google）。
- タイムアウトが長いのは Cloud Run のコールドスタート対策。

poc-plan.md の「ディレクトリ構成（案）」は `poc/next-article-share-app/` 配下を想定しているが、実装は `common/playwright-next-article-share-app/` にある。現在実装済みなのは `@smoke` のシナリオ 1〜3 のみで、fixture（シナリオ 4・5）と GitHub Actions は未着手。

## playwright-ec2 の注意点

`baseURL` がパス付き（`.../demo/`）なので、遷移は相対パスで書く（`page.goto('./')`）。`page.goto('/')` だと `/demo/` が外れる。

## セキュリティ PoC の安全境界

`poc/docs/` の RedAmon（API を外から攻撃）と promptfoo（LLM 入出力の評価）は、特定プロダクトの診断ではなくツール自体の評価が目的。現状と次アクションは `poc/docs/README.md` に集約されている。

- RedAmon の対象は自分が管理するローカルの練習用脆弱アプリのみ（VAmPI: 脆弱版 `127.0.0.1:18002` / 安全版 `127.0.0.1:18001`）。本番・ステージング・第三者・クラウド上の実環境には向けない。実システムの診断は書面での許可とスコープ合意を取った別フェーズでのみ行う。
- promptfoo の対象は自作の練習プロンプトのみ。実プロダクトのシステムプロンプトや社外秘データは使わない。生成した敵対的プロンプトは外部に送信しない。
- RedAmon は個人の Mac では要件未達のため、専用環境（ディスク 80GB+・Docker 28+・RAM 4GB+）が用意できるまで実行保留。promptfoo を先行する（作業ディレクトリ `poc/promptfoo/` は未作成）。
- RedAmon の採点は `poc/docs/vampi-known-vulns.md` を正解リストとする。#5, #8, #9 は安全版でも残る設計なので、安全版で指摘されても誤検知に数えない。
