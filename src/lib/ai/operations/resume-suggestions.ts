import { streamText } from 'ai';
import { getProviderForUser } from '@/lib/ai/providers';
import { resolvePrompt } from '@/lib/ai/prompts/defaults';
import { languageLabel } from '@/lib/utils/language';
import { summarizeMasterResume } from '@/lib/ai/prompts/analyze-vacancy';
import { getFullMasterResume } from '@/server/queries/master-resume';
import { db } from '@/lib/db/client';

export async function getResumeSuggestions(
  userId: string,
  applicationId: string,
  providerId: string
) {
  const startTime = Date.now();

  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: { vacancy: true, masterResume: { select: { language: true } } },
  });

  if (!application || !application.vacancy) {
    throw new Error('Application or vacancy not found.');
  }

  if (!application.vacancy.rawText) {
    throw new Error('No job posting text to analyze.');
  }

  const language = application.masterResume?.language ?? 'en';
  const fullResume = await getFullMasterResume(userId, application.masterResumeId);

  const workItems = (fullResume.workCompanies ?? []).flatMap((c) =>
    c.roles.map((r) => ({
      companyId: c.id,
      companyName: c.name,
      roleId: r.id,
      roleTitle: r.title,
      responsibilities: (r.responsibilities as string[] | null) ?? undefined,
      achievements: (r.achievements as string[] | null) ?? undefined,
    }))
  );

  const skillItems = (fullResume.skills ?? []).map((s) => ({
    skillId: s.id,
    name: s.name,
    category: s.category,
  }));

  const projectItems = (fullResume.projects ?? []).map((p) => ({
    projectId: p.id,
    name: p.name,
    description: p.description,
    technologies: (p.technologies as string[] | null) ?? undefined,
  }));

  const resumeSummary = summarizeMasterResume(
    fullResume as unknown as Parameters<typeof summarizeMasterResume>[0]
  );

  const workSection = workItems.length
    ? `## Work Experience (with IDs)\n${workItems
        .map(
          (w) =>
            `- Company: "${w.companyName}" (companyId: "${w.companyId}") | Role: "${w.roleTitle}" (roleId: "${w.roleId}")${w.responsibilities?.length ? `\n  Responsibilities: ${w.responsibilities.join('; ')}` : ''}${w.achievements?.length ? `\n  Achievements: ${w.achievements.join('; ')}` : ''}`
        )
        .join('\n')}`
    : '## Work Experience\nNo work experience entries.';

  const skillsSection = skillItems.length
    ? `## Skills (with IDs)\n${skillItems
        .map(
          (s) => `- "${s.name}" (skillId: "${s.skillId}")${s.category ? ` [${s.category}]` : ''}`
        )
        .join('\n')}`
    : '## Skills\nNo skills listed.';

  const projectsSection = projectItems.length
    ? `## Projects (with IDs)\n${projectItems
        .map(
          (p) =>
            `- "${p.name}" (projectId: "${p.projectId}")${p.description ? `: ${p.description}` : ''}${p.technologies?.length ? ` [${p.technologies.join(', ')}]` : ''}`
        )
        .join('\n')}`
    : '## Projects\nNo projects listed.';

  const analysisSection = application.vacancy.aiAnalysis
    ? `## Vacancy AI Analysis\n${JSON.stringify(application.vacancy.aiAnalysis, null, 2)}`
    : '';

  const langLabel = languageLabel(language);

  const system = await resolvePrompt(
    'resume-suggestions.system',
    { languageLabel: langLabel },
    userId
  );
  const prompt = await resolvePrompt(
    'resume-suggestions.user',
    {
      vacancyText: application.vacancy.rawText,
      analysisSection,
      masterResumeSummary: resumeSummary,
      workSection,
      skillsSection,
      projectsSection,
    },
    userId
  );

  const { model, modelName } = await getProviderForUser(userId, providerId);

  const result = streamText({
    model,
    system,
    prompt,
    // Without an explicit limit the provider default (4096) silently
    // truncates the suggestions JSON mid-string for large resumes —
    // surfaced to users as "Could not parse suggestions response".
    maxOutputTokens: 8192,
    onFinish: async (event) => {
      const durationMs = Date.now() - startTime;
      const usage = event.totalUsage;
      try {
        await db.aiCallLog.create({
          data: {
            userId,
            operation: 'resume-suggestions',
            providerId,
            model: modelName,
            applicationId,
            tokensIn: usage.inputTokens ?? null,
            tokensOut: usage.outputTokens ?? null,
            durationMs,
            error:
              event.finishReason === 'length'
                ? 'Output truncated: token limit reached before JSON completed.'
                : null,
          },
        });

        if (event.finishReason === 'length') {
          console.error(
            `resume-suggestions output truncated at ${usage.outputTokens} tokens (applicationId=${applicationId})`
          );
          return;
        }

        const text = event.text;
        if (text) {
          try {
            const json = JSON.parse(text);
            await db.application.update({
              where: { id: applicationId },
              data: { aiSuggestions: json },
            });
          } catch {
            await db.application.update({
              where: { id: applicationId },
              data: { aiSuggestions: { raw: text } },
            });
          }
        }
      } catch (logErr) {
        console.error('Failed to log AI call:', logErr);
      }
    },
    onError: async (err) => {
      const durationMs = Date.now() - startTime;
      try {
        await db.aiCallLog.create({
          data: {
            userId,
            operation: 'resume-suggestions',
            providerId,
            model: modelName,
            applicationId,
            durationMs,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        });
      } catch (logErr) {
        console.error('Failed to log AI error:', logErr);
      }
    },
  });

  return result;
}
