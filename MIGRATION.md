# kiki 통합 관리 인수인계 (MIGRATION)

> 이 문서는 개별 skill이 다 빌드된 뒤 **kiki 패키지를 통합 관리하는 별도 세션**이 이어받기 위한 인수인계서다.

## 목적·대상
- KIST 구성원용 행정 자동화 skill 패키지. 동료가 본인 계정으로 설치해 사용.
- 배포: GitHub `angmond1/kiki` **private** repo + 초대(collaborator).

## repo 구조
```
kiki/
  README.md  INSTALL.md  MIGRATION.md(이 파일)  SKILL_BUILDING_GUIDE.md  .gitignore
  shared/   security_policy.md · dooray_wapi.md · dooray_api_guide.md · kist_portal.md(통합정보 NEXACRO fetch 공통)   # 형제 공통 규약
  skills/   ki-mail/ (SKILL.md + references/{classification_policy,wapi_reference} + scripts/ki_mail_ops.js + config 예시)
            (+ ki-rpa/ ki-inspect/ ki-budget/ ki-dinning/ 예정)
```

## skill 빌드 상태
| skill | 상태 | 비고 |
|-------|------|------|
| ki-mail | ✅ 빌드 완료 | Tier1 스팸 / Tier2 폴더분류(선택) / Tier3 자연어 규칙 + 권장분류 23규칙(결재알림·과제·UST·기관뉴스·학회, NRF/KEIT/KIAT 분기) + 폴더 자동생성/삭제 |
| **ki-rpa** | ✅ 빌드 완료 | 좌표0 fetch(카드내역 getList / 과제 doSearchMain / 이름→사번 chkPopup) + 비목 통합 + Dooray 폴더 이름검색·구조파악·업로드·아카이브 + 파일변환(한글/Office COM). 인증: 통합정보=SSO세션+authTk / Dooray=토큰 |
| **ki-dinning** | ✅ 빌드 완료 | 카드(법인+연구비) 회의비 추출 + 사전결재 `fam_0100` 매칭(`getListByBonbu` 본부조회→클라 필터) + 별지1호 **회의록 hwp 생성**(pyhwpx 셀치환·**WPF 보안팝업 Alt+N watcher**) + 두레이 업로드. 인증: 통합정보=SSO / 두레이=토큰(`kiki.env`) |
| ki-inspect / ki-budget | ⏳ 진행 예정 | 같은 구조·규약 합류 |

## 공통 규약 (형제 모두 준수 — `shared/security_policy.md`)
- C1 개인 credential·식별자·개인학습 skill 텍스트 금지
- C2 모든 쓰기 confirm 후 / C3 개인화=자동조회+대화
- C4 config·token은 `~/.claude/kiki/`(repo 밖)+gitignore / C5 한국어

## config 정책
- 위치: `~/.claude/kiki/<skill>.config.json` (repo 밖, 형제 공유 네임스페이스).
- 토큰·비번 저장 금지(세션 쿠키 인증이라 불필요).

## 통합 관리 세션이 이어받을 일
1. 형제 skill(ki-rpa/inspect/budget/dinning)을 같은 구조로 합류 + `shared/` 규약 일원화.
2. (✅ 완료 2026-06-04) ki-mail 폴더 자동생성/삭제 — `create-path` 배열 형식 확정.
3. 버전·릴리스 관리(태그/CHANGELOG), 설치 스크립트화.
4. 동료 collaborator 초대·온보딩, 파일럿 피드백 수렴.
5. 접근정책 운영(private 유지, 초대 관리). 정식 plugin marketplace 형식 검토(후순위).

## 형제 skill 빌드 시 바로 쓸 노하우 (ki-rpa 에서 확보 2026-06-04)
나머지 skill(ki-inspect 소액검수·ki-budget 예산·ki-dinning 회의록)도 **통합정보 NEXACRO + dooray** 기반이라 아래를 그대로 재사용 — 같은 시행착오 반복 말 것.
- **통합정보 조회는 좌표 말고 fetch** (`shared/kist_portal.md`). 새 화면(mcs_0003·bdg_2030 등)도 **XHR 후킹으로 endpoint·body 1회 캡처 → fetch 재현**. `window.application.authTk`+세션쿠키, NEXACRO SSV XML, `parseRows` 정규식.
- **좌표 fallback 병행**("어떻게든 성공"): fetch 안 되면 `zoom` 으로 위치 찾아 클릭(고정좌표 X), ⛔`Ctrl+A` 금지(문자 'a'), 입력 후 Enter→조회버튼까지, 결과는 get_page_text/read_page.
- **dooray drive**: 업로드=공식 API+토큰(307 manual follow), 폴더 이름검색=트리 순회(root 수천 항목→상위 폴더 id 캐시로 가속), 동명 폴더 복수 주의 (`shared/dooray_wapi.md`).
- **공통 함정**: 응답 `&#32;` decode / fetch 결과 화면 grid 에 안 보임(정상) / 출력 `[BLOCKED]`(쿠키 섞임)→핵심필드만 / 화면 호출순서 의존 backend 는 직접 fetch 빈 응답 가능.
- **인증 분리**: 통합정보(조회)=KIST SSO 세션(토큰 불요) / dooray(업로드)=개인 토큰(`<skill>.env`). 조회는 토큰 없이, 쓰기만 토큰.
- 알려진 화면코드: `fam_0711`(카드)·`rdm_2011`(과제)·`mcs_0003`(소액검수)·`bdg_2030`(예실대비표)·`rdc_2700`(심의). **저장·제출은 Edge 권장**(Chrome 저장 실패 사례).
- 비목·연구비 규정은 개정되므로 skill 에 통째로 박지 말고 요약+`dooray wiki` 실시간 검색(ki-rpa `bimok_reference.md` 패턴 참고).

