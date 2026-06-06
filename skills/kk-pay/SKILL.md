---
name: kk-pay
description: |
  KIST RPA 지급신청 자동화 skill (kiki 패키지). 카드결제·세금계산서·회의비 증빙을
  비목코드로 분류하고 파일명 규칙(계정_항목_비목_카드승인번호_카드책임자]내용)으로 변환해
  담당 연구행정원의 dooray 드라이브 폴더에 업로드한다(업로드하면 RPA가 자동 기안).
  카드 승인번호·수행과제·금액은 KIST 통합정보 backend 를 fetch 직접 호출로 조회(화면·좌표 0, 해상도 무관).
  트리거: "지급신청", "영수증 처리해줘", "카드 명세서 올려줘", "RPA 지급", "비목 정해서 올려줘",
  "세금계산서 지급신청", "kk-pay", "지급신청 파일명" 등 KIST 연구비 지급신청 처리 요청 시 활성.
  KIST 구성원 누구나 본인 계정으로 사용 (개인 식별자 불필요, 본인 로그인 세션 + 본인 dooray 토큰).
---

# kk-pay — KIST RPA 지급신청 자동화

## 핵심 한 줄
영수증 폴더의 증빙을 → **건별로 과제·비목 확정**(사용자와) → 카드 건은 **fetch 로 승인번호 조회**(좌표 0) → **파일명 규칙 변환** → **담당 행정원 dooray 폴더에 업로드**(=RPA 자동 기안) → 처리완료 폴더로 정리. **모든 업로드·이동은 사용자 confirm 후.**

## 전제 (환경)
- **환경 점검은 [`../_shared/environment_setup.md`](../_shared/environment_setup.md) 0단계를 따른다** — Chrome + Claude in Chrome(MCP) + **통합정보 SSO 로그인**(`p.kist.re.kr:8081`, 카드/과제 조회) + **Dooray 토큰**(`~/.claude/kiki/kiki.env` 의 `DOORAY_TOKEN`, 드라이브 업로드용) + (대부분 자동) 한글/MS Office(증빙 pdf 변환 COM).
- 통합정보(카드·과제) = SSO 세션(토큰 불요) / dooray(업로드) = 개인 토큰. **별개 시스템·별개 인증.**
- **공통 개인정보**(카드책임자·담당 행정원·참여과제·사번)는 `~/.claude/kiki/kiki.config.json` 에서 읽는다 → `../_shared/personal_config.md`.

---

## 실행 준비 (매 작업 시작)
1. 브라우저 연결: `list_connected_browsers` / `select_browser`.
2. **통합정보 화면 1개 확보**: `tabs_context_mcp` → `navigate` `http://p.kist.re.kr:8081/nxui/kistis/indexQ.jsp?target=mis.fam::fam_0711.xfdl&menuParam=sysCd%3DCUS` → 9초 대기(NEXACRO).
   - 로그인 페이지면(세션 만료) "KIST 통합정보에 로그인해 달라" 안내 후 중단.
3. **portal 코어 주입**: `scripts/portal_ops.js` Read → `javascript_tool` inject → `window.kkPay.ready()` true 확인(=`authTk` 확보). false면 화면 로드 재시도, 그래도 안 되면 조회는 **좌표 fallback**(워크플로 4의 fetch→좌표 순서)으로 전환.
4. dooray 작업은 Bash 로 `scripts/dooray_drive.py`(토큰) 사용.

---

## 부트스트랩 (첫 설치 또는 "kk-pay 설정")
**0. 환경 점검** — `../_shared/environment_setup.md` 0단계(Chrome+MCP·통합정보 로그인·토큰·python).
**공통 식별정보는 먼저 `~/.claude/kiki/kiki.config.json` 에서 읽는다**(이미 있으면 재질문 X). 없는 공통 항목만 물어 거기 저장(다른 skill 재사용). kk-pay 고유만 `kk-pay.config.json`. (`../_shared/personal_config.md`)

1. **dooray 토큰** *(공통, `kiki.env`)* — 없으면 안내: 발급 `https://kist.gov-dooray.com/setting/api/token` → (권장) 파일로 저장해 경로 알려주기(노출 0) / (간편) 붙여넣기(1회 노출). `~/.claude/kiki/kiki.env` 의 `DOORAY_TOKEN`.
2. **카드책임자** *(공통 `card_holder`)* — 보통 본인(fam_0711 조회 키, 사번 1회 확인). kiki.config 에 없으면 묻는다.
3. **담당 연구행정원** *(공통 `payment_admin`)* — 옵션1(권장) **폴더 링크 붙여넣기** → folderId / 옵션2 **이름 검색**(`dooray_drive.find_admin_folder`, "최대 5분" 진행표시). 후보 복수면 1개 선택.
4. **업로드 범위 분기** *(kk-pay 고유)* — 행정원 폴더 구조 자동파악 후: 세금계산서·회의비 별도 폴더 있으면 "따로 업로드?" / 없으면 "어디까지 RPA?".
5. **수행과제 확인** *(공통 `projects`)* — `window.kkPay.queryProjects()` 자동수집 → "이 과제들 맞나요?(전부/일부/추가)" → kiki.config 캐시.
6. **PC 영수증 저장 폴더 경로** *(kk-pay 고유 `receiptFolder`)*.

