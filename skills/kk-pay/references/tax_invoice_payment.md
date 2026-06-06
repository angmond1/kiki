# fam_0702 일반 지급신청서(세금계산서) 자동작성

> 통합정보 fam_0701(지급신청서관리) → 신청서구분 **일반** → fam_0702 팝업. 전자세금계산서(매입) 기반 재료비·포스터 등 지급신청을 **부모탭 JS**로 자동작성.
> 2026-06-06 도출: 진입·영수증함 매핑·적요·계정(popBudgList)·사용구분·검수 연결·통장표기까지 자동화 실증. **계좌 실명검증은 미해결**(§8).
> kk-dining `fam_0704_automation.md`와 같은 계열(부모탭 JS · popBudgList doDecision · killfocus). 차이: 카드매핑 → **세금계산서 영수증함 매핑**, **검수 연결**, **계좌 실명검증**.

## 0. 핵심 함정 (먼저 읽기)
- **fam_0702는 별도 브라우저 window** (`popup.html?formname=mis.fam::fam_0702.xfdl`) — MCP 탭 그룹 밖이라 스크린샷·픽셀클릭 불가. **부모 탭에서 `window.application.popupframes.fam_0702.form` 으로 JS 제어**(읽기·쓰기 OK), 사용자는 그 창을 눈으로 확인.
- **GridClickEventInfo 생성자 인자 정렬이 NEXACRO 버전마다 다름** — 위치 인자로 row/cell 넣으면 `oldrow` 등 엉뚱한 곳에 들어간다. **생성 후 `ei.row`/`ei.cell`/`ei.col` 명시 세팅** 후 핸들러 호출.
- 셀클릭 핸들러가 명명 메서드(`Grid00_oncellclick`)면 그대로 호출, 아니면 `grid.oncellclick._user_handlers[i].handler.call(target, grid, ei)`.
- NEXACRO `components`는 iterable 아님 → 인덱스 접근. 중첩 컴포넌트(`f.X` 직접 접근 실패)는 **이름으로 재귀 walk**.
- Edit `set_value`는 바인딩 dataset 컬럼이 비면 재동기화로 안 남음 → **dataset 컬럼에 직접 `setColumn`**.
- **네이티브 alert/confirm 은 탭 CDP 를 frozen**(gfn_msg override 로 안 잡힘) → 사용자가 닫아야 복구. (계좌검증이 이걸 유발)

