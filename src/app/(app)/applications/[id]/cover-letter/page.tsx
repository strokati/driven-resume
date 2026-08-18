import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getApplicationById } from '@/server/queries/applications';
import { getCoverLetterDrafts, getActiveCoverLetterDraft } from '@/server/queries/cover-letters';
import { getAiProviderConfigs } from '@/server/queries/settings';
import { CoverLetterEditorView } from './_components/CoverLetterEditorView';
import { db } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function CoverLetterEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session && process.env.AUTH_MODE === 'email_otp') redirect('/login');
  const userId = session?.user?.id ?? 'local-user';

  const { id: applicationId } = await params;
  const application = await getApplicationById(applicationId, userId);
  if (!application) notFound();

  const [drafts, aiConfigs] = await Promise.all([
    getCoverLetterDrafts(userId, applicationId),
    getAiProviderConfigs(userId),
  ]);

  let activeDraft = await getActiveCoverLetterDraft(userId, applicationId);
  if (!activeDraft && drafts.length === 0) {
    activeDraft = await db.coverLetterDraft.create({
      data: {
        applicationId,
        name: 'Draft 1',
        tone: 'professional',
      },
    });
  }

  return (
    <CoverLetterEditorView
      application={application}
      drafts={drafts}
      activeDraft={activeDraft}
      aiConfigs={aiConfigs}
    />
  );
}
