// Why exceljs and not xlsx (SheetJS):
// SheetJS Community Edition has shipped multiple prototype-pollution and
// ReDoS CVEs (CVE-2023-30533, CVE-2024-22363, etc.) and uses a non-standard
// Apache-2.0-style license with USE RESTRICTIONS. exceljs is MIT-licensed,
// actively maintained, and not on any current high/critical CVE list.
import ExcelJS from 'exceljs';
import { TRACKER_COLUMNS } from './tracker-columns';
import type { TrackerExportRow } from '@/server/queries/tracker';

export async function renderTrackerXlsx(rows: TrackerExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Reeesume';
  wb.created = new Date();
  const ws = wb.addWorksheet('Applications');

  ws.columns = TRACKER_COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.key === 'notes' || c.key === 'contact' ? 48 : 22,
  }));

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

  for (const row of rows) {
    const r = ws.addRow(row);
    TRACKER_COLUMNS.forEach((col, i) => {
      const cell = r.getCell(i + 1);
      cell.value = col.format(row);
      cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    });
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
