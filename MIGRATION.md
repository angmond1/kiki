# kiki 통합 관리 인수인계 (MIGRATION)

> 이 문서는 개별 skill이 다 빌드된 뒤 **kiki 패키지를 통합 관리하는 별도 세션**이 이어받기 위한 인수인계서다.

## 목적·대상
- KIST 구성원용 행정 자동화 skill 패키지. 동료가 본인 계정으로 설치해 사용.
- 배포: GitHub `angmond1/kiki` **private** repo + 초대(collaborator).

## repo 구조
```
kiki/
  README.md  INSTALL.md  MIGRATION.md(이 파일)  SKILL_BUILDING_GUIDE.md  .gitignore
  shared/   security_policy.md · dooray_wapi.md · dooray_api_guide.md · kist_portal.md(통합정보 NEXACRO fetch 공통)   # 형제 공통 규약
  skills/   ki-mail/ (SKILL.md + references/{classification_policy,wapi_reference} + scripts/ki_mail_ops.js + config 예시)
            ki-rpa/ · ki-dining/ · ki-budget/ (SKILL.md + references/{budget_fetch_spec,budget_report_format} + scripts/{portal_ops.js,make_report.py} + config 예시)
            ki-inspect/ (SKILL.md + references/{mcs0003_fields,asset_classification,fam0711_fx,evidence_rules,screen_codes,code_tables} + scripts/{convert_evidence,rename_evidence}.py + config 예시) — 소액검수, NEXACRO **form 직접제어**(제출 화면)
```

## skill 빌드 상태
| skill | 상태 | 비고 |
|-------|------|------|
| ki-mail | ✅ 빌드 완료 | Tier1 스팸 / Tier2 폴더분류(선택) / Tier3 자연어 규칙 + 권장분류 23규칙(결재알림·과제·UST·기관뉴스·학회, NRF/KEIT/KIAT 분기) + 폴더 자동생성/삭제 |
| **ki-rpa** | ✅ 빌드 완료 | 좌표0 fetch(카드내역 getList / 과제 doSearchMain / 이름→사번 chkPopup) + 비목 통합 + Dooray 폴더 이름검색·구조파악·업로드·아카이브 + 파일변환(한글/Office COM). 인증: 통합정보=SSO세션+authTk / Dooray=토큰 |
| **ki-dining** | ✅ 빌드 완료 | 카드(법인+연구비) 회의비 추출 + 사전결재 `fam_0100` 매칭(`getListByBonbu` 본부조회→클라 필터) + 별지1호 **회의록 hwp 생성**(pyhwpx 셀치환·**WPF 보안팝업 Alt+N watcher**) + 두레이 업로드. 인증: 통합정보=SSO / 두레이=토큰(`kiki.env`) |
| **ki-budget** | ✅ 빌드 완료 | 좌표0 fetch(과제 `doSearchMain` / 예실대비표 `getBdgInfo`→`getMainList`, ★`BUDGYEAR=9999`+`ACCCLSCD`가 카테고리 LEV1 집계 트리거·화면 1:1 검증) + 카테고리 A/집행(CTRLPERFAMT)/계류완료(CTRLCAUSAMT)/계류진행(TEMPAMT)/잔액(BALNAMT) + 직접비 소계(BUDGITEMCLSNM=직접비) + 개인지분(적요 이름필터) + `make_report`(총액/잔액 + 한칸 띄움 + 직접비 잔액/총액). 인증: 통합정보=SSO세션. **조회·로컬저장 전용**(토큰 불요) |
| **ki-inspect** | ✅ 빌드 완료(2026-06-05) | 소액검수 `mcs_0003` — NEXACRO **form 직접제어**(제출 화면이라 fetch insert 대신 form 제어가 정석; 좌표 0) + 자산/비자산 **보수적 판정**(wiki 7-1) + 외화=`fam_0711` USEAMT + 증빙 전처리. config·문서 kiki 규약 합류. 검증 TODO: 실전 end-to-end. ↓'ki-inspect 노하우' |

## 공통 규약 (형제 모두 준수 — `shared/security_policy.md`)
- C1 개인 credential·식별자·개인학습 skill 텍스트 금지
- C2 모든 쓰기 confirm 후 / C3 개인화=자동조회+대화
- C4 config·token은 `~/.claude/kiki/`(repo 밖)+gitignore / C5 한국어

