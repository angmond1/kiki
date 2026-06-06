# kiki 설치 가이드

## 0. 전제 (각자 본인 PC에서 준비 — 이것이 "환경별 개별 준비")
1. **Claude Code** 설치·로그인.
2. **Chrome + "Claude in Chrome"(MCP) 확장** 설치·연결.
3. **Chrome에 본인 KIST Dooray 로그인** (`https://kist.gov-dooray.com`). ← 이게 인증. 별도 토큰·비번 없음.

> 이 3가지만 되면, 폴더 ID·멤버 정보 등 개인값은 skill이 **실행 때 자동 조회**한다.

## 1. repo 받기
```
git clone https://github.com/angmond1/kiki.git
```
(초대받은 계정으로. private repo)

## 2. 원하는 skill을 Claude Code skills 폴더로 복사
Windows (PowerShell):
```powershell
Copy-Item -Recurse "kiki\skills\ki-mail" "$env:USERPROFILE\.claude\skills\ki-mail"
```
macOS/Linux:
```bash
cp -r kiki/skills/ki-mail ~/.claude/skills/ki-mail
```
> 형제 skill(ki-rpa 등)도 같은 방식. **개인 config는 복사 대상 아님** — 첫 실행 때 `~/.claude/kiki/`에 생성된다.

## 3. 첫 실행 (부트스트랩)
Claude Code에서 `ki-mail 설정해줘` 하면 순서대로 물어봅니다:
1. (준비) Chrome 연결·Dooray 로그인 확인 → 현재 폴더·기존 규칙 자동 조회.
2. **Q1** "광고/스팸은 기본으로 스팸 처리합니다. 그 외 메일도 폴더로 분류할까요?"
3. **메일분류 기본 권장** — 항목별로 순차 질문(각각 켜고/끔, 기존 폴더와 겹치면 합칠지 확인):
   - **결재알림** ← `noreply@kist.re.kr`
   - **과제** ← NRF·KETEP·KIAT·KEIT
   - **UST** ← `ust.ac.kr`
   - **기관뉴스** ← NRF웹진·KISTEP·STEPI·KIRD·KRIBB·KIST홍보·과학기술인공제회 (+ KEIT/KIAT 뉴스 주소)
   - **학회** ← 화공·공업화학·전기화학·대한화학·금속재료·재료·나노
4. 각 '예'마다 폴더 **자동 생성** + (과거 메일 소급할지) 확인 후 규칙 등록 — 모두 confirm 후.
5. `~/.claude/kiki/ki-mail.config.json` 생성.
- config 없이도 스팸 처리·자연어 규칙은 동작. config는 폴더 분류 선호 기억용.

## 4. 사용 예
```
지난주 받은 메일에서 광고성 스팸 골라줘
앞으로 nature.com 에서 오는 메일은 저널 폴더로 자동분류해줘
```

## ki-rpa (지급신청) — 추가 준비
ki-mail 과 달리 ki-rpa 는 **업로드에 Dooray 개인 토큰**이 필요하고, 문서 변환에 한글/Office 를 쓴다.
1. **Dooray 토큰**: 발급 https://kist.gov-dooray.com/setting/api/token → `~/.claude/kiki/ki-rpa.env` 에 `DOORAY_TOKEN=...` (repo 밖, gitignore). (권장: 토큰을 파일로 저장해 경로를 알려주면 채팅 기록에 안 남음)
2. **변환 도구**: 한글·MS Office(KIST PC 표준) + python 라이브러리 `pip install Pillow pywin32` (hwp/docx/xlsx→pdf, png→jpg 용. 증빙이 이미 pdf/jpg 면 불필요).
3. **설치**: `Copy-Item -Recurse "kiki\skills\ki-rpa" "$env:USERPROFILE\.claude\skills\ki-rpa"`
4. **첫 실행** `ki-rpa 설정해줘` → 토큰 → 카드책임자 이름 → 담당 행정원(**폴더 링크 붙여넣기 권장**, 이름검색은 최대 5분·"검색 중" 표시) → 업로드 범위 → 수행과제 확인 → 영수증 폴더.
5. **사용 예**: `이번달 영수증 지급신청 처리해줘` / `이 카드결제건들 비목 정해서 올려줘`

> 통합정보(카드·과제) 조회는 Chrome 에 **KIST 통합정보(p.kist.re.kr) 로그인 세션**이 있어야 한다(토큰 불요, fetch 가 세션+authTk 로 동작).

