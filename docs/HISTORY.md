# kiki 빌드 이력·유지보수 (maintainer)

> kiki 패키지를 **통합 관리하는 사람**을 위한 문서. 사용자는 [README](../README.md)/[INSTALL](../INSTALL.md) 만 보면 된다.
> 재사용 가능한 빌드 방법론·NEXACRO/dooray 패턴은 [DEVELOPMENT.md](DEVELOPMENT.md), skill 별 캡처 상세는 각 skill 의 `references/`.

## 배포
- KIST 구성원용 행정 자동화 skill 패키지. GitHub `angmond1/kiki` **private** + collaborator 초대.

## repo 구조
```
kiki/
  README.md  INSTALL.md  CLAUDE.md(Claude 설치지침)  CODEX.md(Codex 가이드)  install.ps1  install.sh  VERSION  LICENSE  .gitignore  .gitattributes
  docs/      DEVELOPMENT.md (빌드 방법론·패턴)  HISTORY.md (이 파일)
  tools/     fresh-test.sh · sync-check.sh · evaluator_prompt.md   # 메인테이너 검증 도구 (fresh 설치 격리검증 / 설치본↔본진 diff·개인정보 스캔)
  skills/
    _shared/   security_policy · kist_portal · dooray_wapi · dooray_api_guide
               · project_codes · environment_setup · personal_config · nexacro_file_upload
               · kiki.config.example.json · kiki.env.example        # 형제 공통 (install 시 항상 복사)
    kk-mail/ · kk-pay/ · kk-dining/ · kk-budget/ · kk-inspect/       # SKILL.md + references/ + scripts/ + <skill>.config.example.json
  assets/    로고
```

## skill 빌드 상태 (전부 사용 가능)
| skill | 핵심 | 인증 |
|-------|------|------|
| kk-mail | Tier1 스팸 / Tier2 폴더분류 / Tier3 자연어 규칙 + 권장분류 23규칙 + 폴더 자동생성·삭제 + confirm 전 본문 표 + async `{}` 우회 | Dooray 세션 쿠키 |
| kk-pay | 좌표0 fetch(카드·과제·이름→사번) + 비목 3단조회 + Dooray 폴더 업로드(RPA) + **세금계산서 직접작성 fam_0702 end-to-end**(계정·검수·계좌 실명검증·첨부·상신, 2026-07-08) | 통합정보 SSO + Dooray 토큰 (첨부는 chrome-devtools-mcp) |
| kk-dining | 카드 회의비 추출 + 사전결재 매칭 + 회의록 엑셀 master + **fam_0704_02(법인)·fam_0703_02(연구비카드)** 자동작성·임시저장·결재상신 + 2026-08-01 규정(사전결재 폐지 대상·PROJJOINYN) 반영 | 통합정보 SSO (좌표0 부모탭 JS) |
| kk-budget | 좌표0 fetch 예실대비표(`BUDGYEAR=9999`+`ACCCLSCD` LEV1) + 직접비 소계 + 개인지분(적요+신청인 합산) | 통합정보 SSO (조회 전용) |
| kk-inspect | 소액검수 `mcs_0003` NEXACRO form 직접제어 + 자산 보수판정 + 외화 `fam_0711` USEAMT + **첨부 자동**(chrome-devtools-mcp 단일채널) | 통합정보 SSO (첨부는 chrome-devtools-mcp) |

## 공통 규약
`skills/_shared/security_policy.md` C1~C5 — 개인 credential·식별자·개인학습 repo 0건 / 모든 쓰기 confirm / 개인화는 자동조회+로컬 config / config·token 은 `~/.claude/kiki/`(repo 밖)+gitignore / 한국어.

## 공통화 정리 (2026-06-06)
- **rename**: 전 skill `ki-` → `kk-`, `ki-rpa` → `kk-pay`.
- **공통 추출**: 개인 식별정보·토큰을 `~/.claude/kiki/kiki.config.json` + `kiki.env`(형제 공유)로 단일화. skill 고유만 `kk-<skill>.config.json`. 공통 문서·규정·portal·화면코드·과제코드는 `skills/_shared/` 로(중복 제거, skill 은 `../_shared/` 참조).
- **환경 점검 통일**: 모든 skill 부트스트랩이 `_shared/environment_setup.md` 0단계(Chrome+MCP·로그인·토큰·python) 동일 수행.
- **문서 정리**: 사용자용 README/INSTALL + 개발자용 docs/(DEVELOPMENT·HISTORY) 분리. install.ps1 추가(`_shared` 자동 복사).
- **개인정보 제거**: 예시 데이터(이름·거래처·사번·과제번호·외부소속·연구주제)·개인 경로 전부 익명화/중립값.

## 남은 일
1. 버전 git tag / CHANGELOG 정식화 (현재 `VERSION` 파일 + 이 이력).
2. collaborator 초대·온보딩, 파일럿 피드백 수렴 — 타 사용자 PC zeroshot 은 `tools/fresh-test.sh` 로 사전 검증.
3. 미실증: kk-dining fam_0704_02 본화면 첨부 패턴(A/C 판별) / kk-inspect **자산** 건 검색팝업 5종(생산업체·자산표준분류·사용자·사용책임자·지급계정) / kk-budget 집행내역 fetch endpoint(현재 DOM 팝업 경로).
4. 미해결: `chkPopup`(이름→사번) 직접 fetch 빈 응답(세션 의존) → 사번 `kiki.config` 운용 / `fam_0100`·`fam_0711` 서버 미필터 → 클라 필터로 대응 중.
5. (후순위) 정식 plugin marketplace 형식 검토.

