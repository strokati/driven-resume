/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/test/mocks/db';

vi.mock('@/lib/db/client', async () => {
  const { db } = await import('@/test/mocks/db');
  return { db };
});
vi.mock('@/lib/auth/config', () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: 'local-user' },
    expires: new Date(Date.now() + 3600000).toISOString(),
  }),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
  };
});

import { downloadUserArchive, restoreUserArchive } from '@/server/actions/data-export';
import { ARCHIVE_VERSION } from '@/lib/validations/data-export';
import { sampleArchive, sampleArchiveJson } from '@/test/fixtures/data-export';

function stubDbForSnapshot() {
  db.user.findUniqueOrThrow.mockResolvedValue({
    id: 'local-user',
    email: 'local@localhost',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
  db.masterResume.findMany.mockResolvedValue([]);
  db.vacancy.findMany.mockResolvedValue([]);
  db.application.findMany.mockResolvedValue([]);
  db.aiProviderConfig.findMany.mockResolvedValue([]);
  db.aiCallLog.findMany.mockResolvedValue([]);
  db.aiPromptOverride.findMany.mockResolvedValue([]);
}

/** Records the call order of wipe/insert sub-operations across a transaction. */
function recordTransactionOrder(): string[] {
  const order: string[] = [];
  db.aiCallLog.deleteMany.mockImplementation(() => {
    order.push('wipe:aiCallLog');
    return Promise.resolve({ count: 0 });
  });
  db.masterResume.deleteMany.mockImplementation(() => {
    order.push('wipe:masterResume');
    return Promise.resolve({ count: 0 });
  });
  db.masterResume.create.mockImplementation(() => {
    order.push('insert:masterResume');
    return Promise.resolve({});
  });
  db.vacancy.create.mockImplementation(() => {
    order.push('insert:vacancy');
    return Promise.resolve({});
  });
  db.application.create.mockImplementation(() => {
    order.push('insert:application');
    return Promise.resolve({});
  });
  return order;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: pass the mock db itself as `tx` so model methods inside the
  // transaction callback hit the same mocks we assert on.
  db.$transaction.mockImplementation(async (cb: any) => cb(db));
  stubDbForSnapshot();
});

describe('downloadUserArchive', () => {
  it('returns { filename, json } where filename matches the expected pattern', async () => {
    const result = await downloadUserArchive();
    expect(result.filename).toMatch(/^reeesume-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
  });

  it('returns json that is valid JSON and round-trips through UserArchiveSchema', async () => {
    const { json } = await downloadUserArchive();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(ARCHIVE_VERSION);
    expect(parsed.userId).toBe('local-user');
    expect(Array.isArray(parsed.masterResumes)).toBe(true);
  });
});

describe('restoreUserArchive — happy path', () => {
  it('returns ok with a summary that mentions master resumes, applications, and configs', async () => {
    const result = await restoreUserArchive(sampleArchiveJson);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary).toMatch(/master resume/i);
      expect(result.summary).toMatch(/application/i);
      expect(result.summary).toMatch(/AI provider/i);
    }
  });

  it('wipes existing data BEFORE inserting from the archive', async () => {
    const order = recordTransactionOrder();
    await restoreUserArchive(sampleArchiveJson);
    const firstWipe = order.findIndex((op) => op.startsWith('wipe:'));
    const firstInsert = order.findIndex((op) => op.startsWith('insert:'));
    expect(firstWipe).toBeGreaterThanOrEqual(0);
    expect(firstInsert).toBeGreaterThanOrEqual(0);
    expect(firstWipe).toBeLessThan(firstInsert);
  });

  it('inserts master resumes, vacancies, and applications', async () => {
    await restoreUserArchive(sampleArchiveJson);
    expect(db.masterResume.create).toHaveBeenCalledTimes(sampleArchive.masterResumes.length);
    expect(db.vacancy.create).toHaveBeenCalledTimes(sampleArchive.vacancies.length);
    expect(db.application.create).toHaveBeenCalledTimes(sampleArchive.applications.length);
  });

  it('rebinds every inserted row to the current userId (local-user)', async () => {
    await restoreUserArchive(sampleArchiveJson);
    // archive has userId 'test-user'; restore must overwrite to 'local-user'
    const masterResumeCall = db.masterResume.create.mock.calls[0][0] as any;
    expect(masterResumeCall.data.userId).toBe('local-user');
    const vacancyCall = db.vacancy.create.mock.calls[0][0] as any;
    expect(vacancyCall.data.userId).toBe('local-user');
  });

  it('rebinds applications to the current userId and assigns serial numbers', async () => {
    await restoreUserArchive(sampleArchiveJson);
    for (const call of db.application.create.mock.calls) {
      const args = call[0] as any;
      expect(args.data.userId).toBe('local-user');
      expect(Number.isInteger(args.data.serialNumber)).toBe(true);
      expect(args.data.serialNumber).toBeGreaterThan(0);
    }
  });

  it('regenerates serial numbers in save order for pre-p25 archives', async () => {
    await restoreUserArchive(sampleArchiveJson);
    const serials = db.application.create.mock.calls.map(
      (call) => (call[0] as any).data.serialNumber
    );
    expect(serials).toEqual([1]);
  });

  it('preserves serial numbers from archives that have them', async () => {
    const archive = JSON.parse(sampleArchiveJson);
    archive.applications = [
      { ...archive.applications[0], serialNumber: 41, userId: 'other-user' },
      {
        ...archive.applications[0],
        id: 'application-2',
        vacancyId: 'vacancy-2',
        dateSaved: '2026-01-15T00:00:00.000Z',
        resumeDrafts: [],
        coverLetterDrafts: [],
        notes: [],
        contact: null,
        serialNumber: 7,
      },
    ];
    await restoreUserArchive(JSON.stringify(archive));
    const byId = new Map(
      db.application.create.mock.calls.map((call) => {
        const args = call[0] as any;
        return [args.data.id, args.data.serialNumber];
      })
    );
    expect(byId.get('application-1')).toBe(41);
    expect(byId.get('application-2')).toBe(7);
    expect(db.application.create.mock.calls[0][0].data.userId).toBe('local-user');
  });

  it('uses createMany for aiProviderConfigs, aiCallLogs, aiPromptOverrides', async () => {
    await restoreUserArchive(sampleArchiveJson);
    expect(db.aiProviderConfig.createMany).toHaveBeenCalledTimes(1);
    // Sample archive has empty aiCallLogs and aiPromptOverrides — those are skipped.
    expect(db.aiCallLog.createMany).not.toHaveBeenCalled();
    expect(db.aiPromptOverride.createMany).not.toHaveBeenCalled();
  });
});