**🚨 이번 세션 실수 TOP — 반복 금지 (상세는 각 절):**
1. ⚠️ **적요·사용구분은 "맨 마지막"에** — `doDecision`(계정)·검수 dblclick·사용구분 변경이 `COMDSCCONT`(적요)·`RQSTDETLCD`(사용구분)를 **자동 리셋**한다. 계정·검수 다 끝낸 뒤 설정(§4·§6). 적요는 dataset 아닌 **컴포넌트 `formDetail_Comdsccont`** 로.
2. 🔴 **계좌 실명검증(`btn_accCstm00`)은 결재상신 필수** — 계좌번호 맞아도 미검증이면 "N번째 행의 계좌검증이 완료되지 않았습니다"로 상신 차단(통장사본 갈음 불가, **행마다**)(§8). 🔵 **공휴일·주말에는 은행 실명검증 API 자체가 안 도는 것으로 추정** (2026-06-07 토요일 시도 시 통과 안 됨) → 공휴일/주말이면 사용자 안내 후 평일로 미루기. (평일 영업시간 외 가능 여부는 미확인.)
3. ⚠️ **자동화 중 `gfn_msg`/`gfn_confirm` 무력화했으면 사용자에게 넘기기 전 반드시 원복** — 안 하면 저장/상신 검증 메시지가 삼켜져 "버튼 눌러도 안 넘어감"으로 한참 헤맴(미해결/TODO#3).
4. ⚠️ **다건 행 전환은 `rqstGrid` row-click** 으로(`ds_rqstGrid.set_rowposition`은 상세내역이 안 바뀜 → 엉뚱한 행에 덮어씀). 전환 후 `ds_GNL.RQSTAMT`로 행 검증, 다건 적요는 저장 직전 화면 행별 확인(§10).
5. ✅ **첨부 자동화 가능** (codex 해법, 2026-06-07): NEXACRO `ExtFileUpload` 는 DOM input 이 없어 직접 `file_upload` 실패하지만, **`extUp.addFiles()` 호출하는 임시 DOM 버튼**을 팝업에 만들고 그 버튼에 `file_upload` → 네이티브 chooser 를 DevTools 가 가로채 파일 주입. **첨부만** 원하면 콜백 `fn_endFileCallBack` (숫자 없는 쪽), `fn_endFileCallBack1` 은 `doSave("S")` 까지 이어짐(§9-1).

공통 walk 헬퍼:
```js
function walk(o,nm,d){ if(d>13||!o)return null; var cs; try{cs=o.components;}catch(e){return null;} if(!cs)return null;
  for(var i=0;i<(cs.length||0);i++){ var c=cs[i]; if(c&&c.name===nm) return c; var r=walk(c,nm,d+1); if(r)return r; } return null; }
function fire(comp,evt,ei){ var hl=comp[evt]&&comp[evt]._user_handlers; if(!hl)return false; for(var i=0;i<hl.length;i++){(hl[i].handler||hl[i].func).call(hl[i].target||comp.form,comp,ei);} return true; }
```

## 1. 진입 — fam_0701 → 일반 신규 → fam_0702
fam_0701 **직접 진입**(경영정보>재무 메뉴 안 거침): `navigate` → `http://p.kist.re.kr:8081/nxui/kistis/indexQ.jsp?target=mis.fam::fam_0701.xfdl&menuParam=sysCd%3DCUS` (NEXACRO 9초 대기). 일반선택·신규는 **좌표 0**(JS 폼객체 제어 — 해상도 무관):
```js
var f01 = window.application.mainframe.ChildFrame.form;   // fam_0701
f01.ds_search.setColumn(0,"DOC_CLS","1");   // 신청서구분: 전체="" / 일반="1" / 연구비카드="3" / 법인카드="5" / 연구비회의="4" / 법인회의="G"
f01.doNew("N");                              // → window.application.popupframes.fam_0702.form (별도 window)
```

## 2. 영수증함에서 세금계산서 매핑
- 하단 탭 상세내역 | **영수증함**. 영수증함 grid = `gnlGrid` (bind `ds_gnlGrid`) = 전자세금계산서(매입) 목록.
- 컬럼: `NTS_ISSUEID`(국세청승인번호, **body cell 4**) · 공급일자 · 품목 · 총액 · `CUSTNM`(거래처) · `CUSTCD`(사업자) · 상태(수신승인).
```js
var f = window.application.popupframes.fam_0702.form;
var g = walk(f,'gnlGrid',0);
var R; var d=f.ds_gnlGrid; for(var i=0;i<d.getRowCount();i++){ if(String(d.getColumn(i,'NTS_ISSUEID'))===승인번호){R=i;break;} }
f.ds_gnlGrid.set_rowposition(R);
var ei=new nexacro.GridClickEventInfo(g,'oncellclick',false,false,0,0,0,0,0,0,0,0,'',0,0);
ei.row=R; ei.cell=4; ei.col=4;          // ★ NTS_ISSUEID 셀
fire(g,'oncellclick',ei);
// → ds_rqstGrid(요약) + ds_GNL(상세)에 CUSTNM·RQSTAMT·TAXBILLMGRNO(세금계산서관리번호)·USEDYMD·COMDSCCONT(적요=품목 자동) 매핑
```

## 3. 상세내역 = ds_GNL  (★ 위 그리드 ds_rqstGrid 아님)
- 화면 '상세내역'(노란 필수칸)은 **`ds_GNL`** 바인딩. 적요·계정·사용구분 등 입력 전부 ds_GNL.
- 위 '신청내역' grid 는 `ds_rqstGrid`(요약 목록) — 직접 편집 금지(저장은 ds_GNL 기준, 잘못 넣으면 불일치).

## 4. 적요
```js
// ⚠️ ds_GNL.setColumn 은 사용구분 변경/refresh 시 자동 품목명으로 재동기화됨 → 반드시 컴포넌트에 직접 set
var ac=walk(f,'formDetail_Comdsccont',0);   // 상세내역 적요(노란칸). 계산서 품목 컴포넌트 billDscCont 와 구분
ac.set_value("{거래처} {품목} 구매 / {적요명} / {YYYY.MM.DD}");
fire(ac,'onchanged',{fromobject:ac});       // 이 컴포넌트 이벤트는 onchanged (onkillfocus/ontextchanged 없음)
```
적요명 = 지도박사 or 계정책임자 성함. **참여연구원 아닌 이름 기재 시 정산 불인정** 주의.
> ⚠️ **계정 `doDecision`·검수 dblclick·사용구분(§6) 변경이 모두 `COMDSCCONT`(적요)를 자동 품목명으로 리셋**한다 → 적요는 **진짜 맨 마지막**(계정·검수·사용구분 다 끝낸 뒤), **컴포넌트 `formDetail_Comdsccont.set_value`** 로 설정. 다건이면 **행마다** 리셋되니 저장 직전 각 행 재확인.

## 5. 지급계정 (popBudgList — kk-dining 방식 동일)
계정번호 입력 `formDetail_BudgSbjtNo` + 검색버튼 `btn_formDetail_BudgSbjtNo`.
⚠️ **계정번호를 먼저 dataset에 넣고** 검색 — 빈 검색은 전체 과제 로드(매우 느림).
```js
f.ds_GNL.setColumn(0,"BUDGSBJCD",계정번호);    // ★ dataset 직접 (Edit set_value 안 남음). 검색 필터로 쓰임.
var btn=walk(f,'btn_formDetail_BudgSbjtNo',0);
fire(btn,'onclick',{fromobject:btn});          // → popBudgList (해당 계정만 필터, 빠름)
```
popBudgList = kk-dining popBudgList 와 동일 구조 (Grid00 계정/Grid01 예산/Grid02 비용/Grid03 세부 + doDecision):
```js
var P=window.application.popupframes.popBudgList.form;
P.ds_BudgList.set_rowposition(0);                        // 계정 (1건 필터)
var e0=new nexacro.GridClickEventInfo(P.Grid00,'oncellclick',false,false,0,0,0,0,0,0,0,0,'',0,0); e0.row=0;e0.cell=0; P.Grid00_oncellclick(P.Grid00,e0);
var r1; var di=P.ds_ExpnItmList; for(var i=0;i<di.getRowCount();i++){if(String(di.getColumn(i,'BUDGITEMCD'))===예산항목){r1=i;break;}}   // 재료비=15
P.ds_ExpnItmList.set_rowposition(r1);
var e1=new nexacro.GridClickEventInfo(P.Grid01,'oncellclick',false,false,0,0,0,0,0,0,0,0,'',0,0); e1.row=r1;e1.cell=0; P.Grid01_oncellclick(P.Grid01,e1);
var r2; var dc=P.ds_ExpnCstList; for(var i=0;i<dc.getRowCount();i++){if(String(dc.getColumn(i,'EXPITEMCD'))===비용항목){r2=i;break;}}        // 재료구입비=330
P.ds_ExpnCstList.set_rowposition(r2);
var e2=new nexacro.GridClickEventInfo(P.Grid02,'oncellclick',false,false,0,0,0,0,0,0,0,0,'',0,0); e2.row=r2;e2.cell=0; P.Grid02_oncellclick(P.Grid02,e2);
P.ds_ExpnSubItmList.set_rowposition(0);                  // 세부
P.doDecision();   // → ds_GNL.BUDGSBJCD/BUDGITEMCD/BUDGEXPCD/DETLEXPCD/BUDGSBJNM(과제명)/RDSBJEMPNM(계정책임자)/REMAMT(잔액). popBudgList 닫힘.
```
비목 (project_code.md / 분류코드별): **재료비 = 예산 15 연구재료비 / 비용 330 재료구입비**. **포스터 = 예산 33 연구활동비1 / 비용 359 인쇄비 + 용도구분 92 그밖의비용**.
> ⚠️ doDecision 으로 채워지는 잔액(REMAMT)이 신청금액 이상인지 확인.

## 6. 사용구분 = 이체  (⚠️ 반드시 §5 계정 doDecision **이후**에 설정)
콤보 `formDetail_Payuseclscd`(지급사용구분). 항목: 1=현금 / 7=지로(수기) / **6=이체** / J=자동이체(수기) / H=위탁연구비. (대부분 이체)
> ⚠️ **순서 함정**: 계정 popBudgList `doDecision()`·검수 dblclick 이 `RQSTDETLCD`(사용구분)·`COMDSCCONT`(적요)를 **초기화**한다 → 사용구분·적요는 **계정·검수 다 끝낸 뒤 맨 마지막에** 넣어야 남는다. (행추가 2건째에서 doDecision 전에 넣었다가 "-- 선택 --"·자동품목명으로 리셋된 사례.)
```js
var c=walk(f,'formDetail_Payuseclscd',0); c.set_value("6");
fire(c,'onitemchanged',{fromobject:c,postvalue:'6',prevalue:'',post:6,pre:-1});   // → ds_GNL.RQSTDETLCD=6
```

## 7. 검수 연결 (검수 완료 건)
검수신청구분 라디오 `rdTallyCheck`: 1=자산포함 / **2=비자산** / 3=검수대상아님(용매·가스류). 비자산 먼저 선택 → 조회 빠름. 승인검수번호 조회 버튼 `btnSetMapTally`.
```js
var rd=walk(f,'rdTallyCheck',0); rd.set_value("2");
fire(rd,'onitemchanged',{fromobject:rd,postvalue:'2',prevalue:'1',post:2,pre:1});
fire(walk(f,'btnSetMapTally',0),'onclick',{fromobject:0});       // → popTally(검수 조회)
// ⚠️ 첫 조회 fire 로 popTally 가 안 열리거나 ds_datagrid1 미로드인 경우 잦음(race) → popTally 없으면 btnSetMapTally 재발화 + 3~4초 대기. (실측: 건1·건2 모두 첫 발화 실패→재발화 성공)
var PT=window.application.popupframes.popTally.form;
// 매칭은 검수번호(PRCT_NO) 우선 / 금액(TOTAMT) — PROD_NM.indexOf 는 null 위험(String() 가드 필수). 비자산이면 보통 해당 검수 1건만 필터됨.
var Rt; var dt=PT.ds_datagrid1; for(var i=0;i<dt.getRowCount();i++){ if(String(dt.getColumn(i,'PRCT_NO'))===검수번호 || String(dt.getColumn(i,'TOTAMT'))===금액){Rt=i;break;} }
PT.ds_datagrid1.set_rowposition(Rt);
var gT=walk(PT,/*ds_datagrid1 bind grid name 'datagrid1'*/'datagrid1',0);
var eT=new nexacro.GridClickEventInfo(gT,'oncelldblclick',false,false,0,0,0,0,0,0,0,0,'',0,0); eT.row=Rt;eT.cell=1;
PT.datagrid1_oncelldblclick(gT,eT);   // 더블클릭=선택 → ds_GNL.PRCT_NO 연결, popTally 닫힘
```
검수 목록 컬럼: `PRCT_NO`(검수번호) · `TOTAMT` · `PROD_NM`(품목) · `COMPLETE_DATE` · `TALLY_STATUS`(완료) · `RGST_USER_NM`.

## 8. 계좌 (계좌 버튼 패널) — ⚠️ 실명검증 **상신 필수**·통과법 미해결
패널 컴포넌트: 입금은행 / `dpstAccNo`(계좌번호) / `dpstOrNm`(예금주명) / `dpstAmt`(입금액) / `dpstDispNm`(통장표기). 검증 버튼 `btn_accCstm00`("계좌번호 검증요청") / `btn_accCstm`("자주사용계좌조회") / `btn_accCstmReg`("자주사용계좌등록").
- 전자세금계산서 매핑 시 계좌가 거래처 기준 자동 채워지기도 함. ⭐ **통장표기 = `KIST_`** (KIST 표준 입금자표기 — 2026-06 확정, 이전 연구원명/적요명 표기 폐기). 비거나 다른 값이면 `KIST_` 로 덮어쓴다:
```js
var disp=walk(f,'dpstDispNm',0); disp.set_value("KIST_");
fire(disp,'onkillfocus',{fromobject:disp,fromreferenceobject:disp});   // killfocus 동기화 (kk-dining 교훈)
```
- ⭐ **통장사본 대조** (자동): 첨부 통장사본/사업자등록증 PDF → PyMuPDF 로 PNG 렌더 후 Read(스캔본은 텍스트 0) → 계좌번호·예금주·은행·사업자번호를 패널과 대조.
  ```python
  import fitz; doc=fitz.open(pdf); doc[0].get_pixmap(dpi=190).save(png)   # → Read(png) 시각 확인
  ```
- ❌ **계좌번호 검증요청 `btn_accCstm00`** = 은행 실명검증 → **네이티브 alert** → 탭 CDP frozen(45초, 사용자가 확인 눌러야 복구). **화면에서 사용자가 처리 권장.**
  - **2026-06-06 미해결**: alert "계좌정보를 다시 한 번 확인해주시기 바랍니다". 추정 원인: 예금주명 표기(전각 괄호 `（주）` 등) / 입금은행 코드 / 자주사용계좌 미등록 / 실명DB 불일치. → 사용자 화면 검증 + 원인 파악 후 보강.
  - 🔴 **계좌검증 = 결재상신 필수 (2026-06-07 확정)**: 계좌번호가 통장사본과 일치해도 `btn_accCstm00` 실명검증을 **완료(검증완료 플래그)** 하지 않으면 결재상신 시 **「N번째 행의 계좌검증이 완료되지 않았습니다」** 메시지로 차단된다. **통장사본 대조만으론 갈음 불가.** 묶음(다건)이면 메시지가 행을 지정("1번째 행…") → **행마다 계좌검증 필요**.
  - 🔵 **공휴일·주말 불가** (2026-06-07 토요일 시도 시 통과 안 됨, alert "계좌정보를 다시 한 번 확인해주시기 바랍니다"). → 작성·저장은 언제든 가능하지만 **계좌검증·상신은 평일에**. 공휴일/주말이면 사용자 안내 후 평일로 미루기. (평일 영업시간 외 가능 여부는 미확인.)
  - 💡 **예금주명(`dpstOrNm`)은 자동채움값 신뢰 말고 통장사본/거래명세서 표기에 정확히 맞출 것** (실명검증 mismatch 1순위 의심): 매핑 자동값이 `（주）○○`(전각 괄호·*주식회사*)인데 실제는 *유한회사*거나 통장/거래명세서엔 접두 없는 `○○`로 적힌 사례 → 검증요청 전 `dpstOrNm` 을 통장 예금주와 글자 그대로 일치시켜 시도.

## 9. 첨부 → 저장 → 결재상신

### 9-1. 첨부 자동화 (2026-06-07 ★ codex 해법 — 패턴 A)
> 공통 가이드: [`../../_shared/nexacro_file_upload.md`](../../_shared/nexacro_file_upload.md) **§3 패턴 A** (NEXACRO popupframe, 같은 chrome page 안 — 부모 page 에 임시 버튼 + `extUp.addFiles()`).
> 아래는 **fam_0702 화면 특화** — 컴포넌트명 `importFileUpload`, 행별 `RQST_NO` 등 fam_0702 특정 값.
> ※ fam_0702 는 NEXACRO popupframe 이라 패턴 A. kk-inspect mcs_0003_pop2 는 `window.open` 별도 page 라 패턴 B (다른 방법).
- fam_0702 의 첨부 UI = NEXACRO `ExtFileUpload`(`f.importFileUpload`). **DOM `<input type=file>` 없음** → `file_upload` 직접 호출 실패. 그래서 한동안 "사용자 수동"으로 분류했지만 ↓ 방법으로 자동화 가능.
- **핵심 아이디어**: `addFiles()`를 호출하는 **임시 DOM 버튼**을 팝업 문서에 만들고 → 그 버튼을 자동화도구의 `file_upload`로 클릭 → 버튼 onclick 이 `extUp.addFiles()` 호출 → **네이티브 파일창**이 뜨는 그 순간을 **DevTools `Page.handleFileChooser`** 가 가로채 지정 파일을 주입. → 좌표 0, 사용자 무개입.
- (예전 §9 의 "자동화 불가" 3가지 이유는 **input type=file 만 노린 file_upload 한정**의 얘기였고, codex 의 임시버튼 우회는 같은 file_chooser 이벤트를 띄워 같은 DevTools 후크로 처리하기에 통한다.)

```js
// 1) fam_0702 팝업 문서에서 실행 — 임시 트리거 버튼 주입
const f = window.application?.popupframes?.fam_0702?.form
       || window.application?.mainframe?.ChildFrame?.form;
let btn = document.getElementById("kk_pay_upload_trigger");
if (!btn) {
  btn = document.createElement("button");
  btn.id = "kk_pay_upload_trigger";
  btn.textContent = "파일추가 트리거";
  Object.assign(btn.style,{position:"fixed",zIndex:"2147483647",left:"20px",top:"20px",width:"180px",height:"36px"});
  btn.onclick = () => f.importFileUpload.extUp.addFiles();   // ★ ExtFileUpload.addFiles() — 네이티브 chooser
  document.body.appendChild(btn);
}
// 2) 자동화 도구의 file_upload 를 이 임시 버튼(#kk_pay_upload_trigger)에 호출 → chooser 가로채기로 파일 주입.
//    파일 여러 개면 한번에 가능(NEXACRO 가 multi-file 받음). 파일별로 반복도 OK.
```

- **행별 첨부** — 묶음(다건)은 **현재 행이 누구냐**에 따라 첨부가 그 행의 `RQST_NO` 로 붙는다. `ds_rqstGrid.set_rowposition` **만으론 부족**(detail 안 바뀜 — §10) → 반드시 `rqstGrid_oncellclick` 까지 태워야 `saveUploadFile()` 이 호출되며 그 행의 첨부 목록이 로드됨.
  ```js
  f.ds_rqstGrid.set_rowposition(row);
  f.rqstGrid_oncellclick(rqstGrid, ei);   // ei.row=row, ei.cell=0, ei.col=0
  // 이 시점 이후에 임시버튼 클릭(=file_upload) → 그 row 의 RQST_NO 에 첨부됨
  ```

- **첨부 상태 확인** — `f.importFileUpload.ds_files` 의 컬럼 `tmHeader`(상태) · `FLE_NM` · `RQST_NO`:
  - `I` = 파일 **선택**만 됐고 서버 전송 전
  - `S` = 서버 첨부 **반영 완료**
  - `D` = 삭제 예정

- **서버 반영 호출** — *첨부만* 하고 지급신청서는 저장하지 않으려면 콜백을 잘 골라야 한다.
  - ⚠️ `fn_endFileCallBack1` 은 끝에 `doSave("S")` 까지 이어진다 → 첨부+저장 동시 원할 때만.
  - **첨부만** 원하면 아래처럼 `fn_endFileCallBack` (숫자 없는 쪽):
  ```js
  const rqstNo = f.ds_rqstGrid.getColumn(f.ds_rqstGrid.rowposition, "RQST_NO");
  f.gfn_setColumn(0, f.ds_main, "pgmId", "FAM_9999");
  f.gfn_setColumn(0, f.ds_main, "PGM_ID", "FAM_9999");
  f.gfn_setColumn(0, f.ds_main, "RQST_NO", rqstNo);
  f.gfn_setColumn(0, f.ds_main, "bfFocusRowRqstNo", rqstNo);
  f.importFileUpload.gfn_upload("", "fn_endFileCallBack", "ds_file", "RQST_NO=" + rqstNo, "");
  ```

- **잘못 붙은 파일 삭제** — 현재 행에서 `removeFile(rowIndex)` 후 `gfn_upload(fn_endFileCallBack)` 재호출로 서버 반영.
  ```js
  f.importFileUpload.removeFile(rowIndex);
  f.importFileUpload.gfn_upload("", "fn_endFileCallBack", "ds_file", "RQST_NO=" + rqstNo, "");
  ```

- **임시버튼 청소**: 작업 끝나면 `document.getElementById("kk_pay_upload_trigger")?.remove();` 로 제거(사용자 화면 어지럽힘 방지).
- **제약**: 그림 1.5M 이하 / PDF 10p 미만.

### 9-2. 저장 → 결재상신
- `bt_save`(저장, 임시저장) → `RQST_NO`(신청관리번호) 생성. 행마다 RQST_NO 부여 — 첨부는 RQST_NO 단위라 **저장 후 첨부**가 자연스럽다(저장 전 첨부도 가능하지만 새 행이면 일단 저장 권장).
- `bt_approval`(결재상신) = 내부에서 저장+검증+상신 통합 → gw 전자결재. **결재선 = 계정책임자(`ds_GNL.RDSBJEMPNM`) + 발의자(본인).** 사용자 confirm.

## 10. 여러 건 묶기 (행추가)
**동일 계정**이면 한 신청서에 최대 5건. 1건 완료 후:
```js
// 행추가 버튼: text "행추가" 로 walk → onclick fire (새 ds_rqstGrid 행 + 새 row 자동 current + ds_GNL 빈 detail)
var addBtn=/* walk: text.indexOf('행추가')>=0 */; window.__fire(addBtn,'onclick',{fromobject:addBtn});
var rg=f.ds_rqstGrid; rg.set_rowposition(rg.getRowCount()-1);   // 새 행
// → §2 영수증함 매핑(다음 세금계산서 NTS_ISSUEID) → §4 적요 → §5 계정(같은 계정이라도 행마다 popBudgList 재실행) → §6 사용구분 → §7 검수 → §8 통장표기 KIST_ 반복
```
- ⭐ **행추가 버튼 핸들러가 master-detail row 전환을 처리** → 새 행 매핑이 기존 행을 덮지 않음(실증: 1행 금액 보존된 채 2행 추가). 각 행마다 §2~§8 그대로 반복.
- ⚡ **속도**: ① 행추가→매핑→계정검색(BUDGSBJCD set + search) **1배치** → ② 예산·비용·세부 `doDecision` **1배치** → ③ 검수(비자산+조회+dblclick) + **맨 마지막에 적요·사용구분·통장표기** **1배치** = 건당 ~3 호출.
  - ⚠️ **순서 절대원칙**: `doDecision`(계정)과 검수 dblclick 이 **`COMDSCCONT`(적요)·`RQSTDETLCD`(사용구분)를 리셋**한다 → **적요·사용구분은 계정·검수 다 끝낸 뒤 맨 마지막에** 설정해야 남는다(§4·§6). 통장표기(dpstDispNm)는 영향 없음. (탐색 0, 컴포넌트명·코드 고정.)
- 첨부는 신청서 단위(모든 건의 세금계산서+거래명세서 함께). **당해연도 세금계산서는 당해연도에** 지급신청. 타인 수신분은 [경영정보>재무>매입(세금)계산서 조회·이관]에서 담당자 이관 후 영수증함 등장.
- ⚠️⚠️ **다건 적요 함정 (실측, 미해결)**: 행 전환을 `ds_rqstGrid.set_rowposition(N)` 으로 하면 **상세내역(ds_GNL)·적요 컴포넌트가 안 바뀐다**(현재 행 유지) → 그 상태로 적요 set 하면 **엉뚱한 행에 덮어씀**. 행 전환은 **`rqstGrid` 그리드 row-click**(`rqstGrid_oncellclick`, `ei.row=N`, **set_rowposition 먼저 금지**)으로 하고 **매 전환 후 `ds_GNL.RQSTAMT`(금액)로 올바른 행인지 검증**. 단 전환해도 적요 컴포넌트가 새 행 값으로 reload 안 되는 경우가 있고, 저장이 grid(ds_rqstGrid) vs 행별 detail(ds_GNL) 중 무엇을 쓰는지 불확실 → **다건이면 적요만은 저장 직전 화면에서 행별로 직접 확인·입력 권장**. (단건은 §4대로 맨 마지막 1회 set 으로 충분.)

## 미해결 / TODO
1. 🔴 **계좌 실명검증 = 결재상신 필수**(§8, 최우선) — 통장사본 대조 갈음 **불가** 확정(미검증 시 "N번째 행의 계좌검증이 완료되지 않았습니다"로 상신 차단). `btn_accCstm00` 실명검증 alert("계좌정보를 다시 확인") **통과법 규명이 핵심**.
   - 🔵 **공휴일·주말에는 실명검증 API 자체가 안 도는 것으로 추정** (2026-06-07 토요일 시도 시 통과 안 됨). **월요일 평일 재시도** 후 결과로 가설 확정 — 정상 통과되면 §8 의 "alert 통과법 미해결" 항목은 *통과법이 아니라 공휴일 제약*으로 정리하면 됨.
2. ✅ 버튼 확정: **저장=`bt_save`**, **결재상신=`bt_approval`**(저장+검증+상신 통합 — handler hasSave=true·hasValid=true). 미저장 상태에서 결재상신 누르면 내부 저장+검증 후 진행.
3. ⚠️⚠️ **gfn_msg/gfn_confirm 억제 트랩 (중요)**: 배치 자동화 중 확인창이 멈춤 유발해 `f.gfn_msg=f.gfn_confirm=function(){return true}` 로 무력화하면, **사용자에게 저장/상신 넘기기 전 반드시 원복**(`f.gfn_msg=f.__o_gfn_msg` …). 안 하면 결재상신의 **검증 메시지·확인창이 전부 삼켜져 "버튼 눌러도 반응 없이 안 넘어감"** → 원인 못 찾고 한참 헤맴(실측). 되도록 애초에 전역 무력화하지 말고, 막을 confirm 만 한정 처리.
4. 다건 **적요·사용구분 리셋/행전환** 함정(§4·§6·§10) — 다건 적요는 저장 직전 화면 행별 확인 권장.
5. ✅ **첨부 자동화** (해결, 2026-06-07 codex 해법) — `ExtFileUpload.extUp.addFiles()` 호출 임시 DOM 버튼 + `file_upload`로 chooser 가로채기. 첨부전용 콜백 `fn_endFileCallBack`(숫자없는 쪽), 행별 첨부는 `rqstGrid_oncellclick` 으로 행 전환 선행. §9-1 참고. → 실제 라이브 검증만 남음.
6. end-to-end 상신 성공 실증 후 SKILL.md 의 세금계산서 'WIP/준비중' 해제 + 커밋.
