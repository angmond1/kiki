<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/kiki-logo-1-dark.png">
    <img src="assets/kiki-logo-1.png" alt="KIKI" width="360">
  </picture>
</p>

# KIST 행정 자동화 스킬 패키지 

KIST 포탈 제어 claude code, codex skill 모음. 

<br>

## 구성
| skill | 용도 | 기능 | 권장모델 |
|-------|------|------|:--------:|
| **kk-pay** | 지급신청 | 카드결제건 RPA, 세금계산서 지급신청서 자동작성 | Opus (RPA 업로드는 sonnet) |
| **kk-dining** | 회의비처리 | 회의록, 회의비 지급신청서 자동 작성  | Opus |
| **kk-inspect** | 물품검수 | 소액 검수 신청서 자동 작성 | Sonnet |
| **kk-budget** | 예산조회 | 과제 예실대비표 예산현황 자동조회  | Sonnet |
| **kk-mail** | 메일관리 | 불건전 학회/저널 메일 자동스팸, 자동 폴더분류 | Sonnet |

<br><br>

## 설치
claude code (claude 데스크탑 앱에서 code), codex 대화창에 아래 문구 붙여넣기  
"https://github.com/angmond1/kiki 설치해줘"  

설치지침: claude는 [CLAUDE.md](CLAUDE.md), codex는 [CODEX.md](CODEX.md)  

<br><br>

## 준비물

### 1. claude, chatgpt 유료 계정과 데스크탑 앱 설치
- claude desktop app https://claude.com/download  
- codex (chatgpt) https://openai.com/ko-KR/codex/  

### 2. Chrome 브라우저 + 확장 프로그램 Claude in Chrome 설치
- Chrome 에서 설치 → https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn  

  그리고 나서 claude desktop: 좌하단 이니셜 → 설정 → "Claude in Chrome" 켜기  

### 3. chrome-devtools-mcp (파일첨부용)
- claude desktop: 대화창에서 "chrome-devtools-mcp 설치해줘"  
- codex: 설정 → MCP 서버 → 서버 추가 → 이름 chrome-devtools  

### 4. Chrome 브라우저로 KIST 포탈 로그인 필요
- 파일첨부 스킬 (kk-pay, kk-dining, kk-inspect)은 claude가 새 chrome 브라우저를 띄워주면서 새 로그인을 한번 더 요구함  

### 5. Dooray 토큰 (카드결제건 RPA 업로드용)
토큰 생성페이지 https://kist.gov-dooray.com/setting/api/token 에서 토큰 생성하고  
kiki 설치폴더에 token.txt 파일에(예 `C:\kiki\token.txt`) 토큰 값 붙여넣고 저장,  
claude code 대화창에 "두레이 토큰 저장했다"  
⚠️ 토큰·API 키를 채팅창에 입력하면 타인에게 노출될 수 있습니다.  

<br><br>

## 문의
이동기 / 청정에너지연구센터 e-chemical 연구팀  
dnklee@kist.re.kr
