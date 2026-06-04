---
name: ki-mail
description: |
  KIST Dooray 메일 관리 skill (kiki 패키지). 받은편지함을 조회해 광고성/predatory 메일을
  스팸 처리하고, 원하면 광고/학회/공고 등 폴더로 분류하며, 자연어 명령으로 자동분류 규칙을 수립한다.
  트리거: "메일 정리", "스팸 골라줘", "광고메일 분류", "지난주 메일 봐줘", "받은편지함 정리",
  "앞으로 ~~ 메일은 ~~ 폴더로 자동분류해줘", "ki-mail" 등 KIST Dooray 메일 정리·분류·자동분류 요청 시 활성.
  KIST 구성원 누구나 본인 계정으로 사용 (개인 토큰·식별자 불필요, 본인 브라우저 로그인 세션으로 동작).
---

# ki-mail — KIST Dooray 메일 관리

## 핵심 한 줄
받은편지함을 조회 → **광고성 스팸은 신고(기본)**, **폴더 분류는 물어보고(선택)**, **"앞으로 X 메일은 Y 폴더로" 자연어 규칙을 수립(핵심 능력)**. 모든 쓰기 작업은 **사용자 confirm 후**.

## 전제 (환경별 본인 준비 — skill이 대신 못 함)
1. **Chrome + Claude in Chrome(MCP) 연결** — 이 skill은 브라우저 세션으로 동작.
2. **Chrome에 본인 KIST Dooray SSO 로그인** (`kist.gov-dooray.com`). ← 이게 "인증". 별도 토큰·비번 입력 없음.
3. Claude Code에서 이 skill이 설치됨 (`~/.claude/skills/ki-mail/`).

> 이 3가지만 각자 준비하면, 폴더 ID·멤버 정보 등은 **실행 때 자동 조회**된다. 개인 API 키나 비번을 skill에 넣지 않는다.
>
> **Dooray API key는 ki-mail에 불필요**하다(메일 기능은 세션 쿠키로 동작). 따라서 **설치·첫 실행 때 API 발급을 묻지 않는다.**
> 단, 사용자가 **토큰이 필요한 작업**(메일 발송·메신저 알림·업무 등록·캘린더 등 = ki-mail 범위 밖 공식 REST API 기능)을 요청하면, **바로 그때 on-demand로** 발급을 안내한다: **https://kist.gov-dooray.com/setting/api/token** (자세히 `../../shared/dooray_api_guide.md`). 발급 토큰은 skill·repo에 저장 금지, 본인 로컬에만.

---

## 실행 준비 (매 작업 시작 시)

1. **브라우저 연결 확인** → `list_connected_browsers` / `select_browser`.
2. **탭 확보 + Dooray 이동**: `tabs_context_mcp` → `navigate` `https://kist.gov-dooray.com/mail`.
   - 로그인 페이지가 뜨면(세션 만료) 사용자에게 "Dooray에 로그인해 달라" 안내 후 중단.
3. **코어 주입(1회)**: `scripts/ki_mail_ops.js`를 Read → `javascript_tool`로 inject.
   - 반환값이 `ki-mail-ops/1.0`이면 성공. 이후 `window.kiMail.*` 호출.
   - 페이지가 새로고침되면 `window.kiMail`이 사라지므로 재주입.

---

## 동작 모델 (3-Tier)

### Tier 1 — 스팸 처리 (기본, 누구에게나 통용) · 항상 수행
받은편지함에서 **광고성/predatory 메일을 식별 → 스팸 신고 제안**.
- 조회: `window.kiMail.listInbox({days: N})` (기본 7일).
- 분류: `references/classification_policy.md`의 **판별 패턴**으로 광고성/predatory 식별.
- 제안: 발신·제목·근거를 표로 보여주고 **confirm**.
- 실행: `window.kiMail.reportSpam([id,...])` (휴지통 + 학습 + 발신자 차단 + 과거 inbox 소급).
- 스팸은 **폴더를 만들지 않는다**. 스팸함으로 보낼 뿐.

### Tier 2 — 폴더 분류 (선택) · 기본 OFF, 반드시 물어보고
스팸까진 애매한 광고/학회/공고 등을 **별도 폴더로 분류할지 사용자에게 먼저 묻는다.**
- 예: *"이 광고성 메일들을 '광고' 폴더로 옮기고, 앞으로도 자동분류할까요?"*
- **사용자가 명시 선택해야** 폴더 이동/규칙 생성. 기본값으로 자동 분류하지 않는다.
- 1회성 이동: `window.kiMail.moveMails([id...], folderId, folderName)`.
- 폴더가 없으면 → **폴더 확보 절차**(아래) 후 진행.

### Tier 3 — 자연어 자동분류 규칙 엔진 (★ 이 skill의 핵심)
사용자가 자연어로 규칙을 말하면 skill이 수립한다.
- 입력 예: *"앞으로 `nature.com`에서 오는 메일은 저널 폴더로 자동분류해줘"*, *"제목에 '세미나' 들어간 건 세미나 폴더로"*.
- 처리:
  1. **조건 파싱** — 발신 도메인/주소 → `fromEmails`, 제목 키워드 → `subjectKeywords`.
  2. **폴더 확보** — `ensureFolder(name)` (찾거나 생성; 생성 실패 시 수동 안내).
  3. **과거 소급 여부 확인** — "기존에 받은 메일도 같이 옮길까요?"(`applyBefore`).
  4. **규칙 생성** — `window.kiMail.createRule({fromEmails, subjectKeywords, toFolderName, applyBefore})`.
- 결과를 사용자에게 보고(어떤 조건 → 어떤 폴더, 소급 여부).

