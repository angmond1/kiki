# 포탈 게시판 "부서별업무분장표" — 담당자표 수집 참조 (kk-wiki 기능 3) · ✅ 2026-09-25 실측

## 어디에 있나
- **KIST 포탈**(`https://p.kist.re.kr/login.do`, SSO 로그인 후) 상단 탭 **게시판** → 왼쪽 메뉴(아래로 스크롤) **부서별업무분장표**. 부서별로 "[팀명] 업무분장 안내('26.8.28. 기준)" 글이 올라오고, **같은 부서는 최신 글이 현재 담당**.
- 포탈 첫 화면에는 공지 팝업(교육 안내 등)이 거의 항상 뜬다 → **먼저 닫는다**(닫기 / 오늘 하루 열지 않기). 팝업이 떠 있으면 스크립트 실행이 멈추기도 한다(2026-09-25 실측: 경고창 상태에서 JS 45초 타임아웃).
- 포탈 홈 메뉴의 "부서별업무분장표"(`goUrl('deptrole')`)는 2014년 안내글(그룹웨어 팝업)로 연결될 뿐이다. 통합정보시스템(`p.kist.re.kr:8081`) 메뉴에는 게시판이 없다.

## 구조 (실측)
- 게시판 화면 = 그룹웨어 **xClick**(`https://ngw.kist.re.kr/xclick_kist/…`)이 포탈 안에 **교차출처 iframe** 으로 들어온 것. 포탈 탭에서는 JS 로 못 만지므로 iframe 의 `src`(portal_main 프레임 안 `iframe`) 로 **탭을 직접 띄운다**. 그룹웨어 SSO 는 포탈 로그인 시 숨은 프레임(`gwSSOLogin.jsp`)이 처리해 두므로 세션이 살아 있다.
- 게시판 id **`FC_BBS224`**(카테고리 FREEBBS). 왼쪽 메뉴 항목 `onclick="movePage(this,'FC_BBS224','FREEBBS')"` 를 누르면 목록 프레임에 `frmList` 폼이 생긴다.
- **목록**: `frmList` 를 복제해 `POST /xclick_kist/XClickController` (`facade=BBSArticleFacade, command=listArticle, nextpage=/bbs/articleGenList.jsp, transaction_yn=N, paging_listcnt=100, currpage_no=1..`) → HTML. 행 = `a[onclick*=viewArticle]` 의 **바깥 tr**(제목 링크는 안쪽 table 안) 셀: [체크, 아이콘, 글번호, 게시판명, 제목, 게시자, 게시일, 조회, 첨부]. `viewArticle('<position>', '<articleId NEW…>', 'FC_BBS224', …)`. 총 169건 = 100+69.
- **글 열람**: `viewArticle` 폼 POST 를 흉내 내면 상당수 글이 `error.jsp`("페이지를 찾을 수 없습니다") — position 이 세션 목록 인덱스에 묶여 있음. ✅ 대신 **'URL복사' 공유 주소** `GET /xclick_kist/dispatcherArticleView.jsp?articleId=<id>&userid=SESSIONNOCHECK` 를 숨은 iframe 으로 띄우면 `windowOpenMain.jsp` 래퍼 → 안쪽 프레임에 글이 렌더된다(≈2초/건). 이 주소가 곧 **사용자에게 줄 게시글 링크**.
- **표**: 헤더에 "직무"와 "담당"이 있는 가장 안쪽 `<table>` → 행 [직무구분 | 직무 내용 | 담당 "이름 (내선)"]. 팀장 행이 첫 행. 표를 **이미지로 올린 팀**(본문에 `DownController.do?fileId=` 이미지)은 텍스트가 없다 → 링크만.
- 2026-09-25 실측: 최신 글 18팀 중 텍스트 표 5팀(재무팀·안전보건팀·혁신지원팀·연구성과확산팀·창업·성장지원팀)… 나머지는 이미지 또는 본문 없음. 갱신 때 다시 센다.

## 덤프 형식 (`staffRender()` → `get_page_text` → `wiki_staff.py import`)
```
=== KKWIKI-STAFF v1 | exported <ISO> | board FC_BBS224 | teams N ===
## 팀: 재무팀 | 글번호 77956 | 게시일 08-18 17:58 | 게시자 장승현 | 제목 [재무팀] 업무분장 안내('26.08.18.) | id NEW… | url https://ngw.kist.re.kr/xclick_kist/dispatcherArticleView.jsp?articleId=NEW…&userid=SESSIONNOCHECK
| 직무구분 | 직무 내용 | 담당 |
| 팀장 | ◦ 재무업무 총괄 | 장승현 (6026) |
(표 없음 — 이미지 게시글, 이미지 1개: 링크에서 직접 확인)
=== END ===
```
- `get_page_text` 는 3만 자 이상을 한 번에 돌려준다(실측) → `javascript_tool` 의 ~1,000자 제한을 우회하는 표준 반출 채널. 큰 결과는 문서를 `<pre>` 로 바꿔 읽고, 읽은 뒤 새로고침.
- 저장 위치 `{kiki_root}/wiki/staff/`: `staff_dump_yymmdd.txt`(원본), `staff.json`, `staff.md`, 이전본 `_history/`. **이름·내선 = 내부 자료, 로컬만.**

## 답에 붙이는 방법
- `python scripts/wiki_staff.py find 출장 여비` → 팀 | 직무구분 | 담당 (내선) | 기준일 + 링크. 여러 팀이 걸리면 질문 주제의 담당 부서(위키 경로의 팀)를 우선.
- 위키 본문의 "담당자 : ○○○(☎…)" 와 다르면 둘 다 표시하고 게시판(최신 글)을 우선. 이미지 팀은 "게시글 링크에서 확인".
