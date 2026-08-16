import { db } from '@/lib/db/client';
import type { Prisma } from '@/generated/prisma/client';
import type { TrackerFilters } from '@/lib/validations/tracker';

export type TrackerRow = {
  id: string;
  serialNumber: number;
  jobTitle: string;
  companyName: string;
  salaryMin: number | null;
  salaryMax: number | null;
  proposedSalary: number | null;
  currency: string | null;
  location: string | null;
  locationType: string | null;
  status: string;
  dateSaved: Date;
  dateApplied: Date | null;
  interviewDate: Date | null;
  offerDate: Date | null;
  rejectedDate: Date | null;
  excitement: number | null;
  resumeStatus: 'ready' | 'draft' | 'none';
  resumeAtsScore: number | null;
  coverLetterStatus: 'ready' | 'draft' | 'none';
  coverLetterTone: string | null;
  vacancyId: string;
  sourceUrl: string | null;
  notes: { id: string; content: string; createdAt: Date; updatedAt: Date }[];
  contact: {
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
  } | null;
};

export type TrackerExportRow = {
  serialNumber: number;
  dateApplied: Date | null;
  companyName: string;
  jobTitle: string;
  location: string | null;
  locationType: string | null;
  status: string;
  interviewDate: Date | null;
  offerDate: Date | null;
  rejectedDate: Date | null;
  sourceUrl: string | null;
  notes: { content: string; createdAt: Date }[];
  contact: {
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
  } | null;
};

function docStatusRelation(
  relation: 'resumeDrafts' | 'coverLetterDrafts',
  statuses: ('ready' | 'draft' | 'none')[]
): Prisma.ApplicationWhereInput[] {
  return statuses.map((s) => {
    if (s === 'ready') {
      return { [relation]: { some: { isActive: true, status: { in: ['ready', 'exported'] } } } };
    }
    if (s === 'draft') {
      return { [relation]: { some: { isActive: true, status: 'draft' } } };
    }
    return { [relation]: { none: { isActive: true } } };
  });
}

export function buildTrackerWhere(userId: string, f: TrackerFilters): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = { userId };
  const vacancy: Prisma.VacancyWhereInput = {};

  if (f.search) {
    const q = { contains: f.search, mode: 'insensitive' as const };
    vacancy.OR = [{ companyName: q }, { jobTitle: q }];
  }
  if (f.locationType?.length) {
    vacancy.locationType = { in: f.locationType };
  }
  if (Object.keys(vacancy).length > 0) where.vacancy = vacancy;

  if (f.status?.length) where.status = { in: f.status };

  const excitement: Prisma.IntNullableFilter | undefined =
    f.excitementMin !== undefined || f.excitementMax !== undefined
      ? {
          ...(f.excitementMin !== undefined ? { gte: f.excitementMin } : {}),
          ...(f.excitementMax !== undefined ? { lte: f.excitementMax } : {}),
        }
      : undefined;
  if (excitement) where.excitement = excitement;

  const salaryOverlap: Prisma.ApplicationWhereInput = {};
  if (f.salaryFrom !== undefined) salaryOverlap.salaryMax = { gte: f.salaryFrom };
  if (f.salaryTo !== undefined) salaryOverlap.salaryMin = { lte: f.salaryTo };
  Object.assign(where, salaryOverlap);

  const dateSaved: Prisma.DateTimeFilter | undefined =
    f.savedFrom !== undefined || f.savedTo !== undefined
      ? {
          ...(f.savedFrom !== undefined ? { gte: new Date(`${f.savedFrom}T00:00:00`) } : {}),
          ...(f.savedTo !== undefined ? { lte: new Date(`${f.savedTo}T23:59:59.999`) } : {}),
        }
      : undefined;
  if (dateSaved) where.dateSaved = dateSaved;

  const and: Prisma.ApplicationWhereInput[] = [];
  if (f.resumeStatus?.length) {
    and.push({ OR: docStatusRelation('resumeDrafts', f.resumeStatus) });
  }
  if (f.coverLetterStatus?.length) {
    and.push({ OR: docStatusRelation('coverLetterDrafts', f.coverLetterStatus) });
  }
  if (f.hasNotes !== undefined) {
    and.push(f.hasNotes ? { notes: { some: {} } } : { notes: { none: {} } });
  }
  if (f.hasContact !== undefined) {
    and.push(f.hasContact ? { contact: { isNot: null } } : { contact: null });
  }
  if (and.length > 0) where.AND = and;

  return where;
}

function buildOrderBy(f: TrackerFilters): Prisma.ApplicationOrderByWithRelationInput[] {
  const dir = f.dir;
  const key = f.sort;
  const column = key === 'companyName' ? { vacancy: { companyName: dir } } : { [key]: dir };
  return [column, { serialNumber: dir }] as Prisma.ApplicationOrderByWithRelationInput[];
}

