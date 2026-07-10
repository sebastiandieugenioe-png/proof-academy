// Admin authentication guard — returns null (auth ok) or a 401 NextResponse.
import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/admin-auth';

// Require an admin session cookie on the incoming request.
// Returns { session } on success, or { response } holding a 401 NextResponse otherwise.
export function requireAdmin(request) {
  const s = getAdminSessionFromRequest(request);
  if (!s) return { response: NextResponse.json({ error: 'Admin authentication required' }, { status: 401 }) };
  return { session: s };
}