#### 폴더 확보 (Tier 2/3 공통)
`ensureFolder(name)`이 **없으면 자동 생성**한다(`create-path` 형식 확정). 폴더 생성·자동분류 규칙은 사용자 confirm 후.
> 만에 하나 `{needManualFolder}`를 반환하면(생성 실패) Dooray UI 수동 생성을 안내 후 재시도.

---

## 안전 규칙 (필수 준수)

- **모든 쓰기(스팸신고·이동·규칙생성·삭제)는 사용자 confirm 후.** Claude는 분류·제안만 자동.
- **발신자 차단(addReject)·과거 소급(applyBefore)** 영향을 confirm 시 명시.
- **개인 발신 학술 메일은 폴더로 옮기지 않는다.** 교수 개인의 연사 섭외·공동연구 제안 등 **답장·후속 대응이 필요한 메일**은 받은편지함 유지. 폴더 분류는 학회 *사무국/단체 공식 발신* 위주.
- **도메인 양면성 주의.** 같은 도메인이 정상+광고 섞이면(예: 출판사 시스템 도메인이 본인 투고 확인 + 마케팅 동시 발송) 도메인 단위 일괄 규칙/차단 금지, 건별 처리.
- **개인 학습은 skill에 누적하지 않는다.** 특정 발신처→폴더 같은 개인 규칙은 사용자 config(`~/.claude/kiki/ki-mail.config.json`)에만 저장. skill 본문/references에는 보편 판별 패턴만.

---

## 부트스트랩 (첫 사용 또는 "ki-mail 설정")

개인화 정보를 자동조회 + 대화로 채워 config를 만든다.

1. 실행 준비(위) 완료.
2. **현재 상태 파악** — `findAllFolders()` + `listMailRules()`로 **기존 폴더·분류 규칙을 먼저 조회**(충돌 판단용). 폴더 목록 제시.
3. (Tier 2 일반) "광고성·스팸은 기본으로 스팸함 처리합니다. 그 외 광고/학회/공고 같은 메일을 **별도 폴더로 분류**할까요?" → 예면 폴더명.

4. **메일분류 기본 권장** — `references/classification_policy.md`의 권장 체계를 **항목별로 순차 제안**(KIST/출연연 공통이라 권장하되 각각 사용자가 켜고/끔). 각 항목마다:
   - (a) "○○ 메일을 '○○' 폴더로 자동분류할까요?" 제안.
   - (b) **기존 폴더·규칙과 겹치면** → "기존 'X' 폴더/규칙이 있습니다. **거기 합칠까요, 그대로 두고 새로 나눌까요?**" 묻기. (임의로 기존 규칙 덮어쓰기 금지)
   - (c) 예 → `ensureFolder`(없으면 자동 생성) + `createRule`. 모두 confirm 후.

   **순차 제안 항목** (도메인·기관 정확값은 `classification_policy.md`):
   ```
   1) 결재알림  ← noreply@kist.re.kr
   2) 과제  ← nrf.re.kr · ketep.or.kr · kiat.or.kr · keit.re.kr
   3) UST      ← ust.ac.kr
   4) 기관뉴스  ← nzine@nrf.re.kr · email@keit.re.kr · newsletters@kiat.or.kr · kistep.re.kr · stepi.re.kr · kird.re.kr · kribb.re.kr · pr@kist.re.kr · sema.or.kr
   5) 학회     ← kiche · ksiec · kecs · kchem · kim · mrs-k · nanokorea · kontrs (.or.kr/.org/.net)
   ```
   - ⚠️ **NRF/KEIT/KIAT 분기**: 정확주소(`nzine@nrf.re.kr`·`email@keit.re.kr`·`newsletters@kiat.or.kr` → 기관뉴스)를 도메인(`nrf.re.kr`·`keit.re.kr`·`kiat.or.kr` → 과제)보다 **먼저**(`createRule` `applyOrder` 작게) 등록. Dooray `not_include` 미지원이라 우선순위로만 분기.

5. `~/.claude/kiki/ki-mail.config.json` 생성/갱신 (`ki-mail.config.example.json` 참고).
   - config 없어도 Tier 1(스팸)·Tier 3(자연어 규칙)은 동작. config는 Tier 2/권장분류 선호 기억용.

---

## config (`~/.claude/kiki/ki-mail.config.json`)
- 위치: **repo 밖, 사용자 home** (git 충돌·유출 방지). 형제 skill과 `~/.claude/kiki/` 공유.
- 내용: 폴더 분류 ON 여부, 폴더명 매핑, 개인 분류 규칙/학습 발신처.
- **민감정보(토큰·비번) 저장 금지.** 메일 코어는 세션 쿠키로 동작하므로 토큰이 필요 없다.

## 참고 문서 / 문제 해결
- `references/classification_policy.md` — 광고성/predatory **판별 패턴**(보편) + 처리 가이드.
- `references/wapi_reference.md` — wapi endpoint·body·헤더(조회/스팸/이동/규칙/폴더 생성·삭제).
- `../../shared/dooray_wapi.md` — wapi 공통(필수헤더·rate limit). `../../shared/security_policy.md` — 보안 규약.
- `../../shared/dooray_api_guide.md` — Dooray **공식 API 가이드·토큰 발급·문제 해결 참조**(원문 링크 포함).
- **호출 실패 시 순서**: `header.resultMessage` 확인 → `-200200`/빈 응답이면 필수헤더 점검(`dooray_wapi.md`) → 정확한 body 미상이면 **DevTools Network 캡처**(폴더 `create-path`도 이렇게 확정) → 공식 API(토큰) 문제면 `dooray_api_guide.md` + 원문 가이드 참조.
