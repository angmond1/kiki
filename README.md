<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/kiki-logo-1-dark.png">
    <img src="assets/kiki-logo-1.png" alt="KIKI" width="360">
  </picture>
</p>

# KIST 행정 자동화 skill 패키지

KIST 구성원이 Claude Code로 **반복적인 행정 업무**를 자동화하는 skill 모음.
**개인 Dooray API key 발급이 필요**(발급: [개인설정 → API](https://kist.gov-dooray.com/setting/api/token)). 
발급한 키는 코드·repo에 넣지 않고 **본인 로컬에만** 둔다.

## 구성 skill
| skill | 용도 | 상태 |
|-------|------|------|
| **ki-mail** | Dooray 메일 관리 — 광고/predatory **스팸 신고(기본)**, **권장 폴더분류**(결재알림·과제·UST·기관뉴스·학회), **"앞으로 X→Y 폴더" 자연어 자동분류 규칙** | ✅ 사용 가능 |
| **ki-rpa** | RPA 지급신청 — 카드·세금계산서·회의비 증빙 **비목 분류 → 파일명 규칙 변환 → 담당 행정원 Dooray 폴더 업로드**. 카드 승인번호·과제는 통합정보 backend **fetch 직접호출(좌표 0, 해상도 무관)** | ✅ 사용 가능 |
| **ki-inspect** | 물품 소액검수 신청 — 거래명세서·카드영수증 증빙 파악 → **자산/비자산 보수적 판정** → 외화는 카드영수증조회 확정원화 → 검수창 입력(NEXACRO **form 직접제어**, 좌표 0) → 사용자 첨부·신청 | ✅ 사용 가능 |
| **ki-budget** | 과제별 예산 조회·리포트 — 통합정보 예실대비표 **fetch 직접조회**(좌표0, `BUDGYEAR=9999`·`ACCCLSCD`), 카테고리 총액/집행/잔액 + **직접비 소계**, 공동과제 **본인지분**(optional), 로컬 엑셀 + 채팅 표 | ✅ 사용 가능 |
| **ki-dining** | 회의비 처리 — 카드 회의비(법인+연구비) 추출·사전결재 매칭·**별지1호 회의록 hwp 생성**·증빙 업로드 | ✅ 사용 가능 |

## 설계 원칙
- **credential 격리**: 개인 Dooray API key는 **코드·repo에 절대 넣지 않고** 본인 로컬에만 둔다(skill 텍스트엔 credential 0).
- **개인화는 런타임 조회 + 로컬 config**: 폴더 ID 등 사람마다 다른 값은 실행 때 자동 조회. 개인 설정은 `~/.claude/kiki/`(repo 밖).
- **모든 쓰기는 confirm 후**: 되돌리기 어려운 작업은 제안만 자동, 실행은 사용자 확인.
- 자세한 규약: [`shared/security_policy.md`](shared/security_policy.md).

## ki-mail 한눈에
- **Tier 1 스팸**(기본): 광고성/predatory 메일 식별 → 스팸 신고.
- **Tier 2 권장 폴더분류**(선택, 물어보고): KIST/출연연 **공통 발신처**를 폴더로 — 결재알림·과제·UST·기관뉴스·학회 (총 **23규칙**, 웹검증된 기관 도메인). 설치 시 항목별로 묻고, 기존 폴더와 겹치면 합칠지 확인.
- **Tier 3 자연어 규칙**: *"앞으로 nature.com 메일은 저널 폴더로"* → 폴더 확보(없으면 **자동 생성**) + 자동분류 규칙 등록.
- 같은 도메인 두 용도(예 NRF: `nrf.re.kr` 과제공고 vs `nzine@nrf.re.kr` 웹진)는 **우선순위(`applyOrder`)로 자동 분리**.
- 자세한 분류 체계: [`skills/ki-mail/references/classification_policy.md`](skills/ki-mail/references/classification_policy.md).

## ki-rpa 한눈에
- **부트스트랩(1회)**: Dooray 토큰 → 카드책임자 이름 → 담당 행정원(폴더 **링크** 권장 / 이름검색) → 업로드 범위(폴더 구조 자동 분기) → 수행과제 확인 → 영수증 폴더.
- **작업**: 영수증 폴더 스캔 → 형식 변환(이미지→jpg / 문서→pdf) → **건별 과제·비목 확정**(사용자와) → 카드 승인번호 fetch 조회 → 파일명 변환 → Dooray 업로드(=RPA 자동 기안) → 처리완료 정리.
- **좌표 0**: 통합정보 NEXACRO 를 backend **fetch 직접호출**(`window.application.authTk`) → 모든 모니터·해상도에서 동작.
- **비목**: `expense_category`(자주 쓰는 것·판단 원칙) 1차 제안 → 애매하면 `expense_category_table`(전체 41비목·증빙·한도 lookup) → 그래도 모호하면 Dooray wiki, **사용자 확정**. (소모성 우선·외화 환산금지 등 규칙 내장)
- 인증: 통합정보(카드·과제)=KIST SSO 세션 / Dooray(업로드)=개인 토큰. 자세히: [`skills/ki-rpa/SKILL.md`](skills/ki-rpa/SKILL.md).

## ki-dining 한눈에
- **부트스트랩(1회)**: 이름 → 카드책임자 → 참여과제 확인 → 사전결재 면제(I·S·K) 확인 → "Dooray 드라이브 RPA 처리? 예/아니요" → (예면)토큰·행정원 폴더 → 한글 점검 → 폴더 안내.
- **작업**: 카드(법인+연구비) 회의비 후보 추출 → 사전결재 매칭(목적·장소·시간 자동, 없으면 과제보고서로 제목·내용 산출) → 인원(⌈금액÷5만⌉+1, **카페는 음료 잔수=인원**) → 참석자 → 회의내용(10만원↑) → **별지1호 회의록 hwp 생성** → (RPA면)두레이 `2.회의비` 업로드.
- **회의록 hwp**: 아래아한글 COM(pyhwpx) 양식 셀치환 + **보안팝업 Alt+N 무인** 처리. 과거 회의록과 제목·내용 중복 금지.
- 인증: 통합정보 조회=SSO 세션 / 두레이 업로드=개인 토큰(`kiki.env` 공유). 자세히: [`skills/ki-dining/SKILL.md`](skills/ki-dining/SKILL.md).

## ki-budget 한눈에
- **부트스트랩(1회)**: 본인 과제 자동조회 → 추적 과제 선택(과제번호+명, 과책 아님 표시) → 개인집계 여부(적요 이름·활동비2 합산) → 추적 카테고리 → 저장(`C:\kiki\budget\yymmdd.xlsx`) → 첫 시험수집.
- **작업**: 과제별 예실대비표 **fetch**(`getBdgInfo`→`getMainList`, `BUDGYEAR=9999`+`ACCCLSCD`, 카테고리 LEV1) → 카테고리 A/집행/계류/잔액 + **직접비 소계** → 로컬 엑셀 + 채팅 표(카테고리 잔액 + 직접비 잔액/총액).
- **좌표 0 (순수 fetch)**: `bdg_2030` backend 직접 fetch → 해상도·모니터 무관(DOM은 fallback). 화면 예실대비표와 1:1 검증.
- **공동과제 본인지분**(optional): 집행내역 적요에 지정 이름(연구자/행정원, 복수·혼합) 필터 합산.
- 인증: 통합정보=KIST SSO 세션(토큰 불요). **조회·로컬저장 전용**(포털 쓰기 없음). 자세히: [`skills/ki-budget/SKILL.md`](skills/ki-budget/SKILL.md).

## ki-inspect 한눈에
- **부트스트랩(1회)**: 이름·사번·연락처 → 지역(본원/강릉/전북)·건물·호실 → 지급신청 행정원 → 검수 파일 폴더(`C:\kiki\inspect`) → 참여 과제 자동수집.
- **작업**: 증빙 폴더 스캔 → 세금계산서/카드결제 분류(카드는 **카드영수증조회 확정원화** `USEAMT`) → **자산/비자산 보수적 판정**(대부분 비자산, 자산만 확인) → (자산이면 과제 선택) → 검수창 입력 → 사용자 확인 → **첨부·신청은 사용자** → 완료 후 `yymmdd` 폴더 정리.
- **좌표 0**: 검수창(NEXACRO `mcs_0003`)을 **form 직접제어**(`window._popupWin…form.setColumn`) — *제출* 화면이라 fetch insert 대신 form 제어가 정석(해상도 무관). 저장·첨부는 결재성이라 사용자 직접.
- **자산 판정**(wiki 7-1): 100만↑·정보기기 50만↑·SW 1천만↑ = 자산, 그 외 비자산.
- 인증: 통합정보=KIST SSO 세션(토큰 불요). 자세히: [`skills/ki-inspect/SKILL.md`](skills/ki-inspect/SKILL.md).

## 설치
[`INSTALL.md`](INSTALL.md) 참조. 요약: repo clone → `skills/<원하는 skill>/`를 `~/.claude/skills/`로 복사 → Chrome에 본인 Dooray 로그인 → Claude Code에서 사용.

## 접근
private repo. 링크/초대를 받은 KIST 구성원만 접근. 통합 관리 방침은 [`MIGRATION.md`](MIGRATION.md).

## 새 skill 만들기
같은 방식으로 다른 업무를 skill로 만들려면 [`SKILL_BUILDING_GUIDE.md`](SKILL_BUILDING_GUIDE.md) 참조 — 조직·개인에 비종속인 **범용 방법론**(정보 5분류 · 인증 전략 · 미지 API 다루기 · 범용화 체크리스트).
