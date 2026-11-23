# 認証（AUTH）

列と状態の意味は [README](../README.md#registry) を参照。

| No. | テストケース ID | 状態 | フローファイル | 自動化のメモ |
| --- | --- | --- | --- | --- |
| 1 | AUTH-001 | 実装済 | `tests/smoke/auth.spec.ts` | `@smoke`（本番でも流す） |
| 2 | AUTH-002 | 実装済 | `tests/smoke/auth.spec.ts` | `@smoke`（本番でも流す） |
| 3 | AUTH-013 | 実装中 | `tests/regression/password-reset.spec.ts` | 本番は対象外。未登録のアドレスなのでメールは送られず、fixture も使わない |
