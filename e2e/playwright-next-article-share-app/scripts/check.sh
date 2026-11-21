#!/usr/bin/env bash
# テストを流す前の静的チェック。アプリには接続しない。
#
#   ./scripts/check.sh
#
# 1. 型チェック（tsc --noEmit）
# 2. test.only の残り
# 3. tests/smoke/ が書き込み系の fixtures を import していないか（本番で流すため）
# 4. テスト名が [ケースID] で始まっているか（ID 未採番のテストがあるため、今は警告のみ）
set -uo pipefail

cd "$(dirname "$0")/.."

errors=0
warnings=0

ok()   { echo "  OK   $1"; }
ng()   { echo "  NG   $1"; errors=$((errors + 1)); }
warn() { echo "  WARN $1"; warnings=$((warnings + 1)); }

echo "[1/4] 型チェック"
if out=$(npx tsc --noEmit -p . 2>&1); then
  ok "型エラーなし"
else
  echo "$out" | grep -v '^npm warn' | sed 's/^/       /'
  ng "型エラーがあります"
fi

echo "[2/4] test.only の残り"
if out=$(grep -rnE '\b(test|describe)\.only\(' tests); then
  echo "$out" | sed 's/^/       /'
  ng "test.only / describe.only が残っています"
else
  ok "test.only なし"
fi

echo "[3/4] @smoke（tests/smoke/）に書き込み系の fixtures が入っていないか"
if out=$(grep -rnE "from ['\"][./]*fixtures" tests/smoke); then
  echo "$out" | sed 's/^/       /'
  ng "tests/smoke/ は本番でも流すため、fixtures ではなく @playwright/test から import してください"
else
  ok "fixtures の import なし"
fi

echo "[4/4] テスト名が [ケースID] で始まっているか"
if ! list=$(npx playwright test --list --reporter=json 2>/dev/null); then
  ng "テスト一覧を取得できませんでした（npx playwright test --list で確認してください）"
else
  missing=$(echo "$list" | node -e '
    let input = "";
    process.stdin.on("data", (c) => (input += c)).on("end", () => {
      const out = [];
      const walk = (suite) => {
        for (const spec of suite.specs ?? []) {
          if (!/^\[[A-Z]+-\d{3}\] /.test(spec.title)) out.push(`${spec.file}:${spec.line} ${spec.title}`);
        }
        (suite.suites ?? []).forEach(walk);
      };
      JSON.parse(input).suites.forEach(walk);
      console.log(out.join("\n"));
    });
  ')
  if [[ -n "$missing" ]]; then
    echo "$missing" | sed 's/^/       /'
    warn "ケース ID の無いテストがあります（台帳で ID を振ってテスト名を [ID] タイトル にしてください）"
  else
    ok "すべてのテスト名に ID あり"
  fi
fi

echo
echo "エラー: $errors / 警告: $warnings"
[[ $errors -eq 0 ]]
