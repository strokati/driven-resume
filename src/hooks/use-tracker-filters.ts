'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseTrackerFilters, serializeTrackerFilters } from '@/lib/utils/tracker-url';
import type { TrackerFilters } from '@/lib/validations/tracker';

type MultiKey = 'status' | 'locationType' | 'resumeStatus' | 'coverLetterStatus';

const defaultFiltersPatch: Partial<TrackerFilters> = {
  search: undefined,
  status: undefined,
  locationType: undefined,
  excitementMin: undefined,
  excitementMax: undefined,
  salaryFrom: undefined,
  salaryTo: undefined,
  savedFrom: undefined,
  savedTo: undefined,
  resumeStatus: undefined,
  coverLetterStatus: undefined,
  hasNotes: undefined,
  hasContact: undefined,
  page: 1,
};

export function useTrackerFilters(filters: TrackerFilters) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceUpdate] = useState(0);

  const current = searchParams ? parseTrackerFilters(searchParams) : filters;

  const push = useCallback(
    (next: TrackerFilters, opts?: { replace?: boolean; scroll?: boolean }) => {
      const qs = serializeTrackerFilters(next);
      const href = qs ? `/tracker?${qs}` : '/tracker';
      if (opts && opts.replace) {
        router.replace(href, { scroll: opts.scroll ?? false });
      } else {
        router.push(href, { scroll: (opts && opts.scroll) ?? false });
      }
    },
    [router]
  );

  const setFilters = useCallback(
    (patch: Partial<TrackerFilters>, opts?: { resetPage?: boolean; scroll?: boolean }) => {
      const next = { ...current, ...patch };
      if (patch.page === undefined && opts && opts.resetPage !== false) {
        next.page = 1;
      }
      push(next, { scroll: opts?.scroll });
    },
    [current, push]
  );

  const setSearchDebounced = useCallback(
    (search: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = search.trim() === '' ? undefined : search;
      debounceRef.current = setTimeout(() => {
        push({ ...current, search: trimmed, page: 1 }, { replace: true });
        forceUpdate((n) => n + 1);
      }, 300);
    },
    [current, push]
  );

  const toggleMulti = useCallback(
    (key: MultiKey, value: string) => {
      const values = current[key] ?? [];
      const next = values.includes(value as never)
        ? values.filter((v) => v !== value)
        : [...values, value as never];
      setFilters({ [key]: next.length > 0 ? next : undefined });
    },
    [current, setFilters]
  );

  const clearAll = useCallback(() => {
    const qs = serializeTrackerFilters({ ...current, ...defaultFiltersPatch });
    const href = qs ? `/tracker?${qs}` : '/tracker';
    router.push(href, { scroll: false });
  }, [current, router]);

  return { filters: current, setFilters, setSearchDebounced, toggleMulti, clearAll };
}
