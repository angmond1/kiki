---
name: k-rpa
description: |
  KIST RPA 지급신청 자동화 skill (kiki 패키지). 카드결제·세금계산서·회의비 증빙을
  비목코드로 분류하고 파일명 규칙(계정_항목_비목_카드승인번호_카드책임자]내용)으로 변환해
  담당 연구행정원의 dooray 드라이브 폴더에 업로드한다(업로드하면 RPA가 자동 기안).
  카드 승인번호·수행과제·금액은 KIST 통합정보 backend 를 fetch 직접 호출로 조회(화면·좌표 0, 해상도 무관).
  트리거: "지급신청", "영수증 처리해줘", "카드 명세서 올려줘", "RPA 지급", "비목 정해서 올려줘",
  "세금계산서 지급신청", "k-rpa", "지급신청 파일명" 등 KIST 연구비 지급신청 처리 요청 시 활성.
  KIST 구성원 누구나 본인 계정으로 사용 (개인 식별자 불필요, 본인 로그인 세션 + 본인 dooray 토큰).
---

# k-rpa — KIST RPA 지급신청 자동화

## 핵심 한 줄
영수증 폴더의 증빙을 → **건별로 과제·비목 확정**(사용자와) → 카드 건은 **fetch 로 승인번호 조회**(좌표 0) → **파일명 규칙 변환** → **담당 행정원 dooray 폴더에 업로드**(=RPA 자동 기안) → 처리완료 폴더로 정리. **모든 업로드·이동은 사용자 confirm 후.**

## 전제 (환경별 본인 준비 — skill 이 대신 못 함)
1. **Chrome + Claude in Chrome(MCP) 연결** — KIST 통합정보 NEXACRO 조회는 브라우저로 동작.
2. **Chrome 에 KIST SSO 로그인**(`p.kist.re.kr:8081` 통합정보) — 카드/과제 조회 인증(세션). 별도 토큰 불요.
3. **dooray 개인 토큰** — 드라이브 업로드용. `~/.claude/kiki/k-rpa.env` 에 `DOORAY_TOKEN=...` (발급 `https://kist.gov-dooray.com/setting/api/token`). 첫 실행 때 안내.
4. (대부분 자동) **한글 + MS Office** — hwp/docx/xlsx 증빙을 pdf 변환할 때 COM 사용. KIST PC 표준이라 보통 보유. 없으면 "직접 pdf 저장" 안내로 우회.

> 통합정보(카드·과제) = KIST SSO 세션 / dooray(업로드) = 개인 토큰. **별개 시스템·별개 인증.**

---

## 실행 준비 (매 작업 시작)
1. 브라우저 연결: `list_connected_browsers` / `select_browser`.
2. **통합정보 화면 1개 확보**: `tabs_context_mcp` → `navigate` `http://p.kist.re.kr:8081/nxui/kistis/indexQ.jsp?target=mis.fam::fam_0711.xfdl&menuParam=sysCd%3DCUS` → 9초 대기(NEXACRO).
   - 로그인 페이지면(세션 만료) "KIST 통합정보에 로그인해 달라" 안내 후 중단.
3. **portal 코어 주입**: `scripts/portal_ops.js` Read → `javascript_tool` inject → `window.kRpa.ready()` true 확인(=`authTk` 확보). false면 화면 로드 재시도.
4. dooray 작업은 Bash 로 `scripts/dooray_drive.py`(토큰) 사용.

---

## 부트스트랩 (첫 설치 또는 "k-rpa 설정") — 6단계
`~/.claude/kiki/k-rpa.config.json` 을 대화로 채운다(`k-rpa.config.example.json` 참고). 전부 1회.

1. **dooray 토큰** — 안내: "발급 `https://kist.gov-dooray.com/setting/api/token` → (권장) txt/md 파일로 저장해 **경로**를 알려주세요(채팅 기록에 안 남아 안전) / (간편) 토큰을 붙여넣어도 되나 **유출 위험**" → `~/.claude/kiki/k-rpa.env` 에 저장(gitignore).
2. **카드책임자 이름** (보통 본인. fam_0711 조회 키. 사번은 자동/1회 확인).
3. **담당 연구행정원** — 옵션1(권장): **폴더 링크 붙여넣기** → folderId 추출 / 옵션2: **이름 검색**(`dooray_drive.find_admin_folder`). ⏳ 이름검색은 **"검색 중…" 진행표시 + "최대 5분 걸릴 수 있음(멈춘 게 아님)"** 안내. 본부명(약어 가능)을 주면 가속. 후보 복수면 웹주소 보여주고 1개 선택(정식 RPA 폴더 우선).
4. **업로드 범위 분기** (3에서 폴더 확정 후 `folder_structure` 로 구조 자동 파악):
   - **세금계산서·회의비 별도 폴더 있으면** → "세금계산서·회의비도 각 폴더로 **따로 업로드할까요?**"
   - **별도 폴더 없으면** → "**카드결제·세금계산서·회의비 중 어디까지** RPA 지급신청할까요?"
