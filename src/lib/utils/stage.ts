const DAY_MS = 86_400_000;

function startOfToday(now = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function daysInStage(updatedAt: Date | string, now = new Date()): number {
  return Math.floor((startOfToday(now) - startOfToday(new Date(updatedAt))) / DAY_MS);
}

export type Milestone = { label: string; date: Date | null };

export function nextMilestone(
  status: string,
  interviewDate: Date | null,
  offerDate: Date | null,
  now = new Date()
): Milestone | null {
  if (interviewDate && interviewDate.getTime() > now.getTime()) {
    return { label: `Interview ${formatDay(interviewDate)}`, date: interviewDate };
  }
  if (offerDate && offerDate.getTime() > now.getTime()) {
    return { label: `Offer ${formatDay(offerDate)}`, date: offerDate };
  }
  if (status === 'applied' || status === 'screening') {
    return { label: 'Awaiting response', date: null };
  }
  return null;
}

const stageVerbs: Record<string, string> = {
  saved: 'Saved',
  planned: 'Planned',
  applied: 'Applied',
  screening: 'In screening',
  interview: 'In interview',
  offer: 'Offer received',
  rejected: 'Rejected',
  on_hold: 'On hold',
};

export function stagePhrase(status: string, updatedAt: Date | string, now = new Date()): string {
  const days = daysInStage(updatedAt, now);
  const verb = stageVerbs[status] ?? status.charAt(0).toUpperCase() + status.slice(1);

  if (days <= 0) return `${verb} today`;
  if (days === 1) return `${verb} yesterday`;
  return `${verb} ${days} days ago`;
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
