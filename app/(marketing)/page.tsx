import MarketingClient from './marketing-client';
import { buildMetadata } from '../../lib/seo';

export const metadata = buildMetadata({
  path: '/',
});

export default function MarketingPage() {
  return <MarketingClient />;
}
