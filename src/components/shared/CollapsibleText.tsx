'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CollapsibleText({
  text,
  collapsedHeight = '15rem',
  label = 'Show full text',
}: {
  text: string;
  collapsedHeight?: string;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const charCount =
    text.length >= 1000 ? `${(text.length / 1000).toFixed(1)}k chars` : `${text.length} chars`;

  return (
    <div className="space-y-2">
      <pre
        className={`${
          expanded ? 'max-h-80' : ''
        } overflow-auto rounded-xl bg-muted/50 p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono transition-[max-height]`}
        style={expanded ? undefined : { maxHeight: collapsedHeight }}
      >
        {text}
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Collapse
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            {label} ({charCount})
          </>
        )}
      </Button>
    </div>
  );
}
