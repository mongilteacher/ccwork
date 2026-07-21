import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { addTag } from '../domain/tag';

// 태그 입력 동작 — 입력 state·Enter 확정(표현과 분리, PRD ADR-3)
// TAG-2 범위: IME 가드 없음(TAG-5).
export function useTagInput(tags: string[], onChange: (tags: string[]) => void) {
  const [value, setValue] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const next = addTag(tags, value);
    if (next === tags) return; // 빈 값이면 addTag가 원본을 그대로 반환 → 확정 안 함
    onChange(next);
    setValue('');
  };

  return { value, handleChange, handleKeyDown };
}
