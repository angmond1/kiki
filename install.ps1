#requires -version 5
<#
  kiki 설치 스크립트 (Windows)
  - 선택한 skill + 공통(_shared) 을 ~/.claude/skills/ 로 복사 (Claude 가 skill 을 찾는 곳)
  - 개인설정 폴더(~/.claude/kiki/) 준비 + kiki_root 기록
  - kiki 작업 폴더(-Root) 에 budget/ dining/ inspect/ _tmp/ 와 token.txt 생성
  - Python / Node.js 설치 여부만 확인해 안내 (자동 설치 X)
  개인 config·토큰은 repo 밖(~/.claude/kiki/, <root>/token.txt) 에만 둔다.

  사용:
    ./install.ps1                              # 전체 skill, root = 이 스크립트가 있는 kiki 폴더
    ./install.ps1 kk-mail kk-pay               # 일부 skill
    ./install.ps1 -Root D:\work\kiki           # 작업 폴더 지정 (기본 = 이 폴더, 권장 C:\kiki)
  실행정책에 막히면:
    powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
param(
  [string]$Root = "",
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Skills
)

$ErrorActionPreference = "Stop"
if (-not $env:USERPROFILE) { Write-Error "USERPROFILE 환경변수가 설정되어 있지 않습니다."; exit 1 }
$repo   = $PSScriptRoot
$srcDir = Join-Path $repo "skills"
$dstDir = Join-Path $env:USERPROFILE ".claude\skills"
$cfgDir = Join-Path $env:USERPROFILE ".claude\kiki"
if (-not $Root) { $Root = $repo }
$Root = [System.IO.Path]::GetFullPath($Root)

$all = Get-ChildItem $srcDir -Directory |
       Where-Object { $_.Name -like "kk-*" } |
       Select-Object -ExpandProperty Name
if (-not $Skills -or $Skills.Count -eq 0) { $Skills = $all }

New-Item -ItemType Directory -Force -Path $dstDir | Out-Null

# 복사 헬퍼 — 대상이 있으면 먼저 제거(재실행 시 _shared/_shared 중첩 방지) 후 복사
function Copy-Tree($from, $to) {
  if (Test-Path $to) { Remove-Item -Recurse -Force $to }
  Copy-Item -Recurse $from $to
}

# 1) 공통 _shared (항상 복사 — 없으면 skill 이 동작하지 않음)
Copy-Tree (Join-Path $srcDir "_shared") (Join-Path $dstDir "_shared")
Write-Host "[복사] _shared (공통 문서·설정 템플릿)"

# 2) 선택 skill
$unknown = 0
foreach ($s in $Skills) {
  if ($all -notcontains $s) { Write-Warning "알 수 없는 skill: $s (건너뜀)"; $unknown = 1; continue }
  Copy-Tree (Join-Path $srcDir $s) (Join-Path $dstDir $s)
  Write-Host "[복사] $s"
}

# 3) kiki 작업 폴더 (root) — 데이터 폴더 + token.txt
New-Item -ItemType Directory -Force -Path $Root | Out-Null
foreach ($sub in @("budget", "dining", "inspect", "_tmp")) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Root $sub) | Out-Null
}
$tok = Join-Path $Root "token.txt"
if (-not (Test-Path $tok)) {
  Copy-Item (Join-Path $srcDir "_shared\token.txt.example") $tok
  Write-Host "[생성] $tok  (Dooray 토큰은 이 파일의 'Dooray token:' 다음 줄에 — kk-pay 카드 RPA 업로드 때만 필요)"
}

# 4) 개인설정 폴더 + 템플릿 (없을 때만 — 기존 값 보존) + kiki_root 기록
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfg = Join-Path $cfgDir "kiki.config.json"
if (-not (Test-Path $cfg)) {
  Copy-Item (Join-Path $srcDir "_shared\kiki.config.example.json") $cfg
  Write-Host "[생성] $cfg  (본인 값은 첫 실행 때 Claude 가 채움)"
}
# kiki_root 가 비어 있으면 이번 root 로 채움 (JSON 문자열이라 백슬래시는 2개로)
$json = Get-Content $cfg -Raw -Encoding UTF8
$rootJson = $Root -replace '\\', '\\'
if ($json -match '"kiki_root":\s*""') {
  $json = $json -replace '"kiki_root":\s*""', ('"kiki_root": "' + $rootJson + '"')
  [System.IO.File]::WriteAllText($cfg, $json, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[기록] kiki_root = $Root  ($cfg)"
} elseif ($json -notmatch '"kiki_root"') {
  Write-Warning "기존 kiki.config.json 에 kiki_root 항목이 없습니다. 첫 실행 때 Claude 가 추가합니다: $Root"
}

# 5) Python / Node.js 확인 (설치는 안내만)
function Test-Cmd($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
$hasPy   = (Test-Cmd "python") -or (Test-Cmd "py")
$hasNode = (Test-Cmd "node") -and (Test-Cmd "npx")
Write-Host ""
if ($hasPy)   { Write-Host "[확인] Python  있음" } else { Write-Warning "Python 이 없습니다 — kk-budget/kk-pay/kk-dining/kk-inspect 에 필요. https://www.python.org/downloads/ (설치 시 'Add python.exe to PATH' 체크) 또는  winget install -e --id Python.Python.3.12" }
if ($hasNode) { Write-Host "[확인] Node.js 있음" } else { Write-Warning "Node.js 가 없습니다 — 파일첨부(chrome-devtools-mcp) 에 필요. https://nodejs.org/ (LTS) 또는  winget install -e --id OpenJS.NodeJS.LTS" }

Write-Host ""
Write-Host "완료. [!] Claude Code(또는 Claude Desktop)를 재시작한 뒤 'kk-<skill> 설정해줘' 로 첫 실행하세요."
Write-Host "    (새 skill 은 재시작해야 인식됩니다. Desktop 은 트레이 아이콘 → Quit 으로 완전 종료 후 재실행)"
Write-Host "kiki 작업 폴더: $Root   (엑셀·회의록·검수 파일은 여기 하위 budget/ dining/ inspect/ 에)"
Write-Host "토큰 파일     : $tok    (채팅창에 토큰을 붙여넣지 말고 이 파일에 저장)"
Write-Host "개인 config   : $cfgDir  (repo 에는 올라가지 않습니다)"
if ($unknown) { Write-Warning "일부 skill 이름을 찾지 못했습니다 — 철자를 확인하세요."; exit 1 }
