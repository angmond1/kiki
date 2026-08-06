# kiki 빌드 이력·유지보수 (maintainer)

> kiki 패키지를 **통합 관리하는 사람**을 위한 문서. 사용자는 [README](../README.md)/[INSTALL](../INSTALL.md) 만 보면 된다.
> 재사용 가능한 빌드 방법론·NEXACRO/dooray 패턴은 [DEVELOPMENT.md](DEVELOPMENT.md), skill 별 캡처 상세는 각 skill 의 `references/`.

## 배포
- KIST 구성원용 행정 자동화 skill 패키지. GitHub `angmond1/kiki` **private** + collaborator 초대.

## repo 구조
```
kiki/
  README.md  INSTALL.md  install.ps1  LICENSE  .gitignore
  docs/      DEVELOPMENT.md (빌드 방법론·패턴)  HISTORY.md (이 파일)
  skills/
    _shared/   security_policy · kist_portal · dooray_wapi · dooray_api_guide
               · project_codes · environment_setup · personal_config
               · kiki.config.example.json · kiki.env.example        # 형제 공통 (install 시 항상 복사)
    kk-mail/ · kk-pay/ · kk-dining/ · kk-budget/ · kk-inspect/       # SKILL.md + references/ + scripts/ + <skill>.config.example.json
  assets/    로고
```

## skill 빌드 상태 (전부 사용 가능)
| skill | 핵심 | 인증 |
|-------|------|------|
| kk-mail | Tier1 스팸 / Tier2 폴더분류 / Tier3 자연어 규칙 + 권장분류 23규칙 + 폴더 자동생성·삭제 | Dooray 세션 쿠키 |
| kk-pay | 좌표0 fetch(카드·과제·이름→사번) + 비목 3단조회 + Dooray 폴더 업로드(RPA) | 통합정보 SSO + Dooray 토큰 |
| kk-dining | 카드 회의비 추출 + 사전결재 매칭 + 회의록 엑셀 master + fam_0704_02 자동작성·임시저장·결재상신 | 통합정보 SSO (좌표0 부모탭 JS) |
| kk-budget | 좌표0 fetch 예실대비표(`BUDGYEAR=9999`+`ACCCLSCD` LEV1) + 직접비 소계 + 개인지분 | 통합정보 SSO (조회 전용) |
| kk-inspect | 소액검수 `mcs_0003` NEXACRO form 직접제어 + 자산 보수판정 + 외화 `fam_0711` USEAMT | 통합정보 SSO |

## 공통 규약
`skills/_shared/security_policy.md` C1~C5 — 개인 credential·식별자·개인학습 repo 0건 / 모든 쓰기 confirm / 개인화는 자동조회+로컬 config / config·token 은 `~/.claude/kiki/`(repo 밖)+gitignore / 한국어.

## 공통화 정리 (2026-06-06)
- **rename**: 전 skill `ki-` → `kk-`, `ki-rpa` → `kk-pay`.
- **공통 추출**: 개인 식별정보·토큰을 `~/.claude/kiki/kiki.config.json` + `kiki.env`(형제 공유)로 단일화. skill 고유만 `kk-<skill>.config.json`. 공통 문서·규정·portal·화면코드·과제코드는 `skills/_shared/` 로(중복 제거, skill 은 `../_shared/` 참조).
- **환경 점검 통일**: 모든 skill 부트스트랩이 `_shared/environment_setup.md` 0단계(Chrome+MCP·로그인·토큰·python) 동일 수행.
- **문서 정리**: 사용자용 README/INSTALL + 개발자용 docs/(DEVELOPMENT·HISTORY) 분리. install.ps1 추가(`_shared` 자동 복사).
- **개인정보 제거**: 예시 데이터(이름·거래처·사번·과제번호·외부소속·연구주제)·개인 경로 전부 익명화/중립값.

## 남은 일
1. 버전 태그 / CHANGELOG (현재 `VERSION` 파일).
2. collaborator 초대·온보딩, 파일럿 피드백 수렴.
3. 실전 end-to-end 검증 — 특히 kk-inspect / 타 사용자 PC.
4. 미해결: `chkPopup`(이름→사번) 직접 fetch 빈 응답(세션 의존) → 사번 `kiki.config` 운용 / `fam_0100`·`fam_0711` 서버 미필터 → 클라 필터로 대응 중.
5. (후순위) 정식 plugin marketplace 형식 검토.

## 빌드 노하우
재사용 패턴(NEXACRO 부모탭 JS 완전자동·fetch backend 직접호출·form 직접제어·hwp 자동화·과제분류코드·데이터 master·임시저장↔결재상신 분리·killfocus 동기화 등)은 전부 **[DEVELOPMENT.md](DEVELOPMENT.md)** 에 통합. skill 별 화면·필드 캡처 상세는 각 skill 의 `references/`.

## 빌드 이력 (요약)
- **2026-08-07**: kk-dining — **2026-08-01 참여연구원 규정변경 반영**. 내부 참석자는 해당 계정 참여연구원만 가능(서버검증·거부 시 행 삭제), 미참여 KIST 인원은 외부/미참여자에 회사명 `한국과학기술연구원`. `ds_datagrid2.PROJJOINYN` 필수선택 신설(코드표 `ds_codeFAM006`: `N`=미참여/`Y`=참여). 내부 등록은 `ds_datagrid1_oncolumnchanged` 를 `nexacro.DSColChangeEventInfo(obj,id,row,col,colid,**newvalue,oldvalue**)` 순서로 호출해야 이름→사번 조회가 동작(인자 순서 뒤바꾸면 행이 조용히 삭제되는 함정). 첨부는 회의록 `저장` 만으로 서버 반영되지 않아 `gfn_upload` 호출 필수(`tmHeader` I→S 확인). 실사용 7건 처리로 실증.
- **2026-06-06**: 통합 관리 — 위 '공통화 정리' (rename / 공통 추출 / 환경 통일 / 문서 분리 / 개인정보 제거).
- **2026-06-05**: kk-dining v2 — fam_0704_02 직접 자동작성·결재상신(옛 hwp 양산·두레이 업로드 폐기). 회의록 엑셀 master. NEXACRO 부모탭 JS 완전자동(→ DEVELOPMENT §4).
- **2026-06-05**: kk-inspect — 소액검수 `mcs_0003` form 직접제어(7건 실증). 자산 보수판정(wiki 7-1)·외화 `fam_0711` USEAMT.
- **2026-06-04**: kk-pay — 좌표탈피 fetch 코어(카드·과제·사번) + dooray drive 업로드 + 비목 3단조회. 명명 정책(영어 식별자) 확정.
- **2026-06-04**: kk-dining 초판 — 카드 회의비 + 사전결재 `fam_0100` 매칭. 토큰 `kiki.env` 공유 정책 신설.
- **2026-06-04**: kk-mail — 스팸/폴더분류/자연어 규칙 + 권장 23규칙 + 폴더 자동생성·삭제(`create-path` 배열).
- **2026-06-02**: kk-budget 초판 — 순수 fetch 예실대비표(`BUDGYEAR=9999`+`ACCCLSCD` → LEV1 카테고리) + 직접비 소계 + 개인지분. 조회 전용.
