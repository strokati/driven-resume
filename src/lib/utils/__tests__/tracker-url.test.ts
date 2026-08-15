import { describe, it, expect } from 'vitest';
import {
  parseTrackerFilters,
  serializeTrackerFilters,
  buildTrackerHref,
  isDefaultTrackerFilters,
} from '@/lib/utils/tracker-url';
import { TrackerFiltersSchema } from '@/lib/validations/tracker';

const defaults = TrackerFiltersSchema.parse({});

const fullFilters = TrackerFiltersSchema.parse({
  search: 'backend',
  status: ['applied', 'screening'],
  locationType: ['Remote', 'Hybrid'],
  excitementMin: 3,
  excitementMax: 5,
  salaryFrom: 80000,
  salaryTo: 120000,
  savedFrom: '2026-06-01',
  savedTo: '2026-08-01',
  resumeStatus: ['ready', 'none'],
  coverLetterStatus: ['draft'],
  hasNotes: true,
  hasContact: false,
  sort: 'companyName',
  dir: 'asc',
  page: 2,
  pageSize: 50,
  view: 'kanban',
});

describe('parseTrackerFilters', () => {
  it('returns all defaults for empty params', () => {
    expect(parseTrackerFilters(new URLSearchParams())).toEqual(defaults);
  });

  it('returns all defaults for an empty record', () => {
    expect(parseTrackerFilters({})).toEqual(defaults);
  });

  it('parses repeated params into arrays', () => {
    const result = parseTrackerFilters({ status: ['applied', 'screening'] });
    expect(result.status).toEqual(['applied', 'screening']);
  });

  it('parses a single param into a one-element array', () => {
    const result = parseTrackerFilters({ status: 'offer' });
    expect(result.status).toEqual(['offer']);
  });

  it('coerces numeric params', () => {
    const result = parseTrackerFilters({ page: '3', excitementMin: '2', salaryTo: '90000' });
    expect(result.page).toBe(3);
    expect(result.excitementMin).toBe(2);
    expect(result.salaryTo).toBe(90000);
  });

  it('parses boolean params strictly', () => {
    expect(parseTrackerFilters({ hasNotes: 'true' }).hasNotes).toBe(true);
    expect(parseTrackerFilters({ hasNotes: 'false' }).hasNotes).toBe(false);
    expect(parseTrackerFilters({ hasNotes: 'bogus' }).hasNotes).toBeUndefined();
  });

  it('drops invalid enum values but keeps valid ones', () => {
    const result = parseTrackerFilters({ status: ['applied', 'nonsense'] });
    expect(result.status).toEqual(['applied']);
  });

  it('drops invalid single values silently', () => {
    const result = parseTrackerFilters({ page: 'abc', sort: 'bogus', view: 'grid' });
    expect(result.page).toBe(1);
    expect(result.sort).toBe('dateSaved');
    expect(result.view).toBe('table');
  });

  it('falls back to page 1 on non-numeric page, keeping other params', () => {
    const result = parseTrackerFilters({ page: 'xyz', search: 'acme' });
    expect(result.page).toBe(1);
    expect(result.search).toBe('acme');
  });

  it('rejects malformed dates', () => {
    expect(parseTrackerFilters({ savedFrom: '06/01/2026' }).savedFrom).toBeUndefined();
    expect(parseTrackerFilters({ savedTo: '2026-13-45' }).savedTo).toBeUndefined();
  });

  it('takes the first value when a single param is repeated', () => {
    const result = parseTrackerFilters({ search: ['first', 'second'] });
    expect(result.search).toBe('first');
  });

  it('never throws on garbage input (fuzz)', () => {
    const samples = [
      '🦄',
      '<script>alert(1)</script>',
      '../../etc/passwd',
      'a%20b',
      '-99999',
      'null',
      'undefined',
      '%00',
      ' '.repeat(300),
    ];
    for (let i = 0; i < 50; i++) {
      const key = samples[i % samples.length];
      const value = samples[(i * 7) % samples.length];
      expect(() => parseTrackerFilters({ [key]: value })).not.toThrow();
      expect(() => parseTrackerFilters({ page: value, status: key })).not.toThrow();
    }
  });
});

describe('serializeTrackerFilters', () => {
  it('serializes the default state to an empty string', () => {
    expect(serializeTrackerFilters(defaults)).toBe('');
  });

  it('round-trips a fully-populated filters object', () => {
    const qs = serializeTrackerFilters(fullFilters);
    expect(parseTrackerFilters(new URLSearchParams(qs))).toEqual(fullFilters);
  });

  it('omits defaults', () => {
    const qs = serializeTrackerFilters(TrackerFiltersSchema.parse({ page: 1, pageSize: 20 }));
    expect(qs).toBe('');
  });

  it('appends repeated params for multi-value filters', () => {
    const qs = serializeTrackerFilters(
      TrackerFiltersSchema.parse({ status: ['applied', 'offer'] })
    );
    expect(qs).toBe('status=applied&status=offer');
  });
});

describe('buildTrackerHref', () => {
  it('returns bare /tracker for default state', () => {
    expect(buildTrackerHref(defaults, {})).toBe('/tracker');
  });

  it('merges the patch over the current filters', () => {
    const href = buildTrackerHref(TrackerFiltersSchema.parse({ search: 'acme' }), { page: 2 });
    expect(href).toBe('/tracker?search=acme&page=2');
  });

  it('drops params that return to defaults', () => {
    const href = buildTrackerHref(TrackerFiltersSchema.parse({ search: 'acme' }), {
      search: undefined,
    });
    expect(href).toBe('/tracker');
  });
});

describe('isDefaultTrackerFilters', () => {
  it('is true for defaults', () => {
    expect(isDefaultTrackerFilters(defaults)).toBe(true);
  });

  it('is false when any filter is set', () => {
    expect(isDefaultTrackerFilters(TrackerFiltersSchema.parse({ search: 'x' }))).toBe(false);
    expect(isDefaultTrackerFilters(TrackerFiltersSchema.parse({ page: 2 }))).toBe(false);
  });
});
