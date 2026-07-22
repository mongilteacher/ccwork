import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as api from './api/notes';
import { Note } from './types/note';

vi.mock('./api/notes');

function note(id: string, tags: string[]): Note {
  return { id, title: `노트 ${id}`, content: '', tags, createdAt: '', updatedAt: '' };
}

function isCardHighlighted(title: string): boolean {
  return screen.getByText(title).closest('[data-highlighted="true"]') !== null;
}

// TF-2 (#13) — selectedTag는 App의 로컬 state다(ADR-1).
// 칩 클릭 → 강조까지의 배선이 실제로 이어져 있는지 여기서만 확인한다.
describe('App 태그 강조 통합', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should 클릭한 태그의 노트가 강조된다 when 사용자가 칩을 클릭한다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);
    const user = userEvent.setup();

    render(<App />);
    const chip = await screen.findByRole('button', { name: /회의/ });

    await user.click(chip);

    expect(isCardHighlighted('노트 1')).toBe(true);
    expect(isCardHighlighted('노트 2')).toBe(false);
  });

  it('should 이전 태그 강조가 풀리고 새 태그 노트만 강조된다 when 사용자가 다른 칩을 클릭한다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole('button', { name: /회의/ }));

    await user.click(screen.getByRole('button', { name: /팀/ }));

    expect(isCardHighlighted('노트 2')).toBe(true);
    expect(isCardHighlighted('노트 1')).toBe(false);
  });
});
