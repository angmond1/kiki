---
name: kk-dining
description: KIST 회의비 처리 자동화 — 카드 회의비 추출, 사전결재(fam_0100) 매칭, 회의록 엑셀 관리, fam_0704 지급신청서 직접 자동작성(카드매핑→계정/비목 콜백→통장표기→적요→회의록 입력→사전결재 연동→임시저장→결재상신). 사용자가 "회의비 처리하자", "회의록 작성/만들어줘", "회의비 정리해줘", "이번달 회의비", "식대 회의록" 등을 요청할 때 사용. 통합정보(p.kist.re.kr) + (선택)아래아한글 + (선택)두레이 기반.
---

# kk-dining — KIST 회의비 처리

카드로 결제한 회의비(식사·카페)를 골라 **사전결재와 매칭 → 회의록 엑셀 작성 → fam_0704 지급신청서 직접 자동작성·임시저장·결재상신**까지 처리한다. 조회는 통합정보 SSO 세션(토큰 불요), fam_0704 자동작성은 부모탭 JS(`Claude in Chrome`)로 NEXACRO 팝업 제어, (선택)아래아한글 hwp 동봉 보관·업로드는 사용자 옵션.

> **2026-06-05 패러다임 전환**: 회의록 hwp 양산 → 두레이 업로드 → 행정원 수기 신청 (옛 v1) → **회의록 엑셀 master + fam_0704 직접 자동작성·결재상신** (v2). hwp 는 옛 사용자 선호 옵션으로 보존.

## 정보 5분류
- **A 내장**: 회의비 판별(음식점·카페), 인원 산정(⌈금액÷5만⌉+1, **식대+음료 합산**), 회의시간 융통성(USETIME 참고), 별지1호 hwp 셀매핑(옵션), 회의록 엑셀 9컬럼, fam_0704 자동작성 11단계, 보안팝업 Alt+N(hwp 옵션), 회의내용 가이드, 분류코드 면제(**I·S·B·F·부서운영비**).
- **B 런타임조회**: 카드내역(fam_0711 법인+연구비)·참여과제(rdm_2011)·사전결재(fam_0100)·발의자 사번. → `scripts/portal_ops.js`
- **C 환경준비**: Chrome+통합정보 SSO 세션 + Claude in Chrome 확장 / Python+`openpyxl`(엑셀) / (옵션)아래아한글+COM+`pyhwpx`·`pywin32`·`pywinauto` / (옵션)Dooray 로그인.
- **D config**: 공통(이름·카드책임자·참여과제)은 `~/.claude/kiki/kiki.config.json`(형제 공유), kk-dining 고유(**저장 모드**·upload_via_rpa·폴더)는 `kk-dining.config.json`. → `../_shared/personal_config.md`.
- **E 격리**: Dooray 토큰(`~/.claude/kiki/kiki.env`)·사번·참석자 실명. skill 텍스트엔 0건.

## 설치/부트스트랩 (`kk-dining 설정해줘`)
**0. 환경 점검** — `../_shared/environment_setup.md` 0단계(Chrome+Claude in Chrome MCP·통합정보 로그인·python `openpyxl`, 저장모드 2면 한글·COM·`pyhwpx`).
**공통 식별정보는 `~/.claude/kiki/kiki.config.json` 에서 읽는다**(없으면 1회 수집·저장, 다른 skill 재사용). kk-dining 고유만 `kk-dining.config.json`. (`../_shared/personal_config.md`)

1. **성함·카드책임자·참여과제** *(공통 `user`/`card_holder`/`projects`)* — kiki.config 에 없으면 묻는다. 카드책임자 본인 여부 확인 + 사번 1회(없으면 fam_0711 에서). 참여과제는 `queryProjects` 자동조회 → 분류코드 포함 확인.
2. **사전결재 면제 판정** *(자동)* — 참여과제 분류코드(`projects[].code`)로 **I·S·B·F·부서운영비** 면제 자동 판정 → "맞나요?" 확인 (`project_code.md`). 과제별 저장 불필요.
3. (질문 X) 카드 조회는 **법인+연구비 항상 둘 다**.
4. **저장 모드** *(kk-dining 고유)* — "(1)엑셀만 (2)엑셀+한글". `xlsx_only` / `xlsx_and_hwp`. Claude 는 어느 쪽이든 **엑셀만 조회**.
5. **"Dooray 드라이브 업로드 RPA 처리? (예/아니요)"** — 아니요(기본)면 fam_0704 직접 자동작성. 예면 토큰(`kiki.env`) + 담당 행정원 폴더(공통 `payment_admin.folder_url`).
6. (질문 X, **지침 안내**) 폴더 3종 — 아래 "경로".

