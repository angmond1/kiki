# KIST Wiki 2.0 (Dooray 위키) API 참조 — kk-wiki

위키 URL: `https://kist.gov-dooray.com/wiki/<space_id>/<page_id>` — 첫 숫자 = 공간(space) id, 둘째 = 페이지 id. KIST Wiki 2.0 = `3538560283559420253` / Home `3538560286709555986`.

## A. 공식 API (개인 토큰, Python `wiki_snapshot.py`) — ✅ 2026-09-18·09-25 실측
- Base `https://api.gov-dooray.com`, 헤더 `Authorization: dooray-api <token>`. KIST 사내망은 SSL 검사(ePrism)로 인증서 검증을 끈다(`verify=False`).
```
GET /wiki/v1/wikis/{space}/pages?parentPageId={id}&size=100&page=0   # 자식 목록 → result[](또는 result.contents[]) {id, subject, parentPageId, ...}
GET /wiki/v1/wikis/{space}/pages/{id}                                # 상세 → result {id, subject, body{mimeType:"text/x-markdown", content}, updatedAt, createdAt, version, files[{id,name,size}], images[], parentPageId, creator, root, wikiId}
GET /wiki/v1/wikis/{space}/pages/{id}/files/{fileId}?media=raw       # 첨부: 307 → Location(file-api.*) 을 Authorization 헤더 들고 직접 GET (자동 redirect 는 다른 host 라 헤더가 빠져 401)
```
- 페이지 상세엔 수정자 이름이 없다(`creator` 만). 수정일 `updatedAt`, 버전 `version` 으로 최신 여부를 판단.
- 속도: 호출당 0.22초 간격으로 373페이지 ≈ 2~3분. 429/5xx 는 잠시 쉬고 재시도.
- 구분선 페이지(제목이 `---…`)는 건너뛴다.

## B. internal wapi (브라우저 세션 쿠키, `kk_wiki_ops.js`) — ✅ 2026-09-25 실측
- Dooray 탭(어느 화면이든 `kist.gov-dooray.com`)에서 `fetch(..., {credentials:'include'})`. 필수 헤더 `dooray-api-version: 1.1`, `dooray-caller: WEB`.
```
GET /v2/wapi/wikis/{space}/pages?parentPageId={id}&size=500   # result.contents[] {pageId, subject, parentPageId, hasChildren, restricted, version, order, ...}
GET /v2/wapi/wikis/{space}/pages/{id}                          # result.content {subject, body{mimeType,content,contentId}, lastUpdate{dateTime, member{name}}, create{dateTime, member}, version, files[], images[], breadcrumb, downloadUrl, restricted, ...}
```
- wapi 상세에는 수정자 이름(`lastUpdate.member.name`)이 있다. `hasChildren` 으로 walk 가지치기.
- ⚠️ **백그라운드 탭 타이머 지연**: 수집 중 탭이 뒤로 가면 Chrome 이 `setTimeout` 을 1초 단위로 늦춰 10배 느려진다(실측: 6개 목록 호출에 52초). 수집 중엔 그 탭을 앞에 두게 한다.
- 데이터 반출은 `exportSnapshot()` 의 Blob 다운로드(브라우저 다운로드 폴더) — 사용자 확인 후. `javascript_tool` 출력(~1,000자)으로는 본문을 꺼낼 수 없다.
- 첨부 다운로드 URL 은 wapi 로 미해결(SPA 서명 URL) → 토큰 경로 A 로.

## 스냅샷 형식 (두 경로 공통, `wiki_snapshot.py build`)
```
<kiki_root>/wiki/
  raw/<pageId>.json          원본 응답 + _path/_parent/_depth/_order/_source(api|browser)
  pages/<경로>/<제목>.md      frontmatter(title,id,path,url,updated,updated_by,created,version,files) + 본문(markdown)
  index.json                 {space_id, home_page_id, built_at, count, pages:[{id,title,parent,depth,path,rel,url,updatedAt,createdAt,version,len,sha,files,restricted}]}
  index.md                   열람용 목록: [수정일] 경로 (글자수, 첨부 n) → pages/상대경로 `id`
  CHANGES_yymmdd.md          직전 index 대비 신규·변경·삭제
  attachments/<pageId>/<파일명>   (옵션, 토큰)
```
- 경로 세그먼트는 파일명 금지문자를 `_` 로, 60자로 자르고, 전체 경로가 길면 `_long/<id>_<제목>.md`. 같은 경로가 겹치면 ` (id 끝 6자리)` 를 붙인다.
- 본문 변경 판정 = 공백 정규화 후 sha1 앞 16자 또는 `updatedAt` 변화.
