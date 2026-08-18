'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { getFullMasterResume } from '@/server/queries/master-resume';
import { getResumeDrafts } from '@/server/queries/resume-drafts';
import type { ResumeDraftContent } from '@/types/resume-draft';
import { assertApplicationOwned, assertResumeDraftOwned } from './_ownership';

async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session && process.env.AUTH_MODE === 'email_otp') redirect('/login');
  return session?.user?.id ?? 'local-user';
}

async function buildInitialContent(
  userId: string,
  masterResumeId: string | null
): Promise<ResumeDraftContent> {
  const full = await getFullMasterResume(userId, masterResumeId);
  const contactInfo = (full as { contactInfo?: unknown }).contactInfo as Record<
    string,
    unknown
  > | null;

  return {
    contactInfo: contactInfo
      ? {
          name: (contactInfo.name as string) || undefined,
          email: (contactInfo.email as string) || undefined,
          phone: (contactInfo.phone as string) || undefined,
          location: (contactInfo.location as string) || undefined,
          linkedin: (contactInfo.linkedin as string) || undefined,
          github: (contactInfo.github as string) || undefined,
          website: (contactInfo.website as string) || undefined,
          photoUrl: (contactInfo.photoUrl as string) || undefined,
        }
      : undefined,
    targetTitle: full.targetTitle ?? undefined,
    summary: full.professionalSummary ?? undefined,
    workExperience: (full.workCompanies ?? []).flatMap((c) =>
      c.roles.map((r) => ({
        roleId: r.id,
        title: r.title,
        companyName: c.name,
        startDate: r.startDate ?? undefined,
        endDate: r.endDate ?? undefined,
        workArrangement: r.workArrangement ?? undefined,
        responsibilities: ((r.responsibilities as string[] | null) ?? []).map((t) => ({
          text: t,
          source: 'master' as const,
        })),
        achievements: ((r.achievements as string[] | null) ?? []).map((t) => ({
          text: t,
          source: 'master' as const,
        })),
        technologies: (r.technologies as string[] | null) ?? undefined,
        projects: r.projects.map((p) => ({
          name: p.name,
          startDate: p.startDate ?? undefined,
          endDate: p.endDate ?? undefined,
          description: p.description ?? undefined,
          contribution: p.contribution ?? undefined,
          responsibilities: ((p.responsibilities as string[] | null) ?? []).map((t) => ({
            text: t,
            source: 'master' as const,
          })),
          technologies: (p.technologies as string[] | null) ?? undefined,
          outcome: p.outcome ?? undefined,
          source: 'master' as const,
        })),
        source: 'master' as const,
      }))
    ),
    education: (full.educations ?? []).map((e) => ({
      educationId: e.id,
      institution: e.institution,
      degree: e.degree ?? undefined,
      field: e.field ?? undefined,
      location: e.location ?? undefined,
      startDate: e.startDate ?? undefined,
      endDate: e.endDate ?? undefined,
      gpa: e.gpa ?? undefined,
      honors: e.honors ?? undefined,
      activities: (e.activities as string[] | null) ?? undefined,
      source: 'master' as const,
    })),
    skills: (full.skills ?? []).map((s) => ({
      skillId: s.id,
      name: s.name,
      category: s.category ?? undefined,
      level: s.level ?? undefined,
      source: 'master' as const,
    })),
    certifications: (full.certifications ?? []).map((c) => ({
      certificationId: c.id,
      name: c.name,
      issuer: c.issuer ?? undefined,
      issueDate: c.issueDate ?? undefined,
      source: 'master' as const,
    })),
    awards: (full.awards ?? []).map((a) => ({
      awardId: a.id,
      title: a.title,
      issuer: a.issuer ?? undefined,
      date: a.date ?? undefined,
      description: a.description ?? undefined,
      source: 'master' as const,
    })),
    projects: (full.projects ?? []).map((p) => ({
      projectId: p.id,
      name: p.name,
      description: p.description ?? undefined,
      role: p.role ?? undefined,
      technologies: (p.technologies as string[] | null) ?? undefined,
      url: p.url ?? undefined,
      repoUrl: p.repoUrl ?? undefined,
      source: 'master' as const,
    })),
    volunteering: (full.volunteeringRoles ?? []).map((v) => ({
      volunteeringId: v.id,
      organization: v.organization,
      role: v.role ?? undefined,
      startDate: v.startDate ?? undefined,
      endDate: v.endDate ?? undefined,
      responsibilities: ((v.responsibilities as string[] | null) ?? []).map((t) => ({
        text: t,
        source: 'master' as const,
      })),
      source: 'master' as const,
    })),
    publications: (full.publications ?? []).map((p) => ({
      publicationId: p.id,
      title: p.title,
      authors: p.authors ?? undefined,
      publisher: p.publisher ?? undefined,
      date: p.date ?? undefined,
      url: p.url ?? undefined,
      source: 'master' as const,
    })),
  };
}

export async function createResumeDraft(applicationId: string, name: string): Promise<string> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, applicationId);

  const application = await db.application.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error('Application not found.');

  const content = await buildInitialContent(userId, application.masterResumeId);
  const count = await db.resumeDraft.count({ where: { applicationId } });

  const draft = await db.resumeDraft.create({
    data: {
      applicationId,
      name: name || `Draft ${count + 1}`,
      content: JSON.parse(JSON.stringify(content)),
    },
  });

  revalidatePath(`/applications/${applicationId}/resume`);
  return draft.id;
}

