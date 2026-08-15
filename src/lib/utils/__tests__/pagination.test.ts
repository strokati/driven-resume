import { describe, it, expect } from 'vitest';
import { getPageWindow } from '@/lib/utils/pagination';

describe('getPageWindow', () => {
  it('returns empty for zero pages', () => {
    expect(getPageWindow(1, 0)).toEqual([]);
  });

  it('returns all numbers when pageCount <= 7', () => {
    expect(getPageWindow(1, 1)).toEqual([1]);
    expect(getPageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps a leading window without ellipsis for low currents', () => {
    expect(getPageWindow(1, 13)).toEqual([1, 2, 3, 4, 5, '…', 13]);
    expect(getPageWindow(2, 8)).toEqual([1, 2, 3, 4, 5, '…', 8]);
    expect(getPageWindow(4, 12)).toEqual([1, 2, 3, 4, 5, '…', 12]);
  });

  it('keeps a trailing window without leading ellipsis for high currents', () => {
    expect(getPageWindow(13, 13)).toEqual([1, '…', 9, 10, 11, 12, 13]);
    expect(getPageWindow(8, 8)).toEqual([1, '…', 4, 5, 6, 7, 8]);
    expect(getPageWindow(9, 12)).toEqual([1, '…', 8, 9, 10, 11, 12]);
  });

  it('windows around the middle for middle currents', () => {
    expect(getPageWindow(5, 13)).toEqual([1, '…', 4, 5, 6, '…', 13]);
    expect(getPageWindow(50, 100)).toEqual([1, '…', 49, 50, 51, '…', 100]);
  });

  it('never emits adjacent ellipses at boundaries', () => {
    // pageCount 8 is the tightest case: current 4 is the middle transition.
    expect(getPageWindow(4, 8)).toEqual([1, 2, 3, 4, 5, '…', 8]);
    // current 5 falls into the trailing branch: no second ellipsis needed.
    expect(getPageWindow(5, 8)).toEqual([1, '…', 4, 5, 6, 7, 8]);
  });

  it('clamps out-of-range currents', () => {
    expect(getPageWindow(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageWindow(99, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageWindow(99, 12)).toEqual([1, '…', 8, 9, 10, 11, 12]);
  });

  it('covers the full boundary matrix without duplicate numbers', () => {
    for (let pageCount = 1; pageCount <= 12; pageCount++) {
      const currents = [
        1,
        2,
        3,
        Math.floor(pageCount / 2),
        pageCount - 2,
        pageCount - 1,
        pageCount,
      ];
      for (const current of currents) {
        if (current < 1) continue;
        const window = getPageWindow(current, pageCount);
        const numbers = window.filter((t) => t !== '…') as number[];
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers[0]).toBe(1);
        expect(numbers[numbers.length - 1]).toBe(pageCount);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        for (let i = 1; i < window.length; i++) {
          expect(window[i] === '…' && window[i - 1] === '…').toBe(false);
        }
      }
    }
  });
});
