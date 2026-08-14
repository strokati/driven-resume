import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { TRACKER_COLUMNS } from './tracker-columns';
import type { TrackerExportRow } from '@/server/queries/tracker';

export async function renderTrackerDocx(rows: TrackerExportRow[]): Promise<Buffer> {
  const headerRow = new TableRow({
    tableHeader: true,
    children: TRACKER_COLUMNS.map(
      (c) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: c.header, bold: true })] })],
          shading: { fill: 'F4F4F5' },
        })
    ),
  });

  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: TRACKER_COLUMNS.map((c) => {
          const text = c.format(r);
          const paragraphs =
            text.length === 0
              ? [new Paragraph('')]
              : text.split(/\n+/).map((line) => new Paragraph(line));
          return new TableCell({ children: paragraphs });
        }),
      })
  );

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });

  const title = new Paragraph({
    children: [new TextRun({ text: 'Application Tracker', bold: true, size: 32 })],
    heading: HeadingLevel.TITLE,
    spacing: { after: 200 },
  });

  const doc = new Document({
    sections: [{ children: [title, table] }],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}