## config 정책
- 위치: `~/.claude/kiki/<skill>.config.json` (repo 밖, 형제 공유 네임스페이스).
- 토큰·비번 저장 금지(세션 쿠키 인증이라 불필요).

## 통합 관리 세션이 이어받을 일
1. 형제 skill(ki-rpa/inspect/budget/dining)을 같은 구조로 합류 + `shared/` 규약 일원화.
2. (✅ 완료 2026-06-04) ki-mail 폴더 자동생성/삭제 — `create-path` 배열 형식 확정.
3. 버전·릴리스 관리(태그/CHANGELOG), 설치 스크립트화.
4. 동료 collaborator 초대·온보딩, 파일럿 피드백 수렴.
5. 접근정책 운영(private 유지, 초대 관리). 정식 plugin marketplace 형식 검토(후순위).

## 형제 skill 빌드 시 바로 쓸 노하우 (ki-rpa 에서 확보 2026-06-04)
나머지 skill(ki-inspect 소액검수·ki-budget 예산·ki-dining 회의록)도 **통합정보 NEXACRO + dooray** 기반이라 아래를 그대로 재사용 — 같은 시행착오 반복 말 것.
- **통합정보 조회는 좌표 말고 fetch** (`shared/kist_portal.md`). 새 화면(mcs_0003·bdg_2030 등)도 **XHR 후킹으로 endpoint·body 1회 캡처 → fetch 재현**. `window.application.authTk`+세션쿠키, NEXACRO SSV XML, `parseRows` 정규식.
- **좌표 fallback 병행**("어떻게든 성공"): fetch 안 되면 `zoom` 으로 위치 찾아 클릭(고정좌표 X), ⛔`Ctrl+A` 금지(문자 'a'), 입력 후 Enter→조회버튼까지, 결과는 get_page_text/read_page.
- **dooray drive**: 업로드=공식 API+토큰(307 manual follow), 폴더 이름검색=트리 순회(root 수천 항목→상위 폴더 id 캐시로 가속), 동명 폴더 복수 주의 (`shared/dooray_wapi.md`).
- **공통 함정**: 응답 `&#32;` decode / fetch 결과 화면 grid 에 안 보임(정상) / 출력 `[BLOCKED]`(쿠키 섞임)→핵심필드만 / 화면 호출순서 의존 backend 는 직접 fetch 빈 응답 가능.
- **인증 분리**: 통합정보(조회)=KIST SSO 세션(토큰 불요) / dooray(업로드)=개인 토큰(`<skill>.env`). 조회는 토큰 없이, 쓰기만 토큰.
- 알려진 화면코드: `fam_0711`(카드영수증조회 — `ds_search`→`bt_view`→`ds_datagrid1.USEAMT` 확정원화·회사전체 반환→필터)·`rdm_2011`(과제)·`fam_0100`(회의비 사전결재)·`mcs_0003`(소액검수신청 — `ds_main_PRCT_INFO`/`_NOT_ASST_INFO`/`_ASST_INFO`, RLTDMGRNO 입력금지, calendaredit 휴일모달)·`bdg_2030`(예실대비표)·`rdc_2700`(심의). ⚠️ 저장·제출은 한때 'Edge 권장'(Chrome 저장 실패)이었으나 **Chrome MCP NEXACRO form 직접제어로 입력~저장 성공**(소액검수 7건, 부모탭 `window._popupWin` 포획) — 케이스별, form 제어 경로는 Chrome 됨.
- 비목·연구비 규정은 개정되므로 skill 에 통째로 박지 말고 요약+`dooray wiki` 실시간 검색(ki-rpa `expense_category.md` 패턴 참고).

