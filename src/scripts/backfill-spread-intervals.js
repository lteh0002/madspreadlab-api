// Usage: npm run db:backfill-intervals   — fills each spread's `intervals` from its stored bars.
// Safe to run more than once. Uses MONGO_URI from .env unless it is already set in the shell.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Spread } from '../models/Spread.js';
import { refreshSpreadIntervals } from '../services/spreadBar.service.js';

try {
  await connectDB();
  const spreads = await Spread.find().select('_id').lean();
  let withBars = 0;
  for (const { _id } of spreads) {
    if ((await refreshSpreadIntervals(_id)).length) withBars += 1;
  }
  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(`Updated ${spreads.length} spreads (${withBars} with price data).`);
  await disconnectDB();
} catch (err) {
  console.error(`Backfill failed: ${err.name}: ${err.message}`);
  process.exit(1);
}
