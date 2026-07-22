import { describe, it, expect } from 'vitest';
import { countTags, isHighlighted, resolveSelectedTag, toggleSelectedTag } from './tagFilter';
import { Note } from '../types/note';

// 테스트 대상은 tags뿐이므로 나머지 필드는 고정값으로 채운다
function note(id: string, tags: string[]): Note {
  return { id, title: `노트 ${id}`, content: '', tags, createdAt: '', updatedAt: '' };
}

describe('countTags', () => {
  // 정상
  it('should 태그별 카운트를 반환한다 when 여러 노트가 태그를 갖고 있다', () => {
    const notes = [note('1', ['회의', '팀']), note('2', ['회의']), note('3', ['책'])];

    expect(countTags(notes)).toEqual([
      { tag: '회의', count: 2 },
      { tag: '책', count: 1 },
      { tag: '팀', count: 1 },
    ]);
  });

  it('should count 내림차순으로 정렬한다 when 카운트가 서로 다르다', () => {
    const notes = [
      note('1', ['일', '삼']),
      note('2', ['삼']),
      note('3', ['삼']),
      note('4', ['이']),
      note('5', ['이']),
    ];

    expect(countTags(notes).map((t) => t.tag)).toEqual(['삼', '이', '일']);
  });

  it('should 가나다순으로 정렬한다 when 카운트가 같다', () => {
    const notes = [note('1', ['나', '가', '다'])];

    expect(countTags(notes).map((t) => t.tag)).toEqual(['가', '나', '다']);
  });

  it('should 하나의 TagCount로 합친다 when 대소문자만 다른 태그가 서로 다른 노트에 있다', () => {
    const notes = [note('1', ['React']), note('2', ['react'])];

    expect(countTags(notes)).toEqual([{ tag: 'React', count: 2 }]);
  });

  it('should 먼저 등장한 표기를 tag로 쓴다 when 대소문자가 다른 표기가 섞여 있다', () => {
    const notes = [note('1', ['react']), note('2', ['React']), note('3', ['REACT'])];

    expect(countTags(notes)[0].tag).toBe('react');
  });

  // 경계
  it('should 빈 배열을 반환한다 when notes가 빈 배열이다', () => {
    expect(countTags([])).toEqual([]);
  });

  it('should 빈 배열을 반환한다 when 모든 노트의 tags가 빈 배열이다', () => {
    expect(countTags([note('1', []), note('2', [])])).toEqual([]);
  });

  it('should count를 1로 센다 when 한 노트가 대소문자만 다른 같은 태그를 둘 갖고 있다', () => {
    // 카운트 단위는 "태그 등장 횟수"가 아니라 "그 태그를 가진 노트 수"다
    expect(countTags([note('1', ['React', 'react'])])).toEqual([{ tag: 'React', count: 1 }]);
  });

  it('should 그 태그를 제외한다 when 정규화 후 빈 값이 되는 태그가 저장돼 있다', () => {
    const notes = [note('1', ['   ', '', '회의'])];

    expect(countTags(notes)).toEqual([{ tag: '회의', count: 1 }]);
  });

  it('should 하나로 합친다 when 같은 한글 태그가 NFC/NFD로 다르게 저장돼 있다', () => {
    const nfc = '회의'.normalize('NFC');
    const nfd = '회의'.normalize('NFD');
    const notes = [note('1', [nfc]), note('2', [nfd])];

    expect(countTags(notes)).toEqual([{ tag: nfc, count: 2 }]);
  });
});

// TF-2 (#13) — 선택 태그를 가진 노트인지 판정. 동일성 기준은 countTags와 같다(ADR-4).
describe('isHighlighted', () => {
  // 정상
  it('should return true when 노트가 선택 태그를 그대로 갖고 있다', () => {
    expect(isHighlighted(note('1', ['회의']), '회의')).toBe(true);
  });

  it('should return false when 노트가 선택 태그를 갖고 있지 않다', () => {
    expect(isHighlighted(note('1', ['팀']), '회의')).toBe(false);
  });

  it('should return true when 선택 태그가 노트의 여러 태그 중 하나와 일치한다', () => {
    expect(isHighlighted(note('1', ['팀', '회의', '책']), '회의')).toBe(true);
  });

  it('should return true when 선택 태그와 노트 태그가 대소문자만 다르다', () => {
    expect(isHighlighted(note('1', ['React']), 'react')).toBe(true);
    expect(isHighlighted(note('1', ['react']), 'React')).toBe(true);
  });

  // 경계
  it('should return false when selectedTag가 null이다', () => {
    expect(isHighlighted(note('1', ['회의']), null)).toBe(false);
  });

  it('should return false when 노트의 tags가 빈 배열이다', () => {
    expect(isHighlighted(note('1', []), '회의')).toBe(false);
  });

  it('should return false when selectedTag가 정규화 후 빈 문자열이다', () => {
    expect(isHighlighted(note('1', ['회의']), '   ')).toBe(false);
  });

  it('should return true when 선택 태그와 노트 태그가 NFC/NFD 표기만 다르다', () => {
    const nfc = '회의'.normalize('NFC');
    const nfd = '회의'.normalize('NFD');

    expect(isHighlighted(note('1', [nfd]), nfc)).toBe(true);
    expect(isHighlighted(note('1', [nfc]), nfd)).toBe(true);
  });

  it('should return true when selectedTag에 앞뒤 공백이 있다', () => {
    expect(isHighlighted(note('1', ['회의']), ' 회의 ')).toBe(true);
  });

  it('should return false when 태그 목록에 더는 없는 태그가 selectedTag로 남아 있다', () => {
    // TF-3의 자동 해제가 없어도 판정 자체는 자연히 false다 (ADR-3)
    expect(isHighlighted(note('1', ['팀']), '사라진태그')).toBe(false);
  });

  // 예외
  it('should return false when 선택 태그가 노트 태그의 부분 문자열이다', () => {
    expect(isHighlighted(note('1', ['회의록']), '회의')).toBe(false);
  });
});

