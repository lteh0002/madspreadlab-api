import { Product } from '../models/Product.js';

export async function createProduct({ name, exchange, currency, productType } = {}) {
  return Product.create({ name, exchange, currency, productType });
}
