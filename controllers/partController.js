const Part = require('../models/Part');
const PartUsed = require('../models/PartUsed');
const logger = require('../config/logger');

exports.create = async (req, res) => {
  try {
    const { name, sku, category, description, quantity, unitPrice, supplier, minStock } = req.body;
    if (!name || !sku) {
      return res.status(400).json({ error: 'Name and SKU are required.' });
    }
    const part = await Part.create({
      workshopId: req.user.workshop_id,
      name, sku, category, description, quantity, unitPrice, supplier, minStock,
    });
    res.status(201).json({ message: 'Part added to inventory.', part });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A part with this SKU already exists.' });
    }
    logger.error({ err }, 'Create part error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await Part.findAllByWorkshop(req.user.workshop_id, { limit, offset });
    res.json({ parts: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error({ err }, 'Get parts error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const part = await Part.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'Part not found.' });
    res.json({ part });
  } catch (err) {
    logger.error({ err }, 'Get part error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required.' });
    const parts = await Part.search(req.user.workshop_id, q);
    res.json({ parts });
  } catch (err) {
    logger.error({ err }, 'Search parts error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.lowStock = async (req, res) => {
  try {
    const parts = await Part.getLowStock(req.user.workshop_id);
    res.json({ parts });
  } catch (err) {
    logger.error({ err }, 'Low stock error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.categories = async (req, res) => {
  try {
    const categories = await Part.getCategories(req.user.workshop_id);
    res.json({ categories });
  } catch (err) {
    logger.error({ err }, 'Categories error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ['name', 'sku', 'category', 'description', 'unit_price', 'supplier', 'min_stock'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const part = await Part.update(req.params.id, updates);
    if (!part) return res.status(404).json({ error: 'Part not found.' });
    res.json({ message: 'Part updated.', part });
  } catch (err) {
    logger.error({ err }, 'Update part error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const { delta } = req.body;
    if (delta === undefined || delta === null || typeof delta !== 'number') {
      return res.status(400).json({ error: 'Delta (number) is required. Use positive to add, negative to remove.' });
    }
    const part = await Part.adjustStock(req.params.id, delta);
    if (!part) return res.status(400).json({ error: 'Insufficient stock or part not found.' });
    res.json({ message: `Stock adjusted by ${delta}. New quantity: ${part.quantity}`, part });
  } catch (err) {
    logger.error({ err }, 'Adjust stock error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const part = await Part.deactivate(req.params.id);
    if (!part) return res.status(404).json({ error: 'Part not found.' });
    res.json({ message: 'Part deactivated.', part });
  } catch (err) {
    logger.error({ err }, 'Deactivate part error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.usePart = async (req, res) => {
  try {
    const { partId, quantity } = req.body;
    if (!partId || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'partId and quantity (>=1) are required.' });
    }

    const part = await Part.findById(partId);
    if (!part) return res.status(404).json({ error: 'Part not found.' });
    if (part.quantity < quantity) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${part.quantity}, requested: ${quantity}` });
    }

    const used = await PartUsed.create({
      jobCardId: req.params.jobCardId,
      partId,
      quantity,
      unitPriceAtUse: parseFloat(part.unit_price),
    });

    await Part.adjustStock(partId, -quantity);

    res.status(201).json({ message: `Used ${quantity}x ${part.name} on job card.`, partUsed: used });
  } catch (err) {
    logger.error({ err }, 'Use part error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPartsUsed = async (req, res) => {
  try {
    const partsUsed = await PartUsed.findByJobCard(req.params.jobCardId);
    const total = await PartUsed.totalForJobCard(req.params.jobCardId);
    res.json({ partsUsed, total });
  } catch (err) {
    logger.error({ err }, 'Get parts used error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.removeUsedPart = async (req, res) => {
  try {
    const used = await PartUsed.findById(req.params.id);
    if (!used) return res.status(404).json({ error: 'Part usage record not found.' });

    await Part.adjustStock(used.part_id, used.quantity);
    await PartUsed.delete(req.params.id);

    res.json({ message: `Restocked ${used.quantity}x ${used.part_name}.` });
  } catch (err) {
    logger.error({ err }, 'Remove used part error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};