### ki-dining 에서 추가 확보 (2026-06-04) — 문서생성·과제·미지API·도구 함정
- **한글(hwp) 문서 생성**(문서 만드는 skill 공유): `pyhwpx` COM 으로 **양식 hwp 템플릿 셀치환**(`get_into_nth_table`+`TableRightCell` 순회, 셀 비우기는 **`Erase`** — `Delete`/`Run('Delete')` 안 먹음), 한글 인스턴스 1개 재사용(매 건 새 `Hwp()` 면 COM 끊김 → `Run('FileClose')` 로 문서만 닫고 유지). ⭐ **보안팝업 = WPF 창**(class `HwndWrapper[hwp.exe`, 제목이 한컴 사제폰트(U+F53A)라 '혼글' 문자열 매칭 실패) → win32 버튼·UIAutomation 클릭 전부 불가 → **창 감지 후 `Alt+N`(모두 허용) `keybd_event`**, watcher 는 **별도 프로세스 필수**(같은 프로세스 스레드는 COM 블록 중 GIL 로 안 돎). 전제: 아래아한글+`pyhwpx`/`pywin32`/`pywinauto`, 첫 실행 빈 양식 1장 테스트(MS Word 불가).
- **과제분류코드**(budget 등 과제 다루는 skill 공유): 과제번호 = 연도2 + **분류코드1(영문)** + 일련4 (구형식 `2N00009` 도 — 숫자 뒤 첫 영문 = 코드, `/\d+([A-Z])/`). **`I`·`S`·`K` = 사전결재 면제**.
- **fam_0100 사전결재**: `getListByBonbu.do`(svcId `getList`) 는 검색조건(발의자 `KORNM`)을 넣어도 **본부 전체를 반환**(서버 미필터) → 응답에서 `acccd`+`date` 로 **클라 필터**. ⭐ 교훈: 새 화면은 *검색조건이 서버에 안 먹고 전체가 올 수 있다*. **발의자(본인) 검색**이 일반(계정책임자=PI 별도).
- **javascript_tool 함정**: REPL 이라 **top-level `await` 불가** → `(async()=>{ ... })()` async IIFE 로 감싼다. 카드 금액 `USEAMT` 는 `{hi,lo}` 객체(`.hi`). XHR 후킹은 브라우저 안에서(사용자 F12 불요).
- **토큰 = `kiki.env` 공유**(skill 별 `.env` 폐기, `ki-rpa.env`→`kiki.env` 통합 권장): 모든 ki-* 가 `~/.claude/kiki/kiki.env` 한 파일. 설치 시 없으면 **빈 템플릿 자동생성**(파일 못 만드는 사용자 우회). 입력 (A)본인 파일작성(노출0) / (B)채팅 기입→skill 자동저장(노출 1회 경고).

