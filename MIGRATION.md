# kiki 통합 관리 인수인계 (MIGRATION)

> 이 문서는 개별 skill이 다 빌드된 뒤 **kiki 패키지를 통합 관리하는 별도 세션**이 이어받기 위한 인수인계서다.

## 목적·대상
- KIST 구성원용 행정 자동화 skill 패키지. 동료가 본인 계정으로 설치해 사용.
- 배포: GitHub `angmond1/kiki` **private** repo + 초대(collaborator).

## repo 구조
```
kiki/
  README.md  INSTALL.md  MIGRATION.md(이 파일)  SKILL_BUILDING_GUIDE.md  .gitignore
  shared/   dooray_wapi.md · dooray_api_guide.md · security_policy.md   # 형제 공통 규약
  skills/   ki-mail/ (SKILL.md + references/{classification_policy,wapi_reference} + scripts/ki_mail_ops.js + config 예시)
            (+ ki-rpa/ ki-inspect/ ki-budget/ ki-minutes/ 예정)
```

## skill 빌드 상태
| skill | 상태 | 비고 |
|-------|------|------|
| ki-mail | ✅ 빌드 완료 | Tier1 스팸 / Tier2 폴더분류(선택) / Tier3 자연어 규칙 + 권장분류 23규칙(결재알림·과제·UST·기관뉴스·학회, NRF/KEIT/KIAT 분기) + 폴더 자동생성/삭제 |
| ki-rpa / ki-inspect / ki-budget / ki-minutes | ⏳ 다른 세션 진행 중 | 같은 구조·규약·`ki-` 네이밍으로 합류 예정 |

## 공통 규약 (형제 모두 준수 — `shared/security_policy.md`)
- C1 개인 credential·식별자·개인학습 skill 텍스트 금지
- C2 모든 쓰기 confirm 후 / C3 개인화=자동조회+대화
- C4 config·token은 `~/.claude/kiki/`(repo 밖)+gitignore / C5 한국어

## config 정책
- 위치: `~/.claude/kiki/<skill>.config.json` (repo 밖, 형제 공유 네임스페이스).
- 토큰·비번 저장 금지(세션 쿠키 인증이라 불필요).

## 통합 관리 세션이 이어받을 일
1. 형제 skill(ki-rpa/inspect/budget/minutes)을 같은 구조로 합류 + `shared/` 규약 일원화.
2. (✅ 완료 2026-06-04) ki-mail 폴더 자동생성/삭제 — `create-path` 배열 형식 확정.
3. 버전·릴리스 관리(태그/CHANGELOG), 설치 스크립트화.
4. 동료 collaborator 초대·온보딩, 파일럿 피드백 수렴.
5. 접근정책 운영(private 유지, 초대 관리). 정식 plugin marketplace 형식 검토(후순위).

## 빌드 이력
- 2026-06-04: ki-mail 초판(본 세션). 코어 `ki_mail_ops.js` = 기존 `spam_report_snippet.js` 패키지화 + `ensureFolder`/`createRule`/단건POST/기간조회.
- 2026-06-04: 폴더 자동생성/삭제 확정(`POST /mail-folders/create-path` 배열 `[{name,order}]` / `DELETE /mail-folders/{id}`) → `ki_mail_ops` v1.1. `ensureFolder` 자동생성 + `deleteFolder` 추가.
- 2026-06-04: 권장 분류 체계 추가 — KIST/출연연 공통 23규칙(결재알림·과제·UST·기관뉴스·학회, 기관 도메인 웹검증). 같은 도메인 두 용도 분기(nrf/keit/kiat: 정확주소=뉴스 먼저, 도메인=과제 나중) — Dooray `not_include` 미지원이라 `applyOrder`로 처리, `createRule`에 `applyOrder` 추가. 부트스트랩에 권장분류 순차질문 + 기존폴더 합치기 로직. API key는 설치 시 안 묻고 토큰 필요 작업 요청 시 on-demand 안내 + `shared/dooray_api_guide.md` 추가.
