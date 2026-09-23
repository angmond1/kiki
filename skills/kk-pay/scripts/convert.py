# -*- coding: utf-8 -*-
"""kk-pay 코어 (3) — 증빙 파일 형식 변환 (Windows / macOS / Linux).

지급신청 가능 형식은 jpg·pdf 뿐. 그 외는 자동 변환 후 사용자에게 알림.
  - 이미지 png/jpeg/bmp/tiff → jpg  (Pillow — 모든 OS)
  - 문서 docx/doc/xlsx/xls → pdf   (① Windows: MS Office COM  ② 어느 OS 든: LibreOffice `soffice --headless`)
  - 문서 hwp/hwpx → pdf            (Windows + 아래아한글 COM 만. 없으면 수동 — HOP(무료 오픈소스, github.com/golbin/hop)으로 열어 PDF 내보내기)
엔진이 없거나 실패하면 → {'ok': False, 'manual': ...} 반환 (멈추지 않고 "직접 pdf 저장 후 재전달" 안내).

엔진 유무 확인:  python convert.py --check   → {"hwp": bool, "office": bool, "libreoffice": bool, "os": ...}
  → skill 은 이 결과로 "한글/Office 가 없는데 LibreOffice(무료)를 설치할까요?" 를 묻는다(설치는 사용자 confirm 후).
"""
from __future__ import annotations
import os, sys, subprocess, shutil
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

IS_WIN = sys.platform.startswith("win")
IS_MAC = sys.platform == "darwin"

OK_EXT = ("jpg", "pdf")
IMG_EXT = ("png", "jpeg", "bmp", "tif", "tiff")
HWP_EXT = ("hwp", "hwpx")
OFFICE_EXT = ("docx", "doc", "xlsx", "xls")


def _ext(path: str) -> str:
    return path.lower().rsplit(".", 1)[-1] if "." in path else ""


# ---------- 휴지통 (OS 별, 영구삭제 X) ----------
def _recycle(path: str):
    """원본을 휴지통으로. 어느 방법도 안 되면 같은 폴더의 _trash/ 로 이동(복구 가능)."""
    try:
        if IS_WIN:
            ps = ("Add-Type -AssemblyName Microsoft.VisualBasic; "
                  "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile("
                  f"'{path}','OnlyErrorDialogs','SendToRecycleBin')")
            r = subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=False, capture_output=True)
            if r.returncode == 0 and not os.path.exists(path):
                return
        elif IS_MAC:
            r = subprocess.run(["osascript", "-e",
                                f'tell application "Finder" to delete POSIX file "{os.path.abspath(path)}"'],
                               check=False, capture_output=True)
            if r.returncode == 0 and not os.path.exists(path):
                return
        elif shutil.which("gio"):
            r = subprocess.run(["gio", "trash", path], check=False, capture_output=True)
            if r.returncode == 0 and not os.path.exists(path):
                return
    except Exception:
        pass
    trash = os.path.join(os.path.dirname(os.path.abspath(path)), "_trash")
    os.makedirs(trash, exist_ok=True)
    shutil.move(path, os.path.join(trash, os.path.basename(path)))


# ---------- 엔진 탐지 ----------
def _soffice() -> str | None:
    """LibreOffice 실행 파일 (모든 OS)."""
    p = shutil.which("soffice") or shutil.which("libreoffice")
    if p:
        return p
    for c in (r"C:\Program Files\LibreOffice\program\soffice.exe",
              r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
              "/Applications/LibreOffice.app/Contents/MacOS/soffice",
              "/usr/bin/soffice", "/usr/lib/libreoffice/program/soffice", "/snap/bin/libreoffice"):
        if os.path.exists(c):
            return c
    return None


def _com_available(progid: str) -> bool:
    if not IS_WIN:
        return False
    try:
        import winreg
        winreg.CloseKey(winreg.OpenKey(winreg.HKEY_CLASSES_ROOT, progid))
        return True
    except Exception:
        return False


def check_engines() -> dict:
    return {
        "os": sys.platform,
        "hwp": _com_available("HWPFrame.HwpObject"),          # 아래아한글 (Windows)
        "office": _com_available("Word.Application"),         # MS Office (Windows)
        "libreoffice": _soffice() is not None,                # LibreOffice (모든 OS)
        "pillow": _has("PIL"), "pywin32": IS_WIN and _has("win32com"),
    }


def _has(mod: str) -> bool:
    try:
        __import__(mod)
        return True
    except Exception:
        return False


# ---------- 변환 ----------
def to_jpg(path: str) -> str:
    from PIL import Image
    out = os.path.splitext(path)[0] + ".jpg"
    Image.open(path).convert("RGB").save(out, "JPEG", quality=95)
    return out


