---
name: tdd-auto-loop
description: GitHub 이슈 하나를 TDD 7단계로 **사람에게 묻지 않고 끝까지 자동 주행**한다. `/tdd-auto-loop {이슈번호}`로 실행한다. 각 단계를 Task subagent로 격리 실행하고, 하위 스킬의 승인 게이트는 subagent가 자체 통과하며, 단계마다 고정 JSON만 주고받는다. "자동으로 돌려줘", "알아서 끝까지", "무인으로", "승인 없이 진행", "auto loop", "자동 주행", "tdd-auto-loop", "/tdd-auto-loop" 관련 요청이면 명시적으로 '스킬'을 언급하지 않아도 반드시 사용한다. **사람의 확인 없이 커밋·push·PR 생성까지 진행하므로, 승인 게이트를 하나씩 밟고 싶으면 이 스킬이 아니라 `/tdd-loop`를 쓴다.**
---

# TDD Auto Loop — 묻지 않고 끝까지 간다

`/tdd-loop`의 자율 주행판이다. 7단계 순서와 각 단계가 하는 일은 **[`../tdd-loop/SKILL.md`](../tdd-loop/SKILL.md)를 그대로 따른다** — 여기서는 그 내용을 반복하지 않고, **자율 주행에서만 달라지는 것**을 정의한다.

- **입력**: GitHub 이슈 번호 `$ARGUMENTS` (예: `/tdd-auto-loop 13`)
- **저장소**: 모든 `gh` 명령에 `--repo mongilteacher/ccwork`를 붙인다. upstream 리모트가 있어 생략하면 번호는 같지만 다른 이슈를 읽는다
- **산출물**: PR 하나 + 단계별 JSON 리포트. 또는 STOP 지점과 사유

## `/tdd-loop`와 무엇이 다른가

|             | `/tdd-loop`              | `/tdd-auto-loop` (이 스킬)    |
| ----------- | ------------------------ | ----------------------------- |
| 승인 게이트 | 사람이 답해야 진행       | subagent가 자체 통과          |
| 단계 실행   | 메인 세션에서 Skill 호출 | **Task subagent로 격리**      |
| 애매할 때   | 사람에게 물음            | **STOP** — 절대 추측하지 않음 |
| 중단 시     | 사람이 판단              | 이슈에 코멘트 남기고 종료     |

**묻지 않는다는 것은 "알아서 판단한다"가 아니라 "판단이 필요하면 멈춘다"는 뜻이다.** 이 구분이 이 스킬의 안전장치 전부다. 사람이 없는 상태에서 추측으로 밀고 나가면, 잘못된 결정이 PR까지 실려 나가고 그걸 되돌리는 비용은 멈추는 비용보다 훨씬 크다.

---

## 격리 원칙

**메인 세션은 `src/`의 코드 본문을 읽지 않는다.** 구현·테스트·리뷰는 전부 subagent 안에서 끝나고, 메인에는 JSON만 올라온다. 컨텍스트를 아끼려는 것이자, AC 검증의 독립성을 지키려는 것이다.

- **AC 검증(4단계)은 Green(3단계)을 수행한 subagent와 반드시 다른 에이전트다.** 자기가 짠 코드를 자기가 검증하면 통과시키는 쪽으로 기운다. `ac-verifier` 에이전트 타입을 쓴다.
- subagent는 **종료 시 정해진 JSON 한 블록만** 반환한다.

### 예외 — 메인이 직접 돌리는 것 (교차 검증)

subagent의 자기 보고만 믿으면 **거짓 초록을 걸러낼 수단이 없다.** 그래서 메인은 아래 세 명령만 직접 실행해 **exit code로 사실 확인**한다. 출력을 읽어 코드를 판단하지 않으므로 격리는 유지된다.

```bash
npm test            # 3·5단계 후 — 정말 초록인가
npx tsc --noEmit    # 3·5·6단계 후 — 정말 타입이 맞는가
git status --short  # 0단계·각 커밋 후 — 정말 깨끗한가
```

subagent가 `"tests_passed": true`라고 했는데 `npm test`가 실패하면 **보고 불일치로 즉시 STOP**한다. 이건 그 단계의 실패보다 심각한 신호다 — 이후 단계의 판단 근거를 믿을 수 없다는 뜻이므로 재시도하지 않는다.

---

## 자율 모드 지시문 (모든 subagent 프롬프트 끝에 그대로 붙인다)

한 글자도 바꾸지 않고 아래를 프롬프트 마지막에 붙인다. 이게 빠지면 subagent가 승인을 기다리다 멈춘다.

