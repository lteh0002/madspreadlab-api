import { Item } from '../models/Item.js';
import { notFound } from '../utils/httpError.js';

const ALLOWED_FIELDS = ['name', 'description', 'price', 'tags'];
const pick = (data = {}) =>
  Object.fromEntries(Object.entries(data).filter(([k]) => ALLOWED_FIELDS.includes(k)));

export async function listItems({ page, limit } = {}) {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));
  const [data, total] = await Promise.all([
    Item.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Item.countDocuments(),
  ]);
  return { data, page, limit, total };
}

export async function getItem(id) {
  const item = await Item.findById(id);
  if (!item) throw notFound('Item not found');
  return item;
}

export async function createItem(data) {
  return Item.create(pick(data));
}

export async function updateItem(id, data) {
  const item = await Item.findByIdAndUpdate(id, pick(data), { new: true, runValidators: true });
  if (!item) throw notFound('Item not found');
  return item;
}

export async function deleteItem(id) {
  const item = await Item.findByIdAndDelete(id);
  if (!item) throw notFound('Item not found');
}
