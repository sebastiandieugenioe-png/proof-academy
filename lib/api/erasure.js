// GDPR erasure helper — used by both admin-delete and self-service account deletion.
// Cascades to all personal-data collections and writes an anonymised audit doc so
// the admin overview can show total-deleted-accounts WITHOUT retaining PII.
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

//   - Deletion timestamp is stored.
//   - `userHash` is a one-way SHA-256 of the user id salted with USER_SESSION_SECRET —
//     useful only for de-duplication, never reversible to the original id/email.
//   - Method: 'self-service' | 'admin' | 'unsubscribe-cascade'.
export async function eraseUserData(db, userId, { method = 'self-service', actorEmail = null } = {}) {
  const salt = process.env.USER_SESSION_SECRET || 'osc-fallback-salt';
  const userHash = crypto.createHash('sha256').update(`${salt}:${userId}`).digest('hex');
  const now = new Date();
  // Also strip the newsletter subscription email — we replace it with the hash so
  // the audit trail keeps its shape without retaining any personal data.
  const user = await db.collection('users').findOne({ id: userId }, { projection: { email: 1 } });
  const email = user?.email || null;
  await Promise.all([
    db.collection('users').deleteOne({ id: userId }),
    db.collection('progress').deleteMany({ userId }),
    db.collection('reviews').deleteMany({ userId }),
    db.collection('comments').deleteMany({ userId }),
  ]);
  if (email) {
    // Newsletter audit doc: anonymise (drop token + email → hash) but keep the
    // consentAt/withdrawnAt row for legal accountability.
    await db.collection('newsletter').updateMany(
      { email },
      {
        $set: { email: `deleted:${userHash.slice(0, 16)}`, withdrawnAt: now, deletedAt: now, unsubscribeToken: null, source: 'account-deleted', updatedAt: now },
        $unset: { userId: '' },
      }
    );
  }
  await db.collection('deletions_audit').insertOne({
    id: uuid(),
    userHash,
    method,
    actorEmail: method === 'admin' ? (actorEmail || null) : null,
    deletedAt: now,
  });
  return { ok: true, userHash };
}
