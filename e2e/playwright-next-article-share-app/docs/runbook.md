# runbook

`playwright-next-article-share-app`（next-article-share-app の外部 E2E）の運用手順。初回の環境構築は [setup.md](./setup.md)、テストの書き方は [README](../README.md) を参照。

コマンドはすべて `e2e/playwright-next-article-share-app/` で実行する。

## 早見表

| やりたいこと | コマンド |
| --- | --- |
| テストを流す前の静的チェック | `./scripts/check.sh` |
| ステージングで全テスト | `./scripts/run.sh stg --reporter=list` |
| 本番で smoke | `PROD_URL=<本番の URL> ./scripts/run.sh prod --reporter=list` |
| ローカルで全テスト | `./scripts/run.sh local --reporter=list`（アプリの起動が必要） |
| ケース ID で 1 件だけ | `./scripts/run.sh stg -g "AUTH-002"`（本番では `-g` は使えない。ファイル名か `ファイル:行` で指定する） |
| 直近のレポートを開く | `npm run report` |
| trace を開く | `npx playwright show-trace test-results/<テスト>/trace.zip` |

注: 既定の reporter は html。`--reporter=list` を付けて実行すると HTML レポートは生成されないため、その実行結果は `npm run report` で開けない（開けるのは直近の html reporter の実行分）。レポートを見たいときは `--reporter=list` を外して実行する。

## 守ること

