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

  // 출력 도우미 (kk-mail 과 동일 제약)
  function sanitize(s) { return String(s == null ? '' : s).replace(/https?:\S+/gi, '[url]').replace(/[=&?;]/g, ' ').replace(/\d{8,}/g, '#').replace(/\//g, '>'); }
  function hyId(id) { return String(id).replace(/(\d{4})(?=\d)/g, '$1-'); }
  function fmtFresh(list) { return (list || []).map(x => `${hyId(x.id)} | ${(x.updatedAt || '').slice(0, 19)} | v${x.version} | ${sanitize((x.title || x.error || '').slice(0, 40))}`).join('\n'); }

  window.kkWiki = { children, getPage, walk, crawlAll, status, exportSnapshot, sizeEstimate, checkFresh, sanitize, hyId, fmtFresh,
    get tree() { return tree; }, get pages() { return pages; }, progress, _version: 'kk-wiki-ops/1.0' };
  return window.kkWiki._version;
})();
