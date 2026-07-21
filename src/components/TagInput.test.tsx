import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from './TagInput';

// TAG-1 유지(칩 표시) + TAG-2(입력 필드·Enter 확정·포커스)
describe('TagInput', () => {
  // ── TAG-1: 칩 표시 (onChange 필수화로 prop 추가) ──
  it('should tags 각 원소를 칩으로 렌더한다 when tags가 ["React","공부"]다', () => {
    render(<TagInput tags={['React', '공부']} onChange={() => {}} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('공부')).toBeInTheDocument();
  });

  it('should 칩을 tags 배열 순서대로 표시한다 when 다중 태그가 주어진다', () => {
    render(<TagInput tags={['alpha', 'beta', 'gamma']} onChange={() => {}} />);
    const [a, b, c] = ['alpha', 'beta', 'gamma'].map((t) => screen.getByText(t));
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(b.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should 칩 하나만 렌더한다 when tags 원소가 1개다', () => {
    render(<TagInput tags={['solo']} onChange={() => {}} />);
    expect(screen.getByText('solo')).toBeInTheDocument();
  });

  // ── TAG-2: 입력 필드 렌더 ──
  // (TAG-1의 "빈 배열이면 완전히 빈 DOM" 단언을 대체 — 이제 빈 배열이어도 입력 필드가 뜬다)
  it('should 빈 배열이어도 입력 필드를 렌더한다 when tags가 []다', () => {
    render(<TagInput tags={[]} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should 칩과 입력 필드를 함께 렌더한다 when tags가 비어있지 않다', () => {
    render(<TagInput tags={['React']} onChange={() => {}} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  // ── TAG-2: Enter 확정 ──
  it('should 타이핑한 값이 onChange로 확정 전달된다 when 사용자가 입력 후 Enter를 누른다', async () => {
    const onChange = vi.fn();
    render(<TagInput tags={[]} onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'React{Enter}');
    expect(onChange).toHaveBeenCalledWith(['React']);
  });

  it('should 입력 필드가 비워진다 when Enter로 확정한 뒤다', async () => {
    render(<TagInput tags={[]} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'React{Enter}');
    expect(input).toHaveValue('');
  });

  it('should 입력 필드에 포커스가 유지된다 when Enter로 확정한 뒤다', async () => {
    render(<TagInput tags={[]} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'React{Enter}');
    expect(input).toHaveFocus();
  });
});
