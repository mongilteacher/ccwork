# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 목적

React 19 + TypeScript + Vite 기반의 **노트 앱 실습(강의) 프로젝트**. 프로덕션 서비스가 아니라 기능을 단계적으로 추가하며 학습하는 코드베이스다. 백엔드는 `db.json`을 쓰는 json-server 목(mock) API로 대체한다. `src/types/note.ts`의 `tags` 주석처럼, 코드에 "강의에서 추가할 것" 같은 의도적 미완성 지점이 남아 있을 수 있다.

기능별 정의서·PRD·구현 명세는 [`docs/features/<기능>/`](docs/features/)에 있다. **아직 구현되지 않은 기능의 설계 결정(ADR)이 여기 먼저 들어온다** — 해당 기능을 건드리기 전에 그 디렉터리를 먼저 읽는다.

## 명령어

| 명령어               | 설명                                                         |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Vite(5173) + json-server(3001)를 `concurrently`로 동시 실행  |
| `npm run server`     | json-server만 단독 실행 (API가 없으면 앱이 로딩 상태에 멈춤) |
| `npm run build`      | `tsc` 타입체크 후 Vite 프로덕션 빌드                         |
| `npm run lint`       | ESLint 검사 + 자동 수정 (`--fix` 포함되어 있음)              |
| `npm run typecheck`  | `tsc --noEmit` 타입 검사만 (pre-commit 훅이 실행)            |
| `npm run format`     | Prettier 전체 포맷                                           |
| `npm test`           | Vitest 1회 실행                                              |
| `npm run test:watch` | Vitest watch 모드                                            |

- 단일 테스트 실행: `npx vitest run src/path/to/File.test.tsx` 또는 `npx vitest run -t "테스트 이름"`
- 앱은 반드시 API(3001)가 떠 있어야 정상 동작한다. 프론트만 봐야 할 때도 `npm run dev`를 쓰는 게 안전하다.

## 아키텍처

데이터 흐름은 **단방향 3계층**이다. 새 기능은 이 흐름을 그대로 따라 확장한다:

```
src/domain/*        → 순수 규칙. React·fetch·DOM 무의존 (도입 예정, 아래 참조)
src/api/notes.ts   → fetch 래퍼. 순수 함수, React 의존성 없음
src/context/NotesContext.tsx → 전역 상태 + api 호출 오케스트레이션
src/components/*    → useNotes()로 상태 소비, UI만 담당
src/hooks/*         → 컴포넌트에서 뽑아낸 재사용 동작 (도입 예정, 아래 참조)
```

- **도메인 계층** (`src/domain/`): **아직 파일이 없다.** 태그 기능(→ [`docs/features/tag/prd.md`](docs/features/tag/prd.md) ADR-3)에서 `src/domain/tag.ts`로 처음 도입된다. 정규화·유효성 검사처럼 **React·fetch·DOM을 모르는 순수 문자열/데이터 규칙**은 컴포넌트가 아니라 여기에 둔다. 판단 기준은 "이 함수를 테스트하는 데 jsdom이 필요한가?" — 필요 없으면 도메인 계층 후보다. 검증 실패는 **에러 코드**(`type TagError = 'duplicate' | 'tooLong' | 'tooMany'`)로 반환하고, **한국어 문구 매핑은 UI 계층이 한다.** 도메인이 사용자 문구를 알면 문구 변경이 규칙 테스트를 깨뜨린다.
- **API 계층** (`src/api/notes.ts`): `API_URL`(`http://localhost:3001`) 하드코딩. 모든 함수는 `res.ok`를 검사하고 실패 시 `throw new Error(...)`. `createNote`/`updateNote`가 `createdAt`/`updatedAt` 타임스탬프를 클라이언트에서 생성해 주입한다. **정규화·검증을 api 계층에 넣지 않는다** — 순수 fetch 래퍼 규약을 지킨다.
- **훅 계층** (`src/hooks/`): **아직 파일이 없다.** 태그 기능의 `useTagInput`이 첫 사례다. 입력 state·IME 가드·에러 클리어 타이밍처럼 **렌더와 무관한 동작**을 컴포넌트에서 분리할 때 쓴다. 훅은 도메인 함수를 호출하고, 컴포넌트는 훅을 호출한다.
- **상태 계층** (`NotesContext.tsx`): 앱 전역 상태의 단일 소스. `notes` 배열을 들고 `addNote`/`editNote`/`removeNote`를 노출한다. 각 mutation은 api 호출 성공 후 **로컬 `notes`를 낙관적으로 갱신**(setNotes)하는 패턴 — 재fetch하지 않는다. 컴포넌트는 항상 `useNotes()` 훅으로 접근하며, Provider 밖에서 호출하면 throw된다.
- **UI 계층** (`src/components/`): 상태를 소유하지 않는다. 최상위 선택/생성 상태(`selectedNoteId`, `isCreating`)만 `App.tsx`가 로컬 `useState`로 관리하고 props로 내려준다. `Layout`은 `sidebar`/`main` slot을 받는 순수 레이아웃, `NoteList`→`NoteItem`은 목록, `NoteEditor`는 편집/생성 겸용 폼(`isCreating` 플래그로 분기).

