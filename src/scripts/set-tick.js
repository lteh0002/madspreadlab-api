// Usage: npm run db:set-tick -- <product> <tickSize> <tickValue>
//   e.g. npm run db:set-tick -- FKLI 0.5 25   — moves in 0.5 points, each tick worth 25 in the product's currency
// Safe to run more than once. Uses MONGO_URI from .env unless it is already set in the shell.
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Product } from '../models/Product.js';

const USAGE = 'Usage: npm run db:set-tick -- <product> <tickSize> <tickValue>';

const [name, tickSize, tickValue] = process.argv.slice(2);

try {
  if (!name || !tickSize || !tickValue) throw new Error(USAGE);
  if (!Number.isFinite(Number(tickSize)) || !Number.isFinite(Number(tickValue))) throw new Error(USAGE);

  await connectDB();
  const products = await Product.find({ name });
  if (products.length !== 1) throw new Error(`Expected one product named "${name}", found ${products.length}`);
  const [product] = products;
  product.tickSize = Number(tickSize);
  product.tickValue = Number(tickValue);
  await product.save(); // runs the schema's validators

  console.log(`Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(
    `${product.exchange} ${product.name}: tick size ${product.tickSize}, tick value ${product.tickValue} ${product.currency}.`,
  );
  await disconnectDB();
} catch (err) {
  console.error(`Failed: ${err.name}: ${err.message}`);
  process.exit(1);
}
