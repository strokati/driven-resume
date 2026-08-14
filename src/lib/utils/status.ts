export const statusColors: Record<string, string> = {
  saved: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  applied: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  screening: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  interview: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  on_hold: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const statusLabels: Record<string, string> = {
  saved: 'Saved',
  planned: 'Planned',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  on_hold: 'On Hold',
};

export const statusDotColors: Record<string, string> = {
  saved: 'bg-slate-400',
  planned: 'bg-blue-500',
  applied: 'bg-purple-500',
  screening: 'bg-yellow-500',
  interview: 'bg-orange-500',
  offer: 'bg-green-500',
  rejected: 'bg-red-500',
  on_hold: 'bg-gray-400',
};
