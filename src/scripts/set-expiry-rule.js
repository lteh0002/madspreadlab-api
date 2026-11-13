// Usage: npm run db:set-expiry -- <product> <n> <tDays> [weekday]
//   e.g. npm run db:set-expiry -- FKLI 1 5       — expires on the month's last trading day, shows T-5 … T-0
//        npm run db:set-expiry -- MCA 3 5 fri    — expires on the 3rd Friday of the month, shows T-5 … T-0
// Without a weekday, n counts trading days back from month end (n = 2 is the second-last).
// With one (sun … sat, or 0 … 6), it is the n-th of that weekday in the month. Safe to run more than once.
// Uses MONGO_URI from .env unless it is already set in the shell.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product } from '../models/Product.js';

const USAGE = 'Usage: npm run db:set-expiry -- <product> <n> <tDays> [weekday]';
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

function parseWeekday(value) {
  const i = /^[0-6]$/.test(value) ? Number(value) : WEEKDAYS.indexOf(value.slice(0, 3).toLowerCase());
  if (i < 0) throw new Error(`Unknown weekday "${value}": use sun … sat or 0 … 6`);
  return i;
}

const [name, n, tDays, weekdayArg] = process.argv.slice(2);

try {
  if (!name || !n || !tDays) throw new Error(USAGE);
  const expiryRule =
    weekdayArg === undefined
      ? { type: 'nthLastTradingDay', n: Number(n) }
      : { type: 'nthWeekday', n: Number(n), weekday: parseWeekday(weekdayArg) };

  await connectDB();
  const products = await Product.find({ name });
  if (products.length !== 1) throw new Error(`Expected one product named "${name}", found ${products.length}`);
  const [product] = products;
  product.expiryRule = expiryRule;
  product.tDays = Number(tDays);
  await product.save(); // runs the schema's validators

  const when =
    expiryRule.type === 'nthWeekday'
      ? `${ORDINALS[expiryRule.n - 1]} ${WEEKDAYS[expiryRule.weekday]} of the month`
      : `trading day ${n} from month end`;
  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(`${product.exchange} ${product.name}: ${when}, T-${tDays} … T-0 shown.`);
  await disconnectDB();
} catch (err) {
  console.error(`Failed: ${err.name}: ${err.message}`);
  process.exit(1);
}
