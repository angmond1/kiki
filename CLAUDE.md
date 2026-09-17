# kiki on Claude — 설치·실행 지침 (Claude 에이전트용)

> 이 문서는 **Claude (Claude Code CLI / Claude Desktop 앱)** 가 kiki 를 설치·실행할 때 따르는 기준이다.
> **에이전트(Claude)에게**: 사용자가 "kiki 설치해줘" / "이거 설치해줘" 라고 하면, 추측하지 말고 **아래 1번 절차를 순서대로** 수행하라. repo 를 clone·확보한 **직후, 진행 전에 이 `CLAUDE.md` 와 `README.md` 를 먼저 Read 하라**(자동 주입이 안 될 수 있으니 능동적으로 읽는다). 각 skill 사용법은 설치 후 각 `skills/kk-*/SKILL.md` 가 1차 기준.
> (Codex 사용자는 [CODEX.md](CODEX.md). 메인테이너 노트는 배포본에 없다 — `CLAUDE.local.md`, repo 밖.)

## 0. kiki 가 무엇인가 (한 줄)
KIST 행정 자동화 skill 5종(`kk-mail`·`kk-pay`·`kk-dining`·`kk-budget`·`kk-inspect`). **로그인된 Chrome 탭을 "Claude in Chrome" 확장으로 제어**해 포털/Dooray 를 다룬다. skill 은 `~/.claude/skills/` 에 두면 Claude Code·Desktop 이 인식한다(설치 후 **재시작 필요**).

---

## 1. 설치 절차 (에이전트가 그대로 실행)

### Step 0 — 사전 도구 (없으면 먼저 안내하고 멈춤)
- **git** 필요(clone 용). 없으면 안내: https://git-scm.com/downloads .
- private repo 라 **gh CLI** 권장(인증). 없으면: https://cli.github.com → `gh auth login`.
- (사용자가 kiki 폴더를 **이미 받았으면** git/gh 불요 — Step 2 로.)

### Step 1 — repo(또는 폴더) 확보 + ⚠️ kiki 폴더 안에서 작업
- 사용자가 **이미 kiki 폴더를 받았으면** → **그 폴더 안에서** 진행(Claude Code 면 그 폴더를 작업 루트로 열고). **Step 2 로.**
- **"https://github.com/angmond1/kiki 설치해줘"** 형태면:
  ```
  git clone https://github.com/angmond1/kiki.git
  cd kiki
  ```
  - ⚠️ **clone 후 반드시 그 `kiki` 폴더 안에서** 이어서 작업한다. Claude Code 는 clone 만으로 작업 폴더가 바뀌지 않으니, `kiki` 안의 파일(이 `CLAUDE.md`·`README.md`·`install.*`)을 직접 Read 하며 진행한다. **다른 폴더에서 계속하면 이 지침이 적용되지 않아 추측 설치가 된다.**
  - ⚠️ **private repo.** clone 이 권한 오류(`Authentication failed`/`not found`)면 조용히 실패하지 말고 사용자에게 확인 요청: ① `gh auth login` 으로 GitHub 로그인했는지, ② collaborator 초대를 받았는지(메인테이너 `dnklee@kist.re.kr`). (gh 없이도 Git Credential Manager·Personal Access Token 으로 HTTPS clone 가능.)

### Step 2 — skill 설치 (OS 자동 감지)
현재 OS 를 판단해 **하나만** 실행한다.
- **Windows** (PowerShell) — 신규 PC 는 실행정책이 `Restricted` 라 `./install.ps1` 이 막힌다. **Bypass 로 호출**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\install.ps1            # 전체 (또는 끝에 kk-mail kk-pay ...)
  ```
  (이미 실행정책이 풀려 있으면 `./install.ps1` 도 됨. "running scripts is disabled" 오류가 바로 이 경우다.)
- **macOS / Linux** (bash):
  ```bash
  bash ./install.sh                                                # 전체 (또는 bash ./install.sh kk-mail ...)
  ```
둘 다 `_shared` + 선택 skill 을 `~/.claude/skills/` 로, 개인설정 템플릿을 `~/.claude/kiki/`(repo 밖) 로 만든다. 스크립트를 못 쓰면 [INSTALL.md](INSTALL.md) §2 방법 B(수동 복사) — `_shared` 와 `~/.claude/kiki/` 생성 누락 주의.

### Step 3 — ⚠️ 재시작 (반드시 안내, 건너뛰지 말 것)
`~/.claude/skills/` 에 **새 skill 디렉토리가 생기면 그 세션에서는 인식되지 않는다**(Code·Desktop 공통, 공식 동작). 설치 직후 사용자에게:
> "설치 완료. **Claude 를 재시작**한 뒤 `kk-mail 설정해줘` 라고 해주세요. (새 skill 은 재시작해야 인식됩니다.)"

- **Claude Code**: 세션 종료 후 재실행(또는 새 세션).
- **Claude Desktop**: 트레이(Windows)·Dock(macOS) 아이콘 → **Quit(완전 종료)** 후 재실행. **창만 닫는 건 재시작이 아니다.**
- 같은 세션에서 바로 `kk-*` 를 트리거하려 하지 말 것. **재시작이 zeroshot 의 필수 단계다.**

### Step 4 — 실행 환경 (첫 사용 때 점검)
[`skills/_shared/environment_setup.md`](skills/_shared/environment_setup.md) 0단계. 핵심 두 가지:
- **"Claude in Chrome" 확장** 설치·연결 — Code/Desktop 공통 (웹스토어 `chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn`).
  - **Claude Code**: `https://code.claude.com/docs/en/chrome` 절차로 연결 → `list_connected_browsers` 확인.
  - **Claude Desktop**: 좌하단 이니셜 → Settings → "Claude in Chrome" connector ON.
