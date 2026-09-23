> ⚠️ **구형(legacy, 2026-09-23 이후 미사용)** — 회의록 파일은 `scripts/make_dininglog_hwpx.py` 가 **아래아한글 없이 hwpx** 로 생성한다(모든 OS). 아래 한글 COM 자동화(pyhwpx·보안팝업 watcher)는 참고용으로만 보존.

# (옵션) 한글(hwp) 회의록 자동 생성 — 환경·함정

> 2026-06-05~ **회의록 master = 엑셀** (→ `meeting_log_excel.md`). 본 hwp 자동화는 `log_format: xlsx_and_hwp` (보관 선호 사용자 옵션)일 때만 사용. fam_0704 직접 자동작성 워크플로(권장)에서는 hwp 양산 불필요.

## 전제 (설치 시 점검 — 저장 모드 2 일 때만)
회의록 hwp 동봉 시 `.hwp` → **아래아한글 필수**(MS Word 불가). 필요:
1. 아래아한글 설치
2. `HwpObject` COM 등록 (보통 한글 설치 시 자동; 레지스트리 `HKCR\HWPFrame.HwpObject`)
3. python 패키지: `pyhwpx`, `pywin32`, `pywinauto`
→ 부트스트랩에서 **한글 연결 + 빈 양식 1장 생성 테스트**. 안 되면 친절히 안내(이 skill 사용 불가).

## 핵심 동작 (`make_dininglog.py`)
- 샘플 양식 hwp 를 **템플릿으로 열어 값 셀만 교체** → 새 hwp `save_as`. 양식·병합·서식 보존.
- 진입 `get_into_nth_table(0)`, 순회 `TableRightCell()`(직접 메서드 — `Run("TableRightCell")` 은 안 됨).
- 셀 비우기 **`Erase()`** 필수 (⚠️ `Delete`/`Run('Delete')` 는 셀 내용 안 지워짐).
- 일괄(`make_batch`)은 **한글 인스턴스 1개 재사용** — 매 건 새 `Hwp()` 하면 COM 끊김. `Run('FileClose')` 로 문서만 닫고 인스턴스 유지.

## ⭐ 보안 팝업 = WPF (무인화 핵심)
한글이 외부 자동화로 파일 접근 시 **"파일 접근 허용" 보안 팝업**이 뜬다.
- 팝업 = **WPF 창**: class `HwndWrapper[hwp.exe;;...]`, 제목 `'글'`("혼"이 한컴 사제폰트 U+F53A → '혼글' 문자열 매칭 실패), size ≈ 533x180.
- WPF 라 **win32 `EnumChildWindows` 자식 0개 + UIAutomation 한컴 차단** → 버튼 클릭(BM_CLICK/uia/좌표) 전부 불가.
- **해결 = 창 감지(class 'HwndWrapper'+'hwp' & height<400) → `SetForegroundWindow` → Alt+N**(`keybd_event` 0x12+0x4E, "모두 허용(N)" 액셀러레이터). 키 입력은 WPF 도 받음.
- **watcher 는 별도 프로세스 필수** — 같은 프로세스 스레드는 한글 COM 호출 블록 중 GIL 로 안 돎. `make_batch(..., watcher_path=popup_watcher.py)` 로 subprocess 동반.
- `RegisterModule('FilePathCheckDLL','FilePathCheckerModule')` 은 False 반환 + 팝업 비결정 → 신뢰 불가. **Alt+N watcher 가 확실**.

## pdf 변환 (선택)
검증/제출용 pdf 필요 시: hwp→pdf 는 한글 `SaveAs(path,'PDF')`, png 보기는 `fitz`(PyMuPDF). 기본 출력은 hwp 만.
