import { Product } from '../models/Product.js';

export async function createProduct({ name, exchange, currency, productType } = {}) {
  return Product.create({ name, exchange, currency, productType });
}

/** Products that have an expiry rule, for the calendar */
export async function listExpiryRules() {
  return Product.find({ expiryRule: { $exists: true } })
    .select('name exchange expiryRule tDays -_id')
    .sort({ exchange: 1, name: 1 })
    .lean();
}
