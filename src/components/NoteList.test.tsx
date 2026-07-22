import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { NoteList } from './NoteList';
import { TagFilterBar } from './TagFilterBar';
import { NotesProvider } from '../context/NotesContext';
import * as api from '../api/notes';
import { Note } from '../types/note';

vi.mock('../api/notes');

function note(id: string, tags: string[] = []): Note {
  return { id, title: `노트 ${id}`, content: '', tags, createdAt: '', updatedAt: '' };
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotesProvider>{children}</NotesProvider>
);

// AC 9의 회귀 기준선 — TF-2·TF-3이 사이드바를 계속 건드리므로 여기서 안전망을 만든다.
describe('NoteList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should "노트 N개"를 노트 개수대로 렌더한다 when 노트가 여러 개 있다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1'), note('2'), note('3')]);

    render(<NoteList selectedNoteId={null} onSelect={() => {}} />, { wrapper });

    expect(await screen.findByText('노트 3개')).toBeInTheDocument();
    expect(screen.getByText('노트 1')).toBeInTheDocument();
    expect(screen.getByText('노트 3')).toBeInTheDocument();
  });
});

// 사이드바 slot에 TagFilterBar가 끼어들어도 노트 목록이 밀려나지 않아야 한다.
describe('사이드바 조합', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should TagFilterBar와 NoteList를 함께 렌더한다 when 같은 slot에 들어간다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2')]);

    render(
      <>
        <TagFilterBar />
        <NoteList selectedNoteId={null} onSelect={() => {}} />
      </>,
      { wrapper },
    );

    // 태그 칩과 노트 목록이 동시에 존재한다
    expect(await screen.findByRole('button', { name: /회의/ })).toBeInTheDocument();
    expect(screen.getByText('노트 2개')).toBeInTheDocument();
    expect(screen.getByText('노트 1')).toBeInTheDocument();
  });
});
