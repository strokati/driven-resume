import { streamText } from 'ai';
import { getProviderForUser } from '@/lib/ai/providers';
import { resumeContentToText } from '@/lib/ai/prompts/ats-check';
import { resolvePrompt } from '@/lib/ai/prompts/defaults';
import { languageLabel } from '@/lib/utils/language';
import { db } from '@/lib/db/client';

export async function runAtsCheck(userId: string, resumeDraftId: string, providerId: string) {
  const startTime = Date.now();

  const draft = await db.resumeDraft.findUnique({
    where: { id: resumeDraftId },
    include: {
      application: { include: { vacancy: true, masterResume: { select: { language: true } } } },
    },
  });

  if (!draft || !draft.application.vacancy) {
    throw new Error('Resume draft or vacancy not found.');
  }

  if (!draft.application.vacancy.rawText) {
    throw new Error('No job posting text available for ATS check.');
  }

  const language = draft.application.masterResume?.language ?? 'en';
  const resumeText = resumeContentToText(draft.content);
  const vacancyText = draft.application.vacancy.rawText;

  const { model, modelName } = await getProviderForUser(userId, providerId);

  const system = await resolvePrompt(
    'ats-check.system',
    { languageLabel: languageLabel(language) },
    userId
  );
  const prompt = await resolvePrompt('ats-check.user', { resumeText, vacancyText }, userId);

  const result = streamText({
    model,
    system,
    prompt,
    // Raise above the 4096 provider default — the ATS report JSON
    // (scores + recommendations + keyword coverage) can exceed it.
    maxOutputTokens: 8192,
    onFinish: async (event) => {
      const durationMs = Date.now() - startTime;
      const usage = event.totalUsage;

      try {
        await db.aiCallLog.create({
          data: {
            userId,
            operation: 'ats-check',
            providerId,
            model: modelName,
            applicationId: draft.applicationId,
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
            `ats-check output truncated at ${usage.outputTokens} tokens (draftId=${resumeDraftId})`
          );
          return;
        }

        const text = event.text;
        if (text) {
          try {
            const json = JSON.parse(text);
            await db.resumeDraft.update({
              where: { id: resumeDraftId },
              data: { atsScore: json },
            });
          } catch {
            await db.resumeDraft.update({
              where: { id: resumeDraftId },
              data: { atsScore: { raw: text } },
            });
          }
        }
      } catch (logErr) {
        console.error('Failed to log ATS check:', logErr);
      }
    },
    onError: async (err) => {
      const durationMs = Date.now() - startTime;
      try {
        await db.aiCallLog.create({
          data: {
            userId,
            operation: 'ats-check',
            providerId,
            model: modelName,
            applicationId: draft.applicationId,
            durationMs,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        });
      } catch (logErr) {
        console.error('Failed to log ATS error:', logErr);
      }
    },
  });

  return result;
}
