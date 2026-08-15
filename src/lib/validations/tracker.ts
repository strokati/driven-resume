import { z } from 'zod';
import { ApplicationStatusValues, LocationTypeValues } from './applications';

export const TrackerSortKeys = [
  'serialNumber',
  'dateSaved',
  'dateApplied',
  'companyName',
  'status',
] as const;

export const DocStatusValues = ['ready', 'draft', 'none'] as const;

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00`).getTime()), 'Invalid calendar date');

const boolParam = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => (v === 'true' ? true : v === 'false' ? false : v));

export const TrackerFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.array(z.enum(ApplicationStatusValues)).max(8).optional(),
  locationType: z.array(z.enum(LocationTypeValues)).max(3).optional(),
  excitementMin: z.coerce.number().int().min(1).max(5).optional(),
  excitementMax: z.coerce.number().int().min(1).max(5).optional(),
  salaryFrom: z.coerce.number().int().min(0).max(10_000_000).optional(),
  salaryTo: z.coerce.number().int().min(0).max(10_000_000).optional(),
  savedFrom: dateStr.optional(),
  savedTo: dateStr.optional(),
  resumeStatus: z.array(z.enum(DocStatusValues)).max(3).optional(),
  coverLetterStatus: z.array(z.enum(DocStatusValues)).max(3).optional(),
  hasNotes: boolParam.optional(),
  hasContact: boolParam.optional(),
  sort: z.enum(TrackerSortKeys).default('dateSaved'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  view: z.enum(['table', 'kanban']).default('table'),
});

export type TrackerFilters = z.infer<typeof TrackerFiltersSchema>;
