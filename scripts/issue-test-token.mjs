#!/usr/bin/env node
// Test helper — issues a KNOWN raw token for a user, so Playwright tests
// can exercise /verify-email + /reset-password happy paths without needing
// pymongo. Intended for LOCAL TESTING ONLY. Never expose over HTTP.
//
// Usage:
//   node scripts/issue-test-token.mjs <email> <purpose>
//     <purpose> = 'verify_email' | 'password_reset'
// Prints ONLY the raw token to stdout (single line). Errors go to stderr.

import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const email = (process.argv[2] || '').trim().toLowerCase();
const purpose = process.argv[3] || 'verify_email';

if (!email || !['verify_email', 'password_reset'].includes(purpose)) {
  console.error('Usage: node scripts/issue-test-token.mjs <email> <verify_email|password_reset>');
  process.exit(2);
}

const uri = process.env.MONGO_URL;
if (!uri) { console.error('MONGO_URL not set'); process.exit(2); }

const client = new MongoClient(uri);
try {
  await client.connect();
  const dbName = process.env.DB_NAME && process.env.DB_NAME !== 'your_database_name' ? process.env.DB_NAME : 'osc_db';
  const db = client.db(dbName);
  const user = await db.collection('users').findOne({ email });
  if (!user) { console.error(`No user with email ${email}`); process.exit(3); }

  // Generate raw token + hash
  const raw = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const ttl = purpose === 'verify_email' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const now = new Date();

  // Invalidate previous unused tokens of same purpose (matches lib/auth-tokens.js behavior)
  await db.collection('auth_tokens').updateMany(
    { userId: user.id, purpose, usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now, invalidatedBy: 'test-helper' } }
  );

  await db.collection('auth_tokens').insertOne({
    id: crypto.randomUUID(),
    userId: user.id,
    purpose,
    tokenHash: hash,
    createdAt: now,
    expiresAt: new Date(now.getTime() + ttl),
    usedAt: null,
  });

  process.stdout.write(raw);
  process.exit(0);
} finally {
  await client.close();
}
