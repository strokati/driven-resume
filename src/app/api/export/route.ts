import { auth } from '@/lib/auth/config';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { db } from '@/lib/db/client';
import {
  renderToPdf,
  renderResumeWithCoverLetterPdf,
  renderCoverLetterOnlyPdf,
} from '@/lib/export/pdf';
import { renderToDocx } from '@/lib/export/docx';
import { convertDraftToResumeData } from '@/lib/templates/convert-draft';
import type { ResumeDraftContent } from '@/types/resume-draft';
import { NextRequest } from 'next/server';

function bufferResponse(buffer: Buffer, contentType: string, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
  } catch {
    return new Response('Forbidden', { status: 403 });
  }
  const session = await auth();
  if (!session && process.env.AUTH_MODE === 'email_otp') {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = session?.user?.id ?? 'local-user';

  let body: {
    resumeDraftId?: string;
    coverLetterDraftId?: string;
    format?: string;
    includeCoverLetter?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { resumeDraftId, coverLetterDraftId, format, includeCoverLetter } = body;

  if (!format || (format !== 'pdf' && format !== 'docx')) {
    return new Response('Invalid format. Use "pdf" or "docx".', { status: 400 });
  }

  // Cover-letter-only export
  if (coverLetterDraftId && !resumeDraftId) {
    return handleCoverLetterExport(coverLetterDraftId, userId);
  }

  // Resume export
  if (!resumeDraftId) {
    return new Response('Missing resumeDraftId or coverLetterDraftId', { status: 400 });
  }

  return handleResumeExport(resumeDraftId, format, includeCoverLetter, userId);
}

async function handleCoverLetterExport(coverLetterDraftId: string, userId: string) {
  const draft = await db.coverLetterDraft.findUnique({
    where: { id: coverLetterDraftId },
    include: { application: { include: { vacancy: true } } },
  });

  if (!draft || draft.application.vacancy?.userId !== userId) {
    return new Response('Not found', { status: 404 });
  }

  if (!draft.content) {
    return new Response('Cover letter has no content', { status: 400 });
  }

  try {
    const pdfBuffer = await renderCoverLetterOnlyPdf(draft.content);

    await db.coverLetterDraft.update({
      where: { id: coverLetterDraftId },
      data: { status: 'exported' },
    });

    const safeName = [
      draft.application.vacancy?.companyName ?? 'cover-letter',
      draft.application.vacancy?.jobTitle ?? '',
    ]
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    return bufferResponse(pdfBuffer, 'application/pdf', `cover-letter-${safeName}.pdf`);
  } catch (err) {
    console.error('Cover letter export failed:', err);
    return new Response('Export failed', { status: 500 });
  }
}

async function handleResumeExport(
  resumeDraftId: string,
  format: string,
  includeCoverLetter: boolean | undefined,
  userId: string
) {
  const draft = await db.resumeDraft.findUnique({
    where: { id: resumeDraftId },
    include: {
      application: { include: { vacancy: true, coverLetterDrafts: { where: { isActive: true } } } },
    },
  });

  if (!draft || draft.application.vacancy?.userId !== userId) {
    return new Response('Not found', { status: 404 });
  }

  if (!draft.content) {
    return new Response('Draft has no content', { status: 400 });
  }

  const resumeData = convertDraftToResumeData(draft.content as unknown as ResumeDraftContent);
  const safeName = [
    draft.application.vacancy?.companyName ?? 'resume',
    draft.application.vacancy?.jobTitle ?? 'draft',
  ]
    .join('-')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  try {
    if (format === 'pdf') {
      let pdfBuffer: Buffer;

      if (includeCoverLetter) {
        const coverDraft = draft.application.coverLetterDrafts[0];
        pdfBuffer = await renderResumeWithCoverLetterPdf(
          resumeData,
          draft.templateId,
          coverDraft?.content ?? ''
        );
      } else {
        pdfBuffer = await renderToPdf(resumeData, draft.templateId);
      }

      await db.resumeDraft.update({
        where: { id: resumeDraftId },
        data: { status: 'exported' },
      });

      return bufferResponse(pdfBuffer, 'application/pdf', `resume-${safeName}.pdf`);
    }

    // DOCX
    const docxBuffer = await renderToDocx(resumeData);

    await db.resumeDraft.update({
      where: { id: resumeDraftId },
      data: { status: 'exported' },
    });

    return bufferResponse(
      docxBuffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      `resume-${safeName}.docx`
    );
  } catch (err) {
    console.error('Export failed:', err);
    return new Response('Export failed', { status: 500 });
  }
}
