import * as productService from '../services/product.service.js';

/**
 * POST /api/create-product
 * Body: { name, exchange, currency, productType } – all required strings;
 * productType is "indices" or "commodities".
 */
export async function createProduct(req, res) {
  const product = await productService.createProduct(req.body ?? {});
  res.status(201).json(product);
}
