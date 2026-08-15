export type PageToken = number | '…';

export function getPageWindow(current: number, pageCount: number): PageToken[] {
  if (pageCount <= 0) return [];
  const bounded = Math.min(Math.max(current, 1), pageCount);
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages: PageToken[] = [];
  const push = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };

  push(1);

  if (bounded <= 4) {
    for (let i = 2; i <= 5; i++) push(i);
    pages.push('…');
  } else if (bounded >= pageCount - 3) {
    pages.push('…');
    for (let i = pageCount - 4; i <= pageCount - 1; i++) push(i);
  } else {
    pages.push('…');
    for (let i = bounded - 1; i <= bounded + 1; i++) push(i);
    pages.push('…');
  }

  push(pageCount);

  // Collapse accidental adjacent ellipses or duplicated tokens.
  const collapsed: PageToken[] = [];
  for (const token of pages) {
    if (token === '…' && collapsed[collapsed.length - 1] === '…') continue;
    collapsed.push(token);
  }
  return collapsed;
}
