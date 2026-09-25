// ============================================================
// kk-wiki 코어 — KIST Wiki 2.0 (Dooray 위키) 브라우저 경로 (window.kkWiki)
// ------------------------------------------------------------
// 동작 원리: kist.gov-dooray.com 탭(어느 화면이든 같은 도메인)의 세션 쿠키로 internal wapi 호출 → 토큰 불필요.
// 용도: (1) 토큰이 없는 사용자의 스냅샷 만들기 — 페이지 안에서 전체 수집 → export JSON 다운로드 → `wiki_snapshot.py import`
//       (2) 인용 전 최신 확인 checkFresh(ids) — 수정일·버전만 반환(출력 제약 안전)
// 토큰이 있으면 Python `wiki_snapshot.py crawl / fresh` 가 더 낫다(브라우저 불요, 출력 제한 없음).
// 사용법: 이 파일을 Read → javascript_tool 로 1회 inject → window.kkWiki.<함수>().
// ⚠️ 수집 중에는 그 탭을 앞에 두어야 한다 — 뒤로 가면 Chrome 이 타이머를 1초 단위로 늦춰 10배 느려진다(2026-09-25 실측).
// ⚠️ 출력 제약(javascript_tool ~1,000자·`a=b` 필터·긴 숫자 가림)은 kk-mail 과 같다 → 상태는 status(), id 는 hyId() 로.
// ============================================================
(function () {
  const H = { 'Accept': 'application/json, text/plain, */*', 'dooray-api-version': '1.1', 'dooray-caller': 'WEB' };
  const WEB = 'https://kist.gov-dooray.com';
  const DEFAULT_SPACE = '3538560283559420253', DEFAULT_HOME = '3538560286709555986';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function j(url) { const r = await fetch(url, { credentials: 'include', headers: H }); return r.json(); }

  // 자식 목록: GET /v2/wapi/wikis/{space}/pages?parentPageId=&size=500 → result.contents[] {pageId, subject, hasChildren, restricted, version, order}
  async function children(space, pid) {
    const d = await j(`/v2/wapi/wikis/${space}/pages?parentPageId=${pid}&size=500`);
    return (d.result && d.result.contents) || [];
  }
  // 페이지 상세: GET /v2/wapi/wikis/{space}/pages/{id} → result.content {subject, body{mimeType:'text/x-markdown', content}, lastUpdate{dateTime, member{name}}, create{dateTime}, version, files[], images[], restricted}
  async function getPage(space, pid) {
    const d = await j(`/v2/wapi/wikis/${space}/pages/${pid}`);
    return (d.result && d.result.content) || null;
  }
  function norm(c, n, space) {
    return { id: n.id, title: (c && c.subject) || n.title, parent: n.parent, depth: n.depth, path: n.path, version: c && c.version,
      updatedAt: c && c.lastUpdate && c.lastUpdate.dateTime || '', updatedBy: c && c.lastUpdate && c.lastUpdate.member && c.lastUpdate.member.name || '',
      createdAt: c && c.create && c.create.dateTime || '', mime: c && c.body && c.body.mimeType, body: (c && c.body && c.body.content) || '',
      files: ((c && c.files) || []).map(f => ({ id: f.id, name: f.name, size: f.size })), images: ((c && c.images) || []).length,
      restricted: !!(c && c.restricted), url: `${WEB}/wiki/${space}/${n.id}` };
  }

  const progress = { phase: 'idle', walked: 0, total: 0, pages: 0, errors: 0, t0: 0, t1: 0 };
  let tree = null, pages = null, lastErr = null;

  // 트리 walk (읽기 전용). '---' 구분선 페이지는 건너뛴다.
  async function walk(space = DEFAULT_SPACE, home = DEFAULT_HOME, { delayMs = 120 } = {}) {
    const out = [];
    async function rec(pid, depth, anc) {
      if (depth > 25) return;
      const kids = await children(space, pid); progress.walked++;
      for (const k of kids) {
        if (!k.pageId || /^-{3,}/.test(k.subject || '')) continue;
        const node = { id: k.pageId, title: k.subject || '', parent: pid, depth, path: anc.concat([k.subject || '']), hasChildren: !!k.hasChildren, restricted: !!k.restricted, version: k.version, order: k.order };
        out.push(node);
        if (k.hasChildren) await rec(k.pageId, depth + 1, node.path);
        await sleep(delayMs);
      }
    }
    await rec(home, 0, []);
    return out;
  }

  // 전체 수집(페이지 안에서 비동기 진행) — 호출 후 status() 로 진행 확인. 끝나면 exportSnapshot() 으로 파일 저장.
  function crawlAll({ space = DEFAULT_SPACE, home = DEFAULT_HOME, delayMs = 200 } = {}) {
    if (progress.phase === 'walk' || progress.phase === 'pages') return 'already running';
    Object.assign(progress, { phase: 'walk', walked: 0, total: 0, pages: 0, errors: 0, t0: Date.now(), t1: 0 }); lastErr = null; tree = null; pages = null;
    (async () => {
      try {
        const hp = await getPage(space, home);
        tree = await walk(space, home);
        progress.total = tree.length + 1; progress.phase = 'pages';
        const acc = [norm(hp, { id: home, title: (hp && hp.subject) || 'Home', parent: '', depth: 0, path: [(hp && hp.subject) || 'Home'] }, space)];
        progress.pages = 1;
        for (const n of tree) {
          try { acc.push(norm(await getPage(space, n.id), n, space)); }
          catch (e) { progress.errors++; acc.push({ id: n.id, title: n.title, parent: n.parent, depth: n.depth, path: n.path, error: String(e).slice(0, 100), url: `${WEB}/wiki/${space}/${n.id}` }); }
          progress.pages++;
          await sleep(delayMs);
        }
        pages = acc; progress.phase = 'done'; progress.t1 = Date.now();
      } catch (e) { lastErr = String(e); progress.phase = 'error'; }
    })();
    return 'started';
  }

  function status() {
    const p = progress, el = Math.round(((p.t1 || Date.now()) - (p.t0 || Date.now())) / 1000);
    return `phase ${p.phase} | walked ${p.walked} | tree ${p.total} | pages ${p.pages} | errors ${p.errors} | ${el}s` + (lastErr ? ' | ERR ' + lastErr.slice(0, 80) : '');
  }

  // export JSON 다운로드(브라우저 다운로드 폴더). ⚠️ 사용자 확인 후 호출(파일명·크기 알리고).
  function exportSnapshot({ space = DEFAULT_SPACE, home = DEFAULT_HOME, filename } = {}) {
    if (!pages) return 'no pages yet — crawlAll() 먼저';
    const d = new Date(), ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const name = filename || `kist_wiki_${ymd}.json`;
    const text = JSON.stringify({ space_id: space, home_page_id: home, exported_at: d.toISOString(), count: pages.length, pages });
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    return `download ${name} (${Math.round(text.length / 1024)} KB, ${pages.length} pages)`;
  }
  function sizeEstimate() { return pages ? Math.round(JSON.stringify(pages).length / 1024) + ' KB' : 'no pages'; }

  // 인용 전 최신 확인 — 수정일·버전만(출력 제약 안전). ids: 페이지 id 배열.
  async function checkFresh(ids, { space = DEFAULT_SPACE } = {}) {
    const out = [];
    for (const id of ids) {
      try { const c = await getPage(space, id); out.push({ id, updatedAt: c && c.lastUpdate && c.lastUpdate.dateTime || '', version: c && c.version, title: c && c.subject || '' }); }
      catch (e) { out.push({ id, error: String(e).slice(0, 80) }); }
      await sleep(150);
    }
    return out;
  }

  // ---------- 담당자표: 포탈 게시판 "부서별업무분장표" (그룹웨어 xClick, 게시판 id FC_BBS224) — ✅ 2026-09-25 실측 ----------
  // 진입: 포탈(p.kist.re.kr, 첫 화면 팝업 닫기) 상단 '게시판' → 그 화면은 그룹웨어(ngw.kist.re.kr) iframe. 탭을 그 iframe 주소로 직접 띄운 뒤
  //   왼쪽 메뉴 '부서별업무분장표'(movePage FC_BBS224) 를 누르면 목록 프레임에 frmList 폼이 생긴다. 이 코어는 그 폼을 복제해 fetch POST 한다.
  //   목록: command=listArticle, nextpage=/bbs/articleGenList.jsp, paging_listcnt=100, currpage_no=p  (169건 = 2페이지)
  //   본문: command=viewArticle, nextpage=/bbs/articleView.jsp, articleId, bbsId, position(목록 링크의 첫 인자 — '0'/'1' 을 그대로 넘겨야 함, 틀리면 error.jsp)
  //   본문 표 = 헤더에 '직무'와 '담당'이 있는 가장 안쪽 <table> (직무구분 | 직무 내용 | 담당 '이름 (내선)'). 이미지로만 올린 팀은 표가 없다.
  //   데이터 반출: staffRender() 로 문서를 <pre> 덤프로 바꾼 뒤 get_page_text 로 읽는다(30,000자 이상 한 번에 읽힘 — javascript_tool 의 1,000자 제한 우회).
  const STAFF_BBS = 'FC_BBS224';
  const normTeam = s => String(s || '').replace(/[·ㆍ・]/g, '·').trim();
  function staffFrame() {
    let best = null;
    const walk = (win, depth) => {
      if (depth > 3) return;
      let doc; try { doc = win.document; if (!doc) return; } catch (e) { return; }
      if (doc.forms && doc.forms['frmList']) { const n = doc.querySelectorAll('a[onclick*="viewArticle"]').length; if (!best || n > best.n) best = { win, doc, n }; }
      let n = 0; try { n = win.frames.length; } catch (e) { return; }
      for (let i = 0; i < n; i++) walk(win.frames[i], depth + 1);
    };
    walk(window, 0);
    return best;
  }
  const cellTxt = td => (td.textContent || '').replace(/\s+/g, ' ').trim();
  async function bbsPost(fr, fields) {
    const fd = new FormData(fr.doc.forms['frmList']);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    const r = await fetch(fr.win.location.origin + '/xclick_kist/XClickController', { method: 'POST', body: fd, credentials: 'include' });
    return new DOMParser().parseFromString(await r.text(), 'text/html');
  }
  // 목록 전체 → 팀별 최신 글(글번호 최대). 반환 { rows, latest:[{team,id,pos,no,title,poster,date}] }
  async function staffList({ maxPages = 3 } = {}) {
    const fr = staffFrame(); if (!fr) throw new Error('부서별업무분장표 목록 프레임(frmList)이 없다 — 게시판 화면에서 왼쪽 메뉴를 먼저 열 것');
    const rows = [], seen = new Set();
    for (let p = 1; p <= maxPages; p++) {
      const d = await bbsPost(fr, { facade: 'BBSArticleFacade', command: 'listArticle', nextpage: '/bbs/articleGenList.jsp', transaction_yn: 'N', paging_listcnt: '100', listSelect: '100', currpage_no: String(p), bbsId: STAFF_BBS });
      const links = Array.from(d.querySelectorAll('a[onclick*="viewArticle"]'));
      for (const a of links) {
        const m = (a.getAttribute('onclick') || '').match(/viewArticle\('([^']*)',\s*'([^']+)'/); if (!m || seen.has(m[2])) continue; seen.add(m[2]);
        const inner = a.closest('table'); const outer = inner ? inner.closest('tr') : a.closest('tr');
        const cells = outer ? Array.from(outer.children).map(cellTxt) : [];
        const title = (a.textContent || '').trim().replace(/\s+/g, ' ');
        const team = normTeam((title.match(/\]\s*\[([^\]]+)\]/) || title.match(/^\[([^\]]+)\]/) || [])[1] || '');
        rows.push({ id: m[2], pos: m[1], team, no: parseInt(cells[2]) || 0, title, poster: cells[5] || '', date: cells[6] || '' });
      }
      if (links.length < 100) break;
      await sleep(300);
    }
    const latest = {};
    for (const r of rows) if (r.team && (!latest[r.team] || r.no > latest[r.team].no)) latest[r.team] = r;
    return { rows, latest: Object.values(latest).sort((a, b) => b.no - a.no) };
  }
  const staffProgress = { phase: 'idle', done: 0, total: 0 };
  let staffData = null, staffErr = null;
  // 글 1건 열람 = 'URL복사' 공유 주소(GET dispatcherArticleView.jsp?articleId=<id>&userid=SESSIONNOCHECK)를 숨은 iframe 에 띄우고
  //   안쪽 프레임 DOM 에서 표를 읽는다. (viewArticle 폼 POST 를 흉내 내면 상당수 글이 error.jsp — 세션 목록 position 의존. 2026-09-25 실측)
  //   같은 주소가 사용자에게 줄 게시글 링크이기도 하다. 이미지로 올린 표(contentImgs>0)는 텍스트로 못 읽는다 → 링크만.
  function shareUrl(id) { return `${location.origin}/xclick_kist/dispatcherArticleView.jsp?articleId=${id}&userid=SESSIONNOCHECK`; }
  function deepestArticleDoc(win) {
    let best = null; let doc; try { doc = win.document; } catch (e) { return null; }
    if (doc && doc.body) { const t = doc.body.innerText || ''; if (/업무분장|업무 분장|담당/.test(t)) best = { doc, len: t.length }; }
    let n = 0; try { n = win.frames.length; } catch (e) { return best; }
    for (let i = 0; i < n; i++) { const b = deepestArticleDoc(win.frames[i]); if (b && (!best || b.len > best.len)) best = b; }
    return best;
  }
  async function readArticleViaIframe(item, timeoutMs = 20000) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-2000px;top:0;width:1200px;height:900px;'; document.body.appendChild(f);
    f.src = shareUrl(item.id);
    const t0 = Date.now(); let res = null;
    while (Date.now() - t0 < timeoutMs) {
      await sleep(700);
      const b = deepestArticleDoc(f.contentWindow);
      if (b && b.len > 150) {
        await sleep(900);                                   // 본문 표 렌더 여유
        const d = b.doc;
        const cands = Array.from(d.querySelectorAll('table')).filter(tb => { const first = tb.querySelector('tr'); if (!first) return false; const cells = Array.from(first.children).map(cellTxt); return cells.some(c => /직무|업무|구분/.test(c)) && cells.some(c => /담당|성명|이름/.test(c)) && !tb.querySelector('table table'); });
        const txt = (d.body.innerText || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
        const posterM = txt.match(/게시자\s*:\s*([^\n]+?)\s*(?:>|\n)/);
        res = Object.assign({}, item, { textLen: txt.length, tables: cands.map(tb => Array.from(tb.querySelectorAll('tr')).map(tr => Array.from(tr.children).map(cellTxt))),
          contentImgs: Array.from(d.querySelectorAll('img')).filter(i => /DownController/.test(i.getAttribute('src') || '')).length,
          poster: item.poster || (posterM ? posterM[1].trim() : ''), url: shareUrl(item.id), ms: Date.now() - t0 });
        break;
      }
    }
    f.remove();
    return res || Object.assign({}, item, { error: 'timeout', tables: [], contentImgs: 0, url: shareUrl(item.id) });
  }
  // 팀별 최신 글 → 표. 비동기(페이지 안), staffStatus() 로 진행 확인. 끝나면 kkWiki.staff 에 배열. 실측 23건 ≈ 1분.
  //   list 를 주면(staffList().latest 형식 [{id,team,no,date,title,poster}]) 목록 조회를 건너뛴다(게시판 프레임이 없는 탭에서도 동작).
  function staffCollect({ list = null, teamFilter = null } = {}) {
    Object.assign(staffProgress, { phase: 'list', done: 0, total: 0 }); staffData = null; staffErr = null;
    (async () => {
      try {
        const latest = list || (await staffList()).latest;
        const targets = latest.filter(t => !teamFilter || teamFilter.test(t.team));
        staffProgress.total = targets.length; staffProgress.phase = 'articles';
        const out = [];
        for (const t of targets) { out.push(await readArticleViaIframe(t)); staffProgress.done++; }
        staffData = out; staffProgress.phase = 'done';
      } catch (e) { staffErr = String(e); staffProgress.phase = 'error'; }
    })();
    return 'started';
  }
  function staffStatus() { return `phase ${staffProgress.phase} | ${staffProgress.done}/${staffProgress.total}` + (staffErr ? ' | ERR ' + staffErr.slice(0, 100) : '') + (staffData ? ` | teams ${staffData.length}, tables ${staffData.filter(x => x.tables.length).length}, errors ${staffData.filter(x => x.error).length}` : ''); }
  // 덤프 문자열(wiki_staff.py import 형식)
  function staffDump() {
    if (!staffData) return '';
    const L = [`=== KKWIKI-STAFF v1 | exported ${new Date().toISOString()} | board ${STAFF_BBS} | teams ${staffData.length} ===`];
    for (const t of staffData) {
      L.push(`## 팀: ${t.team} | 글번호 ${t.no} | 게시일 ${t.date} | 게시자 ${t.poster || ''} | 제목 ${t.title || ''} | id ${t.id} | url ${t.url || shareUrl(t.id)}`);
      const tb = (t.tables || []).slice().sort((a, b) => b.length - a.length)[0];
      if (tb && tb.length > 1) { for (const row of tb) L.push('| ' + row.map(c => c.replace(/\|/g, '/')).join(' | ') + ' |'); }
      else L.push(t.error ? `(표 없음 — ${t.error})` : `(표 없음 — 이미지 게시글, 이미지 ${t.contentImgs || 0}개: 링크에서 직접 확인)`);
      L.push('');
    }
    L.push('=== END ===');
    return L.join('\n');
  }
  // 현재 문서를 덤프 <pre> 로 바꾼다(그룹웨어 화면은 사라짐 → 읽은 뒤 새로고침). 사용자 화면이 바뀌므로 미리 알릴 것.
  function staffRender() {
    const s = staffDump(); if (!s) return 'no staff data';
    document.documentElement.innerHTML = '<head><meta charset="utf-8"><title>kk-wiki staff dump</title></head><body><pre id="kkOut">' + s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre></body>';
    return `rendered ${s.length} chars, ${staffData.length} teams — get_page_text 로 읽은 뒤 wiki_staff.py import`;
  }

  // 출력 도우미 (kk-mail 과 동일 제약)
  function sanitize(s) { return String(s == null ? '' : s).replace(/https?:\S+/gi, '[url]').replace(/[=&?;]/g, ' ').replace(/\d{8,}/g, '#').replace(/\//g, '>'); }
  function hyId(id) { return String(id).replace(/(\d{4})(?=\d)/g, '$1-'); }
  function fmtFresh(list) { return (list || []).map(x => `${hyId(x.id)} | ${(x.updatedAt || '').slice(0, 19)} | v${x.version} | ${sanitize((x.title || x.error || '').slice(0, 40))}`).join('\n'); }

  window.kkWiki = { children, getPage, walk, crawlAll, status, exportSnapshot, sizeEstimate, checkFresh, sanitize, hyId, fmtFresh,
    staffFrame, staffList, staffCollect, staffStatus, staffDump, staffRender, shareUrl, readArticleViaIframe, get staff() { return staffData; }, staffProgress,
    get tree() { return tree; }, get pages() { return pages; }, progress, _version: 'kk-wiki-ops/1.1' };
  return window.kkWiki._version;
})();
