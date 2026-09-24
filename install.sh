#!/usr/bin/env bash
# kiki 설치 스크립트 (macOS / Linux) — install.ps1 의 bash 등가.
#   - 선택한 skill + 공통(_shared) 을 ~/.claude/skills/ 로 복사 (Claude 가 skill 을 찾는 곳)
#   - 개인설정 폴더(~/.claude/kiki/) 준비 + kiki_root 기록
#   - kiki 작업 폴더(--root) 에 budget/ dining/ inspect/ _tmp/ 와 token.txt 생성
#   - Python / Node.js 설치 여부만 확인해 안내 (자동 설치 X)
#   개인 config·토큰은 repo 밖(~/.claude/kiki/, <root>/token.txt) 에만 둔다.
#
# 사용:
#   bash ./install.sh                         # 전체 skill, root = 이 스크립트가 있는 kiki 폴더
#   bash ./install.sh kk-mail kk-pay          # 일부 skill
#   bash ./install.sh --root ~/work/kiki      # 작업 폴더 지정 (기본 = 이 폴더, 권장 ~/kiki)
set -euo pipefail

: "${HOME:?HOME 환경변수가 설정되어 있지 않습니다}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$repo/skills"
dst="$HOME/.claude/skills"
cfg="$HOME/.claude/kiki"

# 인자 파싱: --root <path> 와 skill 이름들
root="$repo"
skills=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --root) root="$2"; shift 2 ;;
    --root=*) root="${1#--root=}"; shift ;;
    *) skills+=("$1"); shift ;;
  esac
done
root="$(cd "$(dirname "$root")" 2>/dev/null && pwd)/$(basename "$root")"

# 설치할 skill 목록 (인자 없으면 전체 kk-*)
all=()
for d in "$src"/kk-*/; do [ -d "$d" ] && all+=("$(basename "$d")"); done
if [ "${#skills[@]}" -eq 0 ]; then skills=("${all[@]}"); fi

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

# 3) kiki 작업 폴더 (root) — 데이터 폴더 + token.txt
mkdir -p "$root/budget" "$root/dining" "$root/inspect" "$root/_tmp"
tok="$root/token.txt"
if [ ! -f "$tok" ]; then
  cp "$src/_shared/token.txt.example" "$tok"
  echo "[생성] $tok  (Dooray 토큰은 이 파일의 'Dooray token:' 다음 줄에 — kk-pay 카드 RPA 업로드 때만 필요)"
fi

# 4) 개인설정 폴더 + 템플릿 (없을 때만 — 기존 값 보존) + kiki_root 기록
mkdir -p "$cfg"
if [ ! -f "$cfg/kiki.config.json" ]; then
  cp "$src/_shared/kiki.config.example.json" "$cfg/kiki.config.json"
  echo "[생성] $cfg/kiki.config.json  (본인 값은 첫 실행 때 Claude 가 채움)"
fi
if grep -q '"kiki_root": *""' "$cfg/kiki.config.json"; then
  python3 - "$cfg/kiki.config.json" "$root" <<'PY' 2>/dev/null || sed -i.bak "s#\"kiki_root\": *\"\"#\"kiki_root\": \"$root\"#" "$cfg/kiki.config.json"
import io, json, sys
p, r = sys.argv[1], sys.argv[2]
s = io.open(p, encoding="utf-8").read().replace('"kiki_root": ""', '"kiki_root": ' + json.dumps(r), 1)
io.open(p, "w", encoding="utf-8").write(s)
PY
  rm -f "$cfg/kiki.config.json.bak"
  echo "[기록] kiki_root = $root  ($cfg/kiki.config.json)"
elif ! grep -q '"kiki_root"' "$cfg/kiki.config.json"; then
  echo "[주의] 기존 kiki.config.json 에 kiki_root 항목이 없습니다. 첫 실행 때 Claude 가 추가합니다: $root"
fi

# 5) Python / Node.js 확인 (설치는 안내만)
echo ""
if command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then echo "[확인] Python  있음"
else echo "[주의] Python 이 없습니다 — kk-budget/kk-pay/kk-dining/kk-inspect 에 필요. macOS: brew install python  /  Linux: sudo apt install python3 python3-pip  /  https://www.python.org/downloads/"; fi
if command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then echo "[확인] Node.js 있음"
else echo "[주의] Node.js 가 없습니다 — 파일첨부(chrome-devtools-mcp) 에 필요. macOS: brew install node  /  Linux: sudo apt install nodejs npm  /  https://nodejs.org/ (LTS)"; fi

echo ""
echo "완료. ⚠️  Claude Code(또는 Claude Desktop)를 재시작한 뒤 'kk-<skill> 설정해줘' 로 첫 실행하세요."
echo "    (새 skill 은 재시작해야 인식됩니다. Desktop 은 Dock 아이콘 → Quit 으로 완전 종료 후 재실행)"
echo "kiki 작업 폴더: $root   (엑셀·회의록·검수 파일은 여기 하위 budget/ dining/ inspect/ 에)"
echo "토큰 파일     : $tok    (채팅창에 토큰을 붙여넣지 말고 이 파일에 저장)"
echo "개인 config   : $cfg  (repo 에는 올라가지 않습니다)"
echo "※ macOS/Linux 제한: hwp→pdf 자동 변환(kk-pay 증빙)만 Windows+아래아한글 전용. 회의록 hwpx 생성은 모든 OS(열람은 HOP: brew install hop). 그 외 기능은 동일."
if [ "$unknown" -eq 1 ]; then echo "⚠️  일부 skill 이름을 찾지 못했습니다 — 철자를 확인하세요." >&2; exit 1; fi
