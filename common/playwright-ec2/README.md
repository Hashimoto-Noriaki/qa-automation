# playwright-ec2

デモ EC サイト [tutorialsninja.com/demo](https://tutorialsninja.com/demo/) の E2E テストを Playwright で自動化するプロジェクト。

## セットアップ

```bash
npm install
npx playwright install chromium
```

## 接続先

`playwright.config.ts` の `baseURL` は環境変数 `BASE_URL` で切り替える（未指定時は `https://tutorialsninja.com/demo/`）。

```bash
BASE_URL=https://example.com/ npm test
```

## コマンド

### npm scripts

| コマンド          | 内容                                 |
| ----------------- | ------------------------------------ |
| `npm test`        | 全テストをヘッドレスで実行           |
| `npm run test:ui` | UI モードで起動（テストの選択・デバッグ） |
| `npm run report`  | 直近の HTML レポートを開く           |

### Playwright CLI

| コマンド                                            | 内容                                         |
| --------------------------------------------------- | -------------------------------------------- |
| `npx playwright test`                               | 全テストを実行                               |
| `npx playwright test tests/smoke.spec.ts`           | ファイルを指定して実行                       |
| `npx playwright test -g "トップページ"`             | テスト名で絞り込んで実行                     |
| `npx playwright test --headed`                      | ブラウザを表示して実行                       |
| `npx playwright test --debug`                       | Playwright Inspector でステップ実行          |
| `npx playwright test --project=chromium`            | プロジェクト（ブラウザ）を指定して実行       |
| `npx playwright test --reporter=list`               | 結果をターミナルに一覧表示                   |
| `npx playwright test --last-failed`                 | 前回失敗したテストだけ再実行                 |
| `npx playwright show-report`                        | HTML レポートを開く                          |
| `npx playwright show-trace <trace.zip>`             | トレースを開く（失敗時の調査）               |
| `npx playwright codegen https://tutorialsninja.com/demo/` | 操作を記録してテストコードを生成       |
| `npx playwright --version`                          | バージョン確認                               |

## ディレクトリ構成

```text
playwright-ec2/
  playwright.config.ts   # baseURL・ブラウザ・レポーター設定
  tests/                 # テストコード（*.spec.ts）
```
