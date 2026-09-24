// ============================================================
// kk-mail 코어 — KIST Dooray 메일 관리 (window.kkMail)
// ------------------------------------------------------------
// 동작 원리: kist.gov-dooray.com 탭의 "세션 쿠키"로 internal wapi 호출.
//   → API 토큰/비번 불필요 (credential 0). 본인 SSO 로그인 세션만 있으면 동작.
// 사용법: 이 파일을 Read → Chrome MCP javascript_tool 로 1회 inject →
//   이후 window.kkMail.<함수>() 호출. (개인정보·하드코딩 식별자 없음)
// 출력 제약: javascript_tool 반환은 ~1,000자 truncation + `a=b`/URL/긴 숫자 필터 → 아래 "출력 도우미" 참조.
// ============================================================
(function () {
  // internal wapi 필수 헤더 — 없으면 일부 endpoint가 -200200 거부 또는
  // 200 OK + contents:[] 의 silent fail.
  const H = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'dooray-api-version': '1.1',
    'dooray-caller': 'WEB',
    'dooray-mail-api-version': '1.2',
    'dooray-drive-api-version': '1.1',
  };

  async function dfetch(url, { method = 'GET', body = null } = {}) {
    const opts = { method, credentials: 'include', headers: H };
    if (body != null) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const r = await fetch(url, opts);
    return r.json();
  }

  // ---------- 폴더 조회 ----------
  // 시스템(inbox/sent/spam/trash...) + 사용자 폴더 전체. credential 없이 본인 폴더 자동 조회.
  async function findAllFolders() {
    const out = { system: [], user: [] };
    for (const t of ['system', 'user']) {
      const d = await dfetch(`/v2/wapi/mail-folders?type=${t}&size=1000`);
      const arr = (d.result && d.result.contents) ? d.result.contents : (Array.isArray(d.result) ? d.result : []);
      out[t] = arr.map(f => ({ id: f.id, name: f.name, type: t, total: f.totalCount }));
    }
    return out;
  }

  // 이름으로 폴더 1개 찾기 (시스템+사용자). 못 찾으면 null.
  async function findFolderId(name) {
    const all = await findAllFolders();
    for (const t of ['user', 'system']) {
      const hit = all[t].find(f => f.name === name);
      if (hit) return { id: hit.id, name: hit.name, type: t };
    }
    return null;
  }

  // 폴더 확보: 있으면 반환, 없으면 생성. (생성/삭제 형식 확정: 2026-06-04 DevTools 캡처)
  async function ensureFolder(name) {
    const found = await findFolderId(name);
    if (found) return { ...found, created: false };
    const made = await tryCreateFolder(name);
    if (made) return { ...made, created: true };
    return { needManual: true, name };  // 만일 생성 실패 시 수동생성 안내 fallback
  }

  // 사용자 폴더 생성 — POST /mail-folders/create-path, body=[{name,order}] (⚠️ 배열, order=기존 max+1).
  async function tryCreateFolder(name) {
    const d = await dfetch('/v2/wapi/mail-folders?type=user&size=1000');
    const arr = (d.result && d.result.contents) ? d.result.contents : [];
    const maxOrder = Math.max(0, ...arr.map(f => f.displayOrder || 0));
    const res = await dfetch('/v2/wapi/mail-folders/create-path', { method: 'POST', body: [{ name, order: maxOrder + 1 }] });
    if (res.header && res.header.isSuccessful) {
      const re = await findFolderId(name);
      if (re) return re;
    }
    return null;
  }

  // 폴더 삭제 — DELETE /mail-folders/{id}. (정리·롤백용)
  async function deleteFolder(folderId) {
    return dfetch(`/v2/wapi/mail-folders/${folderId}`, { method: 'DELETE' });
  }

  // ---------- 메일 조회 ----------
  // 받은편지함을 기간(days)으로 필터. 분류용 핵심 필드만 추출.
  async function listInbox({ days = 7, size = 200 } = {}) {
    const d = await dfetch(`/v2/wapi/mails?folderName=inbox&size=${size}&page=0&order=-createdAt`);
    const c = (d.result && d.result.contents) ? d.result.contents : [];
    const cutoff = Date.now() - days * 86400000;
    const recent = c.filter(m => new Date(m.createdAt).getTime() >= cutoff);
    return { totalInbox: d.result ? d.result.totalCount : null, fetched: c.length, recent: recent.map(summarize) };
  }

  async function listFolderMails(folderId, { size = 50 } = {}) {
    const d = await dfetch(`/v2/wapi/mails?folderId=${folderId}&size=${size}&page=0&order=-createdAt`);
    const c = (d.result && d.result.contents) ? d.result.contents : [];
    return c.map(summarize);
  }

  // 메일 1건 → 분류·검색 판단용 핵심 필드. (발신자/제목/날짜/읽음/첨부수/id)
  //   read   = 사용자 화면의 읽음/안 읽음 표시 (POST /mails/read|unread 로 토글)
  //   opened = 한 번이라도 열린 적 있음 (상세 GET 시 true 로 굳음, 되돌릴 수 없음) — 표시용으로는 read 를 쓸 것
  function summarize(m) {
    const f = (m.users && m.users.from && m.users.from.emailUser) ? m.users.from.emailUser : {};
    const flags = (m.mailSummary && m.mailSummary.flags) ? m.mailSummary.flags : {};
    return {
      id: m.id,
      date: (m.createdAt || '').slice(0, 16).replace('T', ' '),
      fromName: f.name || '',
      fromEmail: f.emailAddress || '',
      subject: m.subject || '',
      read: !!flags.read,
      opened: !!flags.opened,
      fileCount: m.fileCount || 0,
      folderId: m.folderId || '',
    };
  }

  // ---------- Tier 4: 찾기 — 페이징 목록 + 본문 (2026-09-24 실증) ----------
  // 폴더의 메일을 최신순으로 페이지를 넘기며 수집. since(YYYY-MM-DD)/sinceDays 보다 오래된 메일이 나오면 중단.
  //   opt = { folder:'inbox'|'sent'|... (시스템 folderName) | folderId:'...', sinceDays?:90, since?:'YYYY-MM-DD', until?:'YYYY-MM-DD', maxPages?:6, size?:500 }
  // 반환 { total, fetched, pages, mails:[summarize + url] }. 실측: size 500 × 3페이지(1,500건) ≈ 2.5초. size 1000 도 허용.
  // ⚠️ 목록엔 본문 미리보기(previewText)가 비어 있다 → 본문 단서는 getMail 로.
  async function listMails(opt = {}) {
    const size = opt.size || 500, maxPages = opt.maxPages || 6;
    const sinceTs = opt.since ? new Date(opt.since).getTime() : (opt.sinceDays ? Date.now() - opt.sinceDays * 86400000 : 0);
    const untilTs = opt.until ? new Date(opt.until).getTime() + 86400000 : Infinity;
    const folder = opt.folder || 'inbox';
    const base = opt.folderId ? `folderId=${opt.folderId}` : `folderName=${folder}`;
    const urlOf = (m) => opt.folderId ? `/mail/folders/${opt.folderId}/${m.id}` : `/mail/systems/${folder}/${m.id}`;
    const out = { total: null, fetched: 0, pages: 0, mails: [] };
    for (let p = 0; p < maxPages; p++) {
      const d = await dfetch(`/v2/wapi/mails?${base}&size=${size}&page=${p}&order=-createdAt`);
      const c = (d.result && d.result.contents) ? d.result.contents : [];
      if (out.total == null && d.result) out.total = d.result.totalCount;
      out.fetched += c.length; out.pages++;
      let stop = c.length < size;
      for (const m of c) {
        const ts = new Date(m.createdAt).getTime();
        if (ts < sinceTs) { stop = true; break; }
        if (ts < untilTs) { const s = summarize(m); s.url = 'https://kist.gov-dooray.com' + urlOf(m); out.mails.push(s); }
      }
      if (stop) break;
    }
    return out;
  }

  // HTML 본문 → 읽기용 텍스트 (style/script 제거, 블록 요소 줄바꿈)
  function htmlToText(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('style,script,head,title').forEach(e => e.remove());
    doc.querySelectorAll('br,p,div,tr,li,h1,h2,h3,h4,h5,h6,blockquote').forEach(e => e.insertAdjacentText('afterend', '\n'));
    return (doc.body ? doc.body.textContent : '').replace(/[ \t\u00a0]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  }

  // 읽음/안 읽음 표시 (UI 툴바 "읽음"/"안 읽음" 과 동일 호출, 2026-09-24 캡처)
  async function markRead(mailIdList) { return dfetch('/v2/wapi/mails/read', { method: 'POST', body: { mailIdList } }); }
  async function markUnread(mailIdList) { return dfetch('/v2/wapi/mails/unread', { method: 'POST', body: { mailIdList } }); }

  // 메일 1건 본문. GET /v2/wapi/mails/{id} → result.content.{subject, createdAt, users, body:{mimeType,content(HTML)}, fileList[]}
  // ⚠️ 이 GET 은 서버가 그 메일을 읽음(read=true, opened=true)으로 바꾼다(실측). 목록에서 read=false 였던 메일은
  //    조회 직후 markUnread 로 read 를 복원한다(wasRead 를 넘길 것). opened 는 되돌릴 수 없지만 화면 표시엔 read 만 쓰인다.
  async function getMail(id, { wasRead = null, restoreUnread = true, maxChars = 20000 } = {}) {
    const d = await dfetch(`/v2/wapi/mails/${id}`);
    const c = (d.result && d.result.content) || {};
    const html = (c.body && c.body.content) || '';
    const text = htmlToText(html).slice(0, maxChars);
    const from = (c.users && c.users.from && c.users.from.emailUser) || {};
    const to = ((c.users && c.users.to) || []).map(u => (u.emailUser && u.emailUser.emailAddress) || '').filter(Boolean);
    const files = (c.fileList || []).map(f => f.name || f.fileName || f.originalName || f.originalFileName || '').filter(Boolean);
    let restored = false;
    if (restoreUnread && wasRead === false) { await markUnread([id]); restored = true; }
    return { id, subject: c.subject || '', date: (c.createdAt || '').slice(0, 16).replace('T', ' '), fromName: from.name || '', fromEmail: from.emailAddress || '',
      to, files, text, textLen: text.length, htmlLen: html.length, restoredUnread: restored };
  }

  // 후보 여러 건 본문 순차 조회 (rate limit: burst 20/초당 5 → 건당 delayMs 간격). items = listMails 의 mails 항목(id·read 포함) 또는 id 문자열.
  async function getMails(items, { delayMs = 300, maxChars = 8000 } = {}) {
    const out = [];
    for (const it of items) {
      const id = typeof it === 'string' ? it : it.id;
      const wasRead = typeof it === 'string' ? null : it.read;
      try { out.push(await getMail(id, { wasRead, maxChars })); }
      catch (e) { out.push({ id, error: String(e).slice(0, 120) }); }
      await new Promise(r => setTimeout(r, delayMs));
    }
    return out;
  }

  // ---------- Tier 1: 스팸 신고 (휴지통 + 학습 + 발신자 차단) ----------
  // idList: 메일 id 배열 (N건 일괄). 항상 호출측이 사용자 confirm 후 실행.
  async function reportSpam(idList, { applyBefore = true, addReject = true } = {}) {
    return dfetch('/v2/wapi/mails/report-spam-hacking', {
      method: 'POST',
      body: {
        idList,
        spamOptions: { reportSpam: true, applyBeforeMail: applyBefore, applyBeforeMailFolders: ['inbox'] },
        hackingOptions: { reportHacking: false, reportReason: '' },
        addRejectFromEmail: addReject,
      },
    });
  }

  // ---------- Tier 2: 폴더 이동 (1회성, 과거 메일) ----------
  async function moveMails(mailIdList, targetFolderId, targetFolderName) {
    return dfetch('/v2/wapi/mails/move', {
      method: 'POST',
      body: { targetFolderId, targetFolderName, mailIdList },
    });
  }

  // ---------- Tier 3: 자연어 자동분류 규칙 엔진 ----------
  // 규칙 1건 생성. 조건은 from(발신) 또는 subject(제목 키워드).
  //   spec = { fromEmails?:[], subjectKeywords?:[], toFolderName, applyBefore?, operator?, applyOrder? }
  // ⚠️ Dooray 제약: 배열 POST 시 "첫 1건만" 생성 → 단건 호출. from.type은 include만(not_include -200200).
  // ⚠️ 같은 도메인 두 용도 분기는 applyOrder로 — 정확주소(예 nzine@nrf.re.kr)를 도메인(nrf.re.kr)보다 작게(먼저).
  async function createRule(spec) {
    const folder = await ensureFolder(spec.toFolderName);
    if (folder.needManual) return { needManualFolder: folder.name };
    const condition = { operator: spec.operator || 'and' };
    if (spec.fromEmails && spec.fromEmails.length) condition.from = { type: 'include', value: spec.fromEmails };
    if (spec.subjectKeywords && spec.subjectKeywords.length) condition.subject = { type: 'include', value: spec.subjectKeywords };
    const rule = {
      condition,
      action: { toFolder: { id: folder.id, name: folder.name, type: folder.type === 'system' ? 'system' : 'user' } },
      type: 'auto_classification',
      applyBeforeMail: spec.applyBefore !== false,
      applyBeforeMailFolders: ['inbox', 'user_folders'],
    };
    if (spec.applyOrder != null) rule.applyOrder = spec.applyOrder;  // 우선순위(낮을수록 먼저 적용)
    // 단건 배열 POST (Dooray 제약)
    const res = await dfetch('/v2/wapi/mail-rules', { method: 'POST', body: [rule] });
    return { folder, rule, res };
  }

  async function listMailRules() {
    const d = await dfetch('/v2/wapi/mail-rules?size=1000&page=0&types=auto_classification');
    const res = d.result || {};
    return Array.isArray(res) ? res : (res.contents || []);
  }

  async function deleteMailRule(ruleId) {
    return dfetch(`/v2/wapi/mail-rules/${ruleId}`, { method: 'DELETE' });
  }

  // ---------- Tier 4-A: 서버 검색 (POST /v2/wapi/mails/search — Dooray 검색창과 동일 호출, 2026-09-24 캡처·실측) ----------
  // terms: ['한양대'] 단어 배열. 원소끼리 AND, 한 원소 안의 띄어쓰기('한양대 화공세미나')는 구절(인접) 매칭. 대상 = 제목·본문·발신자 전체.
  //   기간: since/before ('YYYY-MM-DD' 또는 ISO 시각; 서버는 ISO 시각+타임존만 받으므로 날짜면 보정) 또는 sinceDays. until/period 등 다른 이름은 조용히 무시된다.
  //   폴더 지정 파라미터 없음(folderName 무시, 받은·보낸 모두) — exceptFolders(시스템 폴더 이름, 기본 draft/spam/trash 제외)만. 결과 folder 로 사후 필터.
  //   응답: result.contents[{id}] + references.mailMap[id](목록과 같은 메일 객체 + mailSummary.previewText 본문 앞 ~300자) + references.folderMap[id]{name,type}.
  //   실측: size 100 OK / '한양대' 전체 237건, 2024년 34건 즉시 / 본문에만 있는 구절도 hit.
  async function searchMails(terms, opt = {}) {
    const size = opt.size || 100, maxPages = opt.maxPages || 5;
    const iso = (d, end) => /T/.test(d) ? d : d + (end ? 'T23:59:59+09:00' : 'T00:00:00+09:00');
    const body = { exceptFolders: opt.exceptFolders || ['draft', 'spam', 'trash'], all: Array.isArray(terms) ? terms : [String(terms)],
      page: 0, order: opt.order || '-createdAt', highlight: true, size };
    if (opt.since) body.since = iso(opt.since, false); else if (opt.sinceDays) body.since = new Date(Date.now() - opt.sinceDays * 86400000).toISOString();
    if (opt.before) body.before = iso(opt.before, true);
    const out = { total: null, fetched: 0, pages: 0, mails: [] }, folders = {};
    for (let p = 0; p < maxPages; p++) {
      body.page = p;
      const d = await dfetch('/v2/wapi/mails/search?preview=true', { method: 'POST', body });
      if (!d.result) { out.error = (d.header && (d.header.resultMessage || d.header.resultCode)) || 'no result'; break; }
      const cs = d.result.contents || [], refs = d.result.references || {}, mm = refs.mailMap || {};
      Object.assign(folders, refs.folderMap || {});
      if (out.total == null) out.total = d.result.totalCount;
      out.fetched += cs.length; out.pages++;
      for (const c of cs) {
        const m = mm[c.id]; if (!m) continue;
        const s = summarize(m), f = folders[m.folderId] || {};
        s.preview = ((m.mailSummary && m.mailSummary.previewText) || '').slice(0, 400);
        s.folder = f.name || '';
        s.url = 'https://kist.gov-dooray.com' + (f.type === 'system' ? `/mail/systems/${f.name}/${m.id}` : `/mail/folders/${m.folderId}/${m.id}`);
        out.mails.push(s);
      }
      if (cs.length < size) break;
    }
    return out;
  }
  // 동의어 묶음별로 검색해 합치고 중복 제거(최신순). groups = [['한양대'], ['hanyang'], ['한양대학교', '세미나']]
  async function searchMany(groups, opt = {}) {
    const seen = new Map(); let totalSum = 0;
    for (const g of groups) {
      const r = await searchMails(g, opt); totalSum += r.total || 0;
      for (const m of r.mails) if (!seen.has(m.id)) seen.set(m.id, m);
      await new Promise(res => setTimeout(res, 200));
    }
    return { totalSum, mails: Array.from(seen.values()).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) };
  }

  // ---------- 출력 도우미 (Claude in Chrome javascript_tool 제약 대응, 2026-09-24 실측) ----------
  // (1) 반환 문자열은 약 1,000자에서 [TRUNCATED] → 결과를 window 에 두고 fmtList/fmtBody 로 조각내어 회수한다.
  // (2) 출력 필터: `a=b` 꼴이 있으면 통째로 [BLOCKED: Cookie/query string], URL·긴 숫자열(메일 id)도 가려진다
  //     → sanitize: = & ? ; 제거, URL→[url], 8자리 이상 숫자→#, '/'→'>'. 메일 id 는 hyId(4자리마다 '-')로만 노출.
  //     링크는 https://kist.gov-dooray.com/mail/systems/inbox/<id> (hyId 의 '-' 를 지워 조합).
  function sanitize(s) {
    return String(s == null ? '' : s).replace(/https?:\S+/gi, '[url]').replace(/[=&?;]/g, ' ').replace(/\d{8,}/g, '#').replace(/\//g, '>');
  }
  function hyId(id) { return String(id).replace(/(\d{4})(?=\d)/g, '$1-'); }
  // 목록 정규식 1차 선별(제목·발신자·발신주소). Claude 가 동의어·영문·약어를 넓혀 만든 정규식을 넘긴다.
  //   excludeFrom: 발신 주소 제외 정규식(예 /kist\.re\.kr$/i 로 사내 공지 제외). ⚠️ 약어는 대소문자 구분·단어경계로(/HYU/i 는 'Hyun' 에 걸린다).
  function pick(mails, re, { excludeFrom } = {}) {
    return (mails || []).filter(m => (re.test(m.subject) || re.test(m.fromName) || re.test(m.fromEmail)) && !(excludeFrom && excludeFrom.test(m.fromEmail)));
  }
  // 목록 한 조각: idx | 날짜 | R/U | 첨부수 | 발신 | 제목 [폴더] [| 미리보기 pv자] [| id(하이픈)]. 12줄 ≈ 800자(pv 를 주면 줄을 줄일 것).
  function fmtList(mails, from = 0, to = 12, { subj = 44, who = 14, ids = false, pv = 0 } = {}) {
    mails = mails || [];
    const rows = mails.slice(from, to).map((m, k) =>
      sanitize(`${from + k} | ${m.date.slice(5)} | ${m.read ? 'R' : 'U'} | att${m.fileCount} | ${(m.fromName || m.fromEmail).slice(0, who)} | ${m.subject.slice(0, subj)}`
        + (m.folder && m.folder !== 'inbox' ? ` [${m.folder}]` : '') + (pv && m.preview ? ' | ' + m.preview.slice(0, pv) : '')) + (ids ? ' | ' + hyId(m.id) : ''));
    return `[${from}-${Math.min(to, mails.length)} of ${mails.length}]\n` + rows.join('\n');
  }
  // 본문 1건: 머리 1줄(제목·날짜·발신·첨부·복원 여부) + 본문 chars 자. 긴 본문은 offset 을 옮겨 이어 읽는다.
  function fmtBody(b, chars = 700, offset = 0) {
    if (!b) return 'no body';
    if (b.error) return 'ERR ' + sanitize(b.error);
    const files = b.files.length ? ` (${b.files.slice(0, 3).join(', ').slice(0, 80)})` : '';
    const head = `${b.subject.slice(0, 40)} | ${b.date.slice(5)} | ${b.fromName || b.fromEmail} | files ${b.files.length}${files} | txt ${b.textLen}${b.restoredUnread ? ' | unread restored' : ''}`;
    return sanitize(head + '\n' + b.text.slice(offset, offset + chars));
  }
  // "그 메일 열어줘" 할 때만: 현재 탭에서 그 메일로 이동(열면 읽음 처리됨 → 사용자가 말했을 때만).
  function openMail(m) { location.assign(m.url || ('https://kist.gov-dooray.com/mail/systems/inbox/' + m.id)); return 'opening'; }

  // ---------- export ----------
  window.kkMail = {
    dfetch, findAllFolders, findFolderId, ensureFolder, deleteFolder,
    listInbox, listFolderMails, summarize,
    listMails, getMail, getMails, htmlToText, markRead, markUnread,
    searchMails, searchMany,
    pick, fmtList, fmtBody, sanitize, hyId, openMail,
    reportSpam, moveMails,
    createRule, listMailRules, deleteMailRule,
    _version: 'kk-mail-ops/1.3',
  };
  return window.kkMail._version;
})();
