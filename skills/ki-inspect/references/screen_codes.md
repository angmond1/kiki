# 화면 한글이름 ↔ 내부 코드

사용자와 대화할 때는 **한글이름(코드)** 형식으로 화면을 부른다 — 예: "소액검수신청(mcs_0003)", "카드영수증조회(fam_0711)". 내부 코드만 단독으로 쓰지 않는다.

| 한글이름 | NEXACRO target | 용도 |
|---------|----------------|------|
| **소액검수신청** (검수신청관리) | `mis.mcs::mcs_0003.xfdl` | 물품/소액 검수신청 — 이 skill의 메인 화면 |
| **카드영수증조회** (및 이관) | `mis.fam::fam_0711.xfdl` | 법인/연구비카드 사용내역·**확정 원화금액** 조회 |
| **과제별관리** | `mis.rdm::rdm_2011.xfdl` | 예산조회·참여 과제 진입 |
| **예실대비표** | `mis.bdg::bdg_2030.xfdl` | 예산 대비 집행 |

## 직접 접근 URL
```
http://p.kist.re.kr:8081/nxui/kistis/indexQ.jsp?target={target}&menuParam=sysCd%3DCUS
```
- 소액검수신청: `target=mis.mcs::mcs_0003.xfdl`
- 카드영수증조회: `target=mis.fam::fam_0711.xfdl`
- 프로젝트(연구관리, 참여 과제 수집): `http://p.kist.re.kr:8081/cus/index.do?cls=proj`
