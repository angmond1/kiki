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
  


## 설치
claude code, claude desktop, codex 대화창에 아래 문구 붙여넣기  
"https://github.com/angmond1/kiki 설치해줘"  
github 에서 받으면 git 이 필요합니다 — https://git-scm.com  
※ private repo 라 clone 엔 GitHub 계정·collaborator 초대 필요 (문의 dnklee@kist.re.kr)  
clone 뒤에는 **그 kiki 폴더에서 claude 를 열고** 진행하세요(설치 지침이 그 폴더에 있습니다).  
(동료에게 폴더를 직접 받았으면 clone 없이 그 폴더에서 진행)  

설치가 끝나면 **claude(또는 codex)를 재시작**해야 skill 이 인식됩니다.  
(claude desktop 은 트레이/Dock 아이콘 → Quit 으로 완전 종료 후 재실행)  
재시작 후 `kk-mail 설정해줘` 처럼 첫 실행하세요.  

에이전트가 따라가는 설치 지침 — claude 는 [CLAUDE.md](CLAUDE.md), codex 는 [CODEX.md](CODEX.md).  
사람이 읽는 설치 세부사항은 [INSTALL.md](INSTALL.md).  
  


## 필요 환경
claude 또는 chatgpt 유료 계정  

**claude 사용자** — 아래 중 하나 (둘 다 같은 `~/.claude/skills/` 를 쓰고, **설치 후 재시작해야 인식**)  
claude code cli https://code.claude.com/docs/ko/quickstart#native-install-recommended  
claude desktop app https://claude.com/download  
※ desktop 앱은 터미널 작업이 제한적이라 **설치는 claude code(cli) 또는 수동 복사([INSTALL.md](INSTALL.md) §2 방법 B) 권장** — 설치 후엔 desktop 에서도 사용 가능  

브라우저 제어 — "Claude in Chrome" 확장 (claude code/desktop 공통 필요)  
chrome 웹스토어에서 claude 확장 설치  
https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn  
- claude code: https://code.claude.com/docs/en/chrome 절차로 확장 연결  
- claude desktop: 좌하단 이니셜 → 설정 → "Claude in Chrome" connector 켜기 (또는 browser use → 모든 브라우저 작업 허용)  

포탈 로그인된 chrome 브라우저 환경에서 실행  
대상 포탈(dooray `kist.gov-dooray.com` / 통합정보 `p.kist.re.kr`)에 본인이 로그인  

**chatgpt 사용자** — codex desktop app 또는 codex cli  
https://openai.com/ko-KR/codex/  
codex desktop app 설정 → MCP 서버 → 서버 추가 → chrome-devtools  

dooray drive 제어시(kk-pay 업로드) dooray API Key 필요  
https://kist.gov-dooray.com/setting/api/token  
  


## 문의
이동기 / 청정에너지연구센터 e-chemical 연구팀  
dnklee@kist.re.kr
