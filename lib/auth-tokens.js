// Secure token generation + hashing for one-time links (email verification,
// password reset). Design rules:
//   - Tokens are 32 bytes of crypto-random data → 43-char base64url string.
//     Plenty of entropy (~256 bits) — impossible to guess.
//   - The RAW token is only ever placed in the outgoing email URL.
//   - The DB only stores the SHA-256 of the token. Even if the DB is stolen,
//     an attacker can't use the tokens.
//   - Every token record has a `purpose` ('verify_email' | 'password_reset'),
//     a `userId`, `createdAt`, `expiresAt`, and `usedAt` (null until consumed).
//   - Tokens are single-use: verifyAndConsumeToken() sets usedAt atomically and
//     will refuse a token that's already used.

import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

export function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export const TOKEN_TTL = {
  verify_email: 24 * 60 * 60 * 1000, // 24 hours
  password_reset: 60 * 60 * 1000,    // 1 hour
};

// Create + persist a token doc. Returns the RAW token (only place it exists in cleartext).
// Also invalidates any prior UNUSED tokens for the same (userId, purpose) so an old email
// link can't be used after a fresh one is requested.
export async function issueToken(db, { userId, purpose }) {
  if (!TOKEN_TTL[purpose]) throw new Error(`Unknown token purpose: ${purpose}`);
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL[purpose]);
  // Invalidate previous unused tokens of the same purpose.
  await db.collection('auth_tokens').updateMany(
    { userId, purpose, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now, invalidatedBy: 'reissued' } }
  );
  await db.collection('auth_tokens').insertOne({
    id: uuid(),
    userId,
    purpose,
    tokenHash,
    createdAt: now,
    expiresAt,
    usedAt: null,
  });
  return { token: rawToken, expiresAt };
}

// Atomically look up + consume a token. Returns the token doc + userId on success,
// or null if the token is missing / expired / already used. Never returns the hash.
export async function verifyAndConsumeToken(db, { token, purpose }) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const tokenHash = hashToken(token);
  const now = new Date();
  const result = await db.collection('auth_tokens').findOneAndUpdate(
    { tokenHash, purpose, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { returnDocument: 'after' }
  );
  const doc = result?.value || result; // driver differences: some return doc directly
  if (!doc || !doc.userId) return null;
  return { userId: doc.userId, id: doc.id };
}

// Housekeeping — call opportunistically to prune old rows. Safe to skip; capped collection
// is another option if this ever becomes a hotspot.
export async function pruneExpiredTokens(db) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db.collection('auth_tokens').deleteMany({
    $or: [
      { usedAt: { $ne: null }, createdAt: { $lt: cutoff } },
      { expiresAt: { $lt: cutoff } },
    ],
  });
}