```
## 자율 모드 (반드시 지킬 것)

- 너는 무인 파이프라인 안에서 실행된다. **사람에게 질문할 수 없다.** 질문하면 파이프라인이 멈춘다.
- 하위 스킬에 승인 게이트가 있으면 **네가 직접 판단해 통과시킨다.** 승인을 기다리지 마라.
- 다만 **모호하면 통과시키지 말고 STOP하라.** 다음 중 하나라도 해당하면 status를 "STOP"으로 반환한다:
  - 이슈·문서·코드가 서로 모순되어 어느 쪽이 맞는지 확정할 수 없다
  - 요구사항이 여러 해석을 허용하고, 선택에 따라 결과가 달라진다
  - 지시된 범위 밖의 파일을 고쳐야만 진행할 수 있다
  - 스킬의 절대 규칙을 어겨야만 진행할 수 있다
- **추측 금지.** "아마 이런 뜻일 것"으로 코드를 쓰지 마라. 확인할 수 없으면 STOP이 정답이다.
- 네가 내린 판단은 전부 decisions 배열에 남겨라. 사람이 나중에 감사한다.
- **출력은 지정된 JSON 한 블록뿐이다.** 인사말·설명·요약·마크다운을 앞뒤에 붙이지 마라.
  JSON 외의 텍스트가 있으면 파싱에 실패해 파이프라인이 STOP한다.
```

---

## 단계별 JSON 스키마 (변형 금지)

모든 단계가 아래 **공통 필드**를 갖는다. 값은 예시다 — 키 이름과 타입은 그대로, 값만 실제 결과로 채운다.

```json
{
  "stage": "green",
  "status": "OK",
  "reason": "",
  "decisions": ["TagFilterBar를 Context 소비로 구현 — AC 7이 loading/error를 요구하므로"],
  "files_changed": ["src/domain/tagFilter.ts", "src/components/TagFilterBar.tsx"]
}
```

- `status`는 `"OK"` 또는 `"STOP"` 둘 중 하나다. 다른 값은 스키마 위반이다.
- `status`가 `"STOP"`이면 `reason`에 **한 문장으로 왜 멈췄는지** 적는다. `"OK"`면 빈 문자열이다.
- `decisions`는 판단이 없었으면 빈 배열이다. 지어내지 않는다.

각 단계는 여기에 **자기 필드를 더한다**:

| 단계       | `stage` 값    | 추가 필드 (예시값)                                                                                                  |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1 시나리오 | `"scenarios"` | `"scenario_count": 16`, `"ac_count": 9`, `"uncovered_ac": []`, `"doc_path": "docs/features/tag-filter/issue-13.md"` |
| 2 Red      | `"red"`       | `"tests_written": 16`, `"all_failing": true`, `"passing_unexpectedly": []`                                          |
| 3 Green    | `"green"`     | `"tests_passed": true`, `"total_tests": 106`, `"failing_tests": []`                                                 |
| 4 AC 검증  | `"ac_verify"` | `"ac_passed": false`, `"ac_results": [{"ac": 9, "verdict": "gap", "evidence": "NoteList.test.tsx 부재"}]`           |
| 5 Refactor | `"refactor"`  | `"applied": []`, `"skipped": ["팔레트 마이그레이션 — 범위 밖"]`, `"tests_passed": true`                             |
| 6 Security | `"security"`  | `"type_errors": 0`, `"audit_high_or_above": 0`, `"secrets_found": []`                                               |
| 7 PR       | `"pr"`        | `"pr_url": "https://github.com/mongilteacher/ccwork/pull/15"`, `"base": "feature/tag-filter"`, `"closes": 13`       |

**JSON이 파싱되지 않거나 필수 키가 없으면 스키마 위반이다.** 처리는 아래 「재시도」를 따른다.

---

## 진행 표시

단계가 끝날 때마다 **한 줄만** 출력한다. 그 외 중간 설명을 하지 않는다.

```
[scenarios] OK
[red] OK
[green] OK (2회 시도)
[ac_verify] STOP(AC 9 미충족 — NoteList 회귀 테스트 부재)
```

형식은 `[{stage}] OK` 또는 `[{stage}] STOP({reason})`이다. 재시도가 있었으면 `OK (N회 시도)`로 표시한다.

---

## 재시도

| 대상                         | 정책                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| **Green(3단계)**             | 최대 **3회**. 실패 시 재시도                                      |
| 그 외 모든 단계              | **스키마 위반일 때만 1회** 재시도. 내용상 실패는 재시도 없이 STOP |
| 보고 불일치 (교차 검증 실패) | **재시도 없음** — 즉시 STOP                                       |

**재시도할 때는 이전 실패를 반드시 프롬프트에 넘긴다.** subagent는 컨텍스트가 격리돼 이전 시도를 모르므로, 그냥 다시 부르면 같은 실패를 반복한다. 아래를 프롬프트에 추가한다:

