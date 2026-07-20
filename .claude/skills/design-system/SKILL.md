---
name: design-system
description: 이 노트 앱의 UI를 만들거나 고칠 때 docs/design-system/ 정본 규격을 적용한다. Tailwind 클래스 작성·수정, 색상/간격/그림자/테두리/폰트 결정, 컴포넌트 신규 생성, src/index.css @theme 편집, "스타일", "디자인", "UI", "예쁘게", "레이아웃" 관련 요청 시 사용.
---

# 디자인 시스템 적용

이 프로젝트의 스타일 정본은 `docs/design-system/`이다. **기억에 의존하지 말고 매번 읽는다.**

## 1단계: 필요한 문서만 읽는다

전부 읽지 말고 작업에 해당하는 것만 읽는다.

| 작업                  | 읽을 파일                                                              |
| --------------------- | ---------------------------------------------------------------------- |
| 무슨 작업이든 (필수)  | `docs/design-system/foundations.md`                                    |
| 버튼 손질             | `docs/design-system/components/button.md`                              |
| 카드·리스트·노트 항목 | `docs/design-system/components/card-list.md`                           |
| 인풋·폼               | `docs/design-system/components/input.md`                               |
| 태그 칩               | `docs/design-system/components/knowledge-token.md`                     |
| `index.css` 토큰 편집 | `docs/design-system/migration.md`                                      |
| 새 컴포넌트           | `docs/design-system/components/README.md` (공통 규칙 + 문서 추가 절차) |

## 2단계: 코드를 쓰기 전에 자문할 것

이 시스템에서 가장 자주 깨지는 규칙 4개다. 클래스를 적기 전에 확인한다.

1. **테두리로 영역을 나누고 있지 않은가?** → No-Line Rule. 경계는 배경 톤 전환으로만 만든다. `border-b`/`border-r`로 섹션을 가르면 위반이다.
2. **그림자를 습관적으로 넣고 있지 않은가?** → 일반 카드에 그림자는 없다. 톤 레이어링으로 띄운다. arbitrary value(`shadow-[0_2px_12px_...]`)는 금지.
3. **hex나 원시 Tailwind 색을 적고 있지 않은가?** → 토큰명만 쓴다. `bg-gray-100`, `#2b3437` 직접 기입 금지.
4. **간격을 임의값으로 맞추고 있지 않은가?** → `spacing` 스케일에서 고른다. 애매하면 한 단계 큰 쪽.

## 3단계: 현재 코드는 아직 구버전임을 감안한다

`src/`의 스타일은 대부분 정본 이전 상태다(`border-border`, arbitrary 그림자, 좁은 리스트 간격). 따라서:

- **기존 코드를 패턴 참고용으로 복사하지 말 것.** 지금 있는 게 정답이 아니다.
- 새로 쓰는 부분은 정본대로 쓴다.
- 손대는 김에 주변을 정본으로 옮길 수 있으면 옮기고, 옮겼으면 `migration.md`의 해당 체크박스를 채운다.
- 범위를 벗어나는 대규모 전환은 임의로 하지 말고 사용자에게 먼저 물어본다.

## 문서를 고쳐야 할 때

디자인 결정이 새로 생기거나 바뀌면 코드만 고치지 말고 문서도 갱신한다. 규칙:

- **hex 값은 `foundations.md`에만 존재한다.** 다른 파일은 토큰명으로만 참조하고 `(#f1f4f6)`처럼 병기하지 않는다.
- **Do/Don't는 각 파일이 자체 보유한다.** 두 블록 다 있어야 한다.
- 새 컴포넌트는 `components/`에 파일을 만들고 `components/README.md` 목록에 행을 추가한다.
- `migration.md`는 만료 문서다. 영구 규칙을 여기에 쓰지 않는다.

## 주의사항

- Stitch 원문은 Inter 단일 서체를 명시하지만 **이 프로젝트는 따르지 않는다.** UI 문구가 전부 한국어인데 Inter에는 한글 글리프가 없다. 본문은 Pretendard, Boogaloo는 로고 전용. 근거는 `foundations.md` 「서체」 절에 있다.
- 이 스킬은 문서를 읽어 적용할 뿐, 코드를 자동으로 정본에 맞추지 않는다. 전환 작업은 `migration.md` 로드맵을 따라 명시적으로 수행한다.
