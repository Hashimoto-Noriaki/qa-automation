# セットアップ

`playwright-next-article-share-app` を初めて動かすまでの手順。日々の実行・失敗時の対応は [runbook](./runbook.md) を参照。

## 1. 前提

| ツール | バージョンの目安 | 用途 |
| --- | --- | --- |
| Node.js | 20 以上（アプリ側の `.nvmrc` は 20.19.0） | Playwright の実行 |
| npm | Node.js に同梱 | 依存のインストール |
| Docker | Docker Desktop など | ローカルでアプリを動かすときの DB（ローカル実行のときだけ） |

このリポジトリのルートには `package.json` が無い。コマンドはすべて `e2e/playwright-next-article-share-app/` で実行する。

## 2. インストール

```bash
cd e2e/playwright-next-article-share-app
npm install
npx playwright install chromium
```

Linux（CI など）で依存ライブラリが足りないときは `npx playwright install --with-deps chromium` を使う。

## 3. 接続先の指定

接続先は `scripts/run.sh` に環境名を渡して切り替える。local / stg の URL は `environments.json` にある。

```bash
./scripts/run.sh local
./scripts/run.sh stg
PROD_URL=<本番の URL> ./scripts/run.sh prod   # @smoke のみ
```

スクリプトを使わずに、環境変数 `BASE_URL` を直接指定してもよい（未指定時は `http://localhost:3000`）。

```bash
BASE_URL=https://article-share-stg.vercel.app npm test
```

> **注意**: `playwright.config.ts` は `.env` を自動で読み込まない。`.env`（`.env.example` をコピーして作る）を読むのは `scripts/run.sh` だけで、使うのは `PROD_URL`。`BASE_URL` は `run.sh` が環境名から決めるので、`.env` に書いても使われない。

| 環境 | `BASE_URL` | 流してよいテスト |
| --- | --- | --- |
| ローカル | `http://localhost:3000`（未指定でよい） | 全テスト |
| ステージング | `https://article-share-stg.vercel.app` | 全テスト（書き込みあり） |
| 本番 | （未共有） | `@smoke` のみ |

## 4. 接続先ごとの準備

### ステージング（おすすめ）

準備は不要。ステージングは Deployment Protection なしで外から到達できる。まず動作確認したいだけなら、ローカルでアプリを起動するよりこちらが手軽。

### ローカル

別リポジトリ [next-article-share-app](https://github.com/Hashimoto-Noriaki/next-article-share-app) のアプリを起動しておく必要がある。

**起動前に、アプリ側の `.env` の `DATABASE_URL` がローカルの DB（`localhost:5432`）を指しているか必ず確認する。** Neon（`*.neon.tech`。ステージング / 本番の DB）を指したまま起動すると、`localhost` 向けのテスト（書き込みあり）がその DB に `e2e-` ユーザーや記事を作る。

```bash
# アプリのリポジトリのルートで
docker compose up db -d     # DB だけ起動
npx prisma migrate dev      # DB が空のときだけ。テーブルを作る
npm run dev                 # http://localhost:3000 で起動

# 終わるとき
docker compose down
```

詳細はアプリ側の README の「Docker」「E2E」の節を参照。

### 本番

URL は未共有。本番に向けるときは `@smoke` だけを流す（[runbook](./runbook.md) 参照）。書き込み系テストは `fixtures/index.ts` の `WRITABLE_HOSTS` に無いホストでは自動でスキップされるが、`npm test` ではなく `./scripts/run.sh prod`（必ず `@smoke` のみになる）を使う。

## 5. 動作確認

まず読み取りだけの `@smoke` で接続できるか確かめる。

```bash
./scripts/check.sh                                      # まずテストのコードに問題が無いか（アプリには接続しない）
./scripts/run.sh stg --grep @smoke --reporter=list
```

`[STC-001]` `[AUTH-001]` `[AUTH-002]` の 3 件が passed になれば OK。続けて全テスト（書き込みあり）を流す。

```bash
./scripts/run.sh stg --reporter=list
```

## 6. あると便利なもの

- VS Code の拡張機能 [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright): エディタからテストを 1 件ずつ実行・デバッグできる。接続先を変えるときは、VS Code を `BASE_URL` を export したターミナルから起動する
- `npm run test:ui`: UI モード。テストを選んで実行し、各ステップの画面を確認できる

## よくあるつまずき

| 症状 | 原因と対処 |
| --- | --- |
| `Executable doesn't exist at ...chromium...` | ブラウザ未インストール。`npx playwright install chromium` |
| `net::ERR_CONNECTION_REFUSED at http://localhost:3000` | `BASE_URL` 未指定でローカルに向いているが、アプリが起動していない。アプリを起動するか `BASE_URL` を指定する |
| 書き込み系テストが skipped になる | `BASE_URL` のホストが `WRITABLE_HOSTS` に無い。本番なら正しい挙動。ステージングの URL を打ち間違えていないか確認する |
| `.env` に書いた `BASE_URL` が効かない | `.env` を読むのは `scripts/run.sh` だけで、`BASE_URL` は環境名から決まる（3. 参照） |
| `run.sh prod` で `PROD_URL で指定してください` と出る | `PROD_URL` を環境変数で渡すか、`.env` に書く |
| `run.sh prod` で `-g は使えません` と出る | 本番は `@smoke` に限定するため grep を受け付けない。ファイル名か `ファイル:行` で絞り込む |
| ステージングで初回だけタイムアウトする | コールドスタート。もう一度流して再現するか確認する（[runbook](./runbook.md#失敗したとき) 参照） |
