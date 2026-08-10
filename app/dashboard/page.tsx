import DashboardPageClient from './dashboard-client';
import { buildMetadata } from '../../lib/seo';

export const metadata = buildMetadata({
  title: 'Optimize Photos & Videos',
  path: '/dashboard',
});

export default function DashboardPage() {
  return <DashboardPageClient />;
}
