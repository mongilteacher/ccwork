import { describe, it, expect } from 'vitest';
import db from '../../db.json';

// TAG-1 시나리오: db.json 시드 데이터 (경계)
describe('db.json 시드 데이터', () => {
  it('should 기존 노트 3건이 모두 tags를 갖고 최소 1건은 비어있지 않다 when 시드 데이터를 확인한다', () => {
    const notes = db.notes as Array<{ tags?: unknown }>;

    expect(notes.length).toBeGreaterThanOrEqual(3);
    // 모든 노트가 tags 배열을 가진다
    expect(notes.every((n) => Array.isArray(n.tags))).toBe(true);
    // 최소 1건은 비어있지 않다
    expect(notes.some((n) => Array.isArray(n.tags) && n.tags.length > 0)).toBe(true);
  });
});
