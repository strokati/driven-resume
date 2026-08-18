import { db } from '@/lib/db/client';

// All helpers are scoped by userId so a bare applicationId/draft id can never
// read another user's drafts, even if a future caller forgets a pre-check.

export async function getCoverLetterDrafts(userId: string, applicationId: string) {
  return db.coverLetterDraft.findMany({
    where: { applicationId, application: { vacancy: { userId } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getActiveCoverLetterDraft(userId: string, applicationId: string) {
  const owned = { applicationId, application: { vacancy: { userId } } };
  const draft = await db.coverLetterDraft.findFirst({
    where: { ...owned, isActive: true },
  });
  if (draft) return draft;
  return db.coverLetterDraft.findFirst({
    where: owned,
    orderBy: { createdAt: 'desc' },
  });
}
