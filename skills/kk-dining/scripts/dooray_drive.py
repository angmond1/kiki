# -*- coding: utf-8 -*-
"""kiki 공용 — dooray drive 폴더 검색·구조파악·업로드·처리완료 아카이브 (kk-pay/kk-dining 공유).

인증: dooray 개인 토큰 (업로드는 세션쿠키로 안 됨 → 토큰 필요).
  토큰 로드 우선순위: 환경변수 DOORAY_TOKEN → <kiki_root>/token.txt → ~/.claude|.codex/kiki/token.txt → (구형) kiki.env
  발급: https://kist.gov-dooray.com/setting/api/token  (토큰은 repo·skill 에 저장 금지, 로컬 env 만)

전사 공통(개인정보 아님, 내장 OK):
  PROJECT 3311002956353796322 / DRIVE 3311002957555545393 = RPA-지급신청자동화 (전 본부·행정원 공유)
"""
from __future__ import annotations
import os, re, time, sys, json
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
import requests, urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API = "https://api.gov-dooray.com"
PROJECT = "3311002956353796322"   # 웹 URL용 projectId (전사 공통)
DRIVE = "3311002957555545393"     # API용 driveId (전사 공통)

# 본부 정식명 ↔ 관용 약어 (사용자 제공 2026-06-04). drive 본부 폴더는 'NN 정식명' 형식.
DEPT_ALIAS = {
    "뇌과학": "뇌과학연구소", "차반연": "차세대반도체연구소",
    "AI": "AI로봇", "로봇": "AI로봇", "기후": "기후환경연구소",
    "바이오": "바이오메디컬", "메디컬": "바이오메디컬",
    "첨소": "첨단소재", "첨단": "첨단소재",
    "청정": "청정신기술", "청신기": "청정신기술",
    "미래본": "지속가능미래", "지속가능": "지속가능미래",
}
# 정식 RPA 폴더 식별 키워드 (하위폴더에 이게 있으면 정식)
_RPA_MARK = ("세금계산서", "회의비", "지급신청 매뉴얼")


def _kiki_root() -> str:
    """kiki 작업 폴더 — 환경변수 KIKI_ROOT → kiki.config.json(claude/codex) 의 kiki_root."""
    r = os.environ.get("KIKI_ROOT", "").strip()
    if r:
        return os.path.expanduser(r)
    for cfg in ("~/.claude/kiki/kiki.config.json", "~/.codex/kiki/kiki.config.json"):
        p = os.path.expanduser(cfg)
        if os.path.exists(p):
            try:
                r = (json.load(open(p, encoding="utf-8-sig")).get("kiki_root") or "").strip()
            except Exception:
                r = ""
            if r:
                return os.path.expanduser(r)
    return ""


def _token_from_file(p: str) -> str:
    """token.txt('Dooray token:' 다음 줄) 또는 kiki.env(DOORAY_TOKEN=...) 에서 토큰 추출. 없으면 ''."""
    try:
        lines = [ln.rstrip("\r\n") for ln in open(p, encoding="utf-8-sig")]
    except Exception:
        return ""
    body = [ln.strip() for ln in lines if ln.strip() and not ln.lstrip().startswith("#")]
    for i, ln in enumerate(body):
        if ln.upper().startswith("DOORAY_TOKEN="):
            return ln.split("=", 1)[1].strip().strip('"').strip("'")
        if ln.lower().startswith("dooray token"):
            rest = ln.split(":", 1)[1].strip() if ":" in ln else ""
            if rest:
                return rest.strip('"').strip("'")
            return body[i + 1].strip('"').strip("'") if i + 1 < len(body) else ""
    return body[0].strip('"').strip("'") if body else ""   # 헤더 없는 파일: 첫 줄이 토큰


