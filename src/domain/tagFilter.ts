// 태그 필터 순수 규칙 — React·fetch·DOM 무의존 (PRD ADR-1)
// TF-1 범위: 전체 노트에서 태그를 집계한다. 강조 판정(isHighlighted)은 TF-2.

import { Note } from '../types/note';
import { normalizeTag } from './tag';

// 태그 동일성 키 — normalizeTag 후 소문자(ADR-4). 이 모듈 안에서만 쓰는 헬퍼다.
function tagKey(raw: string): string {
  return normalizeTag(raw).toLowerCase();
}

export interface TagCount {
  tag: string; // 표기 태그 — 먼저 등장한 표기 (ADR-4)
  count: number; // 그 태그를 가진 노트 수
}

// 동일성 기준은 normalizeTag 후 소문자 비교 — 기존 중복 검증(validateTag)과 같은 기준이다.
// 정렬: count 내림차순 → 동점이면 표기 가나다순.
export function countTags(notes: Note[]): TagCount[] {
  const counts = new Map<string, TagCount>(); // key: 소문자 정규화 값

  for (const note of notes) {
    const seen = new Set<string>(); // 한 노트가 같은 태그를 여러 표기로 가져도 1로 센다

    for (const raw of note.tags) {
      const normalized = normalizeTag(raw);
      if (normalized === '') continue; // 공백만 있는 태그는 집계 대상이 아니다

      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const found = counts.get(key);
      if (found) found.count += 1;
      else counts.set(key, { tag: normalized, count: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// TF-2 범위: 선택 태그를 가진 노트인지 판정한다.
// 동일성 기준은 countTags와 같다 — normalizeTag 후 소문자 완전 일치(ADR-4). 부분 일치는 제외.
export function isHighlighted(note: Note, selectedTag: string | null): boolean {
  if (selectedTag === null) return false;

  const key = tagKey(selectedTag);
  if (key === '') return false; // 공백만 남으면 전체 보기와 같다

  return note.tags.some((t) => tagKey(t) === key);
}

// TF-3 범위: 칩 클릭 결과를 계산한다. 같은 태그를 다시 누르면 해제(null), 다른 태그면 갈아탄다.
// 동일성 기준은 countTags·isHighlighted와 같다(normalizeTag 후 소문자 완전 일치, ADR-4).
export function toggleSelectedTag(current: string | null, clicked: string): string | null {
  const clickedKey = tagKey(clicked);
  if (clickedKey === '') return null; // 빈 태그는 전체 보기와 같다

  if (current === null) return clicked;

  return tagKey(current) === clickedKey ? null : clicked;
}

// TF-3 범위(ADR-3): 선택 태그의 자동 해제를 state 동기화가 아니라 파생값으로 계산한다.
// 태그 목록(countTags 결과)에 없는 선택 태그는 선택되지 않은 것으로 본다.
export function resolveSelectedTag(notes: Note[], selectedTag: string | null): string | null {
  if (selectedTag === null) return null;

  const key = tagKey(selectedTag);
  if (key === '') return null;

  const found = countTags(notes).find((t) => tagKey(t.tag) === key);
  return found ? found.tag : null; // 목록의 표기 태그를 돌려준다
}
