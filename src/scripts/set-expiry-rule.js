// Usage: npm run db:set-expiry -- <product> <n> <tDays>
//   e.g. npm run db:set-expiry -- FKLI 1 5   — expires on the month's last trading day, shows T-5 … T-0
// n = 2 would be the second-last trading day. Safe to run more than once.
// Uses MONGO_URI from .env unless it is already set in the shell.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product } from '../models/Product.js';

const [name, n, tDays] = process.argv.slice(2);

try {
  if (!name || !n || !tDays) throw new Error('Usage: npm run db:set-expiry -- <product> <n> <tDays>');
  await connectDB();
  const products = await Product.find({ name });
  if (products.length !== 1) throw new Error(`Expected one product named "${name}", found ${products.length}`);
  const [product] = products;
  product.expiryRule = { type: 'nthLastTradingDay', n: Number(n) };
  product.tDays = Number(tDays);
  await product.save(); // runs the schema's validators
  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(`${product.exchange} ${product.name}: trading day ${n} from month end, T-${tDays} … T-0 shown.`);
  await disconnectDB();
} catch (err) {
  console.error(`Failed: ${err.name}: ${err.message}`);
  process.exit(1);
}
