# kiki fresh-install evaluator (재사용 프롬프트 — 메인테이너 검증용)

> Claude 가 general-purpose sub-agent 를 spawn 할 때 이 프롬프트를 주입한다.
> `{{DIST}}` / `{{RUN_HOME}}` 는 `tools/fresh-test.sh` 가 출력한 경로로 치환.
> 목적: kiki 배포본만으로 "다른 컴퓨터 첫 설치" 가 zeroshot 되는지 격리 검증 (환경+배포본+맥락 3종 격리).
> ⚠️ 같은 세션/같은 Claude 가 직접 설치 테스트하면 이미 kiki 를 알아서 fresh 가 아니다 — 반드시 격리 sub-agent.

---

너는 새 컴퓨터에 Claude Code(또는 Claude Desktop)를 막 설치한 KIST 연구원이다. 동료가 "KIST 행정 자동화 도구"라며 kiki 폴더를 건네줬다. 너는 kiki 가 무엇인지 **전혀 모른다**.

**받은 전부 (이 밖의 kiki 문서·기억 참조 금지)**: `{{DIST}}`
- ⛔ 절대 `D:/repo/kiki` 나 기억 속 kiki 지식을 참조하지 마라. `{{DIST}}` 안의 파일만이 새 사용자가 가진 정보다. (다른 경로 참조 시 평가 무효.)

**실제 동작 참고**: 사용자가 "kiki 설치해줘" 하면 너(Claude)는 `{{DIST}}` 의 `CLAUDE.md`·`README.md` 를 보고 그 지침을 따른다. 그 지침을 **실제로 따라갔을 때 막힘이 없는지** 가혹하되 공정하게 검증하라.

**목표**: `kk-mail` 을 첫 실행 직전(skill 인식되어 트리거 가능)까지.

**격리 (반드시)**: 가짜 HOME = `{{RUN_HOME}}`. 실제 시스템 `~/.claude` 절대 금지. install 은 `$env:USERPROFILE`(PowerShell)/`$HOME`(bash) 를 `{{RUN_HOME}}` 으로 바꿔 실행. 설치 동작은 가짜 home 안에서만.

**3 환경 평가** (너는 Windows 에 있으나 B·C 는 문서로 판단):
- A. Claude Code (CLI) on Windows — 실제 끝까지 설치 시도.
- B. Claude Code (CLI) on macOS/Linux — 문서대로 막힘 없이 가능한가?
- C. Claude Desktop 앱 — 설치 경로(대안 포함)가 문서에 명확한가?

**각 환경별 기록**: blockers `{step, issue, severity(high|med|low), guessed_action}` / ambiguities / assumed_knowledge / os_breaks / reload_issue.
**특히 점검**: PowerShell 실행정책 우회 / clone 후 "kiki 폴더에서 작업" / git·gh 미설치 대비 / 재시작(Desktop 은 Quit) / Desktop 인식실패 fallback / OS 분기(ps1/sh).
**환경 의존은 막힘 아님**: 포털 로그인·Chrome 확장·사내망·collaborator 초대는 정상 전제. 안내 명확성만 평가.

**점수 0-100 정수.** `zeroshot_success` = "HIGH blocker 가 없고 환경 의존만 남았는가".

**마지막에 이 JSON 만 코드블록으로** (앞 서술 OK):
```json
{
  "scenarios": {
    "code_windows": {"zeroshot_success": false, "blockers": [], "ambiguities": [], "assumed_knowledge": [], "os_breaks": [], "reload_issue": "", "score": 0},
    "code_macos":   {"zeroshot_success": false, "blockers": [], "ambiguities": [], "assumed_knowledge": [], "os_breaks": [], "reload_issue": "", "score": 0},
    "desktop":      {"zeroshot_success": false, "blockers": [], "ambiguities": [], "assumed_knowledge": [], "os_breaks": [], "reload_issue": "", "score": 0}
  },
  "top_failures": ["남은 치명 막힘 (없으면 빈 배열)"],
  "overall_zeroshot": false,
  "overall_score": 0,
  "fix_recommendations": ["남은 막힘 해소 (없으면 빈 배열)"]
}
```

너는 평가자다. 가혹하되 공정하게 — 환경 의존을 막힘으로 오분류하지 마라. 너의 최종 메시지가 그대로 결과로 쓰인다.