### 핵심 패턴

- **편집기 폼 동기화**: `NoteEditor`는 선택된 노트가 바뀌면 `useEffect`로 로컬 `title`/`content` state를 다시 채운다. 의존성 배열은 `[selectedNoteId, isCreating]`로 제한하고 `eslint-disable-line react-hooks/exhaustive-deps`를 명시적으로 붙여 둔 상태다 — 이 의도를 깨지 않도록 주의.
- **폼 확정 시점**: 폼의 모든 필드는 **저장 버튼을 눌러야** 서버에 반영된다. 개별 필드를 즉시 PATCH하지 않는다 — 취소 버튼이 부분 롤백이 되고, `isCreating` 중에는 `id`가 없어 PATCH 대상 자체가 없다. 새 필드를 추가할 때도 로컬 state에 모았다가 저장 시 한 번에 보낸다(→ [태그 PRD](docs/features/tag/prd.md) ADR-2).
- **로딩/에러/빈 상태**: 목록 렌더 전에 `loading`/`error`/`length === 0`을 순서대로 early return으로 처리(`NoteList`). 새 데이터 표시 컴포넌트도 이 3분기를 따른다.
- **컴포넌트 규약**: 함수 선언(`export function`) + 상단 `interface XxxProps` 정의가 일관된 스타일. 기본 export는 `App`뿐이고 나머지는 named export.

### 스타일링

**UI·스타일 작업은 반드시 `design-system` 스킬로 시작한다.** Tailwind 클래스를 쓰거나 고치기 전에, 색상·간격·그림자·테두리·폰트를 정하기 전에, 컴포넌트를 새로 만들기 전에, `src/index.css`의 `@theme`를 건드리기 전에 스킬을 먼저 부른다. 스킬이 [`docs/design-system/`](docs/design-system/README.md)의 정본 규격 중 필요한 문서만 골라 읽어준다.

정본 문서의 구성:

| 문서                                                     | 내용                                                 |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [`foundations.md`](docs/design-system/foundations.md)    | 색상·타이포·엘리베이션·스페이싱 토큰 (hex 단일 출처) |
| [`components/`](docs/design-system/components/README.md) | 버튼·카드/리스트·인풋·Knowledge Token 규격           |
| [`migration.md`](docs/design-system/migration.md)        | 현재 코드와 정본의 차이 + 적용 로드맵                |

각 문서가 Do/Don't를 자체 보유한다. **규칙 본문을 이 파일에 중복시키지 않는다.**

- 편집 후 `PostToolUse` 훅(`.claude/hooks/design-system-check.sh`)이 `src/**/*.tsx`와 `src/index.css`를 검사한다. **ratchet 방식이다** — 파일 전체가 아니라 `git diff` 기준 **새로 추가된 줄만** 보고, 거기서 위반이 나오면 차단한다(`exit 2`). 기존 코드의 위반은 통과시키므로 마이그레이션 이전 파일도 자유롭게 편집할 수 있고, 되돌아가는 것만 막힌다. 상태 파일은 없다.
- 훅이 잡는 것: 원시 Tailwind 색상, arbitrary 그림자·간격, hex 직접 기입, 인라인 `style`, 테두리 사용(No-Line Rule).
- Tailwind CSS v4를 `@tailwindcss/vite` 플러그인으로 사용. 설정 파일이 아니라 `src/index.css`의 `@theme` 블록에 디자인 토큰을 정의한다.
- 현재 코드는 구버전 토큰(`bg-card`, `border-border` 등)을 쓰고 있다. **기존 코드를 패턴 참고용으로 복사하지 말 것** — 지금 있는 게 정답이 아니다.
- 서체는 본문 `--font-sans`(Pretendard), 로고 전용 `--font-display`(Boogaloo). Stitch 원문의 Inter는 한글 글리프 부재로 **의도적으로 채택하지 않는다**.

