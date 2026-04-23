import { describe, it, expect } from 'vitest';
import { parse } from '../expr/parser';
import { evaluateAll } from '../expr/evaluator';
import { buildDataset } from '../data/dataset';
import type { FundProfile } from '../../data/types';

function mkProfile(code: string, navs: number[]): FundProfile {
  const today = new Date('2024-01-01').getTime();
  return {
    code,
    name: code,
    nav: navs.map((v, i) => ({
      date: new Date(today + i * 86400_000).toISOString().slice(0, 10),
      nav: v,
      accNav: v,
      pct: i === 0 ? 0 : ((v - navs[i - 1]) / navs[i - 1]) * 100,
    })),
    fetchedAt: 0,
  };
}

describe('parser', () => {
  it('parses simple momentum', () => {
    const ast = parse('$nav / Ref($nav, 20) - 1');
    expect(ast.type).toBe('bin');
  });

  it('rejects unknown token', () => {
    expect(() => parse('@foo')).toThrow();
  });

  it('parses nested calls', () => {
    expect(() => parse('Mean($nav, 5) - Mean($nav, 20)')).not.toThrow();
  });
});

describe('evaluator', () => {
  it('computes 2-day momentum', () => {
    const p = mkProfile('A', [1, 1.1, 1.21, 1.33]);
    const ds = buildDataset([p], ['nav']);
    const out = evaluateAll(parse('$nav / Ref($nav, 2) - 1'), ds);
    expect(out[0][2]).toBeCloseTo(0.21, 3); // 1.21 / 1 - 1
    expect(out[0][3]).toBeCloseTo(0.209, 2); // 1.33 / 1.1 - 1 ≈ 0.209
  });

  it('Mean rolling average', () => {
    const p = mkProfile('A', [1, 2, 3, 4]);
    const ds = buildDataset([p], ['nav']);
    const out = evaluateAll(parse('Mean($nav, 2)'), ds);
    expect(out[0][1]).toBe(1.5);
    expect(out[0][3]).toBe(3.5);
  });

  it('cross-sectional Rank', () => {
    const p1 = mkProfile('A', [1, 1, 1]);
    const p2 = mkProfile('B', [1, 2, 3]);
    const p3 = mkProfile('C', [1, 0.5, 4]);
    const ds = buildDataset([p1, p2, p3], ['nav']);
    const out = evaluateAll(parse('Rank($nav)'), ds);
    // at t=2: A=1 (lowest), B=3 (middle), C=4 (highest)
    // ranks: A=0, B=0.5, C=1
    expect(out[0][2]).toBeCloseTo(0, 2);
    expect(out[1][2]).toBeCloseTo(0.5, 2);
    expect(out[2][2]).toBeCloseTo(1, 2);
  });
});
