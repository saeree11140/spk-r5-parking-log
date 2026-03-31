import { DashboardClient } from '@/components/dashboard-client';
import { getDashboard, getHouses } from '@/lib/api';

function todayInBangkok() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function HomePage() {
  const selectedDate = todayInBangkok();
  const [dashboard, houses] = await Promise.all([getDashboard(selectedDate), getHouses()]);

  return <DashboardClient initialDashboard={dashboard} houses={houses} />;
}
