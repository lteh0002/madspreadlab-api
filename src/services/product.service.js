import { Product } from '../models/Product.js';

export async function createProduct({ name, exchange, currency } = {}) {
  return Product.create({ name, exchange, currency });
}
