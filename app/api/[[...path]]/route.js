// Slim dispatcher for the /api/** catch-all route.
// All domain logic lives in /app/lib/api/handlers/*.js. This file only:
//   1) runs startup migrations on the first request per process,
//   2) special-cases the admin/images multipart upload (must not JSON-parse first),
//   3) parses the body once and walks a chain of domain handlers in order,
//   4) unwraps auth (401/410) + env-misconfig (503) errors into the historical shape.
//
// Every endpoint behaviour matches the previous monolithic route.js 1:1.
// See /app/lib/api/handlers/ for per-domain implementations.
import { NextResponse } from 'next/server';
import { ensureMigrationsRun } from '@/lib/migrations';
import { err, diagnoseAuthEnv } from '@/lib/api/utils';

// Domain handlers \u2014 each exports `handle(ctx)` returning NextResponse | null.
import { handle as authHandle } from '@/lib/api/handlers/auth';
import { handle as adminAuthHandle } from '@/lib/api/handlers/admin-auth';
import { handle as usersHandle } from '@/lib/api/handlers/users';
import { handle as coursesHandle } from '@/lib/api/handlers/courses';
import { handle as learningHandle } from '@/lib/api/handlers/learning';
import { handle as commentsHandle } from '@/lib/api/handlers/comments';
import { handle as journalHandle } from '@/lib/api/handlers/journal';
import { handle as newsletterHandle } from '@/lib/api/handlers/newsletter';
import { handle as feedbackHandle } from '@/lib/api/handlers/feedback';
import { handle as pagesHandle } from '@/lib/api/handlers/pages';
import { handle as adminCoursesHandle } from '@/lib/api/handlers/admin-courses';
import { handle as adminImagesHandle, handleUpload as adminImagesUpload } from '@/lib/api/handlers/admin-images';
import { handle as adminHandle } from '@/lib/api/handlers/admin';
import { handle as trackingHandle } from '@/lib/api/handlers/tracking';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Handler chain \u2014 order does not affect correctness because each handler matches
// on unique (method, seg, path) combinations. Sorted here for readability.
const HANDLERS = [
  authHandle,
  adminAuthHandle,
  usersHandle,
  coursesHandle,
  learningHandle,
  commentsHandle,
  journalHandle,
  newsletterHandle,
  feedbackHandle,
  pagesHandle,
  adminCoursesHandle,
  adminImagesHandle,
  adminHandle,
  trackingHandle,
];

async function dispatch(ctx) {
  for (const h of HANDLERS) {
    const res = await h(ctx);
    if (res) return res;
  }
  return err('Not found', 404);
}

// Convert error thrown by requireUser() / session helpers into the historical
// response shape. Env-misconfig errors from makeSessionToken() surface as 503.
function unwrapError(e, seg, verb) {
  if (e && e.status && e.status >= 400 && e.status < 500) {
    return err(e.message || 'Bad request', e.status);
  }
  if (e && typeof e.message === 'string' && /must be a strong/i.test(e.message)) {
    console.error(`[${verb}] Session-secret misconfiguration:`, e.message);
    console.error(`[${verb}] Env check:`, diagnoseAuthEnv());
    return NextResponse.json({
      error: 'Server is not configured. Contact the site owner.',
      hint: diagnoseAuthEnv(),
    }, { status: 503 });
  }
  console.error(`${verb} error`, seg, e);
  return err('Server error', 500);
}

export async function GET(request, { params }) {
  // Fire self-healing migrations on the first request after each deploy.
  ensureMigrationsRun();
  const { path = [] } = await params;
  const url = new URL(request.url);
  const seg = path.join('/');

  try {
    // Public health / root
    if (seg === '' || seg === 'health') {
      return NextResponse.json({ ok: true, service: 'online-spirits-club' });
    }
    return await dispatch({ request, method: 'GET', path, seg, url, body: null });
  } catch (e) {
    return unwrapError(e, seg, 'GET');
  }
}

export async function POST(request, { params }) {
  ensureMigrationsRun();
  const { path = [] } = await params;
  const url = new URL(request.url);
  const seg = path.join('/');

  // Special-case: admin image upload accepts multipart/form-data OR JSON.
  // We must NOT call request.json() before handling multipart.
  if (seg === 'admin/images') {
    return adminImagesUpload(request);
  }

  let body = {};
  try {
    body = await request.json();
  } catch { body = {}; }

  try {
    return await dispatch({ request, method: 'POST', path, seg, url, body });
  } catch (e) {
    return unwrapError(e, seg, 'POST');
  }
}

export async function PATCH(request, { params }) {
  const { path = [] } = await params;
  const url = new URL(request.url);
  const seg = path.join('/');
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  try {
    return await dispatch({ request, method: 'PATCH', path, seg, url, body });
  } catch (e) {
    return unwrapError(e, seg, 'PATCH');
  }
}

export async function DELETE(request, { params }) {
  const { path = [] } = await params;
  const url = new URL(request.url);
  const seg = path.join('/');

  try {
    return await dispatch({ request, method: 'DELETE', path, seg, url, body: null });
  } catch (e) {
    return unwrapError(e, seg, 'DELETE');
  }
}
