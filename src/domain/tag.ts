// 태그 순수 규칙 — React·fetch·DOM 무의존 (PRD ADR-3)
// TAG-2 범위: trim + 빈 값 무시 + 끝에 추가. 중복·길이·개수 검증은 TAG-4.

export const MAX_TAG_LENGTH = 20; // 태그 1개 최대 글자 수
export const MAX_TAG_COUNT = 10; // 노트 1개 최대 태그 수

export type TagError = 'duplicate' | 'tooLong' | 'tooMany';

// TAG-5 범위: 정규화 파이프라인. 순서 고정(바뀌면 결과가 달라짐, spec §5.2).
// 검증·저장은 항상 이 반환값 기준. 공백만 입력이면 '' 반환.
export function normalizeTag(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, ' ') // 1. 개행·탭 → 공백 (붙여넣기 대응)
    .replace(/\s{2,}/g, ' ') // 2. 연속 공백 → 1개
    .trim() // 3. 앞뒤 공백 제거
    .normalize('NFC'); // 4. 유니코드 정규화 (macOS NFD 한글 통일)
}

export function addTag(tags: string[], raw: string): string[] {
  const normalized = normalizeTag(raw);
  if (normalized === '') return tags; // 빈 값은 조용히 무시(원본 그대로)
  return [...tags, normalized];
}

// TAG-4 범위: 추가 시점 검증. spec §5.3 우선순위대로 첫 규칙 하나만 반환.
// 정규화는 trim까지만(개행치환·NFC 전체 파이프라인은 이후 슬라이스).
export function validateTag(value: string, tags: string[]): TagError | null {
  const normalized = normalizeTag(value);
  if (normalized === '') return null; // 1. 빈 값 → 조용히 무시(에러 아님)
  if ([...normalized].length > MAX_TAG_LENGTH) return 'tooLong'; // 2. 길이(코드 포인트 기준)
  if (tags.length >= MAX_TAG_COUNT) return 'tooMany'; // 3. 개수
  const lower = normalized.toLowerCase();
  if (tags.some((t) => t.toLowerCase() === lower)) return 'duplicate'; // 4. NFC·대소문자 무시 중복
  return null;
}

// TAG-3 범위: 값(value) 기준 제거. 삭제엔 규칙이 없다 → 검증·throw 없음.
export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag); // 없는 tag면 원본과 내용이 같은 새 배열(no-op)
}
