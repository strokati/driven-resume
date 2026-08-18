import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getApplicationById } from '@/server/queries/applications';
import { getResumeDrafts, getActiveResumeDraft } from '@/server/queries/resume-drafts';
import { getAiProviderConfigs } from '@/server/queries/settings';
import { ResumeEditorView } from './_components/ResumeEditorView';
import { db } from '@/lib/db/client';
import { getFullMasterResume } from '@/server/queries/master-resume';

export const dynamic = 'force-dynamic';

async function buildInitialContent(userId: string, masterResumeId: string | null) {
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

export default async function ResumeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session && process.env.AUTH_MODE === 'email_otp') redirect('/login');
  const userId = session?.user?.id ?? 'local-user';

  const { id: applicationId } = await params;
  const application = await getApplicationById(applicationId, userId);
  if (!application) notFound();

  const [drafts, aiConfigs] = await Promise.all([
    getResumeDrafts(userId, applicationId),
    getAiProviderConfigs(userId),
  ]);

  let activeDraft = await getActiveResumeDraft(userId, applicationId);
  if (!activeDraft && drafts.length === 0) {
    const content = await buildInitialContent(userId, application.masterResumeId ?? null);
    activeDraft = await db.resumeDraft.create({
      data: {
        applicationId,
        name: 'Draft 1',
        content: JSON.parse(JSON.stringify(content)),
      },
    });
  }

  return (
    <ResumeEditorView
      application={application}
      drafts={drafts}
      activeDraft={activeDraft}
      aiConfigs={aiConfigs}
    />
  );
}
