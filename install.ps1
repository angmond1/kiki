#requires -version 5
<#
  kiki 설치 스크립트 — 선택한 skill + 공통(_shared) 을 ~/.claude/skills/ 로 복사하고
  개인설정 폴더(~/.claude/kiki/) 를 준비한다.
  개인 config·토큰은 repo 밖(~/.claude/kiki/) 에만 둔다.

  사용:
    ./install.ps1 kk-mail kk-pay      # 일부 skill
    ./install.ps1                      # 전체 skill
  실행정책에 막히면:
    powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Skills)

$ErrorActionPreference = "Stop"
if (-not $env:USERPROFILE) { Write-Error "USERPROFILE 환경변수가 설정되어 있지 않습니다."; exit 1 }
$repo   = $PSScriptRoot
$srcDir = Join-Path $repo "skills"
$dstDir = Join-Path $env:USERPROFILE ".claude\skills"
$cfgDir = Join-Path $env:USERPROFILE ".claude\kiki"

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

# 3) 개인설정 폴더 + 템플릿 (없을 때만 — 기존 값 보존)
New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
$cfg = Join-Path $cfgDir "kiki.config.json"
$envf = Join-Path $cfgDir "kiki.env"
if (-not (Test-Path $cfg)) {
  Copy-Item (Join-Path $srcDir "_shared\kiki.config.example.json") $cfg
  Write-Host "[생성] $cfg  (본인 값은 첫 실행 때 Claude 가 채움)"
}
if (-not (Test-Path $envf)) {
  Copy-Item (Join-Path $srcDir "_shared\kiki.env.example") $envf
  Write-Host "[생성] $envf  (토큰 필요 skill 만 — DOORAY_TOKEN=)"
}

Write-Host ""
Write-Host "완료. [!] Claude Code(또는 Claude Desktop)를 재시작한 뒤 'kk-<skill> 설정해줘' 로 첫 실행하세요."
Write-Host "    (새 skill 은 재시작해야 인식됩니다.)"
Write-Host "개인 config·토큰은 ~/.claude/kiki/ 에만 있고 repo 에는 올라가지 않습니다."
if ($unknown) { Write-Warning "일부 skill 이름을 찾지 못했습니다 — 철자를 확인하세요."; exit 1 }
