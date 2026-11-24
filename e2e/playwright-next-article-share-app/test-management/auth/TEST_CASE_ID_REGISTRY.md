# 認証（AUTH）

列と状態の意味は [README](../README.md#registry) を参照。

| No. | テストケース ID | 状態 | フローファイル | 自動化のメモ |
| --- | --- | --- | --- | --- |
| 1 | AUTH-001 | 実装済 | `tests/smoke/auth.spec.ts` | `@smoke`（本番でも流す） |
| 2 | AUTH-002 | 実装済 | `tests/smoke/auth.spec.ts` | `@smoke`（本番でも流す） |
| 3 | AUTH-003 | 実装済 | `tests/smoke/auth.spec.ts` | `@smoke`（本番でも流す） |
| 4 | AUTH-005 | 実装済 | `tests/regression/signup-validation.spec.ts` | 本番は対象外。テストは 2 本（空欄・パスワードの文字数 / メール形式）。チェックが壊れて登録された場合に備え、送る認証情報を `cleanupAlso` で後片付けの対象にする。メール形式は UI から片付けられないため、テスト全体で同じオリジンへの POST を遮断して確認（ブラウザ標準のチェックを `validity` と `noValidate` で確認） |
| 5 | AUTH-006 | 実装済 | `tests/regression/signup-validation.spec.ts` | 本番は対象外。`loggedInPage` で登録 → ログアウトし、同じメール・別のパスワードで送信（`cleanupAlso` で後片付け）。「登録されない」は送ったパスワードでログインできないことで確認 |
| 6 | AUTH-013 | 実装済 | `tests/regression/password-reset.spec.ts` | 本番は対象外。未登録のアドレスなのでメールは送られず、fixture も使わない |
