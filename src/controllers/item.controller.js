import * as itemService from '../services/item.service.js';

export async function listItems(req, res) {
  res.json(await itemService.listItems(req.query));
}

export async function getItem(req, res) {
  res.json(await itemService.getItem(req.params.id));
}

export async function createItem(req, res) {
  res.status(201).json(await itemService.createItem(req.body));
}

export async function updateItem(req, res) {
  res.json(await itemService.updateItem(req.params.id, req.body));
}

export async function deleteItem(req, res) {
  await itemService.deleteItem(req.params.id);
  res.status(204).end();
}