def _soffice_to_pdf(path: str) -> str:
    exe = _soffice()
    if not exe:
        raise RuntimeError("LibreOffice(soffice) 없음")
    outdir = os.path.dirname(os.path.abspath(path))
    subprocess.run([exe, "--headless", "--convert-to", "pdf", "--outdir", outdir, os.path.abspath(path)],
                   check=True, capture_output=True, timeout=180)
    out = os.path.splitext(os.path.abspath(path))[0] + ".pdf"
    if not os.path.exists(out):
        raise RuntimeError("LibreOffice 변환 결과 파일이 없음")
    return out


def hwp_to_pdf(path: str) -> str:
    if not IS_WIN:
        raise RuntimeError("hwp→pdf 자동 변환은 Windows+아래아한글 전용입니다. "
                           "HOP(무료 오픈소스 한글 편집기, https://github.com/golbin/hop) 으로 열어 PDF 로 내보낸 뒤 다시 주세요.")
    import win32com.client as win32
    out = os.path.splitext(path)[0] + ".pdf"
    hwp = win32.gencache.EnsureDispatch("HWPFrame.HwpObject")
    try:
        # 보안 모듈 등록 — 파일 접근 보안 프롬프트 회피 (한글 자동화 표준)
        try:
            hwp.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule")
        except Exception:
            pass
        hwp.Open(os.path.abspath(path), "", "forceopen:true")
        hwp.SaveAs(os.path.abspath(out), "PDF")
    finally:
        try:
            hwp.Quit()
        except Exception:
            pass
    return out


def office_to_pdf(path: str) -> str:
    """MS Office COM(Windows) → 안 되면 LibreOffice(모든 OS)."""
    ext = _ext(path)
    if IS_WIN and _com_available("Word.Application"):
        try:
            import win32com.client as win32
            out = os.path.splitext(path)[0] + ".pdf"
            ap = os.path.abspath(path); ao = os.path.abspath(out)
            if ext in ("docx", "doc"):
                app = win32.gencache.EnsureDispatch("Word.Application"); app.Visible = False
                try:
                    doc = app.Documents.Open(ap); doc.SaveAs(ao, FileFormat=17); doc.Close(False)  # 17=PDF
                finally:
                    app.Quit()
            else:  # xlsx/xls
                app = win32.gencache.EnsureDispatch("Excel.Application"); app.Visible = False
                try:
                    wb = app.Workbooks.Open(ap); wb.ExportAsFixedFormat(0, ao); wb.Close(False)  # 0=PDF
                finally:
                    app.Quit()
            return out
        except Exception:
            if not _soffice():
                raise
    return _soffice_to_pdf(path)


def ensure_uploadable(path: str) -> dict:
    """업로드 가능한 형식으로 보장. 반환:
       {ok:True, path, converted:bool, from?, to?}  또는
       {ok:False, manual:'...'} (변환 불가/실패 → 사용자 수동 안내)"""
    ext = _ext(path)
    if ext in OK_EXT:
        return {"ok": True, "path": path, "converted": False}
    try:
        if ext in IMG_EXT:
            out = to_jpg(path); _recycle(path)
            return {"ok": True, "path": out, "converted": True, "from": ext, "to": "jpg"}
        if ext in HWP_EXT:
            out = hwp_to_pdf(path)
            return {"ok": True, "path": out, "converted": True, "from": ext, "to": "pdf"}
        if ext in OFFICE_EXT:
            out = office_to_pdf(path)
            return {"ok": True, "path": out, "converted": True, "from": ext, "to": "pdf"}
        return {"ok": False, "manual": f"'{ext}'는 지원하지 않는 형식입니다. jpg 또는 pdf 로 직접 저장해 다시 주세요."}
    except Exception as e:
        hint = ""
        if ext in HWP_EXT and not _com_available("HWPFrame.HwpObject"):
            hint = " (아래아한글이 없으면 무료 HOP(https://github.com/golbin/hop)으로 열어 PDF 로 내보낸 파일을 주세요)"
        if ext in OFFICE_EXT and not _soffice():
            hint = " (MS Office 가 없으면 무료 LibreOffice 를 설치하면 자동 변환됩니다: https://www.libreoffice.org/download/)"
        return {"ok": False, "manual": f"자동 변환 실패({ext}→{'jpg' if ext in IMG_EXT else 'pdf'}): {e}. "
                f"해당 파일을 직접 jpg/pdf 로 저장한 뒤 다시 주세요.{hint}"}


if __name__ == "__main__":
    import json
    if len(sys.argv) >= 2 and sys.argv[1] == "--check":
        print(json.dumps(check_engines(), ensure_ascii=False))
    elif len(sys.argv) >= 2:
        print(json.dumps(ensure_uploadable(sys.argv[1]), ensure_ascii=False))
    else:
        print("usage: python convert.py <file>   |   python convert.py --check")
