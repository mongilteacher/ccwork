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

// TF-2 (#13) — 강조는 "필터"가 아니다. 목록에서 노트가 빠지거나 순서가 바뀌면 안 된다(AC 2·3·4).
describe('NoteList 태그 강조', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 카드를 클래스나 DOM 구조가 아니라 "제목에서 위로 올라가며 강조 속성을 찾는" 방식으로 판정한다
  function isCardHighlighted(title: string): boolean {
    return screen.getByText(title).closest('[data-highlighted="true"]') !== null;
  }

  function renderList(selectedTag: string | null) {
    return render(
      <NoteList selectedNoteId={null} selectedTag={selectedTag} onSelect={() => {}} />,
      { wrapper },
    );
  }

  // 정상
  it('should 선택 태그를 가진 노트만 강조한다 when selectedTag가 주어진다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([
      note('1', ['회의']),
      note('2', ['팀']),
      note('3', ['회의', '책']),
    ]);

    renderList('회의');
    await screen.findByText('노트 1');

    expect(isCardHighlighted('노트 1')).toBe(true);
    expect(isCardHighlighted('노트 3')).toBe(true);
    expect(isCardHighlighted('노트 2')).toBe(false);
  });

  it('should 강조되지 않은 노트도 목록에 그대로 렌더한다 when selectedTag가 주어진다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);

    renderList('회의');

    expect(await screen.findByText('노트 1')).toBeInTheDocument();
    expect(screen.getByText('노트 2')).toBeInTheDocument();
  });

  it('should 노트 순서를 selectedTag가 없을 때와 동일하게 유지한다 when selectedTag가 주어진다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([
      note('1', ['팀']),
      note('2', ['회의']),
      note('3', ['책']),
    ]);

    renderList('회의');
    await screen.findByText('노트 1');

    const titles = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(titles).toEqual(['노트 1', '노트 2', '노트 3']);
  });

  it('should "노트 N개"를 전체 개수로 렌더한다 when selectedTag가 주어진다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([
      note('1', ['회의']),
      note('2', ['팀']),
      note('3', ['책']),
    ]);

    renderList('회의');

    expect(await screen.findByText('노트 3개')).toBeInTheDocument();
  });

  it('should 두 노트를 모두 강조한다 when 대소문자만 다른 같은 태그가 서로 다른 노트에 있다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['React']), note('2', ['react'])]);

    renderList('React');
    await screen.findByText('노트 1');

    expect(isCardHighlighted('노트 1')).toBe(true);
    expect(isCardHighlighted('노트 2')).toBe(true);
  });

  // 경계
  it('should 어떤 노트도 강조하지 않는다 when selectedTag가 null이다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);

    const { container } = renderList(null);
    await screen.findByText('노트 1');

    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
    expect(screen.getByText('노트 2개')).toBeInTheDocument();
  });

  // 예외
  it('should 어떤 노트도 강조하지 않는다 when 어떤 노트도 갖고 있지 않은 태그가 selectedTag다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);

    const { container } = renderList('사라진태그');
    await screen.findByText('노트 1');

    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
    expect(screen.getByText('노트 2개')).toBeInTheDocument();
  });
});
