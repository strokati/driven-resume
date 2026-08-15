'use client';

import { useState } from 'react';
import { TrackerTable } from '@/components/tracker/TrackerTable';
import { TrackerKanban } from '@/components/tracker/TrackerKanban';
import { TrackerRowDetailPanel } from '@/components/tracker/TrackerRowDetailPanel';
import { TrackerExportMenu } from '@/components/tracker/TrackerExportMenu';
import { FilterBar } from './FilterBar';
import { ActiveFilterChips } from './ActiveFilterChips';
import { PaginationBar } from './PaginationBar';
import type { TrackerRow } from '@/server/queries/tracker';
import type { TrackerFilters } from '@/lib/validations/tracker';

type SortKey = 'dateSaved' | 'companyName' | 'status' | 'serialNumber' | 'dateApplied';
type SortDir = 'asc' | 'desc' | null;

export function TrackerView({
  initialData,
  filters,
}: {
  initialData: {
    rows: TrackerRow[];
    total: number;
    page?: number;
    pageSize?: number;
    pageCount?: number;
  };
  filters: TrackerFilters;
}) {
  const [selectedRow, setSelectedRow] = useState<TrackerRow | null>(null);
  const isKanban = filters.view === 'kanban';

  function cycleSort(key: SortKey) {
    if (filters.sort !== key) {
      // new sort key starts ascending (matches previous behaviour)
      window.location.assign(sortHref({ sort: key, dir: 'asc' }));
    } else if (filters.dir === 'asc') {
      window.location.assign(sortHref({ sort: key, dir: 'desc' }));
    } else {
      window.location.assign(sortHref({ sort: key, dir: 'asc' }));
    }
  }

  function sortHref(patch: { sort: SortKey; dir: 'asc' | 'desc' }): string {
    const params = new URLSearchParams(window.location.search);
    params.set('sort', patch.sort);
    params.set('dir', patch.dir);
    params.delete('page');
    return `/tracker?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application Tracker</h1>
        <TrackerExportMenu rowCount={initialData.total} />
      </div>

      <FilterBar filters={filters} total={initialData.total} />

      <ActiveFilterChips filters={filters} />

      {isKanban ? (
        <TrackerKanban rows={initialData.rows} onCardClick={setSelectedRow} />
      ) : (
        <>
          <TrackerTable
            rows={initialData.rows}
            sortKey={filters.sort as SortKey}
            sortDir={filters.dir as SortDir}
            onSort={cycleSort}
            onRowClick={setSelectedRow}
          />
          {initialData.page !== undefined && initialData.pageCount !== undefined && (
            <PaginationBar
              filters={filters}
              total={initialData.total}
              page={initialData.page}
              pageSize={initialData.pageSize ?? filters.pageSize}
              pageCount={initialData.pageCount}
            />
          )}
        </>
      )}

      <TrackerRowDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}
