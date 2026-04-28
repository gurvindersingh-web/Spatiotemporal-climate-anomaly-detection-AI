/**
 * Unit tests for the anomaly detector module.
 */

import { computeBaseline, computeZScore, classifyAnomaly } from '../src/services/detector.js';

describe('computeBaseline', () => {
  test('computes mean and stdDev from values', () => {
    const values = [10, 20, 30, 40, 50];
    const result = computeBaseline(values);
    expect(result.mean).toBeCloseTo(30, 2);
    expect(result.stdDev).toBeCloseTo(14.1421, 2);
    expect(result.count).toBe(5);
  });

  test('handles empty array', () => {
    const result = computeBaseline([]);
    expect(result.mean).toBe(0);
    expect(result.stdDev).toBe(1);
    expect(result.count).toBe(0);
  });

  test('filters null and NaN values', () => {
    const values = [10, null, 20, NaN, 30, undefined];
    const result = computeBaseline(values);
    expect(result.mean).toBeCloseTo(20, 2);
    expect(result.count).toBe(3);
  });

  test('prevents stdDev of zero', () => {
    const values = [5, 5, 5, 5];
    const result = computeBaseline(values);
    expect(result.mean).toBe(5);
    expect(result.stdDev).toBeGreaterThan(0);
  });
});

describe('computeZScore', () => {
  test('computes correct Z-score', () => {
    expect(computeZScore(35, 30, 5)).toBeCloseTo(1.0, 2);
    expect(computeZScore(20, 30, 5)).toBeCloseTo(-2.0, 2);
    expect(computeZScore(30, 30, 5)).toBeCloseTo(0, 2);
  });

  test('handles stdDev of zero', () => {
    expect(computeZScore(35, 30, 0)).toBe(0);
  });

  test('handles NaN stdDev', () => {
    expect(computeZScore(35, 30, NaN)).toBe(0);
  });
});

describe('classifyAnomaly', () => {
  test('classifies Normal correctly', () => {
    const result = classifyAnomaly(0.5);
    expect(result.isAnomaly).toBe(false);
    expect(result.severity).toBe('Normal');
  });

  test('classifies Watch correctly', () => {
    const result = classifyAnomaly(1.7);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('Watch');
  });

  test('classifies Warning correctly', () => {
    const result = classifyAnomaly(2.5);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('Warning');
  });

  test('classifies Extreme correctly', () => {
    const result = classifyAnomaly(3.5);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('Extreme');
  });

  test('handles negative Z-scores (absolute value)', () => {
    const result = classifyAnomaly(-3.5);
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('Extreme');
  });

  test('returns correct colors', () => {
    expect(classifyAnomaly(0).color).toBe('#2ed573');
    expect(classifyAnomaly(1.6).color).toBe('#ffdd57');
    expect(classifyAnomaly(2.5).color).toBe('#ffa502');
    expect(classifyAnomaly(3.5).color).toBe('#ff4757');
  });
});
