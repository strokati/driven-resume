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
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import {
  createApplication,
  updateApplicationStatus,
  updateExcitement,
} from '@/server/actions/applications';
import { revalidatePath } from 'next/cache';

describe('createApplication', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a Vacancy and Application, returns applicationId', async () => {
    db.masterResume.findFirst.mockResolvedValue({ id: 'resume-1' });
    db.vacancy.create.mockResolvedValue({ id: 'vac-1' });
    db.application.aggregate.mockResolvedValue({ _max: { serialNumber: 41 } });
    db.application.create.mockResolvedValue({ id: 'app-1' });

    const id = await createApplication({
      companyName: 'Acme',
      jobTitle: 'Engineer',
      masterResumeId: 'resume-1',
    });

    expect(id).toBe('app-1');
    expect(db.vacancy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyName: 'Acme', jobTitle: 'Engineer' }),
      })
    );
    expect(db.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ serialNumber: 42, userId: 'local-user' }),
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/applications');
  });

  it('rejects missing companyName', async () => {
    await expect(
      createApplication({ jobTitle: 'Engineer', masterResumeId: 'r1' } as any)
    ).rejects.toThrow();
  });
});

describe('updateApplicationStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates status to a valid value', async () => {
    db.application.findFirst.mockResolvedValue({ id: 'app-1' });
    db.application.update.mockResolvedValue({});
    await updateApplicationStatus('app-1', { status: 'applied' });
    expect(db.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app-1' },
        data: { status: 'applied' },
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/applications');
    expect(revalidatePath).toHaveBeenCalledWith('/tracker');
  });

  it('rejects an invalid status string', async () => {
    db.application.findFirst.mockResolvedValue({ id: 'app-1' });
    await expect(updateApplicationStatus('app-1', { status: 'invalid' })).rejects.toThrow();
    expect(db.application.update).not.toHaveBeenCalled();
  });

  it('throws when application does not belong to user (IDOR guard)', async () => {
    db.application.findFirst.mockResolvedValue(null);
    await expect(updateApplicationStatus('app-1', { status: 'applied' })).rejects.toThrow(
      'Not found.'
    );
    expect(db.application.update).not.toHaveBeenCalled();
  });
});

describe('updateExcitement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates excitement to a valid value', async () => {
    db.application.findFirst.mockResolvedValue({ id: 'app-1' });
    db.application.update.mockResolvedValue({});
    await updateExcitement('app-1', { excitement: 4 });
    expect(db.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { excitement: 4 } })
    );
  });

  it('rejects excitement out of range', async () => {
    db.application.findFirst.mockResolvedValue({ id: 'app-1' });
    await expect(updateExcitement('app-1', { excitement: 6 })).rejects.toThrow();
  });

  it('throws when application does not belong to user (IDOR guard)', async () => {
    db.application.findFirst.mockResolvedValue(null);
    await expect(updateExcitement('app-1', { excitement: 4 })).rejects.toThrow('Not found.');
    expect(db.application.update).not.toHaveBeenCalled();
  });
});
