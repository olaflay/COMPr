import type { Metadata } from 'next';
import JobPageClient from './job-page-client';

export const metadata: Metadata = {
  title: 'Job Status | NoBlur',
  robots: { index: false, follow: false },
};

export default function JobPage({ params }: { params: { id: string } }) {
  return <JobPageClient jobId={params.id} />;
}
