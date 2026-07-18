const WorkshopSettings = require('../models/WorkshopSettings');
const logger = require('../config/logger');

exports.get = async (req, res) => {
  try {
    const settings = await WorkshopSettings.findByWorkshop(req.user.workshop_id);
    res.json({ settings: settings || {} });
  } catch (err) {
    logger.error({ err }, 'Get workshop settings error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowed = ['tax_rate', 'currency', 'business_hours', 'logo_url', 'phone', 'email', 'address', 'timezone'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const settings = await WorkshopSettings.upsert(req.user.workshop_id, updates);
    res.json({ message: 'Settings updated.', settings });
  } catch (err) {
    logger.error({ err }, 'Update workshop settings error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};
