# kk-mail wapi 레퍼런스 (메일 endpoint·body)

> 호스트·공통 헤더·rate limit은 `../_shared/dooray_wapi.md` 참조. 여기는 **메일 작업 endpoint**만.
> 모든 호출은 `kist.gov-dooray.com` 탭에서 **세션 쿠키**(`credentials:'include'`)로. 토큰 불필요.
> 코드는 `scripts/kk_mail_ops.js`에 구현됨 — 아래는 스펙 설명.
> **필수 헤더**(`dooray-caller: WEB` 등)·rate limit 은 `../_shared/dooray_wapi.md` 에 있다(중복 제거).

## 조회
| 작업 | endpoint |
|------|----------|
| 받은편지함 | `GET /v2/wapi/mails?folderName=inbox&size=N&page=0&order=-createdAt` |
| 사용자 폴더 메일 | `GET /v2/wapi/mails?folderId={id}&size=N&page=0&order=-createdAt` (사용자 폴더는 `folderId`, 시스템 폴더만 `folderName`) |
| 시스템 폴더 목록 | `GET /v2/wapi/mail-folders?type=system` (inbox/sent/draft/archive/spam/trash) |
| 사용자 폴더 목록 | `GET /v2/wapi/mail-folders?type=user&size=1000` |

- 응답: `result.contents[]` = 메일/폴더 배열, `result.totalCount`.
- 메일 발신자: `users.from.emailUser.{name,emailAddress}`. 날짜: `createdAt`. 첨부 수: `fileCount`. `mailSummary.previewText` 는 **비어 있음**(본문 단서는 상세 GET 필요).
- **읽음 플래그 두 종류**(`mailSummary.flags`): `read` = 사용자 화면의 읽음/안 읽음(토글 가능) / `opened` = 한 번이라도 열린 적 있음(상세 GET 시 true 로 굳고 되돌릴 수 없음). **표시용은 `read`**.
- **페이징**: `page=0,1,2…` 로 넘긴다(최신부터 — 1년 전 구간까지 11페이지×1000건 ≈ 23초 실측 → 오래된 기간은 아래 검색 API). `size` 는 500·1000 도 허용(실측 2026-09-24: 500×3페이지 1,500건 ≈ 2.5초). 코어 `listMails({folder|folderId, sinceDays|since, until, maxPages, size})` 가 기간 컷오프까지 자동으로 넘긴다.

## 메일 본문 (Tier 4 찾기, ✅ 확정 2026-09-24 실측)
```
GET /v2/wapi/mails/{mailId}          // Dooray 웹이 메일을 열 때 부르는 것과 동일 (withBody 파라미터 불필요)
```
- 응답 `result.content`: `subject, createdAt, users.{from,to,cc,…}.emailUser.{name,emailAddress}, body:{mimeType:"text/html", content:"<html…>", showImage}, fileList[](첨부), mail.flags`.
- `/mails/{id}/body`·`/content`·`/detail` 은 **-300000 서비스 오류** — 위 형식만 유효.
- ⚠️ **이 GET 은 그 메일을 읽음(read=true)·opened=true 로 바꾼다.** 화면 표시를 원래대로 두려면 목록에서 `read=false` 였던 메일만 조회 직후 아래 `unread` 로 복원(코어 `getMails` 자동).
- HTML→텍스트는 코어 `htmlToText`(style/script 제거, 블록 요소 줄바꿈). 실측 21KB HTML → 1.6KB 텍스트.

## 읽음 / 안 읽음 표시 (UI 툴바 "읽음"·"안 읽음" 과 동일, ✅ 2026-09-24 캡처)
```
POST /v2/wapi/mails/read     { "mailIdList": ["..."] }
POST /v2/wapi/mails/unread   { "mailIdList": ["..."] }
```
- 응답 `header.resultCode 0`. 목록의 `flags.read` 가 바뀐다(`opened` 는 불변).

