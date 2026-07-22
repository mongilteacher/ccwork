import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';
import { TagFilterBar } from './TagFilterBar';
import { NotesProvider } from '../context/NotesContext';
import * as api from '../api/notes';
import { Note } from '../types/note';

vi.mock('../api/notes');

function note(id: string, tags: string[]): Note {
  return { id, title: `노트 ${id}`, content: '', tags, createdAt: '', updatedAt: '' };
}

// TagFilterBar는 useNotes()로 데이터를 직접 소비하므로 Provider 래핑이 필요하다
function renderBar() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <NotesProvider>{children}</NotesProvider>
  );
  return render(<TagFilterBar />, { wrapper });
}

describe('TagFilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 정상
  it('should 태그 칩과 카운트를 렌더한다 when 태그를 가진 노트가 있다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의', '팀']), note('2', ['회의'])]);

    renderBar();

    expect(await screen.findByRole('button', { name: /회의/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /회의/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /팀/ })).toHaveTextContent('1');
  });

  it('should 칩을 button 요소로 렌더한다 when 태그가 있다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의'])]);

    renderBar();

    const chip = await screen.findByRole('button', { name: /회의/ });
    expect(chip.tagName).toBe('BUTTON');
  });

  it('should 카운트 내림차순으로 칩을 배치한다 when 카운트가 서로 다르다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['적음', '많음']), note('2', ['많음'])]);

    renderBar();

    await screen.findByRole('button', { name: /많음/ });
    const chips = screen.getAllByRole('button').map((b) => b.textContent);
    expect(chips[0]).toContain('많음');
    expect(chips[1]).toContain('적음');
  });

  // 경계
  it('should 아무것도 렌더하지 않는다 when 태그를 가진 노트가 하나도 없다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', []), note('2', [])]);

    const { container } = renderBar();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  // 예외
  it('should 아무것도 렌더하지 않는다 when loading이 true다', () => {
    // 영원히 pending — 로딩 상태에 머문다
    vi.mocked(api.fetchNotes).mockReturnValue(new Promise(() => {}));

    const { container } = renderBar();

    expect(container).toBeEmptyDOMElement();
  });

  it('should 아무것도 렌더하지 않는다 when error가 있다', async () => {
    vi.mocked(api.fetchNotes).mockRejectedValue(new Error('Failed to fetch notes'));

    const { container } = renderBar();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

// AC 8 보강 — "키보드로 포커스된다"를 tagName 확인이 아니라 실제 포커스로 검증
describe('TagFilterBar 키보드 접근', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should 칩이 tab 키로 포커스를 받는다 when 칩이 렌더돼 있다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의'])]);
    const user = userEvent.setup();

    renderBar();
    const chip = await screen.findByRole('button', { name: /회의/ });

    await user.tab();

    expect(chip).toHaveFocus();
  });
});