## ki-dining (회의비, v2 2026-06-05~) — 추가 준비
v2 는 **회의록 엑셀 master + fam_0704_02 지급신청서 직접 자동작성·결재상신**(NEXACRO 부모탭 JS). hwp 보관은 옵션. 아래아한글은 옵션 모드(`xlsx_and_hwp`)일 때만 필요.
1. **필수 python 패키지**: `pip install openpyxl` (엑셀 master).
2. **(옵션, 저장 모드 `xlsx_and_hwp` 일 때만)** 아래아한글 + `pip install pyhwpx pywin32 pywinauto` (별지1호 hwp 동봉용).
3. **Dooray 토큰**(RPA 업로드 부서만, v2 는 보통 불요 — fam_0704 직접 자동작성하므로): `~/.claude/kiki/kiki.env` 의 `DOORAY_TOKEN=...` — **모든 kiki skill 이 공유**(repo 밖, gitignore). 발급 https://kist.gov-dooray.com/setting/api/token.
4. **설치**: `Copy-Item -Recurse "kiki\skills\ki-dining" "$env:USERPROFILE\.claude\skills\ki-dining"`
5. **첫 실행** `ki-dining 설정해줘` → 이름 → 카드책임자 → 참여과제 확인 → **사전결재 면제(`I·S·B·F·부서운영비`)** 확인 → **저장 모드** (1=`xlsx_only` 기본 / 2=`xlsx_and_hwp` 보관 선호) → "Dooray 드라이브 RPA 처리? 예/아니요" (v2 기본=아니요) → (예면)토큰·행정원 폴더 → 환경 점검(Chrome MCP·openpyxl, 모드 2면 한글·COM) → 영수증/엑셀출력/과제보고서 폴더 안내.
6. **사용 예**: `회의비 처리하자` / `이번달 회의비 정리해줘` (→ 회의록 엑셀 작성 + fam_0704 직접 자동작성·임시저장·결재상신)
> 카드·과제·사전결재 조회 + fam_0704 자동작성·임시저장·결재상신 모두 통합정보 SSO 세션(토큰 불요, NEXACRO 부모탭 JS 좌표 0).
> 회의록 엑셀 기본 경로: `D:\GoogleDrive\내 드라이브\01\06.명세서\{YYYY.MM}\{yymmdd}_회의록.xlsx` (지급신청 처리일, 같은날 모든 건 1파일에 행 추가). 회의내용 작성용 과제보고서는 `C:\kiki\dining\project_report\`. (옵션 hwp 출력은 `C:\kiki\dining\<yymmdd>\`)
> **결재상신 후 결재선 확정·최종 상신**은 별도 gw 전자결재 창(ngw.kist.re.kr) → 사용자 직접. Claude 는 계정책임자 정보 자동 추출해 안내 문구 출력.

## ki-budget (예산 조회·리포트) — 추가 준비
조회·로컬저장 전용이라 **Dooray 토큰 불요**(통합정보 SSO 세션만). 엑셀 생성에 python `openpyxl`.
1. **python 라이브러리**: `pip install openpyxl`.
2. **설치**: `Copy-Item -Recurse "kiki\skills\ki-budget" "$env:USERPROFILE\.claude\skills\ki-budget"`
3. **첫 실행** `ki-budget 설정해줘` → 본인 과제 자동조회 → 추적 과제 선택(과제번호+명) → 개인집계 여부(공동과제 본인지분, 적요 이름) → 추적 카테고리 → 저장 폴더 → 오늘 날짜 1회 시험수집.
4. **사용 예**: `예산 수집해줘` / `내 과제 예산 정리해줘` / `예산 잔액 표로 보여줘`
> 통합정보(p.kist.re.kr) SSO 로그인 세션 필요(토큰·비번 없음). 포털 제출/변경 없는 **조회 전용**. 출력 기본 `C:\kiki\budget\yymmdd.xlsx`(채팅창에도 표로 함께 출력).

## ki-inspect (소액검수) — 추가 준비
조회 + **제출(검수신청)** 이라 통합정보 SSO 세션이 필요하다(Dooray 토큰 불요 — 포털 자체 제출이라 dooray 업로드 없음). 이미지 변환에 python `Pillow`(pdf→jpg 필요 시 `PyMuPDF`).
1. **python 라이브러리**: `pip install Pillow PyMuPDF`.
2. **설치**: `Copy-Item -Recurse "kiki\skills\ki-inspect" "$env:USERPROFILE\.claude\skills\ki-inspect"`
3. **첫 실행** `ki-inspect 설정해줘` → 이름·사번·연락처 → 지역(본원/강릉/전북)·건물·호실 → 지급신청 행정원 → 검수 파일 폴더(`C:\kiki\inspect`) → 참여 과제 자동수집(통합정보 프로젝트 화면).
4. **사용 예**: `검수신청하자` / `이 폴더 증빙들 소액검수 올려줘` / `카드결제건들 검수해줘`
> 통합정보(p.kist.re.kr) SSO 세션 필요(토큰 불요). 검수창 **입력·검증은 자동, 최종 첨부·신청 버튼은 사용자 본인**(결재성·팝업 파일첨부 자동화 불가). 외화는 카드영수증조회(`fam_0711`) 확정원화(`USEAMT`) 사용 — 카드명세서 잠정 환산액 금지. 완료 후 파일은 `C:\kiki\inspect\yymmdd\`로 정리.

## 트러블슈팅
- **"로그인 해달라"고 뜸** → Chrome에서 `kist.gov-dooray.com` 로그인 후 재시도(세션 만료).
- **브라우저 연결 안 됨** → Claude in Chrome 확장 연결 확인.
- **폴더 자동 생성** → 권장/자연어 분류 시 없는 폴더는 자동 생성됩니다. 혹시 실패하면 Dooray 좌측에서 직접 만든 뒤 재시도하면 규칙이 걸립니다.
- **사내망 필요** → Dooray 접속은 KIST 망/계정 권한을 따른다.
