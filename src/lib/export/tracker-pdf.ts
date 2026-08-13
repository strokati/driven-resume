import { getBrowser } from './pdf';
import { TRACKER_COLUMNS } from './tracker-columns';
import type { TrackerExportRow } from '@/server/queries/tracker';

export async function renderTrackerPdf(rows: TrackerExportRow[]): Promise<Buffer> {
  const head = TRACKER_COLUMNS.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const body = rows
    .map(
      (r) => `<tr>${TRACKER_COLUMNS.map((c) => `<td>${cellHtml(c.format(r))}</td>`).join('')}</tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10pt; color: #1a1a1a; }
  h1 { font-size: 16pt; margin: 0 0 12pt; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th, td { border: 1px solid #d4d4d4; padding: 6pt 8pt; text-align: left; vertical-align: top; word-wrap: break-word; }
  th { background: #f4f4f5; font-weight: 600; }
  tr:nth-child(even) td { background: #fafafa; }
  th:nth-last-child(-n+2), td:nth-last-child(-n+2) { width: 18%; }
</style></head>
<body>
  <h1>Application Tracker</h1>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

function cellHtml(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br />');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
