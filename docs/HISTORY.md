# kiki 빌드 이력·유지보수 (maintainer)

> kiki 패키지를 **통합 관리하는 사람**을 위한 문서. 사용자는 [README](../README.md)/[INSTALL](../INSTALL.md) 만 보면 된다.
> 재사용 가능한 빌드 방법론·NEXACRO/dooray 패턴은 [DEVELOPMENT.md](DEVELOPMENT.md), skill 별 캡처 상세는 각 skill 의 `references/`.

## 배포
- KIST 구성원용 행정 자동화 skill 패키지. GitHub `angmond1/kk` **private** + collaborator 초대.

## repo 구조
```
kiki/
  README.md  INSTALL.md  CLAUDE.md(Claude 설치지침)  CODEX.md(Codex 가이드)  install.ps1  install.sh  VERSION  LICENSE  .gitignore  .gitattributes
  docs/      DEVELOPMENT.md (빌드 방법론·패턴)  HISTORY.md (이 파일)
  tools/     fresh-test.sh · sync-check.sh · evaluator_prompt.md   # 메인테이너 검증 도구 (fresh 설치 격리검증 / 설치본↔본진 diff·개인정보 스캔)
  skills/
    _shared/   security_policy · kist_portal · dooray_wapi · dooray_api_guide
               · project_codes · environment_setup · personal_config · nexacro_file_upload
               · kiki.config.example.json · token.txt.example · kiki.env.example(구형)   # 형제 공통 (install 시 항상 복사)
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
- **2026-09-24 (hwpx 생성기 수정)**: `make_dininglog_hwpx.py` 가 템플릿 단락의 `<hp:linesegarray>` 를 제거하고(남기면 한글이 자간을 눌러 한 줄에 우겨 넣음 → 긴 문장 줄바꿈 안 됨), `_fill_cell(para_pr=, char_pr=)` 로 문단·글자모양 지정 가능. AIX 성과공유회 신청서(hwp 양식) 채우기에 같은 생성기를 재사용하며 발견·수정.
- **2026-09-24 (테스트 종료)**: 배포 전 검증은 **1단계 격리 검증(80/100, HIGH 0)까지로 마무리**(사용자 결정). 2단계 Windows Sandbox 실환경·새 로컬 계정 테스트는 준비 자료만 남기고 보류(`_tmp/sandbox/`, gitignore). 3단계 파일럿은 배포 후 피드백으로 대체. 설치본(`~/.claude/skills`) = 배포본 동기화 확인.
- **2026-09-24 (v0.2.4)**: **kk-dining 회의록 기록 방식 개정**(사용자 결정) — 회의록 엑셀은 **한 폴더 `meeting_log\` + 월별 `{yymm}_회의록.xlsx`**(연월 하위폴더 폐지), hwpx 는 같은 폴더에 `{yymmdd}_{과제번호}_{과제이름 간략}_회의록.hwpx`(건당 1파일); **엑셀의 주목적 = 중복 방지 기록**(지급신청에 첨부하지 않음) → `meeting_log_xlsx.py` 를 월별 경로로 개정 + `all_titles()` 스캔 헬퍼. 회의록 작성 흐름: 부트스트랩에서 **근거자료(과제제안서·보고서) 를 `project_report\` 에 복사 요청** → 건마다 **사용자에게 회의 주제를 먼저 묻고** Claude 가 제안서 근거로 회의내용 작성(과거와 중복 금지). 시연 지적 반영: kk-pay 부트스트랩은 **RPA 업로드 사용 여부를 먼저** 묻고 토큰·행정원은 예일 때만, 참여과제 파악을 명시 / kk-inspect 개인정보 질문에 "config 에만 저장" 안내 / kk-dining 면제 판정에 9개 부처 목록 표시. CLAUDE Step 5 의 한글·Office 안내 문구 삭제.
- **2026-09-24**: **fresh-install 격리 검증**(`tools/fresh-test.sh` + 갱신한 `evaluator_prompt.md`, kiki 를 모르는 sub-agent가 배포본만으로 Step 0~6 수행) — overall 80/100, HIGH 막힘 0, 깨진 링크 0, install.ps1/sh 산출물 전부 정상. 지적 반영: **install.ps1 UTF-8 BOM**(Windows PowerShell 5.1 에서 한국어 메시지 깨짐 실측 → 수정) / CLAUDE.md: 권장모델 문구 정합, skill 별 런타임 표, 설치 후 PATH 재시작, winget 동의 플래그, macOS brew·Xcode CLT, 작업 루트 전환법, 무-CLI `.claude.json` 등록 구체화, 토큰 형식, 재시작 전 kk-* 요청 응답 규칙, docs/tools 성격 / INSTALL.md: 무-CLI 등록, 방법 B 데이터 폴더 / install.sh `.bak` 정리.
- **2026-09-23 (v0.2.3)**: **회의록 파일 = hwpx 로 통일, 아래아한글 불요**(사용자 결정: hwp 는 안 쓰는 추세) — `kk-dining/scripts/make_dininglog_hwpx.py`(표준 라이브러리, 모든 OS: 양식 `assets/minutes_template.hwpx` 의 값 셀 XML 치환, 줄바꿈=단락, XML 이스케이프, mimetype 무압축 유지; **한글 COM 으로 열기·재저장 라운드트립·PDF 내보내기까지 검증**) + 템플릿 중립값으로 교체. 구형 hwp COM 경로(`make_dininglog.py`·`popup_watcher.py`·`hwp_automation.md`)는 legacy 표기·미사용. HOP 은 **열람용으로만** 안내(작성엔 미사용, CLI/API 없음). 권장 모델 표에서 Haiku 언급 삭제.
- **2026-09-23 (v0.2.2)**: **설치·환경 안내 전면 정비**(사용자 피드백 반영) — ① git 불요(ZIP/동료 폴더), 설치 시 **kiki 폴더 위치 질문**(기본 `C:\kiki`/`~/kiki`; `kiki_root` 를 kiki.config 에 기록, 하위 `budget/ dining/ inspect/ _tmp/`) ② **Python 3·Node.js 는 패키지 설치 때 확인·설치**, Python 패키지는 skill 별 필요 시점에 ③ Claude in Chrome(웹스토어 링크·Desktop/CLI 연결법)·**chrome-devtools-mcp**(`claude mcp add --scope user …`, Desktop 도 같은 등록 공유; Node 필요)를 일반인용으로 풀어 씀 ④ **로그인 창 표**(평소 Chrome vs Claude 전용 새 창 — inspect·dining·세금계산서 직접작성만 새 창+재로그인, 카드 RPA·budget·mail 은 기존 창) ⑤ **`token.txt`**(`<kiki_root>/token.txt`, `Dooray token:` 다음 줄)로 토큰 입력 표준화 + 채팅 붙여넣기 경고 상시, 로더는 token.txt/kiki.env/`~/.codex` 모두 탐색(Codex 토큰 경로 불일치 수정) ⑥ 팝업 허용(`p.kist.re.kr`)은 트러블슈팅으로 이동 ⑦ 한글/Office 없으면 LibreOffice·**HOP**(Open HWP, github.com/golbin/hop — rhwp 기반 데스크톱 앱, Windows/macOS/Linux, CLI/API 없음) 설치를 **묻고**, kk-dining 은 hwp 저장 여부를 먼저 질문 ⑧ **권장 모델 표**(설치·첫 사용 Opus 5, 이후 mail/budget Sonnet 5, dining·세금계산서 Opus 유지) ⑨ **KIST 사내망/VPN 명시** ⑩ macOS/Linux: `convert.py`(LibreOffice fallback·OS별 휴지통·`--check`)·`rename_evidence.py` 크로스플랫폼, hwp 스크립트 Windows 가드, config 경로 `{kiki_root}` ⑪ 누락 기재: `requests` 패키지, kk-dining 첨부는 chrome-devtools(Claude in Chrome `file_upload` 는 채팅 첨부 파일만), `kiki.env.example` 옛 이름 `kk-rpa` 수정, `upload_file` cwd 제약 안내 ⑫ **kk-budget**(별도 세션 2026-09-18 확립분 통합): 집행내역 팝업을 **셀클릭 핸들러 직접 호출**로 여는 `scripts/exec_detail.js`(`window.kkExe` init/cats/open/parse/close — 바인딩 컬럼으로 그리드 식별·셀 인덱스 조회·`set_rowposition` 선행·금액컬럼 자동판별·합계행 제외·이름 경계검증, 🔴 닫기는 팝업 `btn_close` 만) + `budget_fetch_spec.md`·`_shared/kist_portal.md`·`DEVELOPMENT.md` 25·26 / **인건비(내부1·학생)는 개인 귀속 불가** 실측.
- **2026-09-18 (v0.2.1)**: **KIST wiki 반년(2026-03~09) 변경 조사·반영** — 공식 API 재크롤(373p) vs 4월 베이스라인 diff(신규 15·본문변경 50).
  - 「2. 지급신청 매뉴얼」 **2026-09-15 개정** 반영(스냅샷 교체 + 빠른참조): 회의비 **사전내부결재 폐지(26.8.1 사용분~)·과제 미참여자 참석 필수·타기관 참여연구원=내부참석자** 명문화 / **시험분석결과서 첨부 필수**(전 과제) / **장비이용료=외부기자재임차료** / **사례비 5만원 초과 시 주민번호·주소 + 소득세 20%**(종전 12.5만·8%).
  - 기획예산팀 **실행예산 변경 RPA**(경상운영비 계정, 양식 메일 → 13/17시 반영) / 구매·자산팀: 구매요구 소요 45일·1천만↑ 연구계획서, 용역계약 해넘김 시 기획예산팀 협조, 검수 담당·50만원 정보화기기 / 인사경영팀 **해외출장 FAQ 신설**(항공권 과제카드 → 카드 결제일 전 지급신청) / 국내전문가 1시간 상한 100만원 / 데이터정보팀 **HTTPS 적용 안내**(e.kist.re.kr 공식 URL, `p.kist.re.kr` 팝업 허용 — chrome-devtools 프로필 포함).
  - 변경 없음 확인: 「7. RPA 지급신청 안내」(2025-11)·세금계산서 처리·법인/연구비카드·계정대체·수입의뢰·자산의 등록(7-1).
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