→ 공통(1·2·3·5) = `kiki.config.json`/`kiki.env` / kk-pay 고유(4·6) = `kk-pay.config.json`.

---

## 작업 워크플로 (지급신청 실행)
1. **영수증 폴더 스캔** — config `receiptFolder`(또는 사용자 지정 폴더)의 증빙 파일 목록 파악.
2. **형식 전처리** — `scripts/convert.py ensure_uploadable` 로 jpg/pdf 보장(이미지→jpg, 문서→pdf). **변환 시 "X→Y 변환함" 알림.** 실패 시 수동 안내.
3. **건별 과제·비목 확정 (사용자와 함께)** — 각 증빙에 대해:
   - 과제: config 캐시 목록에서 선택(과제명으로 말해도 매핑).
   - 비목: **3단 조회** — ① `references/expense_category.md`(자주 쓰는 것·판단 원칙)로 1차 제안 → ② 애매하면 `references/expense_category_table.md`(전체 41비목·증빙·한도·집행가능 lookup)에서 정확히 찾기 → ③ 그래도 모호하면 `references/dooray_wiki.md`로 wiki 실시간 검색 → **사용자 확정**. (소모성 우선·외화 환산금지 등 규칙 적용)
   - **증빙·검수·반려 점검**: `references/payment_request_manual.md`(재무팀 공식 매뉴얼)로 해당 비목의 **필수 증빙**(거래명세서 항목·온라인 배송지·결제대행 별도전표), **선행 검수**(100만원↑ 모바일검수 / 50만원↑ 정보화기기 / 소액물품 300만↑ 구매요구), **집행 한도·반려 예방**(회의비 1인5만·심야금지, 이어폰10만 등 한도, 계정책임자·부서협조 누락) 확인 → 미충족이면 사용자에게 보완 안내. 애매하면 매뉴얼 원문 링크로 최신 확인.
   - 카드 종류: **법인/연구비** 확인(법인=`CARDTYPECD` 5, 연구비 3).
4. **카드 건 승인번호 조회** — `window.kkPay.queryCards({fromDt,toDt,cardType,empno,custnm})` → 거래처·금액으로 매칭해 `CARDAPPRNO` 확보. **외화는 임의 환산 말고** `USEAMT`(원화청구액) 그대로. (세금계산서·회의비는 승인번호 없음)
   - ⭐ **fetch 실패 시 좌표 fallback 자동 시도** (authTk 없음 / 빈 결과 / HTTP 에러): `references/kist_portal_fetch.md` 의 좌표 절차(화면 캡처 + `zoom` 으로 칸 위치를 찾아 입력·Enter·조회버튼·grid 읽기)로 **재시도**. **시도 순서 = fetch → 좌표, "어떻게든 성공"이 목표.** 둘 다 실패할 때만 화면을 캡처해 사용자에게 보여주고 안내(조용히 멈추지 말 것). 과제목록 조회도 동일.
5. **파일명 규칙 변환** — `계정_항목_비목_카드승인번호_카드책임자]내용` (세금계산서는 승인번호 생략 / 카드영수증+주문내역이면 주문내역만 / 복수는 `(1)(2)`). 로컬에서 rename.
6. **업로드 (confirm 후)** — `dooray_drive.upload(folder_id, path)`. 유형별 폴더(카드=root / 세금계산서·회의비=하위 또는 동일, 4번 분기대로). 업로드 = **RPA 자동 기안 트리거**임을 알리고 confirm.
7. **처리완료 정리** — `archive_local(path, acccd, mode)` 로 `영수증폴더/지급신청완료/{과제번호}/` 이동/복사. mode 는 "그대로 둘까/복사/이동?" 첫 **2~3회만 묻고, 답이 일관되면 학습(config `moveOrCopy`)해 이후 자동.**

---

