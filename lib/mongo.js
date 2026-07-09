import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
if (!uri) {
  throw new Error('MONGO_URL environment variable is required.');
}

// DB_NAME must be provided by the environment. We refuse to guess a
// database name at runtime — a wrong guess in production silently
// writes to the wrong DB. The check accepts the historical placeholder
// 'your_database_name' as "missing" for safer local defaults.
const rawDbName = process.env.DB_NAME;
const dbName = rawDbName && rawDbName !== 'your_database_name' ? rawDbName : null;
if (!dbName) {
  throw new Error('DB_NAME environment variable is required (received empty or placeholder).');
}

let clientPromise;

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}
