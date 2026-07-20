# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 목적

React 19 + TypeScript + Vite 기반의 **노트 앱 실습(강의) 프로젝트**. 프로덕션 서비스가 아니라 기능을 단계적으로 추가하며 학습하는 코드베이스다. 백엔드는 `db.json`을 쓰는 json-server 목(mock) API로 대체한다. `src/types/note.ts`의 `tags` 주석처럼, 코드에 "강의에서 추가할 것" 같은 의도적 미완성 지점이 남아 있을 수 있다.

## 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Vite(5173) + json-server(3001)를 `concurrently`로 동시 실행 |
| `npm run server` | json-server만 단독 실행 (API가 없으면 앱이 로딩 상태에 멈춤) |
| `npm run build` | `tsc` 타입체크 후 Vite 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 + 자동 수정 (`--fix` 포함되어 있음) |
| `npm run format` | Prettier 전체 포맷 |
| `npm test` | Vitest 1회 실행 |
| `npm run test:watch` | Vitest watch 모드 |

- 단일 테스트 실행: `npx vitest run src/path/to/File.test.tsx` 또는 `npx vitest run -t "테스트 이름"`
- 앱은 반드시 API(3001)가 떠 있어야 정상 동작한다. 프론트만 봐야 할 때도 `npm run dev`를 쓰는 게 안전하다.

## 아키텍처

데이터 흐름은 **단방향 3계층**이다. 새 기능은 이 흐름을 그대로 따라 확장한다:

```
src/api/notes.ts   → fetch 래퍼. 순수 함수, React 의존성 없음
src/context/NotesContext.tsx → 전역 상태 + api 호출 오케스트레이션
src/components/*    → useNotes()로 상태 소비, UI만 담당
```

- **API 계층** (`src/api/notes.ts`): `API_URL`(`http://localhost:3001`) 하드코딩. 모든 함수는 `res.ok`를 검사하고 실패 시 `throw new Error(...)`. `createNote`/`updateNote`가 `createdAt`/`updatedAt` 타임스탬프를 클라이언트에서 생성해 주입한다.
- **상태 계층** (`NotesContext.tsx`): 앱 전역 상태의 단일 소스. `notes` 배열을 들고 `addNote`/`editNote`/`removeNote`를 노출한다. 각 mutation은 api 호출 성공 후 **로컬 `notes`를 낙관적으로 갱신**(setNotes)하는 패턴 — 재fetch하지 않는다. 컴포넌트는 항상 `useNotes()` 훅으로 접근하며, Provider 밖에서 호출하면 throw된다.
- **UI 계층** (`src/components/`): 상태를 소유하지 않는다. 최상위 선택/생성 상태(`selectedNoteId`, `isCreating`)만 `App.tsx`가 로컬 `useState`로 관리하고 props로 내려준다. `Layout`은 `sidebar`/`main` slot을 받는 순수 레이아웃, `NoteList`→`NoteItem`은 목록, `NoteEditor`는 편집/생성 겸용 폼(`isCreating` 플래그로 분기).

### 핵심 패턴

- **편집기 폼 동기화**: `NoteEditor`는 선택된 노트가 바뀌면 `useEffect`로 로컬 `title`/`content` state를 다시 채운다. 의존성 배열은 `[selectedNoteId, isCreating]`로 제한하고 `eslint-disable-line react-hooks/exhaustive-deps`를 명시적으로 붙여 둔 상태다 — 이 의도를 깨지 않도록 주의.
- **로딩/에러/빈 상태**: 목록 렌더 전에 `loading`/`error`/`length === 0`을 순서대로 early return으로 처리(`NoteList`). 새 데이터 표시 컴포넌트도 이 3분기를 따른다.
- **컴포넌트 규약**: 함수 선언(`export function`) + 상단 `interface XxxProps` 정의가 일관된 스타일. 기본 export는 `App`뿐이고 나머지는 named export.

### 스타일링

- Tailwind CSS v4를 `@tailwindcss/vite` 플러그인으로 사용. 설정 파일이 아니라 `src/index.css`의 `@theme` 블록에 디자인 토큰을 정의한다.
- 색상은 원시 Tailwind 색이 아니라 **시맨틱 토큰**을 쓴다: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-destructive`. 새 UI도 이 토큰으로 맞춰 다크/라이트 일관성을 유지한다.
- 폰트: 본문 `--font-sans`(Pretendard), 디스플레이 `Boogaloo`. 둥근 모서리(`rounded-2xl`/`3xl`)와 커스텀 그림자가 시각적 시그니처.

## 코드 컨벤션

- Prettier: 세미콜론 O, 작은따옴표, `tabWidth: 2`, `trailingComma: all`, `printWidth: 100`.
- TypeScript `strict` + `noUnusedLocals`/`noUnusedParameters` 활성화 — 미사용 변수/파라미터는 빌드 에러다.
- `Note` 타입은 `src/types/note.ts` 단일 정의. 스키마 변경 시 이 타입 → api → db.json 순서로 함께 맞춘다.