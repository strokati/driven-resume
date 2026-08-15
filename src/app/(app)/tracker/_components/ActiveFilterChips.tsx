'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatSalaryCompact } from '@/lib/utils/currency';
import { useTrackerFilters } from '@/hooks/use-tracker-filters';
import type { TrackerFilters } from '@/lib/validations/tracker';

const statusLabels: Record<string, string> = {
  saved: 'Saved',
  planned: 'Planned',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  on_hold: 'On Hold',
};

const docStatusLabels: Record<string, string> = {
  ready: 'Ready',
  draft: 'Draft',
  none: 'None',
};

function fmtDay(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

type Chip = { key: string; label: string; onRemove: () => void };

export function ActiveFilterChips({ filters }: { filters: TrackerFilters }) {
  const { setFilters, toggleMulti, clearAll } = useTrackerFilters(filters);

  const chips: Chip[] = [];

  if (filters.search) {
    chips.push({
      key: 'search',
      label: `Search: "${filters.search}"`,
      onRemove: () => setFilters({ search: undefined }),
    });
  }
  for (const s of filters.status ?? []) {
    chips.push({
      key: `status-${s}`,
      label: `Status: ${statusLabels[s]}`,
      onRemove: () => toggleMulti('status', s),
    });
  }
  for (const lt of filters.locationType ?? []) {
    chips.push({
      key: `lt-${lt}`,
      label: lt,
      onRemove: () => toggleMulti('locationType', lt),
    });
  }
  if (filters.excitementMin !== undefined || filters.excitementMax !== undefined) {
    const label =
      filters.excitementMin !== undefined && filters.excitementMax !== undefined
        ? `Excitement ${filters.excitementMin}–${filters.excitementMax}`
        : filters.excitementMin !== undefined
          ? `Excitement ${filters.excitementMin}+`
          : `Excitement ≤ ${filters.excitementMax}`;
    chips.push({
      key: 'excitement',
      label,
      onRemove: () => setFilters({ excitementMin: undefined, excitementMax: undefined }),
    });
  }
  if (filters.salaryFrom !== undefined || filters.salaryTo !== undefined) {
    chips.push({
      key: 'salary',
      label: `Salary ${
        formatSalaryCompact(filters.salaryFrom ?? null, filters.salaryTo ?? null, null) ?? ''
      }`,
      onRemove: () => setFilters({ salaryFrom: undefined, salaryTo: undefined }),
    });
  }
  if (filters.savedFrom !== undefined || filters.savedTo !== undefined) {
    const parts: string[] = [];
    if (filters.savedFrom) parts.push(fmtDay(filters.savedFrom));
    if (filters.savedTo) parts.push(fmtDay(filters.savedTo));
    chips.push({
      key: 'saved',
      label: `Saved ${parts.join(' – ')}`,
      onRemove: () => setFilters({ savedFrom: undefined, savedTo: undefined }),
    });
  }
  for (const s of filters.resumeStatus ?? []) {
    chips.push({
      key: `resume-${s}`,
      label: `Resume: ${docStatusLabels[s]}`,
      onRemove: () => toggleMulti('resumeStatus', s),
    });
  }
  for (const s of filters.coverLetterStatus ?? []) {
    chips.push({
      key: `cover-${s}`,
      label: `Cover letter: ${docStatusLabels[s]}`,
      onRemove: () => toggleMulti('coverLetterStatus', s),
    });
  }
  if (filters.hasNotes !== undefined) {
    chips.push({
      key: 'hasNotes',
      label: filters.hasNotes ? 'Has notes' : 'No notes',
      onRemove: () => setFilters({ hasNotes: undefined }),
    });
  }
  if (filters.hasContact !== undefined) {
    chips.push({
      key: 'hasContact',
      label: filters.hasContact ? 'Has contact' : 'No contact',
      onRemove: () => setFilters({ hasContact: undefined }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className="gap-1 pr-1 font-normal text-muted-foreground"
        >
          {chip.label}
          <button
            type="button"
            className="rounded-full hover:bg-muted p-0.5"
            onClick={chip.onRemove}
            aria-label={`Remove filter: ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>
        Clear all
      </Button>
    </div>
  );
}