```
## 이전 시도 실패 정보 (N회차)

직전 시도는 다음 이유로 실패했다. 같은 접근을 반복하지 말고 원인을 먼저 분석하라.

- 실패한 테스트: {failing_tests}
- 에러 요약: {reason}
```

Green을 3회 시도하고도 초록이 안 되면, 그건 구현 난이도 문제가 아니라 **시나리오·시그니처·테스트 중 무언가가 어긋났다는 신호**다. 네 번째 시도가 아니라 사람이 볼 차례다.

---

## STOP 조건

아래 중 하나라도 걸리면 즉시 멈춘다. **사람에게 묻지 않는다** — 자율 주행에서 "물어본다"는 선택지가 없으므로, 판단이 필요한 상황은 전부 STOP이다.

| 단계        | STOP 조건                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------ |
| 0 사전 점검 | AC 0개 / 워킹 트리 더러움 / base가 `feature/<spec>` 아님 / 이슈 조회 실패 / 선행 이슈 미완 |
| 1 시나리오  | `uncovered_ac`가 비어 있지 않음 (AC를 못 덮는 시나리오는 다음 단계의 근거가 못 된다)       |
| 2 Red       | `all_failing`이 false이면서 `passing_unexpectedly`에 **새 기능 테스트**가 있음             |
| 3 Green     | 3회 시도 후에도 `tests_passed`가 false                                                     |
| 4 AC 검증   | `ac_passed`가 false                                                                        |
| 5 Refactor  | `tests_passed`가 false (리팩터가 동작을 바꿨다는 뜻)                                       |
| 6 Security  | `type_errors > 0` 또는 `audit_high_or_above > 0` 또는 `secrets_found`가 비어 있지 않음     |
| 7 PR        | E2E 실패 / commitlint 거절 / push 거절 / PR 생성 실패                                      |
| 전 단계     | JSON 스키마 위반 2회 / 교차 검증 불일치 / subagent가 `status: "STOP"` 반환                 |

### 2단계 STOP 조건에 예외가 있는 이유

회귀 테스트(이미 맞게 도는 동작을 뒤늦게 고정하는 것)는 **Red 없이 처음부터 통과하는 게 정상**이다. 그래서 `passing_unexpectedly`에 그런 항목만 있으면 STOP하지 않는다. 다만 그런 테스트는 "빈 테스트"일 수도 있으므로, **subagent가 대상 코드를 일부러 깨뜨려 그 테스트가 실제로 실패하는지 확인한 뒤 원복**하게 한다(뮤테이션 확인). 확인에 실패하면 STOP이다.

### STOP 처리

1. 메인 로그에 한 줄: `[{stage}] STOP({reason})`
2. 이슈에 코멘트 (사람이 나중에 발견할 지점):

   ```bash
   gh issue comment $ARGUMENTS --repo mongilteacher/ccwork --body "$(cat <<'EOF'
   🛑 tdd-auto-loop 중단

   - 단계: {stage}
   - 사유: {reason}
   - 브랜치: {branch} (그대로 남겨둠)
   - 완료된 단계: {완료 목록}

   `/tdd-loop {N}`으로 이어서 진행하거나, 위 사유를 해소한 뒤 다시 돌리세요.
   EOF
   )"
   ```

3. **루프 종료.** 다음 단계로 넘어가지 않는다.

**브랜치와 커밋은 지우지 않는다.** 실패한 작업물이 디버깅의 단서다. 자율 주행이 자기가 만든 것을 자기 판단으로 지우기 시작하면, 사람이 무슨 일이 있었는지 재구성할 방법이 사라진다.

---

## 0단계 — 사전 점검 (메인이 직접 수행)

이 단계만은 subagent를 쓰지 않는다. 판정이 전부 명령 한 줄로 끝나고, 여기서 막히면 subagent를 띄울 이유 자체가 없다.

```bash
gh issue view $ARGUMENTS --repo mongilteacher/ccwork          # AC 존재 · 선행 이슈
git status --short                                            # 비어 있어야 함
git branch --show-current                                     # feature/<spec> 형태여야 함
git branch --list "feat/*"                                    # 같은 슬러그 브랜치 존재 여부
lsof -nP -iTCP:5173 -sTCP:LISTEN; lsof -nP -iTCP:3001 -sTCP:LISTEN   # dev 서버 점유 여부
```

- **AC가 0개면 STOP.** 이후 모든 단계가 AC를 기준으로 돌아간다.
- **워킹 트리가 더러우면 STOP.** 브랜치를 옮기면 무관한 변경이 따라와 PR에 섞인다.
- **base가 `feature/<spec>`이 아니면 STOP.** 이 값은 7단계 PR base로 그대로 쓰인다.
- **같은 이름의 `feat/<slug>` 브랜치가 이미 있으면 STOP.** 대화형이라면 "이어서 할지" 물어볼 자리지만, 자율 주행에는 그 선택지가 없다. 덮어쓰기는 남의 커밋을 지울 수 있으므로 절대 하지 않는다.
- **5173/3001이 점유돼 있으면 STOP.** Playwright의 `reuseExistingServer` 때문에 7단계 E2E가 **실제 `db.json`에 붙어 데이터를 오염**시킨다. 7단계까지 가서 발견하면 그때는 이미 늦다.

