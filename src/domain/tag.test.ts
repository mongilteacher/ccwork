import { describe, it, expect } from 'vitest';
import { addTag, removeTag, validateTag, normalizeTag, MAX_TAG_LENGTH, MAX_TAG_COUNT } from './tag';

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

// TAG-4 시나리오: validateTag — 검증 규칙(순수). spec §5.3 우선순위 + §6.2 엣지케이스
describe('validateTag', () => {
  // 상수 확인 — 규칙의 상한이 명세와 일치하는가
  it('should 20과 10이다 when MAX_TAG_LENGTH·MAX_TAG_COUNT를 읽는다', () => {
    expect(MAX_TAG_LENGTH).toBe(20);
    expect(MAX_TAG_COUNT).toBe(10);
  });

  // ── it.each 테이블: spec §5.3(우선순위)·§6.2(엣지케이스)를 그대로 이관 (AC9) ──
  const tenTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
  const nineTags = Array.from({ length: 9 }, (_, i) => `tag${i}`);
  const tenWithReact = ['react', ...Array.from({ length: 9 }, (_, i) => `tag${i}`)];

  it.each([
    // [설명, value, tags, 기대]
    ['처음 보는 유효한 태그', 'React', [] as string[], null],
    ['앞뒤 공백을 뺀 유효값', '  React  ', [] as string[], null],
    ['내부 공백 포함 한 태그', 'React Query', [] as string[], null],
    ['특수문자 C++', 'C++', [] as string[], null],
    ['특수문자 #React', '#React', [] as string[], null],
    ['쉼표 포함 한 태그', 'React, Vue', [] as string[], null],
    ['정확히 20자', 'a'.repeat(20), [] as string[], null],
    ['9개일 때 새 값', 'newTag', nineTags, null],
    ['빈 문자열', '', [] as string[], null],
    ['공백만', '   ', [] as string[], null],
    ['21자', 'a'.repeat(21), [] as string[], 'tooLong'],
    ['10개일 때 새 값', 'newTag', tenTags, 'tooMany'],
    ['대소문자만 다른 중복', 'react', ['React'], 'duplicate'],
    ['21자이면서 중복(우선순위상 길이)', 'a'.repeat(21), ['a'.repeat(21)], 'tooLong'],
    ['10개이면서 중복(우선순위상 개수)', 'react', tenWithReact, 'tooMany'],
  ])('should %s → %j를 반환한다', (_desc, value, tags, expected) => {
    expect(validateTag(value, tags)).toBe(expected);
  });

  // ── 이모지: [...value].length(코드 포인트) 기준이라 부당 거부되지 않음 (AC3) ──
  it("should 'tooLong'이 아니다 when 이모지 11개를 [...value].length로 센다", () => {
    const emojis = '😀'.repeat(11); // .length === 22(서로게이트 쌍), [...].length === 11
    expect([...emojis].length).toBe(11);
    expect(validateTag(emojis, [])).toBeNull();
  });
});

// TAG-5 시나리오: normalizeTag — 정규화 파이프라인(순수). spec §5.2 순서 + §6.2 엣지케이스
describe('normalizeTag', () => {
  // ── it.each 테이블: spec §5.2(순서)·§6.2(엣지케이스) 이관 (AC7) ──
  const nfcHan = '한글'.normalize('NFC');
  const nfdHan = '한글'.normalize('NFD');

  it.each([
    // [설명, raw, 기대]
    ['정규화 불필요한 값', 'React', 'React'],
    ['앞뒤 공백 제거', '  React  ', 'React'],
    ['내부 단일 공백 보존', 'React Query', 'React Query'],
    ['연속 공백 축약', 'React  Query', 'React Query'],
    ['공백 3개 이상 축약', 'a     b', 'a b'],
    ['개행 → 공백', 'line1\nline2', 'line1 line2'],
    ['빈 줄 포함 여러 줄 → 공백 1개', 'a\n\nb', 'a b'],
    ['탭 → 공백', 'a\tb', 'a b'],
    ['CRLF 개행 → 공백 1개', 'a\r\nb', 'a b'],
    ['공백·개행만이면 빈 문자열', '  \n\t ', ''],
    ['쉼표 보존(분리 안 함)', 'React, Vue', 'React, Vue'],
  ])('should %s → %j를 반환한다', (_desc, raw, expected) => {
    expect(normalizeTag(raw)).toBe(expected);
  });

  // ── NFD → NFC (macOS 복사 한글) ──
  it('should NFD를 NFC로 정규화한다 when 자모 분리형 한글이다', () => {
    expect(nfdHan).not.toBe(nfcHan); // 정규화 전엔 코드포인트가 다름
    expect(normalizeTag(nfdHan)).toBe(nfcHan);
  });
});

// TAG-5 시나리오: addTag/validateTag 통합 지점 — 정규화 기준으로 동작
describe('addTag (TAG-5 정규화 통합)', () => {
  it('should 개행 포함 값을 한 줄로 정규화해 추가한다 when 여러 줄을 붙여넣는다', () => {
    expect(addTag([], 'line1\nline2')).toEqual(['line1 line2']);
  });

  it('should 쉼표 포함 값을 하나의 태그로 추가한다 when React, Vue를 넣는다', () => {
    expect(addTag([], 'React, Vue')).toEqual(['React, Vue']);
  });

  it('should 연속 공백을 축약해 추가한다 when React  Query를 넣는다', () => {
    expect(addTag([], 'React  Query')).toEqual(['React Query']);
  });
});

describe('validateTag (TAG-5 NFC 중복)', () => {
  it("should 'duplicate'를 반환한다 when NFD 한글이 기존 NFC 한글과 정규화 후 같다", () => {
    const nfcHan = '한글'.normalize('NFC');
    const nfdHan = '한글'.normalize('NFD');
    expect(validateTag(nfdHan, [nfcHan])).toBe('duplicate');
  });
});
