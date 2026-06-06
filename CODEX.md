# kiki on Codex — Codex 사용자 가이드

> kiki 의 skill 본문은 **Claude (Claude Code / Claude in Chrome)** 기준으로 쓰여 있다. **Codex Desktop / Codex CLI** 에서도 쓸 수 있도록, 도구 이름·설치 경로만 바꾸면 절차(JS 코어·fetch·NEXACRO 제어)는 그대로 동작한다. 이 문서는 그 **어댑터 레이어** + Codex 실전 노트다.
> (2026-06-07 Codex 이식 실증 기준. skill 별 상세 절차·함정은 각 `skills/kk-*/` 와 `skills/_shared/` 본문을 따른다.)

## 1. 설치 구조 (Codex)
원본 kiki 의 `skills/` 를 Codex skill 디렉터리에 둔다.

| 구분 | Codex 설치 경로 | 비고 |
|---|---|---|
| skill 본체 | `~/.codex/skills/kk-budget`, `kk-pay`, `kk-dining`, `kk-inspect`, `kk-mail` | repo 의 `skills/kk-*` 그대로 |
| 공통 문서 | `~/.codex/skills/_shared` | repo 의 `skills/_shared` 그대로 |
| 개인 설정·토큰 | `~/.codex/kiki/` | **repo 밖** (아래 §3) |

- Codex Desktop 은 시작 시 skill 목록을 로드 → **새 skill 설치 후 Codex 재시작**으로 인식 확인.
- (Claude 는 `~/.claude/skills/` + `~/.claude/kiki/`. 경로만 다르고 내용 동일.)

## 2. 도구 이름 어댑터 (핵심)
skill 본문의 "Claude in Chrome" 도구를 Codex 의 Chrome DevTools 도구로 치환해 읽으면 된다.

| skill 본문(Claude) 의도 | Codex 도구 |
|---|---|
| 브라우저 탭 확인 | `mcp__chrome_devtools.list_pages` |
| 대상 탭 선택 | `mcp__chrome_devtools.select_page` |
| 새 탭 / 이동 | `new_page` / `navigate_page` |
| 페이지 JS 실행 (`javascript_tool`) | `mcp__chrome_devtools.evaluate_script` |
| 화면/DOM 확인 (`screenshot`/`read_page`/`find`) | `take_snapshot` (필요시 `take_screenshot`) |
| 클릭/입력/업로드 fallback | `click` / `fill` / `press_key` / `upload_file` |

- **JS 코어 주입 방식 동일**: 각 skill 의 `scripts/*.js` 를 읽어 대상 탭에 주입 → `window.kkPay.*` / `window.kkBudget.*` / `window.kkdining.*` / `window.kkMail.*` 네임스페이스 함수 호출.
- ⚠️ **페이지 새로고침 시 주입한 `window.*` 객체가 사라진다 → 재주입** 필요.

## 3. 인증·개인설정 분리 (repo 밖)
| 파일 | 내용 |
|---|---|
| `~/.codex/kiki/kiki.config.json` | 이름·사번·카드책임자·담당 행정원·참여과제 등 공통 |
| `~/.codex/kiki/kiki.env` | `DOORAY_TOKEN` |
| `~/.codex/kiki/kk-<skill>.config.json` | skill 별 고유 설정 |

- 이미 공통 config 에 있는 값은 재질문 안 함.
- **토큰·카드번호·사번·실제 폴더 ID 는 skill 본문에 저장 금지.**
- 통합정보(p.kist.re.kr)는 **SSO 세션 + `window.application.authTk`** 로 동작 → 별도 API 토큰 불요.
- Dooray 메일 = 브라우저 세션 쿠키 wapi (토큰 불요). Dooray Drive 업로드만 `DOORAY_TOKEN` 필요.

## 4. 통합정보 fetch 우선 원리 (공통)
- 통합정보 NEXACRO 화면 1개가 열려 있으면 `authTk` + 세션쿠키로 backend `.do` endpoint 직접 호출.
- 요청 = `POST`, `Content-Type: text/xml; charset=UTF-8`, NEXACRO Dataset XML body. 응답 `<Dataset><Rows><Row><Col id=…>` 파싱.
- `authTk`·쿠키·세션값은 **출력 금지**, 핵심 필드만 반환.
- 대표 endpoint: 카드내역 `/mis/fam/fam0711/getList.do` · 과제목록 `/mis/rdm/rdm2011/doSearchMain.do` · 예실대비표 `bdg_2030`(`getBdgInfo`/`getMainList`) · 직원검색 `/popup/common/getRqstNoMgt/chkPopupValueSetting.do`.
- fetch 불가 화면은 즉시 실패 말고 **화면 캡처/DOM fallback** — 단 **고정 좌표 금지**, 매번 화면 상태를 읽어 위치 확인.

