import { vi, describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/test/mocks/db';

vi.mock('@/lib/db/client', async () => {
  const { db } = await import('@/test/mocks/db');
  return { db };
});

import { getResumeDrafts, getActiveResumeDraft } from '@/server/queries/resume-drafts';
import { getCoverLetterDrafts, getActiveCoverLetterDraft } from '@/server/queries/cover-letters';

const OWNED_FILTER = {
  applicationId: 'app-1',
  application: { vacancy: { userId: 'user-1' } },
};

describe('getResumeDrafts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes findMany by applicationId and owning user', async () => {
    db.resumeDraft.findMany.mockResolvedValue([{ id: 'd1' }]);
    const result = await getResumeDrafts('user-1', 'app-1');
    expect(result).toEqual([{ id: 'd1' }]);
    expect(db.resumeDraft.findMany).toHaveBeenCalledWith({
      where: OWNED_FILTER,
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('getActiveResumeDraft', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the active draft scoped by owner', async () => {
    db.resumeDraft.findFirst.mockResolvedValue({ id: 'd1', isActive: true });
    const result = await getActiveResumeDraft('user-1', 'app-1');
    expect(result).toEqual({ id: 'd1', isActive: true });
    expect(db.resumeDraft.findFirst).toHaveBeenCalledWith({
      where: { ...OWNED_FILTER, isActive: true },
    });
  });

  it('falls back to the most recent draft scoped by owner', async () => {
    db.resumeDraft.findFirst
      .mockResolvedValueOnce(null) // no active draft
      .mockResolvedValueOnce({ id: 'd2' }); // fallback
    const result = await getActiveResumeDraft('user-1', 'app-1');
    expect(result).toEqual({ id: 'd2' });
    expect(db.resumeDraft.findFirst).toHaveBeenLastCalledWith({
      where: OWNED_FILTER,
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('getCoverLetterDrafts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes findMany by applicationId and owning user', async () => {
    db.coverLetterDraft.findMany.mockResolvedValue([{ id: 'c1' }]);
    const result = await getCoverLetterDrafts('user-1', 'app-1');
    expect(result).toEqual([{ id: 'c1' }]);
    expect(db.coverLetterDraft.findMany).toHaveBeenCalledWith({
      where: OWNED_FILTER,
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('getActiveCoverLetterDraft', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the active draft scoped by owner', async () => {
    db.coverLetterDraft.findFirst.mockResolvedValue({ id: 'c1', isActive: true });
    const result = await getActiveCoverLetterDraft('user-1', 'app-1');
    expect(result).toEqual({ id: 'c1', isActive: true });
    expect(db.coverLetterDraft.findFirst).toHaveBeenCalledWith({
      where: { ...OWNED_FILTER, isActive: true },
    });
  });

  it('falls back to the most recent draft scoped by owner', async () => {
    db.coverLetterDraft.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'c2' });
    const result = await getActiveCoverLetterDraft('user-1', 'app-1');
    expect(result).toEqual({ id: 'c2' });
    expect(db.coverLetterDraft.findFirst).toHaveBeenLastCalledWith({
      where: OWNED_FILTER,
      orderBy: { createdAt: 'desc' },
    });
  });
});
