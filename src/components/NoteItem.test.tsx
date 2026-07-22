import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NoteItem } from './NoteItem';
import { Note } from '../types/note';

function note(id: string, tags: string[] = []): Note {
  return { id, title: `노트 ${id}`, content: '', tags, createdAt: '', updatedAt: '' };
}

// TF-2 (#13) — 강조(data-highlighted)와 편집 중(data-selected)은 서로 다른 속성이라
// 동시에 켜져도 각각 확인된다(AC 8). 시각 토큰은 Green에서 정하므로 클래스는 보지 않는다.
describe('NoteItem 강조 표시', () => {
  // 정상
  it('should 강조 표시를 렌더한다 when isHighlighted가 true다', () => {
    const { container } = render(
      <NoteItem
        note={note('1')}
        isSelected={false}
        isHighlighted={true}
        onSelect={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(container.querySelector('[data-highlighted="true"]')).not.toBeNull();
  });

  it('should 강조 표시와 편집 중 표시를 각각 따로 나타낸다 when isSelected와 isHighlighted가 둘 다 true다', () => {
    const { container } = render(
      <NoteItem
        note={note('1')}
        isSelected={true}
        isHighlighted={true}
        onSelect={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(container.querySelector('[data-highlighted="true"]')).not.toBeNull();
    expect(container.querySelector('[data-selected="true"]')).not.toBeNull();
  });

  // 경계
  it('should 편집 중 표시만 나타내고 강조 표시는 없다 when isSelected만 true다', () => {
    const { container } = render(
      <NoteItem
        note={note('1')}
        isSelected={true}
        isHighlighted={false}
        onSelect={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(container.querySelector('[data-selected="true"]')).not.toBeNull();
    expect(container.querySelector('[data-highlighted="true"]')).toBeNull();
  });
});