## 안전 규칙 (필수)
- **모든 쓰기(업로드·파일이동·rename)는 사용자 confirm 후.** 분류·제안만 자동.
- **업로드 = RPA 자동 기안**(매일 10/15/22시 배치) → 실제 결재 발생. 건수·과제·금액 보여주고 confirm.
- **비목은 제안만, 확정은 사용자·행정원.** 1차 판단은 `expense_category.md`, 애매하면 wiki.
- **물품 100~300만원은 소액검수(mcs_0003) 선행** 필요 — 미검수면 RPA 보류. 해당 시 안내.
- **외화 금액 임의 환산 금지** — fam_0711 `USEAMT` 그대로.
- **토큰·사번·카드번호는 skill·repo 에 저장 금지.** 토큰은 `kiki.env`(로컬), 사번은 config(로컬), 카드번호는 조회로만(저장 X).
- 행정원 폴더 파일 **삭제는 하지 않는다**(권한·감사). 업로드만. 성공 시 RPA/dooray 가 자동 정리.

---

## config (`~/.claude/kiki/kk-pay.config.json`)
- repo 밖, 사용자 home(`~/.claude/kiki/`, 형제 skill 공유). `kk-pay.config.example.json` 참고.
- 내용: 카드책임자명, 행정원 폴더(링크/이름), 업로드 범위·별도폴더, 영수증 폴더, 이동/복사 선호(학습), 수행과제 캐시.
- **토큰은 config 아닌 `kiki.env`.** 민감정보(카드번호 등) 저장 금지.

## 참고 문서
- `references/payment_request_manual.md` — ⭐ **재무팀 공식 지급신청 매뉴얼**(Dooray Wiki 원문 스냅샷 + 빠른참조). 비목별 증빙·검수·집행기준·반려사항·계정코드·과세/국외소득 + 첨부양식 10 file_id + 원문 링크. 증빙·검수·반려 점검의 1차 권위(규정 개정 시 원문 링크로 최신 확인).
- `references/expense_category.md` — 비목 매핑·증빙·한도·파일명·외화·RPA운영 통합(1차 판단).
- `references/rpa_payment_filing.md` — ⭐ **RPA 지급신청 운영 사양**(재무팀 wiki 「7.RPA 지급신청 안내」 정제). RPA 대상(카드+**세금계산서**)/비대상(회의비·전문가활용·전화료·전기료·도서비·용역·공사)·파일명(카드/세금계산서 국세청승인번호/`_통장사본`/복수`(1)(2)`)·계좌 OCR+자주사용계좌·수행시간(10/15/22시,1건4분)·결재선(신청자→계정책임자전결)·결과(성공=폴더파일삭제/실패=잔존+메일)·실패사례 + 전화료/전문가활용 RPA. **세금계산서도 RPA 대상**(계좌 실명검증을 RPA OCR가 우회).
- `references/tax_invoice_payment.md` — ⭐ **세금계산서 직접 지급신청서 자동작성**(fam_0701 일반 → fam_0702 부모탭 JS: 영수증함 매핑·적요·계정 popBudgList·사용구분·검수 연결·통장표기 KIST_·**행추가 묶음**·**첨부**[ExtFileUpload `extUp.addFiles()` + 임시 DOM 버튼 + `file_upload` chooser 가로채기 — codex 해법, 2026-06-07]). 🔴 **계좌 실명검증은 결재상신 필수**(통장사본 갈음 불가, 행마다) + 🔵 **공휴일·주말은 안 됨**(은행 실명검증 API 미가동 추정, 평일 가능). 평일 영업시간 외 가능 여부는 미확인. **WIP**: 진입~검수·통장표기·다건 묶음·첨부까지 자동 가능, end-to-end 상신 성공 후 WIP 해제. §0 "반복 금지 TOP" 먼저 읽기. (RPA 폴더 업로드 경로와 별개의 '직접 작성' 경로)
- `references/kist_portal_fetch.md` — 통합정보 fetch backend 명세(endpoint·ds_search·authTk·함정·좌표 fallback).
- `references/dooray_folder.md` — 행정원 폴더 조회(링크/이름검색·본부약어·캐시·성능).
- `references/dooray_wiki.md` — 비목·규정 wiki 실시간 검색.
- `../_shared/security_policy.md` — 보안 규약(C1~C5). `../_shared/dooray_wapi.md` — wapi 공통.
- `../_shared/nexacro_file_upload.md` — ⭐ **NEXACRO `ExtFileUpload` 첨부 자동화 공통 가이드**(2026-06-07 codex 해법). kk-pay·kk-dining·kk-inspect 공유. fam_0702 특화 적용은 `references/tax_invoice_payment.md` §9-1.
- **실패 시**: portal 은 `kkPay.ready()`(authTk) 확인 → fetch 응답 XML 의 `ErrorCode` 확인 → 빌드 TODO(chkPopupValueSetting body)면 DevTools 캡처. dooray 는 토큰(`kiki.env`)·rate limit(429) 확인.
