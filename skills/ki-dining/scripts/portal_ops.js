// ============================================================
// ki-dining 코어 (1) — KIST 통합정보시스템 조회 (window.kidining)
// ------------------------------------------------------------
// 동작: p.kist.re.kr:8081 (NEXACRO) 탭의 세션쿠키 + window.application.authTk 로
//   backend 를 fetch 직접 호출. 화면 클릭·좌표 0, 해상도/모니터 무관.
//   (ki-rpa/portal_ops.js 의 카드·과제 조회 패턴 재사용 + 사전결재 fam_0100 추가)
// 사용법: 통합정보 NEXACRO 화면 1개 연 뒤(아무 화면, authTk 확보용) inject → window.kidining.*
// credential 없음(세션쿠키 + 페이지 authTk). 개인 식별자 하드코딩 없음.
// ============================================================
(function () {
  function authTk() { return (window.application && window.application.authTk) || ''; }
  function ready() { return !!authTk(); }

  function nexBody(pgmId, svcId, datasetXml) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<Root xmlns="http://www.nexacroplatform.com/platform/dataset">\n'
      + '<Parameters>\n'
      + '<Parameter id="authTk">' + authTk() + '</Parameter>\n'
      + '<Parameter id="pgmId">' + pgmId + '</Parameter>\n'
      + '<Parameter id="svcId">' + svcId + '</Parameter>\n'
      + '</Parameters>\n' + datasetXml + '\n</Root>';
  }
  function ds(id, cols, row) {
    var ci = cols.map(function (c) { return '<Column id="' + c + '" type="STRING" size="256"/>'; }).join('');
    var rc = Object.keys(row).map(function (k) { return '<Col id="' + k + '">' + row[k] + '</Col>'; }).join('');
    return '<Dataset id="' + id + '"><ColumnInfo>' + ci + '</ColumnInfo><Rows><Row>' + rc + '</Row></Rows></Dataset>';
  }
  async function post(path, body) {
    var r = await fetch(path, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'text/xml; charset=UTF-8' }, body: body });
    return r.text();
  }
  function decodeEnt(s) {
    return String(s).replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  }
  function parseRows(xml) {
    var out = [], rr = /<Row[^>]*>([\s\S]*?)<\/Row>/g, m;
    while ((m = rr.exec(xml))) {
      var o = {}, cr = /<Col id="([^"]+)">([\s\S]*?)<\/Col>/g, cm;
      while ((cm = cr.exec(m[1]))) o[cm[1]] = decodeEnt(cm[2]);
      out.push(o);
    }
    return out;
  }

  // ---------- 카드영수증 (fam_0711 / getList) — 단일 카드종류 ----------
  // cardType: '5'(법인) | '3'(연구비)
  async function queryCards(opt) {
    var cols = ['FROM_DT', 'TO_DT', 'CARDTYPECD', 'CARDRESPEREMPNO', 'SEARCHID', 'CUSTNM', 'CARDNO'];
    var row = { FROM_DT: opt.fromDt, TO_DT: opt.toDt, CARDTYPECD: opt.cardType || '5', CARDRESPEREMPNO: opt.empno, SEARCHID: opt.empno };
    if (opt.custnm) row.CUSTNM = opt.custnm;
    if (opt.cardno) row.CARDNO = opt.cardno;
    var xml = await post('/mis/fam/fam0711/getList.do', nexBody('fam_0711', 'getList', ds('ds_search', cols, row)));
    var kind = (opt.cardType === '3') ? '연구비' : '법인';
    return parseRows(xml).filter(function (o) { return o.CARDAPPRNO; }).map(function (o) {
      return { date: o.CARDUSEYMD, custnm: o.CUSTNM, amount: o.USEAMT, apprno: o.CARDAPPRNO, cardno: o.CARDNO, status: o.PRGRSSTATNM, cardKind: kind };
    });
  }

  // ---------- 카드 법인+연구비 둘 다 (회의비 후보용) ----------
  // 반환 건마다 cardKind('법인'|'연구비') 포함 → 리스트업 시 구분 표시.
  // 기간 미지정 시 호출측에서 화면 기본(직전 1개월) 사용. 여기선 fromDt/toDt 받음.
  async function queryCardsBoth(opt) {
    var corp = await queryCards(Object.assign({}, opt, { cardType: '5' }));
    var rsch = await queryCards(Object.assign({}, opt, { cardType: '3' }));
    return corp.concat(rsch);
  }

  // ---------- 수행/참여 과제 (rdm_2011 / doSearchMain) ----------
  // 반환: [{acccd, name, pi, projCode(분류코드 1자), preApprovalExempt(I/S/K)}]
  async function queryProjects() {
    var cols = ['SRCHKND', 'SRCHVAL', 'SRCHPROCESS'];
    var xml = await post('/mis/rdm/rdm2011/doSearchMain.do', nexBody('rdm_2011', 'doSearchMain', ds('ds_search', cols, { SRCHKND: 'anyThing', SRCHPROCESS: '0' })));
    return parseRows(xml).filter(function (o) { return o.ACCCD; }).map(function (o) {
      var mm = String(o.ACCCD).match(/\d+([A-Za-z])/);   // 숫자 뒤 첫 영문 = 분류코드 (26E0001 -> E, 2N00009 -> N)
      var code = mm ? mm[1].toUpperCase() : '';
      return { acccd: o.ACCCD, name: o.PROJNM, pi: o.KORNM, projCode: code, preApprovalExempt: (code === 'I' || code === 'S' || code === 'K') };
    });
  }

  // ---------- 회의비 사전내부결재 (fam_0100 / getList @ getListByBonbu.do) ----------
  // ⚠️ 본부 전체를 반환(발의자 서버필터 미적용) → 응답에서 acccd/date/발의자로 필터해야 함.
  //   opt: { fromDt, toDt, empName(발의자명), empno(발의자사번) }
  // 반환: [{date, purpose(회의목적=회의록제목), place, acccd, startTm, endTm, proposer(발의자), people}]
  async function queryPreApprovals(opt) {
    var cols = ['STRDNT', 'ENDDNT', 'KORNM', 'PAYNO', 'DEPTNM', 'DEPTCD', 'ACCPAYNO', 'ACCKORNM'];
    var row = { STRDNT: opt.fromDt, ENDDNT: opt.toDt };
    if (opt.empName) row.KORNM = opt.empName;
    if (opt.empno) row.PAYNO = opt.empno;
    var xml = await post('/mis/fam/fam0100/getListByBonbu.do', nexBody('fam_0100', 'getList', ds('ds_search', cols, row)));
    return parseRows(xml).filter(function (o) { return o.PRI_CONFER_DATE; }).map(function (o) {
      return {
        date: o.PRI_CONFER_DATE, purpose: o.PRI_CONFER_PERPOSE, place: o.PRI_CONFER_PLACE,
        acccd: o.PRI_CONFER_ACCCD, startTm: o.PRI_CONFER_STRTM, endTm: o.PRI_CONFER_ENDTM,
        proposer: o.KORNM, people: o.JOINPEOPLE,
      };
    });
  }

  // 사전결재 매칭: 카드건(date,acccd)에 맞는 사전결재 찾기.
  // 같은 과제(acccd) + 같은 날짜(date) 우선, 없으면 같은 과제+근접일.
  function matchPreApproval(list, cardDate, acccd) {
    var same = list.filter(function (p) { return p.acccd === acccd; });
    var exact = same.filter(function (p) { return p.date === cardDate; });
    if (exact.length) return exact[0];
    return null;   // 매칭 실패 → 호출측에서 회의제목 자동산출/확인
  }

  window.kidining = {
    authTk: authTk, ready: ready, nexBody: nexBody, ds: ds, post: post, parseRows: parseRows,
    queryCards: queryCards, queryCardsBoth: queryCardsBoth, queryProjects: queryProjects,
    queryPreApprovals: queryPreApprovals, matchPreApproval: matchPreApproval,
    _version: 'ki-dining-portal/1.0',
  };
  return window.kidining._version;
})();