- **포털 로그인**: Dooray `kist.gov-dooray.com` / 통합정보 포탈 `e.kist.re.kr`(2026-07 변경, 업무화면은 `p.kist.re.kr:8081`) 에 **사용자 본인이 Chrome 로그인**(Claude 가 대신 로그인하지 않는다).

### Step 5 — 첫 실행 + 인식 확인
재시작 후 `kk-<skill> 설정해줘`. **skill 부트스트랩이 응답하면 인식 성공.** 응답이 없으면(skill 미인식) → 재시작을 다시 하고(Step 3), `~/.claude/skills/kk-mail/SKILL.md` 존재를 확인한다.

---

## 2. Claude Code vs Claude Desktop (차이는 이것뿐)
| 항목 | Claude Code (CLI) | Claude Desktop 앱 |
|---|---|---|
| skill 경로 | `~/.claude/skills/` | **동일** `~/.claude/skills/` |
| 설치 후 인식 | 재시작(새 세션) | **완전 종료(Quit)** 후 재실행 |
| 브라우저 확장 연결 | `docs/en/chrome` 절차 | Settings → connector 토글 |
| 개인설정 | `~/.claude/kiki/` | **동일** |

경로·개인설정·skill 본문은 전부 공통이다.

**⚠️ Claude Desktop 으로 설치할 때**: Desktop 앱은 터미널(git·스크립트) 작업과 폴더 작업 컨텍스트가 제한적이라, 대화창에서 직접 clone·설치가 어렵다. 그래서 **설치는 Claude Code(CLI) 또는 수동 복사**([INSTALL.md](INSTALL.md) §2 방법 B)로 하는 것을 권장한다 — **설치만 끝나면 Desktop 을 Quit→재실행 했을 때 Desktop 도 같은 `~/.claude/skills/` 를 읽어 `kk-*` 를 쓸 수 있다(설치=CLI/수동, 사용=양쪽).** Desktop 대화창에서 굳이 에이전트로 설치하려면, clone 한 폴더의 절대경로를 직접 알려주고(예: `C:\Users\이름\kiki 폴더 설치해줘`) filesystem MCP 가 연결돼 있어야 한다 — 번거로우니 위 CLI/수동 설치가 더 간단하다.

**Desktop 에서 재시작·연결 후에도 `kk-*` 가 안 보이면** → 같은 설정을 쓰는 Claude Code(CLI)로 실행(가장 확실, 없으면 `https://code.claude.com/docs/ko/quickstart`). (Windows 경로 = `%USERPROFILE%\.claude\skills`, macOS/Linux = `~/.claude/skills`.)

## 3. 실행 메커니즘 (참고)
skill 은 "Claude in Chrome" 으로 **로그인된 탭에 JS 를 주입**해 포털/Dooray backend 를 호출한다(NEXACRO 화면은 fetch 직접 조회 + form 직접제어, **좌표 0**, 해상도 무관). 확장이 연결돼 있지 않으면 어떤 skill 도 동작하지 않는다. 상세는 각 `skills/kk-*/SKILL.md`.

## 4. 안전 경계 (항상 준수)
- 조회·로컬 파일 작성 = 자동 가능.
- **업로드·이름변경·이동·포털 저장·임시저장·신청·결재상신·스팸신고·메일이동 = 사용자 confirm 후.**
- 결재상신 = 실제 결재 제출 → 최종 확인 전 금지.
- 토큰·세션쿠키·`authTk`·카드번호·사번은 출력 금지. (`skills/_shared/security_policy.md`)

## 5. 트러블슈팅
- **install.ps1 이 "running scripts is disabled"** → `powershell -ExecutionPolicy Bypass -File .\install.ps1` 로 실행(Step 2).
- **`git` 명령이 없음** → https://git-scm.com 설치 후 재시도(Step 0).
- **"설치했는데 `kk-*` 가 안 보임"** → Claude **재시작**했는지(Step 3, Desktop 은 Quit). `~/.claude/skills/kk-mail/SKILL.md` 존재 확인. 그래도 안 되면(Desktop) Claude Code(CLI)로 실행.
- **clone 실패** → private repo. `gh auth login` + collaborator 초대(Step 1).
- **"`_shared` 참조 오류"** → skill 과 함께 `~/.claude/skills/_shared` 도 복사됐는지(install 스크립트는 자동).
- **"브라우저 연결 안 됨"** → "Claude in Chrome" 확장 설치·연결 + 대상 포털 로그인(Step 4).
- **세션 만료("로그인 해달라")** → Chrome 에서 해당 포털 재로그인 후 재시도.
