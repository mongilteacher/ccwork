import { describe, it, expect } from 'vitest';
import { addTag } from './tag';

// TAG-2 시나리오: addTag — 순수 규칙(trim + 빈 값 무시 + 끝에 추가)
describe('addTag', () => {
  // ── 정상 ──
  it('should raw를 끝에 추가한 새 배열을 반환한다 when 비어있지 않은 값이다', () => {
    expect(addTag([], 'React')).toEqual(['React']);
  });

  it('should 기존 순서를 유지하고 끝에 붙인다 when 이미 태그가 있다', () => {
    expect(addTag(['React', '공부'], 'TypeScript')).toEqual(['React', '공부', 'TypeScript']);
  });

  // ── 경계 ──
  it('should 앞뒤 공백을 trim한 값을 추가한다 when raw에 공백이 섞여 있다', () => {
    expect(addTag([], '  React  ')).toEqual(['React']);
  });

  it('should 빈 tags에 첫 원소로 추가한다 when tags가 []다', () => {
    expect(addTag([], 'first')).toEqual(['first']);
  });

  it('should 원본과 내용이 같은 배열을 반환한다(추가 없음) when trim 후 빈 문자열이다', () => {
    expect(addTag(['React'], '   ')).toEqual(['React']);
    expect(addTag([], '')).toEqual([]);
  });

  it('should 입력 배열을 변형하지 않는다 when 태그를 추가한다', () => {
    const original = ['React'];
    addTag(original, 'Vite');
    expect(original).toEqual(['React']);
  });

  it('should 중복이어도 그대로 추가한다 when 같은 값이 이미 존재한다', () => {
    // TAG-2는 중복 판정 없음 — 중복 제거는 TAG-4
    expect(addTag(['react'], 'react')).toEqual(['react', 'react']);
  });
});