5. **수행과제 확인** — `window.kRpa.queryProjects()` 자동수집 → 번호+명+책임자 리스트 출력 → "이 과제들로 지급신청 처리하면 될까요?(전부/일부/추가)" → 확정 목록 config 캐시.
6. **PC 영수증 저장 폴더 경로** (사람마다 다름).

→ 여기까지면 설치 정보수집 완료. (1번만 env, 2~6은 config)

---

## 작업 워크플로 (지급신청 실행)
1. **영수증 폴더 스캔** — config `receiptFolder`(또는 사용자 지정 폴더)의 증빙 파일 목록 파악.
2. **형식 전처리** — `scripts/convert.py ensure_uploadable` 로 jpg/pdf 보장(이미지→jpg, 문서→pdf). **변환 시 "X→Y 변환함" 알림.** 실패 시 수동 안내.
3. **건별 과제·비목 확정 (사용자와 함께)** — 각 증빙에 대해:
   - 과제: config 캐시 목록에서 선택(과제명으로 말해도 매핑).
   - 비목: `references/bimok_reference.md` 로 **제안** → 사용자 확정. 애매하면 `references/dooray_wiki.md` 로 wiki 실시간 검색. (소모성 우선 판단 등 규칙 적용)
   - 카드 종류: **법인/연구비** 확인(법인=`CARDTYPECD` 5, 연구비 3).
4. **카드 건 승인번호 조회** — `window.kRpa.queryCards({fromDt,toDt,cardType,empno,custnm})` → 거래처·금액으로 매칭해 `CARDAPPRNO` 확보. **외화는 임의 환산 말고** `USEAMT`(원화청구액) 그대로. (세금계산서·회의비는 승인번호 없음)
5. **파일명 규칙 변환** — `계정_항목_비목_카드승인번호_카드책임자]내용` (세금계산서는 승인번호 생략 / 카드영수증+주문내역이면 주문내역만 / 복수는 `(1)(2)`). 로컬에서 rename.
6. **업로드 (confirm 후)** — `dooray_drive.upload(folder_id, path)`. 유형별 폴더(카드=root / 세금계산서·회의비=하위 또는 동일, 4번 분기대로). 업로드 = **RPA 자동 기안 트리거**임을 알리고 confirm.
7. **처리완료 정리** — `archive_local(path, acccd, mode)` 로 `영수증폴더/지급신청완료/{과제번호}/` 이동/복사. mode 는 "그대로 둘까/복사/이동?" 첫 **2~3회만 묻고, 답이 일관되면 학습(config `moveOrCopy`)해 이후 자동.**

---

## 안전 규칙 (필수)
- **모든 쓰기(업로드·파일이동·rename)는 사용자 confirm 후.** 분류·제안만 자동.
- **업로드 = RPA 자동 기안**(매일 10/15/22시 배치) → 실제 결재 발생. 건수·과제·금액 보여주고 confirm.
- **비목은 제안만, 확정은 사용자·행정원.** 1차 판단은 `bimok_reference.md`, 애매하면 wiki.
- **물품 100~300만원은 소액검수(mcs_0003) 선행** 필요 — 미검수면 RPA 보류. 해당 시 안내.
- **외화 금액 임의 환산 금지** — fam_0711 `USEAMT` 그대로.
- **토큰·사번·카드번호는 skill·repo 에 저장 금지.** 토큰은 `k-rpa.env`(로컬), 사번은 config(로컬), 카드번호는 조회로만(저장 X).
- 행정원 폴더 파일 **삭제는 하지 않는다**(권한·감사). 업로드만. 성공 시 RPA/dooray 가 자동 정리.

---

## config (`~/.claude/kiki/k-rpa.config.json`)
- repo 밖, 사용자 home(`~/.claude/kiki/`, 형제 skill 공유). `k-rpa.config.example.json` 참고.
- 내용: 카드책임자명, 행정원 폴더(링크/이름), 업로드 범위·별도폴더, 영수증 폴더, 이동/복사 선호(학습), 수행과제 캐시.
- **토큰은 config 아닌 `k-rpa.env`.** 민감정보(카드번호 등) 저장 금지.

## 참고 문서
- `references/bimok_reference.md` — 비목 매핑·증빙·한도·파일명·외화·RPA운영 통합(1차 판단).
- `references/kist_portal_fetch.md` — 통합정보 fetch backend 명세(endpoint·ds_search·authTk·함정·좌표 fallback).
- `references/dooray_folder.md` — 행정원 폴더 조회(링크/이름검색·본부약어·캐시·성능).
- `references/dooray_wiki.md` — 비목·규정 wiki 실시간 검색.
- `../../shared/security_policy.md` — 보안 규약(C1~C5). `../../shared/dooray_wapi.md` — wapi 공통.
- **실패 시**: portal 은 `kRpa.ready()`(authTk) 확인 → fetch 응답 XML 의 `ErrorCode` 확인 → 빌드 TODO(chkPopupValueSetting body)면 DevTools 캡처. dooray 는 토큰(`k-rpa.env`)·rate limit(429) 확인.
