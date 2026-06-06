# 소액검수신청(mcs_0003) 검수창 — 필드맵 + Chrome MCP 절차

> `<config.xxx>`는 사용자 `config.json` 값으로 치환. 개인정보는 여기 적지 않는다.

## 화면 구조
- 진입: 소액검수신청(mcs_0003) — `http://p.kist.re.kr:8081/nxui/kistis/indexQ.jsp?target=mis.mcs::mcs_0003.xfdl&menuParam=sysCd%3DCUS` → 제목 "검수신청관리"(리스트) → 우상단 "검수신청"(`button1`) → 팝업 `mcs_0003_pop2`("소액검수신청")
- 팝업은 **window.open 별도 chrome page**(부모 탭과 다른 page). 부모 탭에서 `window._popupWin` 으로 호출하고 form 객체는 `application.popupframes.mcs_0003_pop2.form` 으로도 접근 가능. **파일첨부는 자동화 가능** (별도 page 패턴 — §파일첨부 참조). 부모 탭 스크린샷은 팝업 내용 안 잡힘(별도 page) → 필요하면 그 page 를 select 한 뒤 캡처.
- dataset 3종:
  - `ds_main_PRCT_INFO` — 공통정보 (신청일시·지역·건물·호실·지급신청자·검수신청자)
  - `ds_main_NOT_ASST_INFO` — **비자산** 물품정보
  - `ds_main_ASST_INFO` — **자산** 물품정보

## Chrome MCP 절차 (재사용 JS)

**0. 진입** — `list_connected_browsers` → `select_browser` → `tabs_context_mcp({createIfEmpty:true})` → `navigate`(위 URL) → wait 7s → 제목 "검수신청관리" 확인.

**1. 팝업 열기** (window.open 후킹 + 검수신청 버튼 클릭)
```js
(() => {
  if (!window.__nativeOpen) { const t=document.createElement('iframe'); t.style='display:none';
    document.body.appendChild(t); window.__nativeOpen=t.contentWindow.open.bind(window); t.remove(); }
  window.open=function(u,n,f){ window._popupWin=window.__nativeOpen(u,n,f); return window._popupWin; };
  const b=document.getElementById('mainframe_ChildFrame_form_button1'); const r=b.getBoundingClientRect();
  ['mousedown','mouseup','click'].forEach(t=>b.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,view:window,clientX:r.x+r.width/2,clientY:r.y+r.height/2,button:0})));
  return 'clicked';
})()
```
→ wait 9s → 포획 확인: `(()=>{const p=window._popupWin; return p&&!p.closed&&p.application.popupframes.mcs_0003_pop2 ? 'OK '+p.document.title : 'no popup';})()`

**2. 공통정보 + 물품 입력** (비자산 예시 — ⚠️ 승인번호 input06 절대 입력 금지)
```js
(() => {
  const form = window._popupWin.application.popupframes.mcs_0003_pop2.form;
  form.CheckBox00.set_value('Y');                       // 카드/계산서 정보없음
  form.input9.set_value('<영업일 YYYYMMDD, 공휴일X>');   // ★ 휴일이면 네이티브 모달→frozen
  form.combo2.set_value('<config.location.region_code>'); // 예 LABT_00
  form.combo3.set_value('<config.location.building_code>');// 건물코드 (code_tables.md)
  form.output1.set_value('<config.location.room>');        // 호실 문자열
  form.radio2.set_value('N');                              // N=비자산 / Y=자산
  // ❌ form.input06 (승인번호) 입력 금지 → ds_main_PRCT_INFO.RLTDMGRNO DB 10자 초과 ORA-12899
  const d = form.ds_main_NOT_ASST_INFO;                    // 자산이면 ds_main_ASST_INFO
  if (d.getRowCount()===0) d.addRow(); d.set_rowposition(0);
  d.setColumn(0,'PROD_NM','<품명 (2품목↑이면 "첫품목 규격 수량ea 외 N종")>');
  d.setColumn(0,'MDL_NM','<모델/물품코드>');
  d.setColumn(0,'QTY',<2품목↑면 종수 / 1품목이면 수량>);
  d.setColumn(0,'UNIT','<단위코드: 2품목↑=0154 종, 무형=0155 기타, 1품목=품목 단위>');
  d.setColumn(0,'OBT_AMT',<원화 취득가: 세금계산서 합계 또는 fam_0711 USEAMT>);
  d.setColumn(0,'OBT_DT','<YYYYMMDD 거래/사용일>');
  return 'done';
})()
```

**3. 지급신청자** (config 행정원 이름으로 검색, 비동기 → 단계 분리)
- `form.btn_input26.click()` → wait 4s
- 검색: `(()=>{const f=window._popupWin.application.popupframes.empSchPopup.form; f.ds_search.setColumn(0,'EMP_NM','<config.payment_admin.name>'); f.btn_search.click(); return'search';})()` → wait 3s
- 선택+확정: `(()=>{const f=window._popupWin.application.popupframes.empSchPopup.form; if(f.ds_empList.getRowCount()===0)return'0건'; f.ds_empList.set_rowposition(0); f.btn_confirm.click(); return JSON.stringify({nm:f.ds_empList.getColumn(0,'EMP_NM'),no:f.ds_empList.getColumn(0,'EMP_NO')});})()` (이름·사번 확인. 동명이인이면 사용자에게 확인)

