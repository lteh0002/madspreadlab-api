import { Router } from 'express';
import * as items from '../controllers/item.controller.js';

const router = Router();

router.route('/').get(items.listItems).post(items.createItem);
router.route('/:id').get(items.getItem).patch(items.updateItem).delete(items.deleteItem);

export default router;
