import { db } from '@/lib/db/client';
import { serializeDates } from '@/lib/export/serialize';
import { ARCHIVE_VERSION, type UserArchive } from '@/lib/validations/data-export';
import pkg from '../../../package.json';

/**
 * Gather every user-owned row into a nested archive structure. Children ride
 * along under their parents so the resulting JSON file is human-readable and
 * diffable.
 *
 * Session/OtpCode/_prisma_migrations are intentionally excluded — short-lived
 * or DB-level concerns that don't belong in a portable backup.
 */
export async function buildUserArchive(userId: string): Promise<UserArchive> {
  const [
    user,
    masterResumes,
    vacancies,
    applications,
    aiProviderConfigs,
    aiCallLogs,
    aiPromptOverrides,
  ] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    db.masterResume.findMany({
      where: { userId },
      include: {
        workCompanies: {
          orderBy: { order: 'asc' },
          include: {
            roles: {
              orderBy: { order: 'asc' },
              include: { projects: { orderBy: { order: 'asc' } } },
            },
          },
        },
        educations: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        certifications: { orderBy: { order: 'asc' } },
        awards: { orderBy: { order: 'asc' } },
        projects: { orderBy: { order: 'asc' } },
        volunteeringRoles: { orderBy: { order: 'asc' } },
        publications: { orderBy: { order: 'asc' } },
      },
    }),
    db.vacancy.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    db.application.findMany({
      where: { vacancy: { userId } },
      include: {
        resumeDrafts: { orderBy: { createdAt: 'asc' } },
        coverLetterDrafts: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
        contact: true,
      },
      orderBy: { dateSaved: 'desc' },
    }),
    db.aiProviderConfig.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    db.aiCallLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    db.aiPromptOverride.findMany({ where: { userId }, orderBy: { promptKey: 'asc' } }),
  ]);

  return {
    version: ARCHIVE_VERSION,
    appVersion: pkg.version,
    createdAt: new Date().toISOString(),
    userId,
    user: serializeDates(user),
    masterResumes: masterResumes.map(serializeDates),
    vacancies: vacancies.map(serializeDates),
    applications: applications.map(serializeDates),
    aiProviderConfigs: aiProviderConfigs.map(serializeDates),
    aiCallLogs: aiCallLogs.map(serializeDates),
    aiPromptOverrides: aiPromptOverrides.map(serializeDates),
  } as unknown as UserArchive;
}