export type TrackerPage = {
  rows: TrackerRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const TRACKER_INCLUDE = {
  vacancy: {
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      location: true,
      locationType: true,
      sourceUrl: true,
      currency: true,
    },
  },
  resumeDrafts: {
    where: { isActive: true },
    select: { status: true, atsScore: true },
    take: 1,
  },
  coverLetterDrafts: {
    where: { isActive: true },
    select: { status: true, tone: true },
    take: 1,
  },
  notes: {
    select: { id: true, content: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' as const },
  },
  contact: {
    select: { name: true, role: true, email: true, phone: true, linkedinUrl: true },
  },
} satisfies Prisma.ApplicationInclude;

function mapTrackerRows(
  applications: Prisma.ApplicationGetPayload<{ include: typeof TRACKER_INCLUDE }>[]
): TrackerRow[] {
  return applications.map((app) => {
    const activeResume = app.resumeDrafts[0];
    const activeCover = app.coverLetterDrafts[0];

    let resumeStatus: TrackerRow['resumeStatus'] = 'none';
    if (activeResume) {
      resumeStatus =
        activeResume.status === 'ready' || activeResume.status === 'exported' ? 'ready' : 'draft';
    }

    let coverLetterStatus: TrackerRow['coverLetterStatus'] = 'none';
    if (activeCover) {
      coverLetterStatus =
        activeCover.status === 'ready' || activeCover.status === 'exported' ? 'ready' : 'draft';
    }

    const atsData = activeResume?.atsScore as { score?: number } | null;

    return {
      id: app.id,
      serialNumber: app.serialNumber,
      jobTitle: app.vacancy.jobTitle,
      companyName: app.vacancy.companyName,
      salaryMin: app.salaryMin,
      salaryMax: app.salaryMax,
      proposedSalary: app.proposedSalary,
      currency: app.vacancy.currency,
      location: app.vacancy.location,
      locationType: app.vacancy.locationType,
      status: app.status,
      dateSaved: app.dateSaved,
      dateApplied: app.dateApplied,
      interviewDate: app.interviewDate,
      offerDate: app.offerDate,
      rejectedDate: app.rejectedDate,
      excitement: app.excitement,
      resumeStatus,
      resumeAtsScore: atsData?.score ?? null,
      coverLetterStatus,
      coverLetterTone: activeCover?.tone ?? null,
      vacancyId: app.vacancy.id,
      sourceUrl: app.vacancy.sourceUrl,
      notes: app.notes,
      contact: app.contact,
    };
  });
}

export async function getTrackerPage(
  userId: string,
  filters: TrackerFilters
): Promise<TrackerPage> {
  const where = buildTrackerWhere(userId, filters);
  const [applications, total] = await db.$transaction([
    db.application.findMany({
      where,
      include: TRACKER_INCLUDE,
      orderBy: buildOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.application.count({ where }),
  ]);

  return {
    rows: mapTrackerRows(applications),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function getTrackerKanbanData(
  userId: string,
  filters: TrackerFilters
): Promise<TrackerRow[]> {
  const applications = await db.application.findMany({
    where: buildTrackerWhere(userId, filters),
    include: TRACKER_INCLUDE,
    orderBy: [{ status: 'asc' }, { dateSaved: 'desc' }],
    take: 300,
  });
  return mapTrackerRows(applications);
}

export async function getTrackerExportData(userId: string): Promise<TrackerExportRow[]> {
  const applications = await db.application.findMany({
    where: { userId },
    select: {
      serialNumber: true,
      dateApplied: true,
      status: true,
      interviewDate: true,
      offerDate: true,
      rejectedDate: true,
      vacancy: {
        select: {
          companyName: true,
          jobTitle: true,
          location: true,
          locationType: true,
          sourceUrl: true,
        },
      },
      notes: {
        select: { content: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      contact: {
        select: { name: true, role: true, email: true, phone: true, linkedinUrl: true },
      },
    },
    orderBy: { dateApplied: 'asc' },
  });

  return applications.map((app) => ({
    serialNumber: app.serialNumber,
    dateApplied: app.dateApplied,
    companyName: app.vacancy.companyName,
    jobTitle: app.vacancy.jobTitle,
    location: app.vacancy.location,
    locationType: app.vacancy.locationType,
    status: app.status,
    interviewDate: app.interviewDate,
    offerDate: app.offerDate,
    rejectedDate: app.rejectedDate,
    sourceUrl: app.vacancy.sourceUrl,
    notes: app.notes,
    contact: app.contact,
  }));
}
