# 概要

<!-- 何を・なぜ変えたかを 1〜3 行で -->

## 関連 Issue

<!-- 例: close #1 -->

## 変更の種類

- [ ] テストの追加・修正（Playwright）
- [ ] テストケース（台帳）・運用ルールの変更
- [ ] ドキュメント
- [ ] CI・設定
- [ ] セキュリティ PoC（`poc/`）

## 対象

- アプリ: <!-- next-article-share-app / tutorialsninja（playwright-ec2）/ なし -->
- ケース ID: <!-- 例: AUTH-001, ART-003 -->

## 確認したこと

<!-- 実行したコマンドと結果。接続先（ローカル / ステージング / 本番）も書く -->
<!-- 本番で流してよいのは @smoke だけ（npm run test:smoke）。全テストは流さない -->

```bash
# 例: ローカル・ステージング
BASE_URL=http://localhost:3000 npx playwright test --reporter=list
# 例: 本番（@smoke のみ）
BASE_URL=<本番の URL> npm run test:smoke
```

## チェックリスト

### next-article-share-app のテストを追加・変更したとき

<!-- playwright-ec2 だけの PR では不要 -->

- [ ] 書き込みをするテストは `fixtures/index.ts` の `test` を使っている（`WRITABLE_HOSTS` に無いホスト＝本番では自動でスキップされる）
- [ ] `@smoke` に書き込みをするテストを入れていない（本番で流すため）
- [ ] [テストケース台帳](https://claude.ai/artifact/MgNuPUxHXpuNYDJKb2Zy83)で本番が `auto` のケースには `{ tag: '@smoke' }` を付けた
- [ ] 作成データに `e2e-` を付け、テストの後で削除している
- [ ] アプリへの依存は URL・画面の文言・`data-testid` だけ
- [ ] 対象外のもの（パスワードリセット・画像アップロード・OAuth）を自動テストに入れていない
- [ ] 追加・変更したテストの名前を `[ケースID] タイトル` にした（既存のテストは、変更したものから順に対応する）
- [ ] 台帳の自動テストの実装状況を更新した

### 共通

- [ ] パスワード・トークンなどの秘密情報を含めていない（台帳を含む）
- [ ] `poc/targets/`・`poc/tools/` のファイルを含めていない
- [ ] セキュリティツールを本番・ステージング・第三者の環境に向けていない
