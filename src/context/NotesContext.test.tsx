import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { NotesProvider, useNotes } from './NotesContext';
import * as api from '../api/notes';

vi.mock('../api/notes');

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotesProvider>{children}</NotesProvider>
);

// TAG-1 시나리오: createNote가 tags를 api로 전달해야 한다 (정상)
describe('NotesContext.createNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchNotes).mockResolvedValue([]);
    vi.mocked(api.createNote).mockResolvedValue({
      id: '9',
      title: 't',
      content: 'c',
      tags: ['React'],
      createdAt: '',
      updatedAt: '',
    } as never);
  });

  it('should tags를 포함한 Note를 반환한다 when title·content·tags로 호출한다', async () => {
    const { result } = renderHook(() => useNotes(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      // TAG-1: createNote(title, content, tags) — tags 인자가 api.createNote 입력에 실려야 한다
      await (
        result.current.createNote as unknown as (
          t: string,
          c: string,
          tags: string[],
        ) => Promise<void>
      )('t', 'c', ['React']);
    });

    expect(api.createNote).toHaveBeenCalledWith(expect.objectContaining({ tags: ['React'] }));
  });
});
