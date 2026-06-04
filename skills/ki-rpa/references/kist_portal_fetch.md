# KIST 통합정보(NEXACRO) fetch backend 명세

> `scripts/portal_ops.js` 의 근거. 화면·좌표 없이 backend 직접 호출 (2026-06-04 실증: 카드 11건·과제목록·전 검색조건 성공).

## 인증
- 통합정보 NEXACRO 화면(`p.kist.re.kr:8081/nxui/...`) **1개만 열려 있으면**(아무 화면이나, 세션+authTk 확보용) 동작.
- `window.application.authTk` = NEXACRO 세션 토큰(전역·쿠키 둘 다 존재, 세션 내 고정, 매 요청 자동).
- fetch: `credentials:'include'`, `Content-Type: text/xml; charset=UTF-8`. body = NEXACRO SSV XML (`Parameters`: authTk/pgmId/svcId + `Dataset id="ds_search"`).

## endpoint
| 기능 | POST | 요청 ds_search | 응답 핵심 |
|------|------|---------------|----------|
| 카드내역 | `/mis/fam/fam0711/getList.do` (pgmId `fam_0711`, svcId `getList`) | `FROM_DT`/`TO_DT`(YYYYMMDD) · `CARDTYPECD`(**5**=법인/**3**=연구비) · `CARDRESPEREMPNO`(사번) · `SEARCHID`(=사번) · `CUSTNM`(거래처 부분일치) · `CARDNO` · `CARDAPPRNO` | `CARDAPPRNO`(승인번호) · `CARDUSEYMD`(사용일) · `CUSTNM` · `USEAMT`(원화청구액) · `CARDNO` · `PRGRSSTATNM`(상태) |
| 과제목록 | `/mis/rdm/rdm2011/doSearchMain.do` (`rdm_2011`/`doSearchMain`) | `SRCHKND=anyThing` · `SRCHPROCESS=0`(수행중) | `ACCCD`(과제번호) · `PROJNM`(과제명) · `KORNM`(책임자) · `PROJTYPE`(주관/공동) |
| 이름→사번 | `/popup/common/getRqstNoMgt/chkPopupValueSetting.do` (svcId `empSchPopup`) | Parameters만(Dataset 없음): `keyTableNm=VI_HRM_BAS_MGT`·`keyColNm=HOLD_OFFI`·`keyColVal=1`·`UP_COMM_COL_NM=EMP_NM`·**`UP_COMM_CD={이름}`**·`USE_RESNO=N` | 응답 **Parameters** `EMP_NO`(사번)·`EMP_NM`·`DEPT_NM`·`result` |

## 검색조건 실증 (값만 바꿔 fetch)
법인(5) 11건 / 연구비(3) 4건 / 기간 1달 11·3달 42·5달 59 / 거래처 "네이버" 17·"ANTHROPIC" 4 / 가짜 카드번호 0건.

## 함정
- 응답 공백은 `&#32;` 로 인코딩됨 → decode (portal_ops `decodeEnt`).
- fetch 결과는 화면 grid 에 안 보임(정상 — 데이터만 받음).
- `authTk` 빈값이면 통합정보 화면 미로드 → 화면 1개 navigate 후 9초 대기.

## (fallback) 화면 좌표 조작 — fetch 가 안 될 때 (⭐ "어떻게든 성공" 2차 시도)
fetch 가 실패(`authTk` 없음 / 빈 결과 / HTTP 에러 / chkPopup 등 미해결)하면 **포기하지 말고** 화면 캡처+좌표로 시도한다. **해상도·모니터가 달라도 매번 `zoom`/`screenshot` 으로 요소 위치를 찾아** 클릭한다(고정 좌표 하드코딩 금지):
1. NEXACRO 화면 로드 9초 대기 → `screenshot` 으로 검색조건 영역 확인, `zoom` 으로 각 칸의 실제 좌표 산출.
2. **카드책임자 칸**(zoom 으로 위치 확인) 클릭 → 이름 입력 → **Enter**(사번 자동 매핑). ⛔ `Ctrl+A` 금지(문자 'a' 입력됨) — 기존값은 `End`+`Backspace` 로 제거.
3. (연구비카드면) 검색구분 라디오 클릭. **사용일자는 직전 1달이 기본** → 최근 건이면 손대지 말 것(날짜칸 잘못 입력 시 마스크가 꼬여 카드책임자 칸까지 오염됨).
4. **우상단 조회 버튼**(zoom 으로 위치 확인) 클릭 — ⚠️ Enter 만으론 결과 안 나옴, 조회 버튼까지 필수.
5. 결과 그리드 읽기: `get_page_text` / `read_page` 또는 `screenshot`+`zoom` 으로 사용일·거래처·금액·**승인번호** 추출(작은 글씨는 zoom 확대).
> **시도 순서 = fetch → 좌표.** 둘 다 실패하면 화면을 캡처해 사용자에게 보여주고 구체적 상황을 안내(절대 조용히 멈추지 말 것). 과제목록(`doSearchMain`)도 동일 — fetch 실패 시 과제별관리 화면을 좌표로 조회.
