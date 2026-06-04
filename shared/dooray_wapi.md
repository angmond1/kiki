# Dooray wapi 공통 (kiki 형제 skill 공유)

> KIST Dooray 자동화 skill(ki-mail 등)이 공통으로 쓰는 wapi 기본. 개인 토큰·식별자 없음.

## 인증 원칙 (핵심)
- **메일/행정 internal wapi는 브라우저 "세션 쿠키"로 인증** (`credentials:'include'`).
  사용자가 Chrome에 본인 KIST SSO 로그인만 돼 있으면 동작 → **API 토큰·비번을 skill에 넣지 않는다.**
- 공식 REST API(`api.gov-dooray.com`, `Authorization: dooray-api {token}`)는 메일 관리에 **불필요**(메일 조회·스팸·이동·규칙은 internal wapi 전용). 토큰이 필요한 확장 기능은 각 사용자 로컬 `.env`에서만 읽고 skill에 값 박지 않음.

## 호스트
| 용도 | 호스트 |
|------|--------|
| internal wapi (SPA용, 세션 쿠키) | `https://kist.gov-dooray.com/v2/wapi` |
| 공식 REST API (토큰) | `https://api.gov-dooray.com` |

## internal wapi 필수 헤더
없으면 일부 endpoint `-200200` 거부, 일부는 `200 OK + contents:[]` silent fail.
```
Content-Type: application/json
Accept: application/json, text/plain, */*
dooray-api-version: 1.1
dooray-caller: WEB
dooray-mail-api-version: 1.2
dooray-drive-api-version: 1.1
```

## Rate limit (Token Bucket)
- burst 20 / 1초당 5 보충. 초과 시 HTTP 429.
- 다건 순회는 한 번에 묶거나(배열 body 지원 endpoint) 적당히 분할.

## 알려진 함정 (이번 빌드에서 확인)
- `mail-rules` 목록 GET은 `page=0` 명시해야 `contents` 정상 반환.
- `mail-rules` POST는 배열이어도 **첫 1건만 생성** → 여러 규칙은 단건씩 N회.
- `mail-folders` 생성 payload는 미확정(-200200) → 폴더는 UI 수동 생성 권장(추후 캡처로 보완).
- 파일 업로드/다운로드는 `api`→307→`file-api` redirect 시 Authorization 자동 제거 → manual redirect 필요(메일 관리엔 불필요).
