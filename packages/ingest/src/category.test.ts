import { describe, expect, it } from 'vitest';
import vectors from '../../core/test-vectors/category.json';
import { parseSheet } from './index';
import { normalizeCategory, parseCategory, parseCategoryRaw } from './category';

const VECTORS = vectors as { in: string; out: string }[];

/** The same file the database runs (supabase-v2/tests/142_category_normalize.test.sql) */
describe('normalizeCategory vectors', () => {
  for (const v of VECTORS) {
    it(`[${v.in}] -> [${v.out}]`, () => expect(normalizeCategory(v.in)).toBe(v.out));
  }

  it('is idempotent', () => {
    for (const v of VECTORS) expect(normalizeCategory(v.out)).toBe(v.out);
  });
});

describe('parseCategory', () => {
  it('«M 60» and «M 60+» are one level; the fingerprint level stays as written', () => {
    const a = parseCategory('M 60');
    const b = parseCategory('M 60+');
    expect(a.level).toBe('60+');
    expect(b.level).toBe('60+');
    expect(parseCategoryRaw('M 60').level).toBe('60');
    expect(parseCategoryRaw('M 60+').level).toBe('60+');
    expect(a.discipline).toBe('MS');
  });
  it('keeps its older readings', () => {
    expect(parseCategory('M MED/ADV').level).toBe('MED/ADV');
    expect(parseCategory('M ROOK 2').level).toBe('ROOKIES 2');
    expect(parseCategory('M').level).toBe('OPEN');
    expect(parseCategory('MD -40').level).toBe('-40');
    expect(parseCategory('M 40-').level).toBe('-40');
  });
});

describe('a sheet row', () => {
  const head = ['ΩΡΑ', 'ΚΑΤΗΓΟΡΙΑ', 'PLAYER 1', 'PLAYER 2', 'ΑΠΟΤΕΛΕΣΜΑ'];
  const row = (cat: string) => [{ name: 'ΚΥΡ 18/10', rows: [head, ['16.30', cat, 'ΖΑΝΝΗΣ ΓΙΩΡΓΟΣ', 'ΜΟΥΡΙΚΗΣ ΔΗΜΗΤΡΗΣ', '']] }];
  it('shows «60+» whichever way the organiser wrote it, and keeps the fingerprint it always had', () => {
    const [bare] = parseSheet(row('M 60'), 2026);
    const [plus] = parseSheet(row('M 60+'), 2026);
    expect(bare!.level).toBe('60+');
    expect(plus!.level).toBe('60+');
    expect(bare!.fingerprint).toContain('|MS|60|');
    expect(plus!.fingerprint).toContain('|MS|60+|');
  });
});
