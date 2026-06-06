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
claude code, codex 대화창에 아래 문구 붙여넣기  
"https://github.com/angmond1/kiki 설치해줘"  
세부사항은 [INSTALL.md](INSTALL.md)  

codex 설치 세부사항은 [CODEX.md](CODEX.md)  
  


## 필요 환경
claude 또는 chatgpt 유료 계정  

claude desktop app https://claude.com/download  
또는 claude code cli https://code.claude.com/docs/ko/quickstart#native-install-recommended 필요  

claude desktop app 설정에서 아래기능 허용  
설정 -> 데스크톱 앱 -> browser use -> 모든 브라우저 작업 허용  
설정 -> chrome의 claude 설정 -> 사이트 권한 -> 확장 프로그램 허용  

포탈 로그인된 chrome 브라우저 환경에서 실행  
chrome 웹스토어의 claude 확장 프로그램 설치 필수  
https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn  

chatgpt 사용자는 codex desktop app 또는 codex cli 필요.  
https://openai.com/ko-KR/codex/  

codex desktop app 설정에서 아래기능 허용  
설정 -> MCP 서버 -> 서버 추가 -> chrome-devtools  

dooray drive 제어시 dooray API Key 필요  
https://kist.gov-dooray.com/setting/api/token  
  


## 문의
이동기 / 청정에너지연구센터 e-chemical 연구팀  
dnklee@kist.re.kr

