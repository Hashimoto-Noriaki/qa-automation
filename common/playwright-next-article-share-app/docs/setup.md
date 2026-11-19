# セットアップ

`playwright-next-article-share-app` を初めて動かすまでの手順。日々の実行・失敗時の対応は [runbook](./runbook.md) を参照。

## 1. 前提

| ツール | バージョンの目安 | 用途 |
| --- | --- | --- |
| Node.js | 20 以上（アプリ側の `.nvmrc` は 20.19.0） | Playwright の実行 |
| npm | Node.js に同梱 | 依存のインストール |
| Docker | Docker Desktop など | ローカルでアプリを動かすときの DB（ローカル実行のときだけ） |

このリポジトリのルートには `package.json` が無い。コマンドはすべて `common/playwright-next-article-share-app/` で実行する。

## 2. インストール

```bash
cd common/playwright-next-article-share-app
npm install
npx playwright install chromium
```

Linux（CI など）で依存ライブラリが足りないときは `npx playwright install --with-deps chromium` を使う。

## 3. 接続先の指定

接続先は環境変数 `BASE_URL` で切り替える（未指定時は `http://localhost:3000`）。

```bash
BASE_URL=https://article-share-stg.vercel.app npm test
```

> **注意**: `.env.example` はあるが、`playwright.config.ts` は `.env` を自動で読み込まない。`.env` に書いても反映されないので、コマンドの前に付けるか `export BASE_URL=...` する。

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
# アプリのリポジトリで（next-app-router-share-app/）
docker compose up db -d     # DB だけ起動
npx prisma migrate dev      # DB が空のときだけ。テーブルを作る
npm run dev                 # http://localhost:3000 で起動

# 終わるとき
docker compose down
```

詳細はアプリ側の README の「Docker」「E2E」の節を参照。

### 本番

URL は未共有。本番に向けるときは `@smoke` だけを流す（[runbook](./runbook.md) 参照）。書き込み系テストは `fixtures/index.ts` の `WRITABLE_HOSTS` に無いホストでは自動でスキップされるが、`npm test` ではなく `npm run test:smoke` を使う。

## 5. 動作確認

まず読み取りだけの `@smoke` で接続できるか確かめる。

```bash
BASE_URL=https://article-share-stg.vercel.app npm run test:smoke -- --reporter=list
```

`[STC-001]` `[AUTH-001]` `[AUTH-002]` の 3 件が passed になれば OK。続けて全テスト（書き込みあり）を流す。

```bash
BASE_URL=https://article-share-stg.vercel.app npx playwright test --reporter=list
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
| `.env` に書いた `BASE_URL` が効かない | `.env` は読み込まれない（3. 参照） |
| ステージングで初回だけタイムアウトする | コールドスタート。もう一度流して再現するか確認する（[runbook](./runbook.md#失敗したとき) 参照） |