**4. 검증** (RLTDMGRNO 가 비어있어야 ORA 에러 안 남)
```js
(() => {
  const form=window._popupWin.application.popupframes.mcs_0003_pop2.form;
  const p=form.ds_main_PRCT_INFO, d=form.radio2.value==='Y'?form.ds_main_ASST_INFO:form.ds_main_NOT_ASST_INFO;
  return JSON.stringify({신청일시:p.getColumn(0,'CCK_DTM'),지급신청자:p.getColumn(0,'FNSH_PTT_USER_NM'),
    RLTDMGRNO:String(p.getColumn(0,'RLTDMGRNO')),자산구분:form.radio2.value,
    품명:d.getColumn(0,'PROD_NM'),취득가:d.getColumn(0,'OBT_AMT'),취득일:d.getColumn(0,'OBT_DT')});
})()
```

**5. 첨부 + 신청 = 사용자.** 저장 성공 시 팝업 자동 닫힘. 다음 건은 1번부터 다시.

## 비자산 필드 (`ds_main_NOT_ASST_INFO`)
| 필드 | 컬럼 |
|------|------|
| 품명/모델 | PROD_NM / MDL_NM |
| 수량/단위 | QTY / UNIT |
| 취득가/취득일 | OBT_AMT / OBT_DT |
| 지급계정#1·2 | FNSH_ACC_1 / FNSH_ACC_2 (비자산은 보통 공란) |

## 자산 필드 (`ds_main_ASST_INFO`, radio2='Y')
| 필드 | 컬럼 | 입력 |
|------|------|------|
| 취득가/취득일 | OBT_AMT / OBT_DT | 값 |
| 도입방법 | IRTC_WAY | 콤보 01 국내/02 국외 |
| 구매물품분류 | PUR_PROD_CL_CD | 콤보 0040 연구장비/0041 공기구비품/0062 그래픽처리장치 |
| 자산표준분류 | ASST_STD_CL_CD | 검색팝업 |
| 품명/모델/원산지/수량/단위 | PROD_NM/MDL_NM/POO/QTY/UNIT | 값·콤보 |
| 생산업체/사용부서/사용자/사용책임자 | PRDN_FIRM/USE_OPS/PROD_USER/USE_RSPP | 검색팝업 |
| 설치장소/지급계정#1·2 | ISTL_PL/FNSH_ACC_1·2 | 값 / 검색(**자산은 과제계정 필수**) |
- 검색팝업 5종(생산업체·자산표준분류·사용자·사용책임자·지급계정) 내부구조는 자산 첫 실전 검수 때 확정(현재 코드 dataset 없음). empSchPopup 류 공통 패턴 예상.
- '사용자'=무기계약직 이상, '사용책임자'=비유동자산 직접 사용 부서장/연구책임자만.

## ⚠️ 함정
- **승인번호(input06→RLTDMGRNO) 입력 금지** — DB 10자, 24자 넣으면 `ORA-12899`. KIST 자체관리 칸이라 비운다.
- **신청일시(input9) 공휴일 회피** — calendaredit 에 휴일값 set → 네이티브 모달 → 페이지 frozen(CDP 45초 타임아웃, 사용자가 모달 닫아야 복구). 한국 공휴일표 확인 또는 사용자에게 날짜 확인.
- **비자산은 묶음**("외 N종" 1행), **자산은 품목별 개별 등록**(자산번호 부여). 한 거래에 자산·비자산 섞이면 분리 신청.

## 파일첨부 자동화 (2026-06-07 ★ codex 실증 — 패턴 B)
공통 가이드: [`../../_shared/nexacro_file_upload.md`](../../_shared/nexacro_file_upload.md) **§4 패턴 B**(별도 chrome page).
mcs_0003_pop2 는 `window.open` 으로 **부모 탭과 다른 chrome page** 라, A 패턴(부모에 임시 버튼 + extUp.addFiles()) 은 **실패한다** — chooser 가 부모 page 에서 발생해 팝업 form 에 안 묶임.

대신 ↓ 순서로:
1. **별도 page 선택**: DevTools `list_pages` → URL 에 `popup.html?formname=mis.mcs::mcs_0003_pop2.xfdl&framename=mcs_0003_pop2` 식별 → `select_page <pageId>`.
2. **실제 "파일추가" 버튼 UID 찾기**: 그 page 에서 `take_snapshot` → 내부에 `btn_selectFiles` 이미지 + "파일추가" 텍스트 가진 버튼 노드의 uid (세션마다 다름 — 예: `8_305`).
3. **그 UID 에 upload_file 직접**:
   ```
   chrome_devtools.upload_file({ uid: "<uid>", filePath: "D:\\…\\파일.pdf" })
   ```
   파일별 반복 (mcs_0003 실증).
4. **첨부 확인** (그 page 의 console 에서):
   ```js
   (() => {
     const form = window.application?.popupframes?.mcs_0003_pop2?.form
               || window.application?.mainframe?.ChildFrame?.form;
     const ds = form?.fileDiv1?.ds_files;       // ★ 컴포넌트 = fileDiv1 (kk-pay 는 importFileUpload)
     const out = [];
     for (let i=0; i<ds.getRowCount(); i++) out.push({
       idx:i, name:ds.getColumn(i,"FLE_NM"),
       tmHeader:ds.getColumn(i,"tmHeader"),     // I=선택만 / S=서버반영 / D=삭제예정
       size:ds.getColumn(i,"FLE_SZ"), prog:ds.getColumn(i,"PROG")
     });
     return out;
   })()
   ```
- **컴포넌트명**: `fileDiv1` (확정, 2026-06-07).
- **자산·비자산 1건 = 첨부 1셋**(세금계산서/거래명세서 PDF + 물품사진 JPG). 자산·비자산 섞인 거래는 분리 신청이라 첨부도 각각.
- 사용자에게 첨부 파일 절대경로·개수를 표로 보여주고 confirm 후 진행.
- **신청(저장) 버튼은 사용자 confirm** 후 — 첨부까지 자동, 신청만 사용자.
