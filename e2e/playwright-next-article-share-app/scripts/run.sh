#!/usr/bin/env bash
# 環境を指定してテストを実行する。
#
#   ./scripts/run.sh local            # ローカルで全テスト
#   ./scripts/run.sh stg              # ステージングで全テスト（書き込みあり）
#   ./scripts/run.sh prod             # 本番で @smoke のみ（URL は PROD_URL で渡す）
#   ./scripts/run.sh stg -g "AUTH-"   # 2 つ目以降の引数は playwright test にそのまま渡す
#
# local / stg の URL は environments.json に書く。本番 URL はリポジトリに書かず、
# 環境変数 PROD_URL か .env で渡す。本番では -g / --grep / -G / --grep-invert は使えない。
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

# .env を読み込む（PROD_URL など）。すでに設定済みの環境変数を優先する。
# KEY=VALUE の行だけを読む。export 付き・前後の空白・引用符・CRLF・最終行の改行なしに対応する
load_dotenv() {
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    line="${line#"${line%%[![:space:]]*}"}"   # 先頭の空白を取る
    [[ -z "$line" || "$line" == \#* ]] && continue
    line="${line#export }"
    if [[ ! "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
      echo "警告: .env の読めない行を飛ばしました: $line" >&2
      continue
    fi
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    value="${value%"${value##*[![:space:]]}"}" # 末尾の空白を取る
    if [[ "$value" =~ ^\"(.*)\"$ || "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    if [[ -z "${!key:-}" ]]; then export "$key=$value"; fi
  done < .env
}

# environments.json から URL を取り出す（fixtures の WRITABLE_HOSTS と同じ定義を使う）
env_url() {
  node -e 'const u = require("./environments.json")[process.argv[1]]; if (!u) process.exit(1); console.log(u)' "$1"
}

[[ $# -ge 1 ]] || usage
env_name="$1"
shift

if [[ -f .env ]]; then load_dotenv; fi

args=()
case "$env_name" in
  local | stg)
    base_url=$(env_url "$env_name") || { echo "エラー: environments.json に $env_name がありません" >&2; exit 1; }
    ;;
  prod)
    if [[ -z "${PROD_URL:-}" ]]; then
      echo "エラー: 本番の URL を PROD_URL で指定してください（例: PROD_URL=https://... ./scripts/run.sh prod）" >&2
      exit 1
    fi
    # Playwright は最後の --grep だけを使うため、本番では利用者の grep 指定を受け付けない
    for arg in "$@"; do
      case "$arg" in
        -g* | --grep | --grep=* | -G | -G* | --grep-invert | --grep-invert=*)
          echo "エラー: 本番では @smoke に限定するため、$arg は使えません（ファイル名やテストの行番号で絞り込んでください）" >&2
          exit 1
          ;;
      esac
    done
    base_url="$PROD_URL"
    # 本番は読み取りだけの @smoke に限定する（付け忘れ防止のため、ここで必ず付ける）
    args+=(--grep @smoke)
    ;;
  *)
    echo "エラー: 環境は local / stg / prod のどれかを指定してください: $env_name" >&2
    usage
    ;;
esac

echo "環境: $env_name ($base_url)"
if [[ "$env_name" == "prod" ]]; then
  echo "本番のため @smoke のみ実行します"
fi

BASE_URL="$base_url" exec npx playwright test ${args[@]+"${args[@]}"} "$@"
