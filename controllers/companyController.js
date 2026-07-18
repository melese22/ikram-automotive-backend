const Company = require('../models/Company');
const Workshop = require('../models/Workshop');
const logger = require('../config/logger');

exports.create = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required.' });
    const existing = await Company.findByOwner(req.user.id);
    if (existing) return res.status(409).json({ error: 'You already own a company.' });
    const company = await Company.create({ name, ownerId: req.user.id, phone, email, address });
    res.status(201).json({ message: 'Company created.', company });
  } catch (err) {
    logger.error({ err }, 'Create company error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMy = async (req, res) => {
  try {
    const company = await Company.findByOwner(req.user.id);
    if (!company) return res.status(404).json({ error: 'No company found.' });
    const workshops = await Company.getWorkshops(company.id);
    res.json({ company, workshops });
  } catch (err) {
    logger.error({ err }, 'Get my company error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getWorkshops = async (req, res) => {
  try {
    const company = await Company.findByOwner(req.user.id);
    if (!company) return res.status(404).json({ error: 'No company found.' });
    const workshops = await Company.getWorkshops(company.id);
    res.json({ workshops });
  } catch (err) {
    logger.error({ err }, 'Get company workshops error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getReports = async (req, res) => {
  try {
    const company = await Company.findByOwner(req.user.id);
    if (!company) return res.status(404).json({ error: 'No company found.' });
    const reports = await Company.getReports(company.id);
    res.json({ reports });
  } catch (err) {
    logger.error({ err }, 'Get company reports error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const company = await Company.findByOwner(req.user.id);
    if (!company) return res.status(404).json({ error: 'No company found.' });
    const allowed = ['name', 'phone', 'email', 'address'];
    const updates = {};
    for (const f of allowed) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    const updated = await Company.update(company.id, updates);
    res.json({ message: 'Company updated.', company: updated });
  } catch (err) {
    logger.error({ err }, 'Update company error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};
