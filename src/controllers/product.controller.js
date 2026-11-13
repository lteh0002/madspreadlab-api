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

/**
 * Expiry rules only change when db:set-expiry is run, so the browser keeps them for an hour.
 * `private`: they need a login, so a shared CDN must never store them.
 */
const EXPIRY_RULES_CACHE = 'private, max-age=3600';

/** GET /api/expiry-rules – products with an expiry rule, for the calendar */
export async function listExpiryRules(req, res) {
  const data = await productService.listExpiryRules();
  res.set('Cache-Control', EXPIRY_RULES_CACHE).json({ data });
}
