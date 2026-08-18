import { db } from '@/lib/db/client';

// All helpers are scoped by userId so a bare applicationId/draft id can never
// read another user's drafts, even if a future caller forgets a pre-check.

export async function getResumeDrafts(userId: string, applicationId: string) {
  return db.resumeDraft.findMany({
    where: { applicationId, application: { vacancy: { userId } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActiveResumeDraft(userId: string, applicationId: string) {
  const owned = { applicationId, application: { vacancy: { userId } } };
  const draft = await db.resumeDraft.findFirst({
    where: { ...owned, isActive: true },
  });
  if (draft) return draft;
  // Fall back to most recent
  return db.resumeDraft.findFirst({
    where: owned,
    orderBy: { createdAt: 'desc' },
  });
}
