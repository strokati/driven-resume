'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, MoreHorizontal, ExternalLink, FileText, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatSalaryCompact } from '@/lib/utils/currency';
import { ExcitementRating } from '@/components/shared/ExcitementRating';
import {
  updateApplicationStatus,
  updateExcitement,
  deleteApplication,
} from '@/server/actions/applications';
import { ApplicationStatusValues } from '@/lib/validations/applications';
import type { TrackerRow } from '@/server/queries/tracker';

const statusColors: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  applied: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  screening: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  interview: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  on_hold: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

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

const docStatusStyles: Record<string, string> = {
  ready: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

function fmtDate(d: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function keyDate(row: TrackerRow): { label: string; date: Date | null } | null {
  switch (row.status) {
    case 'rejected':
      return { label: 'Rejected', date: row.rejectedDate };
    case 'offer':
      return { label: 'Offer', date: row.offerDate };
    case 'interview':
      return { label: 'Interview', date: row.interviewDate };
    case 'screening':
    case 'applied':
      return { label: 'Applied', date: row.dateApplied };
    default:
      return null;
  }
}

type SortKey = 'dateSaved' | 'companyName' | 'status';
type SortDir = 'asc' | 'desc' | null;

export function TrackerTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: {
  rows: TrackerRow[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (row: TrackerRow) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleStatusChange(id: string, status: string) {
    startTransition(async () => {
      await updateApplicationStatus(id, { status });
    });
  }

  function handleExcitementChange(id: string, excitement: number) {
    startTransition(async () => {
      await updateExcitement(id, { excitement });
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this application? This cannot be undone.')) return;
    startTransition(async () => {
      await deleteApplication(id);
    });
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead className="w-[180px]">Job Position</TableHead>
            <SortableHead
              label="Company"
              sortKey="companyName"
              currentKey={sortKey}
              dir={sortDir}
              onSort={onSort}
            />
            <TableHead className="w-[120px]">Salary</TableHead>
            <TableHead className="w-[120px]">Location</TableHead>
            <SortableHead
              label="Status"
              sortKey="status"
              currentKey={sortKey}
              dir={sortDir}
              onSort={onSort}
              className="w-[140px]"
            />
            <SortableHead
              label="Date Saved"
              sortKey="dateSaved"
              currentKey={sortKey}
              dir={sortDir}
              onSort={onSort}
              className="w-[100px]"
            />
            <TableHead className="w-[110px]">Key date</TableHead>
            <TableHead className="w-[120px]">Excitement</TableHead>
            <TableHead className="w-[80px]">Resume</TableHead>
            <TableHead className="w-[100px]">Cover Letter</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                No applications found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn('cursor-pointer hover:bg-muted/50')}
                onClick={() => onRowClick(row)}
              >
                <TableCell className="text-muted-foreground text-xs">#{row.serialNumber}</TableCell>
                <TableCell className="font-medium truncate max-w-[180px]">{row.jobTitle}</TableCell>
                <TableCell className="truncate max-w-[150px]">{row.companyName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatSalaryCompact(row.salaryMin, row.salaryMax, row.currency) ?? '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm truncate max-w-[120px]">
                  {row.location || '—'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={row.status}
                    onValueChange={(v) => {
                      if (v) handleStatusChange(row.id, v);
                    }}
                  >
                    <SelectTrigger className="h-7 w-[130px] border-0 p-0 gap-1">
                      <SelectValue>
                        <Badge
                          className={cn(
                            'text-[0.65rem] border-0',
                            statusColors[row.status] ?? statusColors.saved
                          )}
                        >
                          {statusLabels[row.status] ?? row.status}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ApplicationStatusValues.map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {fmtDate(row.dateSaved)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {(() => {
                    const kd = keyDate(row);
                    if (!kd || !kd.date) return '—';
                    return `${kd.label}: ${fmtDate(kd.date)}`;
                  })()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ExcitementRating
                    value={row.excitement}
                    onChange={(v) => handleExcitementChange(row.id, v)}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn('text-[0.6rem] border-0', docStatusStyles[row.resumeStatus])}
                  >
                    {row.resumeStatus === 'ready'
                      ? 'Ready'
                      : row.resumeStatus === 'draft'
                        ? 'Draft'
                        : 'None'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn('text-[0.6rem] border-0', docStatusStyles[row.coverLetterStatus])}
                  >
                    {row.coverLetterStatus === 'ready'
                      ? 'Ready'
                      : row.coverLetterStatus === 'draft'
                        ? 'Draft'
                        : 'None'}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon" className="h-7 w-7" />}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/applications/${row.id}`)}>
                        <ExternalLink className="mr-2 h-3.5 w-3.5" />
                        Open Application
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/applications/${row.id}/resume`)}
                      >
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        Open Resume Editor
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(row.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey && dir;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <ArrowUpDown
          className={cn('h-3 w-3', active ? 'text-foreground' : 'text-muted-foreground/50')}
        />
        {active && <span className="text-[0.6rem]">{dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </TableHead>
  );
}
