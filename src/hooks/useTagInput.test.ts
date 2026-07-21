import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTagInput } from './useTagInput';

// React 이벤트를 흉내내는 최소 객체
const changeEvent = (value: string) =>
  ({ target: { value } }) as React.ChangeEvent<HTMLInputElement>;
// nativeEvent.isComposing 기본 false — TAG-5 IME 가드가 이 값을 읽는다
const keyEvent = (key: string) =>
  ({
    key,
    nativeEvent: { isComposing: false },
    preventDefault: () => {},
  }) as React.KeyboardEvent<HTMLInputElement>;
// IME 조합 중 이벤트 — isComposing=true
const composingKeyEvent = (key: string) =>
  ({
    key,
    nativeEvent: { isComposing: true },
    preventDefault: () => {},
  }) as React.KeyboardEvent<HTMLInputElement>;

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

  // ── TAG-5: 한글 IME 조합 가드 ──
  it('should 조합이 끝난 뒤 Enter로 정상 추가된다 when isComposing이 false다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput([], onChange));
    act(() => result.current.handleChange(changeEvent('한글')));
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(onChange).toHaveBeenCalledWith(['한글']);
  });

  it('should 태그를 추가하지 않는다 when 한글 조합 중(isComposing=true) Enter를 누른다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput([], onChange));
    act(() => result.current.handleChange(changeEvent('한글')));
    act(() => result.current.handleKeyDown(composingKeyEvent('Enter')));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should 이중 추가되지 않는다 when 조합 Enter 직후 확정 Enter가 온다', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useTagInput([], onChange));
    act(() => result.current.handleChange(changeEvent('한글')));
    // 조합 확정용 Enter는 무시돼야 한다 — 추가도 없고 입력값도 그대로 유지
    act(() => result.current.handleKeyDown(composingKeyEvent('Enter')));
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.value).toBe('한글');
    // 실제 확정 Enter에서만 1회 추가된다
    act(() => result.current.handleKeyDown(keyEvent('Enter')));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['한글']);
  });
});