## 빌드 노하우
재사용 패턴(NEXACRO 부모탭 JS 완전자동·fetch backend 직접호출·form 직접제어·hwp 자동화·과제분류코드·데이터 master·임시저장↔결재상신 분리·killfocus 동기화 등)은 전부 **[DEVELOPMENT.md](DEVELOPMENT.md)** 에 통합. skill 별 화면·필드 캡처 상세는 각 skill 의 `references/`.

## 빌드 이력 (요약)
- **2026-09-17 (v0.2.0 배포)**: 6~9월 누적 반영.
  - **포탈 주소 변경(2026-07)**: 로그인/포탈 = `e.kist.re.kr`, NEXACRO 업무화면은 `p.kist.re.kr:8081` 유지. **업무화면 딥링크 전 `e.kist.re.kr` 로그인 확인**을 표준 절차로(세션 만료 시 `Your session has expired` + 무한 로딩 → e.kist.re.kr 경유로 복구). CLAUDE/CODEX/INSTALL/README/environment_setup/각 SKILL 반영.
  - **NEXACRO 파일첨부 자동화** `_shared/nexacro_file_upload.md`: A(popupframe 임시버튼)·B(별도 page 실제버튼)·C(`extUp._input_node` 직접) 3패턴 + **chrome-devtools-mcp 단일채널**(§4-6, workspace root 제약·개수 검증·alert 후 uid 재생성). 첨부 있는 작업은 처음부터 chrome-devtools 로.
  - **kk-pay 세금계산서 직접작성 end-to-end**(2026-07-08): 계좌 실명검증 통과법(`btn_accCstm00` 을 `import2` divForm 컨텍스트로, `TRANSFERSTAT_DESC='정상처리'`), fam_0702 별도 page dialog 처리, 정오 세션 리셋 대응, 참고사항 지연사유(발급+1개월), `bt_reset` 유실 금지, 적요=구매자 본인, 검수 기준 VAT 포함 합계, 배치 통합 패턴(4건 ~15턴), 업로드 결과 dooray 웹 확인·신청완료 보존.
  - **kk-dining**: fam_0703_02 연구비카드 절차서(DESP_LIST 오염 검증·goRow 행전환) + 회의록 엑셀 백필 + 2026-08-01 식비안내 개정 + 해외 회의비.
  - **kk-budget**: 개인집계 **적요+신청인 합산**(활동비2 누락 방지) + DOM 팝업 연쇄 안정화(async `{}`·throttle·재오픈 빈 grid).
  - **kk-inspect**: 검수일=내일(다음 영업일), 첨부 개수 검증, 특수문자 파일명 거부·input 재생성, 물품사진 파일명 규칙.
  - **kk-mail**: 걸러낸 메일 confirm 전 본문 표, async `{}` 2-스텝 우회.
  - **설치·문서**: `CLAUDE.md`(Claude 설치 지침)·`CODEX.md`·`install.sh`(OS 분기)·`.gitattributes`·`tools/`(fresh-test·sync-check). 배포 전 개인정보 재스캔·익명화(과제번호·실명·거래처·문서번호·개인경로 0건). MCP **도구 이름 표기 규칙**(문서는 짧은 도구명, 서버 접두어는 버전·설치방식별 상이) 을 environment_setup 에 명시.
- **2026-08-07**: kk-dining — **2026-08-01 참여연구원 규정변경 반영**. 내부 참석자는 해당 계정 참여연구원만 가능(서버검증·거부 시 행 삭제), 미참여 KIST 인원은 외부/미참여자에 회사명 `한국과학기술연구원`. `ds_datagrid2.PROJJOINYN` 필수선택 신설(코드표 `ds_codeFAM006`: `N`=미참여/`Y`=참여). 내부 등록은 `ds_datagrid1_oncolumnchanged` 를 `nexacro.DSColChangeEventInfo(obj,id,row,col,colid,**newvalue,oldvalue**)` 순서로 호출해야 이름→사번 조회가 동작(인자 순서 뒤바꾸면 행이 조용히 삭제되는 함정). 첨부는 회의록 `저장` 만으로 서버 반영되지 않아 `gfn_upload` 호출 필수(`tmHeader` I→S 확인). 실사용 7건 처리로 실증.
- **2026-06-06**: 통합 관리 — 위 '공통화 정리' (rename / 공통 추출 / 환경 통일 / 문서 분리 / 개인정보 제거).
- **2026-06-05**: kk-dining v2 — fam_0704_02 직접 자동작성·결재상신(옛 hwp 양산·두레이 업로드 폐기). 회의록 엑셀 master. NEXACRO 부모탭 JS 완전자동(→ DEVELOPMENT §4).
- **2026-06-05**: kk-inspect — 소액검수 `mcs_0003` form 직접제어(7건 실증). 자산 보수판정(wiki 7-1)·외화 `fam_0711` USEAMT.
- **2026-06-04**: kk-pay — 좌표탈피 fetch 코어(카드·과제·사번) + dooray drive 업로드 + 비목 3단조회. 명명 정책(영어 식별자) 확정.
- **2026-06-04**: kk-dining 초판 — 카드 회의비 + 사전결재 `fam_0100` 매칭. 토큰 `kiki.env` 공유 정책 신설.
- **2026-06-04**: kk-mail — 스팸/폴더분류/자연어 규칙 + 권장 23규칙 + 폴더 자동생성·삭제(`create-path` 배열).
- **2026-06-02**: kk-budget 초판 — 순수 fetch 예실대비표(`BUDGYEAR=9999`+`ACCCLSCD` → LEV1 카테고리) + 직접비 소계 + 개인지분. 조회 전용.