## 검색 — Dooray 검색창과 동일 호출 (Tier 4-A, ✅ 2026-09-24 캡처·실측)
```
POST /v2/wapi/mails/search?preview=true
{ "exceptFolders": ["draft","spam","trash"], "all": ["한양대"], "page": 0, "order": "-createdAt", "highlight": true, "size": 100,
  "since": "2024-01-01T00:00:00+09:00", "before": "2024-12-31T23:59:59+09:00" }
```
- `all` = 제목·본문·발신자 전체 대상. 배열 원소끼리 **AND**(`["한양대","세미나"]` → 54건), 한 원소 안의 띄어쓰기는 **구절 매칭**(`["한양대 세미나"]` → 9건). 본문에만 있는 구절도 hit(실측).
- 기간: **`since` / `before` 만 유효**(`until`·`period`·`createdAt`·`startDate`·`sentAt` 등은 조용히 무시). **ISO 시각+타임존 필수** — 날짜만(`2024-01-01`) 넣으면 -200200. 오름차순은 `order:"createdAt"`.
- 폴더 지정 없음(`folderName` 무시 → 받은·보낸 모두). `exceptFolders`(시스템 폴더 이름) 만 동작. 결과의 `folderId` 를 `references.folderMap` 으로 이름 매핑해 사후 필터.
- `subject` / `body` / `from` 같은 대상 한정 필드는 무시되고 totalCount 2000(cap) 전체가 돌아온다 → 대상 한정은 없다.
- 응답: `result.totalCount`, `result.contents[{id, uid, subject}]`(하이라이트용 껍데기, body 비어 있음), **`result.references.mailMap[id]`** = 목록 API 와 같은 메일 객체(`createdAt, subject, users, folderId, fileCount, mailSummary{flags, previewText}`), `references.folderMap[id]{name,type}`. `preview=true` 면 `mailSummary.previewText` 에 **본문 앞부분(~300자, 인용 포함)** 이 실린다. `size` 100 OK(50건 응답 ≈ 600KB).
- UI: 검색창 Enter → URL `/mail/all?query=all%3D<단어>&period=keyword%3Dall`, 기간 직접입력 → `period=keyword%3Ddirect%26startedAt%3D…%26endedAt%3D…`. 검색 결과 화면은 첫 메일을 자동으로 연다(읽음 처리) — 코어 `searchMails` 는 API 만 부르므로 화면·읽음 상태를 건드리지 않는다.

## 스팸 신고 (Tier 1)
```
POST /v2/wapi/mails/report-spam-hacking
{ "idList": ["..."],                         // N건 일괄
  "spamOptions": { "reportSpam": true, "applyBeforeMail": true, "applyBeforeMailFolders": ["inbox"] },
  "hackingOptions": { "reportHacking": false, "reportReason": "" },
  "addRejectFromEmail": true }               // 발신자 차단
```
→ 휴지통 이동 + 학습 신고 + (옵션)발신자 차단 + (옵션)과거 inbox 소급.

## 폴더 이동 (Tier 2 1회성)
```
POST /v2/wapi/mails/move
{ "targetFolderId": "...", "targetFolderName": "...", "mailIdList": ["..."] }  // 셋 다 필수
```
키 이름 주의: 이동은 `mailIdList`/`targetFolder*`, 스팸은 `idList`.

## 자동분류 규칙 (Tier 3)
```
GET    /v2/wapi/mail-rules?size=1000&page=0&types=auto_classification   // page=0 명시해야 contents 정상
POST   /v2/wapi/mail-rules                                              // body는 배열, 단 ⚠️ 첫 1건만 생성
DELETE /v2/wapi/mail-rules/{rule-id}
```
규칙 body (단건 배열):
```json
[{ "condition": { "operator": "and",
     "from":    { "type": "include", "value": ["sender@domain.com"] },
     "subject": { "type": "include", "value": ["키워드"] } },
   "action": { "toFolder": { "id": "{folder-id}", "name": "{name}", "type": "user" } },
   "type": "auto_classification",
   "applyBeforeMail": true,
   "applyBeforeMailFolders": ["inbox", "user_folders"] }]
```
- ⚠️ **배열에 N개를 넣어도 첫 1건만 생성됨** → 여러 규칙은 단건씩 N회 POST (코어 `createRule`이 단건).
- `condition`은 `from`·`subject` 중 하나 이상. `applyBeforeMail`=과거 메일 소급.
- 규칙 객체 필드: `id, type, condition, action, applyOrder`(우선순위·낮을수록 먼저 적용), `lastAppliedAt, createdAt`.
- ⚠️ `condition.from.type`은 **`include`만** 지원 (`not_include`/`exact`는 -200200, 2026-06-04 확인). → 같은 도메인 두 용도 분기(예 `nrf.re.kr`→공고 / `nzine@nrf.re.kr`→뉴스)는 **`applyOrder`로** 처리(정확주소 규칙을 도메인 규칙보다 작은 값=먼저).

## 폴더 생성·삭제 (✅ 확정 2026-06-04, DevTools 캡처)
- **생성**: `POST /v2/wapi/mail-folders/create-path` — body는 **배열** `[{"name":"폴더명","order":N}]`.
  - `order` = 기존 사용자 폴더 `displayOrder` 최대값 + 1.
  - ⚠️ endpoint가 `/mail-folders`가 아니라 **`/mail-folders/create-path`**. 또 body가 **단일 객체면 -200200** — 반드시 배열.
- **삭제**: `DELETE /v2/wapi/mail-folders/{id}`.
- 코어: `ensureFolder(name)`(찾고 없으면 생성) / `deleteFolder(id)`(정리·롤백).
- 폴더 객체 필드: `id, name, type, parentFolderId(null=루트), displayOrder, totalCount`.
