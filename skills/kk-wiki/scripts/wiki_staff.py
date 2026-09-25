# -*- coding: utf-8 -*-
"""kk-wiki 담당자표 — 포탈 게시판 "부서별업무분장표"(그룹웨어 xClick, FC_BBS224) 부서별 최신 게시글의 직무·담당(내선) 표를 로컬에 두고 검색.

수집은 브라우저 코어(kk_wiki_ops.js: staffList → staffCollect → staffRender)가 그룹웨어 탭 안에서 하고,
Claude 가 `get_page_text` 로 읽은 덤프를 파일로 저장하면 이 스크립트가 파싱한다(로그인 세션 필요, 토큰 API 없음).

사용:
  python wiki_staff.py import <dump.txt>        # staffRender 덤프 → staff/staff.json + staff.md (이전본은 staff/_history/)
  python wiki_staff.py find 출장 여비            # 직무구분·직무내용에서 단어 AND 검색 → 팀 | 직무 | 담당 (내선) | 기준일
  python wiki_staff.py team 재무팀               # 한 팀의 표 전체
  python wiki_staff.py status                   # 팀 수·수집일·표 없는(이미지) 팀
스냅샷 위치: <kiki_root>/wiki/staff/ (내부 자료 — 각자 PC 에만).
"""
from __future__ import annotations
import argparse, io, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wiki_snapshot import snapshot_root  # noqa: E402


def staff_dir(root: str) -> str:
    d = os.path.join(root, "staff")
    os.makedirs(d, exist_ok=True)
    return d


def norm_team(s: str) -> str:
    return re.sub(r"[·ㆍ・]", "·", (s or "").strip())


_NAME = re.compile(r"^[가-힣]{2,4}(\s*(스쿨)?사무국장|\s*팀장)?(\s*[(（][^)）]*[)）])?([,/·\s]+[가-힣]{2,4}(\s*[(（][^)）]*[)）])?)*$")
_PHONE = re.compile(r"^[☎☏]?\s*\d{4}(\s+\d{4})*$")
_DUTY_MARK = re.compile(r"^[◦oㅇㅁ⁃‧․\-\*•·]\s?|^\d+\.\s")


def _is_staffish(c: str) -> bool:
    c = c.strip()
    if not c or c == "-":
        return False
    return bool(_NAME.match(c) or _PHONE.match(c) or re.match(r"^[가-힣]{2,4}\s*[(（]\s*[☎☏]?\d{4}", c) or re.match(r"^팀장$", c))


def _is_header(cells: list) -> bool:
    joined = " ".join(cells)
    return (any(re.search(r"담당|성\s*명|이름", c) for c in cells) and any(re.search(r"구분|분류|항\s*목|업무|직무|내용|연락처|번호", c) for c in cells)
            and not any(_PHONE.match(c) for c in cells) and len(joined) < 80)


def _col_type(h: str, i: int, n: int) -> str:
    """헤더 셀 → 열 종류. 구분·분류·항목 = role / 세부·내용·업무·직무 = duty(담당업무 포함) / 담당·성명·이름·연락처·내선·정·부 = staff / 첫 열 번호 = index."""
    h = h or ""
    if i == 0 and re.search(r"^(번\s*호|No\.?|순번)$", h, re.I):
        return "index"
    if re.search(r"구분|분류|항\s*목", h):
        return "role"
    if re.search(r"세부|내용|업무|직무", h) and not re.match(r"^담당(자)?(\s*[(（].*[)）])?$", h):
        return "duty"
    if re.search(r"담당|성\s*명|이름|연락처|내선|^정$|^부$", h) or (i == n - 1 and re.search(r"번호", h)):
        return "staff"
    return "role"


def _col_types(header: list) -> list:
    types = [_col_type(h, i, len(header)) for i, h in enumerate(header)]
    duties = [i for i, t in enumerate(types) if t == "duty"]
    for i in duties[:-1]:                     # duty 열이 여럿이면 마지막만 업무, 앞은 구분(예: 업무 | 업무내용 | 담당자)
        types[i] = "role"
    if "duty" not in types:                   # duty 가 없으면 staff 앞의 마지막 role 을 업무로
        roles = [i for i, t in enumerate(types) if t == "role"]
        if roles:
            types[roles[-1]] = "duty"
    return types


