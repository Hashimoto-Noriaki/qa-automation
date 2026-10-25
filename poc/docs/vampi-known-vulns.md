# VAmPI 既知脆弱性リスト（RedAmon 採点用の「正解」）

RedAmon の検出結果を採点するための答え合わせ表。出典は VAmPI 本家の README
"List of Vulnerabilities" と**実装ソース**（`poc/targets/vampi/api_views/`, `models/`）。
挙動は `vulnerable=1/0` の分岐をソースで確認済み。

- 対象: `poc/targets/vampi`（本家 erev0s/VAmPI、MIT）
- 起動: **脆弱版** `http://127.0.0.1:18002`（`vulnerable=1`）/ **安全版** `http://127.0.0.1:18001`（`vulnerable=0`）
- 事前に `GET /createdb` でダミーデータ投入が必要
- ダミーユーザー（初期データ）:
  - `name1 / pass1`（一般）, `name2 / pass2`（一般）, `admin / pass1`（管理者）
- 題材は OWASP API Security Top 10

## 使い方（採点ルール）

- **検出(TP)**: 脆弱版で、下表の脆弱性を RedAmon が指摘できたら正解
- **見逃し(FN)**: 下表にあるのに指摘されなかったもの
- **誤検知(FP)**: 下表に無い指摘。ただし ⚠「安全版でも残る」印の項目は、安全版(18001)で
  指摘されても **FP ではない**（設計上わざと残されているため）
- 検出率 = TP / (TP + FN)、誤検知数 = FP の件数

## 正解表（全 9 件）

| # | 脆弱性 | OWASP API 分類 | 該当エンドポイント | 安全版でも残る | 脆弱版(=1)の挙動 | 安全版(=0)の挙動 | ソース位置 |
| - | ------ | -------------- | ----------------- | :----------: | ---------------- | ---------------- | ---------- |
| 1 | SQL インジェクション | API8 Injection | `GET /users/v1/{username}` | – | username を生 SQL に文字列連結（`SELECT * FROM users WHERE username = '{username}'`） | ORM の `filter_by` を使用し注入不可 | `models/user_model.py` `get_user()` |
| 2 | 認可されないパスワード変更 | API5 BFLA | `PUT /users/v1/{username}/password` | – | パス変更先をパスの `username` で特定→**他人のパスワードを変更可能** | トークンの `sub`（本人）のみ変更 | `api_views/users.py` `update_password()` |
| 3 | オブジェクトレベル認可の破れ (BOLA) | API1 BOLA | `GET /books/v1/{book}` | – | book_title だけで検索し、所有者チェック無し→**他人の本の secret 閲覧可** | 本人所有の本に限定 | `api_views/books.py` `get_by_title()` |
| 4 | マスアサインメント | API6 Mass Assignment | `POST /users/v1/register` | – | body に `admin:true` を渡すと**管理者として登録可** | `admin` フィールドを無視 | `api_views/users.py` `register_user()` |
| 5 | debug による過剰なデータ露出 | API3 Excessive Data Exposure | `GET /users/v1/_debug` | ⚠ あり | **無認証で全ユーザーの password/admin を返す** | 同左（この endpoint は分岐が無く常に露出） | `api_views/users.py` `debug()` / `user_model.json_debug()` |
| 6 | ユーザー名・パスワードの列挙 | API2 Broken Auth | `POST /users/v1/login` | – | 「Username does not exist」/「Password is not correct…」と**応答を区別** | 常に「Username or Password Incorrect!」で一本化 | `api_views/users.py` `login_user()` |
| 7 | RegexDOS（正規表現 DoS） | API4 Resources | `PUT /users/v1/{username}/email` | – | catastrophic backtracking する email 正規表現を使用 | 単純で安全な正規表現を使用 | `api_views/users.py` `update_email()` |
| 8 | リソース・レート制限の欠如 | API4 Rate Limiting | 全エンドポイント（特に login/register） | ⚠ あり | レート制限が一切無く総当たり可能 | 同左（実装に制限が無い） | 全体（制限実装なし） |
| 9 | JWT 認証バイパス（弱い署名鍵） | API2 Broken Auth | 認証が要る全エンドポイント | ⚠ あり | 署名鍵が `SECRET_KEY='random'`（HS256）で推測容易→トークン偽造可 | 同左（鍵は vuln フラグに関係なく `'random'`） | `config.py` / `models/user_model.py` `encode/decode_auth_token()` |

