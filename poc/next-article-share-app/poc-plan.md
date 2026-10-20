# PoC 計画: next-article-share-app の外部 E2E 自動化

## 目的

アプリ本体（[next-article-share-app](https://github.com/Hashimoto-Noriaki/next-article-share-app)）のコードに依存しない **外部 QA リポジトリ** で E2E を自動化する。

- アプリ内の E2E（`e2e/*.spec.ts`）は「PR 時にローカル DB を立てて回す」役割
- こちらは「**URL だけを前提にしたブラックボックステスト**」で、ローカル → ステージング → 本番 と同じテストを流用できることを狙う

## 方針

| 項目           | 方針                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| ツール         | Playwright Test（TypeScript）                                                         |
| 既存 E2E       | 移植しない。ゼロから書く（アプリ側の `e2e/` はセレクタや画面遷移の参考にとどめる）     |
| 接続先         | 環境変数 `BASE_URL` で切り替え（デフォルト `http://localhost:3000`）                  |
| テストデータ   | UI から作成する。DB・Prisma には触らない                                              |
| 後片付け       | UI から削除する（記事削除、`/settings/withdraw` での退会）                            |
| アプリへの依存 | URL・画面上の文言・`data-testid` のみ。`import` やスキーマ参照はしない                |

### なぜ「API から作成」ではなく UI なのか

アプリの更新系は主に Server Actions で、外部から叩ける安定した REST API がほぼない（`/api` は `auth` と `upload` のみ）。
そのため、データ作成は UI 経由にする。速度が問題になったら、ログイン状態を `storageState` で使い回して短縮する。

## 環境ロードマップ

| フェーズ | 接続先                              | 実行タイミング                         | 実行するテスト         |
| -------- | ----------------------------------- | -------------------------------------- | ---------------------- |
| 1（今）  | ローカル（docker compose + `npm run dev`） | 手動                                   | 全シナリオ             |
| 2        | ステージング（Cloud Run `-stg`）    | アプリ側の Deploy Staging 完了後に起動 | 全シナリオ             |
| 3        | 本番（Cloud Run `-prod`）           | リリース後に起動                       | `@smoke` タグのみ      |

### デプロイ後の自動実行（フェーズ 2〜3）

- アプリ側の `deploy-staging.yml` の最後に `repository_dispatch` を送るステップを足し、こちらの GitHub Actions を起動する
  - こちらのワークフローは `on: repository_dispatch` + `workflow_dispatch`（手動実行用）で受ける
- 接続先 URL は GitHub Secrets（`STG_BASE_URL` / `PROD_BASE_URL`）で渡す
- 失敗時は Playwright のレポートを artifact に残す

### デプロイ環境で注意すること

- **データが残る**: ローカルと違い DB を捨てられない。各テストの `afterEach` / fixture で必ず削除し、作成データには `e2e-` プレフィックスを付けて識別できるようにする
- **本番は読み取り中心**: 本番では書き込みをしない `@smoke`（トップ表示・ログイン画面表示・既存アカウントでのログインなど）に絞る。本番用の固定テストアカウントは Secrets で渡す
- **外部サービス**: パスワードリセット（Gmail 送信）や画像アップロード（Cloudinary）はステージングでも実サービスに届くため、PoC の対象外にする
- **OAuth（GitHub / Google）**: 自動化が難しいので対象外。メール + パスワード認証のみ扱う
- **コールドスタート**: Cloud Run はスケール 0 から起動するため、初回アクセスのタイムアウトを長めにする（または事前にウォームアップ）

## ディレクトリ構成（案）

```text
qa-automation/
  poc/next-article-share-app/
    package.json
    playwright.config.ts      # BASE_URL / タイムアウトを環境ごとに切替
    .env.example              # BASE_URL, 本番用テストアカウントなど
    tests/
      smoke/                  # @smoke: 本番でも流せる読み取り系
      auth.spec.ts
      article.spec.ts
      ...
    fixtures/                 # ログイン済みユーザー・記事作成＋自動削除の fixture
    pages/                    # 必要になったら Page Object
  .github/workflows/
    e2e-next-article-share-app.yml
```

## 対象シナリオ（PoC）

PoC では主要フローに絞り、外部 E2E の仕組み（環境切替・データ作成と後片付け・デプロイ後の起動）が回ることを確かめる。

| # | シナリオ                                   | タグ     |
| - | ------------------------------------------ | -------- |
| 1 | トップページが表示される                   | `@smoke` |
| 2 | 未ログインで認証必須ページ → `/login` へリダイレクト | `@smoke` |
| 3 | 誤った認証情報でログインするとエラーが出る | `@smoke` |
| 4 | 新規登録 → ログアウト → ログイン → 退会      |          |
| 5 | 記事を作成 → 一覧・詳細に表示 → 編集 → 削除 |          |

PoC 後の候補: 下書き、コメント、いいね、ストック、通知（複数ユーザーが必要なもの）。

## 進め方

1. Playwright の雛形を作り、ローカルでシナリオ 1〜3（`@smoke`）を通す
2. fixture（ユーザー作成＋退会、記事作成＋削除）を作り、シナリオ 4・5 を通す
3. GitHub Actions のワークフローを追加（まずは `workflow_dispatch` で `BASE_URL` を手入力）
4. ステージングに向けて実行し、Cloud Run 特有の問題（タイムアウト・データ残り）を確認する
5. アプリ側に `repository_dispatch` を追加し、デプロイ後に自動で回るようにする

## 決めておきたいこと

- [ ] ステージングの URL と、外部から到達できるか（Basic 認証などの有無）
- [ ] 本番で使う固定テストアカウントを用意してよいか
- [ ] テスト失敗時の通知先（GitHub の通知だけで足りるか、Slack などに飛ばすか）
