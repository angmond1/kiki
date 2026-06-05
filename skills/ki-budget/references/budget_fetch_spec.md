# ki-budget — 통합정보 예실대비표(bdg_2030) fetch 명세

> KIST 통합정보 예실대비표(`mis.bdg::bdg_2030`)를 좌표 없이 backend fetch로 조회한 명세.
> 좌표·해상도·모니터 무관. `window.application.authTk` + 세션쿠키. **2026-06-02 실증 + 화면 스크린샷 1:1 대조 검증.**
> 공통 fetch 유틸(`nexBody`/`post`/`parseRows`/`decodeEnt`)은 `shared/kist_portal.md` 준용.

---

## fetch 3단계 흐름
1. **`queryProjects()`** — `rdm_2011`/`doSearchMain.do` → 본인 참여 과제 `[{acccd, name(PROJNM), pi(KORNM), type(PROJTYPE)}]`.
   - ⚠️ `type`(PROJTYPE)은 **과제유형(주관/공동)이지 본인 역할이 아님**. 본인이 과책(PI)인지는 **`pi == 본인 이름`** 으로 판별 (참여과제는 pi가 타인).
2. **`getBdgInfo(acccd)`** — `bdg2030/getBdgInfo.do` (ds_search: BUDGSBJCD, BUDGYEAR=9999) → 과제 메타 1행 + **`ACCCLSCD`**(다음 단계 필수).
3. **`getMainList(BUDGYEAR=9999, BUDGSBJCD=acccd, ACCCLSCD)`** — `bdg2030/getMainList.do` → 카테고리별 예산 완전체.

## getMainList request (ds_main) — 필수 3 컬럼
| 컬럼 | 값 | 비고 |
|---|---|---|
| `BUDGYEAR` | `'9999'` | ★ 전체/누적 의미. 실제 연도(2026 등) 넣으면 **빈 응답** |
| `BUDGSBJCD` | 과제번호(acccd) | |
| `ACCCLSCD` | 회계분류코드 | getBdgInfo에서 취득. ★ **없으면 세부항목(LEV2)만 와서 카테고리 소계 A/D가 누락** |

---

## getMainList response (`ds_datagrid1`) ↔ 화면 예실대비표 컬럼 완전 매핑

| fetch 컬럼 | 화면 컬럼 | 설명 |
|---|---|---|
| `BUDGITEMNM` | 예산항목 | `"NN : 이름"` (예 `05 : 내부인건비2`) |
| `BUDGITEMCD` | (코드) | 항목코드 (`05`) |
| `BUDGITEMCLSNM` | 항목 | `간접비` / `직접비` |
| `FRSTBUDGAMT` | 최초예산액 | |
| `BF_BALAMT` | 최종예산액 › 이월 | 전년이월 |
| `LASTBUDGAMT` | 최종예산액 › **합계(A)** | ★ **예산총액** |
| (별도컬럼 없음) | 최종예산액 › 당해 | = `LASTBUDGAMT − BF_BALAMT` 로 계산 |
| `CTRLPERFAMT` | **집행액(B)** | 실집행(결재완료된 지출) |
| `CTRLCAUSAMT` | 계류액(C) › 결재완료 | |
| `TEMPAMT` | 계류액(C) › 결재진행 | |
| `BALNAMT` | 예산잔액 **D = A−(B+C)** | ★ **잔액** |
| `BAL_RATE` | 잔액비율 | `"52.56%"` |
| `LEV` | (행 레벨) | `1`=카테고리, `2`=세부항목, `1`·`3`=소계 |
| `EXPITEMKORNM` | (세부 집행항목명) | LEV2일 때 세부명. LEV1은 `BUDGITEMNM`과 동일 |
| `CTRLCRTAMT`, `TEMPCTRLAMT` | — | 내부 집계용(미사용) |

**검산식**: `LASTBUDGAMT(A) = BALNAMT(D) + CTRLPERFAMT(B) + CTRLCAUSAMT(C완료) + TEMPAMT(C진행)`
(실증 검산 통과 — 한 카테고리에서 A = D + 집행 + 계류완료 + 계류진행 일치 확인)

