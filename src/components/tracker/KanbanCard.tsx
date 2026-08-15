'use client';

import { Star, MapPin, Clock, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TrackerRow } from '@/server/queries/tracker';

function fmtDate(d: Date | string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function KanbanCard({
  row,
  onClick,
  dragListeners,
  dragAttributes,
  style,
  isDragging,
}: {
  row: TrackerRow;
  onClick: () => void;
  dragListeners?: React.HTMLAttributes<HTMLElement>;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
  style?: React.CSSProperties;
  isDragging?: boolean;
}) {
  return (
    <Card
      style={style}
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg rotate-2'
      )}
      onClick={onClick}
      {...dragListeners}
      {...dragAttributes}
    >
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{row.companyName}</p>
            <p className="text-xs text-muted-foreground truncate">{row.jobTitle}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-1">
            {row.resumeStatus === 'ready' && (
              <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
            )}
            <span className="text-[0.6rem] text-muted-foreground">#{row.serialNumber}</span>
          </div>
        </div>

        {row.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{row.location}</span>
          </div>
        )}

        {row.dateApplied && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {fmtDate(row.dateApplied)}
          </div>
        )}

        <div className="flex items-center gap-0.5 pt-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'h-3 w-3',
                star <= (row.excitement ?? 0)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/20'
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
