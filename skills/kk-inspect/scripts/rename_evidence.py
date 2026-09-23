# -*- coding: utf-8 -*-
"""증빙 파일 개명 + 원본 휴지통 이동 (복구 가능, 영구삭제 X). Windows / macOS / Linux.

사용:
  python rename_evidence.py <원본경로> "<새파일명(확장자포함)>"   # 새 이름으로 복사
  python rename_evidence.py --trash <경로...>                       # 휴지통 이동만

권장 새 파일명 형식: "{YYMMDD} {원화금액} {거래처 내용} 카드영수증.jpg"
무의미한 무작위 숫자 파일명을 의미있게 바꿀 때 사용.
변환(convert_evidence.py)으로 jpg 를 만든 뒤, 업로드 불가한 원본(png 등)은 --trash 로 정리.
"""
import sys, os, shutil, subprocess

IS_WIN = sys.platform.startswith("win")
IS_MAC = sys.platform == "darwin"


def to_recycle(path):
    """OS 휴지통으로 이동 (복구 가능). 어느 방법도 안 되면 같은 폴더의 _trash/ 로 이동."""
    try:
        if IS_WIN:
            ps = ("Add-Type -AssemblyName Microsoft.VisualBasic;"
                  "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile("
                  f"'{path}','OnlyErrorDialogs','SendToRecycleBin')")
            r = subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=False, capture_output=True)
            if r.returncode == 0 and not os.path.exists(path):
                return
        elif IS_MAC:
            r = subprocess.run(['osascript', '-e',
                                f'tell application "Finder" to delete POSIX file "{os.path.abspath(path)}"'],
                               check=False, capture_output=True)
            if r.returncode == 0 and not os.path.exists(path):
                return
        elif shutil.which('gio'):
            r = subprocess.run(['gio', 'trash', path], check=False, capture_output=True)
            if r.returncode == 0 and not os.path.exists(path):
                return
    except Exception:
        pass
    trash = os.path.join(os.path.dirname(os.path.abspath(path)), '_trash')
    os.makedirs(trash, exist_ok=True)
    shutil.move(path, os.path.join(trash, os.path.basename(path)))


def main():
    if '--trash' in sys.argv:
        for p in [a for a in sys.argv[1:] if a != '--trash']:
            to_recycle(p)
            print('휴지통:', os.path.basename(p))
        return
    if len(sys.argv) < 3:
        print('사용: python rename_evidence.py <원본> "<새파일명>"  또는  --trash <경로>')
        return
    src, newname = sys.argv[1], sys.argv[2]
    dst = os.path.join(os.path.dirname(src), newname)
    shutil.copy2(src, dst)
    print('개명 저장:', os.path.basename(dst))


if __name__ == '__main__':
    main()
