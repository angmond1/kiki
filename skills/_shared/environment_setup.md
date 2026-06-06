# kiki 설치 환경 점검 (형제 skill 공유)

> **모든 kk-* skill 은 첫 실행(부트스트랩) 때 아래를 동일하게 확인/안내한 뒤 진행한다.**
> 무자격 환경(미연결·미로그인)이면 **크래시 대신 친절한 안내로 멈춘다**.

## 0단계 — 환경 점검 (모든 skill 공통, 부트스트랩 맨 앞)

1. **Chrome + "Claude in Chrome"(MCP) 확장 — 설치·연결 확인** *(전 skill 공통, 예외 없음)*
   - `list_connected_browsers` 로 연결 확인. 안 되면:
     *"이 skill 은 Chrome 의 'Claude in Chrome'(MCP) 확장으로 동작합니다. 확장을 설치·연결해 주세요(확장 미설치 시 안내)."* 후 중단.
   - 연결됐으면 `select_browser` / `tabs_context_mcp` 로 작업 탭 확보.

2. **대상 시스템 로그인 세션 확인** *(skill 별 대상이 다름 — 아래 표)*
   - 로그인 페이지가 뜨면(세션 만료) *"{시스템}에 로그인해 주세요"* 안내 후 중단. **Claude 가 대신 로그인하지 않는다.**

   | skill | 로그인 대상 | 인증 방식 |
   |-------|------------|----------|
   | kk-mail | `kist.gov-dooray.com` (Dooray) | 브라우저 세션 쿠키 |
   | kk-pay | `p.kist.re.kr` (통합정보) + Dooray 드라이브 | 통합정보 SSO 세션 + Dooray 토큰 |
   | kk-dining | `p.kist.re.kr` (통합정보) | 통합정보 SSO 세션 |
   | kk-budget | `p.kist.re.kr` (통합정보) | 통합정보 SSO 세션 (조회 전용) |
   | kk-inspect | `p.kist.re.kr` (통합정보) | 통합정보 SSO 세션 |

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