export async function updateResumeDraftContent(
  id: string,
  content: ResumeDraftContent
): Promise<void> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, id);
  try {
    await db.resumeDraft.update({
      where: { id },
      data: { content: JSON.parse(JSON.stringify(content)) },
    });
  } catch {
    throw new Error('Failed to update draft content.');
  }
}

export async function updateResumeDraftTemplate(id: string, templateId: string): Promise<void> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, id);
  try {
    await db.resumeDraft.update({ where: { id }, data: { templateId } });
  } catch {
    throw new Error('Failed to update template.');
  }
}

export async function renameResumeDraft(id: string, name: string): Promise<void> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, id);
  try {
    await db.resumeDraft.update({ where: { id }, data: { name } });
  } catch {
    throw new Error('Failed to rename draft.');
  }
}

export async function deleteResumeDraft(id: string): Promise<void> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, id);
  const draft = await db.resumeDraft.findUnique({ where: { id } });
  if (!draft) throw new Error('Draft not found.');

  const remaining = await db.resumeDraft.count({
    where: { applicationId: draft.applicationId, id: { not: id } },
  });

  await db.resumeDraft.delete({ where: { id } });

  // If we deleted the active draft, activate the most recent remaining one
  if (draft.isActive && remaining > 0) {
    const latest = await db.resumeDraft.findFirst({
      where: { applicationId: draft.applicationId, id: { not: id } },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      await db.resumeDraft.update({ where: { id: latest.id }, data: { isActive: true } });
    }
  }

  revalidatePath(`/applications/${draft.applicationId}/resume`);
}

export async function setActiveDraft(id: string, applicationId: string): Promise<void> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, applicationId);
  await assertResumeDraftOwned(userId, id);
  await db.$transaction([
    db.resumeDraft.updateMany({
      where: { applicationId },
      data: { isActive: false },
    }),
    db.resumeDraft.update({
      where: { id },
      data: { isActive: true },
    }),
  ]);
  revalidatePath(`/applications/${applicationId}/resume`);
}

export async function markDraftReady(id: string): Promise<void> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, id);
  try {
    await db.resumeDraft.update({
      where: { id },
      data: { status: 'ready' },
    });
  } catch {
    throw new Error('Failed to mark draft as ready.');
  }
  revalidatePath(`/applications`);
}

export async function revertDraftToDraft(id: string): Promise<void> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, id);
  try {
    await db.resumeDraft.update({
      where: { id },
      data: { status: 'draft' },
    });
  } catch {
    throw new Error('Failed to revert draft.');
  }
  revalidatePath(`/applications`);
}

export async function duplicateDraft(id: string): Promise<string> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, id);
  const draft = await db.resumeDraft.findUnique({ where: { id } });
  if (!draft) throw new Error('Draft not found.');

  const copy = await db.resumeDraft.create({
    data: {
      applicationId: draft.applicationId,
      name: `Copy of ${draft.name}`,
      content: JSON.parse(JSON.stringify(draft.content)),
      templateId: draft.templateId,
      isActive: false,
      status: 'draft',
    },
  });

  revalidatePath(`/applications/${draft.applicationId}/resume`);
  return copy.id;
}

export async function syncWorkExperienceFromMaster(draftId: string): Promise<ResumeDraftContent> {
  const userId = await requireAuth();
  await assertResumeDraftOwned(userId, draftId);

  const draft = await db.resumeDraft.findUnique({
    where: { id: draftId },
    include: { application: true },
  });
  if (!draft) throw new Error('Draft not found.');

  const full = await getFullMasterResume(userId, draft.application.masterResumeId);
  const freshWorkExperience = (full.workCompanies ?? []).flatMap((c) =>
    c.roles.map((r) => ({
      roleId: r.id,
      title: r.title,
      companyName: c.name,
      startDate: r.startDate ?? undefined,
      endDate: r.endDate ?? undefined,
      workArrangement: r.workArrangement ?? undefined,
      responsibilities: ((r.responsibilities as string[] | null) ?? []).map((t) => ({
        text: t,
        source: 'master' as const,
      })),
      achievements: ((r.achievements as string[] | null) ?? []).map((t) => ({
        text: t,
        source: 'master' as const,
      })),
      technologies: (r.technologies as string[] | null) ?? undefined,
      projects: r.projects.map((p) => ({
        name: p.name,
        startDate: p.startDate ?? undefined,
        endDate: p.endDate ?? undefined,
        description: p.description ?? undefined,
        contribution: p.contribution ?? undefined,
        responsibilities: ((p.responsibilities as string[] | null) ?? []).map((t) => ({
          text: t,
          source: 'master' as const,
        })),
        technologies: (p.technologies as string[] | null) ?? undefined,
        outcome: p.outcome ?? undefined,
        source: 'master' as const,
      })),
      source: 'master' as const,
    }))
  );

  const existing = draft.content as unknown as ResumeDraftContent;
  const updated: ResumeDraftContent = { ...existing, workExperience: freshWorkExperience };

  await db.resumeDraft.update({
    where: { id: draftId },
    data: { content: JSON.parse(JSON.stringify(updated)) },
  });

  revalidatePath(`/applications/${draft.applicationId}/resume`);
  return updated;
}

export async function fetchResumeDrafts(applicationId: string): ReturnType<typeof getResumeDrafts> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, applicationId);
  return getResumeDrafts(userId, applicationId);
}