### ki-budget 에서 추가 확보 (2026-06-02) — NEXACRO 그리드 조회 디버깅 (ki-inspect 등 *조회* skill 직결)
- ⭐ **그리드 조회는 보조 파라미터가 집계 레벨을 바꾼다**: 예실대비표 `getMainList`(bdg_2030)는 `BUDGYEAR='9999'`(전체/누적 — 실제 연도 넣으면 **빈 응답**) + `BUDGSBJCD`(과제) + **`ACCCLSCD`(회계분류코드, `getBdgInfo` 에서 취득)** 3개라야 카테고리 소계(`LEV='1'`, 예산총액 A·잔액 D 포함)가 온다. ACCCLSCD 빠지면 세부항목(`LEV='2'`, 집행액만)만 와서 "A/D 없다"고 오인하기 쉽다. → **빈/부분 응답이면 추측 말고, XHR 후킹으로 캡처한 *화면 request body의 실제 파라미터 값* 을 그대로 재현**(전체조회 상수 `9999`·필수 보조키 `ACCCLSCD` 가 숨어 응답 범위를 좌우).
- ⭐ **"응답에 값이 없다"고 속단 금지 — raw 역검색**: 카테고리 예산총액이 fetch 응답에 없는 줄 알았으나, 캡처 raw 에서 예상 금액을 문자열 grep 하니 같은 `getMainList` LEV1 행 `LASTBUDGAMT` 에 있었다(파라미터 부족으로 LEV2 만 받았던 것). **화면이 표시하는 값은 거의 backend 응답에 있다**(client 계산으로 단정 X) → 원하는 값(예상 수치)을 raw 응답에서 검색해 endpoint·Dataset·컬럼·행 역추적.
- **같은 라벨이 여러 레벨 행에 중복 → 레벨 필터 필수**: `BUDGITEMNM`("33:연구활동비1")이 소계(LEV1)와 세부(LEV2)에 모두 붙어 `LEV==='1'` 안 거르면 첫 매칭(세부값) 오집계 + 호출마다 값이 흔들린다. 집계 그리드는 **레벨/소계 구분(LEV·항목코드 유무)부터 파악**.
- **팝업 backend 는 팝업 window 에 XHR 후킹**: 예실대비표는 별도 팝업 window 라 부모 탭 후킹으론 못 잡음 → `window.open` 후킹으로 팝업 포획 + 생성 즉시 그 window 의 `XMLHttpRequest.prototype` 후킹 → 팝업 모든 `.do`(endpoint+body+resp) 캡처. **F12 요청 전에 후킹으로 이미 잡힌 것부터 분석**(화면 1회 열면 전부 잡힘).
- **[BLOCKED] 회피 = 구조만 추출**: body/resp 에 `authTk`·`_ga`·`WMONID`·쿠키 섞이면 출력 차단 → 값 빼고 **Dataset id·컬럼명·LEV 분포** 같은 구조만(또는 특정 금액 1개만) 반환.
- **조회 전용 skill 은 토큰·dooray 불요**: 예산은 SSO 세션 fetch + 로컬 엑셀(`openpyxl`)만 → `kiki.env`·`dooray_drive.py` 불필요. 쓰기 없는 skill 이 가장 단순. (단 `ki-inspect` 소액검수는 *제출/저장*이 있어 ki-rpa 패턴 + 쓰기 confirm 필요.)
- **빌드는 plan → fetch 실증부터**: plan 승인 직후 첫 작업으로 오늘자 실데이터 end-to-end(fetch→엑셀+채팅표) 실증 → 가정(fetch 됨)을 즉시 검증, 안 되는 부분만 DOM fallback 확정. **출력 양식은 핵심 먼저 보여주고 사용자 피드백으로 다듬어 references 에 박제**(예: 카테고리 잔액만 + 직접비 우측열).
- 화면코드: `bdg_2030`(예실대비표) = `getBdgInfo`(과제 메타 + ACCCLSCD) → `getMainList`(카테고리). 컬럼 1:1 매핑·예산항목 코드 전체: `skills/ki-budget/references/budget_fetch_spec.md`.

