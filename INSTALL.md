# kiki 설치 가이드

## 0. 전제 (모든 skill 공통 — 각자 본인 PC에서 한 번)
1. **Claude Code** 설치·로그인.
2. **Chrome + "Claude in Chrome"(MCP) 확장** 설치·연결.
3. **Chrome에 본인 KIST 로그인**
   - Dooray: `https://kist.gov-dooray.com` (kk-mail)
   - 통합정보: `http://p.kist.re.kr:8081` (kk-pay·kk-dining·kk-budget·kk-inspect)
   - ← 이게 인증이다. 대부분 별도 토큰·비번 없이 로그인 세션으로 동작.

> 모든 skill 은 첫 실행 때 이 환경을 동일하게 점검한 뒤 진행한다(연결/로그인 안 돼 있으면 안내 후 멈춤).

## 1. repo 받기
```
git clone https://github.com/angmond1/kiki.git
```
(초대받은 계정으로. private repo)

## 2. skill 복사 — `~/.claude/skills/` 로

### 방법 A — 설치 스크립트 (권장)
PowerShell에서:
```powershell
cd kiki
./install.ps1 kk-mail kk-pay kk-dining        # 원하는 skill 나열 (인자 없으면 전체)
```
공통 폴더(`_shared`)와 개인설정 템플릿(`~/.claude/kiki/`)까지 자동으로 챙긴다.

### 방법 B — 수동 복사
원하는 skill **과 공통 폴더 `_shared` 를 반드시 함께** 복사한다(`_shared` 없으면 동작 안 함).
```powershell
# Windows
Copy-Item -Recurse "kiki\skills\_shared" "$env:USERPROFILE\.claude\skills\_shared"
Copy-Item -Recurse "kiki\skills\kk-mail" "$env:USERPROFILE\.claude\skills\kk-mail"
```
```bash
# macOS/Linux
cp -r kiki/skills/_shared ~/.claude/skills/_shared
cp -r kiki/skills/kk-mail ~/.claude/skills/kk-mail
```
> **개인 config 는 복사 대상이 아니다** — 첫 실행 때 `~/.claude/kiki/` 에 만들어진다.

## 3. 공통 개인설정 (한 번만, 여러 skill 공유)
개인 식별정보·토큰은 **모든 kk-* 가 공유**하는 한 곳에 둔다(repo 밖):
- `~/.claude/kiki/kiki.config.json` — 이름·사번·카드책임자·담당 행정원·참여과제 등.
- `~/.claude/kiki/kiki.env` — Dooray 토큰(업로드 쓰는 skill 만).

대개 **첫 skill 설정 때 자동 생성**되고, 이후 다른 skill 은 이 값을 재사용한다(다시 묻지 않음). 직접 만들려면 `skills/_shared/kiki.config.example.json` · `kiki.env.example` 을 복사해 채운다. 자세히 → [skills/_shared/personal_config.md](skills/_shared/personal_config.md).

## 4. skill 별 첫 실행
Claude Code에서 `kk-<skill> 설정해줘` → 환경 점검 후 부족한 값만 물어보고 설정을 만든다.

| skill | 추가 python | 첫 실행 | 사용 예 |
|-------|------------|---------|---------|
| **kk-mail** | — | `kk-mail 설정해줘` (폴더 분류 권장 항목 순차 질문) | `지난주 광고 스팸 골라줘` / `앞으로 nature.com 은 저널 폴더로` |
| **kk-pay** | `pip install Pillow pywin32` | `kk-pay 설정해줘` (토큰·행정원 폴더·영수증 폴더) | `이번달 영수증 지급신청 처리해줘` |
| **kk-dining** | `pip install openpyxl` (+ hwp 동봉 시 `pyhwpx pywin32 pywinauto`) | `kk-dining 설정해줘` (저장 모드·업로드 여부) | `회의비 처리하자` |
| **kk-budget** | `pip install openpyxl` | `kk-budget 설정해줘` (추적 과제·카테고리) | `예산 수집해줘` / `예산 잔액 표로` |
| **kk-inspect** | `pip install Pillow PyMuPDF` | `kk-inspect 설정해줘` (위치·행정원·검수 폴더) | `이 폴더 증빙들 소액검수 올려줘` |

> **쓰기 작업(업로드·제출·결재상신·검수 신청·파일 첨부)은 항상 본인 확인 후** 진행된다.

## 5. 트러블슈팅
- **"로그인 해달라"** → Chrome에서 해당 시스템(Dooray / 통합정보) 로그인 후 재시도(세션 만료).
- **브라우저 연결 안 됨** → "Claude in Chrome" 확장 연결 확인(`list_connected_browsers`).
- **`_shared` 참조 오류** → skill 폴더와 함께 `skills/_shared` 도 `~/.claude/skills/_shared` 로 복사했는지 확인(방법 A 스크립트는 자동).
- **폴더 자동 생성 실패(kk-mail)** → Dooray 좌측에서 폴더를 직접 만든 뒤 재시도하면 규칙이 걸린다.
- **사내망 필요** → KIST 망/계정 권한을 따른다.
