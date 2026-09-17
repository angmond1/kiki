# kiki 설치 가이드

> 빠른 길: claude/codex 대화창에 **"https://github.com/angmond1/kiki 설치해줘"** → 에이전트가 [CLAUDE.md](CLAUDE.md)(claude) / [CODEX.md](CODEX.md)(codex) 절차로 설치합니다. 아래는 사람이 직접 하거나 확인할 때의 상세입니다.

## 0. 사전 도구 (각자 본인 PC에서 한 번)
1. **Claude** — Claude Code(CLI) 또는 Claude Desktop 앱. 둘 다 같은 `~/.claude/skills/` 를 쓴다.
2. **git** (clone 용) — 없으면 https://git-scm.com/downloads . private repo 인증엔 **gh CLI**(https://cli.github.com) 권장.
3. **"Claude in Chrome" 확장 설치·연결** — Code/Desktop 공통.
   - Claude Code: `https://code.claude.com/docs/en/chrome` 절차로 연결.
   - Claude Desktop: 좌하단 이니셜 → 설정 → "Claude in Chrome" connector 켜기.
   - **★ 파일첨부 자동화 — `chrome-devtools-mcp`(MCP) 추가 등록** (kk-inspect 등 첨부 쓰는 skill 필수): "Claude in Chrome" 만으론 **별도 창 팝업**(소액검수 mcs_0003 등)의 파일첨부가 안 된다. claude code 에 `claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`(또는 `.mcp.json`/plugin) 로 등록. **브라우저 확장이 아니라 MCP 서버 1개 + 시스템 Google Chrome** 이면 되고(그 자체 Chrome 에 KIST 1회 로그인), 절차는 `skills/_shared/nexacro_file_upload.md` §4-6.
4. **Chrome에 본인 KIST 로그인**
   - Dooray: `https://kist.gov-dooray.com` (kk-mail)
   - 통합정보: 포탈 로그인 `https://e.kist.re.kr`(2026-07 변경, 구 ekist.re.kr) → 업무화면 `http://p.kist.re.kr:8081` (kk-pay·kk-dining·kk-budget·kk-inspect)
   - ← 이게 인증이다. 대부분 별도 토큰·비번 없이 로그인 세션으로 동작.

> 모든 skill 은 첫 실행 때 이 환경을 동일하게 점검한 뒤 진행한다(연결/로그인 안 돼 있으면 안내 후 멈춤).

## 1. repo 받기
```
git clone https://github.com/angmond1/kiki.git
cd kiki          # ⚠️ 이후 작업은 이 kiki 폴더 안에서 (claude code 는 이 폴더를 열고 진행)
```
- ⚠️ **private repo 다.** clone 이 안 되면: ① `gh auth login` 으로 GitHub 로그인했는지, ② collaborator 초대를 받았는지(메인테이너 dnklee@kist.re.kr) 확인.
- 동료에게 폴더를 직접 받았으면 clone 생략 — 그 폴더에서 §2 로.

## 2. skill 설치 — `~/.claude/skills/` 로

### 방법 A — 설치 스크립트 (권장)
repo 폴더 안에서, OS 에 맞는 것 **하나**:
```powershell
# Windows (PowerShell) — 신규 PC 는 실행정책이 막혀 있을 수 있으니 Bypass 로
powershell -ExecutionPolicy Bypass -File .\install.ps1 kk-mail kk-pay kk-dining   # 인자 없으면 전체
```
```bash
# macOS / Linux (bash)
bash ./install.sh kk-mail kk-pay kk-dining                                        # 인자 없으면 전체
```
공통 폴더(`_shared`)와 개인설정 템플릿(`~/.claude/kiki/`)까지 자동으로 챙긴다.
> `./install.ps1` 이 *"running scripts is disabled"* 로 막히면 위처럼 `powershell -ExecutionPolicy Bypass -File .\install.ps1` 로 실행한다.

### 방법 B — 수동 복사 (스크립트를 못 쓸 때)
원하는 skill **과 공통 폴더 `_shared` 를 반드시 함께** 복사하고, 개인설정 폴더도 만든다(`_shared`·`~/.claude/kiki/` 없으면 동작 안 함).
```powershell
# Windows
Copy-Item -Recurse "skills\_shared" "$env:USERPROFILE\.claude\skills\_shared"
Copy-Item -Recurse "skills\kk-mail" "$env:USERPROFILE\.claude\skills\kk-mail"
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\kiki" | Out-Null
Copy-Item "skills\_shared\kiki.config.example.json" "$env:USERPROFILE\.claude\kiki\kiki.config.json"
Copy-Item "skills\_shared\kiki.env.example" "$env:USERPROFILE\.claude\kiki\kiki.env"
```
```bash
# macOS/Linux
cp -R skills/_shared ~/.claude/skills/_shared
cp -R skills/kk-mail ~/.claude/skills/kk-mail
mkdir -p ~/.claude/kiki
cp skills/_shared/kiki.config.example.json ~/.claude/kiki/kiki.config.json
cp skills/_shared/kiki.env.example ~/.claude/kiki/kiki.env
```