def _eff_header(cur: dict) -> list:
    """헤더 + 보조 헤더를 펼친 실제 열 목록. [항목|업무내용|담당자]+[정|부] → [항목,업무내용,담당자(정),담당자(부)],
    [업무 분류|담당(지원)]+[대분류|중분류|소분류] → [대분류,중분류,소분류,담당(지원)]."""
    header = list(cur.get("header") or [])
    sub = cur.get("subheader") or []
    if header and sub:
        types = _col_types(header)
        if all(re.match(r"^(정|부)$", c) for c in sub):
            si = [i for i, t in enumerate(types) if t == "staff"]
            if si:
                i = si[-1]
                header = header[:i] + [header[i] + "(" + c + ")" for c in sub] + header[i + 1:]
        elif len(sub) >= 2:
            ri = [i for i, t in enumerate(types) if t != "staff"]
            if ri:
                i = ri[0]
                header = header[:i] + sub + header[i + 1:]
    return header


def _n_staff_cols(cur: dict) -> int:
    """실제 열 목록에서 담당 계열 열 수(담당자·정·부·연락처·내선·마지막 '번호')."""
    header = _eff_header(cur)
    n = sum(1 for t in _col_types(header) if t == "staff") if header else 0
    return max(n, 1)


def _map_by_header(cells: list, header: list):
    types = _col_types(header)
    role = " > ".join(c for c, t in zip(cells, types) if t == "role" and c)
    duty = " ".join(c for c, t in zip(cells, types) if t == "duty")
    staff = " / ".join(c for c, t in zip(cells, types) if t == "staff" and c and c != "-")
    return {"role": role, "duties": duty, "staff": staff}


def _map_full_row(cur: dict, cells: list):
    """셀 수가 실제 열 수와 같으면 열 종류대로 배치. 담당 열이 가운데 오는 표('구분|성명|세부내용|연락처')는
    셀이 모자라도(앞 구분 열이 rowspan) 오른쪽 정렬로 배치한다."""
    header = _eff_header(cur)
    if not header:
        return None
    if len(cells) == len(header):
        return _map_by_header(cells, header)
    types = _col_types(header)
    staff_idx = [i for i, t in enumerate(types) if t == "staff"]
    duty_idx = [i for i, t in enumerate(types) if t == "duty"]
    if staff_idx and duty_idx and min(staff_idx) < max(duty_idx) and 1 < len(cells) < len(header):
        return _map_by_header(cells, header[len(header) - len(cells):])      # 담당이 가운데 → 오른쪽 정렬
    return None


def _add_row(cur: dict, cells: list) -> None:
    """표 형식이 팀마다 다르다(직무|내용|담당 / 항목|내용|정|부 / 대·중·소분류|담당 / 성명|연락처|업무 / 번호|대|중|내용|정|부).
    규칙: 헤더의 담당 계열 열 수(n)만큼 오른쪽 셀 = 담당(단, 긴 문장은 담당이 아님), 남은 셀의 마지막 = 업무, 그 앞 = 구분.
    rowspan 으로 빠진 구분·담당은 직전 행에서 이어받는다. '성명|연락처|업무' 꼴(사무국)은 왼쪽이 담당."""
    cells = [c for c in cells if c != ""]
    if not cells:
        return
    header = cur.get("header") or []
    prev = cur["rows"][-1] if cur["rows"] else None
    if header and re.search(r"성\s*명|이름", header[0] or ""):          # 담당이 왼쪽
        staff = cells[0] + (" (" + cells[1] + ")" if len(cells) > 2 and _PHONE.match(cells[1]) else "")
        cur["rows"].append({"role": "", "duties": " ".join(cells[2:] if len(cells) > 2 else cells[1:]), "staff": staff})
        return
    full = _map_full_row(cur, cells)
    if full:
        if not full["staff"] and prev:
            full["staff"] = prev["staff"]
        if not full["role"] and prev:
            full["role"] = prev["role"]
        cur["rows"].append(full)
        return
    if header and re.search(r"번호|No", header[0] or "", re.I) and re.match(r"^\d{1,3}$", cells[0]):
        cells = cells[1:]
    if len(cells) == 1:                                                  # 업무만 있는 행(구분·담당 rowspan)
        cur["rows"].append({"role": prev["role"] if prev else "", "duties": cells[0], "staff": prev["staff"] if prev else ""})
        return
    n = _n_staff_cols(cur)
    k = min(n, len(cells) - 1)
    # 담당 셀은 짧다(이름·내선). 긴 문장이 잡히면 담당 열 수를 줄인다
    while k > 0 and (len(cells[-k]) > 24 and not re.search(r"\d{4}", cells[-k]) and not _NAME.match(cells[-k])):
        k -= 1
    staff_cells, body = cells[len(cells) - k:] if k else [], cells[: len(cells) - k] if k else cells
    duties = body[-1]
    role = " > ".join(body[:-1]) if len(body) > 1 else (prev["role"] if prev else "")
    staff = " / ".join(c for c in staff_cells if c != "-") if staff_cells else (prev["staff"] if prev else "")
    cur["rows"].append({"role": role, "duties": duties, "staff": staff})


