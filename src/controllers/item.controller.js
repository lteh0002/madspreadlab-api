import { Item } from '../models/Item.js';

const ALLOWED_FIELDS = ['name', 'description', 'price', 'tags'];
const pick = (body = {}) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED_FIELDS.includes(k)));

export async function listItems(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const [data, total] = await Promise.all([
    Item.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Item.countDocuments(),
  ]);
  res.json({ data, page, limit, total });
}

export async function getItem(req, res) {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
}

export async function createItem(req, res) {
  const item = await Item.create(pick(req.body));
  res.status(201).json(item);
}

export async function updateItem(req, res) {
  const item = await Item.findByIdAndUpdate(req.params.id, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
}

export async function deleteItem(req, res) {
  const item = await Item.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.status(204).end();
}
