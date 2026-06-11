#!/usr/bin/env bash
# kiki 설치 스크립트 (macOS / Linux) — install.ps1 의 bash 등가.
#   선택한 skill + 공통(_shared) 을 ~/.claude/skills/ 로 복사하고
#   개인설정 폴더(~/.claude/kiki/) 를 준비한다.
#   개인 config·토큰은 repo 밖(~/.claude/kiki/) 에만 둔다.
#
# 사용:
#   bash ./install.sh kk-mail kk-pay      # 일부 skill
#   bash ./install.sh                     # 전체 skill
set -euo pipefail

: "${HOME:?HOME 환경변수가 설정되어 있지 않습니다}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$repo/skills"
dst="$HOME/.claude/skills"
cfg="$HOME/.claude/kiki"

# 설치할 skill 목록 (인자 없으면 전체 kk-*)
all=()
for d in "$src"/kk-*/; do [ -d "$d" ] && all+=("$(basename "$d")"); done
if [ "$#" -eq 0 ]; then skills=("${all[@]}"); else skills=("$@"); fi

mkdir -p "$dst"

# 복사 헬퍼 — 임시 복사 후 교체(atomic). cp 실패 시 기존을 파괴하지 않는다.
copy_tree() {  # $1=src  $2=dst
  local tmp="$2.new.$$"
  rm -rf "$tmp"
  cp -R "$1" "$tmp"
  rm -rf "$2"
  mv "$tmp" "$2"
}

# 1) 공통 _shared (항상 복사 — 없으면 skill 이 동작하지 않음)
copy_tree "$src/_shared" "$dst/_shared"
echo "[복사] _shared (공통 문서·설정 템플릿)"

# 2) 선택 skill
unknown=0
for s in "${skills[@]}"; do
  if [ ! -d "$src/$s" ]; then echo "[건너뜀] 알 수 없는 skill: $s"; unknown=1; continue; fi
  copy_tree "$src/$s" "$dst/$s"
  echo "[복사] $s"
done

# 3) 개인설정 폴더 + 템플릿 (없을 때만 — 기존 값 보존)
mkdir -p "$cfg"
if [ ! -f "$cfg/kiki.config.json" ]; then
  cp "$src/_shared/kiki.config.example.json" "$cfg/kiki.config.json"
  echo "[생성] $cfg/kiki.config.json  (본인 값은 첫 실행 때 Claude 가 채움)"
fi
if [ ! -f "$cfg/kiki.env" ]; then
  cp "$src/_shared/kiki.env.example" "$cfg/kiki.env"
  echo "[생성] $cfg/kiki.env  (토큰 필요 skill 만 — DOORAY_TOKEN=)"
fi

echo ""
echo "완료. ⚠️  Claude Code(또는 Claude Desktop)를 재시작한 뒤 'kk-<skill> 설정해줘' 로 첫 실행하세요."
echo "    (새 skill 은 재시작해야 인식됩니다.)"
echo "개인 config·토큰은 ~/.claude/kiki/ 에만 있고 repo 에는 올라가지 않습니다."
if [ "$unknown" -eq 1 ]; then echo "⚠️  일부 skill 이름을 찾지 못했습니다 — 철자를 확인하세요." >&2; exit 1; fi
