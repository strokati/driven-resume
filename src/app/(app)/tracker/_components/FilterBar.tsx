'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, Table, Kanban, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ApplicationStatusValues, LocationTypeValues } from '@/lib/validations/applications';
import { DocStatusValues, TrackerSortKeys } from '@/lib/validations/tracker';
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

const sortLabels: Record<string, string> = {
  serialNumber: 'Serial #',
  dateSaved: 'Date Saved',
  dateApplied: 'Date Applied',
  companyName: 'Company',
  status: 'Status',
};

const EXCITEMENT_OPTIONS = ['1', '2', '3', '4', '5'];

function countActiveFilters(f: TrackerFilters): number {
  let n = 0;
  if (f.search) n++;
  if (f.status?.length) n++;
  if (f.locationType?.length) n++;
  if (f.excitementMin !== undefined || f.excitementMax !== undefined) n++;
  if (f.salaryFrom !== undefined || f.salaryTo !== undefined) n++;
  if (f.savedFrom !== undefined || f.savedTo !== undefined) n++;
  if (f.resumeStatus?.length) n++;
  if (f.coverLetterStatus?.length) n++;
  if (f.hasNotes !== undefined) n++;
  if (f.hasContact !== undefined) n++;
  return n;
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
  dot,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  dot?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
      {label}
    </label>
  );
}

const statusDotColors: Record<string, string> = {
  saved: 'bg-slate-400',
  planned: 'bg-blue-400',
  applied: 'bg-purple-400',
  screening: 'bg-yellow-400',
  interview: 'bg-orange-400',
  offer: 'bg-green-400',
  rejected: 'bg-red-400',
  on_hold: 'bg-gray-400',
};

