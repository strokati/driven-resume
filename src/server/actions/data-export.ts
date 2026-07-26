'use server';

import { redirect } from 'next/navigation';
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { Prisma } from '@/generated/prisma/client';
import { buildUserArchive } from '@/server/queries/data-export';
import {
  ARCHIVE_VERSION,
  UserArchiveSchema,
  type UserArchive,
} from '@/lib/validations/data-export';

type TransactionClient = Prisma.TransactionClient;

async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session && process.env.AUTH_MODE === 'email_otp') redirect('/login');
  return session?.user?.id ?? 'local-user';
}

// =============================================================================
// Export
// =============================================================================

export async function downloadUserArchive(): Promise<{ filename: string; json: string }> {
  const userId = await requireAuth();
  const archive = await buildUserArchive(userId);
  const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return {
    filename: `reeesume-backup-${ts}.json`,
    json: JSON.stringify(archive, null, 2),
  };
}

// =============================================================================
// Restore
// =============================================================================

type RestoreResult = { ok: true; summary: string } | { ok: false; error: string };

export async function restoreUserArchive(jsonString: string): Promise<RestoreResult> {
  const userId = await requireAuth();

  // Pre-parse guard so the 2mb server-action body cap is the only safety net
  // we need; even if Next.js lets a larger payload through, restore can't
  // allocate unbounded JSON parse work on attacker input.
  if (jsonString.length > 1_500_000) {
    return {
      ok: false,
      error: 'Archive is too large (>1.5 MB). Export and restore a smaller subset.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }

  const parsedSchema = UserArchiveSchema.safeParse(parsed);
  if (!parsedSchema.success) {
    const firstIssue = parsedSchema.error.issues[0];
    return {
      ok: false,
      error: `Archive is malformed: ${firstIssue?.path.join('.') ?? 'root'} — ${firstIssue?.message}`,
    };
  }
  const archive = parsedSchema.data;
  if (archive.version !== ARCHIVE_VERSION) {
    return {
      ok: false,
      error: `Archive version ${archive.version} is not supported (expected ${ARCHIVE_VERSION}).`,
    };
  }

  await writePreRestoreSnapshot(userId).catch(() => {
    /* best-effort; directory may not be writable */
  });

  try {
    await db.$transaction(async (tx) => {
      await wipeUserData(tx, userId);
      await insertFromArchive(tx, userId, archive);
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown restore error.' };
  }

  const summary =
    `Restored ${archive.masterResumes.length} master resume(s), ` +
    `${archive.applications.length} application(s), ` +
    `${archive.aiProviderConfigs.length} AI provider config(s).`;
  return { ok: true, summary };
}

// =============================================================================
// Internals
// =============================================================================

/**
 * Best-effort snapshot of the current user's archive before a destructive
 * restore. Writes to `process.env.BACKUP_DIR` or `./backups`. Failures are
 * swallowed — the transaction itself is the primary safety net.
 */
async function writePreRestoreSnapshot(userId: string): Promise<void> {
  const dir = process.env.BACKUP_DIR ?? path.resolve(process.cwd(), 'backups');
  const archive = await buildUserArchive(userId);
  const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const filename = `pre-restore-${ts}.json`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), JSON.stringify(archive, null, 2), 'utf8');

  // Retention: keep only the latest MAX_SNAPSHOTS pre-restore files. Cleanup
  // is best-effort and never blocks the restore.
  await pruneSnapshots(dir, MAX_SNAPSHOTS).catch(() => {
    /* best-effort */
  });
}

const MAX_SNAPSHOTS = 5;

async function pruneSnapshots(dir: string, keep: number): Promise<void> {
  const entries = await readdir(dir);
  const snapshots = entries
    .filter((name) => name.startsWith('pre-restore-') && name.endsWith('.json'))
    .map((name) => path.join(dir, name));
  if (snapshots.length <= keep) return;

  const stamped = await Promise.all(
    snapshots.map(async (file) => {
      const { mtime } = await stat(file);
      return { file, mtime };
    })
  );
  stamped.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  for (const { file } of stamped.slice(keep)) {
    await unlink(file).catch(() => {});
  }
}

/**
 * Wipe the user's data. Foreign-key cascades handle children — we only need to
 * delete top-level parents. The `User` row is intentionally preserved so the
 * live session in self-hosted mode stays valid.
 */
async function wipeUserData(tx: TransactionClient, userId: string): Promise<void> {
  await tx.aiCallLog.deleteMany({ where: { userId } });
  await tx.aiPromptOverride.deleteMany({ where: { userId } });
  await tx.aiProviderConfig.deleteMany({ where: { userId } });
  // Deleting vacancies cascades to applications → drafts → notes.
  await tx.vacancy.deleteMany({ where: { userId } });
  // Deleting master resumes cascades to all section tables.
  await tx.masterResume.deleteMany({ where: { userId } });
}

/**
 * Insert the archive contents, rebinding every row to `userId`. Original IDs
 * are preserved so FK relationships inside the archive stay intact.
 *
 * Insert order respects dependencies: master resumes (and their nested
 * children) before applications (which optionally reference a masterResumeId),
 * vacancies before applications (which reference a vacancyId).
 */
async function insertFromArchive(
  tx: TransactionClient,
  userId: string,
  archive: UserArchive
): Promise<void> {
  // 1. Master resumes — children ride along via nested create.
  for (const masterResume of archive.masterResumes) {
    await tx.masterResume.create({
      data: buildMasterResumeCreate(masterResume as unknown as LooseRecord, userId) as never,
    });
  }

  // 2. Vacancies.
  for (const vacancy of archive.vacancies) {
    await tx.vacancy.create({ data: { ...vacancy, userId } as never });
  }

  // 3. Applications — include nested drafts and notes via nested create.
  for (const application of archive.applications) {
    await tx.application.create({
      data: buildApplicationCreate(application as unknown as LooseRecord) as never,
    });
  }

  // 4. AI provider configs, call logs, prompt overrides — flat tables.
  if (archive.aiProviderConfigs.length > 0) {
    await tx.aiProviderConfig.createMany({
      data: archive.aiProviderConfigs.map((fields) => ({ ...fields, userId })) as never,
    });
  }
  if (archive.aiCallLogs.length > 0) {
    await tx.aiCallLog.createMany({
      data: archive.aiCallLogs.map((fields) => ({ ...fields, userId })) as never,
    });
  }
  if (archive.aiPromptOverrides.length > 0) {
    await tx.aiPromptOverride.createMany({
      data: archive.aiPromptOverrides.map((fields) => ({ ...fields, userId })) as never,
    });
  }
}

type LooseRecord = Record<string, unknown>;

function buildMasterResumeCreate(input: LooseRecord, userId: string): LooseRecord {
  const {
    workCompanies = [],
    educations = [],
    skills = [],
    certifications = [],
    awards = [],
    projects = [],
    volunteeringRoles = [],
    publications = [],
    applications: _apps,
    user: _user,
    ...scalarFields
  } = input;
  void _apps;
  void _user;

  return {
    ...scalarFields,
    userId,
    workCompanies: {
      create: (workCompanies as LooseRecord[]).map((company) => {
        const { roles = [], resumeId: _companyResumeId, ...companyScalars } = company;
        void _companyResumeId;
        return {
          ...companyScalars,
          roles: {
            create: (roles as LooseRecord[]).map((role) => {
              const {
                projects: roleProjects = [],
                companyId: _roleCompanyId,
                ...roleScalars
              } = role;
              void _roleCompanyId;
              return {
                ...roleScalars,
                projects: {
                  create: (roleProjects as LooseRecord[]).map((project) => {
                    const { roleId: _projectRoleId, ...projectScalars } = project;
                    void _projectRoleId;
                    return projectScalars;
                  }),
                },
              };
            }),
          },
        };
      }),
    },
    educations: {
      create: (educations as LooseRecord[]).map((e) => stripFk(e, 'resumeId')),
    },
    skills: {
      create: (skills as LooseRecord[]).map((s) => stripFk(s, 'resumeId')),
    },
    certifications: {
      create: (certifications as LooseRecord[]).map((c) => stripFk(c, 'resumeId')),
    },
    awards: {
      create: (awards as LooseRecord[]).map((a) => stripFk(a, 'resumeId')),
    },
    projects: {
      create: (projects as LooseRecord[]).map((p) => stripFk(p, 'resumeId')),
    },
    volunteeringRoles: {
      create: (volunteeringRoles as LooseRecord[]).map((v) => stripFk(v, 'resumeId')),
    },
    publications: {
      create: (publications as LooseRecord[]).map((p) => stripFk(p, 'resumeId')),
    },
  };
}

function buildApplicationCreate(input: LooseRecord): LooseRecord {
  const {
    resumeDrafts = [],
    coverLetterDrafts = [],
    notes = [],
    vacancy: _vacancy,
    masterResume: _masterResume,
    ...scalarFields
  } = input;
  void _vacancy;
  void _masterResume;

  return {
    ...scalarFields,
    resumeDrafts: {
      create: (resumeDrafts as LooseRecord[]).map((d) => stripFk(d, 'applicationId')),
    },
    coverLetterDrafts: {
      create: (coverLetterDrafts as LooseRecord[]).map((d) => stripFk(d, 'applicationId')),
    },
    notes: {
      create: (notes as LooseRecord[]).map((n) => stripFk(n, 'applicationId')),
    },
  };
}

/**
 * Strip a foreign-key field from a record before passing it to a nested
 * Prisma create. Prisma sets the FK automatically from the parent's id, so
 * including it in `data: { ...fields }` triggers an "Unknown argument" error.
 * Returns a shallow copy with the key removed.
 */
function stripFk(record: LooseRecord, key: string): LooseRecord {
  if (!(key in record)) return record;
  const { [key]: _dropped, ...rest } = record;
  void _dropped;
  return rest;
}
