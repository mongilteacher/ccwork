import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function setNotes(notes: unknown[], mutations: Record<string, unknown> = {}) {
  const ctx = {
    notes,
    loading: false,
    error: null,
    createNote: mutations.createNote ?? vi.fn(),
    updateNote: mutations.updateNote ?? vi.fn(),
    deleteNote: vi.fn(),
  };
  vi.mocked(useNotes).mockReturnValue(ctx as unknown as ReturnType<typeof useNotes>);
  return ctx as unknown as {
    createNote: ReturnType<typeof vi.fn>;
    updateNote: ReturnType<typeof vi.fn>;
  };
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
    setNotes([noteA]);
    const { rerender } = render(
      <NoteEditor selectedNoteId="1" isCreating={false} onDone={() => {}} />,
    );
    expect(screen.getByText('React')).toBeInTheDocument();
    rerender(<NoteEditor selectedNoteId={null} isCreating={true} onDone={() => {}} />);
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });
});

// TAG-2 시나리오: NoteEditor 저장 배관 (로컬 확정 → 저장 버튼으로 1회 전송)
describe('NoteEditor 태그 저장', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should createNote를 tags를 포함해 호출한다 when 새 노트를 저장한다', async () => {
    const { createNote } = setNotes([]);
    render(<NoteEditor selectedNoteId={null} isCreating={true} onDone={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText('제목'), '새 노트');
    await userEvent.type(screen.getByPlaceholderText('태그 추가'), 'React{Enter}');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(createNote).toHaveBeenCalledWith('새 노트', '', ['React']);
  });

  it('should updateNote를 { title, content, tags }로 호출한다 when 기존 노트를 저장한다', async () => {
    const { updateNote } = setNotes([noteA]);
    render(<NoteEditor selectedNoteId="1" isCreating={false} onDone={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText('태그 추가'), 'Redux{Enter}');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(updateNote).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ tags: ['React', '공부', 'Redux'] }),
    );
  });

  it('should 서버 호출 없이 로컬 tags만 바뀐다 when 칩을 추가한다', async () => {
    const { createNote, updateNote } = setNotes([noteA]);
    render(<NoteEditor selectedNoteId="1" isCreating={false} onDone={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText('태그 추가'), 'Redux{Enter}');
    // 저장 전이므로 어떤 mutation도 호출되지 않는다
    expect(createNote).not.toHaveBeenCalled();
    expect(updateNote).not.toHaveBeenCalled();
    // 새 칩은 로컬 state로 화면에 보인다
    expect(screen.getByText('Redux')).toBeInTheDocument();
  });

  it('should 저장이 에러로 끝나도 tags 로컬 state가 유지된다 when 저장에 실패한다', async () => {
    const updateNote = vi.fn().mockRejectedValue(new Error('fail'));
    setNotes([noteA], { updateNote });
    render(<NoteEditor selectedNoteId="1" isCreating={false} onDone={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText('태그 추가'), 'Redux{Enter}');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));
    // 실패 후에도 방금 추가한 칩이 남아 재시도할 수 있다
    expect(await screen.findByText('Redux')).toBeInTheDocument();
  });
});
