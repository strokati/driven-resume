import { db } from '@/lib/db/client';
import type { ApplicationWithVacancy, ApplicationDetail } from '@/types/applications';

export async function getApplications(userId: string): Promise<ApplicationWithVacancy[]> {
  return db.application.findMany({
    where: { vacancy: { userId } },
    include: {
      vacancy: true,
      masterResume: { select: { id: true, name: true, language: true } },
      _count: {
        select: {
          resumeDrafts: true,
          coverLetterDrafts: true,
        },
      },
    },
    orderBy: { dateSaved: 'desc' },
  });
}

export async function getApplicationById(
  id: string,
  userId: string
): Promise<ApplicationDetail | null> {
  return db.application.findFirst({
    where: { id, vacancy: { userId } },
    include: {
      vacancy: true,
      masterResume: { select: { id: true, name: true, language: true } },
      resumeDrafts: { orderBy: { createdAt: 'desc' } },
      coverLetterDrafts: { orderBy: { createdAt: 'desc' } },
      notes: { orderBy: { createdAt: 'desc' } },
      contact: true,
    },
  });
}
