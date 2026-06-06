# kiki 개인설정·토큰 (형제 skill 공유)

> 모든 kk-* skill 이 **개인 식별정보·토큰을 공유**한다. 한 번만 입력하면 다른 skill 이 다시 묻지 않는다.
> skill 텍스트·repo 에는 이 값들을 **절대 두지 않는다**(`security_policy.md` C1). 전부 `~/.claude/kiki/`(repo 밖).

## 파일 구성 (`~/.claude/kiki/`, repo 밖)
| 파일 | 내용 | 공유 범위 |
|------|------|----------|
| **`kiki.config.json`** | 공통 개인정보 — 이름·사번·연락처·카드책임자·담당 행정원·위치·참여과제 | **모든 kk-* 공유** |
| **`kiki.env`** | Dooray 개인 토큰 (`DOORAY_TOKEN=`) | 업로드 쓰는 skill 공유 |
| `kk-<skill>.config.json` | 그 skill **고유** 설정만 (예: 메일 분류규칙·예산 추적카테고리·회의록 저장모드) | 해당 skill |

템플릿: `kiki.config.example.json` · `kiki.env.example` (이 폴더). 복사해 채운다.

## 공유 원칙 (skill 부트스트랩이 따름)
1. **먼저 `~/.claude/kiki/kiki.config.json` 을 읽는다.** 이미 있는 값(이름·사번·카드책임자·행정원·과제 등)은 **다시 묻지 않는다.**
2. 없거나 비어 있는 **공통 항목만** 사용자에게 물어 `kiki.config.json` 에 채운다(그 skill 이 처음 채워도 다른 skill 이 재사용).
3. 그 다음 **skill 고유 설정**(`kk-<skill>.config.json`)만 추가로 묻는다.
4. 폴더·파일이 없으면 **빈 템플릿 자동 생성**(파일 직접 못 만드는 사용자 우회).

## 토큰 입력 (필요 skill 만)
- **(A) [안전]** 메모장으로 `~/.claude/kiki/kiki.env` 열어 `DOORAY_TOKEN=토큰값` 저장 → 경로만 알려주면 채팅 노출 0.
- **(B) [간편]** 채팅에 토큰 붙여넣기 → skill 이 `kiki.env` 에 저장(이후 재입력 불필요). ⚠️ 붙여넣는 순간 채팅 기록에 1회 노출.
- 토큰은 **repo·코드·로그 0건**(gitignore). 조회 전용 skill 은 토큰이 아예 필요 없다(세션 쿠키/SSO).

## 공통 필드 ↔ 사용하는 skill
| kiki.config.json 필드 | kk-mail | kk-pay | kk-dining | kk-budget | kk-inspect |
|----------------------|:---:|:---:|:---:|:---:|:---:|
| user.name | | ○ | ○ | ○ | ○ |
| user.emp_no | | ○ | ○ | | ○ |
| user.phone | | | | | ○ |
| card_holder | | ○ | ○ | | ○ |
| payment_admin | | ○ | ○ | | ○ |
| location | | | | | ○ |
| projects | | ○ | ○ | ○ | ○ |
| kiki.env (토큰) | (옵션) | ○ | (옵션) | | |

> kk-mail 은 개인 식별정보가 필요 없다(메일은 브라우저 세션 쿠키로 동작). 분류 선호만 `kk-mail.config.json` 에.
