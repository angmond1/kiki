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
| ki-inspect | 물품 소액검수 신청 | 🛠 준비 중 |
| ki-budget | 과제별 예산 조회·리포트 | 🛠 준비 중 |
| ki-minutes | 회의록 작성 | 🛠 준비 중 |

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
- **비목**: `bimok_reference` 1차 제안 → 사용자 확정, 애매하면 Dooray wiki 실시간 검색. (소모성 우선·외화 환산금지 등 규칙 내장)
- 인증: 통합정보(카드·과제)=KIST SSO 세션 / Dooray(업로드)=개인 토큰. 자세히: [`skills/ki-rpa/SKILL.md`](skills/ki-rpa/SKILL.md).

## 설치
[`INSTALL.md`](INSTALL.md) 참조. 요약: repo clone → `skills/<원하는 skill>/`를 `~/.claude/skills/`로 복사 → Chrome에 본인 Dooray 로그인 → Claude Code에서 사용.

## 접근
private repo. 링크/초대를 받은 KIST 구성원만 접근. 통합 관리 방침은 [`MIGRATION.md`](MIGRATION.md).

## 새 skill 만들기
같은 방식으로 다른 업무를 skill로 만들려면 [`SKILL_BUILDING_GUIDE.md`](SKILL_BUILDING_GUIDE.md) 참조 — 조직·개인에 비종속인 **범용 방법론**(정보 5분류 · 인증 전략 · 미지 API 다루기 · 범용화 체크리스트).
