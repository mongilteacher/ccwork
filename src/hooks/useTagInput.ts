import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { addTag, removeTag, validateTag, type TagError } from '../domain/tag';

// 태그 입력 동작 — 입력 state·Enter 확정(표현과 분리, PRD ADR-3)
// TAG-2 범위: IME 가드 없음(TAG-5).
export function useTagInput(tags: string[], onChange: (tags: string[]) => void) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<TagError | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setError(null); // 입력값이 바뀌면 안내 메시지 즉시 소멸(타이머 아님, ADR-4)
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // IME 조합 확정용 Enter → 태그 추가 안 함(TAG-5)
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const err = validateTag(value, tags);
    if (err) {
      setError(err); // 검증 실패 → 코드 보관(문구 매핑은 UI), 추가 안 함
      return;
    }
    const next = addTag(tags, value);
    if (next === tags) return; // 빈 값이면 addTag가 원본을 그대로 반환 → 확정 안 함
    onChange(next);
    setValue('');
    setError(null);
  };

  // TAG-3: 칩 × 삭제 — 로컬 tags만 갱신(서버 호출 없음, 확인 다이얼로그 없음)
  const handleRemove = (tag: string) => {
    onChange(removeTag(tags, tag));
  };

  return { value, error, handleChange, handleKeyDown, handleRemove };
}