### ki-inspect 에서 추가 확보 (2026-06-05) — 소액검수 *쓰기* skill·NEXACRO form 직접제어·자산판정·외화확정
ki-inspect(소액검수신청 `mcs_0003`)는 *조회*가 아니라 **제출(insert)** skill — ki-budget/dining 의 조회 fetch 와 다르다. ⭐ **제출 화면은 fetch insert 대신 NEXACRO form 직접제어가 정석**: form 객체 접근이라 좌표 0(kiki 철학 유지)인데다, 복잡한 insert body(PRCT+ASST/NOT_ASST 수십필드) 캡처 불요·사용자 화면검토 후 저장 안전·첨부는 어차피 수동이다(fetch insert 는 잘못된 데이터 직접 DB 입력 위험). `skills/ki-inspect/` 합류 완료(config·문서 kiki 규약). 아래 그대로 재사용.
- **검수창 입력 = NEXACRO form 직접제어**(fetch insert 대안): 팝업(`window.open` 별도창) 포획 → `window._popupWin.application.popupframes.mcs_0003_pop2.form` → `form.<comp>.set_value()` / `form.<ds>.setColumn(0,'COL',v)`. **좌표 무관**(form 객체). ⚠️ 저장(신청버튼)·**파일첨부는 사용자**(팝업 별도창이라 MCP 파일첨부 불가, CDP `setFileInputFiles` 거부; 결재성 저장은 본인 confirm). fetch insert(`insertPrctInfo`) 쓰려면 신청 시 XHR 후킹으로 endpoint+body 캡처 필요(미확보).
- **dataset 3종**(`radio2` 자산구분 N/Y): 공통 `ds_main_PRCT_INFO`(CCK_DTM 신청일시·LABT_CD·BD_CD·ROOM_NO·FNSH_PTT_USER 지급신청자·PRCT_USER 검수신청자=로그인 자동) / 비자산 `ds_main_NOT_ASST_INFO` / 자산 `ds_main_ASST_INFO`. ⚠️ 물품을 `ds_rqstGrid`(구가이드)에 넣으면 **화면 공란** — NOT_ASST/ASST 가 정답.
- ⛔ **승인번호 input06→`RLTDMGRNO` 입력 금지**: DB 10자, 24자 세금계산서 승인번호 넣으면 `ORA-12899`. KIST 자체관리라 비운다.
- ⛔ **신청일시 input9(calendaredit) 공휴일값 → 네이티브 모달 → 그 탭 CDP 전체 frozen**(evaluate·screenshot 45초 타임아웃, **사용자가 모달 닫아야 복구**). 영업일+공휴일 회피(예 2026-06-03 지방선거). — NEXACRO 네이티브 모달 일반 함정(`SKILL_BUILDING_GUIDE §4`).
- ⭐ **자산/비자산 판정 = 보수적**(wiki 「7-1 자산의 등록」 pageId `3565444440219897198`): 기계장치/공기구비품 **100만↑**·PC노트북 등 정보기기 **50만↑**·**컴퓨터SW 1천만↑** = 자산, 그 외(소모품·시약·전극·1천만 미만 SW) = 비자산. **소액검수 대부분 비자산 → 비자산 자동, 자산일 때만 사용자 확인.** 자산이면 **과제(지급계정 `FNSH_ACC`) 필수**, 비자산은 생략.
- **자산모드 필드/코드**: 도입방법 `IRTC_WAY`(01 국내/02 국외), 구매물품분류 `PUR_PROD_CL_CD`(0040 연구장비/0041 공기구비품/0062 그래픽처리장치 콤보), 자산표준분류 `ASST_STD_CL_CD`=검색팝업. 검색팝업 5종(생산업체·자산표준분류·사용자·사용책임자·지급계정) 구조는 자산 첫 실전 시 확정.
- ⭐ **외화 카드결제 원화 = 카드영수증조회(`fam_0711`) `USEAMT` 확정원화**(카드명세서 앱 잠정 환산액 금지 — 실제 9,368원 차이 사례): `ds_search`(FROM_DT/TO_DT/CARDTYPECD=5, 법인+연구비 둘 다/CARDRESPEREMPNM 카드책임자) → **`bt_view`**(⚠️ `button1`은 '저장'!) → `ds_datagrid1.USEAMT`(`{hi}`). 카드책임자 필터 없으면 **회사 전체 수천건** → 사용일+거래처+카드책임자 필터. (ki-dining `fam_0100` 과 같은 '검색조건 서버 무시→클라 필터' 패턴)
- **증빙 전처리**(ki-rpa convert 패턴): png/jpeg/bmp/tiff → **jpg**(pdf 유지), 무작위 숫자 파일명 → `{YYMMDD} {원화금액} {거래처 내용} 카드영수증.jpg` 개명 + **원본 휴지통**(`Microsoft.VisualBasic.FileIO.FileSystem.DeleteFile(..,SendToRecycleBin)` 복구가능).
- **화면 한글이름(코드) 표기**: 소액검수신청(mcs_0003)·카드영수증조회(fam_0711). 내부코드 단독 X.
- **wiki 규정 분류검색 가속**(선택): dooray wiki crawl본에 OpenAI `text-embedding-3-small` + FTS **RRF 하이브리드** 구축 시 의미질의("100만원 비물품 검수")가 키워드 FTS보다 정확(자산분류 페이지 즉시 발굴). `build_embed.py`/`search_hybrid.py` 패턴.