## 구현 패턴

### API 호출 패턴 (`src/api/notes.ts`)

새 엔드포인트 함수는 아래 골격을 그대로 복제한다:

```ts
export async function verbNoun(...): Promise<T> {
  const res = await fetch(`${API_URL}/notes/...`, { ...options });
  if (!res.ok) throw new Error('Failed to <동사> <명사>');
  return res.json();          // 반환값이 없으면(DELETE) 이 줄 생략
}
```

- `export async function` + 명시적 `Promise<T>` 반환 타입. 화살표 함수 금지.
- 에러 메시지는 **영문 소문자 동사구**(`'Failed to fetch notes'`). 사용자에게 직접 보이는 문자열이 아니라 개발자용이다.
- 요청 본문이 있는 메서드는 `headers: { 'Content-Type': 'application/json' }` + `JSON.stringify` 필수.
- 부분 수정은 PUT이 아니라 **PATCH + `Partial<Note>`**.
- 타임스탬프는 서버가 아니라 **api 계층에서 주입**한다: 생성 시 `createdAt`/`updatedAt` 동시 세팅, 수정 시 `updatedAt`만 덮어쓰기. 컴포넌트/Context는 타임스탬프를 만들지 않는다.
- 입력 타입은 `Omit<Note, 'id' | 'createdAt' | 'updatedAt'>`처럼 `Note`에서 파생시킨다. 별도 DTO 인터페이스를 만들지 않는다.
- `id`는 `db.json`에서도 문자열(`"1"`)이다. 숫자로 다루지 말 것.

### 상태관리 패턴 (`src/context/NotesContext.tsx`)

- Context 값 타입은 `XxxContextType` 인터페이스로 파일 상단에 선언, `createContext<XxxContextType | null>(null)`로 **null 초기값**을 준다. 가짜 기본값을 채우지 않는다.
- Provider는 `export function XxxProvider({ children }: { children: ReactNode })` — Provider만 예외적으로 `interface Props`를 만들지 않고 인라인 타입을 쓴다.
- 소비 훅 `useXxx()`는 항상 Provider와 같은 파일에 두고, `if (!ctx) throw new Error('useXxx must be used within XxxProvider')` 가드를 붙인다.
- 초기 데이터 로드는 `useEffect(() => { api.fetchX().then(setX).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])` — async 함수 선언 대신 **프라미스 체인**을 쓴다.
- mutation 3종은 **api 함수와 이름이 같다**(`createNote`/`updateNote`/`deleteNote`). `import * as api` 네임스페이스 덕에 충돌하지 않고, Context 메서드 ↔ api 함수가 1:1로 대응한다. 새 mutation도 api 쪽 이름을 그대로 쓴다.
- mutation은 모두 **api 호출 → 성공 시 setNotes로 로컬 배열만 갱신**한다. 재fetch 없음. 갱신은 각각 스프레드 추가 / `map` 교체 / `filter` 제거이며 항상 `setNotes((prev) => ...)` 함수형 업데이트를 쓴다.
- api 모듈은 `import * as api from '../api/notes'`로 네임스페이스 임포트하고 `api.createNote(...)`로 호출한다. 개별 named import 하지 않는다.
- **컴포넌트 로컬 state는 UI 전용만** 가진다: 폼 입력값(`title`/`content`), 제출 중 플래그(`saving`), 최상위 선택 상태(`selectedNoteId`/`isCreating`). 서버 데이터는 절대 컴포넌트가 복제 소유하지 않는다.

### 에러 처리 패턴

계층별로 역할이 고정돼 있다:

| 계층     | 역할                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| 도메인   | 검증 실패를 **에러 코드로 반환**한다. throw하지 않고 사용자 문구도 모른다    |
| api      | `res.ok` 검사 후 `throw new Error(...)`. 잡지 않는다                         |
| Context  | **초기 로드 실패만** `error` state로 흡수. mutation은 잡지 않고 그대로 throw |
| 컴포넌트 | mutation 호출을 `try/catch`로 감싸고 **`console.error(e)`로만 처리**         |

