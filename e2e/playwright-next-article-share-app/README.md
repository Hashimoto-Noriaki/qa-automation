# playwright-next-article-share-app

[next-article-share-app](https://github.com/Hashimoto-Noriaki/next-article-share-app) の外部 E2E テストを Playwright で自動化するプロジェクト。
方針は [PoC 計画](../../poc/next-article-share-app/poc-plan.md) を参照。

テストケースの一覧（どれを自動化するか・実装状況）は **[テストケース台帳](https://claude.ai/artifact/MgNuPUxHXpuNYDJKb2Zy83)** で管理している。テスト名は `[ケースID] タイトル` にする（例: `[AUTH-002] 誤った認証情報でログインするとエラーが表示される`）。

## ドキュメント

- [セットアップ](docs/setup.md): 初回の環境構築、接続先ごとの準備、動作確認
- [runbook](docs/runbook.md): 環境別の実行手順、リリース前後のリグレッション、失敗時の切り分け、データが残ったときの対処

## セットアップ

```bash
npm install
npx playwright install chromium
```

詳細は [docs/setup.md](docs/setup.md)。

## 接続先

`playwright.config.ts` の `baseURL` は環境変数 `BASE_URL` で切り替える（未指定時は `environments.json` の `local`。`http://localhost:3000`）。

```bash
BASE_URL=https://example.com/ npm test
```

## 環境ごとの実行

`scripts/run.sh` に環境名を渡すと、接続先と実行するテストが決まる。2 つ目以降の引数は `playwright test` にそのまま渡す。

| 環境 | 実行するテスト | コマンド |
| --- | --- | --- |
| ローカル | 全テスト（書き込みあり） | `./scripts/run.sh local` |
| ステージング | 全テスト（書き込みあり） | `./scripts/run.sh stg` |
| 本番 | `@smoke` のみ（スクリプトが必ず `--grep @smoke` を付ける。`-g` / `--grep` / `-G` / `--grep-invert` を渡すとエラー） | `PROD_URL=https://<prod> ./scripts/run.sh prod` |

```bash
./scripts/run.sh stg -g "AUTH-"     # ステージングで AUTH のケースだけ
./scripts/run.sh local --headed     # ブラウザ表示あり
```

- local / stg の URL は `environments.json` に書く。書き込みを許可するホスト（`WRITABLE_HOSTS`）もここから作るので、URL を変えるときは `environments.json` だけを直す
- 本番で絞り込むときは、grep ではなくファイル名や行番号を使う（例: `./scripts/run.sh prod tests/smoke/auth.spec.ts`）。Playwright は最後に指定した grep だけを使うため、grep を渡すと `@smoke` の限定が外れてしまう
- 本番の URL はリポジトリに書かない。環境変数 `PROD_URL` で渡すか、`.env`（git 管理外。`.env.example` をコピーして作る）に書く。すでに設定済みの環境変数が優先される
- スクリプトを使わずに `BASE_URL=... npm test` で直接実行してもよい

書き込み系テスト（fixture の `testUser` を使うテスト）は、`fixtures/index.ts` の `WRITABLE_HOSTS`（`environments.json` の local・stg のホストと `127.0.0.1`）に無いホストではスキップされる。本番で `npm test` を流しても書き込みは起きない（`@smoke` の付け忘れ対策）。

## fixtures と helpers

役割の違い:

- **fixtures**: テストの前後処理を受け持つ。テストデータの用意と、テスト後の後片付けを自動で行う
- **helpers**: 画面操作をまとめた関数。テスト本体や fixture から呼び出す

### fixtures（`fixtures/index.ts`）

書き込み系テストは `@playwright/test` ではなく、`fixtures` の `test` / `expect` を import する。

| fixture | 内容 | 後片付け |
| --- | --- | --- |
| `testUser` | `e2e-` で始まるメールアドレスの使い捨てユーザーの認証情報。**登録はしない**（新規登録そのものをテストしたい場合に使う） | テスト後、別のブラウザコンテキストでログインし、登録済みなら退会させる。テスト内で退会済みならスキップ |
| `loggedInPage` | `testUser` で新規登録し、ログインした状態の `page` | `testUser` の後片付けで退会する |

- 退会すると投稿した記事もアプリ側で削除される（カスケード削除）。そのため、記事を個別に削除する後片付けは不要
- テストが途中で失敗しても後片付けは実行される。後片付けに失敗した場合はテストも失敗になるので、データの残りに気づける
- プロセスの強制終了などでデータが残った場合も、`e2e-` で始まるので識別できる
- `testUser` を使うテストは、`WRITABLE_HOSTS` に無いホストではスキップされる。環境を増やすときは `environments.json` に足す（本番は足さない）
- `@smoke` タグの付いたテストで `testUser` / `loggedInPage` を使うと、テストはエラーになる（本番での書き込みを防ぐため。check.sh でも事前に検出する）

### helpers（`helpers/`）

| ファイル | 関数 | 内容 |
| --- | --- | --- |
| `auth.ts` | `createTestUser()` | `e2e-` で始まる認証情報を生成する |
| | `signup(page, user)` | `/signup` から新規登録する |
| | `submitLogin(page, user)` | ログインフォームを送信するだけ（成否は待たない。エラー表示の確認に使う） |
| | `login(page, user)` | ログインし、`/login` から離れるまで待つ |
| | `tryLogin(page, user)` | ログインを試し、成功したかを返す（後片付け用） |
| | `logout(page)` | `/articles` のヘッダーからログアウトする |
| | `withdraw(page)` | `/settings/withdraw` から退会する（確認ダイアログは自動で承認） |
| `article.ts` | `createTestArticle()` | タイトルが `e2e-記事-` で始まる記事データを生成する |
| | `createArticle(page, article)` | `/articles/new` から記事を公開する |
| | `openArticleFromList(page, title)` | 記事一覧からタイトルをクリックして詳細へ移動する |

### 書き方の例

```ts
import { test, expect } from '../../fixtures';
import { createTestArticle, createArticle } from '../../helpers/article';

test('記事を作成できる', async ({ loggedInPage: page }) => {
  const article = createTestArticle();
  await createArticle(page, article);
  await expect(page.getByText(article.title).first()).toBeVisible();
  // 後片付けは不要（testUser の退会で記事ごと削除される）
});
```

### 追加するときのルール

- 作成するデータには `e2e-` プレフィックスを付ける
- 後片付けは fixture に書く（テスト本体の最後に書くと、途中で失敗したときに実行されない）
- 画面の要素は URL・画面上の文言・`data-testid` で探す。アプリのコードは import しない
- 読み取りだけのテスト（`@smoke`）は fixtures を使わず、`@playwright/test` から import する

## コマンド

| コマンド | 内容 |
| --- | --- |
| `./scripts/run.sh <local\|stg\|prod>` | 環境を指定して実行（[環境ごとの実行](#環境ごとの実行)） |
| `./scripts/check.sh`（`npm run check`） | テストを流す前の静的チェック（下記） |
| `npm test` | 全テストをヘッドレスで実行 |
| `npm run test:smoke` | `@smoke` タグのテストだけ実行（本番向け） |
| `npm run test:ui` | UI モードで起動（テストの選択・デバッグ） |
| `npm run report` | 直近の HTML レポートを開く |
| `npx playwright test tests/xxx.spec.ts --headed` | 指定ファイルだけをブラウザ表示ありで実行 |
| `npx playwright test --debug` | Inspector で1ステップずつ実行 |

その他の Playwright CLI は [playwright-ec2 の README](../playwright-ec2/README.md#playwright-cli) を参照。

### check.sh のチェック内容

アプリには接続しないので、どの環境でも数秒で終わる。テストを書いたら PR を出す前に流す。

| # | チェック | 結果 |
| --- | --- | --- |
| 1 | 型チェック（`tsc --noEmit`） | 型エラーがあればエラー |
| 2 | `.only` の残り（`test.describe.serial.only` なども含む。Playwright の `--forbid-only` で判定） | 残っていればエラー |
| 3 | `@smoke` のテストが書き込み系の fixture を使っていないか。`tests/smoke/` のファイルと `@smoke` タグの付いたテストのファイルから相対 import（`require`・helper 経由も含む）をたどり、`fixtures/` か `.extend` にたどり着いたらエラー | 使っていればエラー（smoke は本番で流すため） |
| 4 | テスト名が `[ケースID]` で始まっているか | ID が無ければ警告（ID 未採番のテストがあるため、今はエラーにしない） |

エラーが 1 件でもあれば終了コード 1 で終わる。テスト一覧が取れない（構文エラーなど）ときは、Playwright のエラーを表示してエラーにする。

## ディレクトリ構成

```text
playwright-next-article-share-app/
  playwright.config.ts   # baseURL・タイムアウト・ブラウザ・レポーター設定
  environments.json      # local / stg の URL（本番は書かない）
  tsconfig.json          # 型チェック（check.sh）用の設定
  .env.example           # 環境変数のサンプル（playwright は自動で読み込まない。scripts/run.sh は読み込む）
  docs/                  # setup.md・runbook.md
  scripts/
    run.sh               # 環境を指定してテストを実行
    check.sh             # 静的チェック（型・.only・smoke の書き込み・ケース ID）
    lib/inspect-tests.js # check.sh の 3・4 の判定
  fixtures/              # テストデータの用意と後片付け（testUser・loggedInPage）
  helpers/               # 画面操作の関数（認証・記事）
  tests/
    smoke/               # @smoke: 本番でも流せる読み取り系
    regression/          # 書き込みあり: ローカル・ステージングのみ
```
