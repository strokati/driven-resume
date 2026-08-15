import { db } from '@/lib/db/client';

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

export async function getTrackerData(userId: string): Promise<TrackerRow[]> {
  const applications = await db.application.findMany({
    where: { userId },
    include: {
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
        orderBy: { createdAt: 'desc' },
      },
      contact: {
        select: { name: true, role: true, email: true, phone: true, linkedinUrl: true },
      },
    },
    orderBy: { dateSaved: 'desc' },
  });

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

export async function getTrackerExportData(userId: string): Promise<TrackerExportRow[]> {
  const applications = await db.application.findMany({
    where: { userId },
    select: {
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
