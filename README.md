<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/kiki-logo-1-dark.png">
    <img src="assets/kiki-logo-1.png" alt="KIKI" width="360">
  </picture>
</p>

# KIST 행정 자동화 스킬 패키지 

KIST 포탈/dooray 제어 claude, codex(chatgpt) skill 모음. 
  

## 구성
| skill | 용도 | 기능 |
|-------|------|------|
| **kk-budget** | 예산조회 | 과제 예실대비표 예산현황 자동조회  |
| **kk-pay** | 지급신청 | 카드결제건 RPA, 세금계산서 지급신청서 자동작성 |
| **kk-dining** | 회의비처리 | 회의록, 회의비 지급신청서 자동 작성  |
| **kk-inspect** | 물품검수 | 소액 검수 신청서 자동 작성 |
| **kk-mail** | 메일관리 | 불건전 학회/저널 메일 자동스팸, 자동 폴더분류 |
  


## 설치 (5분)
claude code, claude desktop, codex 대화창에 아래 문구 붙여넣기  
"https://github.com/angmond1/kiki 설치해줘"  

- 에이전트가 **kiki 폴더를 어디에 둘지**(기본 `C:\kiki`, Mac/Linux 는 `~/kiki` — 또는 원하는 경로) 물어본 뒤 나머지를 진행합니다.  
- **git 은 없어도 됩니다.** GitHub 페이지 우상단 `Code ▾ → Download ZIP` 으로 받아 그 폴더에 풀거나, 동료에게 폴더를 받아도 됩니다. (private repo 라 ZIP 다운로드에도 GitHub 로그인 + collaborator 초대 필요 — 문의 dnklee@kist.re.kr)  
- 설치가 끝나면 **claude(또는 codex)를 재시작**해야 skill 이 인식됩니다. (claude desktop 은 트레이/Dock 아이콘 → Quit 으로 완전 종료 후 재실행)  
- 재시작 후 `kk-mail 설정해줘` 처럼 첫 실행하세요.  

에이전트가 따라가는 설치 지침 — claude 는 [CLAUDE.md](CLAUDE.md), codex 는 [CODEX.md](CODEX.md).  
사람이 읽는 설치 세부사항 — [INSTALL.md](INSTALL.md).  
  


## 준비물 (한 번만)

### 1. 계정과 모델
claude 유료 계정(claude code 또는 claude desktop) 또는 chatgpt 유료 계정(codex).  
- claude code cli https://code.claude.com/docs/ko/quickstart#native-install-recommended  
- claude desktop app https://claude.com/download (설치 스크립트 실행 때문에 cli 도 함께 설치 권장)  
- codex https://openai.com/ko-KR/codex/  

**권장 모델** (claude)  
| 언제 | 모델 | 노력도 |
|------|------|--------|
| 패키지 설치 · 각 skill 첫 설정 · 첫 1~2회 실사용 | **Opus 5** (Fable 5.1 이 있으면 그것) | high |
| 익숙해진 뒤 kk-mail · kk-budget | Sonnet 5 | medium |
| 익숙해진 뒤 kk-pay(카드 RPA 업로드) · kk-inspect | Sonnet 5 | high |
| kk-dining · kk-pay 세금계산서 직접작성 (계속) | Opus 5 | high |
| 막힐 때 · 처음 보는 화면 | Fable 5.1 / Opus 5 | max |

Haiku 4.5 는 권장하지 않습니다 — 포탈에 실제 결재를 올리는 작업이라 실수 비용이 토큰 절약보다 큽니다.  
codex 도 같은 원칙: 설치·첫 사용은 가장 강한 추론 모델, 익숙해지면 표준 모델.  

### 2. Google Chrome + 확장 "Claude in Chrome" (필수)
Claude 가 **평소 쓰는 Chrome 창**을 조작하는 브라우저 확장 프로그램입니다.  
1. Chrome 에서 설치 → https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn  
2. 연결  
   - claude desktop: 좌하단 이니셜 → 설정 → **"Claude in Chrome"** 켜기  
   - claude code(cli): `claude --chrome` 로 시작(또는 세션에서 `/chrome` → "Enabled by default"). 안내: https://code.claude.com/docs/en/chrome  

