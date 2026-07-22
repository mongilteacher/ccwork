// 태그 필터 순수 규칙 — React·fetch·DOM 무의존 (PRD ADR-1)
// TF-1 범위: 전체 노트에서 태그를 집계한다. 강조 판정(isHighlighted)은 TF-2.

import { Note } from '../types/note';
import { normalizeTag } from './tag';

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

  const key = normalizeTag(selectedTag).toLowerCase();
  if (key === '') return false; // 공백만 남으면 전체 보기와 같다

  return note.tags.some((t) => normalizeTag(t).toLowerCase() === key);
}