## 행 추출 기준 (오집계 방지)
- **카테고리 행** = `LEV==='1'` **&&** `BUDGITEMCD` 있음 **&&** `BUDGITEMNM`이 `/^\d+\s*:/` 패턴.
- **소계 행** = `BUDGITEMNM`이 `"소계 [...]"` (BUDGITEMCD 없음, LEV 1 또는 3) — 보통 제외.
- **합계 행** = `BUDGITEMNM`이 `"합계"` (과제 전체) — 또는 카테고리 A 합산.
- **세부 행** = `LEV==='2'` (EXPITEMKORNM이 BUDGITEMNM과 다름; A 없음) — 카테고리 추출 시 **반드시 제외**.
  - ⚠️ "33 : 연구활동비1"은 카테고리 소계(LEV1, A=총액)와 세부행(LEV2, 예 "523 : 회의비" A=부분)에 **둘 다** 붙음 → `LEV==='1'` 안 거르면 세부값으로 오집계됨.

## 예산항목 코드(BUDGITEMCD) 전체 — 화면 전 항목
**간접비**: `07` 지식재산권관리비 · `30` 간접비(통합) · `61` 간접비(주요사업 통합)
**직접비**: `01` 내부인건비1 · `05` 내부인건비2 · `11` 연구시설·장비비 · `15` 연구재료비 · `19` 위탁연구개발비 · `29` 연구수당 · `31` 학생인건비 · `33` 연구활동비1 · `34` 연구활동비2
- 과제마다 일부만 존재. **추적 기본 6**: `15`·`11`·`33`·`34`·`05`·`31` (재료비·시설장비비·활동비1·활동비2·내부인건비2·학생인건비).
- 소계 행: `소계 [간접비]` · `소계 [내부인건비]` · `소계 [연구시설·장비비]` · `소계 [연구활동비]` · `소계 [직접비]`.
- → 사용자가 "간접비·인건비1·수당·위탁개발비도 보여줘" 요청 시 BUDGITEMCD로 즉시 추가 가능.

## getBdgInfo response (`ds_main`, 1행) — 과제 메타
- `ACCCLSCD` (getMainList 필수) · `TOTBUDGAMT` (과제 전체 예산) · `BUDGFROMYMD`/`BUDGTOYMD` (기간) · `PRJ` (사업명 요약) · `DEPTNM` (부서).
- ⚠️ **개인정보 컬럼**: `RDSBJEMPNM`(책임자명) · `EMPNOS`(사번) · `PARTRSCHER`/`AGENTEMPINFO` — 추출 시 주의, config·로그에 남기지 말 것.
- 화면 헤더의 **연구관리자/계정관리자**(행정원)는 별도 표시 — 개인집계 시 적요에 잡을 행정원명 후보.

## 개인집계(집행내역) 경로 — 보조
- 예실대비표에서 **집행액(B)·계류액 셀 클릭** → 집행내역 팝업(`popBdgExeList_form_datagrid1`).
  - 결재완료(title "집행내역"): 적요 col3, 금액 col13.
  - 계류(title "계류내역(결재완료)"): 적요 col2, 금액 col5 → **헤더 '적요'/'금액' 텍스트로 컬럼 자동탐지** 권장.
  - 적요 `"{이름}/{내용}"` → config `filter_names`(연구자/행정원/혼합)로 본인 지분 합산.
- ⚠️ `getBdgItemExp.do` 직접 fetch는 항목 미선택 시 빈 데이터셋 → 개인집계는 **화면 팝업 경로**가 확실(추가 fetch 캡처는 미검증). 과책 아닌 과제의 내부인건비2·학생인건비는 집행내역 권한 제한 가능.

## 함정 요약
1. `BUDGYEAR='9999'` 필수 (연도 넣으면 빈 응답).
2. `ACCCLSCD` 필수 (없으면 LEV2 세부만 → 카테고리 A/D 누락).
3. 카테고리는 `LEV==='1'` 필터 (세부·소계에도 BUDGITEMNM 중복).
4. `&#32;` 등 entity → `decodeEnt`/`parseRows`.
5. 응답에 쿠키·authTk 섞이면 `[BLOCKED]` → 핵심 필드만 추출(값 마스킹).
6. 화면 스냅샷과 fetch 값이 다를 수 있음 — 집행이 실시간 진행 → **fetch가 더 최신**(버그 아님).
