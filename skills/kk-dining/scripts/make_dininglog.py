# -*- coding: utf-8 -*-
"""
kk-dining (구형·미사용) — 회의비 회의록(별지1호) .hwp 생성 (pyhwpx, Windows+한글 COM)
⚠️ 2026-09-23 부터 표준은 make_dininglog_hwpx.py (hwpx, 아래아한글 불요, 모든 OS). 이 파일은 참고용.
- 샘플 양식 hwp 를 템플릿으로 열어 표 값 셀만 교체 -> 새 hwp 저장 (양식/병합/서식 100% 보존)
- 보안팝업은 popup_watcher.py (Alt+N) 가 자동 처리 -> 완전 무인
- credential 없음. 템플릿/출력 경로는 인자로 받음(하드코딩 X).

전제: 아래아한글 설치 + HwpObject COM + python 패키지(pyhwpx, pywin32, pywinauto).
사용: from make_dininglog import make_batch; make_batch(items, template, watcher_path)
"""
import sys, subprocess, time, os
if not sys.platform.startswith("win"):
    raise SystemExit("kk-dining hwp 회의록 자동생성은 Windows + 아래아한글 전용입니다(엑셀 회의록은 모든 OS). "
                     "한글이 없으면 무료 오픈소스 HOP(https://github.com/golbin/hop)으로 열람·편집·PDF 내보내기만 가능합니다.")
try:
    from pyhwpx import Hwp
except ImportError:
    raise SystemExit("pyhwpx 가 없습니다: pip install pyhwpx pywin32 pywinauto (아래아한글 설치 필요)")

# 표 셀 인덱스 매핑 (get_into_nth_table(0) + TableRightCell 순회, 별지1호 7x7 검증값)
CELL_MAP = {
    1: 'account', 3: 'pi_ins', 5: 'amount', 7: 'place', 9: 'date',
    11: 'purpose', 13: 'time', 15: 'content',
    18: 'ext_cnt', 19: 'ext_mem', 21: 'int_cnt', 22: 'int_mem',
}


def _fill(hwp, data):
    hwp.get_into_nth_table(0)
    i = 0
    while i < 40:
        if i in CELL_MAP:
            val = str(data.get(CELL_MAP[i], ''))
            hwp.TableCellBlock()
            hwp.Erase()                # ⚠️ Delete 는 셀 안 지워짐 → Erase 필수
            for k, ln in enumerate(val.split('\n')):
                if k:
                    hwp.hwp.HAction.Run('BreakPara')
                hwp.insert_text(ln)
        if not hwp.TableRightCell():
            break
        i += 1


def _new_hwp(visible):
    hwp = Hwp(new=True, visible=visible)
    try:
        hwp.RegisterModule('FilePathCheckDLL', 'FilePathCheckerModule')
    except Exception:
        pass
    return hwp


def make_batch(items, template, watcher_path=None, visible=False):
    """여러 회의록 일괄 (watcher 1회 공유, 한글 인스턴스 1개 재사용).
    items: [{'data': dict, 'hwp': 출력경로}, ...]
    template: 빈 별지1호 양식 hwp 경로
    watcher_path: popup_watcher.py 경로 (None 이면 watcher 미동반)
    """
    watcher = None
    if watcher_path:
        watcher = subprocess.Popen([sys.executable, watcher_path])
        time.sleep(2.0)
    out = []
    hwp = _new_hwp(visible)
    try:
        for it in items:
            os.makedirs(os.path.dirname(it['hwp']), exist_ok=True)
            hwp.open(template)
            _fill(hwp, it['data'])
            hwp.save_as(it['hwp'], 'HWP')
            hwp.Run('FileClose')       # 문서만 닫고 인스턴스 유지
            out.append(it['hwp'])
    finally:
        try: hwp.quit()
        except Exception: pass
        if watcher:
            watcher.terminate()
    return out


def make(data, hwp_path, template, watcher_path=None, visible=False):
    return make_batch([{'data': data, 'hwp': hwp_path}], template, watcher_path, visible)[0]


# data dict 키: account, pi_ins('홍길동 (인)'), amount('104,200 원'), place, date('2026. 5. 21.'),
#   purpose(회의목적=제목), time('11:00 ~ 13:00'), content(회의내용·여러줄 \n, 1과 2 사이 빈줄),
#   ext_cnt('1명'), ext_mem('(○○대학교) 김외부'), int_cnt('3명'), int_mem('홍길동, 김연구, 이연구')