- **`alert()`·`confirm()` 등 브라우저 모달은 쓰지 않는다.** 서버 요청 실패는 콘솔에만 남기고 UI는 조용히 유지한다(`NoteEditor.handleSave`, `NoteList.handleDelete`).
- **폼 검증 실패는 다르다 — 화면에 보여준다.** 사용자가 방금 한 입력에 대한 즉각 피드백이라 반응이 없으면 "안 눌렸나?"로 읽힌다. 입력 필드 **바로 아래 인라인 한 줄**(`text-destructive text-xs`)로 표시하고, **사용자가 입력값을 바꾸는 순간(`onChange`) 지운다.** 타이머로 자동 제거하지 않는다 — 시간이 지나 사라지면 원인을 놓친다. 토스트·`alert`은 쓰지 않는다(→ [태그 PRD](docs/features/tag/prd.md) ADR-4).
- 이 인라인 패턴은 태그 기능에서 **처음 도입**된다. 아래 「알려진 불일치」 1번의 첫 개선 사례이며, 이후 폼 검증(제목 누락 등)도 같은 방식으로 옮겨간다.
- Context mutation을 컴포넌트에 그대로 prop으로 넘기지 말 것. 반드시 `handleXxx` 래퍼로 감싸 try/catch를 붙인다 — 안 그러면 unhandled rejection이 된다.
- 화면에 에러를 렌더하는 건 현재 초기 로드 실패(`NoteList`의 `error` 분기) 한 곳뿐이다.

### 컴포넌트 구현 패턴 (`src/components/`)

파일 하나당 컴포넌트 하나, 구조는 항상 이 순서다:

```tsx
import ...

interface XxxProps { ... }        // 1. props 인터페이스 (컴포넌트 바로 위)

export function Xxx({ a, b }: XxxProps) {   // 2. 함수 선언 + 구조분해
  const { notes, ... } = useNotes();        // 3. context 소비
  const [local, setLocal] = useState(...);  // 4. 로컬 state
  const derived = notes.find(...);          // 5. 파생값 (useMemo 안 씀)
  useEffect(...)                            // 6. 동기화
  const handleXxx = async () => { ... };    // 7. 핸들러
  if (조건) return <.../>;                   // 8. early return 분기
  return ( ... );                           // 9. 메인 JSX
}
```

- **props 전달 방향**: 데이터는 Context에서 직접 당겨오고(`useNotes()`), props로는 **선택 상태와 콜백만** 내려보낸다. `notes` 배열을 props로 넘기지 않는다.
- **early return 분기**: 렌더할 게 없는 상태는 JSX 안 삼항이 아니라 함수 상단 early return으로 처리한다. `NoteList`는 `loading → error → 빈 배열` 순서, `NoteEditor`는 "아무것도 선택 안 됨" 분기.
- **JSX 주석 라벨**: 블록이 3개 이상인 마크업은 `{/* 헤더 */}`, `{/* 제목 입력 */}`처럼 한글 섹션 주석을 단다.
- **리스트 렌더**: `key={note.id}`. 감싸는 div 없이 `<>...</>` 프래그먼트로 반환하고 간격은 부모(`Layout`의 `space-y-2`)가 책임진다.
- **빈 값 폴백**: 표시용 문자열은 `{note.title || '(제목 없음)'}` 형태로 괄호 친 한글 폴백.
- **이벤트 버블링**: 카드 안 버튼은 `e.stopPropagation()` 후 자기 동작을 수행한다(`NoteItem` 삭제 버튼).
- 조건부 className은 유틸 없이 **템플릿 리터럴 + 삼항**으로 직접 조합한다(`clsx`/`cn` 미도입).

### 네이밍 패턴

| 대상               | 규칙                                  | 예                                                  |
| ------------------ | ------------------------------------- | --------------------------------------------------- |
| 컴포넌트 파일/함수 | PascalCase, 파일명 = 컴포넌트명       | `NoteEditor.tsx` → `NoteEditor`                     |
| props 인터페이스   | `<컴포넌트명>Props`, 컴포넌트 바로 위 | `NoteEditorProps`                                   |
| Context 타입       | `<도메인>ContextType`                 | `NotesContextType`                                  |
| 콜백 **prop**      | `on` + 동사                           | `onSelect`, `onDelete`, `onNewNote`, `onDone`       |
| 콜백 **구현체**    | `handle` + 동사                       | `handleSelectNote`, `handleSave`                    |
| boolean state      | `is`/동명사                           | `isCreating`, `isSelected`, `loading`, `saving`     |
| api 함수           | `동사 + Note(s)`, CRUD 동사           | `fetchNotes`/`createNote`/`updateNote`/`deleteNote` |
| Context mutation   | api 함수와 **동일한 이름**            | `createNote`/`updateNote`/`deleteNote`              |
| 콜백 파라미터      | 단축 이름                             | `(n) => n.id`, `(e) => ...`                         |
| 사용자 문구        | 전부 한국어. 주석도 한국어            | `'저장 중...'`, `// 폼 동기화`                      |

