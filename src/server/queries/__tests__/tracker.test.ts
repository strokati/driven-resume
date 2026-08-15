import { describe, it, expect } from 'vitest';
import { buildTrackerWhere } from '@/server/queries/tracker';
import { TrackerFiltersSchema } from '@/lib/validations/tracker';

const UID = 'user-1';

function filters(patch: Record<string, unknown> = {}) {
  return TrackerFiltersSchema.parse(patch);
}

describe('buildTrackerWhere', () => {
  it('returns only userId for empty filters', () => {
    expect(buildTrackerWhere(UID, filters())).toEqual({ userId: UID });
  });

  it('maps search to case-insensitive vacancy OR', () => {
    const where = buildTrackerWhere(UID, filters({ search: 'acme' }));
    expect(where.vacancy).toEqual({
      OR: [
        { companyName: { contains: 'acme', mode: 'insensitive' } },
        { jobTitle: { contains: 'acme', mode: 'insensitive' } },
      ],
    });
  });

  it('combines search and locationType into one vacancy AND', () => {
    const where = buildTrackerWhere(UID, filters({ search: 'acme', locationType: ['Remote'] }));
    expect(where.vacancy).toEqual({
      OR: [
        { companyName: { contains: 'acme', mode: 'insensitive' } },
        { jobTitle: { contains: 'acme', mode: 'insensitive' } },
      ],
      locationType: { in: ['Remote'] },
    });
  });

  it('maps locationType alone', () => {
    const where = buildTrackerWhere(UID, filters({ locationType: ['Remote', 'Hybrid'] }));
    expect(where.vacancy).toEqual({ locationType: { in: ['Remote', 'Hybrid'] } });
  });

  it('maps status in-list', () => {
    const where = buildTrackerWhere(UID, filters({ status: ['offer', 'rejected'] }));
    expect(where.status).toEqual({ in: ['offer', 'rejected'] });
  });

  it('maps excitement range bounds independently', () => {
    const min = buildTrackerWhere(UID, filters({ excitementMin: 3 }));
    expect(min.excitement).toEqual({ gte: 3 });
    const max = buildTrackerWhere(UID, filters({ excitementMax: 4 }));
    expect(max.excitement).toEqual({ lte: 4 });
    const both = buildTrackerWhere(UID, filters({ excitementMin: 3, excitementMax: 4 }));
    expect(both.excitement).toEqual({ gte: 3, lte: 4 });
  });

  it('maps salary overlap semantics', () => {
    const where = buildTrackerWhere(UID, filters({ salaryFrom: 80000, salaryTo: 120000 }));
    expect(where.salaryMax).toEqual({ gte: 80000 });
    expect(where.salaryMin).toEqual({ lte: 120000 });
  });

  it('maps saved date range as inclusive Date bounds', () => {
    const where = buildTrackerWhere(
      UID,
      filters({ savedFrom: '2026-06-01', savedTo: '2026-08-01' })
    );
    expect(where.dateSaved).toEqual({
      gte: new Date('2026-06-01T00:00:00'),
      lte: new Date('2026-08-01T23:59:59.999'),
    });
  });

  it('maps resumeStatus ready to active ready/exported drafts', () => {
    const where = buildTrackerWhere(UID, filters({ resumeStatus: ['ready'] }));
    expect(where.AND).toEqual([
      {
        OR: [{ resumeDrafts: { some: { isActive: true, status: { in: ['ready', 'exported'] } } } }],
      },
    ]);
  });

  it('maps resumeStatus none to no active drafts', () => {
    const where = buildTrackerWhere(UID, filters({ resumeStatus: ['none'] }));
    expect(where.AND).toEqual([{ OR: [{ resumeDrafts: { none: { isActive: true } } }] }]);
  });

  it('composes mixed doc statuses as OR branches', () => {
    const where = buildTrackerWhere(UID, filters({ resumeStatus: ['ready', 'none'] }));
    expect(where.AND).toEqual([
      {
        OR: [
          { resumeDrafts: { some: { isActive: true, status: { in: ['ready', 'exported'] } } } },
          { resumeDrafts: { none: { isActive: true } } },
        ],
      },
    ]);
  });

  it('maps coverLetterStatus draft', () => {
    const where = buildTrackerWhere(UID, filters({ coverLetterStatus: ['draft'] }));
    expect(where.AND).toEqual([
      { OR: [{ coverLetterDrafts: { some: { isActive: true, status: 'draft' } } }] },
    ]);
  });

  it('maps hasNotes true/false', () => {
    expect(buildTrackerWhere(UID, filters({ hasNotes: true })).AND).toEqual([
      { notes: { some: {} } },
    ]);
    expect(buildTrackerWhere(UID, filters({ hasNotes: false })).AND).toEqual([
      { notes: { none: {} } },
    ]);
  });

  it('maps hasContact true/false', () => {
    expect(buildTrackerWhere(UID, filters({ hasContact: true })).AND).toEqual([
      { contact: { isNot: null } },
    ]);
    expect(buildTrackerWhere(UID, filters({ hasContact: false })).AND).toEqual([{ contact: null }]);
  });

  it('ANDs every active constraint together', () => {
    const where = buildTrackerWhere(
      UID,
      filters({ status: ['offer'], hasNotes: true, resumeStatus: ['draft'] })
    );
    expect(where.status).toEqual({ in: ['offer'] });
    expect(where.AND).toEqual([
      { OR: [{ resumeDrafts: { some: { isActive: true, status: 'draft' } } }] },
      { notes: { some: {} } },
    ]);
  });

  it('ignores sort/page/pageSize/view (list-state, not filters)', () => {
    const where = buildTrackerWhere(
      UID,
      filters({ sort: 'companyName', dir: 'asc', page: 3, pageSize: 50, view: 'kanban' })
    );
    expect(where).toEqual({ userId: UID });
  });
});
