// ============================================================
// ki-mail 코어 — KIST Dooray 메일 관리 (window.kiMail)
// ------------------------------------------------------------
// 동작 원리: kist.gov-dooray.com 탭의 "세션 쿠키"로 internal wapi 호출.
//   → API 토큰/비번 불필요 (credential 0). 본인 SSO 로그인 세션만 있으면 동작.
// 사용법: 이 파일을 Read → Chrome MCP javascript_tool 로 1회 inject →
//   이후 window.kiMail.<함수>() 호출. (개인정보·하드코딩 식별자 없음)
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

  // 메일 1건 → 분류 판단용 핵심 필드. (발신자/제목/날짜/읽음/id)
  function summarize(m) {
    const f = (m.users && m.users.from && m.users.from.emailUser) ? m.users.from.emailUser : {};
    const flags = (m.mailSummary && m.mailSummary.flags) ? m.mailSummary.flags : {};
    return {
      id: m.id,
      date: (m.createdAt || '').slice(0, 16).replace('T', ' '),
      fromName: f.name || '',
      fromEmail: f.emailAddress || '',
      subject: m.subject || '',
      opened: !!flags.opened,
    };
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
  //   spec = { fromEmails?:[], subjectKeywords?:[], toFolderName, applyBefore?, operator? }
  // ⚠️ Dooray는 규칙 배열 POST 시 "첫 1건만" 생성됨 → 반드시 단건 호출.
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

  // ---------- export ----------
  window.kiMail = {
    dfetch, findAllFolders, findFolderId, ensureFolder, deleteFolder,
    listInbox, listFolderMails, summarize,
    reportSpam, moveMails,
    createRule, listMailRules, deleteMailRule,
    _version: 'ki-mail-ops/1.1',
  };
  return window.kiMail._version;
})();