// TF-3 (#14) — 필터에서 빠져나오는 두 경로.
// 1) 사용자가 직접: 같은 칩 재클릭 → 해제 (toggleSelectedTag)
// 2) 저절로: 태그 목록에서 사라진 선택 태그는 선택되지 않은 것으로 본다 (resolveSelectedTag, ADR-3)
describe('toggleSelectedTag', () => {
  // 정상
  it('should return null when clicked가 current와 같은 태그다', () => {
    expect(toggleSelectedTag('회의', '회의')).toBe(null);
  });

  it('should return clicked when current가 다른 태그다', () => {
    expect(toggleSelectedTag('회의', '팀')).toBe('팀');
  });

  it('should return clicked when current가 null이다', () => {
    expect(toggleSelectedTag(null, '회의')).toBe('회의');
  });

  // 경계
  it('should return null when clicked와 current가 대소문자만 다르다', () => {
    expect(toggleSelectedTag('React', 'react')).toBe(null);
    expect(toggleSelectedTag('react', 'React')).toBe(null);
  });

  it('should return null when current에 앞뒤 공백이 있고 정규화하면 clicked와 같다', () => {
    expect(toggleSelectedTag(' 회의 ', '회의')).toBe(null);
  });

  it('should return null when clicked와 current가 NFC/NFD 표기만 다르다', () => {
    const nfc = '회의'.normalize('NFC');
    const nfd = '회의'.normalize('NFD');

    expect(toggleSelectedTag(nfd, nfc)).toBe(null);
    expect(toggleSelectedTag(nfc, nfd)).toBe(null);
  });

  // 예외
  it('should return clicked when clicked가 current의 부분 문자열 관계다', () => {
    // 완전 일치만 해제 — 부분 일치는 갈아타기다
    expect(toggleSelectedTag('회의', '회의록')).toBe('회의록');
  });

  it('should return null when clicked가 정규화 후 빈 값이다', () => {
    expect(toggleSelectedTag('회의', '   ')).toBe(null);
    expect(toggleSelectedTag(null, '   ')).toBe(null);
  });
});

describe('resolveSelectedTag', () => {
  // 정상
  it('should return 선택 태그 when 그 태그를 가진 노트가 있다', () => {
    const notes = [note('1', ['회의']), note('2', ['팀'])];

    expect(resolveSelectedTag(notes, '회의')).toBe('회의');
  });

  it('should return 목록의 표기 태그 when selectedTag와 표기가 대소문자만 다르다', () => {
    const notes = [note('1', ['React'])];

    expect(resolveSelectedTag(notes, 'react')).toBe('React');
  });

  // 경계
  it('should return null when selectedTag가 null이다', () => {
    expect(resolveSelectedTag([note('1', ['회의'])], null)).toBe(null);
  });

  it('should return null when notes가 빈 배열이다', () => {
    expect(resolveSelectedTag([], '회의')).toBe(null);
  });

  it('should return null when selectedTag가 정규화 후 빈 문자열이다', () => {
    expect(resolveSelectedTag([note('1', ['회의'])], '   ')).toBe(null);
  });

  it('should return 선택 태그 when 그 태그를 가진 노트가 3개 중 2개로 줄었다', () => {
    // 하나가 빠져도 목록에 남아 있으면 선택은 유지된다 (AC 4)
    const notes = [note('1', ['회의']), note('2', ['회의']), note('3', [])];

    expect(resolveSelectedTag(notes, '회의')).toBe('회의');
  });

  // 예외
  it('should return null when 어떤 노트도 갖고 있지 않은 태그가 selectedTag로 남아 있다', () => {
    // 자동 해제의 실체 — state는 그대로여도 파생값이 null이 된다 (ADR-3)
    const notes = [note('1', ['팀']), note('2', ['책'])];

    expect(resolveSelectedTag(notes, '사라진태그')).toBe(null);
  });

  it('should return null when selectedTag가 다른 태그의 부분 문자열일 뿐이다', () => {
    expect(resolveSelectedTag([note('1', ['회의록'])], '회의')).toBe(null);
  });
});
