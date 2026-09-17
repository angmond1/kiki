# kiki 설치 환경 점검 (형제 skill 공유)

> **모든 kk-* skill 은 첫 실행(부트스트랩) 때 아래를 동일하게 확인/안내한 뒤 진행한다.**
> 무자격 환경(미연결·미로그인)이면 **크래시 대신 친절한 안내로 멈춘다**.

## 0단계 — 환경 점검 (모든 skill 공통, 부트스트랩 맨 앞)

1. **Chrome + "Claude in Chrome"(MCP) 확장 — 설치·연결 확인** *(전 skill 공통, 예외 없음)*
   - `list_connected_browsers` 로 연결 확인. 안 되면:
     *"이 skill 은 Chrome 의 'Claude in Chrome'(MCP) 확장으로 동작합니다. 확장을 설치·연결해 주세요(확장 미설치 시 안내)."* 후 중단.
   - 연결됐으면 `select_browser` / `tabs_context_mcp` 로 작업 탭 확보.
   - **⭐ 첨부 파일이 있는 작업은 *처음부터* `chrome-devtools-mcp` 로 시작하라 (2026-07-07 실측 교훈, 최우선)**: Claude in Chrome 으로 신청서 작성·저장까지 해놓고 **첨부 단계에서 chrome-devtools 로 갈아타면 로그인·작성을 처음부터 다시** 하게 된다(Claude in Chrome `file_upload` 는 **세션공유 파일만** 허용 → 로컬 증빙 첨부 불가). **세금계산서 지급신청(kk-pay)·소액검수(kk-inspect)처럼 첨부가 예정된 작업은 chrome-devtools 를 기본 브라우저로** 시작하고, 그 창에서 `e.kist.re.kr` 1회 로그인 후 전 과정(작성→저장→첨부→계좌검증→상신)을 거기서 진행. (첨부 없는 단순 조회만 Claude in Chrome 무방.)
   - **★ chrome-devtools-mcp 개요** *(kk-inspect 필수 / kk-pay 첨부 시 필수)*: Claude Code 에 **`chrome-devtools-mcp` MCP 서버 등록** 필요. NEXACRO `window.open` **별도 window 팝업**(mcs_0003)·**iframe 팝업**(fam_0702)은 Claude in Chrome 으론 첨부 불가 → chrome-devtools-mcp 가 **자체 Chrome(CDP)** 으로 "파일추가"/`_input_node` 에 직접 `upload_file`. **MCP 서버 1개**(+ 시스템 Chrome; 격리 프로필이라 **`e.kist.re.kr` SSO 1회 로그인** 필요, 이후 유지). 미등록이면 입력까지만 자동·**첨부는 사용자 수동**. 절차·workspace root 제약·iframe adoptNode → [`nexacro_file_upload.md`](nexacro_file_upload.md) §4-6 + kk-pay `references/tax_invoice_payment.md` §9-1-A.

2. **대상 시스템 로그인 세션 확인** *(skill 별 대상이 다름 — 아래 표)*
   - 로그인 페이지가 뜨면(세션 만료) *"{시스템}에 로그인해 주세요"* 안내 후 중단. **Claude 가 대신 로그인하지 않는다.**
   - **⚠️ 포탈 주소 변경 (2026-07-07)**: KIST 포탈/로그인 관문이 **`e.kist.re.kr`** 로 변경됐다(구 `p.kist.re.kr`·`ekist.re.kr`). 단 **통합정보시스템 NEXACRO 업무화면(검수·지급·회의비·예산)은 여전히 `p.kist.re.kr:8081/nxui/kistis/…` 그대로** (`e.kist.re.kr/nxui/…` 는 404). → **로그인/포탈 = `e.kist.re.kr`, 업무화면 = `p.kist.re.kr:8081`**.
   - **⚠️ 업무화면 전 포탈 로그인부터 확인 (2026-07-07 실전, 표준 절차)**: **작업 시작 시(특히 새 세션·오래 미사용) 통합정보 업무화면(`indexQ.jsp` 등)으로 바로 navigate 하지 말 것** — 세션 만료면 `Your session has expired` alert 가 **반복**해서 뜨고(handle_dialog 로 닫아도 페이지가 또 띄움) 진행 불가. 먼저 **`e.kist.re.kr` 포탈 메인**으로 가 로그인 상태 확인(로그인돼 있으면 eKIST 메인에 본인 이름) → 그 뒤 업무화면 navigate. SSO 쿠키가 살아 있으면 `e.kist.re.kr → nsso → login.do → eKIST 메인` 이 **자동 로그인**(재입력 불필요)되는 경우도 많다.

   | skill | 로그인/포탈 (2026-07 변경) | 업무화면 · 인증 |
   |-------|------------|----------|
   | kk-mail | `kist.gov-dooray.com` (Dooray) | Dooray · 브라우저 세션 쿠키 |
   | kk-pay | **`e.kist.re.kr`** 포탈 로그인 + Dooray 드라이브 | `p.kist.re.kr:8081` 통합정보 · SSO 세션 + Dooray 토큰 |
   | kk-dining | **`e.kist.re.kr`** 포탈 로그인 | `p.kist.re.kr:8081` 통합정보 · SSO 세션 |
   | kk-budget | **`e.kist.re.kr`** 포탈 로그인 | `p.kist.re.kr:8081` 통합정보 · SSO 세션 (조회 전용) |
   | kk-inspect | **`e.kist.re.kr`** 포탈 로그인 | `p.kist.re.kr:8081` 통합정보 · SSO 세션 |

3. **Dooray 토큰** *(업로드 쓰는 skill 만 — kk-pay, kk-dining 옵션)*
   - `~/.claude/kiki/kiki.env` 의 `DOORAY_TOKEN` 확인. 없으면 빈 템플릿 자동 생성 + 발급 안내(`personal_config.md`). 조회 전용(kk-budget·kk-inspect)·세션쿠키(kk-mail)는 생략.

4. **Python 패키지** *(쓰는 skill 만)*
   - kk-budget·kk-dining: `openpyxl` (엑셀)
   - kk-pay: `Pillow pywin32` (이미지/문서 변환)
   - kk-inspect: `Pillow` (+ pdf→jpg 필요 시 `PyMuPDF`)
   - kk-dining (저장모드 `xlsx_and_hwp` 일 때만): 아래아한글 + `pyhwpx pywin32 pywinauto`
   - 미설치면 *"`pip install <pkg>` 가 필요합니다"* 안내(크래시 X).

## 안내 문구 표준
- 멈춰야 할 때: 무엇이/왜 안 됐는지 + 사용자가 할 일 한 문장으로. (조용히 실패 금지)
- KIST 사내망/계정 권한이 필요한 접속은 그 사실을 함께 안내.