- **本番では `@smoke` だけを流す**（`./scripts/run.sh prod`。必ず `--grep @smoke` が付き、`-g` などの grep 指定はエラーになる）。`npm test` を本番に向けない。書き込み系は `WRITABLE_HOSTS` で自動スキップされるが、それは付け忘れ対策の保険であって、運用で頼らない
- **`environments.json` と `WRITABLE_HOSTS`（`fixtures/index.ts`）に本番ホストを足さない**（`WRITABLE_HOSTS` は `environments.json` から作られる）
- **アプリをローカル起動する前に、アプリ側 `.env` の `DATABASE_URL` が Neon を指していないか確認する**（[setup.md](./setup.md#ローカル)）
- **DB / Prisma には触らない**。データの作成・削除は UI からだけ行う
- テストの成否は接続先とセットで記録する（「ステージングで passed」のように）

## 実行タイミング

| タイミング | 接続先 | 流すテスト | 手動で確認するもの |
| --- | --- | --- | --- |
| テストを追加・変更したとき | ステージング（またはローカル） | 変更したテスト → 全テスト | - |
| リリース前（アプリ側で `master` に push → `deploy-staging.yml` 完了後） | ステージング | 全テスト | 台帳で stg が `manual` の P1・P2 |
| リリース後（GitHub Release 公開 → `deploy-prod.yml` 完了後） | 本番 | `@smoke` のみ | 台帳で prod が `manual` の P1・P2（UAT） |

GitHub Actions からの自動実行は未着手（[poc-plan.md](../../../poc/next-article-share-app/poc-plan.md) のフェーズ 2〜3）。整備されるまでは以下を手動で行う。

## リリース前（ステージング）

1. アプリ側の Actions で Deploy Staging が成功していることを確認する
2. 全テストを流す

   ```bash
   ./scripts/run.sh stg --reporter=list
   ```

3. 失敗があれば [失敗したとき](#失敗したとき) に沿って切り分ける
4. [テストケース台帳](https://claude.ai/artifact/MgNuPUxHXpuNYDJKb2Zy83) で stg が `manual` のケースのうち P1・P2 を手で確認し、実施記録を残す
5. 結果（passed / failed の件数、失敗したケース ID、判断）をリリースの Issue や PR に書く

## 本番（リリース後）

1. アプリ側の Actions で Deploy Production が成功していることを確認する
2. `@smoke` だけを流す

   ```bash
   PROD_URL=<本番の URL> ./scripts/run.sh prod --reporter=list
   ```

3. 書き込みが必要なケース（台帳で prod が `manual`）は UAT として手で確認する。固定テストアカウントを使い、作ったデータはその場で削除する
4. 失敗したら、まずステージングで同じテストが通るか確認する（下記）。本番だけで落ちるなら環境差（環境変数・DB・外部サービスの設定）を疑い、アプリ担当に共有する

## 失敗したとき

### 1. 再現するか確かめる

```bash
./scripts/run.sh <同じ環境> -g "<ケース ID かテスト名の一部>" --reporter=list
# 本番は -g が使えないので、ファイルと行で指定する
PROD_URL=<本番の URL> ./scripts/run.sh prod tests/smoke/auth.spec.ts:9 --reporter=list
```

- **2 回目で通る**: コールドスタートや一時的な遅延の可能性が高い。初回のエラーが `Timeout` / `net::ERR_*` なら様子見でよい。何度も起きるなら flaky として Issue にする
- **毎回落ちる**: 次へ

### 2. 何が起きたかを見る

失敗したテストは `test-results/` に trace が残る（`trace: 'retain-on-failure'`）。

```bash
npm run report                                         # HTML レポート。失敗したテストから trace を開ける
npx playwright show-trace test-results/<テスト>/trace.zip
```

trace では操作ごとの画面・DOM・ネットワーク・コンソールを確認できる。画面を見ながら追いたいときは `--headed` か `--debug` で流す。

### 3. 原因を切り分ける

| 見えたこと | 疑うもの | 対応 |
| --- | --- | --- |
| 画面の文言・placeholder・ボタン名が変わっていて要素が見つからない | 仕様変更 or テストの追従漏れ | 仕様どおりの変更ならテストを直す（台帳の期待結果も確認）。意図しない変更ならアプリの不具合 |
| 画面は出ているが期待結果と違う（エラーが出ない、一覧に出ない など） | アプリの不具合 | アプリのリポジトリに Issue を立てる。ケース ID・接続先・trace のスクリーンショットを添える |
| 5xx / 画面が真っ白 / `net::ERR_*` が続く | 環境（デプロイ失敗、DB 接続、環境変数） | アプリ側のデプロイ状況と Vercel のログを確認する。アプリ担当に共有する |
| ローカルだけで落ちる | ローカルの DB・アプリのバージョン | アプリを最新の `master` にし、`npx prisma migrate dev` を流し直す |
| 後片付け（fixture の teardown）で落ちる | 退会処理 or ログインの不具合 | データが残っている可能性がある。下記の [データが残ったとき](#データが残ったとき) を見る |

### 4. 記録する

- アプリの不具合: アプリのリポジトリに Issue
- テスト側の問題（flaky・追従漏れ）: このリポジトリに Issue。直すまで `test.fixme()` で止める場合は Issue 番号をコメントに書く
- 台帳の実施記録に結果を残す

## データが残ったとき

テストが作るデータは `e2e-` で始まる（ユーザー: メール `e2e-<時刻>-<乱数>@example.com`・名前 `e2e-user`、記事: タイトル `e2e-記事-...`）。通常は fixture の後片付けで退会し、記事も一緒に消える。残るのは次のような場合。

- テストの実行中にプロセスを止めた（Ctrl+C など）
- 後片付けの退会が失敗した（その場合テストも failed になる）

### 消し方（ステージング）

1. 失敗したテストの trace を開き、新規登録の操作で入力したメールアドレスを確認する（パスワードは `helpers/auth.ts` の `createTestUser()` の値）
2. ステージングでそのユーザーでログインし、`/settings/withdraw` から退会する（投稿記事も削除される）
3. trace が無くてメールアドレスが分からない場合は、残っているデータ（記事一覧の `e2e-記事-...` など）を控えてアプリ担当に共有する。こちらから DB を直接消さない

本番には書き込み系テストを流さないので、本番に `e2e-` データがあれば運用ミス。経緯を確認して Issue にする。

## 環境を増やすとき

- 書き込みを許可する環境なら `environments.json` に URL を足す。`WRITABLE_HOSTS` と `scripts/run.sh` の環境名はここから作られる（本番は足さない。`run.sh` の環境名を増やすときは `case` にも足す）
- この runbook・[setup.md](./setup.md)・AGENTS.md の対象環境の表を更新する
