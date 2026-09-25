// ============================================================
// kk-pay 코어 (1) — KIST 통합정보시스템 조회 (window.kkPay)
// ------------------------------------------------------------
// 동작 원리: p.kist.re.kr:8081 (NEXACRO) 탭의 "세션 쿠키 + window.application.authTk"
//   로 backend 를 fetch 직접 호출. → 화면 클릭·좌표 0, 해상도/모니터 무관.
//   (2026-06-04 실증: 카드내역 11건 / 과제목록 / 검색조건 전부 fetch 성공)
// 사용법: 통합정보 NEXACRO 화면 1개 연 뒤(아무 화면이나, authTk 확보용) 이 파일을
//   Read → javascript_tool 로 inject → window.kkPay.* 호출.
// credential 없음(세션 쿠키 + 페이지 authTk). 개인 식별자 하드코딩 없음.
// ============================================================
(function () {
  // authTk: NEXACRO 가 매 요청 body 에 넣는 세션 토큰. 전역·쿠키 둘 다 존재, 세션 내 고정.
  function authTk() { return (window.application && window.application.authTk) || ''; }
  function ready() { return !!authTk(); }   // 통합정보 화면 로드(세션) 여부

  // NEXACRO SSV(XML) 요청 body 조립
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

  // NEXACRO 가 공백 등을 &#32; 로 인코딩 → decode
  function decodeEnt(s) {
    return String(s)
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  }

  // 응답 XML → Row 객체 배열 (정규식; 네임스페이스 무관)
  function parseRows(xml) {
    var out = [], rowRe = /<Row[^>]*>([\s\S]*?)<\/Row>/g, m;
    while ((m = rowRe.exec(xml))) {
      var o = {}, cr = /<Col id="([^"]+)">([\s\S]*?)<\/Col>/g, cm;
      while ((cm = cr.exec(m[1]))) o[cm[1]] = decodeEnt(cm[2]);
      out.push(o);
    }
    return out;
  }

  // ---------- 카드영수증 조회 (fam_0711 / getList) ----------
  // opt: { fromDt:'YYYYMMDD', toDt:'YYYYMMDD', cardType:'5'(법인)|'3'(연구비),
  //        empno:'00XXXX'(카드책임자 사번), custnm?, cardno? }
  // 반환: [{date, custnm, amount(원화청구액), apprno(승인번호), cardno, status}]
  async function queryCards(opt) {
    var cols = ['FROM_DT', 'TO_DT', 'CARDTYPECD', 'CARDRESPEREMPNO', 'SEARCHID', 'CUSTNM', 'CARDNO'];
    var row = {
      FROM_DT: opt.fromDt, TO_DT: opt.toDt,
      CARDTYPECD: opt.cardType || '5',
      CARDRESPEREMPNO: opt.empno, SEARCHID: opt.empno,
    };
    if (opt.custnm) row.CUSTNM = opt.custnm;
    if (opt.cardno) row.CARDNO = opt.cardno;
    var xml = await post('/mis/fam/fam0711/getList.do', nexBody('fam_0711', 'getList', ds('ds_search', cols, row)));
    return parseRows(xml).filter(function (o) { return o.CARDAPPRNO; }).map(function (o) {
      return { date: o.CARDUSEYMD, custnm: o.CUSTNM, amount: o.USEAMT, apprno: o.CARDAPPRNO, cardno: o.CARDNO, status: o.PRGRSSTATNM };
    });
  }

  // ---------- 수행과제 조회 (rdm_2011 / doSearchMain) ----------
  // 반환: [{acccd(과제번호), name(과제명), pi(책임자), type(주관/공동)}]
  async function queryProjects() {
    var cols = ['SRCHKND', 'SRCHVAL', 'SRCHPROCESS'];
    var xml = await post('/mis/rdm/rdm2011/doSearchMain.do', nexBody('rdm_2011', 'doSearchMain', ds('ds_search', cols, { SRCHKND: 'anyThing', SRCHPROCESS: '0' })));
    return parseRows(xml).filter(function (o) { return o.ACCCD; }).map(function (o) {
      return { acccd: o.ACCCD, name: o.PROJNM, pi: o.KORNM, type: o.PROJTYPE };
    });
  }

  // ---------- 카드책임자 이름 → 사번 (chkPopupValueSetting.do) ----------
  // 구조(2026-06-04 파악): 요청 Parameters UP_COMM_CD=이름·keyTableNm=VI_HRM_BAS_MGT·keyColNm=HOLD_OFFI·
  //   keyColVal=1·UP_COMM_COL_NM=EMP_NM·USE_RESNO=N·svcId=empSchPopup (Dataset 없음) /
  //   응답 Parameters EMP_NO(사번)·EMP_NM·DEPT_NM·result.
  // ⚠️ 미해결: 화면(NEXACRO) 에서 이름 Enter 로는 동작(응답에 EMP_NO 옴)하나, **동일 body 를 직접 fetch 하면
  //   빈 응답**(세션 상태/호출순서/referer 의존 추정). 아래 함수는 그대로 빈 결과일 수 있음 → referer 등 보강 후 활성.
  // → **현재 운용**: 카드책임자 사번은 config `cardHolderEmpno` 사용. 사번 모르면 첫 1회 fam_0711 화면에서
  //   카드책임자 칸에 이름 Enter → 옆에 뜨는 사번 확인 → config 저장. (skill 동작엔 지장 없음)
  async function nameToEmpno(name) {
    var body = '<?xml version="1.0" encoding="UTF-8"?>\n<Root xmlns="http://www.nexacroplatform.com/platform/dataset">\n<Parameters>\n'
      + '<Parameter id="authTk">' + authTk() + '</Parameter>\n'
      + '<Parameter id="keyTableNm">VI_HRM_BAS_MGT</Parameter>\n'
      + '<Parameter id="keyColNm">HOLD_OFFI</Parameter>\n'
      + '<Parameter id="keyColVal">1</Parameter>\n'
      + '<Parameter id="UP_COMM_COL_NM">EMP_NM</Parameter>\n'
      + '<Parameter id="UP_COMM_CD">' + name + '</Parameter>\n'
      + '<Parameter id="USE_RESNO">N</Parameter>\n'
      + '<Parameter id="pgmId">fam_0711</Parameter>\n'
      + '<Parameter id="svcId">empSchPopup</Parameter>\n'
      + '</Parameters>\n</Root>';
    var xml = await post('/popup/common/getRqstNoMgt/chkPopupValueSetting.do', body);
    function pick(id) { var m = xml.match(new RegExp('<Parameter id="' + id + '">([^<]*)</Parameter>')); return m ? m[1] : ''; }
    return { empno: pick('EMP_NO'), name: pick('EMP_NM'), dept: pick('DEPT_NM'), result: pick('result') };
  }

  window.kkPay = {
    authTk: authTk, ready: ready, nexBody: nexBody, post: post, parseRows: parseRows, ds: ds,
    queryCards: queryCards, queryProjects: queryProjects, nameToEmpno: nameToEmpno,
    _version: 'kk-pay-portal/1.0',
  };
  return window.kkPay._version + ' =^.^=';
})();
