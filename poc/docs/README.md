# QA セキュリティ PoC — 共有サマリ

セキュリティ系ツールを QA に取り込めるか評価する PoC の共有用まとめ。詳細は各ドキュメントを参照。
現在 2 本の PoC を進めている。

- **RedAmon**: AI ペネトレーションテスト（API を外から攻撃）→ [redamon.md](./redamon.md)
- **promptfoo**: LLM の入出力評価・レッドチーミング（AI 機能の評価）→ [promptfoo.md](./promptfoo.md)

## これは何か

- 不正アクセスのインシデントをきっかけに、「攻撃側の視点で診断する」仕組みを
  QA に取り込めるかを見極める PoC。RedAmon は API 層、promptfoo は LLM 入出力層をカバーする。
- このフェーズで確かめるのは **ツールの評価**であって、特定アプリ／プロダクトの診断そのものではない。

## 現状（2026-10-26 時点）

| 項目                                        | 状態                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| 【RedAmon】計画・安全境界の策定             | ✅ 完了（[redamon.md](./redamon.md)）                                  |
| 【RedAmon】的アプリ（VAmPI）をローカル起動  | ✅ 完了（脆弱版 `127.0.0.1:18002` / 安全版 `:18001`）                  |
| 【RedAmon】採点用の正解リスト作成           | ✅ 完了（[vampi-known-vulns.md](./vampi-known-vulns.md)、脆弱性 9 件） |
| 【RedAmon】本体の実行・採点                 | ⬜ 未（次フェーズ）                                                    |
| 【promptfoo】計画・安全境界の策定           | ✅ 完了（[promptfoo.md](./promptfoo.md)）                              |
| 【promptfoo】練習プロンプト作成・実行・採点 | ⬜ 未（次フェーズ）                                                    |

> 現状は両 PoC とも「安全に・採点つきで評価する**土台（計画）が整った**」段階。
> RedAmon は的アプリ＋正解リストまで用意済み。各ツールの検出精度・コスト・CI 適合性はこれから実測する。

## ドキュメント構成

| ファイル                                       | 内容                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| [redamon.md](./redamon.md)                     | RedAmon PoC 計画書。目的・安全境界・対象環境・フェーズ・記録テンプレート      |
| [vampi-known-vulns.md](./vampi-known-vulns.md) | VAmPI の既知脆弱性＝「正解リスト」。検出率/誤検知を採点するための答え合わせ表 |
| [promptfoo.md](./promptfoo.md)                 | promptfoo PoC 計画書。LLM 入出力の評価・レッドチーミング（eval / redteam）    |

## 安全面（最重要）

- RedAmon の対象は**自分が管理するローカルの練習用脆弱アプリのみ**。本番・ステージング・他社・クラウド実環境は対象外。
- promptfoo の対象は**自作の練習プロンプトのみ**。実プロダクトのシステムプロンプト・社外秘データは対象外。
- 実システムへの診断は、**書面での許可とスコープ合意**を取った別フェーズでのみ行う（許可なき攻撃は不正アクセス禁止法に触れる）。
- 外部コード（VAmPI / RedAmon）は clone して使うだけで、本リポジトリには取り込まない（`poc/targets/`, `poc/tools/` は gitignore 済み）。
- API キーはこの PoC 用に最小限にし、**月の利用上限を設定**する。

## 次アクション

共通:

- [ ] Anthropic API キー発行＋**月の利用上限設定**（例 $10）。安い `claude-haiku-5-5` から試す

RedAmon:

- [ ] RedAmon 本家を `poc/tools/redamon` に clone →中身確認→ README どおり起動
- [ ] 脆弱版（18002）に対して実行し、正解リストと突き合わせて検出率/誤検知を採点

promptfoo:

- [ ] Node/npx 確認、練習プロンプトの題材決定
- [ ] `poc/promptfoo/` に `promptfooconfig.yaml` を用意し、eval → redteam を実行

共通:

- [ ] 評価結果を本ディレクトリに追記し、現場共有＋導入可否を判断

## 再現手順（練習用アプリの起動）

```bash
# VAmPI を clone（本リポジトリでは追跡しない poc/targets/ に配置）
git clone --depth 1 https://github.com/erev0s/VAmPI.git poc/targets/vampi

# localhost 限定・500x系ポート衝突回避で起動（docker-compose の ports を
# 127.0.0.1:18001 / 127.0.0.1:18002 に調整して使う）
cd poc/targets/vampi && docker compose up -d --build

# DB 初期化
curl -s http://127.0.0.1:18002/createdb
```
