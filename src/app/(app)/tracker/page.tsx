import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getTrackerPage, getTrackerKanbanData, type TrackerPage } from '@/server/queries/tracker';
import { parseTrackerFilters } from '@/lib/utils/tracker-url';
import { TrackerView } from './_components/TrackerView';

export const dynamic = 'force-dynamic';

export default async function TrackerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session && process.env.AUTH_MODE === 'email_otp') redirect('/login');
  const userId = session?.user?.id ?? 'local-user';

  const filters = parseTrackerFilters(await searchParams);

  if (filters.view === 'kanban') {
    const rows = await getTrackerKanbanData(userId, filters);
    return <TrackerView initialData={{ rows, total: rows.length }} filters={filters} />;
  }

  let data: TrackerPage = await getTrackerPage(userId, filters);
  if (data.rows.length === 0 && data.total > 0) {
    const clampedPage = Math.max(1, Math.ceil(data.total / data.pageSize));
    data = await getTrackerPage(userId, { ...filters, page: clampedPage });
  }

  return <TrackerView initialData={data} filters={filters} />;
}