export function FilterBar({ filters, total }: { filters: TrackerFilters; total: number }) {
  const { setFilters, setSearchDebounced, toggleMulti } = useTrackerFilters(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.search ?? '');

  const activeCount = countActiveFilters(filters);

  function swapIfNeeded(patch: { min?: number; max?: number }, key: 'excitement' | 'salary') {
    const min = patch.min;
    const max = patch.max;
    if (min !== undefined && max !== undefined && min > max) {
      return key === 'excitement'
        ? { excitementMin: max, excitementMax: min }
        : { salaryFrom: max, salaryTo: min };
    }
    return {};
  }

  function setRange(key: 'excitement' | 'salary', bound: 'min' | 'max', value: string) {
    const num = value === '' ? undefined : parseInt(value, 10);
    const currentMin = key === 'excitement' ? filters.excitementMin : filters.salaryFrom;
    const currentMax = key === 'excitement' ? filters.excitementMax : filters.salaryTo;
    const nextMin = bound === 'min' ? num : currentMin;
    const nextMax = bound === 'max' ? num : currentMax;
    const swapped = swapIfNeeded({ min: nextMin, max: nextMax }, key);
    if (Object.keys(swapped).length > 0) {
      setFilters(swapped);
      return;
    }
    if (key === 'excitement') {
      setFilters({ excitementMin: nextMin, excitementMax: nextMax });
    } else {
      setFilters({ salaryFrom: nextMin, salaryTo: nextMax });
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search company or job title..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setSearchDebounced(e.target.value);
          }}
          className="pl-8"
        />
      </div>

      <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
              Filters
              {activeCount > 0 && (
                <Badge className="ml-1.5 h-5 min-w-5 rounded-full p-0 text-[0.6rem] flex items-center justify-center">
                  {activeCount}
                </Badge>
              )}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-80 p-3 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <FilterSection title="Status">
              {ApplicationStatusValues.map((s) => (
                <CheckRow
                  key={s}
                  label={statusLabels[s]}
                  dot={statusDotColors[s]}
                  checked={filters.status?.includes(s) ?? false}
                  onChange={() => toggleMulti('status', s)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Location type">
              {LocationTypeValues.map((lt) => (
                <CheckRow
                  key={lt}
                  label={lt}
                  checked={filters.locationType?.includes(lt) ?? false}
                  onChange={() => toggleMulti('locationType', lt)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Excitement">
              <div className="flex items-center gap-2">
                <Select
                  value={filters.excitementMin ? String(filters.excitementMin) : 'any'}
                  onValueChange={(v) => {
                    if (v) setRange('excitement', 'min', v === 'any' ? '' : v);
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {EXCITEMENT_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground text-sm">–</span>
                <Select
                  value={filters.excitementMax ? String(filters.excitementMax) : 'any'}
                  onValueChange={(v) => {
                    if (v) setRange('excitement', 'max', v === 'any' ? '' : v);
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Max" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {EXCITEMENT_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FilterSection>

            <FilterSection title="Salary (overlap)">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="From"
                  className="h-8 text-sm"
                  defaultValue={filters.salaryFrom ?? ''}
                  onBlur={(e) => setRange('salary', 'min', e.target.value)}
                />
                <span className="text-muted-foreground text-sm">–</span>
                <Input
                  type="number"
                  placeholder="To"
                  className="h-8 text-sm"
                  defaultValue={filters.salaryTo ?? ''}
                  onBlur={(e) => setRange('salary', 'max', e.target.value)}
                />
              </div>
            </FilterSection>

            <FilterSection title="Date saved">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-8 text-sm"
                  defaultValue={filters.savedFrom ?? ''}
                  onChange={(e) => setFilters({ savedFrom: e.target.value || undefined })}
                />
                <span className="text-muted-foreground text-sm">–</span>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  defaultValue={filters.savedTo ?? ''}
                  onChange={(e) => setFilters({ savedTo: e.target.value || undefined })}
                />
              </div>
            </FilterSection>

            <FilterSection title="Resume status">
              {DocStatusValues.map((s) => (
                <CheckRow
                  key={s}
                  label={docStatusLabels[s]}
                  checked={filters.resumeStatus?.includes(s) ?? false}
                  onChange={() => toggleMulti('resumeStatus', s)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Cover letter status">
              {DocStatusValues.map((s) => (
                <CheckRow
                  key={s}
                  label={docStatusLabels[s]}
                  checked={filters.coverLetterStatus?.includes(s) ?? false}
                  onChange={() => toggleMulti('coverLetterStatus', s)}
                />
              ))}
            </FilterSection>

            <FilterSection title="Extras">
              <CheckRow
                label="Has notes"
                checked={filters.hasNotes === true}
                onChange={() =>
                  setFilters({ hasNotes: filters.hasNotes === true ? undefined : true })
                }
              />
              <CheckRow
                label="Has contact"
                checked={filters.hasContact === true}
                onChange={() =>
                  setFilters({ hasContact: filters.hasContact === true ? undefined : true })
                }
              />
            </FilterSection>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1.5">
        <Select
          value={filters.sort}
          onValueChange={(v) => {
            if (v) setFilters({ sort: v as TrackerFilters['sort'] });
          }}
        >
          <SelectTrigger className="h-9 w-[150px] text-sm">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TrackerSortKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {sortLabels[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => setFilters({ dir: filters.dir === 'asc' ? 'desc' : 'asc' })}
          aria-label={filters.dir === 'asc' ? 'Sort ascending' : 'Sort descending'}
        >
          {filters.dir === 'asc' ? '↑' : '↓'}
        </Button>
      </div>

      <div className="flex items-center border rounded-md p-0.5">
        <Button
          variant={filters.view === 'table' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2"
          onClick={() => setFilters({ view: 'table' })}
        >
          <Table className="h-3.5 w-3.5 mr-1" />
          Table
        </Button>
        <Button
          variant={filters.view === 'kanban' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2"
          onClick={() => setFilters({ view: 'kanban' })}
        >
          <Kanban className="h-3.5 w-3.5 mr-1" />
          Kanban
        </Button>
      </div>

      <span className="text-sm text-muted-foreground ml-auto whitespace-nowrap">
        {activeCount > 0 ? `${total} of ` : ''}
        {total} application{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}
