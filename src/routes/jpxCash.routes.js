import { Router } from 'express';
import { listJpxCash } from '../controllers/jpxCash.controller.js';

const router = Router();

router.get('/', listJpxCash);

export default router;
