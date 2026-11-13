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

## 環境ごとの実行

| 環境 | 実行するテスト | コマンド例 |
| --- | --- | --- |
| ローカル / ステージング | 全テスト（書き込みあり） | `BASE_URL=https://<stg> npm test` |
| 本番 | `@smoke` のみ | `BASE_URL=https://<prod> npm run test:smoke` |

書き込み系テスト（fixture の `testUser` を使うテスト）は、`fixtures/index.ts` の `WRITABLE_HOSTS`（localhost とステージング）に無いホストではスキップされる。本番で `npm test` を流しても書き込みは起きない（`@smoke` の付け忘れ対策）。

## テストデータと後片付け

- 書き込み系テストは `fixtures/index.ts` の `test` を使う
  - `testUser`: `e2e-` で始まるメールアドレスの使い捨てユーザー。テスト後、登録済みなら別のブラウザコンテキストでログインして退会させる
  - `loggedInPage`: `testUser` で新規登録してログインした状態の `page`
- 退会すると投稿した記事もアプリ側で削除されるため、記事の後片付けはユーザーの退会で済ませる
- テストが途中で失敗しても fixture の後片付けは実行される。プロセスが強制終了された場合などはデータが残るので、`e2e-` で始めて識別できるようにしている

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
  fixtures/              # testUser（作成＋退会）・loggedInPage
  helpers/               # 画面操作（signup / login / logout / withdraw / 記事作成）
  tests/
    smoke/               # @smoke: 本番でも流せる読み取り系
    regression/          # 書き込みあり: ローカル・ステージングのみ
```
