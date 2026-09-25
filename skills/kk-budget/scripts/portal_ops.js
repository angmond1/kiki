// ============================================================
// kk-budget 코어 — KIST 통합정보 예실대비표 조회 (window.kkBudget)
// ------------------------------------------------------------
// 동작 원리: p.kist.re.kr:8081 (NEXACRO) 탭의 "세션 쿠키 + window.application.authTk"
//   로 backend 를 fetch 직접 호출. → 화면 클릭·좌표 0, 해상도/모니터 무관.
//   (2026-06-02 실증: 과제목록 / 예실대비표 카테고리 A·집행·계류·잔액 전부 fetch 성공,
//    화면 스크린샷과 1:1 대조 검증.)
// 사용법: 통합정보 NEXACRO 화면 1개 연 뒤(아무 화면이나, authTk 확보용) 이 파일을
//   Read -> javascript_tool 로 inject -> window.kkBudget.* 호출.
// credential 없음(세션 쿠키 + 페이지 authTk). 개인 식별자 하드코딩 없음.
// 상세 endpoint·컬럼 매핑은 references/budget_fetch_spec.md.
// ============================================================
(function () {
  // ---- 공통 (shared/kist_portal.md 준용) ----
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
    var r = await fetch(path, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8' }, body: body,
    });
    return r.text();
  }

  function decodeEnt(s) {
    return String(s)
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  }

  function parseRows(xml) {
    var out = [], rowRe = /<Row[^>]*>([\s\S]*?)<\/Row>/g, m;
    while ((m = rowRe.exec(xml))) {
      var o = {}, cr = /<Col id="([^"]+)">([\s\S]*?)<\/Col>/g, cm;
      while ((cm = cr.exec(m[1]))) o[cm[1]] = decodeEnt(cm[2]);
      out.push(o);
    }
    return out;
  }

  function num(s) { return parseInt(String(s || '0').replace(/[^0-9-]/g, '')) || 0; }

  // 예산항목 코드(BUDGITEMCD) -> 표시명
  var CAT_MAP = {
    '15': '재료비', '11': '시설장비비', '33': '활동비1', '34': '활동비2',
    '05': '내부인건비2', '31': '학생인건비', '01': '내부인건비1',
    '30': '간접비(통합)', '61': '간접비(주요사업)', '07': '지식재산권관리비',
    '19': '위탁연구개발비', '29': '연구수당',
  };

  // ---- 수행과제 조회 (rdm_2011 / doSearchMain) ----
  // 반환: [{acccd, name, pi, projType}]  ※ projType=과제유형(주관/공동), 본인역할은 pi==본인 비교로.
  async function queryProjects() {
    var xml = await post('/mis/rdm/rdm2011/doSearchMain.do',
      nexBody('rdm_2011', 'doSearchMain', ds('ds_search', ['SRCHKND', 'SRCHVAL', 'SRCHPROCESS'], { SRCHKND: 'anyThing', SRCHPROCESS: '0' })));
    return parseRows(xml).filter(function (o) { return o.ACCCD; })
      .map(function (o) { return { acccd: o.ACCCD, name: o.PROJNM, pi: o.KORNM, projType: o.PROJTYPE }; });
  }

  // ---- 예실대비표 (bdg_2030: getBdgInfo -> getMainList) ----
  // 반환: {acccd, totBudg, categories:{표시명:{code,clsName,A,first,carry,exec,pendingDone,pendingProg,D,rate}}, direct:{A,D}}
  //  - A=최종예산 first=최초 carry=이월 exec=집행(B) pendingDone=계류결재완료 pendingProg=계류결재진행 D=잔액
  //  - direct = 직접비 분류(LEV1) 전체 합산 (= 화면 "소계 [직접비]")
  //  검산: A == D + exec + pendingDone + pendingProg
  async function queryBudgetTable(acccd) {
    // 1) getBdgInfo -> ACCCLSCD (getMainList 필수 파라미터) + 과제 총예산
    var biXml = await post('/bdg/bdg2030/getBdgInfo.do',
      nexBody('bdg_2030', 'getBdgInfo', ds('ds_search', ['BUDGSBJCD', 'BUDGYEAR'], { BUDGSBJCD: acccd, BUDGYEAR: '9999' })));
    var meta = parseRows(biXml)[0] || {};
    var accls = meta.ACCCLSCD || '6';
    // 2) getMainList (BUDGYEAR=9999 + acccd + ACCCLSCD -> 카테고리 LEV1 A/집행/계류/잔액)
    var mlXml = await post('/bdg/bdg2030/getMainList.do',
      nexBody('bdg_2030', 'getMainList', ds('ds_main', ['BUDGYEAR', 'BUDGSBJCD', 'ACCCLSCD'], { BUDGYEAR: '9999', BUDGSBJCD: acccd, ACCCLSCD: accls })));
    var rows = parseRows(mlXml);
    var cats = {}, dA = 0, dD = 0;
    rows.forEach(function (r) {
      if (r.LEV !== '1' || !r.BUDGITEMCD) return;            // 카테고리 행만 (세부 LEV2/소계 제외)
      var nm = (r.BUDGITEMNM || '').replace(/&#32;/g, ' ');
      if (!/^\d+\s*:/.test(nm)) return;
      var label = CAT_MAP[r.BUDGITEMCD] || nm;
      var it = {
        code: r.BUDGITEMCD, clsName: r.BUDGITEMCLSNM,
        A: num(r.LASTBUDGAMT), first: num(r.FRSTBUDGAMT), carry: num(r.BF_BALAMT),
        exec: num(r.CTRLPERFAMT), pendingDone: num(r.CTRLCAUSAMT), pendingProg: num(r.TEMPAMT),
        D: num(r.BALNAMT), rate: r.BAL_RATE,
      };
      cats[label] = it;
      if (r.BUDGITEMCLSNM === '직접비') { dA += it.A; dD += it.D; }
    });
    return { acccd: acccd, totBudg: num(meta.TOTBUDGAMT), categories: cats, direct: { A: dA, D: dD } };
  }

  window.kkBudget = {
    authTk: authTk, ready: ready, nexBody: nexBody, ds: ds, post: post,
    parseRows: parseRows, decodeEnt: decodeEnt, num: num, CAT_MAP: CAT_MAP,
    queryProjects: queryProjects, queryBudgetTable: queryBudgetTable,
    _version: 'kk-budget-portal/1.0',
  };
  return window.kkBudget._version + ' =^.^=';
})();
