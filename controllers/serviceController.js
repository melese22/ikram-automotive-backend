const ServiceTemplate = require('../models/ServiceTemplate');
const logger = require('../config/logger');

exports.create = async (req, res) => {
  try {
    const { name, description, category, basePrice, estimatedMinutes } = req.body;
    if (!name) return res.status(400).json({ error: 'Service name is required.' });
    const service = await ServiceTemplate.create({
      workshopId: req.user.workshop_id,
      name,
      description,
      category,
      basePrice: basePrice !== undefined ? parseFloat(basePrice) : null,
      estimatedMinutes: estimatedMinutes !== undefined ? parseInt(estimatedMinutes, 10) : null,
    });
    res.status(201).json({ message: 'Service created.', service });
  } catch (err) {
    logger.error({ err }, 'Create service template error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.list = async (req, res) => {
  try {
    const services = await ServiceTemplate.findByWorkshop(req.user.workshop_id, true);
    res.json({ services });
  } catch (err) {
    logger.error({ err }, 'List service templates error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const service = await ServiceTemplate.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found.' });
    res.json({ service });
  } catch (err) {
    logger.error({ err }, 'Get service template error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const service = await ServiceTemplate.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found.' });
    const allowed = ['name', 'description', 'category', 'base_price', 'estimated_minutes', 'is_active'];
    const updates = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    const updated = await ServiceTemplate.update(req.params.id, updates);
    res.json({ message: 'Service updated.', service: updated });
  } catch (err) {
    logger.error({ err }, 'Update service template error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const service = await ServiceTemplate.delete(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found.' });
    res.json({ message: 'Service deleted.' });
  } catch (err) {
    logger.error({ err }, 'Delete service template error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPublicByWorkshop = async (req, res) => {
  try {
    const services = await ServiceTemplate.findPublicByWorkshop(req.params.workshopId);
    res.json({ services });
  } catch (err) {
    logger.error({ err }, 'Get public services error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPublicAll = async (req, res) => {
  try {
    const services = await ServiceTemplate.findAllPublic();
    res.json({ services });
  } catch (err) {
    logger.error({ err }, 'Get all public services error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};
