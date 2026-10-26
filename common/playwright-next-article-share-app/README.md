# playwright-next-article-share-app

[next-article-share-app](https://github.com/Hashimoto-Noriaki/next-article-share-app) の外部 E2E テストを Playwright で自動化するプロジェクト。
方針は [PoC 計画](../../poc/next-article-share-app/poc-plan.md) を参照。

## セットアップ

```bash
npm install
npx playwright install chromium
```

## 接続先

`playwright.config.ts` の `baseURL` は環境変数 `BASE_URL` で切り替える（未指定時は `http://localhost:3000`）。

```bash
BASE_URL=https://example.com/ npm test
```

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm test` | 全テストをヘッドレスで実行 |
| `npm run test:smoke` | `@smoke` タグのテストだけ実行（本番向け） |
| `npm run test:ui` | UI モードで起動（テストの選択・デバッグ） |
| `npm run report` | 直近の HTML レポートを開く |
| `npx playwright test tests/xxx.spec.ts --headed` | 指定ファイルだけをブラウザ表示ありで実行 |
| `npx playwright test --debug` | Inspector で1ステップずつ実行 |

その他の Playwright CLI は [playwright-ec2 の README](../playwright-ec2/README.md#playwright-cli) を参照。

## ディレクトリ構成

```text
playwright-next-article-share-app/
  playwright.config.ts   # baseURL・タイムアウト・ブラウザ・レポーター設定
  .env.example           # 環境変数のサンプル
  tests/
    smoke/               # @smoke: 本番でも流せる読み取り系
```
