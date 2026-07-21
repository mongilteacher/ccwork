import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TagInput } from './TagInput';

// TAG-1 시나리오: TagInput 표시 (정상/경계)
describe('TagInput', () => {
  it('should tags 각 원소를 칩으로 렌더한다 when tags가 ["React","공부"]다', () => {
    render(<TagInput tags={['React', '공부']} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('공부')).toBeInTheDocument();
  });

  it('should 칩을 tags 배열 순서대로 표시한다 when 다중 태그가 주어진다', () => {
    render(<TagInput tags={['alpha', 'beta', 'gamma']} />);
    const [a, b, c] = ['alpha', 'beta', 'gamma'].map((t) => screen.getByText(t));
    // 문서 상에서 a → b → c 순서로 나타나야 한다
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(b.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should 아무 칩도 렌더하지 않고 빈 상태 문구도 없이 비운다 when tags가 []다', () => {
    const { container } = render(<TagInput tags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should 칩 하나만 렌더한다 when tags 원소가 1개다', () => {
    render(<TagInput tags={['solo']} />);
    expect(screen.getByText('solo')).toBeInTheDocument();
  });
});
