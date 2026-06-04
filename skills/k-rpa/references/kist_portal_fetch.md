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
| 이름→사번 | `/popup/common/getRqstNoMgt/chkPopupValueSetting.do` (인사뷰 `VI_HRM_BAS_MGT`) | ⚠️ body 미확정 — 빌드 시 DevTools 캡처로 보강 TODO | 사번 |

## 검색조건 실증 (값만 바꿔 fetch)
법인(5) 11건 / 연구비(3) 4건 / 기간 1달 11·3달 42·5달 59 / 거래처 "네이버" 17·"ANTHROPIC" 4 / 가짜 카드번호 0건.

## 함정
- 응답 공백은 `&#32;` 로 인코딩됨 → decode (portal_ops `decodeEnt`).
- fetch 결과는 화면 grid 에 안 보임(정상 — 데이터만 받음).
- `authTk` 빈값이면 통합정보 화면 미로드 → 화면 1개 navigate 후 9초 대기.

## (구방식·fallback) 화면 좌표 조작 — fetch 불가 시만
- ⛔ NEXACRO 입력칸 `Ctrl+A` 금지(문자 'a' 입력됨). 빈칸 직접 입력 / `End`+`Backspace`.
- 사용일자는 **조회일 직전 1달이 기본** → 최근 건이면 손대지 말 것.
- 카드책임자 입력 → **Enter**(사번 매핑) → **우상단 조회 버튼까지** 눌러야 결과 나옴.
