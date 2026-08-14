import { describe, it, expect } from 'vitest';
import { daysInStage, nextMilestone, stagePhrase } from '../stage';

const NOW = new Date('2026-08-14T12:00:00');

describe('daysInStage', () => {
  it('returns 0 for a same-day update', () => {
    expect(daysInStage(new Date('2026-08-14T08:00:00'), NOW)).toBe(0);
  });

  it('returns 1 for yesterday', () => {
    expect(daysInStage(new Date('2026-08-13T23:00:00'), NOW)).toBe(1);
  });

  it('returns full days across months', () => {
    expect(daysInStage(new Date('2026-08-02T10:00:00'), NOW)).toBe(12);
  });

  it('ignores time-of-day differences (calendar days)', () => {
    expect(daysInStage(new Date('2026-08-13T01:00:00'), NOW)).toBe(1);
    expect(daysInStage(new Date('2026-08-12T23:59:00'), NOW)).toBe(2);
  });
});

describe('nextMilestone', () => {
  it('prefers a future interview date', () => {
    const interview = new Date('2026-08-21T10:00:00');
    const offer = new Date('2026-09-01T10:00:00');
    const m = nextMilestone('interview', interview, offer, NOW);
    expect(m).not.toBeNull();
    expect(m!.label).toMatch(/^Interview /);
    expect(m!.label).toContain('Aug 21');
  });

  it('falls back to a future offer date', () => {
    const offer = new Date('2026-09-01T10:00:00');
    const m = nextMilestone('offer', null, offer, NOW);
    expect(m!.label).toMatch(/^Offer /);
  });

  it('returns Awaiting response for applied/screening without dates', () => {
    expect(nextMilestone('applied', null, null, NOW)?.label).toBe('Awaiting response');
    expect(nextMilestone('screening', null, null, NOW)?.label).toBe('Awaiting response');
  });

  it('ignores past interview dates', () => {
    const past = new Date('2026-08-01T10:00:00');
    expect(nextMilestone('interview', past, null, NOW)).toBeNull();
  });

  it('returns null for terminal statuses without future dates', () => {
    expect(nextMilestone('rejected', null, null, NOW)).toBeNull();
    expect(nextMilestone('saved', null, null, NOW)).toBeNull();
  });
});

describe('stagePhrase', () => {
  it('renders "today" for same-day', () => {
    expect(stagePhrase('applied', new Date('2026-08-14T08:00:00'), NOW)).toBe('Applied today');
  });

  it('renders "yesterday"', () => {
    expect(stagePhrase('saved', new Date('2026-08-13T08:00:00'), NOW)).toBe('Saved yesterday');
  });

  it('renders day count', () => {
    expect(stagePhrase('applied', new Date('2026-08-02T10:00:00'), NOW)).toBe(
      'Applied 12 days ago'
    );
  });

  it('uses status-specific verbs', () => {
    expect(stagePhrase('screening', new Date('2026-08-13T08:00:00'), NOW)).toBe(
      'In screening yesterday'
    );
    expect(stagePhrase('interview', new Date('2026-08-13T08:00:00'), NOW)).toBe(
      'In interview yesterday'
    );
    expect(stagePhrase('offer', new Date('2026-08-13T08:00:00'), NOW)).toBe(
      'Offer received yesterday'
    );
  });
});
