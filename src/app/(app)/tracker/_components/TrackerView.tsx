'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Table, Kanban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrackerTable } from '@/components/tracker/TrackerTable';
import { TrackerKanban } from '@/components/tracker/TrackerKanban';
import { TrackerRowDetailPanel } from '@/components/tracker/TrackerRowDetailPanel';
import { TrackerExportMenu } from '@/components/tracker/TrackerExportMenu';
import type { TrackerRow } from '@/server/queries/tracker';
import { ApplicationStatusValues } from '@/lib/validations/applications';

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

type SortKey = 'dateSaved' | 'companyName' | 'status';
type SortDir = 'asc' | 'desc' | null;
type ViewMode = 'table' | 'kanban';

const VIEW_KEY = 'tracker-view';

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

export function TrackerView({ initialData }: { initialData: TrackerRow[] }) {
  const { data: rows } = useQuery({
    queryKey: ['tracker'],
    queryFn: () => initialData,
    initialData,
    staleTime: Infinity,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('dateSaved');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedRow, setSelectedRow] = useState<TrackerRow | null>(null);

  const view = useSyncExternalStore(
    subscribe,
    () => (localStorage.getItem(VIEW_KEY) as ViewMode) || 'table',
    () => 'table'
  );
  const [, forceUpdate] = useState(0);

  function handleViewChange(v: ViewMode) {
    localStorage.setItem(VIEW_KEY, v);
    forceUpdate((n) => n + 1);
  }

  const filtered = useMemo(() => {
    let result = rows;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.companyName.toLowerCase().includes(q) || r.jobTitle.toLowerCase().includes(q)
      );
    }

    if (statusFilter.size > 0) {
      result = result.filter((r) => statusFilter.has(r.status));
    }

    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'dateSaved':
            cmp = new Date(a.dateSaved).getTime() - new Date(b.dateSaved).getTime();
            break;
          case 'companyName':
            cmp = a.companyName.localeCompare(b.companyName);
            break;
          case 'status':
            cmp = a.status.localeCompare(b.status);
            break;
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [rows, search, statusFilter, sortKey, sortDir]);

  function toggleStatus(status: string) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function cycleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortDir(null);
    }
  }

  const activeFilterCount = statusFilter.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application Tracker</h1>

        <div className="flex items-center gap-2">
          <TrackerExportMenu rowCount={rows.length} />
          <div className="flex items-center border rounded-md p-0.5">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => handleViewChange('table')}
            >
              <Table className="h-3.5 w-3.5 mr-1" />
              Table
            </Button>
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => handleViewChange('kanban')}
            >
              <Kanban className="h-3.5 w-3.5 mr-1" />
              Kanban
            </Button>
          </div>
        </div>
      </div>

      {view === 'table' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              Status
              {activeFilterCount > 0 && (
                <Badge className="ml-1.5 h-5 w-5 rounded-full p-0 text-[0.6rem] flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {ApplicationStatusValues.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggleStatus(s)}
                >
                  {statusLabels[s]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Sort:
            {(['dateSaved', 'companyName', 'status'] as SortKey[]).map((key) => (
              <Button
                key={key}
                variant={sortKey === key && sortDir ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => cycleSort(key)}
              >
                {key === 'dateSaved'
                  ? 'Date Saved'
                  : key === 'companyName'
                    ? 'Company'
                    : key === 'status'
                      ? 'Status'
                      : 'Deadline'}
                {sortKey === key && sortDir && (
                  <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {view === 'kanban' && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search company or job title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}

      {view === 'table' ? (
        <TrackerTable
          rows={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={cycleSort}
          onRowClick={setSelectedRow}
        />
      ) : (
        <TrackerKanban rows={filtered} onCardClick={setSelectedRow} />
      )}

      <TrackerRowDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}
