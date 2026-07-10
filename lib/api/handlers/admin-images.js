// Admin image management — upload (multipart or JSON URL import) + delete.
// The upload endpoint is special-cased in route.js because it accepts multipart/form-data
// (the body must not be JSON-parsed before handling multipart). This handler covers the
// JSON-body path and the DELETE call.
import { NextResponse } from 'next/server';
import { isSafeId } from '@/lib/validators';
import {
  uploadImage,
  uploadImageFromUrl,
  deleteImage,
  MAX_UPLOAD_BYTES,
  ALLOWED_MIME,
} from '@/lib/image-storage';
import { json, err } from '../utils';
import { requireAdmin } from '../admin-guard';

// Handle multipart or JSON upload. Called directly from route.js BEFORE body-JSON parsing.
export async function handleUpload(request) {
  const g = requireAdmin(request); if (g.response) return g.response;
  const s = g.session;
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  try {
    if (ct.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') return err('No file provided');
      if (!ALLOWED_MIME.has(file.type)) return err(`Unsupported type: ${file.type || 'unknown'}. Use JPG, PNG or WebP.`);
      if (file.size > MAX_UPLOAD_BYTES) return err('Image is too large (max 8MB).');
      const buffer = Buffer.from(await file.arrayBuffer());
      const info = await uploadImage({ buffer, contentType: file.type, filename: file.name || 'upload', uploadedBy: s.email });
      return json({ ok: true, image: info });
    }
    const body = await request.json().catch(() => ({}));
    if (body?.url) {
      const info = await uploadImageFromUrl(body.url, { uploadedBy: s.email });
      return json({ ok: true, image: info });
    }
    return err('Provide a file (multipart) or a JSON body with { url }');
  } catch (e) {
    console.error('admin/images upload error', e);
    return err(e.message || 'Upload failed', 400);
  }
}

export async function handle(ctx) {
  const { method, path, request } = ctx;
  // DELETE /api/admin/images/:id
  if (method === 'DELETE' && path[0] === 'admin' && path[1] === 'images' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid image id', 400);
    const ok = await deleteImage(path[2]);
    return NextResponse.json({ ok });
  }
  return null;
}
