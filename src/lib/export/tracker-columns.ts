import type { TrackerExportRow } from '@/server/queries/tracker';

export type TrackerColumn = {
  key: keyof TrackerExportRow;
  header: string;
  format: (row: TrackerExportRow) => string;
};

function fmtDate(d: Date | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString();
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtNotes(notes: { content: string; createdAt: Date }[]): string {
  if (notes.length === 0) return '';
  return notes.map((n) => `[${fmtDate(n.createdAt)}] ${n.content}`).join('\n\n');
}

function fmtContact(contact: TrackerExportRow['contact']): string {
  if (!contact) return '';
  const lines = [
    contact.name,
    contact.role,
    contact.email,
    contact.phone,
    contact.linkedinUrl,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return lines.join('\n');
}

export const TRACKER_COLUMNS: TrackerColumn[] = [
  { key: 'dateApplied', header: 'Applied Date', format: (r) => fmtDate(r.dateApplied) },
  { key: 'companyName', header: 'Company', format: (r) => r.companyName },
  { key: 'jobTitle', header: 'Title', format: (r) => r.jobTitle },
  { key: 'location', header: 'Location', format: (r) => r.location ?? '' },
  { key: 'locationType', header: 'Location Type', format: (r) => r.locationType ?? '' },
  { key: 'status', header: 'Status', format: (r) => titleCase(r.status) },
  { key: 'interviewDate', header: 'Interview Date', format: (r) => fmtDate(r.interviewDate) },
  { key: 'offerDate', header: 'Offer Date', format: (r) => fmtDate(r.offerDate) },
  { key: 'rejectedDate', header: 'Rejected Date', format: (r) => fmtDate(r.rejectedDate) },
  { key: 'sourceUrl', header: 'Url', format: (r) => r.sourceUrl ?? '' },
  { key: 'notes', header: 'Notes', format: (r) => fmtNotes(r.notes) },
  { key: 'contact', header: 'Contact Person', format: (r) => fmtContact(r.contact) },
];