## 3. ⚠️ 재시작 (반드시)
`~/.claude/skills/` 에 새 skill 디렉토리가 생기면 **재시작해야 인식**된다(Claude Code·Desktop 공통).
- **Claude Code**: 새 세션(또는 재실행).
- **Claude Desktop**: 트레이(Windows)·Dock(macOS) 아이콘 → **Quit(완전 종료)** 후 재실행. (창만 닫기는 재시작이 아니다.)

## 4. 공통 개인설정 (한 번만, 여러 skill 공유)
개인 식별정보·토큰은 **모든 kk-* 가 공유**하는 한 곳(repo 밖):
- `~/.claude/kiki/kiki.config.json` — 이름·사번·카드책임자·담당 행정원·참여과제 등.
- `~/.claude/kiki/kiki.env` — Dooray 토큰(업로드 쓰는 skill 만).

대개 **첫 skill 설정 때 자동 생성**되고, 이후 다른 skill 은 이 값을 재사용한다(다시 묻지 않음). 자세히 → [skills/_shared/personal_config.md](skills/_shared/personal_config.md).

## 5. skill 별 첫 실행 + 인식 확인
재시작 후 Claude 에서 `kk-<skill> 설정해줘` → 환경 점검 후 부족한 값만 물어보고 설정을 만든다. **부트스트랩이 응답하면 인식 성공**(무응답이면 재시작 다시 + `~/.claude/skills/kk-mail/SKILL.md` 확인).

| skill | 추가 python | 첫 실행 | 사용 예 |
|-------|------------|---------|---------|
| **kk-mail** | — | `kk-mail 설정해줘` (폴더 분류 권장 항목 순차 질문) | `지난주 광고 스팸 골라줘` / `앞으로 nature.com 은 저널 폴더로` |
| **kk-pay** | `pip install Pillow pywin32` | `kk-pay 설정해줘` (토큰·행정원 폴더·영수증 폴더) | `이번달 영수증 지급신청 처리해줘` |
| **kk-dining** | `pip install openpyxl` (+ hwp 동봉 시 `pyhwpx pywin32 pywinauto`) | `kk-dining 설정해줘` (저장 모드·업로드 여부) | `회의비 처리하자` |
| **kk-budget** | `pip install openpyxl` | `kk-budget 설정해줘` (추적 과제·카테고리) | `예산 수집해줘` / `예산 잔액 표로` |
| **kk-inspect** | `pip install Pillow PyMuPDF` | `kk-inspect 설정해줘` (위치·행정원·검수 폴더) | `이 폴더 증빙들 소액검수 올려줘` |

> **쓰기 작업(업로드·제출·결재상신·검수 신청·파일 첨부)은 항상 본인 확인 후** 진행된다.

## 6. Claude Desktop 참고
- **설치는 Claude Code(CLI) 또는 수동 복사(§2 방법 B) 권장.** Desktop 앱은 터미널(git·스크립트)·폴더 작업이 제한적이라 대화창에서 직접 clone·설치가 어렵다. **설치만 끝나면 Desktop 을 Quit→재실행 했을 때 Desktop 도 같은 `~/.claude/skills/` 를 읽어 `kk-*` 를 쓴다(설치=CLI/수동, 사용=양쪽).**
- skill 경로·개인설정은 Code 와 동일(`~/.claude/skills/`, `~/.claude/kiki/`). 재시작은 **완전 종료(Quit)** 후 재실행.
- 재시작·확장 연결 후에도 `kk-*` 가 안 보이면 → Claude Code(CLI)로 실행 권장(가장 확실). CLI 가 없으면 https://code.claude.com/docs/ko/quickstart .

## 7. 트러블슈팅
- **install.ps1 이 "running scripts is disabled"** → `powershell -ExecutionPolicy Bypass -File .\install.ps1`.
- **`git` 명령이 없음** → https://git-scm.com 설치 후 재시도.
- **설치했는데 `kk-*` 가 안 보임** → Claude 재시작했는지(§3, Desktop 은 Quit). `~/.claude/skills/kk-mail/SKILL.md` 존재 확인.
- **clone 실패** → private repo. `gh auth login` + collaborator 초대(§1).
- **"로그인 해달라"** → Chrome에서 해당 시스템(Dooray / 통합정보) 로그인 후 재시도(세션 만료).
- **브라우저 연결 안 됨** → "Claude in Chrome" 확장 연결 확인(`list_connected_browsers`).
- **`_shared` 참조 오류** → skill 폴더와 함께 `skills/_shared` 도 `~/.claude/skills/_shared` 로 복사했는지(방법 A 스크립트는 자동).
- **사내망 필요** → KIST 망/계정 권한을 따른다.
