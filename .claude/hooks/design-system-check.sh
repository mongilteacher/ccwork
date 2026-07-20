#!/usr/bin/env bash
# 디자인 시스템 위반 검사 (PostToolUse hook)
# 정본: docs/design-system/
#
# 경고 전용이다. 코드를 막지 않는다 — src/ 대부분이 아직 마이그레이션 이전
# 상태(docs/design-system/migration.md)라 차단하면 편집 자체가 불가능해진다.
# 로드맵이 다 채워지면 settings.json에서 exit 2로 올려 차단 훅으로 승격할 수 있다.

set -uo pipefail

payload=$(cat)
f=$(printf '%s' "$payload" | jq -r '.tool_response.filePath // .tool_input.file_path // empty')

[ -n "$f" ] || exit 0
[ -f "$f" ] || exit 0

case "$f" in
  */src/*.tsx) kind=tsx ;;
  */src/index.css) kind=css ;;
  *) exit 0 ;;
esac

violations=""
add() { violations="${violations}${1}"$'\n'; }

# scan <규칙명> <패턴> [제외패턴]
# 줄 앞부분이 아니라 "실제로 매치된 토큰"을 보여준다 — 긴 className에서
# 위반이 뒤쪽에 있으면 줄을 잘랐을 때 근거가 안 보이기 때문이다.
scan() {
  local rule="$1" pat="$2" skip="${3:-}" hits
  hits=$(grep -noE "$pat" "$f" 2>/dev/null) || return 0
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    local ln="${hit%%:*}" tok="${hit#*:}"
    tok=$(printf '%s' "$tok" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    [ -n "$tok" ] || continue
    [ -n "$skip" ] && printf '%s' "$tok" | grep -qE "$skip" && continue
    add "  L${ln} [${rule}] ${tok}"
  done <<<"$hits"
}

PALETTE='(bg|text|border|from|via|to|ring|fill|stroke|outline|divide|placeholder|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)'

scan '원시색상' "$PALETTE"
scan 'arbitrary그림자' 'shadow-\['

if [ "$kind" = tsx ]; then
  scan 'hex직접기입'  '#[0-9a-fA-F]{6}\b'
  scan '인라인style'   'style=\{\{'
  scan 'arbitrary간격' '(^|[^a-zA-Z-])(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|space-x|space-y)-\['
  # 테두리 전반. border-none은 테두리 제거이므로 위반이 아니다.
  # Ghost Border와 인풋 포커스 링은 정본상 허용이라 오탐일 수 있다.
  scan '테두리사용' "(^|[[:space:]'\"\`{])border(-[a-z0-9-]+)?([[:space:]'\"\`}]|$)" '^border-none$'
fi

[ -n "$violations" ] || exit 0

rel="${f#"$PWD"/}"
report="디자인 시스템 위반 (${rel})

${violations}
정본: docs/design-system/  (토큰=foundations.md · 컴포넌트=components/)
방금 작성한 줄이면 고칠 것. 원래 있던 줄이면 migration.md 로드맵 항목이므로 무시해도 된다."

count=$(printf '%s' "$violations" | grep -c '^' )

jq -n --arg ctx "$report" --arg msg "디자인 시스템 위반 ${count}건 — ${rel}" \
  '{systemMessage:$msg, hookSpecificOutput:{hookEventName:"PostToolUse", additionalContext:$ctx}}'
exit 0
