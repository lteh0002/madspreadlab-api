// Usage: npm run db:ping   — checks that MONGO_URI in .env is reachable and authenticated.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';

try {
  await connectDB();
  const db = mongoose.connection.db;
  const { version } = await db.admin().command({ buildInfo: 1 });
  const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();
  console.log(`Server version: ${version}`);
  console.log(`Collections (${collections.length}): ${collections.join(', ') || '(none yet)'}`);
  await disconnectDB();
} catch (err) {
  console.error(`Connection failed: ${err.name}: ${err.message}`);
  process.exit(1);
}
