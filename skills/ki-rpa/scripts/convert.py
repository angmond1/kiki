# -*- coding: utf-8 -*-
"""ki-rpa 코어 (3) — 증빙 파일 형식 변환.

지급신청 가능 형식은 jpg·pdf 뿐. 그 외는 자동 변환 후 사용자에게 알림.
  - 이미지 png/jpeg/bmp/tiff → jpg  (Pillow)
  - 문서 hwp/hwpx → pdf            (한글 COM: HWPFrame.HwpObject)
  - 문서 docx/doc/xlsx/xls → pdf   (MS Office COM: Word/Excel)
COM/엔진 실패 시 → {'manual': ...} 반환 (멈추지 않고 "직접 pdf 저장 후 재전달" 안내).
kist1 실측: 한글·Office 설치+COM 등록 확인 → 대부분 자동 변환. (KIST PC 한글+Office 표준)
"""
from __future__ import annotations
import os, subprocess
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

OK_EXT = ("jpg", "pdf")
IMG_EXT = ("png", "jpeg", "bmp", "tif", "tiff")
HWP_EXT = ("hwp", "hwpx")
OFFICE_EXT = ("docx", "doc", "xlsx", "xls")


def _ext(path: str) -> str:
    return path.lower().rsplit(".", 1)[-1] if "." in path else ""


def _recycle(path: str):
    """원본을 휴지통으로 (영구삭제 X, 복구 가능)."""
    ps = ("Add-Type -AssemblyName Microsoft.VisualBasic; "
          "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile("
          f"'{path}','OnlyErrorDialogs','SendToRecycleBin')")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=False,
                   capture_output=True)


def to_jpg(path: str) -> str:
    from PIL import Image
    out = os.path.splitext(path)[0] + ".jpg"
    Image.open(path).convert("RGB").save(out, "JPEG", quality=95)
    return out


def hwp_to_pdf(path: str) -> str:
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
    import win32com.client as win32
    ext = _ext(path)
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
        return {"ok": False, "manual": f"자동 변환 실패({ext}→{'jpg' if ext in IMG_EXT else 'pdf'}): {e}. "
                f"해당 파일을 직접 jpg/pdf 로 저장한 뒤 다시 주세요."}


if __name__ == "__main__":
    import sys, json
    if len(sys.argv) >= 2:
        print(json.dumps(ensure_uploadable(sys.argv[1]), ensure_ascii=False))
    else:
        print("usage: python convert.py <file>")
