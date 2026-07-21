import { describe, it, expect } from 'vitest';
import { addTag, removeTag } from './tag';

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

// TAG-3 시나리오: removeTag — 값 기준 filter(순수 규칙, addTag의 대칭)
describe('removeTag', () => {
  // ── 정상 ──
  it('should 해당 태그를 뺀 새 배열을 반환한다 when 존재하는 tag를 지운다', () => {
    expect(removeTag(['React', '공부'], '공부')).toEqual(['React']);
  });

  it('should 나머지 태그의 순서를 유지한다 when 중간의 tag를 지운다', () => {
    expect(removeTag(['alpha', 'beta', 'gamma'], 'beta')).toEqual(['alpha', 'gamma']);
  });

  // ── 경계 ──
  it('should 원본과 내용이 같은 배열을 반환한다(no-op) when 존재하지 않는 tag를 지운다', () => {
    expect(removeTag(['React', '공부'], 'Vue')).toEqual(['React', '공부']);
  });

  it('should 빈 배열을 반환한다 when 마지막 하나 남은 tag를 지운다', () => {
    expect(removeTag(['React'], 'React')).toEqual([]);
  });

  it('should []를 그대로 반환한다 when tags가 []다', () => {
    expect(removeTag([], 'React')).toEqual([]);
  });

  it('should 입력 배열을 변형하지 않는다 when 태그를 제거한다', () => {
    const original = ['React', '공부'];
    removeTag(original, '공부');
    expect(original).toEqual(['React', '공부']);
  });
});
