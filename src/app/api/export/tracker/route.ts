import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/config';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { getTrackerExportData } from '@/server/queries/tracker';
import { renderTrackerXlsx } from '@/lib/export/tracker-xlsx';
import { renderTrackerPdf } from '@/lib/export/tracker-pdf';
import { renderTrackerDocx } from '@/lib/export/tracker-docx';

const VALID_FORMATS = new Set(['pdf', 'xlsx', 'docx']);

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function bufferResponse(buffer: Buffer, contentType: string, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 10);
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

  let body: { format?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const format = body.format;
  if (!format || !VALID_FORMATS.has(format)) {
    return new Response('Invalid format. Use "pdf", "xlsx", or "docx".', { status: 400 });
  }

  let rows;
  try {
    rows = await getTrackerExportData(userId);
  } catch (err) {
    console.error('Tracker export: failed to fetch rows', err);
    return new Response('Failed to load tracker data', { status: 500 });
  }

  try {
    const ts = timestamp();
    if (format === 'pdf') {
      const buf = await renderTrackerPdf(rows);
      return bufferResponse(buf, CONTENT_TYPES.pdf, `tracker-${ts}.pdf`);
    }
    if (format === 'xlsx') {
      const buf = await renderTrackerXlsx(rows);
      return bufferResponse(buf, CONTENT_TYPES.xlsx, `tracker-${ts}.xlsx`);
    }
    const buf = await renderTrackerDocx(rows);
    return bufferResponse(buf, CONTENT_TYPES.docx, `tracker-${ts}.docx`);
  } catch (err) {
    console.error('Tracker export: generator failed', err);
    return new Response('Export failed', { status: 500 });
  }
}
