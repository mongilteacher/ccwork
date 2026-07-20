---
name: mermaid-diagram
description: 이 노트 앱의 src/ 를 분석해 컴포넌트 의존성과 상태 흐름을 Mermaid로 시각화한 단일 HTML을 docs/architecture/index.html 로 생성하고 브라우저로 연다. "구조 시각화", "아키텍처 다이어그램", "의존성 그래프", "mermaid", "구조 그려줘" 요청 시 사용.
---

# 아키텍처 Mermaid 시각화

이 프로젝트(React 19 노트 앱) 전용 스킬이다. `src/`를 읽어 **컴포넌트 의존성 그래프**를 그리고, 가능하면 **상태 흐름**을 덧붙여 단일 HTML로 만든 뒤 브라우저로 연다.

## 산출물

- 경로: `docs/architecture/index.html` (고정, 매번 덮어쓰기)
- 단일 HTML 1개. 빌드 불필요, `file://`로 바로 열림
- Mermaid는 jsDelivr CDN에서 로드 → **오프라인에서는 다이어그램이 안 그려진다**

## 1단계: src/ 분석 (그리기 전에 반드시 수행)

파일명에서 관계를 **추측하지 말고** 실제 코드를 읽는다. 수집 항목:

| 항목 | 확인 방법 |
|---|---|
| 모듈 의존성 | 각 파일 상단 `import` 문 |
| 렌더 트리 | JSX에서 실제로 렌더하는 컴포넌트 |
| props 계약 | `interface XxxProps` 선언 |
| Context 소비 | `useNotes()` 를 호출하는 파일 |
| state 소유권 | `useState` 선언 위치 |
| 외부 경계 | `API_URL`, `fetch` 호출 |

```bash
find src -type f -name "*.ts*" | sort
grep -rn "^import\|useNotes()\|useState" src/
```

### 핵심 규칙 — 두 개의 축을 분리할 것

**import 그래프만 그리면 이 앱의 구조가 안 보인다.** `NoteList`/`NoteEditor`는 `App`→`Layout`을 통해 렌더되지만, 데이터는 `useNotes()`로 `NotesProvider`에서 **직접** 당겨온다. 즉:

- **렌더 트리** (누가 누구를 그리는가) — 실선
- **데이터 의존성** (누가 누구에게서 상태를 받는가) — 점선

이 둘이 서로 다르다는 걸 보여주는 게 이 다이어그램의 존재 이유다. 반드시 다른 선 스타일로 구분하고 범례를 넣는다.

## 2단계: 다이어그램 구성

### (필수) 컴포넌트 의존성 그래프

- `graph TD`
- 계층을 `subgraph`로 묶기: 진입점 / UI(`src/components/`) / 상태(`src/context/`) / API(`src/api/`) / 외부(json-server)
- 실선 `-->` = 렌더·import, 점선 `-.->` = `useNotes()` 소비, 굵은 선 `==>` = 네트워크 경계
- 노드 라벨에 **실제 파일명 + 소유 state**를 `<br/>`로 병기 (예: `App.tsx<br/>selectedNoteId · isCreating`)
- props 전달은 엣지 라벨로 표기 (예: `-->|sidebar prop|`)

### (필수) 타입 의존성 그래프

`src/types/note.ts`의 `Note`를 누가 import하는지. 선 스타일 의미가 겹치지 않도록 **메인 그래프에 섞지 말고 별도 그래프**로 분리한다.

### (권장) 상태 흐름 시퀀스

`sequenceDiagram`으로 mutation 1회 왕복을 그린다. 반드시 포함할 것:

- 사용자 → 컴포넌트 → Context → api → json-server → 응답 → `setNotes` 낙관적 갱신 → 리렌더
- `alt res.ok / else 실패` 로 **에러 경로**도 함께: api가 `throw` → Context는 잡지 않고 전파 → 컴포넌트가 `console.error`
- 타임스탬프는 api 계층에서 주입된다는 점을 self-message로 표시

### (권장) state 소유권 표

다이어그램보다 표가 명확하다. HTML `<table>`로 작성:
`selectedNoteId`/`isCreating`(App) · `title`/`content`/`saving`(NoteEditor) · `notes`/`loading`/`error`(NotesContext).

## 3단계: HTML 작성 규칙

- Mermaid v11 ESM 모듈을 CDN에서 import, `<pre class="mermaid">` 블록에 다이어그램 작성
- `prefers-color-scheme` 대응. Mermaid `theme`도 `dark`/`default`로 함께 전환
- 각 다이어그램 위에 **"이 그림에서 무엇을 읽어야 하는지"** 한 줄 캡션
- 선 스타일 의미를 설명하는 **범례** 필수
- 페이지 하단에 생성 기준 커밋/날짜 명시 (자동 동기화가 아님을 알림)

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  mermaid.initialize({ startOnLoad: true, theme: dark ? 'dark' : 'default' });
</script>
```

## 4단계: 브라우저 열기

생성 직후 자동으로 연다. 플랫폼을 감지해 하나만 실행:

```bash
open docs/architecture/index.html 2>/dev/null \
  || xdg-open docs/architecture/index.html 2>/dev/null \
  || start docs/architecture/index.html
```

이 프로젝트는 macOS(darwin) 기준이므로 보통 `open`으로 끝난다. 개발 서버(`npm run dev`)와 무관하게 동작한다 — 정적 파일이라 json-server가 없어도 열린다.

## 주의사항

- 이 문서는 **자동 동기화되지 않는다.** 컴포넌트를 추가·삭제·이동했으면 스킬을 다시 실행할 것
- `docs/architecture/index.html`은 매번 통째로 덮어쓴다. 손으로 편집한 내용은 보존되지 않는다
- 다이어그램 내용은 반드시 실제 코드와 일치해야 한다. 코드에 없는 계층·컴포넌트를 "있으면 좋을 것 같아서" 그리지 말 것