## 5. NEXACRO 파일첨부 (Codex)
파일첨부 해결법은 **`skills/_shared/nexacro_file_upload.md`** (A/B/C 3 패턴) 와 동일. Codex 에서는 패턴 C 가 가장 안정적이었다:
- `<컴포넌트>.extUp._input_node` (숨겨진 HTML input) 을 DOM 에 노출 → Codex `upload_file` / Playwright `setInputFiles` 로 `#<노출한 id>` 에 파일 주입 → `gfn_upload(...)` 로 서버 저장.
- 회의비 회의록 팝업: `fileDiv1`(서명록)/`fileDiv2`(증빙)/`fileDiv3`(사전결재), `RQST_NO = CONFERENCENO + "-" + ds_param.CARDUSEMGRNO`, `FLE_TP="02"`(증빙).
- 저장 확인: `ds_files` 의 `tmHeader="S"` · `FLE_TP` · `FLE_PATH`(예 `/YYYY/MMDD/pop_fam_0703_02`) · `NEW_FLE_NM`.

### 5-1. 첨부/저장 후 화면 클릭 막힘 (tool 무관 — Claude 도 해당)
첨부·저장 후 **빈 NEXACRO modal layer 가 화면 전체를 덮어 클릭이 안 먹는** 경우가 있다.
- 진단: `document.elementFromPoint(500,300)` → 반환이 `..._form_modalPopDiv` / `...modalPopDivScrollableInnerContainerElement(_inner)` 류면 그 레이어가 가로채는 것.
- 해결: 해당 레이어들에 `pointer-events:none !important` CSS 주입 → 실제 입력칸/그리드가 다시 잡힘.
```js
let s = document.getElementById("kk-clickfix-style") || document.head.appendChild(Object.assign(document.createElement("style"),{id:"kk-clickfix-style"}));
s.textContent = `[id*="_form_modalPopDiv"], [id*="modalPopDivScrollableInnerContainerElement"] { pointer-events:none !important; }`;
```
(이 fix 는 `_shared/nexacro_file_upload.md` 에도 공통 기록.)

## 6. skill 별 Codex 실전 노트 (요약)
세부 절차·함정은 각 skill 본문이 1차. 아래는 Codex 이식 시 확인된 보강점.

- **kk-budget**: 예실대비표 `bdg_2030` 좌표 없이 fetch 조회 → JSON 스냅샷 → `scripts/make_report.py` 엑셀. **조회 전용**(저장/제출/결재 안 함). 로그인 세션만 있으면 토큰 불요.
- **kk-pay**: 카드 승인번호·과제·금액 fetch 조회 + 파일명 규칙 변환 + Dooray Drive 업로드(`DOORAY_TOKEN`). 세금계산서 직접작성 경로는 **첨부는 Codex 에서도 됨**, 단 **계좌 실명검증**은 통과법 확정 후 end-to-end 활성(공휴일·주말 미가동 추정).
- **kk-inspect**: `mcs_0003` 필드맵·팝업 제어. 검수신청구분은 보통 **비자산** 선택 후 조회. **첨부는 건별 행 선택 후 해당 세금계산서·거래명세서 1개씩** (여러 건 한꺼번에 4개 X — 행 바꿔가며 해당 증빙만). 숨은 input 패턴으로 첨부 가능.
- **kk-dining**: `카드조회 → 사전결재 매칭 → 회의록 엑셀 → fam_0704 직접작성`. NEXACRO 계정/비목 팝업은 `setColumn` 우회 아니라 **정식 `doDecision()` 콜백** 경로. 통장표기는 `set_value` 만으론 동기화 안 됨 → **`common_onkillfocus` 필수**. 실전 팁: 카드 결제시간 ≥ 회의 종료시간(예 결제 12:25 → 종료 12:10), 사전결재 인원/시간이 실제와 다르면 회의내용 하단에 사유, 코드 식당명 확인되면 `L#### → ○○식당` 기록, 같은 날 식당+카페는 한 건으로 묶어 합산 인원 판단.
- **kk-mail**: 세션 쿠키 + internal wapi (토큰 불요). 규칙/폴더 생성·메일 이동은 사용자 확인 후.

## 7. 안전 경계 (Claude·Codex 공통)
- 조회·로컬 파일 작성 = 자동 가능.
- **업로드·rename·이동·포털 저장·임시저장·신청·결재상신 = 사용자 확인 후.**
- 결재상신 = 실제 결재 제출 → 최종 확인 전 금지. 결재선 확정은 별도 gw 전자결재 창 → 사용자 직접.
- 스팸 신고·메일 이동·규칙 생성도 사용자 확인 후.
- 토큰·세션쿠키·`authTk`·카드번호는 출력 금지.

## 8. 실행 체크리스트
1. Codex skill 목록에 `kk-*` 보이는지 (없으면 Codex 재시작).
2. 통합정보·Dooray 로그인 세션 살아있는지.
3. `~/.codex/kiki/kiki.config.json`·`kiki.env` 만 확인하고 재질문 최소화.
4. 통합정보 조회는 **fetch 먼저**, 실패 시 화면 fallback (고정좌표 금지).
5. NEXACRO 파일첨부는 visible 버튼이 아니라 **`extUp._input_node`** (또는 별도 page 의 실제 버튼) 사용 — `_shared/nexacro_file_upload.md`.
6. 첨부 저장 후 `tmHeader`/`FLE_TP`/`FLE_PATH`/`NEW_FLE_NM` 로 서버 반영 확인.
7. 클릭 막히면 `elementFromPoint` 로 빈 modal layer 확인 → pointer-events 통과 CSS (§5-1).
8. 실제 제출/상신/업로드는 **사용자 확인 후**.