### 3. chrome-devtools-mcp (필수 — 파일첨부용)
검수증빙·세금계산서·회의 영수증 같은 **파일을 포탈에 첨부**하려면 위 확장만으론 안 되고, Claude 전용 Chrome 창을 하나 더 띄우는 도구가 필요합니다. 브라우저 확장이 아니라 **MCP 서버 1개** 이고, Node.js 가 있어야 합니다(아래 4).  
- claude code(cli) 터미널에서 한 줄:  
  ```
  claude mcp add --scope user chrome-devtools -- npx -y chrome-devtools-mcp@latest
  ```
  `--scope user` 로 등록하면 **claude desktop 도 같은 설정을 읽어** 그대로 씁니다(desktop 만 쓰는 분도 cli 로 이 한 줄만).  
- codex: 설정 → MCP 서버 → 서버 추가 → 이름 `chrome-devtools`, 명령 `npx -y chrome-devtools-mcp@latest`  
- 에이전트에게 "chrome-devtools-mcp 설치해줘" 라고 해도 됩니다(등록 후 재시작).  

### 4. Python 3 + Node.js
설치 때 에이전트가 확인하고 없으면 설치를 안내합니다. 직접 하려면:  
- Python https://www.python.org/downloads/ (Windows 는 설치 화면에서 **"Add python.exe to PATH"** 체크)  
- Node.js https://nodejs.org/ (LTS)  
Python 패키지(openpyxl 등)는 처음에 다 깔지 않고 **각 skill 이 필요할 때 그때 설치**합니다(확인 후).  

### 5. KIST 사내망
KIST 안에서 실행합니다. 밖(재택·출장)이면 **KIST VPN** 에 먼저 접속하세요.  

### 6. 로그인 — 어느 창에 해야 하나
| skill / 작업 | Chrome 창 | 로그인 |
|--------------|-----------|--------|
| kk-mail | 평소 쓰는 Chrome | Dooray `kist.gov-dooray.com` 로그인 상태면 끝 |
| kk-budget | 평소 쓰는 Chrome | 포탈 `e.kist.re.kr` 로그인 상태면 끝 |
| kk-pay — 카드결제건 RPA 업로드 | 평소 쓰는 Chrome + `token.txt` | 포탈 + Dooray 로그인. **새 창 없음** |
| kk-pay — 세금계산서 직접작성 | **Claude 전용 새 Chrome 창** | 그 창에서 포탈 로그인 **한 번 더** |
| kk-dining | **Claude 전용 새 Chrome 창** | 그 창에서 포탈 로그인 한 번 더 |
| kk-inspect | **Claude 전용 새 Chrome 창** | 그 창에서 포탈 로그인 한 번 더 |

파일첨부가 있는 3가지(inspect·dining·세금계산서)는 Claude 가 **새 Chrome 창을 하나 띄웁니다.** 평소 Chrome 과 로그인이 공유되지 않아 **그 창에서 한 번 더 로그인**해야 합니다(낯설지만 정상). 한 번 로그인하면 그 창은 기억합니다. (KIST 포탈은 매일 정오에 전체 세션이 풀리니 오후엔 다시 로그인)  
로그인은 항상 **본인이 직접** 합니다 — Claude 는 대신 로그인하지 않습니다.  

### 7. Dooray 토큰 (kk-pay 카드결제건 RPA 업로드 쓸 때만)
설치하면 kiki 폴더에 **`token.txt`** 가 생깁니다(예 `C:\kiki\token.txt`). https://kist.gov-dooray.com/setting/api/token 에서 개인 인증 토큰을 만들어 그 파일의 `Dooray token:` **다음 줄에 붙여넣고 저장**한 뒤 "토큰 넣었어" 라고만 알려주세요.  
⚠️ 토큰·API 키를 **채팅창에 직접 붙여넣지 마세요** — 대화 기록에 남아 타인에게 노출될 수 있습니다.  

### 8. 아래아한글 · MS Office (있으면 자동, 없어도 됨)
증빙이 hwp/docx/xlsx 면 pdf 로 자동 변환하는 데 씁니다. 없으면 에이전트가 무료 대안(Office → LibreOffice, 한글 → **HOP** https://github.com/golbin/hop) 설치를 물어봅니다. HOP 은 열람·편집·PDF 내보내기용이고, 자동 변환·자동 생성은 아래아한글(Windows)에서만 됩니다.  
회의록을 **한글 파일로도** 저장할지는 kk-dining 설정 때 물어봅니다(엑셀만 쓰는 부서는 아니요).  
  


## 문의
이동기 / 청정에너지연구센터 e-chemical 연구팀  
dnklee@kist.re.kr
