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
  const res = await fetch(externalUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'OnlineSpiritsClub/1.0' },
  });
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
