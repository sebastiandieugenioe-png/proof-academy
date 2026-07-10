// Server component gate for /admin/tracking-links.
// Mirrors /admin/page.js: check the admin session cookie, otherwise render the
// same AdminUnlock component used by the main admin dashboard.
import { getAdminSession } from '@/lib/admin-auth';
import AdminUnlock from '../AdminUnlock';
import TrackingLinksClient from './TrackingLinksClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tracking Links — Admin — Online Spirits Club',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function TrackingLinksPage() {
  const session = await getAdminSession();
  if (!session) return <AdminUnlock />;
  return <TrackingLinksClient adminEmail={session.email} />;
}