전부 통과하면 `git checkout -b feat/<issue-slug>`로 분기하고 1단계로 간다.

---

## 1~7단계 — subagent 호출

각 단계는 Task(Agent) 도구로 **새 subagent**를 띄운다. 프롬프트 구성은 항상 이 순서다:

1. **무엇을 할지** — 해당 하위 스킬을 이슈 번호와 함께 실행하라는 지시 (`/tdd-loop`의 표 참조)
2. **맥락** — 이슈 번호, 저장소(`mongilteacher/ccwork`), 기능 디렉터리, 브랜치, base 브랜치
3. **반환 스키마** — 그 단계의 JSON 예시를 그대로 제시
4. **자율 모드 지시문** — 위 블록을 한 글자도 바꾸지 않고 붙임
5. (재시도라면) **이전 실패 정보** 블록

단계별로 자율 주행에서 추가로 챙길 것:

- **4단계** — `subagent_type: "ac-verifier"`로 띄운다. Green subagent와 절대 같은 에이전트를 재사용하지 않는다.
- **5단계** — 자율 주행에서 Refactor는 **보수적으로** 간다. 적용할 게 없으면 `applied: []`로 끝내는 것이 정답이다. 사람 승인 없이 구조를 바꾸는 것보다 안 바꾸는 쪽이 안전하다.
- **6단계** — 분류 중 🔴만 STOP 사유다. 🟡·⚪는 `decisions`에 남기고 통과시킨다.
- **7단계** — 커밋은 commitlint를 통과해야 한다(제목 `<type>: <한국어 제목>`, 빈 줄, **본문 2줄 이상 · 각 줄 100자 이하**). `--no-verify`는 절대 쓰지 않는다 — 훅을 우회하는 건 자율 주행이 스스로 안전장치를 끄는 것이다. 거절되면 메시지를 고쳐 1회 재시도하고, 또 거절되면 STOP.
  PR은 `--base {0단계에서 확인한 feature/<spec>}`, 본문에 `Closes #$ARGUMENTS`를 포함한다. 생성 후 이슈에 PR 링크를 코멘트한다.

  **`Closes`만으로는 이슈가 닫히지 않는다.** GitHub은 PR이 _기본 브랜치로_ 머지될 때만 자동 클로즈하는데 이 사이클의 base는 `feature/<spec>`이다. 완주 리포트에 "머지 후 `gh issue close`가 필요하다"를 명시한다 — 자율 주행은 머지하지 않으므로 여기서 닫지는 않는다.

### 7단계 진입 직전 — 포트를 다시 확인한다

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN; lsof -nP -iTCP:3001 -sTCP:LISTEN
```

0단계에서 이미 봤지만 **한 번 더 본다.** 주행은 10~20분이 걸리고, 그 사이 사람이 `npm run dev`를 띄우면 E2E가 `reuseExistingServer` 때문에 실제 `db.json`에 붙어 데이터를 오염시킨다. 0단계 점검은 시작 시점의 사진일 뿐이라 이 창을 못 막는다.

점유돼 있으면 **STOP**한다. 사람이 쓰고 있을 수 있는 프로세스를 자율 주행이 말없이 죽이지 않는다 — 무엇이 떠 있는지(`ps -o command= -p <pid>`) 보여주고 사람이 정하게 한다.

---

## 완주 리포트

7단계까지 STOP 없이 끝나면 아래 형식으로 **한 번만** 보고한다.

```
✅ tdd-auto-loop 완주 — 이슈 #13

[scenarios] OK  [red] OK  [green] OK (2회 시도)  [ac_verify] OK
[refactor] OK  [security] OK  [pr] OK

PR: https://github.com/mongilteacher/ccwork/pull/16
브랜치: feat/tf-2-tag-highlight → feature/tag-filter
테스트: 118개 통과 / 타입 오류 0 / audit high+ 0

자율 판단 기록 (사람 확인 권장)
- [green] TagFilterBar에 selectedTag prop 추가 — 시그니처 문서 기준
- [refactor] 팔레트 마이그레이션 보류 — 이슈 범위 밖
```

**`decisions` 배열을 반드시 모아 보여준다.** 자율 주행의 가장 큰 위험은 결정이 조용히 내려지는 것이다. 사람이 사후에 감사할 수 있어야 이 스킬을 신뢰하고 쓸 수 있다.
