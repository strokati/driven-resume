import { TrackerFiltersSchema, TrackerFilters } from '@/lib/validations/tracker';

type ParamRecord = Record<string, string | string[] | undefined>;

const DEFAULTS: TrackerFilters = TrackerFiltersSchema.parse({});

function normalizeParams(params: URLSearchParams | ParamRecord): ParamRecord {
  if (params instanceof URLSearchParams) {
    const record: ParamRecord = {};
    for (const key of new Set(params.keys())) {
      const values = params.getAll(key);
      record[key] = values.length > 1 ? values : values[0];
    }
    return record;
  }
  return params;
}

function toList(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function parseTrackerFilters(params: URLSearchParams | ParamRecord): TrackerFilters {
  const record = normalizeParams(params);
  const result: Record<string, unknown> = {};

  for (const key of MULTI_KEYS) {
    const values = toList(record[key]);
    if (values.length === 0) continue;
    const valid = values.filter((v) => TrackerFiltersSchema.shape[key].safeParse([v]).success);
    if (valid.length > 0) {
      const parsed = TrackerFiltersSchema.shape[key].safeParse(valid);
      if (parsed.success) result[key] = parsed.data;
    }
  }

  for (const key of SINGLE_KEYS) {
    const raw = record[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value === undefined || value === '') continue;
    const parsed = TrackerFiltersSchema.shape[key].safeParse(value);
    if (parsed.success) result[key] = parsed.data;
  }

  return TrackerFiltersSchema.parse(result);
}

export function serializeTrackerFilters(filters: TrackerFilters): string {
  const params = new URLSearchParams();

  for (const key of MULTI_KEYS) {
    const values = filters[key];
    if (values && values.length > 0) {
      for (const v of values) params.append(key, String(v));
    }
  }

  for (const key of SINGLE_KEYS) {
    const value = filters[key] as unknown;
    if (value !== undefined && value !== DEFAULTS[key]) {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export function buildTrackerHref(current: TrackerFilters, patch: Partial<TrackerFilters>): string {
  const qs = serializeTrackerFilters({ ...current, ...patch });
  return qs ? `/tracker?${qs}` : '/tracker';
}

export function isDefaultTrackerFilters(filters: TrackerFilters): boolean {
  return serializeTrackerFilters(filters) === '';
}

const MULTI_KEYS = ['status', 'locationType', 'resumeStatus', 'coverLetterStatus'] as const;
const SINGLE_KEYS = [
  'search',
  'excitementMin',
  'excitementMax',
  'salaryFrom',
  'salaryTo',
  'savedFrom',
  'savedTo',
  'hasNotes',
  'hasContact',
  'sort',
  'dir',
  'page',
  'pageSize',
  'view',
] as const;