## 알려진 불일치 (새 코드에서 따라 하지 말 것)

아래는 실제 코드에 존재하는 **일관성 없는 지점**이다. 기존 코드를 참고할 때 이 부분만은 복제하지 말고, 손대는 김에 정리할 여지가 있다.

1. **실패가 사용자에게 전혀 안 보인다.** `alert`을 걷어내면서 저장/삭제 실패도, "제목이 비었음" 유효성 검사도 `console.error`만 남았다. 사용자 입장에선 저장 버튼을 눌렀는데 아무 일도 안 일어난 것처럼 보인다. → **해소 진행 중**: 태그 기능이 폼 검증에 인라인 메시지를 도입한다(「에러 처리 패턴」 참조). 저장 실패·제목 누락도 같은 패턴으로 옮기면 된다.
2. **로딩 표시 기준이 제각각이다.** 전역 `loading`은 Context, 저장 중 `saving`은 `NoteEditor` 로컬, 삭제는 로딩 표시가 아예 없다(연타 가능).
3. **Layout만 인라인 `style`을 쓴다.** `height: 'calc(100vh - 65px)'`의 `65px`는 헤더 높이 하드코딩이라 헤더 패딩을 바꾸면 조용히 깨진다. 폰트도 `style={{ fontFamily: 'Boogaloo, sans-serif' }}` 인라인 — 다른 토큰은 `@theme`에 있는데 이것만 예외.
4. **그림자 값이 토큰화돼 있지 않다.** `shadow-[0_2px_12px_rgba(0,0,0,0.07)]` / `...0.12)` / `0_1px_4px...0.06)` 세 가지가 arbitrary value로 흩어져 있다. 시맨틱 색은 토큰을 쓰면서 그림자만 그렇지 않다.
5. **`NoteItem`의 카드가 `div` + `onClick`이다.** 키보드 포커스/엔터가 안 되고, 그 안에 `button`이 중첩돼 있어 `button`으로 바꾸기도 어렵다.
6. **테스트가 0개다.** Vitest·`test-setup.ts`·Testing Library 3종은 설정돼 있지만 테스트 파일이 하나도 없다. → **해소 진행 중**: 태그 기능의 `src/domain/tag.test.ts`가 첫 테스트다(아래 「테스트 규약」 참조).

## 테스트 규약

- **단위 테스트의 1순위 대상은 도메인 계층**(`src/domain/*.ts`)이다. jsdom 없이 순수 함수만 검증하므로 빠르고, 실패 원인이 규칙인지 렌더인지 헷갈리지 않는다.
- 명세서가 **입력 → 결과 표**로 규칙을 적어둔 경우(예: [태그 명세서](docs/features/tag/spec-fixed.md) §5.2·§6.2) `it.each`로 표를 그대로 옮긴다. 케이스를 임의로 재구성하지 말 것 — 명세와 테스트가 1:1로 대응해야 한다.
- 컴포넌트 테스트는 **props만 받는 순수 컴포넌트**(`NoteItem`, `TagInput`)를 우선한다. Context를 소비하는 컴포넌트는 Provider 래핑이 필요해 비용이 크다.
- **e2e 프레임워크는 없다.** Playwright/Cypress 미설치이며, json-server가 실제 `db.json`을 수정하므로 도입하려면 픽스처 격리가 선행돼야 한다. 현재는 계획에 없다.
- **`npm test`를 husky 훅에 넣지 말 것.** 넣으려면 `vitest run --passWithNoTests`를 써야 한다(아래 「커밋 규칙」 주의사항).

## TDD 이슈 사이클

새 이슈 작업 시 다음 순서를 따른다:

