'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getPageWindow } from '@/lib/utils/pagination';
import { useTrackerFilters } from '@/hooks/use-tracker-filters';
import type { TrackerFilters } from '@/lib/validations/tracker';

const PAGE_SIZES = ['10', '20', '50', '100'];

export function PaginationBar({
  filters,
  total,
  page,
  pageSize,
  pageCount,
}: {
  filters: TrackerFilters;
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}) {
  const { setFilters } = useTrackerFilters(filters);

  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const window = getPageWindow(page, pageCount);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => setFilters({ page: page - 1 }, { scroll: true })}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {window.map((token, idx) =>
          token === '…' ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={token}
              variant={token === page ? 'secondary' : 'outline'}
              size="icon"
              className={cn('h-8 w-8 text-sm', token !== page && 'font-normal')}
              aria-current={token === page ? 'page' : undefined}
              onClick={() => setFilters({ page: token }, { scroll: true })}
            >
              {token}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= pageCount}
          onClick={() => setFilters({ page: page + 1 }, { scroll: true })}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            if (v) setFilters({ pageSize: parseInt(v, 10), page: 1 });
          }}
        >
          <SelectTrigger className="h-8 w-[110px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
