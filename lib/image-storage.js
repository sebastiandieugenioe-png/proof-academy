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
import { lookup as dnsLookup } from 'node:dns/promises';
import net from 'node:net';
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici';

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

// Block RFC1918 + loopback + link-local + reserved ranges to prevent admin-authenticated SSRF.
function isPrivateOrReservedIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    const [a, b, c] = parts;
    if (a === 10) return true;                              // 10.0.0.0/8
    if (a === 127) return true;                             // loopback
    if (a === 0) return true;                               // "this network"
    if (a === 169 && b === 254) return true;                // link-local 169.254/16
    if (a === 172 && b >= 16 && b <= 31) return true;       // 172.16/12
    if (a === 192 && b === 168) return true;                // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true;      // CGNAT 100.64/10
    // IPv4 documentation / benchmark / anycast ranges — non-routable in practice.
    if (a === 192 && b === 0 && c === 2) return true;       // 192.0.2/24    TEST-NET-1 (RFC5737)
    if (a === 198 && b === 51 && c === 100) return true;    // 198.51.100/24 TEST-NET-2 (RFC5737)
    if (a === 203 && b === 0 && c === 113) return true;     // 203.0.113/24  TEST-NET-3 (RFC5737)
    if (a === 198 && (b === 18 || b === 19)) return true;   // 198.18/15     benchmarking (RFC2544)
    if (a === 192 && b === 0 && c === 0) return true;       // 192.0.0/24    IETF protocol assignments
    if (a === 192 && b === 88 && c === 99) return true;     // 192.88.99/24  6to4 relay anycast (deprecated)
    if (a >= 224) return true;                              // multicast + reserved
    return false;
  }
  if (net.isIP(ip) === 6) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd')) return true; // link/uniq local
    if (low.startsWith('2002:')) return true;               // 6to4
    if (low.startsWith('64:ff9b:') || low.startsWith('64:ff9b::')) return true; // NAT64
    if (low.startsWith('2001:db8:')) return true;           // documentation (RFC3849)
    if (low.startsWith('::ffff:')) return isPrivateOrReservedIp(low.slice(7));  // v4-mapped
    return false;
  }
  return true; // unknown family
}

// Resolve the hostname once and return the vetted IPs. Rejects on any private/reserved address.
async function resolveAndValidate(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { throw new Error('Invalid image URL.'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) URLs are allowed.');
  const host = u.hostname;
  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) throw new Error('Refusing to fetch from a private network.');
    return { url: u, addresses: [{ address: host, family: net.isIP(host) }] };
  }
  const records = await dnsLookup(host, { all: true }).catch(() => []);
  if (!records.length) throw new Error('Could not resolve image host.');
  for (const r of records) {
    if (isPrivateOrReservedIp(r.address)) {
      throw new Error('Refusing to fetch from a private network.');
    }
  }
  return { url: u, addresses: records };
}

// Build an undici Agent whose `connect.lookup` always returns our pre-validated IP.
// This closes the DNS-rebinding gap: the address used for the TCP connect() is exactly
// the one we validated, not a fresh (potentially attacker-controlled) resolution.
function pinnedAgent(vetted) {
  const first = vetted.addresses[0];
  return new UndiciAgent({
    connect: {
      lookup: (hostname, options, callback) => {
        callback(null, first.address, first.family);
      },
    },
  });
}

export async function deleteImage(id) {
  let oid;
  try { oid = new ObjectId(id); } catch { return false; }
  const b = await bucket();
  try { await b.delete(oid); return true; } catch { return false; }
}

// One fetch through the pin-and-check routine. Returns { res, dispatcher, finalUrl }.
// Caller MUST close the dispatcher after consuming the body.
async function fetchPinned(rawUrl) {
  const vetted = await resolveAndValidate(rawUrl);
  const dispatcher = pinnedAgent(vetted);
  const res = await undiciFetch(rawUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': 'OnlineSpiritsClub/1.0' },
    dispatcher,
  });
  return { res, dispatcher, finalUrl: rawUrl };
}

// Resolve a relative or absolute Location header into an absolute http(s) URL
// belonging to a *different* origin OR the same origin. Returns null if unusable.
function resolveRedirect(baseUrl, location) {
  if (!location || typeof location !== 'string') return null;
  try {
    const next = new URL(location, baseUrl);
    if (!/^https?:$/.test(next.protocol)) return null;
    return next.toString();
  } catch { return null; }
}

// Download an external URL, validate content-type & size, and store.
// SEC-006: resolves DNS once per hop and pins the vetted IP to TCP connect().
// Follows AT MOST ONE 3xx redirect, and only if the redirect target passes the
// same validation as the original URL. This prevents DNS-rebinding, redirect-into-
// private-range, and open-redirect-to-metadata-endpoint attacks.
const MAX_REDIRECTS = 1;

export async function uploadImageFromUrl(externalUrl, { uploadedBy = 'admin' } = {}) {
  if (!externalUrl || !/^https?:\/\//i.test(externalUrl)) {
    throw new Error('Invalid image URL.');
  }
  let url = externalUrl;
  let hop = 0;
  let attempt;
  try {
    while (true) {
      attempt = await fetchPinned(url);
      const { res } = attempt;
      // Redirect handling
      if (res.status >= 300 && res.status < 400) {
        if (hop >= MAX_REDIRECTS) {
          throw new Error(`Too many redirects (max ${MAX_REDIRECTS}); provide the final URL.`);
        }
        const location = res.headers.get('location');
        const nextUrl = resolveRedirect(url, location);
        // Consume body so the socket returns to the pool before we close the dispatcher.
        try { await res.arrayBuffer(); } catch { /* ignore */ }
        try { await attempt.dispatcher.close(); } catch { /* ignore */ }
        attempt = null;
        if (!nextUrl) throw new Error('Redirect had no valid Location header.');
        url = nextUrl;
        hop += 1;
        // Re-enter the loop, which will re-run resolveAndValidate + pinnedAgent for the new URL.
        continue;
      }
      // Terminal response.
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
      const filename = (url.split('/').pop() || 'image').split('?')[0].slice(0, 60);
      return await uploadImage({ buffer: buf, contentType, filename, uploadedBy });
    }
  } finally {
    if (attempt?.dispatcher) {
      try { await attempt.dispatcher.close(); } catch { /* ignore */ }
    }
  }
}
