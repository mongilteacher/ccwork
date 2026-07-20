#!/usr/bin/env bash
# 디자인 시스템 위반 검사 (PostToolUse hook)
# 정본: docs/design-system/
#
# ratchet 방식: 파일 전체가 아니라 HEAD 대비 "새로 추가된 줄"만 검사한다.
#   - 기존 위반(마이그레이션 이전 코드)은 통과시킨다
#   - 이번에 새로 들여온 위반만 exit 2로 차단한다
# 덕분에 되돌아가는 것만 막히고, 마이그레이션이 진행될수록 자동으로 엄격해진다.
# 상태 파일이 필요 없다 — git diff가 이미 "무엇이 새로 들어왔는가"를 알고 있다.

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

cd "$(dirname "$f")" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# 검사 대상 줄을 "<줄번호>\t<내용>" 스트림으로 모은다.
# 추적 중인 파일이면 HEAD 대비 추가분만, 신규(미추적) 파일이면 전체.
if git rev-parse --verify HEAD >/dev/null 2>&1 && git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
  ADDED=$(git diff -U0 HEAD -- "$f" 2>/dev/null | awk '
    /^\+\+\+/        { next }
    /^@@/            { match($0, /\+[0-9]+/); n = substr($0, RSTART + 1, RLENGTH - 1); next }
    /^\+/ && n != "" { print n "\t" substr($0, 2); n++ }
  ')
else
  ADDED=$(awk '{ print NR "\t" $0 }' "$f")
fi

[ -n "$ADDED" ] || exit 0

violations=""
add() { violations="${violations}${1}"$'\n'; }

# scan <규칙명> <패턴> [제외패턴]
# 줄 앞부분이 아니라 실제로 매치된 토큰을 보여준다 — 긴 className에서
# 위반이 뒤쪽에 있으면 줄을 잘랐을 때 근거가 안 보이기 때문이다.
scan() {
  local rule="$1" pat="$2" skip="${3:-}"
  while IFS=$'\t' read -r ln content; do
    [ -n "${content:-}" ] || continue
    local toks
    toks=$(printf '%s' "$content" | grep -oE "$pat" 2>/dev/null) || continue
    while IFS= read -r tok; do
      tok=$(printf '%s' "$tok" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
      [ -n "$tok" ] || continue
      if [ -n "$skip" ] && printf '%s' "$tok" | grep -qE "$skip"; then continue; fi
      add "  L${ln} [${rule}] ${tok}"
    done <<<"$toks"
  done <<<"$ADDED"
}

PALETTE='(bg|text|border|from|via|to|ring|fill|stroke|outline|divide|placeholder|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)'

scan '원시색상' "$PALETTE"
scan 'arbitrary그림자' 'shadow-\['

if [ "$kind" = tsx ]; then
  scan 'hex직접기입' '#[0-9a-fA-F]{6}\b'
  scan '인라인style' 'style=\{\{'
  scan 'arbitrary간격' '(^|[^a-zA-Z-])(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|space-x|space-y)-\['
  # 테두리 전반. border-none은 테두리 제거이므로 위반이 아니다.
  # Ghost Border와 인풋 포커스 링은 정본상 허용이라 오탐일 수 있다.
  scan '테두리사용' "(^|[[:space:]'\"\`{])border(-[a-z0-9-]+)?([[:space:]'\"\`}]|$)" '^border-none$'
fi

[ -n "$violations" ] || exit 0

# 미추적 파일은 ls-files가 비어 나오므로 저장소 루트 기준으로 직접 계산한다
rel=$(git ls-files --full-name "$f" 2>/dev/null)
if [ -z "$rel" ]; then
  root=$(git rev-parse --show-toplevel 2>/dev/null)
  prefix="${root:-}/"
  rel="${f#"$prefix"}"
fi
[ -n "$rel" ] || rel=$(basename "$f")

cat >&2 <<EOF
디자인 시스템 위반 — 이번 변경으로 새로 추가된 줄이다 (${rel})

${violations}
정본: docs/design-system/  (토큰=foundations.md · 컴포넌트=components/)
기존 코드의 위반은 검사하지 않는다. 위 항목은 방금 작성한 것이므로 고칠 것.
Ghost Border나 인풋 포커스 링처럼 정본이 허용하는 예외라면 그대로 두면 된다.
EOF
exit 2
