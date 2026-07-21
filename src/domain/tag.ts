// 태그 순수 규칙 — React·fetch·DOM 무의존 (PRD ADR-3)
// TAG-2 범위: trim + 빈 값 무시 + 끝에 추가. 중복·길이·개수 검증은 TAG-4.

export function addTag(tags: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === '') return tags; // 빈 값은 조용히 무시(원본 그대로)
  return [...tags, trimmed];
}