### 토큰 (5=예일 때만)
`~/.claude/kiki/kiki.env` 의 `DOORAY_TOKEN`(형제 공유). 입력 방식(A 파일 / B 채팅)·없으면 빈 템플릿 자동생성은 `../_shared/personal_config.md`. 발급 https://kist.gov-dooray.com/setting/api/token.

### 경로 (설치 시 지침으로 안내)
- 📁 **카드영수증/증빙**: 카페·마트·편의점·호텔 결제건만 명세서 jpg 필요 (식당은 카드전표 갈음). 사용자 폴더 경로 알려주거나 그때그때 첨부. → `meeting_form.md`
- 📁 **회의록 엑셀**: `C:\kiki\dining\meeting_log\{YYYY.MM}\{yymmdd}_회의록.xlsx` 표준 (yymmdd = 처리일, 같은날 모든 건 1파일). → `meeting_log_excel.md`
- 📁 **회의록 hwp**(저장 모드 2): `C:\kiki\dining\<yymmdd>\` (yymmdd=연 2자리). 엑셀과 동시 생성, 별지1호 양식. → `meeting_form.md`
- 📁 **과제보고서**(회의내용 작성용): 과제별 경로 알려주거나 `C:\kiki\dining\project_report\`.

## 작업 (`회의비 처리하자`)

### 단계 1-7: 정보 수집
1. **카드 조회 즉시 출력** — `queryCardsBoth` (법인+연구비) → 음식점·카페 회의비 후보를 **법인/연구비 구분 표시**해 리스트.
2. **후보 확정** — "맞나요? 뺄 건? (**같은 날 식당+카페 = 1건**, 금액 합산)".
3. **증빙 영수증 확인** — **식당·명확한 커피전문점**(스벅·테라로사·투썸·커피빈) = 카드전표 갈음(불요). **카페·마트·편의점·호텔·제과겸업**(파바·던킨·뚜레쥬르)·**애매한 카페** = 거래명세서 **jpg 변환 필수** (jpeg/png/pdf 불가). 파일명 `{yymmdd}_{거래처명}.jpg`. → `meeting_form.md`
4. **과제·비목 자동** — 사전결재/계정 매칭으로 건별 과제 추정 + 분류코드로 비목 결정 (`33-523` 기본 / `17-448` 수탁계열 / `34-448` K과제 / `17-523`·`41-523` G계정) → **확인만**. → `project_code.md`
5. **사전결재 매칭** (`queryPreApprovals`→`matchPreApproval`):
   - 매칭+제목 있음 → 목적·장소·시간 자동.
   - **면제(I·S·B·F·부서운영비) 또는 매칭 실패** → 과제보고서 조회해 회의제목·내용 자동 산출(중복 금지). 장소=카드 거래처.
6. **인원 산정** — **⌈금액(식대+음료 합산) ÷ 50,000⌉ + 1명**. 같은날 식당+카페는 합산 금액으로 산정 (옛 "카페 음료 잔수=인원" 폐기).
7. **참석자** — "내부 N·외부 N — 내부 성명 / 외부 (소속) 성명 알려주세요".

### 단계 8-9: 회의내용 + 엑셀 작성
8. **회의시간** — 카드승인시간(USETIME) 참고 융통성. 예: USETIME 14:38 → 회의 13:00~14:30 (결제 직전 종료).
9. **회의내용**(10만원↑만) — 과제보고서 기반 생성 후 확인. 10만 미만 생략. **엑셀 9컬럼 행 추가** (`scripts/meeting_log_xlsx.py`): `D:\...\meeting_log\{YYYY.MM}\{yymmdd}_회의록.xlsx` (처리일 1파일에 같은날 모든 건). 저장 모드 2 면 `make_dininglog.make_batch(...)`로 hwp 도 동봉 → `C:\kiki\dining\<yymmdd>\`. → `meeting_log_excel.md`, `meeting_form.md`

### 단계 10-11: fam_0704 자동작성 + 결재상신
10. **fam_0704 직접 자동작성**(`회의록 작성 화면`, NEXACRO `fam_0704_02`):
    - 부모탭 JS(Claude in Chrome) → `application.popupframes` 통해 11단계 자동 (DOC_CLS="G" frozen 회피 → 식비안내 팝업 닫기 → 카드매핑 `doSetDesp("RAWCARD")` → 계정 필터 popBudgList → `doDecision()` 콜백 → 통장표기 `dpstDispNm` + **`common_onkillfocus` 동기화 필수** → 적요 → 회의록 팝업 입력[사용구분 `rd_UseType="3"` 기타(A이외)식대 + 사전결재 `button00_onclick` 연동 + 회의록 원본 복원 + `doSave()`] → fam_0704 `bt_save_onclick` 임시저장 → `bt_approval_onclick` 결재상신).
    - ⭐ **행추가(`bt_addRow`)로 한 상신에 최대 5건 묶기** (8건이면 5+3 분할). **같은날 식당+카페는 동일 상신건**에 묶음(=1행 처리).
    - 자세한 11단계 JS = → `fam_0704_automation.md`
11. **결재선 안내** (사용자에게 출력):
    - 계정책임자 (= `ds_rqstGrid.RDSBJEMPNM`) 확인.
    - **계정책임자 == 발의자(본인)** → *"[안내] 사용자({본인})님이 이 과제({계정}) 계정책임자이므로, 결재선 책임연구원 칸에 이미 포함되어 있습니다. 그대로 상신하시면 됩니다."*
    - **계정책임자 != 발의자** → *"[안내] 좌상단 결재선 버튼 → 팝업서 {계정책임자}님(계정책임자) 검색·선택해 결재선에 추가하세요."*
    - (드물게) 신청서 검토용 행정원 추가 → 본인↔계정책임자 사이. 발의자=계정책임자면 자기 다음.
    - ⚠️ 결재선(gw 전자결재 ngw.kist.re.kr) = 별도 윈도우 → **사용자 직접** 확정·상신.

### ⭐ 중복 방지 (작업마다 검사)
회의록 엑셀은 처리일 단위 1파일. 작업 시 **과거 엑셀들**(`meeting_log\*\*\*_회의록.xlsx`) **스캔** → 제목·회의내용을 이전과 다르게(같은 제목/내용 재사용 금지).

## 안전 규칙
- **모든 쓰기(fam_0704 임시저장·결재상신·업로드·전송)는 사용자 confirm 후.**
- **결재상신(`bt_approval`)은 실제 지급 결재 제출**(되돌리려면 결재 회수 필요) → 11단계 직전 최종 confirm 필수.
- 결재선은 별도 gw 창이라 Claude 제어 불가 → 사용자 직접.
- 참석자·카페영수증 유무는 사용자만 아는 값 → 그때그때 묻는다.
- credential(토큰)·사번·실명은 skill·repo에 0건. 토큰은 `kiki.env`(repo 밖).

## 참고
- `references/fam_0704_automation.md` — **NEXACRO 부모탭 JS 완전자동 11단계** (DOC_CLS / 식비팝업 / 카드매핑 / popBudgList 콜백 / 통장표기 killfocus / 회의록 / 사전결재 연동 / 저장 / 결재상신).
- `references/meeting_log_excel.md` — 회의록 엑셀 9컬럼 관리 표준 (처리일 1파일).
- `references/meeting_form.md` — (옵션) hwp 별지1호 양식·셀매핑·인원·증빙·중복.
- `references/project_code.md` — 분류코드·비목·면제(I·S·B·F·부서운영비)·발의자.
- `references/fam0100_reference.md` — 사전결재 fetch 명세.
- `references/hwp_automation.md` — (옵션) 한글 자동화·WPF팝업.
- scripts: `portal_ops.js`(조회) · **`meeting_log_xlsx.py`(엑셀 헬퍼)** · `make_dininglog.py`(옵션 hwp) · `popup_watcher.py`(hwp 옵션) · `dooray_drive.py`(옵션 업로드).