## 빌드 이력
- 2026-06-05: **ki-inspect prototype**(별도세션 `C:\claude-kist1`). Chrome MCP NEXACRO **form 직접제어**로 소액검수 7건 실증(네오/에프씨/대일 물품 + Anthropic 외화SW). 신규: `mcs_0003` dataset 3종·자산모드 필드/코드(`IRTC_WAY`/`PUR_PROD_CL_CD`)·자산판정(wiki 7-1, 보수적)·`RLTDMGRNO` 10자 함정·calendaredit 휴일모달 frozen·외화 `fam_0711` `USEAMT` 확정원화(카드명세서 잠정액 9368원 차)·증빙 전처리·wiki 하이브리드 임베딩 검색. fetch insert 미시도(form 제어 우회). → 위 'ki-inspect 노하우'. kiki 합류는 다른 세션.
- 2026-06-04: ki-mail 초판(본 세션). 코어 `ki_mail_ops.js` = 기존 `spam_report_snippet.js` 패키지화 + `ensureFolder`/`createRule`/단건POST/기간조회.
- 2026-06-04: 폴더 자동생성/삭제 확정(`POST /mail-folders/create-path` 배열 `[{name,order}]` / `DELETE /mail-folders/{id}`) → `ki_mail_ops` v1.1. `ensureFolder` 자동생성 + `deleteFolder` 추가.
- 2026-06-04: 권장 분류 체계 추가 — KIST/출연연 공통 23규칙(결재알림·과제·UST·기관뉴스·학회, 기관 도메인 웹검증). 같은 도메인 두 용도 분기(nrf/keit/kiat: 정확주소=뉴스 먼저, 도메인=과제 나중) — Dooray `not_include` 미지원이라 `applyOrder`로 처리, `createRule`에 `applyOrder` 추가. 부트스트랩에 권장분류 순차질문 + 기존폴더 합치기 로직. API key는 설치 시 안 묻고 토큰 필요 작업 요청 시 on-demand 안내 + `shared/dooray_api_guide.md` 추가.
- 2026-06-04: **ki-rpa 초판**(별도 세션). 좌표탈피 fetch 코어 `portal_ops.js`(통합정보 NEXACRO backend 직접호출 — 카드내역 `getList.do`·과제 `doSearchMain.do`·이름→사번 `chkPopupValueSetting.do`, `window.application.authTk`+세션쿠키, 화면·좌표·해상도 무관 실증) + `dooray_drive.py`(폴더 이름검색·구조파악·307 업로드·처리완료 아카이브, 본부약어 매핑, self-healing) + `convert.py`(이미지→jpg/문서→pdf, 한글·Office COM, fallback) + `expense_category.md`(원본 4종 항목별 통합) + references(fetch명세·폴더조회·wiki). 인증: 통합정보=KIST SSO 세션+authTk(토큰 불요) / Dooray 업로드=개인 토큰(`ki-rpa.env`). 부트스트랩 6단계. 보안 grep 0건. **미해결**: `chkPopup` 직접 fetch 재현(화면 NEXACRO 로는 동작, 동일 body fetch 는 빈 응답 — 세션 의존 추정) → 사번 `cardHolderEmpno` config 운용. 검증 TODO: 실전 end-to-end.
- 2026-06-04: **ki-dining 초판**. 회의비 end-to-end(카드 법인+연구비 추출 → 사전결재 `fam_0100` 매칭 → 별지1호 회의록 hwp 생성 → 두레이 업로드). 코어: `portal_ops.js`(queryCardsBoth 법인+연구비 / queryProjects+분류코드 추출 / **queryPreApprovals `fam_0100` `getListByBonbu` 신규캡처** — 본부 전체 반환→클라 acccd+date 필터) + `make_minutes.py`(pyhwpx 셀치환, 한글 인스턴스 재사용, **Erase** 셀비우기) + `popup_watcher.py`(**WPF 보안팝업=Alt+N**, 별도 프로세스 필수 — 같은 프로세스 스레드는 COM 블록 중 GIL 로 안 돎) + `dooray_drive.py`(ki-rpa 재사용). 규칙: 분류코드 I·S·K 사전결재 면제, **발의자** 검색, 카페 영수증 음료수=인원, 회의록 제목·내용 **중복금지**(yymmdd 폴더 스캔). **토큰 `kiki.env` 공유 정책 신설**(설치 시 없으면 빈 템플릿 자동생성 → 컴맹 우회, **ki-rpa.env→kiki.env 통합 필요**). 출력 `C:\kiki\dining\<yymmdd>`(연2자리)·보고서 `project_report`. 보안 grep 0건. 미해결: `fam_0100` 발의자 서버필터 미적용 / `chkPopup` 사번매핑 직접fetch(ki-rpa 동일). 검증 TODO: 실전 end-to-end.
- 2026-06-04: **ki-rpa 비목 파일명 영어화 + 전체표 신설**. `bimok_reference`→`expense_category`, `bimok_table`→`expense_category_table`. `expense_category_table` 신설(붙임2 완전판 — 비목 41·집행한도·세부 집행가능 매트릭스), 비목 **3단 조회**(`expense_category`→`expense_category_table`→wiki). ⭐ **명명 정책 확정: 식별자·파일명·폴더명에 한글발음 로마자(`bimok` 등) 금지 → 항상 의미 있는 영어로 치환.**
- 2026-06-04: **ki-dinning → `ki-dining` rename** (비단어 'dinning' = dining/meeting 오기 교정, 위 명명 정책 적용). 폴더명·config·스크립트 4·문서 3·출력경로(`C:\kiki\dining\`) 등 31곳 일괄 치환, `dinning` 0건. **설치 경로 변경**: 기존 사용자는 `~/.claude/skills/ki-dinning` → `ki-dining` 재복사 필요.
- 2026-06-05: **ki-rpa `payment_request_manual.md` 추가** — 재무팀 행정위키 '2. 지급신청 매뉴얼'(Dooray Wiki `3538560283559420253/3579917185254662936`) 본문 스냅샷(35K, 표 29) + ki-rpa 빠른참조 헤더(검수·증빙·회의비·집행한도·비목코드·계정코드) + 첨부양식 10 file_id + 원문 링크. Wiki 조회 = `GET /wiki/v1/wikis/{id}/pages/{id}`(api.gov-dooray.com, 개인토큰 `dooray-api`). SKILL 비목 단계에 '증빙·검수·반려 점검' 연결. **규정 개정 대비 — 본문은 스냅샷, 권위는 원문 링크**(주기적 재조회 권장).
- 2026-06-04: ki-dining 회의록 생성기 `make_minutes.py` → **`make_dininglog.py`** rename(skill 특정성·영어 명명). 참조 4파일(SKILL·hwp_automation·popup_watcher·자기 docstring) 일괄 치환, `make_minutes` 0건. + 위 '형제 빌드 노하우'에 **hwp 문서생성(WPF 팝업 Alt+N watcher)·과제분류코드·fam_0100 본부전체 반환·javascript_tool await·kiki.env 공유** 교훈 추가 → 다른 세션(ki-inspect/budget) 이 바로 참고.
- 2026-06-02: **ki-budget 초판**. 순수 fetch 예실대비표 — `queryProjects`(rdm_2011) + `queryBudgetTable`(getBdgInfo→getMainList). ⭐ **핵심 발견**: getMainList 에 `BUDGYEAR='9999'` + `BUDGSBJCD` + **`ACCCLSCD`**(getBdgInfo 에서 취득) 3개면 카테고리 **LEV='1'** 행에 A(LASTBUDGAMT)/집행(CTRLPERFAMT)/계류완료(CTRLCAUSAMT)/계류진행(TEMPAMT)/잔액(BALNAMT) 완전체. **ACCCLSCD 없으면 LEV2 세부항목만 와서 카테고리 A/D 누락**(처음 빈응답으로 오인). "33:연구활동비1"이 LEV1 소계와 LEV2 세부에 BUDGITEMNM 중복 → `LEV==='1'` 필터 필수(안 하면 세부값 오집계). 화면 예실대비표 스크린샷과 1:1 대조 검증(`references/budget_fetch_spec.md` 컬럼 완전 매핑). 직접비 소계 = `BUDGITEMCLSNM=='직접비'` LEV1 합(=화면 소계[직접비]). `make_report.py`(카테고리 총액/잔액 + 한칸 띄움 + 직접비 잔액/총액), 채팅표(카테고리 잔액+직접비 잔액/총액). config: `user_name`(과책판별 pi==본인)·`projects`·`track_categories`·`personal_share`(적요 이름필터+`merge_act2_into_act1`)·`output_dir`(`C:\kiki\budget`, `yymmdd.xlsx`). 인증 SSO세션, **조회·로컬저장 전용**(Dooray 업로드·토큰 없음). 보안 grep 0건. **미해결**: 개인집계 집행내역 fetch 미검증(화면 집행액 셀 클릭 팝업 경로 — `getBdgItemExp` 항목선택 세션의존) / 과책 아닌 과제 인건비 상세 권한. 검증 TODO: 실전 부트스트랩 end-to-end, 타 사용자 PC.
