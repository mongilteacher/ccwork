# 컴포넌트 카탈로그

컴포넌트별 규격이다. 이 폴더는 **기능이 추가될 때마다 파일이 하나씩 늘어나는** 유일한 성장 축이다.

색상·타이포·간격 토큰의 정의는 [`../foundations.md`](../foundations.md)에 있다.
상태 표기(✅/🚧)의 의미는 [`../README.md`](../README.md)에 있다.

## 목록

| 컴포넌트                                        | 대응 코드                                                     |
| ----------------------------------------------- | ------------------------------------------------------------- |
| [버튼](button.md)                               | `Layout.tsx` 새 노트, `NoteEditor.tsx` 저장·취소              |
| [카드 & 리스트](card-list.md)                   | `NoteItem.tsx`, `NoteList.tsx`                                |
| [인풋 필드](input.md)                           | `NoteEditor.tsx` 제목·본문                                    |
| [Knowledge Token (태그 칩)](knowledge-token.md) | 미구현 — [태그 기능 명세서](../../features/tag/spec-fixed.md) |

## 새 컴포넌트를 추가할 때

1. 이 폴더에 `<컴포넌트명>.md`를 만든다 (kebab-case).
2. 위 표에 행을 추가한다.
3. 문서에는 **Do/Don't 블록을 반드시 둘 다** 넣는다.
4. 토큰은 이름으로만 쓴다. hex를 복사해 오지 않는다.

## 모든 컴포넌트에 적용되는 공통 규칙

- **테두리로 형태를 만들지 않는다.** 배경 톤으로 만든다 ([No-Line Rule](../foundations.md#-the-no-line-rule)).
- **상태 변화는 배경 톤 이동으로 표현한다.** hover·선택·비활성 모두 마찬가지다.
- **그림자는 기본값이 아니다.** 부유가 필요한 컴포넌트에만 Ambient Shadow 1종을 쓴다.
- 조건부 className은 유틸 없이 템플릿 리터럴 + 삼항으로 조합한다 (`CLAUDE.md` 「컴포넌트 구현 패턴」).
