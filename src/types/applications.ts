import type { Prisma } from '@/generated/prisma/client';

export type ApplicationWithVacancy = Prisma.ApplicationGetPayload<{
  include: {
    vacancy: true;
    masterResume: { select: { id: true; name: true; language: true } };
    _count: {
      select: {
        resumeDrafts: true;
        coverLetterDrafts: true;
      };
    };
  };
}>;

export type ApplicationDetail = Prisma.ApplicationGetPayload<{
  include: {
    vacancy: true;
    masterResume: { select: { id: true; name: true; language: true } };
    resumeDrafts: {
      orderBy: { createdAt: 'desc' };
    };
    coverLetterDrafts: {
      orderBy: { createdAt: 'desc' };
    };
    notes: {
      orderBy: { createdAt: 'desc' };
    };
    contact: true;
  };
}>;
