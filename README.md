# kiki — KIST 행정 자동화 skill 패키지

KIST 구성원이 Claude Code로 **반복적인 행정 업무**를 자동화하는 skill 모음.
각 skill은 **본인 브라우저 로그인 세션**으로 동작하며, 개인 API 키·비번을 요구하지 않는다.

## 구성 skill
| skill | 용도 | 상태 |
|-------|------|------|
| **ki-mail** | Dooray 메일 관리 — 광고/스팸 분류·신고, 폴더 분류, 자연어 자동분류 규칙 | ✅ 사용 가능 |
| ki-pay | RPA 지급신청 | 🛠 준비 중(별도 세션) |
| ki-inspect | 물품 소액검수 신청 | 🛠 준비 중 |
| ki-budget | 과제별 예산 조회·리포트 | 🛠 준비 중 |
| ki-minutes | 회의록 작성 | 🛠 준비 중 |

## 설계 원칙
- **credential 0**: 메일/행정 코어는 KIST Dooray **세션 쿠키**로 동작 → 토큰·비번을 skill에 넣지 않는다.
- **개인화는 런타임 조회 + 로컬 config**: 폴더 ID 등 사람마다 다른 값은 실행 때 자동 조회. 개인 설정은 `~/.claude/kiki/`(repo 밖).
- **모든 쓰기는 confirm 후**: 되돌리기 어려운 작업은 제안만 자동, 실행은 사용자 확인.
- 자세한 규약: [`shared/security_policy.md`](shared/security_policy.md).

## 설치
[`INSTALL.md`](INSTALL.md) 참조. 요약: repo clone → `skills/<원하는 skill>/`를 `~/.claude/skills/`로 복사 → Chrome에 본인 Dooray 로그인 → Claude Code에서 사용.

## 접근
private repo. 링크/초대를 받은 KIST 구성원만 접근. 통합 관리 방침은 [`MIGRATION.md`](MIGRATION.md).
