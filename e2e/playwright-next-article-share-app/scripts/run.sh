#!/usr/bin/env bash
# 環境を指定してテストを実行する。
#
#   ./scripts/run.sh local            # http://localhost:3000 で全テスト
#   ./scripts/run.sh stg              # ステージングで全テスト（書き込みあり）
#   ./scripts/run.sh prod             # 本番で @smoke のみ（URL は PROD_URL で渡す）
#   ./scripts/run.sh stg -g "AUTH-"   # 2 つ目以降の引数は playwright test にそのまま渡す
#
# 本番 URL はリポジトリに書かない。環境変数 PROD_URL か .env で渡す。
set -euo pipefail

cd "$(dirname "$0")/.."

STG_URL="https://article-share-stg.vercel.app"

usage() {
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

[[ $# -ge 1 ]] || usage
env_name="$1"
shift

# .env があれば読み込む（PROD_URL など）。すでに設定済みの環境変数を優先する
if [[ -f .env ]]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    [[ -z "${!key:-}" ]] && export "$key=$value"
  done < .env
fi

args=()
case "$env_name" in
  local)
    base_url="http://localhost:3000"
    ;;
  stg)
    base_url="$STG_URL"
    ;;
  prod)
    if [[ -z "${PROD_URL:-}" ]]; then
      echo "エラー: 本番の URL を PROD_URL で指定してください（例: PROD_URL=https://... ./scripts/run.sh prod）" >&2
      exit 1
    fi
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
[[ "$env_name" == "prod" ]] && echo "本番のため @smoke のみ実行します"

BASE_URL="$base_url" exec npx playwright test ${args[@]+"${args[@]}"} "$@"
