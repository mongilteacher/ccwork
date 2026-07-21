// 태그 순수 규칙 — React·fetch·DOM 무의존 (PRD ADR-3)
// TAG-2 범위: trim + 빈 값 무시 + 끝에 추가. 중복·길이·개수 검증은 TAG-4.

export function addTag(tags: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === '') return tags; // 빈 값은 조용히 무시(원본 그대로)
  return [...tags, trimmed];
}

// TAG-3 범위: 값(value) 기준 제거. 삭제엔 규칙이 없다 → 검증·throw 없음.
export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag); // 없는 tag면 원본과 내용이 같은 새 배열(no-op)
}
