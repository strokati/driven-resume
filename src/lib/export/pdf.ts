import { storeRenderData } from './render-store';
import { sanitizeCoverLetterHtml } from './sanitize-html';
import type { ResumeData } from '@/lib/templates/types';

// Chromium still needs --no-sandbox inside Docker (no userns by default).
// Hardening below compensates: DOMPurify strips attacker-controlled HTML
// before render and the additional flags reduce the attack surface of the
// browser instance itself.
const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-features=AutofillServerCommunication,SiteIsolationExtensions',
  '--disable-extensions',
  '--disable-plugins',
  '--disable-default-apps',
  '--disable-popup-blocking',
  '--disable-translate',
  '--disable-sync',
  '--no-first-run',
  '--disable-gpu',
];
const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

async function getBrowser() {
  const puppeteer = await import('puppeteer');
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  return puppeteer.launch({
    headless: true,
    args: LAUNCH_ARGS,
    ...(executablePath ? { executablePath } : {}),
  });
}

export { getBrowser };

async function urlToPdf(url: string): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForNetworkIdle({ timeout: 10_000 });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function renderToPdf(data: ResumeData, templateId: string): Promise<Buffer> {
  const token = storeRenderData(data, templateId);
  return urlToPdf(`${BASE_URL}/export-preview/${token}`);
}

export async function renderResumeWithCoverLetterPdf(
  data: ResumeData,
  templateId: string,
  coverLetterHtml: string
): Promise<Buffer> {
  const safeHtml = sanitizeCoverLetterHtml(coverLetterHtml);
  const token = storeRenderData(data, templateId, safeHtml);
  return urlToPdf(`${BASE_URL}/export-preview/${token}`);
}

export async function renderCoverLetterOnlyPdf(htmlContent: string): Promise<Buffer> {
  const safeHtml = sanitizeCoverLetterHtml(htmlContent);
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { margin: 0; size: A4; }
  body { margin: 0; padding: 0.5in; font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; }
  p { margin-bottom: 8pt; }
</style>
</head>
<body>${safeHtml}</body>
</html>`;

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
