import { Router } from 'express';
import mongoose from 'mongoose';
import itemRoutes from './item.routes.js';
import jpxCashRoutes from './jpxCash.routes.js';
import { login, logout } from '../controllers/auth.controller.js';
import { createProduct, listExpiryRules } from '../controllers/product.controller.js';
import { uploadData } from '../controllers/upload.controller.js';
import {
  deleteSpread,
  listFairValues,
  listPriceData,
  listProducts,
  listSpreads,
  updateFairValue,
} from '../controllers/priceData.controller.js';
import { singleFile } from '../middleware/upload.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down' });
});

router.post('/login', login);

// Everything below needs a signed-in session (Authorization: Bearer <token>)
router.use(requireAuth);
router.post('/logout', logout);

router.use('/items', itemRoutes);
router.use('/jpx-cash', jpxCashRoutes);
router.post('/create-product', createProduct);
router.post('/upload-data', singleFile, uploadData);
router.get('/spreads', listSpreads);
router.get('/price-data', listPriceData);
router.get('/fair-values', listFairValues);
router.get('/products', listProducts);
router.get('/expiry-rules', listExpiryRules);
router.patch('/spreads/:id/fair-value', updateFairValue);
router.delete('/spreads/:id', deleteSpread);

export default router;
