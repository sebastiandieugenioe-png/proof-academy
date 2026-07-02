// Storage abstraction for lesson images.
// Current backend: MongoDB GridFS (persists across redeploys, no extra creds).
// Interface is intentionally minimal so we can swap in Cloudinary / S3 later.
//
//   uploadImage({buffer, contentType, filename, uploadedBy}) -> { id, url, contentType, size, width, height }
//   fetchImage(id) -> { stream, contentType, size, meta } | null
//   deleteImage(id) -> boolean

import { GridFSBucket, ObjectId } from 'mongodb';
import sharp from 'sharp';
import { getDb } from './mongo';

const BUCKET_NAME = 'lesson_images';
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
export const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function bucket() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

function bufferToStream(buf) {
  const { Readable } = require('stream');
  return Readable.from(buf);
}

// Process a raw image buffer: EXIF-strip, downscale to MAX_WIDTH, convert to WebP.
async function processImage(inputBuf) {
  const img = sharp(inputBuf, { failOn: 'none' }).rotate(); // auto-orient using EXIF then strip
  const meta = await img.metadata();
  let pipeline = img;
  if ((meta.width || 0) > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  const out = await pipeline
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { buffer: out.data, width: out.info.width, height: out.info.height, size: out.info.size };
}

export async function uploadImage({ buffer, contentType, filename = 'image', uploadedBy = 'admin' }) {
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error('Unsupported image type. Use JPG, PNG or WebP.');
  }
  if (!buffer?.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Image is too large (max 8MB).');
  }
  const processed = await processImage(buffer);
  const b = await bucket();

  return await new Promise((resolve, reject) => {
    const uploadStream = b.openUploadStream(filename.replace(/\.[^.]+$/, '') + '.webp', {
      contentType: 'image/webp',
      metadata: {
        originalContentType: contentType,
        originalSize: buffer.length,
        width: processed.width,
        height: processed.height,
        size: processed.size,
        uploadedBy,
        uploadedAt: new Date(),
      },
    });
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      const id = uploadStream.id?.toString();
      resolve({
        id,
        url: `/api/images/${id}`,
        contentType: 'image/webp',
        size: processed.size,
        width: processed.width,
        height: processed.height,
      });
    });
    bufferToStream(processed.buffer).pipe(uploadStream);
  });
}

export async function fetchImageBuffer(id) {
  let oid;
  try { oid = new ObjectId(id); } catch { return null; }
  const b = await bucket();
  const cursor = b.find({ _id: oid }).limit(1);
  const [doc] = await cursor.toArray();
  if (!doc) return null;
  const chunks = [];
  const stream = b.openDownloadStream(oid);
  return await new Promise((resolve, reject) => {
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve({
      buffer: Buffer.concat(chunks),
      contentType: doc.contentType || doc.metadata?.originalContentType || 'image/webp',
      size: doc.length,
      meta: doc.metadata || {},
      uploadDate: doc.uploadDate,
    }));
    stream.on('error', reject);
  });
}

import { lookup as dnsLookup } from 'node:dns/promises';
import net from 'node:net';

// Block RFC1918 + loopback + link-local + reserved ranges to prevent admin-authenticated SSRF.
function isPrivateOrReservedIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;                             // 10.0.0.0/8
    if (a === 127) return true;                            // loopback
    if (a === 0) return true;                              // "this network"
    if (a === 169 && b === 254) return true;               // link-local 169.254/16
    if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16/12
    if (a === 192 && b === 168) return true;               // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true;     // CGNAT 100.64/10
    if (a >= 224) return true;                             // multicast + reserved
    return false;
  }
  if (net.isIP(ip) === 6) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd')) return true; // link/uniq local
    if (low.startsWith('::ffff:')) return isPrivateOrReservedIp(low.slice(7));                 // v4-mapped
    return false;
  }
  return true; // unknown family
}

async function assertPublicHost(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error('Invalid image URL.'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) URLs are allowed.');
  const host = u.hostname;
  // Reject bare-IP hostnames to private/reserved ranges immediately.
  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) throw new Error('Refusing to fetch from a private network.');
    return;
  }
  // Resolve all A/AAAA records and require every one to be public.
  const records = await dnsLookup(host, { all: true }).catch(() => []);
  if (!records.length) throw new Error('Could not resolve image host.');
  for (const r of records) {
    if (isPrivateOrReservedIp(r.address)) {
      throw new Error('Refusing to fetch from a private network.');
    }
  }
}

export async function deleteImage(id) {
  let oid;
  try { oid = new ObjectId(id); } catch { return false; }
  const b = await bucket();
  try { await b.delete(oid); return true; } catch { return false; }
}

// Download an external URL, validate content-type & size, and store.
export async function uploadImageFromUrl(externalUrl, { uploadedBy = 'admin' } = {}) {
  if (!externalUrl || !/^https?:\/\//i.test(externalUrl)) {
    throw new Error('Invalid image URL.');
  }
  // SSRF guard: reject non-public hosts before we make any outbound connection.
  await assertPublicHost(externalUrl);
  // Note: `redirect: 'manual'` prevents follow-through into a private range via a redirect.
  // Servers that legitimately redirect (e.g. https CDN → https CDN2) would need admin to
  // provide the final URL; that's an acceptable trade-off for admin-only functionality.
  const res = await fetch(externalUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': 'OnlineSpiritsClub/1.0' },
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error('Redirects are not followed for security; provide the final URL.');
  }
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error(`Unsupported content-type from URL: ${contentType || 'unknown'}`);
  }
  const len = parseInt(res.headers.get('content-length') || '0', 10);
  if (len && len > MAX_UPLOAD_BYTES) throw new Error('Remote image exceeds 8MB.');
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length > MAX_UPLOAD_BYTES) throw new Error('Remote image exceeds 8MB.');
  const filename = (externalUrl.split('/').pop() || 'image').split('?')[0].slice(0, 60);
  return uploadImage({ buffer: buf, contentType, filename, uploadedBy });
}