1. /test-scenarios N — 시그니처 + 시나리오 (skill)
2. /tdd-red N — 실패 테스트 작성 (skill)
3. /tdd-green N — 최소 구현, 테스트 전체 통과 (skill)
4. @ac-verifier N — AC 충족 독립 검증, 테스트 통과 ≠ AC 충족 (agent)
5. /tdd-refactor N — 구조 개선, 깨지면 즉시 롤백 (skill)
6. /security-review N — 타입·보안 점검 (skill)
7. commit → PR --base feature/<spec> → squash merge → 이슈 클로즈

각 단계는 인간 승인 게이트가 있다. **자동으로 다음 단계로 넘어가지 말 것.**
이슈 의존성이 있으면 선행 이슈가 머지된 feature 브랜치에서 분기.

## 코드 컨벤션

- Prettier: 세미콜론 O, 작은따옴표, `tabWidth: 2`, `trailingComma: all`, `printWidth: 100`.
- TypeScript `strict` + `noUnusedLocals`/`noUnusedParameters` 활성화 — 미사용 변수/파라미터는 빌드 에러다.
- `Note` 타입은 `src/types/note.ts` 단일 정의. 스키마 변경 시 이 타입 → api → db.json 순서로 함께 맞춘다.

## 커밋 규칙

husky 훅이 커밋마다 자동 검사한다. **규칙을 어기면 커밋이 차단된다.**

### 훅 구성

| 훅           | 실행 내용               | 차단 조건                                     |
| ------------ | ----------------------- | --------------------------------------------- |
| `pre-commit` | `npx lint-staged`       | 자동 수정 불가한 ESLint 에러 (미사용 변수 등) |
| `pre-commit` | `npm run typecheck`     | 타입 에러 (ESLint가 못 잡는 영역)             |
| `commit-msg` | `npx commitlint --edit` | 메시지 형식 위반                              |

`lint-staged`는 staged 파일에만 동작한다: `*.{ts,tsx}`는 `eslint --fix` → `prettier --write`, `*.{json,css,md,html}`는 `prettier --write`. 자동 수정된 결과는 다시 staging된다. 훅이 실패하면 파일은 **수정 전 상태로 롤백**되므로 반쯤 포맷된 상태가 남지 않는다.

### 메시지 형식

Conventional Commits + **제목·본문 모두 필수**. 설정은 `commitlint.config.mjs`.

```
<type>: <제목>
                      ← 빈 줄 필수
본문 첫째 줄
본문 둘째 줄           ← 본문은 최소 2줄
```

- 허용 type: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`
- **본문 최소 2줄**은 commitlint 기본 규칙에 없어서 `body-min-lines` 커스텀 플러그인으로 직접 정의했다. 빈 줄은 제외하고 내용이 있는 줄만 센다.
- `subject-case`는 꺼져 있다 — 한글 제목을 쓰기 때문.
- `Co-Authored-By:` 같은 트레일러는 body가 아니라 **footer로 파싱**되어 2줄 계산에 포함되지 않는다.

예시:

```
refactor: NotesContext mutation 네이밍 통일

api 계층과 Context의 동사가 달라 매핑을 외워야 했다.
add/edit/remove를 create/update/delete로 맞춰 1:1 대응시켰다.
```

터미널에서는 `-m`을 여러 번 쓰는 방식이 편하다:

```bash
git commit -m "refactor: NotesContext mutation 네이밍 통일" \
           -m "api 계층과 Context의 동사가 달라 매핑을 외워야 했다." \
           -m "add/edit/remove를 create/update/delete로 맞춰 1:1 대응시켰다."
```

### 주의

- 훅 3단(lint-staged → typecheck → commitlint)이 순차 실행되어 커밋마다 **3~5초** 걸린다.
- 급할 때는 `git commit --no-verify`로 전체 우회할 수 있다. 다만 강의 실습 중 사소한 커밋에도 본문 2줄이 강제되므로, 답답하면 `body-min-lines`를 `[1, 'always', 2]`(에러 → 경고)로 낮추는 편이 낫다.
- `commitlint.config.mjs`가 `.js`가 아닌 이유: `package.json`에 `"type": "module"`이 없어 `.js`로 두면 매 실행마다 `MODULE_TYPELESS_PACKAGE_JSON` 경고가 뜬다.
- `npm test`를 훅에 넣지 말 것. 테스트 파일이 0개라 `vitest run`이 exit 1을 반환해 모든 커밋이 실패한다. 넣으려면 `vitest run --passWithNoTests`를 쓴다.