describe('restoreUserArchive — input rejection', () => {
  it('rejects malformed JSON with a clear error', async () => {
    const result = await restoreUserArchive('{not valid json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid JSON/i);
  });

  it('does NOT call the transaction when JSON is malformed', async () => {
    await restoreUserArchive('{not valid json');
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rejects valid JSON that does not match the archive shape', async () => {
    const result = await restoreUserArchive(JSON.stringify({ hello: 'world' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/malformed/i);
  });

  it('does NOT call the transaction when the shape is wrong', async () => {
    await restoreUserArchive(JSON.stringify({ hello: 'world' }));
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an archive whose version is not ARCHIVE_VERSION', async () => {
    const wrongVersion = JSON.stringify({ ...sampleArchive, version: 99 });
    const result = await restoreUserArchive(wrongVersion);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/i);
  });

  it('does NOT call the transaction when the version mismatches', async () => {
    const wrongVersion = JSON.stringify({ ...sampleArchive, version: 99 });
    await restoreUserArchive(wrongVersion);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('restoreUserArchive — transaction behavior', () => {
  it('returns an error when the transaction throws (rollback path)', async () => {
    db.$transaction.mockRejectedValueOnce(new Error('fk constraint'));
    const result = await restoreUserArchive(sampleArchiveJson);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('fk constraint');
  });

  it('does NOT call user.delete (the user row is preserved)', async () => {
    await restoreUserArchive(sampleArchiveJson);
    expect(db.user.delete).not.toHaveBeenCalled();
    expect(db.user.deleteMany).not.toHaveBeenCalled();
  });

  it('does NOT touch session or otpCode tables (excluded from the archive)', async () => {
    await restoreUserArchive(sampleArchiveJson);
    expect(db.session.deleteMany).not.toHaveBeenCalled();
    expect(db.otpCode.deleteMany).not.toHaveBeenCalled();
  });

  it('wipes via top-level deleteMany only — child cascades handle the rest', async () => {
    await restoreUserArchive(sampleArchiveJson);
    expect(db.aiCallLog.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.aiPromptOverride.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.aiProviderConfig.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.vacancy.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.masterResume.deleteMany).toHaveBeenCalledTimes(1);
    // Child tables are not touched directly — they cascade.
    expect(db.workCompany.deleteMany).not.toHaveBeenCalled();
    expect(db.workRole.deleteMany).not.toHaveBeenCalled();
    expect(db.education.deleteMany).not.toHaveBeenCalled();
    expect(db.application.deleteMany).not.toHaveBeenCalled();
    expect(db.resumeDraft.deleteMany).not.toHaveBeenCalled();
  });
});
