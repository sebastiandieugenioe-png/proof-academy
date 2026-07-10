// User session cookie helpers used across auth-scoped API handlers.
import {
  getUserIdFromRequest,
  makeUserSessionToken,
  USER_COOKIE,
} from '@/lib/user-session';
import { isSafeId } from '@/lib/validators';

// Require an authenticated regular-user session for the request. Returns userId string or throws.
export function requireUser(request) {
  const userId = getUserIdFromRequest(request);
  if (!userId || !isSafeId(userId)) {
    const e = new Error('Not authenticated');
    e.status = 401;
    throw e;
  }
  return userId;
}

// Attach the user session cookie to a NextResponse.
export function attachUserSession(res, userId) {
  const token = makeUserSessionToken(userId);
  res.cookies.set({ ...USER_COOKIE.options, name: USER_COOKIE.name, value: token });
  return res;
}

// Clear the user session cookie on a NextResponse (used after self-service account deletion).
export function clearUserSession(res) {
  res.cookies.set({ ...USER_COOKIE.options, name: USER_COOKIE.name, value: '', maxAge: 0 });
  return res;
}
