import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NoteEditor } from './NoteEditor';
import { useNotes } from '../context/NotesContext';

// NoteEditor는 useNotes()로 Context를 소비하므로 목으로 노트를 주입한다
vi.mock('../context/NotesContext');

const noteA = {
  id: '1',
  title: 'A',
  content: '',
  tags: ['React', '공부'],
  createdAt: '',
  updatedAt: '',
};
const noteB = { id: '2', title: 'B', content: '', tags: ['Vite'], createdAt: '', updatedAt: '' };

function setNotes(notes: unknown[]) {
  vi.mocked(useNotes).mockReturnValue({
    notes,
    loading: false,
    error: null,
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  } as unknown as ReturnType<typeof useNotes>);
}

// TAG-1 시나리오: NoteEditor 폼 동기화 (정상/경계)
describe('NoteEditor 폼 동기화', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should 선택된 노트의 tags로 로컬 tags를 채운다 when 노트가 선택된다', () => {
    setNotes([noteA]);
    render(<NoteEditor selectedNoteId="1" isCreating={false} onDone={() => {}} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('공부')).toBeInTheDocument();
  });

  it('should 칩 목록을 B의 tags로 교체한다 when 노트 A에서 노트 B로 전환한다', () => {
    setNotes([noteA, noteB]);
    const { rerender } = render(
      <NoteEditor selectedNoteId="1" isCreating={false} onDone={() => {}} />,
    );
    expect(screen.getByText('공부')).toBeInTheDocument();
    rerender(<NoteEditor selectedNoteId="2" isCreating={false} onDone={() => {}} />);
    expect(screen.getByText('Vite')).toBeInTheDocument();
    expect(screen.queryByText('공부')).not.toBeInTheDocument();
  });

  it('should 로컬 tags를 []로 초기화한다 when isCreating이고 선택된 노트가 없다', () => {
    // 먼저 태그 있는 노트를 보여주고(→ 지금은 이 단언이 실패 = Red),
    // 새 노트 생성으로 전환하면 이전 태그가 사라져야 한다(초기화)
    setNotes([noteA]);
    const { rerender } = render(
      <NoteEditor selectedNoteId="1" isCreating={false} onDone={() => {}} />,
    );
    expect(screen.getByText('React')).toBeInTheDocument();
    rerender(<NoteEditor selectedNoteId={null} isCreating={true} onDone={() => {}} />);
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });
});
