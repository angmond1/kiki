# dooray wiki — 비목·연구비 규정 실시간 검색

> 비목/집행기준은 KIST 규정이라 개정됨. `expense_category.md` 로 1차 판단하되, **애매하거나 최신 확인이 필요하면 여기서 실시간 검색**(권위·최신).

## 대상 wiki
- **KIST-Wiki-2.0** (행정·연구비 규정): wikiId `3538560283559420253`, home pageId `3538560286709555986`
- 링크: `https://kist.gov-dooray.com/wiki/3538560283559420253/3538560286709555986`

## 검색법
- **공식 API** (개인 토큰): `~/.claude/kiki/ki-rpa.env` 의 토큰으로
  - 트리: `GET https://api.gov-dooray.com/wiki/v1/wikis/3538560283559420253/pages?parentPageId={pid}`
  - 본문: `GET .../pages/{pageId}` (mimeType text/x-markdown)
  - 첨부: `.../pages/{pid}/files/{fid}?media=raw` → 307 → file-api manual GET (Authorization 만)
- **브라우저** (세션쿠키): dooray wiki 탭에서 검색 UI 또는 wapi.

## 용도
- "이 비목이 맞나" / "이 품목 집행 가능한가" / 한도·증빙 상세 → 연구비 집행기준 페이지 검색.
- 결과로 `expense_category.md` 의 1차 판단을 검증/보강. 최종 비목 확정은 사용자·행정원.

## 주의
- wiki 본문을 skill 에 통째 복사하지 않는다(개정 stale). **링크 + 실시간 검색**만 내장.
