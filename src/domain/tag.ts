// 태그 순수 규칙 — React·fetch·DOM 무의존 (PRD ADR-3)
// TAG-2 범위: trim + 빈 값 무시 + 끝에 추가. 중복·길이·개수 검증은 TAG-4.

export const MAX_TAG_LENGTH = 20; // 태그 1개 최대 글자 수
export const MAX_TAG_COUNT = 10; // 노트 1개 최대 태그 수

export type TagError = 'duplicate' | 'tooLong' | 'tooMany';

export function addTag(tags: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === '') return tags; // 빈 값은 조용히 무시(원본 그대로)
  return [...tags, trimmed];
}

// TAG-4 범위: 추가 시점 검증. spec §5.3 우선순위대로 첫 규칙 하나만 반환.
// 정규화는 trim까지만(개행치환·NFC 전체 파이프라인은 이후 슬라이스).
export function validateTag(value: string, tags: string[]): TagError | null {
  const trimmed = value.trim();
  if (trimmed === '') return null; // 1. 빈 값 → 조용히 무시(에러 아님)
  if ([...trimmed].length > MAX_TAG_LENGTH) return 'tooLong'; // 2. 길이(코드 포인트 기준)
  if (tags.length >= MAX_TAG_COUNT) return 'tooMany'; // 3. 개수
  const lower = trimmed.toLowerCase();
  if (tags.some((t) => t.toLowerCase() === lower)) return 'duplicate'; // 4. 대소문자 무시 중복
  return null;
}

// TAG-3 범위: 값(value) 기준 제거. 삭제엔 규칙이 없다 → 검증·throw 없음.
export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag); // 없는 tag면 원본과 내용이 같은 새 배열(no-op)
}
