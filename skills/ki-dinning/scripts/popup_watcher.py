# -*- coding: utf-8 -*-
"""
ki-dinning 코어 (3) — 한글 보안 팝업 자동 처리 watcher (독립 프로세스)
- 한글 보안 팝업 = WPF 창(class 'HwndWrapper[hwp.exe;;...]', 제목 한컴사제폰트 '글', 작은 크기).
  WPF 라 win32 버튼 0개 + UIAutomation 차단 → 클릭 불가.
- 해결: 창 감지 → SetForegroundWindow → Alt+N('모두 허용(N)' 액셀러레이터) keybd_event.
- 별도 프로세스 필수: 같은 프로세스 스레드는 한글 COM 블록 중 GIL 로 안 돎.
- make_minutes.make_batch(..., watcher_path=이 파일) 로 subprocess 동반.
"""
import win32gui, win32con, win32api, time, datetime, tempfile, os

LOG = os.path.join(tempfile.gettempdir(), 'ki_dinning_watcher.log')

def logw(m):
    try:
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write('%s %s\n' % (datetime.datetime.now().strftime('%H:%M:%S'), m))
    except Exception:
        pass

def send_altN(h):
    try:
        win32gui.SetForegroundWindow(h)
    except Exception:
        pass
    time.sleep(0.06)
    win32api.keybd_event(0x12, 0, 0, 0)                          # Alt down
    time.sleep(0.02)
    win32api.keybd_event(0x4E, 0, 0, 0)                          # N down
    time.sleep(0.02)
    win32api.keybd_event(0x4E, 0, win32con.KEYEVENTF_KEYUP, 0)   # N up
    win32api.keybd_event(0x12, 0, win32con.KEYEVENTF_KEYUP, 0)   # Alt up

def scan():
    def enum(h, _):
        try:
            if not win32gui.IsWindowVisible(h):
                return
            c = win32gui.GetClassName(h) or ''
            if 'HwndWrapper' in c and 'hwp' in c:
                r = win32gui.GetWindowRect(h)
                w = r[2] - r[0]; ht = r[3] - r[1]
                if 0 < ht < 400 and 0 < w < 900:   # 보안 팝업만(메인 문서창 제외)
                    logw('POPUP h=%d size=%dx%d -> Alt+N' % (h, w, ht))
                    send_altN(h)
        except Exception as e:
            logw('err %s' % e)
    win32gui.EnumWindows(enum, None)

if __name__ == '__main__':
    logw('watcher start (altN)')
    while True:
        try:
            scan()
        except Exception as e:
            logw('scanerr %s' % e)
        time.sleep(0.1)