## 빌드 이력
- 2026-06-04: ki-mail 초판(본 세션). 코어 `ki_mail_ops.js` = 기존 `spam_report_snippet.js` 패키지화 + `ensureFolder`/`createRule`/단건POST/기간조회.
- 2026-06-04: 폴더 자동생성/삭제 확정(`POST /mail-folders/create-path` 배열 `[{name,order}]` / `DELETE /mail-folders/{id}`) → `ki_mail_ops` v1.1. `ensureFolder` 자동생성 + `deleteFolder` 추가.
- 2026-06-04: 권장 분류 체계 추가 — KIST/출연연 공통 23규칙(결재알림·과제·UST·기관뉴스·학회, 기관 도메인 웹검증). 같은 도메인 두 용도 분기(nrf/keit/kiat: 정확주소=뉴스 먼저, 도메인=과제 나중) — Dooray `not_include` 미지원이라 `applyOrder`로 처리, `createRule`에 `applyOrder` 추가. 부트스트랩에 권장분류 순차질문 + 기존폴더 합치기 로직. API key는 설치 시 안 묻고 토큰 필요 작업 요청 시 on-demand 안내 + `shared/dooray_api_guide.md` 추가.
- 2026-06-04: **ki-rpa 초판**(별도 세션). 좌표탈피 fetch 코어 `portal_ops.js`(통합정보 NEXACRO backend 직접호출 — 카드내역 `getList.do`·과제 `doSearchMain.do`·이름→사번 `chkPopupValueSetting.do`, `window.application.authTk`+세션쿠키, 화면·좌표·해상도 무관 실증) + `dooray_drive.py`(폴더 이름검색·구조파악·307 업로드·처리완료 아카이브, 본부약어 매핑, self-healing) + `convert.py`(이미지→jpg/문서→pdf, 한글·Office COM, fallback) + `bimok_reference.md`(원본 4종 항목별 통합) + references(fetch명세·폴더조회·wiki). 인증: 통합정보=KIST SSO 세션+authTk(토큰 불요) / Dooray 업로드=개인 토큰(`ki-rpa.env`). 부트스트랩 6단계. 보안 grep 0건. **미해결**: `chkPopup` 직접 fetch 재현(화면 NEXACRO 로는 동작, 동일 body fetch 는 빈 응답 — 세션 의존 추정) → 사번 `cardHolderEmpno` config 운용. 검증 TODO: 실전 end-to-end.
- 2026-06-04: **ki-dinning 초판**. 회의비 end-to-end(카드 법인+연구비 추출 → 사전결재 `fam_0100` 매칭 → 별지1호 회의록 hwp 생성 → 두레이 업로드). 코어: `portal_ops.js`(queryCardsBoth 법인+연구비 / queryProjects+분류코드 추출 / **queryPreApprovals `fam_0100` `getListByBonbu` 신규캡처** — 본부 전체 반환→클라 acccd+date 필터) + `make_minutes.py`(pyhwpx 셀치환, 한글 인스턴스 재사용, **Erase** 셀비우기) + `popup_watcher.py`(**WPF 보안팝업=Alt+N**, 별도 프로세스 필수 — 같은 프로세스 스레드는 COM 블록 중 GIL 로 안 돎) + `dooray_drive.py`(ki-rpa 재사용). 규칙: 분류코드 I·S·K 사전결재 면제, **발의자** 검색, 카페 영수증 음료수=인원, 회의록 제목·내용 **중복금지**(yymmdd 폴더 스캔). **토큰 `kiki.env` 공유 정책 신설**(설치 시 없으면 빈 템플릿 자동생성 → 컴맹 우회, **ki-rpa.env→kiki.env 통합 필요**). 출력 `C:\kiki\dinning\<yymmdd>`(연2자리)·보고서 `project_report`. 보안 grep 0건. 미해결: `fam_0100` 발의자 서버필터 미적용 / `chkPopup` 사번매핑 직접fetch(ki-rpa 동일). 검증 TODO: 실전 end-to-end.
