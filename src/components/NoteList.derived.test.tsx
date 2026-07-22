import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NoteList } from './NoteList';
import { useNotes } from '../context/NotesContext';
import { Note } from '../types/note';

// TF-3 (#14) ADR-3의 파생 경로를 보려면 selectedTag prop을 고정한 채 notes만 갈아끼워야 한다.
// NotesProvider는 notes를 자기 state로 들고 있어 밖에서 바꿀 수 없으므로,
// NoteEditor.test.tsx와 같은 방식으로 useNotes()를 목으로 주입한다.
vi.mock('../context/NotesContext');

function note(id: string, tags: string[] = []): Note {
  return { id, title: `노트 ${id}`, content: '', tags, createdAt: '', updatedAt: '' };
}

function setNotes(notes: Note[]) {
  vi.mocked(useNotes).mockReturnValue({
    notes,
    loading: false,
    error: null,
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  } as unknown as ReturnType<typeof useNotes>);
}

function highlightedCount(container: HTMLElement): number {
  return container.querySelectorAll('[data-highlighted="true"]').length;
}

// AC 6 — 선택 해제에 useEffect + setSelectedTag를 쓰지 않는다.
// "선택 state는 그대로인데 강조만 사라진다"를 재렌더로 고정한다.
describe('NoteList 파생 강조', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 경계
  it('should 남은 노트만 강조하고 강조 개수가 줄어든다 when 3개 중 1개에서 선택 태그가 빠진 notes로 다시 렌더한다', () => {
    setNotes([note('1', ['회의']), note('2', ['회의']), note('3', ['회의'])]);
    const { container, rerender } = render(
      <NoteList selectedNoteId={null} selectedTag="회의" onSelect={() => {}} />,
    );
    expect(highlightedCount(container)).toBe(3);

    // 노트 3에서만 '회의'가 빠졌다 — selectedTag prop은 건드리지 않는다
    setNotes([note('1', ['회의']), note('2', ['회의']), note('3', [])]);
    rerender(<NoteList selectedNoteId={null} selectedTag="회의" onSelect={() => {}} />);

    expect(highlightedCount(container)).toBe(2);
    expect(screen.getByText('노트 3').closest('[data-highlighted="true"]')).toBe(null);
  });

  // 예외
  it('should 어떤 노트도 강조하지 않는다 when selectedTag prop은 그대로인 채 그 태그를 가진 노트가 사라진 notes로 다시 렌더한다', () => {
    setNotes([note('1', ['회의']), note('2', ['팀'])]);
    const { container, rerender } = render(
      <NoteList selectedNoteId={null} selectedTag="회의" onSelect={() => {}} />,
    );
    expect(highlightedCount(container)).toBe(1);

    // '회의'를 가진 노트가 세상에서 사라졌다 — 선택 state는 그대로다
    setNotes([note('2', ['팀'])]);
    rerender(<NoteList selectedNoteId={null} selectedTag="회의" onSelect={() => {}} />);

    expect(highlightedCount(container)).toBe(0);
    expect(screen.getByText('노트 1개')).toBeInTheDocument();
  });
});
