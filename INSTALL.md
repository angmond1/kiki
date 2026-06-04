# kiki 설치 가이드

## 0. 전제 (각자 본인 PC에서 준비 — 이것이 "환경별 개별 준비")
1. **Claude Code** 설치·로그인.
2. **Chrome + "Claude in Chrome"(MCP) 확장** 설치·연결.
3. **Chrome에 본인 KIST Dooray 로그인** (`https://kist.gov-dooray.com`). ← 이게 인증. 별도 토큰·비번 없음.

> 이 3가지만 되면, 폴더 ID·멤버 정보 등 개인값은 skill이 **실행 때 자동 조회**한다.

## 1. repo 받기
```
git clone https://github.com/angmond1/kiki.git
```
(초대받은 계정으로. private repo)

## 2. 원하는 skill을 Claude Code skills 폴더로 복사
Windows (PowerShell):
```powershell
Copy-Item -Recurse "kiki\skills\ki-mail" "$env:USERPROFILE\.claude\skills\ki-mail"
```
macOS/Linux:
```bash
cp -r kiki/skills/ki-mail ~/.claude/skills/ki-mail
```
> 형제 skill(ki-pay 등)도 같은 방식. **개인 config는 복사 대상 아님** — 첫 실행 때 `~/.claude/kiki/`에 생성된다.

## 3. 첫 실행 (부트스트랩)
Claude Code에서:
```
ki-mail 설정해줘
```
→ skill이 Chrome 연결·Dooray 로그인 확인 → 본인 메일 폴더를 자동 조회 → "광고/학회/공고를 폴더로 분류할지" 물어봄 → `~/.claude/kiki/ki-mail.config.json` 생성.
- config 없이도 스팸 처리·자연어 규칙은 동작. config는 폴더 분류 선호 기억용.

## 4. 사용 예
```
지난주 받은 메일에서 광고성 스팸 골라줘
앞으로 nature.com 에서 오는 메일은 저널 폴더로 자동분류해줘
```

## 트러블슈팅
- **"로그인 해달라"고 뜸** → Chrome에서 `kist.gov-dooray.com` 로그인 후 재시도(세션 만료).
- **브라우저 연결 안 됨** → Claude in Chrome 확장 연결 확인.
- **폴더 자동 생성 안 됨** → 현재는 Dooray 좌측에서 폴더를 직접 만든 뒤 규칙을 걸면 됨(자동분류는 정상 동작).
- **사내망 필요** → Dooray 접속은 KIST 망/계정 권한을 따른다.
