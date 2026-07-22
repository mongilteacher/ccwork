import { describe, it, expect } from 'vitest';
import { countTags } from './tagFilter';
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
