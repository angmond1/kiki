<p align="center">
  <img src="assets/kiki-logo.png" alt="KIKI" width="360">
</p>

# kiki — KIST 행정 자동화 skill 패키지

KIST 구성원이 Claude Code로 **반복적인 행정 업무**를 자동화하는 skill 모음.
각 skill은 **본인 브라우저 로그인 세션**으로 동작하며, 개인 API 키·비번을 요구하지 않는다.

## 구성 skill
| skill | 용도 | 상태 |
|-------|------|------|
| **ki-mail** | Dooray 메일 관리 — 광고/predatory **스팸 신고(기본)**, **권장 폴더분류**(결재알림·과제·UST·기관뉴스·학회), **"앞으로 X→Y 폴더" 자연어 자동분류 규칙** | ✅ 사용 가능 |
| ki-pay | RPA 지급신청 | 🛠 준비 중(별도 세션) |
| ki-inspect | 물품 소액검수 신청 | 🛠 준비 중 |
| ki-budget | 과제별 예산 조회·리포트 | 🛠 준비 중 |
| ki-minutes | 회의록 작성 | 🛠 준비 중 |

## 설계 원칙
- **credential 0**: 메일/행정 코어는 KIST Dooray **세션 쿠키**로 동작 → 토큰·비번을 skill에 넣지 않는다.
- **개인화는 런타임 조회 + 로컬 config**: 폴더 ID 등 사람마다 다른 값은 실행 때 자동 조회. 개인 설정은 `~/.claude/kiki/`(repo 밖).
- **모든 쓰기는 confirm 후**: 되돌리기 어려운 작업은 제안만 자동, 실행은 사용자 확인.
- 자세한 규약: [`shared/security_policy.md`](shared/security_policy.md).

## ki-mail 한눈에
- **Tier 1 스팸**(기본): 광고성/predatory 메일 식별 → 스팸 신고.
- **Tier 2 권장 폴더분류**(선택, 물어보고): KIST/출연연 **공통 발신처**를 폴더로 — 결재알림·과제·UST·기관뉴스·학회 (총 **23규칙**, 웹검증된 기관 도메인). 설치 시 항목별로 묻고, 기존 폴더와 겹치면 합칠지 확인.
- **Tier 3 자연어 규칙**: *"앞으로 nature.com 메일은 저널 폴더로"* → 폴더 확보(없으면 **자동 생성**) + 자동분류 규칙 등록.
- 같은 도메인 두 용도(예 NRF: `nrf.re.kr` 과제공고 vs `nzine@nrf.re.kr` 웹진)는 **우선순위(`applyOrder`)로 자동 분리**.
- 자세한 분류 체계: [`skills/ki-mail/references/classification_policy.md`](skills/ki-mail/references/classification_policy.md).

## 설치
[`INSTALL.md`](INSTALL.md) 참조. 요약: repo clone → `skills/<원하는 skill>/`를 `~/.claude/skills/`로 복사 → Chrome에 본인 Dooray 로그인 → Claude Code에서 사용.

## 접근
private repo. 링크/초대를 받은 KIST 구성원만 접근. 통합 관리 방침은 [`MIGRATION.md`](MIGRATION.md).
