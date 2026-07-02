import { redirect } from 'next/navigation';
import { getAdminSession, isAdminEmail } from '@/lib/admin-auth';
import AdminUnlock from './AdminUnlock';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin \u2014 Online Spirits Club',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    // Show password gate. The gate calls /api/admin-auth which also validates
    // that the user's browser-side email is in ADMIN_EMAILS before setting the cookie.
    return <AdminUnlock />;
  }
  return <AdminDashboard adminEmail={session.email} />;
}
