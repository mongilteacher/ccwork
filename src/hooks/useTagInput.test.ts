import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTagInput } from './useTagInput';

// React 이벤트를 흉내내는 최소 객체
const changeEvent = (value: string) =>
  ({ target: { value } }) as React.ChangeEvent<HTMLInputElement>;
const keyEvent = (key: string) =>
  ({ key, preventDefault: () => {} }) as React.KeyboardEvent<HTMLInputElement>;

// TAG-2 시나리오: useTagInput — 입력 state·Enter 확정·입력 비움
describe('useTagInput', () => {
  // ── 정상 ──
  it('should value를 갱신한다 when handleChange가 입력 변경을 받는다', () => {
    const { result } = renderHook(() => useTagInput([], vi.fn()));
    act(() => result.current.handleChange(changeEvent('Re')));
    expect(result.current.value).toBe('Re');
  });

  it('should addTag 결과로 onChange를 호출한다 when 값이 있는 상태로 Enter를 누른다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput([], onChange));
    act(() => result.current.handleChange(changeEvent('React')));
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(onChange).toHaveBeenCalledWith(['React']);
  });

  it('should 입력값을 빈 문자열로 비운다 when Enter로 확정한 뒤다', () => {
    const { result } = renderHook(() => useTagInput([], vi.fn()));
    act(() => result.current.handleChange(changeEvent('React')));
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(result.current.value).toBe('');
  });

  // ── 경계 ──
  it('should onChange를 호출하지 않는다 when 값이 빈/공백인 채로 Enter를 누른다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput([], onChange));
    act(() => result.current.handleChange(changeEvent('   ')));
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should 확정하지 않는다 when Enter가 아닌 키를 누른다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput([], onChange));
    act(() => result.current.handleChange(changeEvent('React')));
    act(() => result.current.handleKeyDown(keyEvent('a')));
    expect(onChange).not.toHaveBeenCalled();
  });

  // ── TAG-3: 칩 삭제 (handleRemove) ──
  it('should removeTag 결과로 onChange를 호출한다 when handleRemove(tag)를 부른다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput(['React', '공부'], onChange));
    act(() => result.current.handleRemove('공부'));
    expect(onChange).toHaveBeenCalledWith(['React']);
  });

  // ── TAG-4: 검증 에러 state ──
  it('should error가 null이고 onChange로 추가된다 when 유효한 값에서 Enter를 누른다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput([], onChange));
    act(() => result.current.handleChange(changeEvent('React')));
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(result.current.error).toBeNull();
    expect(onChange).toHaveBeenCalledWith(['React']);
  });

  it('should error를 설정하고 onChange를 호출하지 않는다 when 중복 값에서 Enter를 누른다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput(['React'], onChange));
    act(() => result.current.handleChange(changeEvent('react')));
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(result.current.error).toBe('duplicate');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should 입력값을 바꾸면 error가 즉시 null이 된다 when handleChange가 호출된다', () => {
    const { result } = renderHook(() => useTagInput(['React'], vi.fn()));
    // 먼저 중복으로 error를 세운다
    act(() => result.current.handleChange(changeEvent('react')));
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(result.current.error).toBe('duplicate');
    // 입력값을 바꾸는 순간 error가 사라진다(타이머 아님)
    act(() => result.current.handleChange(changeEvent('reactx')));
    expect(result.current.error).toBeNull();
  });
});
