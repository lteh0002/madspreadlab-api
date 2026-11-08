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

/** GET /api/expiry-rules – products with an expiry rule, for the calendar */
export async function listExpiryRules(req, res) {
  res.json({ data: await productService.listExpiryRules() });
}