> ⚠「安全版でも残る」= `vulnerable=0` でも挙動が変わらない項目（#5, #8, #9）。
> 安全版(18001)で指摘されても FP 扱いにしない。README もこの旨を注記している。

## 再現 curl 例（脆弱版 18002 向け）

```bash
BASE=http://127.0.0.1:18002
# 0) DB 初期化（1回だけ）
curl -s $BASE/createdb

# 1) SQLi: username に注入（URLエンコードした ' OR '1'='1 ）
curl -s "$BASE/users/v1/name1%27%20OR%20%271%27%3D%271"

# 4) マスアサインメント: admin:true で登録 → ログイン → /me が admin:true
curl -s -XPOST $BASE/users/v1/register -H 'Content-Type: application/json' \
  -d '{"username":"evil","password":"p","email":"e@e.com","admin":true}'
TOKEN=$(curl -s -XPOST $BASE/users/v1/login -H 'Content-Type: application/json' \
  -d '{"username":"evil","password":"p"}' | sed -n 's/.*"auth_token": *"\([^"]*\)".*/\1/p')
curl -s $BASE/me -H "Authorization: Bearer $TOKEN"

# 5) debug: 無認証で全ユーザーの password が返る
curl -s $BASE/users/v1/_debug

# 6) 列挙: 存在しない user と 誤 password で応答メッセージが変わる
curl -s -XPOST $BASE/users/v1/login -H 'Content-Type: application/json' -d '{"username":"nobody","password":"x"}'
curl -s -XPOST $BASE/users/v1/login -H 'Content-Type: application/json' -d '{"username":"name1","password":"wrong"}'

# 2) 認可されないパス変更: name1 のトークンで name2 のパスワードを変更
T1=$(curl -s -XPOST $BASE/users/v1/login -H 'Content-Type: application/json' \
  -d '{"username":"name1","password":"pass1"}' | sed -n 's/.*"auth_token": *"\([^"]*\)".*/\1/p')
curl -s -XPUT $BASE/users/v1/name2/password -H "Authorization: Bearer $T1" \
  -H 'Content-Type: application/json' -d '{"password":"hacked"}'
```

> #3 BOLA は、別ユーザーが所有する本のタイトルを知る必要がある（登録時に `bookTitle<乱数>` が自動生成）。
> #7 RegexDOS / #8 レート制限 / #9 JWT 偽造 は実測・ツール向きなのでここでは curl 例を割愛。

## 安全版との差分確認（FP 判定用）

同じ指摘が **18001(安全版) でも出るか**を確認する。

- #1,#2,#3,#4,#6,#7 … 安全版では塞がれているので、安全版で出たら FP
- #5,#8,#9 … 安全版でも残るので、出ても FP ではない

## 採点サマリ（実行後に記入）

| 指標                | 値 |
| ------------------- | -- |
| 検出 TP             | /9 |
| 見逃し FN           |    |
| 誤検知 FP           |    |
| 検出率 (TP/(TP+FN)) |    |

## 誤検知（FP）メモ欄

| 指摘内容 | 根拠/エンドポイント | FP と判断した理由 |
| -------- | ------------------- | ----------------- |
|          |                     |                   |

## 備考

- 挙動は VAmPI のソース（`api_views/`, `models/`）の `if vuln:` 分岐を直接確認して記載。
- 確認の着眼点・payload は代表例。正確な挙動は実機（18002/18001）で確認する。
- VAmPI は OWASP API Top 10（2019 系）を題材にしており、分類名は目安。
