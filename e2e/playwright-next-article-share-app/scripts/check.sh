#!/usr/bin/env bash
# テストを流す前の静的チェック。アプリには接続しない。
#
#   ./scripts/check.sh
#
# 1. 型チェック（tsc --noEmit）
# 2. .only の残り（Playwright の --forbid-only で判定）
# 3. @smoke のテストが書き込み系の fixture を使っていないか（本番で流すため）
# 4. テスト名が [ケースID] で始まっているか（ID 未採番のテストがあるため、今は警告のみ）
set -uo pipefail

cd "$(dirname "$0")/.."

errors=0
warnings=0

ok()     { echo "  OK   $1"; }
ng()     { echo "  NG   $1"; errors=$((errors + 1)); }
warn()   { echo "  WARN $1"; warnings=$((warnings + 1)); }
indent() { grep -v '^npm warn' | sed 's/^/       /'; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "[1/4] 型チェック"
if npx tsc --noEmit -p . >"$tmp/tsc.txt" 2>&1; then
  ok "型エラーなし"
else
  indent <"$tmp/tsc.txt"
  ng "型エラーがあります"
fi

echo "[2/4] .only の残り"
if npx playwright test --list --forbid-only >"$tmp/only.txt" 2>&1; then
  ok ".only なし"
else
  indent <"$tmp/only.txt"
  ng ".only が残っているか、テスト一覧を取得できませんでした（上の出力を確認してください）"
fi

# 3 と 4 はテスト一覧（JSON）を使う
list_ok=true
if ! npx playwright test --list --reporter=json >"$tmp/list.json" 2>"$tmp/list.err"; then
  list_ok=false
elif ! node scripts/lib/inspect-tests.js "$tmp/list.json" >"$tmp/inspect.txt" 2>"$tmp/list.err"; then
  list_ok=false
fi

echo "[3/4] @smoke のテストが書き込み系の fixture を使っていないか"
if ! $list_ok; then
  indent <"$tmp/list.err"
  ng "テスト一覧を調べられませんでした（上の出力を確認してください）"
elif grep -q '^SMOKE_NG ' "$tmp/inspect.txt"; then
  grep '^SMOKE_NG ' "$tmp/inspect.txt" | sed 's/^SMOKE_NG //' | indent
  ng "@smoke は本番でも流すため、fixtures ではなく @playwright/test から import してください"
else
  ok "書き込み系の fixture の使用なし"
fi

echo "[4/4] テスト名が [ケースID] で始まっているか"
if ! $list_ok; then
  ng "テスト一覧を調べられませんでした（3 の出力を確認してください）"
elif grep -q '^NO_ID ' "$tmp/inspect.txt"; then
  grep '^NO_ID ' "$tmp/inspect.txt" | sed 's/^NO_ID //' | indent
  warn "ケース ID の無いテストがあります（台帳で ID を振ってテスト名を [ID] タイトル にしてください）"
else
  ok "すべてのテスト名に ID あり"
fi

echo
echo "エラー: $errors / 警告: $warnings"
[[ $errors -eq 0 ]]
