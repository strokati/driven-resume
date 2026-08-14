'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export function PropertyGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-border py-3 first:border-t-0 first:pt-0', className)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function PropertyRow({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 min-h-7">
      <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{label}</span>
      <div className="text-sm flex-1 min-w-0">{value}</div>
      {action}
    </div>
  );
}

export function PropertyRowClickable({
  label,
  value,
  placeholder = '—',
  type = 'text',
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'date' | 'number';
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  function commit() {
    setEditing(false);
    if (local !== value) onSave(local);
  }

  function cancel() {
    setEditing(false);
    setLocal(value);
  }

  return (
    <div className="flex items-center gap-3 min-h-7">
      <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{label}</span>
      {editing ? (
        <Input
          type={type}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          autoFocus
          className="h-7 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setLocal(value);
          }}
          className="text-sm hover:underline underline-offset-2 text-left min-w-0 truncate"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      )}
    </div>
  );
}
