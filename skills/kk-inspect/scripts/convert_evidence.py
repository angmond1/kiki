# -*- coding: utf-8 -*-
"""증빙 이미지 변환 — png/jpeg/bmp/tiff -> jpg (두레이 RPA 업로드 가능 형식).
pdf 는 그대로 둔다 (업로드 가능). 필요 시 --pdf2jpg 로 pdf 첫 페이지를 jpg 로.

사용:
  python convert_evidence.py <폴더 또는 파일 경로...>
  python convert_evidence.py --pdf2jpg <pdf경로>

의존: Pillow (이미지), PyMuPDF/fitz (pdf, --pdf2jpg 시).
"""
import sys, os, glob

IMG_EXT = ('.png', '.jpeg', '.bmp', '.tif', '.tiff')

def img_to_jpg(path):
    from PIL import Image
    out = os.path.splitext(path)[0] + '.jpg'
    Image.open(path).convert('RGB').save(out, 'JPEG', quality=95)
    return out

def pdf_to_jpg(path, dpi=200):
    import fitz
    out = os.path.splitext(path)[0] + '.jpg'
    fitz.open(path)[0].get_pixmap(dpi=dpi).save(out)
    return out

def main():
    pdf2jpg = '--pdf2jpg' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    targets = []
    for a in args:
        targets += glob.glob(os.path.join(a, '*')) if os.path.isdir(a) else [a]
    if not targets:
        print('대상 없음. 사용: python convert_evidence.py <폴더/파일>')
        return
    for t in targets:
        ext = os.path.splitext(t)[1].lower()
        try:
            if ext in IMG_EXT:
                print('img->jpg :', img_to_jpg(t))
            elif ext == '.pdf' and pdf2jpg:
                print('pdf->jpg :', pdf_to_jpg(t))
        except Exception as e:
            print('ERR', os.path.basename(t), '->', e)

if __name__ == '__main__':
    main()
