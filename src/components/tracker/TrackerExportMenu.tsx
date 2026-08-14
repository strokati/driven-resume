'use client';

import { useState } from 'react';
import { Download, FileText, Sheet, FileType, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

type Format = 'pdf' | 'xlsx' | 'docx';

const OPTIONS: {
  format: Format;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { format: 'pdf', label: 'PDF', icon: FileText },
  { format: 'xlsx', label: 'Excel', icon: Sheet },
  { format: 'docx', label: 'Word', icon: FileType },
];

export function TrackerExportMenu({ rowCount }: { rowCount: number }) {
  const [pending, setPending] = useState<Format | null>(null);

  async function handleExport(format: Format) {
    if (rowCount === 0) {
      toast.info('Nothing to export — your tracker is empty.');
      return;
    }
    setPending(format);
    const toastId = toast.loading(`Preparing ${format.toUpperCase()} export…`);
    try {
      const res = await fetch('/api/export/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }
      const blob = await res.blob();
      triggerBrowserDownload(blob, filename(format));
      toast.success(`${format.toUpperCase()} export ready`, { id: toastId });
    } catch (err) {
      console.error('Tracker export failed', err);
      toast.error('Export failed. Please try again.', { id: toastId });
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" disabled={pending !== null} />}
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ format, label, icon: Icon }) => (
          <DropdownMenuItem
            key={format}
            disabled={pending !== null}
            onClick={() => handleExport(format)}
          >
            {pending === format ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5 mr-2" />
            )}
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function filename(format: Format): string {
  const ts = new Date().toISOString().slice(0, 10);
  return `tracker-${ts}.${format}`;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