def parse_dump(text: str) -> dict:
    """staffRender 덤프 형식:
    === KKWIKI-STAFF v1 | exported ... | board ... | teams N ===
    ## 팀: 재무팀 | 글번호 77956 | 게시일 08-18 17:58 | 게시자 장승현 | 제목 ... | id NEW... | pos 0
    | 직무구분 | 직무 내용 | 담당 |
    | 팀장 | ◦ 재무업무 총괄 | 장승현 (6026) |
    (표 없음 — 이미지 게시글)
    """
    m = re.search(r"=== KKWIKI-STAFF v1 \| exported ([^|]+)\| board ([^|]+)\| teams (\d+) ===", text)
    meta = {"exported": (m.group(1).strip() if m else ""), "board": (m.group(2).strip() if m else ""), "teams_declared": int(m.group(3)) if m else 0}
    teams = []
    cur = None
    for line in text.splitlines():
        line = line.rstrip()
        if line.startswith("## 팀:"):
            fields = [x.strip() for x in line[6:].split("|")]
            cur = {"team": norm_team(fields[0]), "rows": [], "note": ""}
            for f in fields[1:]:
                for key, name in (("글번호", "no"), ("게시일", "date"), ("게시자", "poster"), ("제목", "title"), ("id", "id"), ("url", "url"), ("pos", "pos"), ("기준일", "asof")):
                    if f.startswith(key):
                        cur[name] = f[len(key):].strip()
            teams.append(cur)
        elif cur is not None and line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if not cells or re.match(r"^:?-+:?$", cells[0]):
                continue
            if _is_header(cells):
                cur["header"] = cells
                continue
            if all(len(c) <= 3 for c in cells) and not cur["rows"]:   # 정/부, 대분류|중분류|소분류 같은 보조 헤더
                cur["subheader"] = cells
                continue
            _add_row(cur, cells)
        elif cur is not None and line.startswith("(표 없음"):
            cur["note"] = line.strip("() ")
    # 기준일: 제목의 '26.8.28 / 2026.07.01 / 26.08.18 등에서 추출
    for t in teams:
        mm = re.search(r"[\(（'`‘]?\s*(\d{2,4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})", t.get("title", ""))
        if mm:
            y = mm.group(1); y = ("20" + y) if len(y) == 2 else y
            t["asof"] = f"{y}-{int(mm.group(2)):02d}-{int(mm.group(3)):02d}"
    return {"meta": meta, "teams": teams}


def cmd_import(root: str, paths: list) -> None:
    """여러 덤프를 합친다(뒤 파일이 같은 팀을 덮어씀 — OCR 보정본·재수집본 반영용)."""
    data = None
    for path in paths:
        d = parse_dump(io.open(path, encoding="utf-8-sig").read())
        if data is None:
            data = d
        else:
            by = {t["team"]: i for i, t in enumerate(data["teams"])}
            for t in d["teams"]:
                if t["team"] in by:
                    data["teams"][by[t["team"]]] = t
                else:
                    data["teams"].append(t)
    if not data or not data["teams"]:
        raise SystemExit("[kk-wiki] 덤프에서 팀을 찾지 못했습니다 (형식: '## 팀: ...' 줄 필요)")
    d = staff_dir(root)
    jp = os.path.join(d, "staff.json")
    if os.path.exists(jp):
        hist = os.path.join(d, "_history"); os.makedirs(hist, exist_ok=True)
        os.replace(jp, os.path.join(hist, f"staff_{time.strftime('%y%m%d_%H%M')}.json"))
    data["imported_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    json.dump(data, open(jp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    lines = [f"# 부서별 업무분장표 — 담당자 (수집 {data['imported_at'][:10]}, {len(data['teams'])}팀)", "",
             "출처: KIST 포탈 > 게시판 > 부서별업무분장표 (부서별 최신 게시글). 내부 자료 — 각자 PC 에만.", ""]
    for t in data["teams"]:
        lines.append(f"## {t['team']}  (게시글 #{t.get('no', '')}, 기준 {t.get('asof') or t.get('date', '')}, 게시자 {t.get('poster', '')})")
        if t.get("url"):
            lines.append(f"링크: {t['url']}")
        if t["rows"]:
            lines.append("| 직무구분 | 직무 내용 | 담당 |"); lines.append("|---|---|---|")
            for r in t["rows"]:
                lines.append(f"| {r['role']} | {r['duties']} | {r['staff']} |")
        else:
            lines.append(f"_{t.get('note') or '표 없음'} — 포탈 게시판에서 게시글 #{t.get('no', '')} 직접 확인_")
        lines.append("")
    io.open(os.path.join(d, "staff.md"), "w", encoding="utf-8", newline="\n").write("\n".join(lines))
    n_tbl = sum(1 for t in data["teams"] if t["rows"])
    print(f"[kk-wiki] 담당자표 저장: {len(data['teams'])}팀 (표 있음 {n_tbl}, 이미지·본문만 {len(data['teams']) - n_tbl}) → {d}")