def _token_candidates() -> list:
    """우선순위: <kiki_root>/token.txt → ~/.claude|.codex/kiki/token.txt → (구형) kiki.env."""
    root = _kiki_root()
    c = [os.path.join(root, "token.txt")] if root else []
    c += [os.path.expanduser(x) for x in ("~/.claude/kiki/token.txt", "~/.codex/kiki/token.txt",
                                          "~/.claude/kiki/kiki.env", "~/.codex/kiki/kiki.env")]
    return c


def _load_token() -> str:
    t = os.environ.get("DOORAY_TOKEN", "").strip()
    if t:
        return t
    for p in _token_candidates():
        if os.path.exists(p):
            t = _token_from_file(p)
            if t and " " not in t:
                return t
    where = os.path.join(_kiki_root() or "<kiki 폴더>", "token.txt")
    raise RuntimeError(
        f"dooray 토큰이 필요합니다. {where} 의 'Dooray token:' 다음 줄에 토큰을 붙여넣고 저장하세요 "
        "(발급: https://kist.gov-dooray.com/setting/api/token). 채팅창에는 붙여넣지 마세요(노출 위험).")


class DoorayDrive:
    def __init__(self, token: str | None = None, timeout: int = 30):
        self.token = token or _load_token()
        self.timeout = timeout
        self.s = requests.Session()
        self.s.headers.update({"Authorization": f"dooray-api {self.token}", "Accept": "application/json"})

    def web_url(self, folder_id: str) -> str:
        return f"https://kist.gov-dooray.com/drive/{PROJECT}/{folder_id}"

    # ---------- 목록 ----------
    def list_files(self, parent_id: str | None = None, size: int = 100) -> list[dict]:
        out, page = [], 0
        while True:
            params = {"page": page, "size": size}
            if parent_id:
                params["parentId"] = parent_id
            r = self.s.get(f"{API}/drive/v1/drives/{DRIVE}/files", params=params, verify=False, timeout=self.timeout)
            d = r.json()
            batch = d.get("result") or []
            out += batch
            total = d.get("totalCount", len(out))
            if len(batch) < size or len(out) >= total:
                break
            page += 1
            time.sleep(0.15)  # rate limit (5/s)
        return out

    @staticmethod
    def _is_dept(name: str) -> bool:
        return bool(re.match(r"^\d{2}\s", name)) or ("연구소" in name) or ("연구본부" in name)

    def _subdir_names(self, folder_id: str) -> list[str]:
        return [f.get("name", "") for f in self.list_files(folder_id) if f.get("type") == "folder"]

    def _is_rpa_folder(self, folder_id: str) -> bool:
        subs = self._subdir_names(folder_id)
        return any(any(k in s for k in _RPA_MARK) for s in subs)

    # ---------- 행정원 폴더 검색 ----------
    # 반환: [{name, id, web, isRPA, path}]  (isRPA=정식 RPA 폴더 여부)
    # dept_hint 주면 그 본부 폴더만 훑어 빠름(수 초). 없으면 root 전수+본부재귀(최대 ~5분).
    # progress: 진행 표시 콜백 (예 print). 호출측이 "검색 중…" 표시에 사용.
    def find_admin_folder(self, name: str, dept_hint: str | None = None, progress=None):
        def emit(msg):
            if progress:
                progress(msg)
        hits, seen = [], set()

        def scan(parent, path):
            for f in self.list_files(parent):
                if f.get("type") != "folder":
                    continue
                nm, fid = f.get("name", ""), f.get("id")
                if name in nm and fid not in seen:
                    seen.add(fid)
                    hits.append({"name": nm, "id": fid, "web": self.web_url(fid),
                                 "isRPA": self._is_rpa_folder(fid), "path": path})

        if dept_hint:
            full = DEPT_ALIAS.get(dept_hint, dept_hint)
            emit(f"[검색 중] 본부 '{dept_hint}'({full}) 폴더 탐색…")
            depts = [f for f in self.list_files(None)
                     if f.get("type") == "folder" and full in f.get("name", "")]
            for d in depts:
                emit(f"[검색 중] {d.get('name')} 안에서 '{name}' 찾는 중…")
                scan(d.get("id"), d.get("name"))
            if hits:
                return hits
            emit("[검색 중] 본부에서 못 찾음 → 전체 검색으로 전환(최대 5분)…")

        # 전수: root + 본부 재귀
        emit("[검색 중] 전체 drive 검색… (root 8천여 항목 + 본부, 최대 5분 — 멈춘 게 아닙니다)")
        root = self.list_files(None)
        for f in root:
            if f.get("type") != "folder":
                continue
            nm, fid = f.get("name", ""), f.get("id")
            if name in nm and fid not in seen:
                seen.add(fid)
                hits.append({"name": nm, "id": fid, "web": self.web_url(fid),
                             "isRPA": self._is_rpa_folder(fid), "path": "(root)"})
        for f in root:
            if f.get("type") == "folder" and self._is_dept(f.get("name", "")):
                emit(f"[검색 중] {f.get('name')} …")
                scan(f.get("id"), f.get("name"))
        return hits

    # 행정원 폴더의 업로드 위치 구조: 카드(root) / 세금계산서 / 회의비 하위 폴더 id
    def folder_structure(self, admin_folder_id: str) -> dict:
        subs = [f for f in self.list_files(admin_folder_id) if f.get("type") == "folder"]
        def find(kw):
            for f in subs:
                if kw in f.get("name", ""):
                    return {"id": f.get("id"), "name": f.get("name")}
            return None
        return {
            "card": {"id": admin_folder_id, "name": "(행정원 폴더 root = 카드 직접)"},
            "taxInvoice": find("세금계산서"),
            "meeting": find("회의비"),
            "hasSeparate": bool(find("세금계산서") or find("회의비")),
        }

    # ---------- 업로드 (api → 307 → file-api, 토큰만 들고 manual follow) ----------
    def upload(self, folder_id: str, file_path: str, mime: str = "application/octet-stream") -> dict:
        fname = os.path.basename(file_path)
        with open(file_path, "rb") as f:
            content = f.read()
        first = f"{API}/drive/v1/drives/{DRIVE}/files"
        r0 = self.s.post(first, params={"parentId": folder_id},
                         files={"file": (fname, content, mime)},
                         verify=False, allow_redirects=False, timeout=self.timeout)
        if r0.status_code != 307:
            try:
                return r0.json()
            except Exception:
                return {"_status": r0.status_code, "_raw": r0.text[:200]}
        loc = r0.headers["Location"]
        r1 = self.s.post(loc, files={"file": (fname, content, mime)}, verify=False, timeout=60)
        try:
            return r1.json()
        except Exception:
            return {"_status": r1.status_code, "_raw": r1.text[:200]}


# ---------- 처리완료 로컬 아카이브 (이동/복사) ----------
def archive_local(file_path: str, acccd: str, mode: str = "move", base: str | None = None) -> str:
    """업로드 완료 파일을 <영수증폴더>/지급신청완료/{과제번호}/ 로 이동(move)·복사(copy). keep=그대로."""
    import shutil
    if mode == "keep":
        return file_path
    base = base or os.path.dirname(file_path)
    dest_dir = os.path.join(base, "지급신청완료", acccd)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, os.path.basename(file_path))
    if mode == "copy":
        shutil.copy2(file_path, dest)
    else:
        shutil.move(file_path, dest)
    return dest


if __name__ == "__main__":
    # 간이 점검: python dooray_drive.py find <이름> [본부약어]
    c = DoorayDrive()
    if len(sys.argv) >= 3 and sys.argv[1] == "find":
        dept = sys.argv[3] if len(sys.argv) >= 4 else None
        for h in c.find_admin_folder(sys.argv[2], dept, progress=lambda m: print(m, file=sys.stderr)):
            print(f"{'[정식]' if h['isRPA'] else '[비정식]'} {h['path']}/{h['name']}  {h['web']}")
    else:
        print("usage: python dooray_drive.py find <행정원이름> [본부약어]")
