# kiki 설치 가이드 (사람이 읽는 상세)

> 빠른 길: claude/codex 대화창에 **"https://github.com/angmond1/kiki 설치해줘"** → 에이전트가 [CLAUDE.md](CLAUDE.md)(claude) / [CODEX.md](CODEX.md)(codex) 절차로 설치합니다. 아래는 사람이 직접 하거나 확인할 때의 상세입니다.

## 0. 준비물 (각자 본인 PC에서 한 번)

### 0-1. 계정·앱
- **Claude** — Claude Code(CLI) 또는 Claude Desktop 앱. 둘 다 같은 `~/.claude/skills/` 를 쓴다. Desktop 만 쓰더라도 **CLI 를 함께 설치**해 두면 설치 스크립트·MCP 등록이 쉽다(https://code.claude.com/docs/ko/quickstart).
- **권장 모델**: 설치·첫 설정·첫 1~2회 실사용은 **Opus 5**(Fable 5.1 가능하면 그것), 노력도 high. 익숙해지면 kk-mail·kk-budget 은 Sonnet 5(medium), kk-pay 카드 RPA·kk-inspect 는 Sonnet 5(high). **kk-dining · kk-pay 세금계산서 직접작성은 계속 Opus 5**(NEXACRO 폼 제어 함정이 많고 결재 직전 작업).

### 0-2. Google Chrome + "Claude in Chrome" 확장 (필수 — 평소 Chrome 창 제어)
1. 설치: https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn
2. 연결
   - Claude Desktop: 좌하단 이니셜 → 설정 → **"Claude in Chrome"** 켜기.
   - Claude Code: `claude --chrome` 로 시작(또는 세션에서 `/chrome` → "Enabled by default"). https://code.claude.com/docs/en/chrome
3. 확인: 세션에서 `list_connected_browsers` 가 브라우저를 돌려주면 성공.

### 0-3. chrome-devtools-mcp (필수 — 파일첨부용 Claude 전용 Chrome 창)
"Claude in Chrome" 만으론 포탈의 **파일첨부**(소액검수 mcs_0003 별도 창, 세금계산서 fam_0702, 회의록 팝업)가 안 된다. chrome-devtools-mcp 는 **브라우저 확장이 아니라 MCP 서버 1개**로, 자체 Chrome 창(별도 프로필)을 띄워 첨부까지 자동화한다. **Node.js 필요**(0-4).
- Claude Code 터미널:
  ```
  claude mcp add --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest
  ```
  `--scope user` = 모든 폴더·**Claude Desktop 에서도** 같은 등록이 보인다. 등록 후 Claude 재시작.
  (plugin 으로도 가능: `claude plugin install chrome-devtools-mcp@claude-plugins-official`)
- Codex: 설정 → MCP 서버 → 서버 추가 → 이름 `chrome-devtools`, 명령 `npx -y chrome-devtools-mcp@latest`.
- 확인: 재시작 후 도구 목록에 `evaluate_script`·`upload_file`·`select_page` 등이 보이면 성공(서버 접두어는 설치 방식마다 다름 — `skills/_shared/environment_setup.md` "도구 이름 표기 규칙").
- 이 창은 **평소 Chrome 과 로그인이 공유되지 않는다** → 첨부 작업 때 그 창에서 `e.kist.re.kr` 에 **한 번 더 로그인**(이후 기억).

### 0-4. Python 3 + Node.js (패키지 설치 때 함께)
- Python: https://www.python.org/downloads/ — Windows 는 설치 화면 **"Add python.exe to PATH"** 체크. (`winget install -e --id Python.Python.3.12` / macOS `brew install python` / Ubuntu `sudo apt install python3 python3-pip`)
- Node.js(LTS): https://nodejs.org/ (`winget install -e --id OpenJS.NodeJS.LTS` / `brew install node` / `sudo apt install nodejs npm`)
- 확인: 새 터미널에서 `python --version`(macOS/Linux `python3 --version`), `node --version`, `npx --version`.
- **Python 패키지는 미리 설치하지 않는다** — 각 skill 이 필요한 시점에 확인 후 `pip install`(아래 §5 표).

### 0-5. KIST 사내망
KIST 내부망에서 실행. KIST 밖(재택·출장)이면 **KIST VPN 접속 후** 진행. (포탈 `e.kist.re.kr`·`p.kist.re.kr:8081`, Dooray API 모두)

### 0-6. 로그인 — 어느 창에서
| skill / 작업 | Chrome 창 | 로그인 |
|--------------|-----------|--------|
| kk-mail | 평소 쓰는 Chrome(확장) | Dooray `https://kist.gov-dooray.com` |
| kk-budget | 평소 쓰는 Chrome(확장) | 포탈 `https://e.kist.re.kr` |
| kk-pay — 카드결제건 RPA 업로드 | 평소 쓰는 Chrome(확장) + `token.txt` | 포탈 + Dooray(업로드 확인 페이지). **새 창 없음** |
| kk-pay — 세금계산서 직접작성 | **Claude 전용 새 Chrome 창**(chrome-devtools) | 그 창에서 포탈 로그인 한 번 더 |
| kk-dining | **Claude 전용 새 Chrome 창** | 그 창에서 포탈 로그인 한 번 더 |
| kk-inspect | **Claude 전용 새 Chrome 창** | 그 창에서 포탈 로그인 한 번 더 |

- 로그인은 **본인이 직접**(Claude 는 대신 로그인하지 않는다). 포탈 로그인 = `e.kist.re.kr`(2026-07 변경, 구 ekist.re.kr), 업무화면은 `p.kist.re.kr:8081`.
- KIST 포탈은 **매일 정오 전체 세션 리셋** → 오후 작업은 다시 로그인.

### 0-7. Dooray 토큰 (kk-pay 카드 RPA 업로드 · kk-dining RPA 옵션만)
설치 스크립트가 kiki 폴더에 `token.txt` 를 만든다(§2). 발급 https://kist.gov-dooray.com/setting/api/token → 파일의 `Dooray token:` 다음 줄에 붙여넣고 저장 → 채팅엔 "두레이 토큰 저장했다" 만. **채팅창에 토큰을 붙여넣지 말 것**(대화 기록 노출).

### 0-8. 아래아한글 · MS Office (선택)
- 증빙이 hwp/docx/xlsx 일 때 pdf 변환(kk-pay), 회의록 hwp 저장 옵션(kk-dining)에만 쓴다. 대부분 KIST PC 에 설치돼 있다.
- 없으면 skill 이 묻는다: docx/xlsx → **LibreOffice**(무료, https://www.libreoffice.org/download/) 설치 시 자동 변환 / hwp → **HOP**(Open HWP — 무료 오픈소스 한글 편집기, Windows `.msi` / macOS `brew install hop` / Linux `.deb`·`.rpm`·`.AppImage`, https://github.com/golbin/hop)으로 열어 **PDF 내보내기**(수동 — HOP 은 CLI/API 가 없어 자동 변환은 안 됨). 회의록 파일(kk-dining)은 **hwpx 로 한글 없이 생성**(모든 OS) — 열람만 한글 또는 HOP.

> 모든 skill 은 첫 실행 때 이 환경을 동일하게 점검한 뒤 진행한다(연결/로그인 안 돼 있으면 안내 후 멈춤).

## 1. 패키지 받기 — git 없어도 됨
어디에 둘지 먼저 정한다. **기본 `C:\kiki`**(macOS/Linux `~/kiki`) 권장 — 이 폴더가 skill 원본 + 엑셀·회의록·검수 파일 + `token.txt` 의 집이 된다. 다른 경로도 가능.
- **ZIP**: GitHub 페이지 `Code ▾ → Download ZIP` → 위 폴더에 풀기(하위 폴더 `kiki-main` 이 생기면 그 안 내용을 올려도 되고 그대로 써도 된다). private repo 라 GitHub 로그인 + collaborator 초대 필요(문의 dnklee@kist.re.kr).
- **동료에게 폴더로** 받아도 된다.
- **git 이 있으면**: `git clone https://github.com/angmond1/kiki.git C:\kiki` (인증은 `gh auth login` 또는 Git Credential Manager).

## 2. skill 설치 — `~/.claude/skills/` 로

### 방법 A — 설치 스크립트 (권장)
패키지 폴더 안에서, OS 에 맞는 것 **하나**:
```powershell
# Windows (PowerShell) — 신규 PC 는 실행정책이 막혀 있을 수 있으니 Bypass 로
powershell -ExecutionPolicy Bypass -File .\install.ps1                   # 전체, root = 이 폴더
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Root C:\kiki     # 작업 폴더 지정
powershell -ExecutionPolicy Bypass -File .\install.ps1 kk-mail kk-pay    # 일부 skill 만
```
```bash
# macOS / Linux (bash)
bash ./install.sh                          # 전체, root = 이 폴더
bash ./install.sh --root ~/kiki            # 작업 폴더 지정
bash ./install.sh kk-mail kk-pay           # 일부 skill 만
```
스크립트가 하는 일: `_shared` + 선택 skill → `~/.claude/skills/` 복사 / 작업 폴더에 `budget/ dining/ inspect/ _tmp/` + **`token.txt`** 생성 / `~/.claude/kiki/kiki.config.json` 생성(+ `kiki_root` 기록) / Python·Node.js 유무 안내.

### 방법 B — 수동 복사 (스크립트를 못 쓸 때)
skill **과 공통 폴더 `_shared` 를 반드시 함께** 복사하고, 개인설정 폴더와 token.txt 도 만든다.
```powershell
# Windows
Copy-Item -Recurse "skills\_shared" "$env:USERPROFILE\.claude\skills\_shared"
Copy-Item -Recurse "skills\kk-mail" "$env:USERPROFILE\.claude\skills\kk-mail"
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\kiki" | Out-Null
Copy-Item "skills\_shared\kiki.config.example.json" "$env:USERPROFILE\.claude\kiki\kiki.config.json"
Copy-Item "skills\_shared\token.txt.example" ".\token.txt"
```
```bash
# macOS/Linux
cp -R skills/_shared ~/.claude/skills/_shared
cp -R skills/kk-mail ~/.claude/skills/kk-mail
mkdir -p ~/.claude/kiki
cp skills/_shared/kiki.config.example.json ~/.claude/kiki/kiki.config.json
cp skills/_shared/token.txt.example ./token.txt
```
그리고 `~/.claude/kiki/kiki.config.json` 의 `"kiki_root"` 에 패키지 폴더 경로를 적는다(Windows 는 `C:\\kiki` 처럼 백슬래시 2개).

## 3. ⚠️ 재시작 (반드시)
`~/.claude/skills/` 에 새 skill 디렉토리가 생기면 **재시작해야 인식**된다(Claude Code·Desktop 공통).
- **Claude Code**: 새 세션(또는 재실행).
- **Claude Desktop**: 트레이(Windows)·Dock(macOS) 아이콘 → **Quit(완전 종료)** 후 재실행. (창만 닫기는 재시작이 아니다.)

## 4. 공통 개인설정 (한 번만, 여러 skill 공유)
| 파일 | 내용 |
|------|------|
| `~/.claude/kiki/kiki.config.json` | 이름·사번·카드책임자·담당 행정원·참여과제·`kiki_root` — 첫 skill 설정 때 자동으로 채움, 이후 재사용 |
| `<kiki 폴더>/token.txt` | Dooray 토큰(업로드 쓰는 skill 만). 채팅에 붙여넣지 말고 파일에 |
| `~/.claude/kiki/kk-<skill>.config.json` | skill 고유 설정 |

자세히 → [skills/_shared/personal_config.md](skills/_shared/personal_config.md).

## 5. skill 별 첫 실행 + 인식 확인
재시작 후 Claude 에서 `kk-<skill> 설정해줘` → 환경 점검 후 부족한 값만 물어보고 설정을 만든다. **부트스트랩이 응답하면 인식 성공**(무응답이면 재시작 다시 + `~/.claude/skills/kk-mail/SKILL.md` 확인).

| skill | Python 패키지 (필요할 때 skill 이 확인·설치) | 첫 실행 | 사용 예 |
|-------|------------|---------|---------|
| **kk-mail** | — | `kk-mail 설정해줘` | `지난주 광고 스팸 골라줘` / `앞으로 nature.com 은 저널 폴더로` |
| **kk-pay** | `Pillow` `requests` (+Windows 변환 시 `pywin32`) | `kk-pay 설정해줘` (토큰·행정원 폴더·영수증 폴더) | `이번달 영수증 지급신청 처리해줘` |
| **kk-dining** | `openpyxl` (hwpx 회의록 옵션은 추가 설치 없음) | `kk-dining 설정해줘` (hwpx 동봉 여부·업로드 여부) | `회의비 처리하자` |
| **kk-budget** | `openpyxl` | `kk-budget 설정해줘` (추적 과제·카테고리) | `예산 수집해줘` / `예산 잔액 표로` |
| **kk-inspect** | `Pillow` (+ pdf→jpg 시 `PyMuPDF`) | `kk-inspect 설정해줘` (위치·행정원·검수 폴더) | `이 폴더 증빙들 소액검수 올려줘` |

> **쓰기 작업(업로드·제출·결재상신·검수 신청·파일 첨부)은 항상 본인 확인 후** 진행된다.

## 6. macOS / Linux
- 설치 `install.sh`, 경로 `~/.claude/skills/`·`~/.claude/kiki/`·`~/kiki`. 기능 동일하되 **hwp→pdf 자동 변환(kk-pay 증빙)만 Windows+아래아한글 전용**(회의록 hwpx 생성은 모든 OS). docx/xlsx→pdf 는 LibreOffice 로 자동.

## 7. 트러블슈팅
- **install.ps1 이 "running scripts is disabled"** → `powershell -ExecutionPolicy Bypass -File .\install.ps1`.
- **설치했는데 `kk-*` 가 안 보임** → Claude 재시작했는지(§3, Desktop 은 Quit). `~/.claude/skills/kk-mail/SKILL.md` 존재 확인.
- **브라우저 연결 안 됨** → "Claude in Chrome" 확장 설치·연결(§0-2). `list_connected_browsers` 로 확인.
- **첨부 도구가 없다 / `upload_file` 이 없다** → chrome-devtools-mcp 미등록(§0-3). `npx` 가 없으면 Node.js 부터.
- **"로그인 해달라"** → 해당 창(평소 Chrome 또는 Claude 전용 새 창)에서 그 시스템(Dooray / 포탈 `e.kist.re.kr`) 로그인 후 재시도. 정오 이후엔 세션 리셋.
- **포탈 팝업(검수창·지급신청 창)이 안 뜸** → Chrome 설정 → 개인정보 보호 및 보안 → 사이트 설정 → 팝업 및 리디렉션 → "팝업 전송 및 리디렉션 허용" 에 `https://p.kist.re.kr` 추가. **Claude 전용 새 Chrome 창(chrome-devtools)도 별도 프로필이라 같은 설정 필요.** (평소 포탈을 쓰던 PC 는 이미 돼 있는 경우가 대부분)
- **파일첨부가 "workspace root 밖" 오류** → chrome-devtools 의 `upload_file` 은 Claude 를 연 폴더 하위 파일만 올린다. skill 이 증빙을 `<kiki 폴더>/_tmp/` 로 복사해 올리니 kiki 폴더에서 Claude 를 열면 된다.
- **엑셀 저장 `PermissionError`** → 그 엑셀 파일이 열려 있음. 닫고 재시도.
- **사내망 밖** → KIST VPN 접속.
- **`_shared` 참조 오류** → skill 폴더와 함께 `skills/_shared` 도 `~/.claude/skills/_shared` 로 복사했는지(방법 A 스크립트는 자동).
- **clone 실패** → private repo. ZIP 다운로드로 대체(§1) 또는 `gh auth login` + collaborator 초대.