def load(root: str) -> dict:
    jp = os.path.join(staff_dir(root), "staff.json")
    if not os.path.exists(jp):
        raise SystemExit("[kk-wiki] 담당자표가 없습니다 — 브라우저 코어로 수집 후 `wiki_staff.py import <dump.txt>`")
    return json.load(open(jp, encoding="utf-8"))


def cmd_find(root: str, terms: list, top: int) -> None:
    data = load(root)
    pats = [re.compile("|".join(re.escape(x) for x in t.split("|") if x), re.I) for t in terms]
    hits = []
    for t in data["teams"]:
        for r in t["rows"]:
            hay = f"{r['role']} {r['duties']}"
            if all(p.search(hay) for p in pats):
                score = sum(len(p.findall(hay)) for p in pats) + (3 if any(p.search(r["role"]) for p in pats) else 0)
                hits.append((score, t, r))
    hits.sort(key=lambda x: -x[0])
    print(f"[kk-wiki] 담당자 '{' AND '.join(terms)}' → {len(hits)}건 (수집 {data.get('imported_at', '')[:10]})")
    for score, t, r in hits[:top]:
        print(f"- {t['team']} | {r['role']} | {r['staff']} | 기준 {t.get('asof') or t.get('date', '')} | {r['duties'][:90]}" + (f"\n    링크 {t['url']}" if t.get('url') else ""))
    noimg = [t["team"] for t in data["teams"] if not t["rows"]]
    if noimg:
        print(f"  ※ 표가 이미지라 검색 안 되는 팀: {', '.join(noimg)}")


def cmd_team(root: str, name: str) -> None:
    data = load(root)
    for t in data["teams"]:
        if norm_team(name) in t["team"]:
            print(f"## {t['team']} (#{t.get('no', '')}, 기준 {t.get('asof') or t.get('date', '')}, 게시자 {t.get('poster', '')})")
            for r in t["rows"]:
                print(f"- {r['role']} | {r['staff']} | {r['duties'][:120]}")
            if not t["rows"]:
                print(f"  ({t.get('note') or '표 없음'})")
            return
    print("해당 팀 없음. 팀 목록:", ", ".join(t["team"] for t in data["teams"]))


def cmd_status(root: str) -> None:
    data = load(root)
    teams = data["teams"]
    print(f"[kk-wiki] 담당자표: {len(teams)}팀, 수집 {data.get('imported_at', '')}, 표 있음 {sum(1 for t in teams if t['rows'])}")
    for t in teams:
        print(f"  {t['team']:14s} #{t.get('no', ''):6s} 기준 {t.get('asof') or t.get('date', ''):10s} {'표 ' + str(len(t['rows'])) + '행' if t['rows'] else '(이미지·본문만)'}")


def main(argv=None):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["import", "find", "team", "status"])
    ap.add_argument("args", nargs="*")
    ap.add_argument("--root")
    ap.add_argument("--top", type=int, default=15)
    a = ap.parse_args(argv)
    root = snapshot_root(a.root)
    if a.cmd == "import":
        if not a.args:
            raise SystemExit("import <dump.txt> [보정덤프.txt ...]")
        cmd_import(root, a.args)
    elif a.cmd == "find":
        if not a.args:
            raise SystemExit("find <단어...>")
        cmd_find(root, a.args, a.top)
    elif a.cmd == "team":
        cmd_team(root, a.args[0] if a.args else "")
    elif a.cmd == "status":
        cmd_status(root)


if __name__ == "__main__":
    main()
