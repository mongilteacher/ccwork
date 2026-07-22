import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

// TF-3 (#14) — 필터에서 빠져나오는 경로가 App 배선까지 이어지는지 확인한다.
// 규칙 자체(정규화·완전 일치)는 domain/tagFilter.test.ts가 덮으므로 여기서는 배선만 본다.
describe('App 태그 필터 해제 통합', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 정상
  it('should 선택이 해제되고 아무 노트도 강조되지 않는다 when 선택된 칩을 다시 클릭한다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);
    const user = userEvent.setup();

    const { container } = render(<App />);
    const chip = await screen.findByRole('button', { name: /회의/ });
    await user.click(chip);
    expect(isCardHighlighted('노트 1')).toBe(true);

    await user.click(chip);

    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
  });

  it('should 그 칩이 선택 해제 표시(aria-pressed=false)로 돌아간다 when 선택된 칩을 다시 클릭한다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의'])]);
    const user = userEvent.setup();

    render(<App />);
    const chip = await screen.findByRole('button', { name: /회의/ });
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);

    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('should 이전 선택이 풀리고 새 태그만 강조된다 when 다른 칩을 클릭한다', async () => {
    // 토글 도입 회귀 방어 — 재클릭이 아닌 "갈아타기"는 그대로여야 한다
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(await screen.findByRole('button', { name: /회의/ }));

    await user.click(screen.getByRole('button', { name: /팀/ }));

    expect(isCardHighlighted('노트 2')).toBe(true);
    expect(isCardHighlighted('노트 1')).toBe(false);
  });

  it('should 칩과 강조가 함께 사라진다 when 선택 태그를 가진 마지막 노트를 삭제한다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);
    vi.mocked(api.deleteNote).mockResolvedValue(undefined);
    const user = userEvent.setup();

    const { container } = render(<App />);
    await user.click(await screen.findByRole('button', { name: /회의/ }));

    const card = screen.getByText('노트 1').closest('[data-highlighted="true"]') as HTMLElement;
    await user.click(within(card).getByRole('button', { name: '삭제' }));

    expect(screen.queryByRole('button', { name: /회의/ })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
  });

  it('should 다시 강조된다 when 해제 후 같은 칩을 또 클릭한다', async () => {
    vi.mocked(api.fetchNotes).mockResolvedValue([note('1', ['회의']), note('2', ['팀'])]);
    const user = userEvent.setup();

    render(<App />);
    const chip = await screen.findByRole('button', { name: /회의/ });

    await user.click(chip); // 선택
    expect(isCardHighlighted('노트 1')).toBe(true);
    await user.click(chip); // 해제
    expect(isCardHighlighted('노트 1')).toBe(false);
    await user.click(chip); // 재선택

    expect(isCardHighlighted('노트 1')).toBe(true);
  });
});
