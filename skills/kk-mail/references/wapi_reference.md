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
- **페이징**: `page=0,1,2…` 로 넘긴다. `size` 는 500·1000 도 허용(실측 2026-09-24: 500×3페이지 1,500건 ≈ 2.5초). 코어 `listMails({folder|folderId, sinceDays|since, until, maxPages, size})` 가 기간 컷오프까지 자동으로 넘긴다.

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
